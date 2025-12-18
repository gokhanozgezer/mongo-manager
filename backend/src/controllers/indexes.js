import mongoClientManager from '../services/mongoClient.js'

/**
 * List all indexes for a collection
 */
export async function listIndexes(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)
		const db = await mongoClientManager.getDatabase(connectionId, dbName)

		// Get basic index information
		const indexes = await collection.listIndexes().toArray()

		// Get index sizes from collStats
		let indexSizes = {}
		try {
			const stats = await db.command({collStats: collectionName})
			indexSizes = stats.indexSizes || {}
		} catch (e) {
			// collStats might fail on some collections (e.g., views)
			console.warn('Could not get collStats for index sizes:', e.message)
		}

		// Get index usage stats from $indexStats aggregation
		let indexStats = {}
		try {
			const statsResult = await collection.aggregate([{$indexStats: {}}]).toArray()
			for (const stat of statsResult) {
				indexStats[stat.name] = {
					ops: stat.accesses?.ops || 0,
					since: stat.accesses?.since
				}
			}
		} catch (e) {
			// $indexStats might not be available on all MongoDB versions
			console.warn('Could not get $indexStats:', e.message)
		}

		res.json({
			indexes: indexes.map(idx => ({
				name: idx.name,
				key: idx.key,
				unique: idx.unique || false,
				sparse: idx.sparse || false,
				background: idx.background || false,
				expireAfterSeconds: idx.expireAfterSeconds,
				partialFilterExpression: idx.partialFilterExpression,
				v: idx.v,
				size: indexSizes[idx.name] || 0,
				accesses: indexStats[idx.name] || null
			}))
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Create a new index
 */
export async function createIndex(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {keys, options = {}} = req.body

		if (!keys || typeof keys !== 'object' || Object.keys(keys).length === 0) {
			return res.status(400).json({error: 'Index keys are required'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Validate index key values (must be 1, -1, or special types like 'text', '2dsphere')
		const validKeyValues = [1, -1, 'text', '2d', '2dsphere', 'hashed']
		for (const [field, value] of Object.entries(keys)) {
			if (!validKeyValues.includes(value)) {
				return res.status(400).json({
					error: `Invalid index key value for '${field}': ${value}. Must be 1, -1, 'text', '2d', '2dsphere', or 'hashed'`
				})
			}
		}

		// Build index options (filter out undefined values)
		const indexOptions = {}

		if (options.name) {
			indexOptions.name = options.name
		}
		if (options.unique === true) {
			indexOptions.unique = true
		}
		if (options.sparse === true) {
			indexOptions.sparse = true
		}
		if (options.background === true) {
			// Note: background option is deprecated in MongoDB 4.2+ but still works
			indexOptions.background = true
		}
		if (typeof options.expireAfterSeconds === 'number') {
			indexOptions.expireAfterSeconds = options.expireAfterSeconds
		}
		if (options.partialFilterExpression) {
			indexOptions.partialFilterExpression = options.partialFilterExpression
		}

		const indexName = await collection.createIndex(keys, indexOptions)

		res.status(201).json({
			message: `Index '${indexName}' created successfully`,
			indexName
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Drop an index by name
 */
export async function dropIndex(req, res, next) {
	try {
		const {connectionId, dbName, collectionName, indexName} = req.params

		// Prevent dropping the _id index
		if (indexName === '_id_') {
			return res.status(400).json({error: 'Cannot drop the _id index'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		await collection.dropIndex(indexName)

		res.json({message: `Index '${indexName}' dropped successfully`})
	} catch (error) {
		next(error)
	}
}

/**
 * Reindex a collection (rebuild all indexes)
 */
export async function reindexCollection(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params

		const db = await mongoClientManager.getDatabase(connectionId, dbName)

		// reIndex command - note this is deprecated in MongoDB 6.0+
		// but still works in 4.4 and 5.x
		await db.command({reIndex: collectionName})

		res.json({message: `Collection '${collectionName}' reindexed successfully`})
	} catch (error) {
		// Handle case where reIndex is not supported
		if (error.code === 59) {
			return res.status(400).json({
				error: 'reIndex command is not supported on this MongoDB version'
			})
		}
		next(error)
	}
}
