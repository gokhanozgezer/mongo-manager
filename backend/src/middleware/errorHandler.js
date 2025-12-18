/**
 * Global error handler middleware
 * Provides consistent JSON error responses
 */
export function errorHandler(err, req, res, next) {
	// Log error (without sensitive data)
	console.error(`[Error] ${req.method} ${req.path}:`, err.message)

	// MongoDB specific errors
	if (err.name === 'MongoServerError' || err.name === 'MongoError') {
		return res.status(400).json({
			error: 'Database operation failed',
			message: err.message,
			code: err.code
		})
	}

	// JSON parse errors
	if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
		return res.status(400).json({
			error: 'Invalid JSON',
			message: 'Request body contains invalid JSON'
		})
	}

	// Validation errors
	if (err.name === 'ValidationError') {
		return res.status(400).json({
			error: 'Validation failed',
			message: err.message
		})
	}

	// MongoDB connection errors
	if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
		return res.status(503).json({
			error: 'Database connection failed',
			message: 'Unable to connect to MongoDB server'
		})
	}

	// Default error response
	const statusCode = err.statusCode || err.status || 500

	res.status(statusCode).json({
		error: statusCode === 500 ? 'Internal server error' : err.message,
		message: err.message,
		details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
	})
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req, res) {
	res.status(404).json({
		error: 'Not found',
		message: `Route ${req.method} ${req.path} not found`
	})
}
