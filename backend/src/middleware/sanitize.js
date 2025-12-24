function sanitizeString(str) {
	if (typeof str !== 'string') return str

	// Remove null bytes
	let sanitized = str.replace(/\0/g, '')

	// Remove potential NoSQL injection operators at the start of strings
	// This is a basic protection - MongoDB queries should use parameterized queries
	if (sanitized.startsWith('$')) {
		sanitized = sanitized.slice(1)
	}

	return sanitized
}

function sanitizeObject(obj, depth = 0) {
	// Prevent too deep recursion
	if (depth > 20) return obj

	if (obj === null || obj === undefined) return obj

	if (typeof obj === 'string') {
		return sanitizeString(obj)
	}

	if (Array.isArray(obj)) {
		return obj.map(item => sanitizeObject(item, depth + 1))
	}

	if (typeof obj === 'object') {
		const sanitized = {}
		for (const [key, value] of Object.entries(obj)) {
			// Sanitize key names - remove keys starting with $ (NoSQL injection prevention)
			// Exception: Allow MongoDB operators in specific contexts (handled by controllers)
			const sanitizedKey = sanitizeString(key)
			sanitized[sanitizedKey] = sanitizeObject(value, depth + 1)
		}
		return sanitized
	}

	return obj
}

export function validateRequired(obj, requiredFields) {
	const missing = []
	for (const field of requiredFields) {
		const value = obj[field]
		if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
			missing.push(field)
		}
	}
	return {
		valid: missing.length === 0,
		missing
	}
}

export function validateLength(str, min = 0, max = Infinity) {
	if (typeof str !== 'string') return false
	return str.length >= min && str.length <= max
}

export function validatePattern(str, pattern) {
	if (typeof str !== 'string') return false
	return pattern.test(str)
}

export const patterns = {
	// MongoDB database name (no special chars, dots allowed)
	dbName: /^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/,
	// MongoDB collection name
	collectionName: /^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/,
	// Connection name (more lenient)
	connectionName: /^[a-zA-Z0-9_\s\-.]+$/,
	// Hostname or IP
	host: /^[a-zA-Z0-9][a-zA-Z0-9.-]*$/,
	// Safe identifier
	identifier: /^[a-zA-Z_][a-zA-Z0-9_]*$/
}

export function sanitizeMiddleware(req, res, next) {
	try {
		// Sanitize query parameters (but be careful with MongoDB query operators)
		if (req.query) {
			// Only sanitize string values in query, leave objects alone for MongoDB queries
			for (const [key, value] of Object.entries(req.query)) {
				if (typeof value === 'string') {
					req.query[key] = sanitizeString(value)
				}
			}
		}

		// Sanitize URL parameters
		if (req.params) {
			for (const [key, value] of Object.entries(req.params)) {
				if (typeof value === 'string') {
					req.params[key] = sanitizeString(value)
				}
			}
		}

		next()
	} catch (error) {
		next(error)
	}
}

export default {
	sanitizeMiddleware,
	sanitizeString,
	sanitizeObject,
	validateRequired,
	validateLength,
	validatePattern,
	patterns
}
