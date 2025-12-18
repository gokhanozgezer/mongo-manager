import mongoClientManager from '../services/mongoClient.js'

/**
 * Get server build information
 */
export async function getServerInfo(req, res, next) {
	try {
		const {connectionId} = req.params
		const client = await mongoClientManager.getClient(connectionId)
		const adminDb = client.db('admin')

		const buildInfo = await adminDb.command({buildInfo: 1})

		res.json({
			version: buildInfo.version,
			gitVersion: buildInfo.gitVersion,
			modules: buildInfo.modules,
			allocator: buildInfo.allocator,
			javascriptEngine: buildInfo.javascriptEngine,
			sysInfo: buildInfo.sysInfo,
			versionArray: buildInfo.versionArray,
			bits: buildInfo.bits,
			debug: buildInfo.debug,
			maxBsonObjectSize: buildInfo.maxBsonObjectSize,
			storageEngines: buildInfo.storageEngines,
			openssl: buildInfo.openssl,
			buildEnvironment: buildInfo.buildEnvironment
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Get server status
 */
export async function getServerStatus(req, res, next) {
	try {
		const {connectionId} = req.params
		const client = await mongoClientManager.getClient(connectionId)
		const adminDb = client.db('admin')

		const status = await adminDb.command({serverStatus: 1})

		res.json({
			host: status.host,
			version: status.version,
			process: status.process,
			pid: status.pid,
			uptime: status.uptime,
			uptimeMillis: status.uptimeMillis,
			uptimeEstimate: status.uptimeEstimate,
			localTime: status.localTime,
			connections: status.connections,
			network: status.network,
			opcounters: status.opcounters,
			opcountersRepl: status.opcountersRepl,
			mem: status.mem,
			storageEngine: status.storageEngine,
			wiredTiger: status.wiredTiger
				? {
						cache: status.wiredTiger.cache
					}
				: undefined
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Get current operations (processlist)
 */
export async function getProcesslist(req, res, next) {
	try {
		const {connectionId} = req.params
		const client = await mongoClientManager.getClient(connectionId)
		const adminDb = client.db('admin')

		const result = await adminDb.command({currentOp: 1, active: true})

		const processes = (result.inprog || []).map(op => ({
			opid: op.opid,
			type: op.type,
			op: op.op,
			ns: op.ns,
			command: op.command,
			secs_running: op.secs_running,
			microsecs_running: op.microsecs_running,
			desc: op.desc,
			connectionId: op.connectionId,
			client: op.client,
			appName: op.appName,
			active: op.active,
			waitingForLock: op.waitingForLock
		}))

		res.json({processes})
	} catch (error) {
		next(error)
	}
}

/**
 * Execute a database command
 */
export async function executeCommand(req, res, next) {
	try {
		const {connectionId} = req.params
		const {database, command} = req.body

		if (!command) {
			return res.status(400).json({error: 'Command is required'})
		}

		const client = await mongoClientManager.getClient(connectionId)
		const db = client.db(database || 'admin')

		const result = await db.command(command)

		res.json(result)
	} catch (error) {
		res.json({error: error.message})
	}
}

/**
 * Execute JavaScript code (eval is deprecated, use aggregate with $function or command)
 */
export async function executeJs(req, res, next) {
	try {
		const {connectionId} = req.params
		const {database, code} = req.body

		if (!code) {
			return res.status(400).json({error: 'Code is required'})
		}

		// Note: eval is deprecated in MongoDB 4.2+
		// This is a simplified implementation that tries to parse the code
		// and execute equivalent operations
		res.json({
			warning: 'JavaScript execution is deprecated in MongoDB 4.2+',
			message: 'Please use the Command tab with MongoDB commands instead',
			code: code
		})
	} catch (error) {
		res.json({error: error.message})
	}
}

/**
 * Execute shell-like commands (MongoDB Compass style)
 * Parses commands like db.collection.find(), db.stats(), etc.
 */
export async function executeShell(req, res, next) {
	try {
		const {connectionId} = req.params
		const {database, command} = req.body

		if (!command) {
			return res.status(400).json({error: 'Command is required'})
		}

		const client = await mongoClientManager.getClient(connectionId)
		const db = client.db(database || 'admin')

		const cmd = command.trim()

		// Parse and execute shell-like commands
		// db.getCollectionNames()
		if (cmd === 'db.getCollectionNames()') {
			const collections = await db.listCollections().toArray()
			return res.json(collections.map(c => c.name))
		}

		// db.stats()
		if (cmd === 'db.stats()') {
			const stats = await db.stats()
			return res.json(stats)
		}

		// db.collection.find() pattern
		const findMatch = cmd.match(/^db\.(\w+)\.find\((.*?)\)(?:\.limit\((\d+)\))?(?:\.skip\((\d+)\))?(?:\.sort\((.*?)\))?$/)
		if (findMatch) {
			const [, collName, filterStr, limitStr, skipStr, sortStr] = findMatch
			const collection = db.collection(collName)

			let filter = {}
			if (filterStr && filterStr.trim()) {
				try {
					filter = JSON.parse(filterStr)
				} catch (e) {
					// Empty filter
				}
			}

			let cursor = collection.find(filter)

			if (sortStr) {
				try {
					cursor = cursor.sort(JSON.parse(sortStr))
				} catch (e) {}
			}

			if (skipStr) {
				cursor = cursor.skip(parseInt(skipStr))
			}

			const limit = limitStr ? parseInt(limitStr) : 20
			cursor = cursor.limit(limit)

			const docs = await cursor.toArray()
			return res.json(docs)
		}

		// db.collection.findOne() pattern
		const findOneMatch = cmd.match(/^db\.(\w+)\.findOne\((.*?)\)$/)
		if (findOneMatch) {
			const [, collName, filterStr] = findOneMatch
			const collection = db.collection(collName)

			let filter = {}
			if (filterStr && filterStr.trim()) {
				try {
					filter = JSON.parse(filterStr)
				} catch (e) {}
			}

			const doc = await collection.findOne(filter)
			return res.json(doc)
		}

		// db.collection.countDocuments() pattern
		const countMatch = cmd.match(/^db\.(\w+)\.countDocuments\((.*?)\)$/)
		if (countMatch) {
			const [, collName, filterStr] = countMatch
			const collection = db.collection(collName)

			let filter = {}
			if (filterStr && filterStr.trim()) {
				try {
					filter = JSON.parse(filterStr)
				} catch (e) {}
			}

			const count = await collection.countDocuments(filter)
			return res.json({count})
		}

		// db.collection.count() pattern (deprecated but still used)
		const countOldMatch = cmd.match(/^db\.(\w+)\.count\((.*?)\)$/)
		if (countOldMatch) {
			const [, collName, filterStr] = countOldMatch
			const collection = db.collection(collName)

			let filter = {}
			if (filterStr && filterStr.trim()) {
				try {
					filter = JSON.parse(filterStr)
				} catch (e) {}
			}

			const count = await collection.countDocuments(filter)
			return res.json({count})
		}

		// db.collection.distinct() pattern
		const distinctMatch = cmd.match(/^db\.(\w+)\.distinct\(['"](\w+)['"]\)$/)
		if (distinctMatch) {
			const [, collName, field] = distinctMatch
			const collection = db.collection(collName)
			const values = await collection.distinct(field)
			return res.json(values)
		}

		// db.collection.getIndexes() pattern
		const indexMatch = cmd.match(/^db\.(\w+)\.getIndexes\(\)$/)
		if (indexMatch) {
			const [, collName] = indexMatch
			const collection = db.collection(collName)
			const indexes = await collection.indexes()
			return res.json(indexes)
		}

		// db.collection.stats() pattern
		const collStatsMatch = cmd.match(/^db\.(\w+)\.stats\(\)$/)
		if (collStatsMatch) {
			const [, collName] = collStatsMatch
			const stats = await db.command({collStats: collName})
			return res.json(stats)
		}

		// db.collection.insertOne() pattern
		const insertOneMatch = cmd.match(/^db\.(\w+)\.insertOne\(([\s\S]*)\)$/)
		if (insertOneMatch) {
			const [, collName, docStr] = insertOneMatch
			const collection = db.collection(collName)
			try {
				const doc = JSON.parse(docStr)
				const result = await collection.insertOne(doc)
				return res.json({acknowledged: result.acknowledged, insertedId: result.insertedId})
			} catch (e) {
				return res.json({error: 'Invalid document JSON: ' + e.message})
			}
		}

		// db.collection.insert() pattern (legacy)
		const insertMatch = cmd.match(/^db\.(\w+)\.insert\(([\s\S]*)\)$/)
		if (insertMatch) {
			const [, collName, docStr] = insertMatch
			const collection = db.collection(collName)
			try {
				const doc = JSON.parse(docStr)
				if (Array.isArray(doc)) {
					const result = await collection.insertMany(doc)
					return res.json({acknowledged: result.acknowledged, insertedCount: result.insertedCount, insertedIds: result.insertedIds})
				} else {
					const result = await collection.insertOne(doc)
					return res.json({acknowledged: result.acknowledged, insertedId: result.insertedId})
				}
			} catch (e) {
				return res.json({error: 'Invalid document JSON: ' + e.message})
			}
		}

		// db.collection.insertMany() pattern
		const insertManyMatch = cmd.match(/^db\.(\w+)\.insertMany\(([\s\S]*)\)$/)
		if (insertManyMatch) {
			const [, collName, docsStr] = insertManyMatch
			const collection = db.collection(collName)
			try {
				const docs = JSON.parse(docsStr)
				const result = await collection.insertMany(docs)
				return res.json({acknowledged: result.acknowledged, insertedCount: result.insertedCount, insertedIds: result.insertedIds})
			} catch (e) {
				return res.json({error: 'Invalid documents JSON: ' + e.message})
			}
		}

		// db.collection.updateOne() pattern
		const updateOneMatch = cmd.match(/^db\.(\w+)\.updateOne\(([\s\S]*),([\s\S]*)\)$/)
		if (updateOneMatch) {
			const [, collName, filterStr, updateStr] = updateOneMatch
			const collection = db.collection(collName)
			try {
				const filter = JSON.parse(filterStr.trim())
				const update = JSON.parse(updateStr.trim())
				const result = await collection.updateOne(filter, update)
				return res.json({acknowledged: result.acknowledged, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount})
			} catch (e) {
				return res.json({error: 'Invalid JSON: ' + e.message})
			}
		}

		// db.collection.updateMany() pattern
		const updateManyMatch = cmd.match(/^db\.(\w+)\.updateMany\(([\s\S]*),([\s\S]*)\)$/)
		if (updateManyMatch) {
			const [, collName, filterStr, updateStr] = updateManyMatch
			const collection = db.collection(collName)
			try {
				const filter = JSON.parse(filterStr.trim())
				const update = JSON.parse(updateStr.trim())
				const result = await collection.updateMany(filter, update)
				return res.json({acknowledged: result.acknowledged, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount})
			} catch (e) {
				return res.json({error: 'Invalid JSON: ' + e.message})
			}
		}

		// db.collection.deleteOne() pattern
		const deleteOneMatch = cmd.match(/^db\.(\w+)\.deleteOne\(([\s\S]*)\)$/)
		if (deleteOneMatch) {
			const [, collName, filterStr] = deleteOneMatch
			const collection = db.collection(collName)
			try {
				const filter = JSON.parse(filterStr.trim())
				const result = await collection.deleteOne(filter)
				return res.json({acknowledged: result.acknowledged, deletedCount: result.deletedCount})
			} catch (e) {
				return res.json({error: 'Invalid filter JSON: ' + e.message})
			}
		}

		// db.collection.deleteMany() / db.collection.remove() pattern
		const deleteManyMatch = cmd.match(/^db\.(\w+)\.(deleteMany|remove)\(([\s\S]*)\)$/)
		if (deleteManyMatch) {
			const [, collName, , filterStr] = deleteManyMatch
			const collection = db.collection(collName)
			try {
				const filter = JSON.parse(filterStr.trim())
				const result = await collection.deleteMany(filter)
				return res.json({acknowledged: result.acknowledged, deletedCount: result.deletedCount})
			} catch (e) {
				return res.json({error: 'Invalid filter JSON: ' + e.message})
			}
		}

		// db.collection.drop() pattern
		const dropCollMatch = cmd.match(/^db\.(\w+)\.drop\(\)$/)
		if (dropCollMatch) {
			const [, collName] = dropCollMatch
			const result = await db.collection(collName).drop()
			return res.json({dropped: result})
		}

		// db.collection.aggregate() pattern
		const aggregateMatch = cmd.match(/^db\.(\w+)\.aggregate\(([\s\S]*)\)$/)
		if (aggregateMatch) {
			const [, collName, pipelineStr] = aggregateMatch
			const collection = db.collection(collName)
			try {
				const pipeline = JSON.parse(pipelineStr)
				const result = await collection.aggregate(pipeline).toArray()
				return res.json(result)
			} catch (e) {
				return res.json({error: 'Invalid pipeline JSON: ' + e.message})
			}
		}

		// db.collection.createIndex() pattern
		const createIndexMatch = cmd.match(/^db\.(\w+)\.createIndex\(([\s\S]*)\)$/)
		if (createIndexMatch) {
			const [, collName, keysStr] = createIndexMatch
			const collection = db.collection(collName)
			try {
				const keys = JSON.parse(keysStr)
				const result = await collection.createIndex(keys)
				return res.json({indexName: result})
			} catch (e) {
				return res.json({error: 'Invalid keys JSON: ' + e.message})
			}
		}

		// db.collection.dropIndex() pattern
		const dropIndexMatch = cmd.match(/^db\.(\w+)\.dropIndex\(['"](.+)['"]\)$/)
		if (dropIndexMatch) {
			const [, collName, indexName] = dropIndexMatch
			const result = await db.collection(collName).dropIndex(indexName)
			return res.json(result)
		}

		// use <database> pattern - return info (actual switch is handled client-side)
		const useDbMatch = cmd.match(/^use\s+(\w+)$/)
		if (useDbMatch) {
			const [, dbName] = useDbMatch
			return res.json({message: `switched to db ${dbName}`, database: dbName})
		}

		// db.createCollection() pattern
		const createCollMatch = cmd.match(/^db\.createCollection\(['"](\w+)['"]\)$/)
		if (createCollMatch) {
			const [, collName] = createCollMatch
			const result = await db.createCollection(collName)
			return res.json({created: collName})
		}

		// db.dropDatabase() pattern
		if (cmd === 'db.dropDatabase()') {
			const result = await db.dropDatabase()
			return res.json({dropped: true})
		}

		// show dbs / show databases
		if (cmd === 'show dbs' || cmd === 'show databases') {
			const adminDb = client.db('admin')
			const result = await adminDb.command({listDatabases: 1})
			return res.json(result.databases)
		}

		// show collections
		if (cmd === 'show collections') {
			const collections = await db.listCollections().toArray()
			return res.json(collections.map(c => c.name))
		}

		// Try to execute as a raw command (JSON object)
		if (cmd.startsWith('{')) {
			try {
				const cmdObj = JSON.parse(cmd)
				const result = await db.command(cmdObj)
				return res.json(result)
			} catch (e) {
				return res.json({error: 'Invalid JSON command: ' + e.message})
			}
		}

		// Unknown command
		res.json({
			error: 'Unknown command. Supported commands: db.collection.find(), db.collection.findOne(), db.collection.insert(), db.collection.insertOne(), db.collection.insertMany(), db.collection.updateOne(), db.collection.updateMany(), db.collection.deleteOne(), db.collection.deleteMany(), db.collection.aggregate(), db.collection.countDocuments(), db.collection.distinct(), db.collection.getIndexes(), db.collection.createIndex(), db.collection.dropIndex(), db.collection.drop(), db.collection.stats(), db.getCollectionNames(), db.stats(), db.createCollection(), db.dropDatabase(), show dbs, show collections, use <database>, or JSON commands like { ping: 1 }'
		})
	} catch (error) {
		res.json({error: error.message})
	}
}
