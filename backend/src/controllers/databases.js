import mongoClientManager from '../services/mongoClient.js'

/**
 * List all databases for a connection with collection counts and full stats
 */
export async function listDatabases(req, res, next) {
	try {
		const {connectionId} = req.params

		const client = await mongoClientManager.getClient(connectionId)
		const adminDb = client.db('admin')

		// listDatabases command is available in MongoDB 4.4+
		const result = await adminDb.command({listDatabases: 1})

		// Get collection count and stats for each database
		const databases = await Promise.all(
			result.databases.map(async dbInfo => {
				let collectionCount = 0
				let storageSize = 0
				let dataSize = 0
				let indexSize = 0
				let objects = 0

				try {
					const db = client.db(dbInfo.name)
					const collections = await db.listCollections().toArray()
					collectionCount = collections.length

					// Get detailed stats using dbStats command
					const stats = await db.command({dbStats: 1})
					storageSize = stats.storageSize || 0
					dataSize = stats.dataSize || 0
					indexSize = stats.indexSize || 0
					objects = stats.objects || 0
				} catch (e) {
					// Ignore error for special databases
				}

				return {
					name: dbInfo.name,
					sizeOnDisk: dbInfo.sizeOnDisk,
					empty: dbInfo.empty,
					collectionCount,
					storageSize,
					dataSize,
					indexSize,
					objects
				}
			})
		)

		res.json({
			databases,
			totalSize: result.totalSize
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Get database stats
 */
export async function getDatabaseStats(req, res, next) {
	try {
		const {connectionId, dbName} = req.params

		const db = await mongoClientManager.getDatabase(connectionId, dbName)

		// dbStats command is available in MongoDB 4.4+
		const stats = await db.command({dbStats: 1})

		res.json({
			db: stats.db,
			collections: stats.collections,
			views: stats.views,
			objects: stats.objects,
			avgObjSize: stats.avgObjSize,
			dataSize: stats.dataSize,
			storageSize: stats.storageSize,
			indexes: stats.indexes,
			indexSize: stats.indexSize
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Create a new database (by creating a collection in it)
 */
export async function createDatabase(req, res, next) {
	try {
		const {connectionId} = req.params
		const {name, initialCollection} = req.body

		if (!name) {
			return res.status(400).json({error: 'Database name is required'})
		}

		const collectionName = initialCollection || '_init'

		const client = await mongoClientManager.getClient(connectionId)
		const db = client.db(name)

		// Create an initial collection (MongoDB creates database on first write)
		await db.createCollection(collectionName)

		res.status(201).json({
			message: `Database '${name}' created with collection '${collectionName}'`,
			database: name,
			collection: collectionName
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Drop a database
 */
export async function dropDatabase(req, res, next) {
	try {
		const {connectionId, dbName} = req.params

		// Prevent dropping system databases
		const systemDbs = ['admin', 'local', 'config']
		if (systemDbs.includes(dbName)) {
			return res.status(400).json({error: `Cannot drop system database: ${dbName}`})
		}

		const db = await mongoClientManager.getDatabase(connectionId, dbName)
		await db.dropDatabase()

		res.json({message: `Database '${dbName}' dropped successfully`})
	} catch (error) {
		next(error)
	}
}
