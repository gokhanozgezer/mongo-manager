/**
 * API Client for Mongo Manager Backend
 */

const API_BASE = '/api'

// Get auth token from localStorage
function getToken() {
	return localStorage.getItem('auth_token')
}

// Set auth token
export function setToken(token) {
	if (token) {
		localStorage.setItem('auth_token', token)
	} else {
		localStorage.removeItem('auth_token')
	}
}

// Check if authenticated
export function isAuthenticated() {
	return !!getToken()
}

/**
 * Generic fetch wrapper with error handling
 */
async function request(path, options = {}) {
	const url = `${API_BASE}${path}`
	const token = getToken()

	const defaultOptions = {
		headers: {
			'Content-Type': 'application/json'
		}
	}

	if (token) {
		defaultOptions.headers['Authorization'] = `Bearer ${token}`
	}

	const config = {
		...defaultOptions,
		...options,
		headers: {
			...defaultOptions.headers,
			...options.headers
		}
	}

	try {
		const response = await fetch(url, config)
		const data = await response.json()

		if (!response.ok) {
			if (response.status === 401) {
				setToken(null)
				// Don't redirect if already on login page or if this is a login attempt
				if (!window.location.pathname.includes('/login') && !path.includes('/auth/login')) {
					window.location.href = '/login'
				}
			}
			throw new Error(data.error || data.message || 'Request failed')
		}

		return data
	} catch (error) {
		if (error.name === 'TypeError') {
			throw new Error('Network error: Unable to connect to server')
		}
		throw error
	}
}

// =============================================================================
// Auth API
// =============================================================================

export const auth = {
	login: (username, password) =>
		request('/auth/login', {
			method: 'POST',
			body: JSON.stringify({username, password})
		}),

	logout: () =>
		request('/auth/logout', {
			method: 'POST'
		}),

	me: () => request('/auth/me'),

	changePassword: (currentPassword, newPassword) =>
		request('/auth/change-password', {
			method: 'POST',
			body: JSON.stringify({currentPassword, newPassword})
		}),

	changeUsername: newUsername =>
		request('/auth/change-username', {
			method: 'POST',
			body: JSON.stringify({newUsername})
		})
}

// =============================================================================
// Connections API
// =============================================================================

export const connections = {
	list: () => request('/connections'),

	get: connectionId => request(`/connections/${connectionId}`),

	create: data =>
		request('/connections', {
			method: 'POST',
			body: JSON.stringify(data)
		}),

	update: (connectionId, data) =>
		request(`/connections/${connectionId}`, {
			method: 'PUT',
			body: JSON.stringify(data)
		}),

	delete: connectionId =>
		request(`/connections/${connectionId}`, {
			method: 'DELETE'
		}),

	test: connectionId =>
		request(`/connections/${connectionId}/test`, {
			method: 'POST'
		}),

	testNew: data =>
		request('/connections/test', {
			method: 'POST',
			body: JSON.stringify(data)
		})
}

// =============================================================================
// Databases API
// =============================================================================

export const databases = {
	list: connectionId => request(`/connections/${connectionId}/databases`),

	stats: (connectionId, dbName) => request(`/connections/${connectionId}/databases/${dbName}/stats`),

	create: (connectionId, data) =>
		request(`/connections/${connectionId}/databases`, {
			method: 'POST',
			body: JSON.stringify(data)
		}),

	drop: (connectionId, dbName) =>
		request(`/connections/${connectionId}/databases/${dbName}`, {
			method: 'DELETE'
		})
}

// =============================================================================
// Collections API
// =============================================================================

export const collections = {
	list: (connectionId, dbName) => request(`/connections/${connectionId}/databases/${dbName}/collections`),

	stats: (connectionId, dbName, collectionName) => request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/stats`),

	create: (connectionId, dbName, data) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections`, {
			method: 'POST',
			body: JSON.stringify(data)
		}),

	drop: (connectionId, dbName, collectionName) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}`, {
			method: 'DELETE'
		}),

	rename: (connectionId, dbName, collectionName, newName) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/rename`, {
			method: 'PUT',
			body: JSON.stringify({newName})
		})
}

// =============================================================================
// Documents API
// =============================================================================

