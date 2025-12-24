import mongoClientManager from '../services/mongoClient.js'

/**
 * List all collections in a database with document counts
 */
export async function listCollections(req, res, next) {
	try {
		const {connectionId, dbName} = req.params

		const db = await mongoClientManager.getDatabase(connectionId, dbName)

		// listCollections is available in MongoDB 4.4+
		const collections = await db.listCollections().toArray()

		// Get document count for each collection
		const collectionList = await Promise.all(
			collections.map(async coll => {
				let count = 0
				let size = 0
				let avgObjSize = 0
				let nindexes = 0
				try {
					// Use estimatedDocumentCount for better performance
					const collection = db.collection(coll.name)
					count = await collection.estimatedDocumentCount()

					// Try to get size from stats
					try {
						const stats = await db.command({collStats: coll.name})
						size = stats.size || 0
						avgObjSize = stats.avgObjSize || 0
						nindexes = stats.nindexes || 0
					} catch {
						// Ignore stats error
					}
				} catch {
					// Ignore count error for special collections
				}

				return {
					name: coll.name,
					type: coll.type,
					options: coll.options,
					count,
					size,
					avgObjSize,
					nindexes
				}
			})
		)

		res.json({collections: collectionList})
	} catch (error) {
		next(error)
	}
}

/**
 * Get collection stats
 */
export async function getCollectionStats(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params

		const db = await mongoClientManager.getDatabase(connectionId, dbName)

		// collStats command is available in MongoDB 4.4+
		const stats = await db.command({collStats: collectionName})

		res.json({
			ns: stats.ns,
			count: stats.count,
			size: stats.size,
			avgObjSize: stats.avgObjSize,
			storageSize: stats.storageSize,
			totalIndexSize: stats.totalIndexSize,
			indexSizes: stats.indexSizes,
			nindexes: stats.nindexes,
			capped: stats.capped
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Create a new collection
 */
export async function createCollection(req, res, next) {
	try {
		const {connectionId, dbName} = req.params
		const {name, options} = req.body

		if (!name) {
			return res.status(400).json({error: 'Collection name is required'})
		}

		const db = await mongoClientManager.getDatabase(connectionId, dbName)

		// Create collection with options (capped, size, max, etc.)
		const createOptions = {}

		if (options) {
			if (options.capped) {
				createOptions.capped = true
				createOptions.size = options.size || 1048576 // 1MB default
				if (options.max) {
					createOptions.max = options.max
				}
			}
			if (options.validator) {
				createOptions.validator = options.validator
			}
		}

		await db.createCollection(name, createOptions)

		res.status(201).json({
			message: `Collection '${name}' created successfully`,
			collection: name
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Drop a collection
 */
export async function dropCollection(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params

		const db = await mongoClientManager.getDatabase(connectionId, dbName)
		await db.dropCollection(collectionName)

		res.json({message: `Collection '${collectionName}' dropped successfully`})
	} catch (error) {
		next(error)
	}
}

/**
 * Rename a collection
 */
export async function renameCollection(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {newName} = req.body

		if (!newName) {
			return res.status(400).json({error: 'New collection name is required'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)
		await collection.rename(newName)

		res.json({
			message: `Collection renamed from '${collectionName}' to '${newName}'`,
			oldName: collectionName,
			newName
		})
	} catch (error) {
		next(error)
	}
}
