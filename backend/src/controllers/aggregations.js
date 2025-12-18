import mongoClientManager, {ObjectId} from '../services/mongoClient.js'
import {loadPipelines, savePipelines} from '../config/index.js'
import {randomUUID} from 'crypto'

/**
 * Convert extended JSON notation in aggregation pipeline
 * @param {any} obj - Object to convert
 * @returns {any} Converted object
 */
function convertExtendedJson(obj) {
	if (obj === null || obj === undefined) {
		return obj
	}

	if (Array.isArray(obj)) {
		return obj.map(convertExtendedJson)
	}

	if (typeof obj === 'object') {
		// Handle $oid extended JSON
		if (obj.$oid && typeof obj.$oid === 'string') {
			return new ObjectId(obj.$oid)
		}

		// Handle $date extended JSON
		if (obj.$date) {
			return new Date(obj.$date)
		}

		// Recursively process object properties
		const converted = {}
		for (const [key, value] of Object.entries(obj)) {
			converted[key] = convertExtendedJson(value)
		}
		return converted
	}

	return obj
}

/**
 * Convert MongoDB document to JSON-safe format
 * @param {Object} doc - MongoDB document
 * @returns {Object} JSON-safe document
 */
function documentToJson(doc) {
	if (doc === null || doc === undefined) {
		return doc
	}

	if (Array.isArray(doc)) {
		return doc.map(documentToJson)
	}

	if (doc instanceof ObjectId) {
		return {$oid: doc.toString()}
	}

	if (doc instanceof Date) {
		return {$date: doc.toISOString()}
	}

	if (typeof doc === 'object') {
		const result = {}
		for (const [key, value] of Object.entries(doc)) {
			result[key] = documentToJson(value)
		}
		return result
	}

	return doc
}

/**
 * Run an aggregation pipeline
 */
export async function runAggregation(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {pipeline, page = 1, pageSize = 20, explain = false} = req.body

		if (!pipeline || !Array.isArray(pipeline)) {
			return res.status(400).json({error: 'Pipeline must be an array of stages'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Convert extended JSON in pipeline
		const convertedPipeline = convertExtendedJson(pipeline)

		// If explain mode, return the explain output
		if (explain) {
			const explained = await collection.aggregate(convertedPipeline).explain('executionStats')
			return res.json({
				explain: documentToJson(explained)
			})
		}

		// Add pagination stages if not already present
		// Check if pipeline already has $skip/$limit
		const hasSkip = convertedPipeline.some(stage => '$skip' in stage)
		const hasLimit = convertedPipeline.some(stage => '$limit' in stage)

		// For paginated results, we need to run two aggregations:
		// 1. One to get the count (with $count stage)
		// 2. One to get the actual results

		// Count pipeline (add $count at the end)
		const countPipeline = [...convertedPipeline, {$count: 'total'}]
		const countResult = await collection.aggregate(countPipeline).toArray()
		const totalCount = countResult.length > 0 ? countResult[0].total : 0

		// Results pipeline (add pagination if not present)
		let resultsPipeline = [...convertedPipeline]

		if (!hasSkip && !hasLimit) {
			const skip = (parseInt(page) - 1) * parseInt(pageSize)
			resultsPipeline.push({$skip: skip})
			resultsPipeline.push({$limit: parseInt(pageSize)})
		}

		// Run the aggregation
		const results = await collection.aggregate(resultsPipeline).toArray()

		res.json({
			results: results.map(documentToJson),
			pagination: {
				page: parseInt(page),
				pageSize: parseInt(pageSize),
				totalCount,
				totalPages: Math.ceil(totalCount / parseInt(pageSize))
			}
		})
	} catch (error) {
		// Provide more helpful error messages for aggregation errors
		if (error.code) {
			return res.status(400).json({
				error: `Aggregation error: ${error.message}`,
				code: error.code
			})
		}
		next(error)
	}
}

/**
 * List saved pipelines for a collection
 */
export async function listSavedPipelines(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params

		const allPipelines = loadPipelines()

		// Filter pipelines for this specific collection
		const pipelines = allPipelines.filter(p => p.connectionId === connectionId && p.database === dbName && p.collection === collectionName)

		res.json({
			pipelines: pipelines.map(p => ({
				id: p.id,
				name: p.name,
				description: p.description,
				pipeline: p.pipeline,
				createdAt: p.createdAt,
				updatedAt: p.updatedAt
			}))
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Get a specific saved pipeline
 */
export async function getSavedPipeline(req, res, next) {
	try {
		const {pipelineId} = req.params

		const allPipelines = loadPipelines()
		const pipeline = allPipelines.find(p => p.id === pipelineId)

		if (!pipeline) {
			return res.status(404).json({error: 'Pipeline not found'})
		}

		res.json({
			id: pipeline.id,
			name: pipeline.name,
			description: pipeline.description,
			pipeline: pipeline.pipeline,
			connectionId: pipeline.connectionId,
			database: pipeline.database,
			collection: pipeline.collection,
			createdAt: pipeline.createdAt,
			updatedAt: pipeline.updatedAt
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Save a new pipeline
 */
export async function savePipeline(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {name, description, pipeline} = req.body

		if (!name) {
			return res.status(400).json({error: 'Pipeline name is required'})
		}

		if (!pipeline || !Array.isArray(pipeline)) {
			return res.status(400).json({error: 'Pipeline must be an array of stages'})
		}

		const allPipelines = loadPipelines()

		const newPipeline = {
			id: randomUUID(),
			name,
			description: description || '',
			pipeline,
			connectionId,
			database: dbName,
			collection: collectionName,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		allPipelines.push(newPipeline)

		if (!savePipelines(allPipelines)) {
			return res.status(500).json({error: 'Failed to save pipeline'})
		}

		res.status(201).json({
			message: 'Pipeline saved successfully',
			id: newPipeline.id,
			name: newPipeline.name
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Update an existing pipeline
 */
export async function updateSavedPipeline(req, res, next) {
	try {
		const {pipelineId} = req.params
		const {name, description, pipeline} = req.body

		const allPipelines = loadPipelines()
		const index = allPipelines.findIndex(p => p.id === pipelineId)

		if (index === -1) {
			return res.status(404).json({error: 'Pipeline not found'})
		}

		// Update fields
		if (name !== undefined) {
			allPipelines[index].name = name
		}
		if (description !== undefined) {
			allPipelines[index].description = description
		}
		if (pipeline !== undefined) {
			if (!Array.isArray(pipeline)) {
				return res.status(400).json({error: 'Pipeline must be an array of stages'})
			}
			allPipelines[index].pipeline = pipeline
		}

		allPipelines[index].updatedAt = new Date().toISOString()

		if (!savePipelines(allPipelines)) {
			return res.status(500).json({error: 'Failed to update pipeline'})
		}

		res.json({
			message: 'Pipeline updated successfully',
			id: allPipelines[index].id,
			name: allPipelines[index].name
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Delete a saved pipeline
 */
export async function deleteSavedPipeline(req, res, next) {
	try {
		const {pipelineId} = req.params

		const allPipelines = loadPipelines()
		const index = allPipelines.findIndex(p => p.id === pipelineId)

		if (index === -1) {
			return res.status(404).json({error: 'Pipeline not found'})
		}

		allPipelines.splice(index, 1)

		if (!savePipelines(allPipelines)) {
			return res.status(500).json({error: 'Failed to delete pipeline'})
		}

		res.json({message: 'Pipeline deleted successfully'})
	} catch (error) {
		next(error)
	}
}
