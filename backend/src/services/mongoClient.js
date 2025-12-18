import {MongoClient, ObjectId} from 'mongodb'
import {loadConnections} from '../config/index.js'

/**
 * MongoDB Client Manager
 * Handles connection lifecycle for multiple MongoDB servers
 * Compatible with MongoDB 4.4+ (avoids features requiring newer versions)
 */
class MongoClientManager {
	constructor() {
		// Cache of active connections: connectionId -> { client, lastUsed }
		this.clients = new Map()
		// Connection timeout (close idle connections after 5 minutes)
		this.idleTimeout = 5 * 60 * 1000
		// Start cleanup interval
		this.startCleanupInterval()
	}

	/**
	 * Build MongoDB URI from connection config
	 * @param {Object} connConfig - Connection configuration
	 * @returns {string} MongoDB connection URI
	 */
	buildUri(connConfig) {
		const {host, port, username, password, authDatabase, uri} = connConfig

		// If a full URI is provided, use it directly
		if (uri) {
			return uri
		}

		// Build URI from components
		let mongoUri = 'mongodb://'

		if (username && password) {
			mongoUri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
		}

		mongoUri += `${host || 'localhost'}:${port || 27017}`

		if (authDatabase && username) {
			mongoUri += `/?authSource=${authDatabase}`
		}

		return mongoUri
	}

	/**
	 * Get or create a MongoDB client for a connection
	 * @param {string} connectionId - Connection identifier
	 * @returns {Promise<MongoClient>} MongoDB client instance
	 */
	async getClient(connectionId) {
		// Always verify connection exists in config (even if cached)
		const connections = loadConnections()
		const connConfig = connections.find(c => c.id === connectionId)

		if (!connConfig) {
			// Connection was deleted - close cached client if exists
			if (this.clients.has(connectionId)) {
				await this.closeConnection(connectionId)
			}
			throw new Error(`Connection not found: ${connectionId}`)
		}

		// Check if we have a cached client
		if (this.clients.has(connectionId)) {
			const cached = this.clients.get(connectionId)
			cached.lastUsed = Date.now()
			return cached.client
		}

		// Create new client with options compatible with MongoDB 4.4+
		const uri = this.buildUri(connConfig)
		const options = {
			// These options work with MongoDB 4.4+
			maxPoolSize: 10,
			minPoolSize: 1,
			maxIdleTimeMS: this.idleTimeout,
			connectTimeoutMS: 10000,
			serverSelectionTimeoutMS: 10000,
			...connConfig.options
		}

		const client = new MongoClient(uri, options)

		try {
			await client.connect()

			// Cache the client
			this.clients.set(connectionId, {
				client,
				lastUsed: Date.now()
			})

			return client
		} catch (error) {
			// Don't expose sensitive connection details in error
			throw new Error(`Failed to connect to MongoDB server: ${error.message}`)
		}
	}

	/**
	 * Get a database instance
	 * @param {string} connectionId - Connection identifier
	 * @param {string} dbName - Database name
	 * @returns {Promise<Db>} MongoDB database instance
	 */
	async getDatabase(connectionId, dbName) {
		const client = await this.getClient(connectionId)
		return client.db(dbName)
	}

	/**
	 * Get a collection instance
	 * @param {string} connectionId - Connection identifier
	 * @param {string} dbName - Database name
	 * @param {string} collectionName - Collection name
	 * @returns {Promise<Collection>} MongoDB collection instance
	 */
	async getCollection(connectionId, dbName, collectionName) {
		const db = await this.getDatabase(connectionId, dbName)
		return db.collection(collectionName)
	}

	/**
	 * Close a specific connection
	 * @param {string} connectionId - Connection identifier
	 */
	async closeConnection(connectionId) {
		if (this.clients.has(connectionId)) {
			const {client} = this.clients.get(connectionId)
			try {
				await client.close()
			} catch (error) {
				console.error(`Error closing connection ${connectionId}:`, error.message)
			}
			this.clients.delete(connectionId)
		}
	}

	/**
	 * Close all connections
	 */
	async closeAllConnections() {
		for (const [connectionId] of this.clients) {
			await this.closeConnection(connectionId)
		}
	}

	/**
	 * Test a connection configuration
	 * @param {Object} connConfig - Connection configuration to test
	 * @returns {Promise<Object>} Connection test result
	 */
	async testConnection(connConfig) {
		const uri = this.buildUri(connConfig)
		const client = new MongoClient(uri, {
			connectTimeoutMS: 5000,
			serverSelectionTimeoutMS: 5000
		})

		try {
			await client.connect()
			const adminDb = client.db('admin')

			// Test listDatabases to verify authentication works
			// This will fail if auth is required but not provided
			await adminDb.command({listDatabases: 1})

			// Get server version for display
			const serverInfo = await adminDb.command({buildInfo: 1})
			await client.close()

			return {
				success: true,
				version: serverInfo.version,
				message: `Successfully connected to MongoDB ${serverInfo.version}`
			}
		} catch (error) {
			try {
				await client.close()
			} catch (e) {}

			// Provide helpful error messages
			let message = error.message
			if (error.code === 13 || error.codeName === 'Unauthorized') {
				message = 'Authentication failed. Please check username and password.'
			} else if (error.code === 18) {
				message = 'Authentication failed. Invalid credentials.'
			}

			return {
				success: false,
				message: `Connection failed: ${message}`
			}
		}
	}

	/**
	 * Start interval to clean up idle connections
	 */
	startCleanupInterval() {
		setInterval(() => {
			const now = Date.now()
			for (const [connectionId, data] of this.clients) {
				if (now - data.lastUsed > this.idleTimeout) {
					this.closeConnection(connectionId)
				}
			}
		}, 60000) // Check every minute
	}

	/**
	 * Parse ObjectId from string if valid
	 * @param {string} id - ID string to parse
	 * @returns {ObjectId|string} ObjectId if valid, original string otherwise
	 */
	static parseObjectId(id) {
		if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
			return new ObjectId(id)
		}
		return id
	}
}

// Export singleton instance
const mongoClientManager = new MongoClientManager()

// Handle process termination
process.on('SIGINT', async () => {
	await mongoClientManager.closeAllConnections()
	process.exit(0)
})

process.on('SIGTERM', async () => {
	await mongoClientManager.closeAllConnections()
	process.exit(0)
})

export default mongoClientManager
export {ObjectId}
