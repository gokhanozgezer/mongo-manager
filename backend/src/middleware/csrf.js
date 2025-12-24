import crypto from 'crypto'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

function generateToken() {
	return crypto.randomBytes(32).toString('hex')
}

export function csrfMiddleware(req, res, next) {
	// Skip CSRF for certain paths
	const skipPaths = ['/health', '/api/auth/login']
	if (skipPaths.some(path => req.path === path || req.path.startsWith(path))) {
		return next()
	}

	// For GET/HEAD/OPTIONS requests, set or refresh the CSRF cookie
	if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
		let token = req.cookies?.[CSRF_COOKIE_NAME]

		// Generate new token if not present
		if (!token) {
			token = generateToken()
		}

		// Set the cookie (httpOnly: false so JS can read it)
		res.cookie(CSRF_COOKIE_NAME, token, {
			httpOnly: false, // Must be readable by JavaScript
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 24 * 60 * 60 * 1000 // 24 hours
		})

		return next()
	}

	// For state-changing requests, validate the token
	if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
		const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
		const headerToken = req.headers[CSRF_HEADER_NAME]

		// Both tokens must be present and match
		if (!cookieToken || !headerToken) {
			return res.status(403).json({
				error: 'CSRF token missing',
				message: 'Please refresh the page and try again'
			})
		}

		if (cookieToken !== headerToken) {
			return res.status(403).json({
				error: 'CSRF token mismatch',
				message: 'Please refresh the page and try again'
			})
		}
	}

	next()
}

export function csrfLightMiddleware(req, res, next) {
	// Skip for safe methods
	if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
		return next()
	}

	// Skip for certain paths
	const skipPaths = ['/health']
	if (skipPaths.some(path => req.path === path)) {
		return next()
	}

	// Check Origin or Referer header for state-changing requests
	const origin = req.headers.origin
	const referer = req.headers.referer
	const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

	// Extract origin from allowed origin
	let allowedHost
	try {
		allowedHost = new URL(allowedOrigin).host
	} catch {
		allowedHost = 'localhost'
	}

	// Validate origin
	if (origin) {
		try {
			const originHost = new URL(origin).host
			if (originHost !== allowedHost && !originHost.startsWith('localhost')) {
				return res.status(403).json({
					error: 'Invalid origin',
					message: 'Request blocked due to invalid origin'
				})
			}
		} catch {
			// Invalid origin URL
			return res.status(403).json({
				error: 'Invalid origin format',
				message: 'Request blocked due to malformed origin header'
			})
		}
	} else if (referer) {
		// Fallback to referer check
		try {
			const refererHost = new URL(referer).host
			if (refererHost !== allowedHost && !refererHost.startsWith('localhost')) {
				return res.status(403).json({
					error: 'Invalid referer',
					message: 'Request blocked due to invalid referer'
				})
			}
		} catch {
			// Invalid referer URL
			return res.status(403).json({
				error: 'Invalid referer format',
				message: 'Request blocked due to malformed referer header'
			})
		}
	}

	next()
}

export default {
	csrfMiddleware,
	csrfLightMiddleware,
	CSRF_COOKIE_NAME,
	CSRF_HEADER_NAME
}
