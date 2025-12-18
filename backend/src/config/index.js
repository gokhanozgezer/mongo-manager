import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'fs'
import {dirname, resolve} from 'path'
import {fileURLToPath} from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const dataDir = resolve(rootDir, './data')

// Ensure data directory exists
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, {recursive: true})
	console.log('[Init] Created data directory:', dataDir)
}

// Config object
const config = {
	port: process.env.PORT || 3000,
	nodeEnv: process.env.NODE_ENV || 'development',
	dataDir,
	connectionsFile: resolve(dataDir, 'connections.json'),
	pipelinesFile: resolve(dataDir, 'pipelines.json')
}

/**
 * Load connections from JSON file
 * @returns {Array} Array of connection configurations
 */
export function loadConnections() {
	try {
		if (!existsSync(config.connectionsFile)) {
			// Create default connections file if it doesn't exist
			const defaultData = {connections: []}
			writeFileSync(config.connectionsFile, JSON.stringify(defaultData, null, 2))
			return []
		}
		const data = JSON.parse(readFileSync(config.connectionsFile, 'utf-8'))
		return data.connections || []
	} catch (error) {
		console.error('Error loading connections:', error.message)
		return []
	}
}

/**
 * Save connections to JSON file
 * @param {Array} connections - Array of connection configurations
 */
export function saveConnections(connections) {
	try {
		writeFileSync(config.connectionsFile, JSON.stringify({connections}, null, 2))
		return true
	} catch (error) {
		console.error('Error saving connections:', error.message)
		return false
	}
}

/**
 * Load saved pipelines from JSON file
 * @returns {Array} Array of saved pipelines
 */
export function loadPipelines() {
	try {
		if (!existsSync(config.pipelinesFile)) {
			const defaultData = {pipelines: []}
			writeFileSync(config.pipelinesFile, JSON.stringify(defaultData, null, 2))
			return []
		}
		const data = JSON.parse(readFileSync(config.pipelinesFile, 'utf-8'))
		return data.pipelines || []
	} catch (error) {
		console.error('Error loading pipelines:', error.message)
		return []
	}
}

/**
 * Save pipelines to JSON file
 * @param {Array} pipelines - Array of pipeline configurations
 */
export function savePipelines(pipelines) {
	try {
		writeFileSync(config.pipelinesFile, JSON.stringify({pipelines}, null, 2))
		return true
	} catch (error) {
		console.error('Error saving pipelines:', error.message)
		return false
	}
}

export default config
