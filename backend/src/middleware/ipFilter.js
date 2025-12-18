import {checkIpAccess, getClientIp} from '../controllers/settings.js'

/**
 * IP Filtering Middleware
 * Checks if the client's IP address is allowed based on settings
 */
export function ipFilterMiddleware(req, res, next) {
	const clientIp = getClientIp(req)
	const {allowed, reason} = checkIpAccess(clientIp)

	if (!allowed) {
		console.warn(`[IP Filter] Access denied for ${clientIp}: ${reason}`)
		return res.status(403).json({
			error: 'Access denied',
			message: 'Your IP address is not allowed to access this application.',
			ip: clientIp
		})
	}

	next()
}

export default ipFilterMiddleware