export const documents = {
	list: (connectionId, dbName, collectionName, params = {}) => {
		const queryParams = new URLSearchParams()

		if (params.page) queryParams.set('page', params.page)
		if (params.pageSize) queryParams.set('pageSize', params.pageSize)
		if (params.filter) queryParams.set('filter', params.filter)
		if (params.sort) queryParams.set('sort', params.sort)
		if (params.projection) queryParams.set('projection', params.projection)

		const query = queryParams.toString()
		return request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/documents${query ? `?${query}` : ''}`)
	},

	get: (connectionId, dbName, collectionName, documentId) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/documents/${documentId}`),

	insert: (connectionId, dbName, collectionName, document) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/documents`, {
			method: 'POST',
			body: JSON.stringify({document})
		}),

	insertMany: (connectionId, dbName, collectionName, documents) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/documents/bulk`, {
			method: 'POST',
			body: JSON.stringify({documents})
		}),

	update: (connectionId, dbName, collectionName, documentId, document, replace = false) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/documents/${documentId}`, {
			method: 'PUT',
			body: JSON.stringify({document, replace})
		}),

	delete: (connectionId, dbName, collectionName, documentId) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/documents/${documentId}`, {
			method: 'DELETE'
		}),

	deleteMany: (connectionId, dbName, collectionName, documentIds) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/documents/delete`, {
			method: 'POST',
			body: JSON.stringify({documentIds})
		})
}

// =============================================================================
// Indexes API
// =============================================================================

export const indexes = {
	list: (connectionId, dbName, collectionName) => request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/indexes`),

	create: (connectionId, dbName, collectionName, keys, options = {}) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/indexes`, {
			method: 'POST',
			body: JSON.stringify({keys, options})
		}),

	drop: (connectionId, dbName, collectionName, indexName) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/indexes/${indexName}`, {
			method: 'DELETE'
		}),

	reindex: (connectionId, dbName, collectionName) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/reindex`, {
			method: 'POST'
		})
}

// =============================================================================
// Aggregations API
// =============================================================================

export const aggregations = {
	run: (connectionId, dbName, collectionName, pipeline, options = {}) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/aggregate`, {
			method: 'POST',
			body: JSON.stringify({
				pipeline,
				page: options.page || 1,
				pageSize: options.pageSize || 20,
				explain: options.explain || false,
				skipCount: options.skipCount || false
			})
		}),

	listSaved: (connectionId, dbName, collectionName) => request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/pipelines`),

	getSaved: pipelineId => request(`/pipelines/${pipelineId}`),

	save: (connectionId, dbName, collectionName, data) =>
		request(`/connections/${connectionId}/databases/${dbName}/collections/${collectionName}/pipelines`, {
			method: 'POST',
			body: JSON.stringify(data)
		}),

	updateSaved: (pipelineId, data) =>
		request(`/pipelines/${pipelineId}`, {
			method: 'PUT',
			body: JSON.stringify(data)
		}),

	deleteSaved: pipelineId =>
		request(`/pipelines/${pipelineId}`, {
			method: 'DELETE'
		})
}

// =============================================================================
// Server API
// =============================================================================

export const server = {
	getInfo: connectionId => request(`/connections/${connectionId}/server-info`),

	getStatus: connectionId => request(`/connections/${connectionId}/server-status`),

	getProcesslist: connectionId => request(`/connections/${connectionId}/processlist`),

	executeCommand: (connectionId, database, command) =>
		request(`/connections/${connectionId}/command`, {
			method: 'POST',
			body: JSON.stringify({database, command})
		}),

	executeJs: (connectionId, database, code) =>
		request(`/connections/${connectionId}/execute`, {
			method: 'POST',
			body: JSON.stringify({database, code})
		})
}

// =============================================================================
// Generic API helpers (axios-like interface)
// =============================================================================

export const api = {
	get: async (path, options = {}) => {
		// Support blob responses for file downloads
		if (options.responseType === 'blob') {
			const url = `${API_BASE}${path}`
			const token = getToken()
			const headers = {}
			if (token) {
				headers['Authorization'] = `Bearer ${token}`
			}
			const response = await fetch(url, {headers})
			if (!response.ok) {
				// Try to parse error message from JSON
				try {
					const errorData = await response.json()
					throw new Error(errorData.error || errorData.message || 'Download failed')
				} catch (e) {
					if (e.message !== 'Download failed') throw e
					throw new Error('Download failed')
				}
			}
			const blob = await response.blob()
			return {data: blob}
		}
		const data = await request(path)
		return {data}
	},
	post: async (path, body, options = {}) => {
		// Handle FormData (file uploads) - don't stringify, don't set Content-Type
		if (body instanceof FormData) {
			const url = `${API_BASE}${path}`
			const token = getToken()
			const headers = {}
			if (token) {
				headers['Authorization'] = `Bearer ${token}`
			}
			// Don't set Content-Type - browser will set it with boundary for FormData
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body
			})
			const data = await response.json()
			if (!response.ok) {
				throw new Error(data.error || data.message || 'Upload failed')
			}
			return {data}
		}
		// Regular JSON request
		const data = await request(path, {
			method: 'POST',
			body: JSON.stringify(body)
		})
		return {data}
	},
	put: async (path, body) => {
		const data = await request(path, {
			method: 'PUT',
			body: JSON.stringify(body)
		})
		return {data}
	},
	delete: async path => {
		const data = await request(path, {
			method: 'DELETE'
		})
		return {data}
	}
}

export default {
	auth,
	connections,
	databases,
	collections,
	documents,
	indexes,
	aggregations,
	server,
	api,
	setToken,
	isAuthenticated
}
