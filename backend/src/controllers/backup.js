import {spawn} from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import archiver from 'archiver'
import * as tar from 'tar'
import mongoClientManager from '../services/mongoClient.js'
import {loadConnections} from '../config/index.js'

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(os.tmpdir(), 'mongo-manager-backups')

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
	fs.mkdirSync(BACKUP_DIR, {recursive: true})
}

/**
 * Clean up old backup files on startup and periodically
 * Deletes files older than 1 hour to prevent disk filling
 */
function cleanupOldBackups() {
	try {
		if (!fs.existsSync(BACKUP_DIR)) return

		const files = fs.readdirSync(BACKUP_DIR)
		const oneHourAgo = Date.now() - 60 * 60 * 1000

		for (const file of files) {
			const filePath = path.join(BACKUP_DIR, file)
			try {
				const stat = fs.statSync(filePath)
				if (stat.mtime.getTime() < oneHourAgo) {
					if (stat.isDirectory()) {
						fs.rmSync(filePath, {recursive: true, force: true})
					} else {
						fs.unlinkSync(filePath)
					}
					console.log(`Cleaned up old backup: ${file}`)
				}
			} catch (e) {
				// Ignore errors for individual files
			}
		}
	} catch (e) {
		console.error('Backup cleanup error:', e.message)
	}
}

// Clean up on startup
cleanupOldBackups()

// Clean up every 30 minutes
setInterval(cleanupOldBackups, 30 * 60 * 1000)

/**
 * Get connection config by ID
 */
function getConnection(connectionId) {
	const connections = loadConnections()
	return connections.find(c => c.id === connectionId)
}

/**
 * Get MongoDB connection URI for mongodump/mongorestore
 */
function getConnectionUri(connection) {
	// If full URI is provided, use it
	if (connection.uri) {
		return connection.uri
	}

	let uri = 'mongodb://'

	// Only add auth if username AND password are provided
	const hasAuth = connection.username && connection.password
	if (hasAuth) {
		uri += `${encodeURIComponent(connection.username)}:${encodeURIComponent(connection.password)}@`
	}

	uri += `${connection.host}:${connection.port || 27017}`

	// Only add authSource if we have authentication
	if (hasAuth && connection.authDatabase) {
		uri += `/?authSource=${connection.authDatabase}`
	}

	return uri
}

/**
 * Check if mongodump is available
 */
async function isMongodumpAvailable() {
	return new Promise(resolve => {
		const proc = spawn('mongodump', ['--version'])
		proc.on('error', () => resolve(false))
		proc.on('close', code => resolve(code === 0))
	})
}

/**
 * Export database using mongodump (tar.gz only)
 */
export async function exportDatabase(req, res, next) {
	try {
		const {connectionId, dbName} = req.params
		const connection = getConnection(connectionId)

		if (!connection) {
			return res.status(404).json({error: 'Connection not found'})
		}

		// Check if mongodump is available
		const hasMongodump = await isMongodumpAvailable()

		if (!hasMongodump) {
			return res.status(500).json({
				error: 'mongodump not found. Please install MongoDB Database Tools to export databases.'
			})
		}

		// Use mongodump for export
		await exportWithMongodump(req, res, next, connection, dbName)
	} catch (error) {
		next(error)
	}
}

/**
 * Export database using mongodump
 */
