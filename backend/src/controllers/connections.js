import {loadConnections, saveConnections} from '../config/index.js'
import mongoClientManager from '../services/mongoClient.js'
import {randomUUID} from 'crypto'

/**
 * List all configured connections (without sensitive data)
 */
export async function listConnections(req, res, next) {
	try {
		const connections = loadConnections()

		// Return connections without sensitive data (password)
		const safeConnections = connections.map(conn => ({
			id: conn.id,
			name: conn.name,
			host: conn.host,
			port: conn.port,
			username: conn.username || '',
			authDatabase: conn.authDatabase || 'admin',
			hasAuth: !!(conn.username && conn.password),
			autoConnect: conn.autoConnect !== false // Default to true if not set
		}))

		res.json({connections: safeConnections})
	} catch (error) {
		next(error)
	}
}

/**
 * Get single connection details (without sensitive data)
 */
export async function getConnection(req, res, next) {
	try {
		const {connectionId} = req.params
		const connections = loadConnections()
		const conn = connections.find(c => c.id === connectionId)

		if (!conn) {
			return res.status(404).json({error: 'Connection not found'})
		}

		res.json({
			id: conn.id,
			name: conn.name,
			host: conn.host,
			port: conn.port,
			hasAuth: !!(conn.username && conn.password),
			authDatabase: conn.authDatabase,
			autoConnect: conn.autoConnect !== false
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Create a new connection
 */
export async function createConnection(req, res, next) {
	try {
		const {name, host, port, username, password, authDatabase, uri, options, autoConnect} = req.body

		if (!name) {
			return res.status(400).json({error: 'Connection name is required'})
		}

		if (!uri && !host) {
			return res.status(400).json({error: 'Either host or uri is required'})
		}

		const connections = loadConnections()

		const newConnection = {
			id: randomUUID(),
			name,
			host: host || '',
			port: port || 27017,
			username: username || '',
			password: password || '',
			authDatabase: authDatabase || 'admin',
			uri: uri || '',
			options: options || {},
			autoConnect: autoConnect !== false // Default to true
		}

		connections.push(newConnection)

		if (!saveConnections(connections)) {
			return res.status(500).json({error: 'Failed to save connection'})
		}

		res.status(201).json({
			id: newConnection.id,
			name: newConnection.name,
			host: newConnection.host,
			port: newConnection.port,
			username: newConnection.username || '',
			authDatabase: newConnection.authDatabase || 'admin',
			hasAuth: !!(newConnection.username && newConnection.password),
			autoConnect: newConnection.autoConnect
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Update an existing connection
 */
export async function updateConnection(req, res, next) {
	try {
		const {connectionId} = req.params
		const {name, host, port, username, password, authDatabase, uri, options, autoConnect} = req.body

		const connections = loadConnections()
		const index = connections.findIndex(c => c.id === connectionId)

		if (index === -1) {
			return res.status(404).json({error: 'Connection not found'})
		}

		// Close existing connection if it's active
		await mongoClientManager.closeConnection(connectionId)

		// Update connection
		connections[index] = {
			...connections[index],
			name: name ?? connections[index].name,
			host: host ?? connections[index].host,
			port: port ?? connections[index].port,
			username: username ?? connections[index].username,
			password: password ?? connections[index].password,
			authDatabase: authDatabase ?? connections[index].authDatabase,
			uri: uri ?? connections[index].uri,
			options: options ?? connections[index].options,
			autoConnect: autoConnect ?? connections[index].autoConnect
		}

		if (!saveConnections(connections)) {
			return res.status(500).json({error: 'Failed to save connection'})
		}

		const conn = connections[index]
		res.json({
			id: conn.id,
			name: conn.name,
			host: conn.host,
			port: conn.port,
			username: conn.username || '',
			authDatabase: conn.authDatabase || 'admin',
			hasAuth: !!(conn.username && conn.password),
			autoConnect: conn.autoConnect !== false
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Delete a connection
 */
export async function deleteConnection(req, res, next) {
	try {
		const {connectionId} = req.params

		const connections = loadConnections()
		const index = connections.findIndex(c => c.id === connectionId)

		if (index === -1) {
			return res.status(404).json({error: 'Connection not found'})
		}

		// Close connection if active
		await mongoClientManager.closeConnection(connectionId)

		// Remove connection
		connections.splice(index, 1)

		if (!saveConnections(connections)) {
			return res.status(500).json({error: 'Failed to save connections'})
		}

		res.json({message: 'Connection deleted successfully'})
	} catch (error) {
		next(error)
	}
}

/**
 * Test a connection
 */
export async function testConnection(req, res, next) {
	try {
		const {connectionId} = req.params
		const connections = loadConnections()
		const connConfig = connections.find(c => c.id === connectionId)

		if (!connConfig) {
			return res.status(404).json({error: 'Connection not found'})
		}

		const result = await mongoClientManager.testConnection(connConfig)
		res.json(result)
	} catch (error) {
		next(error)
	}
}

/**
 * Test a new connection configuration (before saving)
 */
export async function testNewConnection(req, res, next) {
	try {
		const {host, port, username, password, authDatabase, uri, options} = req.body

		const connConfig = {
			host: host || 'localhost',
			port: port || 27017,
			username: username || '',
			password: password || '',
			authDatabase: authDatabase || 'admin',
			uri: uri || '',
			options: options || {}
		}

		const result = await mongoClientManager.testConnection(connConfig)
		res.json(result)
	} catch (error) {
		next(error)
	}
}
