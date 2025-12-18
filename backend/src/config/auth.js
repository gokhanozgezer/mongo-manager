import {readFileSync, writeFileSync, existsSync} from 'fs'
import {resolve} from 'path'
import crypto from 'crypto'
import config from './index.js'

const usersFile = resolve(config.dataDir, 'users.json')

// Simple token storage (in production, use Redis or similar)
const activeSessions = new Map()

// Hash password with salt
function hashPassword(password, salt = null) {
	salt = salt || crypto.randomBytes(16).toString('hex')
	const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
	return {salt, hash}
}

// Verify password
function verifyPassword(password, salt, hash) {
	const {hash: newHash} = hashPassword(password, salt)
	return newHash === hash
}

// Generate session token
function generateToken() {
	return crypto.randomBytes(32).toString('hex')
}

// Load users from file
function loadUsers() {
	try {
		if (!existsSync(usersFile)) {
			// Clear all active sessions when users file is recreated
			activeSessions.clear()
			console.log('[Auth] Users file not found, cleared all sessions')

			// Create default admin user (username: admin, password: admin)
			const {salt, hash} = hashPassword('admin')
			const defaultUsers = {
				users: [
					{
						id: '1',
						username: 'admin',
						salt,
						hash,
						role: 'admin',
						createdAt: new Date().toISOString()
					}
				]
			}
			writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2))
			console.log('[Auth] Created default admin user (admin/admin)')
			return defaultUsers.users
		}
		const data = JSON.parse(readFileSync(usersFile, 'utf-8'))
		return data.users || []
	} catch (error) {
		console.error('Error loading users:', error.message)
		return []
	}
}

// Save users to file
function saveUsers(users) {
	writeFileSync(usersFile, JSON.stringify({users}, null, 2))
}

// Change password
export function changePassword(userId, currentPassword, newPassword) {
	const users = loadUsers()
	const userIndex = users.findIndex(u => u.id === userId)

	if (userIndex === -1) {
		return {success: false, error: 'User not found'}
	}

	const user = users[userIndex]

	// Verify current password
	if (!verifyPassword(currentPassword, user.salt, user.hash)) {
		return {success: false, error: 'Current password is incorrect'}
	}

	// Hash new password
	const {salt, hash} = hashPassword(newPassword)
	users[userIndex].salt = salt
	users[userIndex].hash = hash
	users[userIndex].updatedAt = new Date().toISOString()

	saveUsers(users)

	return {success: true}
}

// Change username
export function changeUsername(userId, newUsername) {
	const users = loadUsers()
	const userIndex = users.findIndex(u => u.id === userId)

	if (userIndex === -1) {
		return {success: false, error: 'User not found'}
	}

	// Check if username already exists
	if (users.some(u => u.username === newUsername && u.id !== userId)) {
		return {success: false, error: 'Username already exists'}
	}

	users[userIndex].username = newUsername
	users[userIndex].updatedAt = new Date().toISOString()

	saveUsers(users)

	// Update active sessions
	for (const [token, session] of activeSessions.entries()) {
		if (session.userId === userId) {
			session.username = newUsername
		}
	}

	return {success: true, username: newUsername}
}

// Authenticate user
export function authenticate(username, password) {
	const users = loadUsers()
	const user = users.find(u => u.username === username)

	if (!user) {
		return null
	}

	if (!verifyPassword(password, user.salt, user.hash)) {
		return null
	}

	// Generate session token
	const token = generateToken()
	const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

	activeSessions.set(token, {
		userId: user.id,
		username: user.username,
		role: user.role,
		expiresAt
	})

	return {
		token,
		user: {
			id: user.id,
			username: user.username,
			role: user.role
		}
	}
}

// Verify session token
export function verifyToken(token) {
	// First verify user database exists (this may clear sessions if recreated)
	const users = loadUsers()

	// Now check session (after potential clear)
	const session = activeSessions.get(token)

	if (!session) {
		return null
	}

	if (Date.now() > session.expiresAt) {
		activeSessions.delete(token)
		return null
	}

	// Verify user still exists in database
	const userExists = users.some(u => u.id === session.userId)
	if (!userExists) {
		activeSessions.delete(token)
		return null
	}

	return session
}

// Logout
export function logout(token) {
	activeSessions.delete(token)
}

// Auth middleware
export function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({error: 'Authentication required'})
	}

	const token = authHeader.substring(7)
	const session = verifyToken(token)

	if (!session) {
		return res.status(401).json({error: 'Invalid or expired token'})
	}

	req.user = session
	next()
}