async function exportWithMongodump(req, res, next, connection, dbName) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
	const dumpDir = path.join(BACKUP_DIR, `dump-${dbName}-${timestamp}`)
	const outputFile = path.join(BACKUP_DIR, `${dbName}-${timestamp}.tar.gz`)

	// Build mongodump command
	const args = ['--uri', getConnectionUri(connection), '--db', dbName, '--out', dumpDir]

	await new Promise((resolve, reject) => {
		const mongodump = spawn('mongodump', args)
		let stderr = ''

		mongodump.stderr.on('data', data => {
			stderr += data.toString()
		})

		mongodump.on('close', code => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`mongodump failed: ${stderr}`))
			}
		})

		mongodump.on('error', err => {
			reject(new Error(`mongodump error: ${err.message}`))
		})
	})

	// Create tar.gz archive
	await new Promise((resolve, reject) => {
		const output = fs.createWriteStream(outputFile)
		const archive = archiver('tar', {gzip: true, gzipOptions: {level: 9}})

		output.on('close', resolve)
		archive.on('error', reject)

		archive.pipe(output)
		archive.directory(dumpDir, false)
		archive.finalize()
	})

	// Clean up dump directory
	fs.rmSync(dumpDir, {recursive: true, force: true})

	// Send file for download
	res.download(outputFile, `${dbName}-${timestamp}.tar.gz`, err => {
		// Clean up after download
		fs.unlinkSync(outputFile)
		if (err && !res.headersSent) {
			next(err)
		}
	})
}

/**
 * Export database as JSON (fallback when mongodump not available)
 */
async function exportDatabaseAsJson(req, res, next, connectionId, dbName) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
	const filename = `${dbName}-${timestamp}.json`

	const db = await mongoClientManager.getDatabase(connectionId, dbName)
	const collections = await db.listCollections().toArray()

	res.setHeader('Content-Type', 'application/json; charset=utf-8')
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

	const exportData = {
		_exportInfo: {
			database: dbName,
			exportDate: new Date().toISOString(),
			format: 'mongomanager-json',
			version: '1.0'
		},
		collections: {}
	}

	for (const collInfo of collections) {
		const collection = db.collection(collInfo.name)
		const docs = await collection.find({}).toArray()
		exportData.collections[collInfo.name] = docs.map(doc => serializeDocumentForExport(doc))
	}

	res.json(exportData)
}

/**
 * Serialize document for JSON export
 */
function serializeDocumentForExport(doc) {
	return JSON.parse(JSON.stringify(doc, (key, value) => {
		if (value && typeof value === 'object' && value._bsontype === 'ObjectId') {
			return {$oid: value.toString()}
		}
		if (value instanceof Date) {
			return {$date: value.toISOString()}
		}
		if (value && typeof value === 'object' && value._bsontype === 'Binary') {
			return {$binary: {base64: value.buffer.toString('base64'), subType: value.sub_type.toString(16)}}
		}
		if (value && typeof value === 'object' && value._bsontype === 'Long') {
			return {$numberLong: value.toString()}
		}
		if (value && typeof value === 'object' && value._bsontype === 'Decimal128') {
			return {$numberDecimal: value.toString()}
		}
		return value
	}))
}

/**
 * Export collection using mongodump (tar.gz)
 */
