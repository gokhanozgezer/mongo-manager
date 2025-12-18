import {readFileSync, writeFileSync, existsSync} from 'fs'
import {resolve} from 'path'
import config from '../config/index.js'

const settingsFile = resolve(config.dataDir, 'settings.json')

/**
 * Load settings from JSON file
 * @returns {Object} Settings object
 */
function loadSettings() {
	try {
		if (!existsSync(settingsFile)) {
			const defaultSettings = {
				ipAccess: {
					mode: 'disabled', // 'disabled', 'whitelist', 'blacklist'
					whitelist: [],
					blacklist: []
				}
			}
			writeFileSync(settingsFile, JSON.stringify(defaultSettings, null, 2))
			return defaultSettings
		}
		return JSON.parse(readFileSync(settingsFile, 'utf-8'))
	} catch (error) {
		console.error('Error loading settings:', error.message)
		return {
			ipAccess: {
				mode: 'disabled',
				whitelist: [],
				blacklist: []
			}
		}
	}
}

/**
 * Save settings to JSON file
 * @param {Object} settings - Settings object
 */
function saveSettings(settings) {
	try {
		writeFileSync(settingsFile, JSON.stringify(settings, null, 2))
		return true
	} catch (error) {
		console.error('Error saving settings:', error.message)
		return false
	}
}

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
	// Check for forwarded headers (proxy/load balancer)
	const forwarded = req.headers['x-forwarded-for']
	if (forwarded) {
		return forwarded.split(',')[0].trim()
	}

	// Check x-real-ip header
	if (req.headers['x-real-ip']) {
		return req.headers['x-real-ip']
	}

	// Fall back to connection remote address
	return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown'
}

/**
 * Check if an IP matches a pattern (supports wildcards)
 * @param {string} ip - IP address to check
 * @param {string} pattern - Pattern with optional wildcards (*)
 * @returns {boolean} Whether the IP matches the pattern
 */
export function matchIpPattern(ip, pattern) {
	// Normalize IPv6 localhost to IPv4
	if (ip === '::1' || ip === '::ffff:127.0.0.1') {
		ip = '127.0.0.1'
	}

	// Remove IPv6 prefix if present
	if (ip.startsWith('::ffff:')) {
		ip = ip.substring(7)
	}

	// Exact match
	if (ip === pattern) {
		return true
	}

	// Wildcard pattern matching
	if (pattern.includes('*')) {
		const regexPattern = pattern
			.replace(/\./g, '\\.')  // Escape dots
			.replace(/\*/g, '.*')    // Convert * to regex .*
		const regex = new RegExp(`^${regexPattern}$`)
		return regex.test(ip)
	}

	return false
}

/**
 * Check if an IP is allowed based on current settings
 * @param {string} ip - IP address to check
 * @returns {Object} { allowed: boolean, reason: string }
 */
export function checkIpAccess(ip) {
	const settings = loadSettings()
	const {mode, whitelist, blacklist} = settings.ipAccess

	// Normalize IP
	if (ip === '::1' || ip === '::ffff:127.0.0.1') {
		ip = '127.0.0.1'
	}
	if (ip.startsWith('::ffff:')) {
		ip = ip.substring(7)
	}

	// Always allow localhost
	if (ip === '127.0.0.1' || ip === 'localhost') {
		return {allowed: true, reason: 'localhost always allowed'}
	}

	if (mode === 'disabled') {
		return {allowed: true, reason: 'IP filtering disabled'}
	}

	if (mode === 'whitelist') {
		const isWhitelisted = whitelist.some(pattern => matchIpPattern(ip, pattern))
		if (isWhitelisted) {
			return {allowed: true, reason: 'IP is whitelisted'}
		}
		return {allowed: false, reason: 'IP not in whitelist'}
	}

	if (mode === 'blacklist') {
		const isBlacklisted = blacklist.some(pattern => matchIpPattern(ip, pattern))
		if (isBlacklisted) {
			return {allowed: false, reason: 'IP is blacklisted'}
		}
		return {allowed: true, reason: 'IP not in blacklist'}
	}

	return {allowed: true, reason: 'Unknown mode, allowing by default'}
}

/**
 * Get access settings (including current client IP)
 */
export async function getAccessSettings(req, res, next) {
	try {
		const settings = loadSettings()
		const clientIp = getClientIp(req)

		res.json({
			currentIp: clientIp,
			mode: settings.ipAccess.mode,
			whitelist: settings.ipAccess.whitelist,
			blacklist: settings.ipAccess.blacklist
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Update access settings
 */
export async function updateAccessSettings(req, res, next) {
	try {
		const {mode, whitelist, blacklist} = req.body

		// Validate mode
		if (mode && !['disabled', 'whitelist', 'blacklist'].includes(mode)) {
			return res.status(400).json({error: 'Invalid access mode'})
		}

		// Validate whitelist and blacklist are arrays
		if (whitelist && !Array.isArray(whitelist)) {
			return res.status(400).json({error: 'Whitelist must be an array'})
		}
		if (blacklist && !Array.isArray(blacklist)) {
			return res.status(400).json({error: 'Blacklist must be an array'})
		}

		// Get current client IP
		const clientIp = getClientIp(req)

		// Safety check: warn if enabling whitelist without current IP
		if (mode === 'whitelist' && whitelist && whitelist.length > 0) {
			// Normalize client IP
			let normalizedIp = clientIp
			if (normalizedIp === '::1' || normalizedIp === '::ffff:127.0.0.1') {
				normalizedIp = '127.0.0.1'
			}
			if (normalizedIp.startsWith('::ffff:')) {
				normalizedIp = normalizedIp.substring(7)
			}

			// Check if current IP would be allowed
			const wouldBeAllowed = normalizedIp === '127.0.0.1' ||
				whitelist.some(pattern => matchIpPattern(normalizedIp, pattern))

			if (!wouldBeAllowed) {
				return res.status(400).json({
					error: `Warning: Your current IP (${clientIp}) is not in the whitelist. Adding it to prevent lockout.`,
					suggestedIp: clientIp
				})
			}
		}

		// Load current settings and update
		const settings = loadSettings()

		if (mode !== undefined) {
			settings.ipAccess.mode = mode
		}
		if (whitelist !== undefined) {
			settings.ipAccess.whitelist = whitelist.map(ip => ip.trim()).filter(Boolean)
		}
		if (blacklist !== undefined) {
			settings.ipAccess.blacklist = blacklist.map(ip => ip.trim()).filter(Boolean)
		}

		// Save settings
		if (!saveSettings(settings)) {
			return res.status(500).json({error: 'Failed to save settings'})
		}

		res.json({
			message: 'Access settings updated successfully',
			mode: settings.ipAccess.mode,
			whitelist: settings.ipAccess.whitelist,
			blacklist: settings.ipAccess.blacklist
		})
	} catch (error) {
		next(error)
	}
}

export {loadSettings, getClientIp}
