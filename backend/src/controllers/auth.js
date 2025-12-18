import {authenticate, logout, verifyToken, changePassword, changeUsername} from '../config/auth.js'

// Login endpoint
export async function login(req, res, next) {
	try {
		const {username, password} = req.body

		if (!username || !password) {
			return res.status(400).json({error: 'Username and password are required'})
		}

		const result = authenticate(username, password)

		if (!result) {
			return res.status(401).json({error: 'Invalid username or password'})
		}

		res.json({
			message: 'Login successful',
			token: result.token,
			user: result.user
		})
	} catch (error) {
		next(error)
	}
}

// Logout endpoint
export async function logoutHandler(req, res, next) {
	try {
		const authHeader = req.headers.authorization

		if (authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.substring(7)
			logout(token)
		}

		res.json({message: 'Logged out successfully'})
	} catch (error) {
		next(error)
	}
}

// Verify token / get current user
export async function me(req, res, next) {
	try {
		const authHeader = req.headers.authorization

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({error: 'Not authenticated'})
		}

		const token = authHeader.substring(7)
		const session = verifyToken(token)

		if (!session) {
			return res.status(401).json({error: 'Invalid or expired token'})
		}

		res.json({
			user: {
				id: session.userId,
				username: session.username,
				role: session.role
			}
		})
	} catch (error) {
		next(error)
	}
}

// Change password endpoint
export async function changePasswordHandler(req, res, next) {
	try {
		const {currentPassword, newPassword} = req.body

		if (!currentPassword || !newPassword) {
			return res.status(400).json({error: 'Current password and new password are required'})
		}

		if (newPassword.length < 4) {
			return res.status(400).json({error: 'New password must be at least 4 characters'})
		}

		const result = changePassword(req.user.userId, currentPassword, newPassword)

		if (!result.success) {
			return res.status(400).json({error: result.error})
		}

		res.json({message: 'Password changed successfully'})
	} catch (error) {
		next(error)
	}
}

// Change username endpoint
export async function changeUsernameHandler(req, res, next) {
	try {
		const {newUsername} = req.body

		if (!newUsername) {
			return res.status(400).json({error: 'New username is required'})
		}

		if (newUsername.length < 3) {
			return res.status(400).json({error: 'Username must be at least 3 characters'})
		}

		const result = changeUsername(req.user.userId, newUsername)

		if (!result.success) {
			return res.status(400).json({error: result.error})
		}

		res.json({message: 'Username changed successfully', username: result.username})
	} catch (error) {
		next(error)
	}
}
