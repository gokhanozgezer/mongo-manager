import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import {errorHandler, notFoundHandler} from './middleware/errorHandler.js'
import {ipFilterMiddleware} from './middleware/ipFilter.js'

/**
 * Create and configure Express application
 * @returns {Express} Configured Express app
 */
export function createApp() {
	const app = express()

	// =============================================================================
	// Middleware
	// =============================================================================

	// Enable CORS for frontend
	app.use(
		cors({
			origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization']
		})
	)

	// Parse JSON bodies (with size limit)
	app.use(express.json({limit: '10mb'}))

	// Parse URL-encoded bodies
	app.use(express.urlencoded({extended: true}))

	// Request logging (development only)
	if (process.env.NODE_ENV !== 'production') {
		app.use((req, res, next) => {
			const start = Date.now()
			res.on('finish', () => {
				const duration = Date.now() - start
				console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`)
			})
			next()
		})
	}

	// IP filtering middleware (check whitelist/blacklist)
	app.use(ipFilterMiddleware)

	// =============================================================================
	// Routes
	// =============================================================================

	// Health check endpoint
	app.get('/health', (req, res) => {
		res.json({status: 'ok', timestamp: new Date().toISOString()})
	})

	// API routes
	app.use('/api', routes)

	// =============================================================================
	// Error Handling
	// =============================================================================

	// 404 handler
	app.use(notFoundHandler)

	// Global error handler
	app.use(errorHandler)

	return app
}

export default createApp