export async function exportCollection(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const connection = getConnection(connectionId)

		if (!connection) {
			return res.status(404).json({error: 'Connection not found'})
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		const dumpDir = path.join(BACKUP_DIR, `dump-${dbName}-${collectionName}-${timestamp}`)
		const outputFile = path.join(BACKUP_DIR, `${dbName}-${collectionName}-${timestamp}.tar.gz`)

		// Build mongodump command
		const args = ['--uri', getConnectionUri(connection), '--db', dbName, '--collection', collectionName, '--out', dumpDir]

		await new Promise((resolve, reject) => {
			const mongodump = spawn('mongodump', args)
			let stderr = ''

			mongodump.stderr.on('data', data => {
				stderr += data.toString()
			})

			mongodump.on('close', code => {
				if (code === 0) {
					resolve()
				} else {
					reject(new Error(`mongodump failed: ${stderr}`))
				}
			})

			mongodump.on('error', err => {
				reject(new Error(`mongodump not found. Please install MongoDB Database Tools. Error: ${err.message}`))
			})
		})

		// Create tar.gz archive
		await new Promise((resolve, reject) => {
			const output = fs.createWriteStream(outputFile)
			const archive = archiver('tar', {gzip: true, gzipOptions: {level: 9}})

			output.on('close', resolve)
			archive.on('error', reject)

			archive.pipe(output)
			archive.directory(dumpDir, false)
			archive.finalize()
		})

		// Clean up dump directory
		fs.rmSync(dumpDir, {recursive: true, force: true})

		// Send file for download
		res.download(outputFile, `${dbName}-${collectionName}-${timestamp}.tar.gz`, err => {
			// Clean up after download
			fs.unlinkSync(outputFile)
			if (err && !res.headersSent) {
				next(err)
			}
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Custom JSON serializer for MongoDB types
 */
function serializeDocument(doc) {
	return JSON.stringify(doc, (key, value) => {
		// Handle ObjectId
		if (value && typeof value === 'object' && value._bsontype === 'ObjectId') {
			return {$oid: value.toString()}
		}
		// Handle Date
		if (value instanceof Date) {
			return {$date: value.toISOString()}
		}
		// Handle Binary
		if (value && typeof value === 'object' && value._bsontype === 'Binary') {
			return {$binary: value.toString('base64')}
		}
		// Handle Long/Int64
		if (value && typeof value === 'object' && value._bsontype === 'Long') {
			return {$numberLong: value.toString()}
		}
		// Handle Decimal128
		if (value && typeof value === 'object' && value._bsontype === 'Decimal128') {
			return {$numberDecimal: value.toString()}
		}
		return value
	})
}

/**
 * Export collection as JSON (streaming to prevent memory issues)
 */
export async function exportCollectionJson(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {filter = '{}'} = req.query

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		let filterObj = {}
		try {
			filterObj = JSON.parse(filter)
		} catch (e) {}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		const filename = `${dbName}-${collectionName}-${timestamp}.json`

		res.setHeader('Content-Type', 'application/json; charset=utf-8')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

		// Stream documents to prevent memory issues
		const cursor = collection.find(filterObj)

		res.write('[\n')

		let isFirst = true

		for await (const doc of cursor) {
			if (!isFirst) {
				res.write(',\n')
			}
			res.write(serializeDocument(doc))
			isFirst = false
		}

		res.write('\n]')
		res.end()
	} catch (error) {
		next(error)
	}
}

/**
 * Check if mongorestore is available
 */
async function isMongorestoreAvailable() {
	return new Promise(resolve => {
		const proc = spawn('mongorestore', ['--version'])
		proc.on('error', () => resolve(false))
		proc.on('close', code => resolve(code === 0))
	})
}

/**
 * Restore database from tar.gz (mongorestore) or JSON
 */
export async function restoreDatabase(req, res, next) {
	try {
		const {connectionId, dbName} = req.params
		const connection = getConnection(connectionId)

		if (!connection) {
			return res.status(404).json({error: 'Connection not found'})
		}

		if (!req.file) {
			return res.status(400).json({error: 'No file uploaded'})
		}

		const uploadedFile = req.file.path
		const fileName = req.file.originalname || ''

		try {
			// Check if it's a JSON file (our custom format)
			if (fileName.endsWith('.json')) {
				await restoreFromJson(connectionId, dbName, uploadedFile)
				res.json({message: `Database ${dbName} restored successfully from JSON`})
				return
			}

			// Try tar.gz with mongorestore
			const hasMongoRestore = await isMongorestoreAvailable()

			if (!hasMongoRestore) {
				// Try to parse as JSON anyway
				try {
					await restoreFromJson(connectionId, dbName, uploadedFile)
					res.json({message: `Database ${dbName} restored successfully from JSON`})
					return
				} catch (jsonErr) {
					throw new Error('mongorestore not available and file is not valid JSON. Please install MongoDB Database Tools or use JSON export format.')
				}
			}

			const extractDir = path.join(BACKUP_DIR, `restore-${Date.now()}`)

			// Extract tar.gz
			await extractTarGz(uploadedFile, extractDir)

			// Find the dump directory (it might be nested)
			const dumpPath = findDumpPath(extractDir, dbName)

			if (!dumpPath) {
				throw new Error('Invalid backup file: database dump not found')
			}

			// Build mongorestore command
			const args = [
				'--uri',
				getConnectionUri(connection),
				'--db',
				dbName,
				'--drop',
				dumpPath
			]

			await new Promise((resolve, reject) => {
				const mongorestore = spawn('mongorestore', args)
				let stderr = ''

				mongorestore.stderr.on('data', data => {
					stderr += data.toString()
				})

				mongorestore.on('close', code => {
					if (code === 0) {
						resolve()
					} else {
						reject(new Error(`mongorestore failed: ${stderr}`))
					}
				})

				mongorestore.on('error', err => {
					reject(new Error(`mongorestore error: ${err.message}`))
				})
			})

			// Clean up extract directory
			if (fs.existsSync(extractDir)) {
				fs.rmSync(extractDir, {recursive: true, force: true})
			}

			res.json({message: `Database ${dbName} restored successfully`})
		} finally {
			// Clean up uploaded file
			if (fs.existsSync(uploadedFile)) {
				fs.unlinkSync(uploadedFile)
			}
		}
	} catch (error) {
		next(error)
	}
}

/**
 * Restore database from JSON file
 */
async function restoreFromJson(connectionId, dbName, filePath) {
	const fileContent = fs.readFileSync(filePath, 'utf8')
	const data = JSON.parse(fileContent)

	const db = await mongoClientManager.getDatabase(connectionId, dbName)

	// Check if it's our export format
	if (data._exportInfo && data.collections) {
		for (const [collName, docs] of Object.entries(data.collections)) {
			const collection = db.collection(collName)
			// Drop existing collection
			await collection.drop().catch(() => {})
			// Insert documents
			if (docs.length > 0) {
				const parsedDocs = docs.map(doc => deserializeDocument(doc))
				await collection.insertMany(parsedDocs)
			}
		}
	} else if (Array.isArray(data)) {
		// Single collection array format
		throw new Error('This JSON format is for single collection import. Use collection import instead.')
	} else {
		throw new Error('Invalid JSON format. Expected mongomanager export format.')
	}
}

/**
 * Deserialize document from JSON export format
 */
function deserializeDocument(doc) {
	return JSON.parse(JSON.stringify(doc), (key, value) => {
		if (value && typeof value === 'object') {
			if (value.$oid) {
				const {ObjectId} = require('mongodb')
				return new ObjectId(value.$oid)
			}
			if (value.$date) {
				return new Date(value.$date)
			}
			if (value.$numberLong) {
				const {Long} = require('mongodb')
				return Long.fromString(value.$numberLong)
			}
			if (value.$numberDecimal) {
				const {Decimal128} = require('mongodb')
				return Decimal128.fromString(value.$numberDecimal)
			}
		}
		return value
	})
}

/**
 * Restore collection from tar.gz (mongorestore)
 */
export async function restoreCollection(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const connection = getConnection(connectionId)

		if (!connection) {
			return res.status(404).json({error: 'Connection not found'})
		}

		if (!req.file) {
			return res.status(400).json({error: 'No file uploaded'})
		}

		const uploadedFile = req.file.path
		const extractDir = path.join(BACKUP_DIR, `restore-${Date.now()}`)

		try {
			// Extract tar.gz
			await extractTarGz(uploadedFile, extractDir)

			// Find the bson file for the collection
			const bsonFile = findBsonFile(extractDir, collectionName)

			if (!bsonFile) {
				throw new Error(`Invalid backup file: collection ${collectionName} not found`)
			}

			// Get the directory containing the bson file
			const bsonDir = path.dirname(bsonFile)

			// Build mongorestore command for specific collection
			const args = ['--uri', getConnectionUri(connection), '--db', dbName, '--collection', collectionName, '--drop', bsonFile]

			await new Promise((resolve, reject) => {
				const mongorestore = spawn('mongorestore', args)
				let stderr = ''

				mongorestore.stderr.on('data', data => {
					stderr += data.toString()
				})

				mongorestore.on('close', code => {
					if (code === 0) {
						resolve()
					} else {
						reject(new Error(`mongorestore failed: ${stderr}`))
					}
				})

				mongorestore.on('error', err => {
					reject(new Error(`mongorestore not found. Please install MongoDB Database Tools. Error: ${err.message}`))
				})
			})

			res.json({message: `Collection ${collectionName} restored successfully`})
		} finally {
			// Clean up
			fs.unlinkSync(uploadedFile)
			if (fs.existsSync(extractDir)) {
				fs.rmSync(extractDir, {recursive: true, force: true})
			}
		}
	} catch (error) {
		next(error)
	}
}

/**
 * Import JSON documents into collection
 */
export async function importCollectionJson(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {mode = 'insert'} = req.body // insert, upsert, drop

		if (!req.file) {
			return res.status(400).json({error: 'No file uploaded'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Read and parse JSON file
		const fileContent = fs.readFileSync(req.file.path, 'utf8')
		let documents

		try {
			documents = JSON.parse(fileContent)
		} catch (e) {
			// Try parsing as JSONL (one JSON per line)
			documents = fileContent
				.split('\n')
				.filter(line => line.trim())
				.map(line => JSON.parse(line))
		}

		if (!Array.isArray(documents)) {
			documents = [documents]
		}

		// Clean up uploaded file
		fs.unlinkSync(req.file.path)

		let result

		if (mode === 'drop') {
			// Drop collection and insert
			await collection.drop().catch(() => {}) // Ignore if doesn't exist
			result = await collection.insertMany(documents)
			return res.json({
				message: `Collection dropped and ${result.insertedCount} documents imported`,
				insertedCount: result.insertedCount
			})
		} else if (mode === 'upsert') {
			// Upsert each document
			let upsertedCount = 0
			let modifiedCount = 0

			for (const doc of documents) {
				if (doc._id) {
					const updateResult = await collection.updateOne({_id: doc._id}, {$set: doc}, {upsert: true})
					if (updateResult.upsertedCount) upsertedCount++
					if (updateResult.modifiedCount) modifiedCount++
				} else {
					await collection.insertOne(doc)
					upsertedCount++
				}
			}

			return res.json({
				message: `${upsertedCount} documents upserted, ${modifiedCount} documents modified`,
				upsertedCount,
				modifiedCount
			})
		} else {
			// Simple insert
			result = await collection.insertMany(documents)
			return res.json({
				message: `${result.insertedCount} documents imported`,
				insertedCount: result.insertedCount
			})
		}
	} catch (error) {
		// Clean up on error
		if (req.file && fs.existsSync(req.file.path)) {
			fs.unlinkSync(req.file.path)
		}
		next(error)
	}
}

/**
 * Extract tar.gz file
 */
async function extractTarGz(tarFile, destDir) {
	fs.mkdirSync(destDir, {recursive: true})

	await tar.extract({
		file: tarFile,
		cwd: destDir
	})
}

/**
 * Find dump path for database
 */
function findDumpPath(dir, dbName) {
	const entries = fs.readdirSync(dir, {withFileTypes: true})

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			if (entry.name === dbName) {
				return fullPath
			}
			// Check nested directories
			const nested = findDumpPath(fullPath, dbName)
			if (nested) return nested
		}
	}

	// If no exact match, check for any directory with bson files
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			const files = fs.readdirSync(fullPath)
			if (files.some(f => f.endsWith('.bson'))) {
				return fullPath
			}
		}
	}

	return null
}

/**
 * Find bson file for collection
 */
function findBsonFile(dir, collectionName) {
	const entries = fs.readdirSync(dir, {withFileTypes: true})

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)

		if (entry.isFile() && entry.name === `${collectionName}.bson`) {
			return fullPath
		}

		if (entry.isDirectory()) {
			const nested = findBsonFile(fullPath, collectionName)
			if (nested) return nested
		}
	}

	return null
}
