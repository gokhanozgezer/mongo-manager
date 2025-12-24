import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import routes from './routes/index.js'
import {errorHandler, notFoundHandler} from './middleware/errorHandler.js'
import {ipFilterMiddleware} from './middleware/ipFilter.js'
import {sanitizeMiddleware} from './middleware/sanitize.js'
import {csrfLightMiddleware} from './middleware/csrf.js'

export function createApp() {
	const app = express()

	// Trust proxy - required for rate limiting behind reverse proxy (Docker/Nginx)
	// This allows express-rate-limit to correctly identify client IPs
	app.set('trust proxy', 1)

	// =============================================================================
	// Security Middleware
	// =============================================================================

	// Security headers with Helmet
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					scriptSrc: ["'self'"],
					imgSrc: ["'self'", 'data:', 'blob:'],
					connectSrc: ["'self'"],
					fontSrc: ["'self'"],
					objectSrc: ["'none'"],
					frameAncestors: ["'none'"]
				}
			},
			crossOriginEmbedderPolicy: false,
			crossOriginResourcePolicy: {policy: 'cross-origin'}
		})
	)

	// Rate limiting - General API limiter
	const generalLimiter = rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 1000, // Limit each IP to 1000 requests per windowMs
		message: {
			error: 'Too many requests from this IP, please try again later.',
			retryAfter: '15 minutes'
		},
		standardHeaders: true,
		legacyHeaders: false,
		skip: (req) => req.path === '/health' // Skip health check endpoint
	})

	// Apply general rate limiter to all routes
	app.use(generalLimiter)

	// =============================================================================
	// CORS & Body Parsing
	// =============================================================================

	// Enable CORS for frontend
	app.use(
		cors({
			origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
			credentials: true
		})
	)

	// Parse JSON bodies (with size limit)
	app.use(express.json({limit: '10mb'}))

	// Parse URL-encoded bodies
	app.use(express.urlencoded({extended: true}))

	// Request sanitization middleware
	app.use(sanitizeMiddleware)

	// CSRF protection (Origin/Referer validation)
	app.use(csrfLightMiddleware)

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
