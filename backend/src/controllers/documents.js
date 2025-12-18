import mongoClientManager, {ObjectId} from '../services/mongoClient.js'

/**
 * Parse a JSON string safely, with support for MongoDB extended JSON
 * @param {string} jsonStr - JSON string to parse
 * @returns {Object} Parsed object
 */
function parseQueryJson(jsonStr) {
	if (!jsonStr || jsonStr.trim() === '') {
		return {}
	}

	let parsed = JSON.parse(jsonStr)

	// Convert $oid strings to ObjectId
	parsed = convertExtendedJson(parsed)

	return parsed
}

/**
 * Recursively convert extended JSON notation to MongoDB types
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
			// Special handling for _id field - try to convert to ObjectId
			if (key === '_id' && typeof value === 'string' && ObjectId.isValid(value)) {
				converted[key] = new ObjectId(value)
			} else {
				converted[key] = convertExtendedJson(value)
			}
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
 * List documents in a collection with pagination and filtering
 */
export async function listDocuments(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {page = 1, pageSize = 20, filter = '{}', sort = '{}', projection = '{}'} = req.query

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Parse query parameters
		const filterObj = parseQueryJson(filter)
		const sortObj = parseQueryJson(sort)
		const projectionObj = parseQueryJson(projection)

		const skip = (parseInt(page) - 1) * parseInt(pageSize)
		const limit = parseInt(pageSize)

		// Get total count for pagination
		const totalCount = await collection.countDocuments(filterObj)

		// Fetch documents
		let cursor = collection.find(filterObj)

		if (Object.keys(projectionObj).length > 0) {
			cursor = cursor.project(projectionObj)
		}

		if (Object.keys(sortObj).length > 0) {
			cursor = cursor.sort(sortObj)
		}

		const documents = await cursor.skip(skip).limit(limit).toArray()

		res.json({
			documents: documents.map(documentToJson),
			pagination: {
				page: parseInt(page),
				pageSize: parseInt(pageSize),
				totalCount,
				totalPages: Math.ceil(totalCount / parseInt(pageSize))
			}
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Get a single document by ID
 */
export async function getDocument(req, res, next) {
	try {
		const {connectionId, dbName, collectionName, documentId} = req.params

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Try to find by ObjectId first, then by string _id
		let document = null

		if (ObjectId.isValid(documentId)) {
			document = await collection.findOne({_id: new ObjectId(documentId)})
		}

		if (!document) {
			document = await collection.findOne({_id: documentId})
		}

		if (!document) {
			return res.status(404).json({error: 'Document not found'})
		}

		res.json({document: documentToJson(document)})
	} catch (error) {
		next(error)
	}
}

/**
 * Insert a new document
 */
export async function insertDocument(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {document} = req.body

		if (!document) {
			return res.status(400).json({error: 'Document is required'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Convert extended JSON and handle the document
		const docToInsert = convertExtendedJson(document)

		const result = await collection.insertOne(docToInsert)

		res.status(201).json({
			message: 'Document inserted successfully',
			insertedId: result.insertedId.toString(),
			acknowledged: result.acknowledged
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Insert multiple documents
 */
export async function insertDocuments(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {documents} = req.body

		if (!documents || !Array.isArray(documents) || documents.length === 0) {
			return res.status(400).json({error: 'Documents array is required'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Convert extended JSON for each document
		const docsToInsert = documents.map(convertExtendedJson)

		const result = await collection.insertMany(docsToInsert)

		res.status(201).json({
			message: `${result.insertedCount} documents inserted successfully`,
			insertedCount: result.insertedCount,
			insertedIds: Object.values(result.insertedIds).map(id => id.toString()),
			acknowledged: result.acknowledged
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Update a document by ID
 */
export async function updateDocument(req, res, next) {
	try {
		const {connectionId, dbName, collectionName, documentId} = req.params
		const {document, replace = false} = req.body

		if (!document) {
			return res.status(400).json({error: 'Document is required'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Build filter for the document
		let filter = {}
		if (ObjectId.isValid(documentId)) {
			filter._id = new ObjectId(documentId)
		} else {
			filter._id = documentId
		}

		// Convert extended JSON
		const docData = convertExtendedJson(document)

		let result

		if (replace) {
			// Replace the entire document (except _id)
			const {_id, ...docWithoutId} = docData
			result = await collection.replaceOne(filter, docWithoutId)
		} else {
			// Use $set to update fields
			const {_id, ...docWithoutId} = docData
			result = await collection.updateOne(filter, {$set: docWithoutId})
		}

		if (result.matchedCount === 0) {
			return res.status(404).json({error: 'Document not found'})
		}

		res.json({
			message: 'Document updated successfully',
			matchedCount: result.matchedCount,
			modifiedCount: result.modifiedCount,
			acknowledged: result.acknowledged
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(req, res, next) {
	try {
		const {connectionId, dbName, collectionName, documentId} = req.params

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Build filter for the document
		let filter = {}
		if (ObjectId.isValid(documentId)) {
			filter._id = new ObjectId(documentId)
		} else {
			filter._id = documentId
		}

		const result = await collection.deleteOne(filter)

		if (result.deletedCount === 0) {
			return res.status(404).json({error: 'Document not found'})
		}

		res.json({
			message: 'Document deleted successfully',
			deletedCount: result.deletedCount,
			acknowledged: result.acknowledged
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Delete multiple documents by IDs
 */
export async function deleteDocuments(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {documentIds} = req.body

		if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
			return res.status(400).json({error: 'Document IDs array is required'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Convert IDs to ObjectId where valid
		const ids = documentIds.map(id => {
			if (ObjectId.isValid(id)) {
				return new ObjectId(id)
			}
			return id
		})

		const result = await collection.deleteMany({_id: {$in: ids}})

		res.json({
			message: `${result.deletedCount} documents deleted successfully`,
			deletedCount: result.deletedCount,
			acknowledged: result.acknowledged
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Update multiple documents by filter (updateMany)
 */
export async function updateManyDocuments(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {filter = {}, update} = req.body

		if (!update) {
			return res.status(400).json({error: 'Update operation is required'})
		}

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Convert extended JSON
		const filterObj = convertExtendedJson(filter)
		const updateObj = convertExtendedJson(update)

		const result = await collection.updateMany(filterObj, updateObj)

		res.json({
			message: `${result.modifiedCount} documents updated successfully`,
			matchedCount: result.matchedCount,
			modifiedCount: result.modifiedCount,
			acknowledged: result.acknowledged
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Delete multiple documents by filter (deleteMany)
 */
export async function deleteManyDocuments(req, res, next) {
	try {
		const {connectionId, dbName, collectionName} = req.params
		const {filter = {}} = req.body

		const collection = await mongoClientManager.getCollection(connectionId, dbName, collectionName)

		// Convert extended JSON
		const filterObj = convertExtendedJson(filter)

		const result = await collection.deleteMany(filterObj)

		res.json({
			message: `${result.deletedCount} documents deleted successfully`,
			deletedCount: result.deletedCount,
			acknowledged: result.acknowledged
		})
	} catch (error) {
		next(error)
	}
}
