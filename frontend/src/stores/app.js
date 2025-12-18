import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
import api, {setToken, isAuthenticated} from '../api/index.js'

export const useAppStore = defineStore('app', () => {
	// =============================================================================
	// State
	// =============================================================================

	// Auth
	const user = ref(null)
	const isLoggedIn = ref(isAuthenticated())

	// Theme & Settings
	const isDarkMode = ref(localStorage.getItem('theme') === 'dark')
	const appTheme = ref(localStorage.getItem('appTheme') || 'classic') // 'classic' or 'modern'
	const sidebarTheme = ref(localStorage.getItem('sidebarTheme') || 'dark') // 'dark' or 'light' (for modern theme)
	const appFont = ref(localStorage.getItem('appFont') || "'Open Sans', sans-serif")
	const editorTheme = ref(localStorage.getItem('editorTheme') || 'eclipse')
	const editorFontSize = ref(parseInt(localStorage.getItem('editorFontSize')) || 13)
	const editorFont = ref(localStorage.getItem('editorFont') || "'Fira Code', monospace")

	// Connections
	const connections = ref([])
	const activeConnectionId = ref(null)

	// Databases
	const databases = ref([])
	const selectedDatabase = ref(null)

	// Collections
	const collections = ref([])
	const selectedCollection = ref(null)

	// Collection stats
	const collectionStats = ref(null)

	// Documents
	const documents = ref([])
	const documentsPagination = ref({
		page: 1,
		pageSize: 20,
		totalCount: 0,
		totalPages: 0
	})
	const documentsFilter = ref('{}')
	const documentsSort = ref('{}')

	// Indexes
	const indexes = ref([])

	// Loading states
	const loading = ref({
		connections: false,
		databases: false,
		collections: false,
		documents: false,
		indexes: false,
		stats: false
	})

	// Error state
	const error = ref(null)

	// =============================================================================
	// Computed
	// =============================================================================

	const activeConnection = computed(() => connections.value.find(c => c.id === activeConnectionId.value))

	const hasActiveConnection = computed(() => activeConnectionId.value !== null)

	// =============================================================================
	// Actions - Theme
	// =============================================================================

	function toggleTheme() {
		isDarkMode.value = !isDarkMode.value
		localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
		applyTheme()
	}

	function applyTheme() {
		if (isDarkMode.value) {
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
		}
	}

	function setEditorTheme(theme) {
		editorTheme.value = theme
		localStorage.setItem('editorTheme', theme)
	}

	function setEditorFontSize(size) {
		editorFontSize.value = size
		localStorage.setItem('editorFontSize', size.toString())
	}

	function setEditorFont(font) {
		editorFont.value = font
		localStorage.setItem('editorFont', font)
	}

	function setAppTheme(theme) {
		appTheme.value = theme
		localStorage.setItem('appTheme', theme)
		applyAppTheme()
	}

	function applyAppTheme() {
		if (appTheme.value === 'modern') {
			document.documentElement.classList.add('modern-theme')
		} else {
			document.documentElement.classList.remove('modern-theme')
		}
		applySidebarTheme()
	}

	function setSidebarTheme(theme) {
		sidebarTheme.value = theme
		localStorage.setItem('sidebarTheme', theme)
		applySidebarTheme()
	}

	function applySidebarTheme() {
		// Only apply sidebar theme class if modern theme is active
		if (appTheme.value === 'modern' && sidebarTheme.value === 'light') {
			document.documentElement.classList.add('sidebar-light')
		} else {
			document.documentElement.classList.remove('sidebar-light')
		}
	}

	function setAppFont(font) {
		appFont.value = font
		localStorage.setItem('appFont', font)
		applyAppFont()
	}

	function applyAppFont() {
		document.documentElement.style.setProperty('--app-font', appFont.value)
	}

	// =============================================================================
	// Actions - Auth
	// =============================================================================

	function setUser(userData) {
		user.value = userData
		isLoggedIn.value = true
	}

	async function logout() {
		try {
			await api.auth.logout()
		} catch (e) {
			// Ignore logout errors
		}
		setToken(null)
		user.value = null
		isLoggedIn.value = false
		resetState()
	}

	async function checkAuth() {
		if (!isAuthenticated()) {
			isLoggedIn.value = false
			return false
		}
		try {
			const response = await api.auth.me()
			user.value = response.user
			isLoggedIn.value = true
			return true
		} catch (e) {
			setToken(null)
			isLoggedIn.value = false
			return false
		}
	}

	// =============================================================================
	// Actions - Reset State
	// =============================================================================

	function resetState() {
		connections.value = []
		activeConnectionId.value = null
		databases.value = []
		selectedDatabase.value = null
		collections.value = []
		selectedCollection.value = null
		collectionStats.value = null
		documents.value = []
		indexes.value = []
		documentsPagination.value = {
			page: 1,
			pageSize: 20,
			totalCount: 0,
			totalPages: 0
		}
		documentsFilter.value = '{}'
		documentsSort.value = '{}'
		error.value = null
	}

	// =============================================================================
	// Actions - Connections
	// =============================================================================

	async function fetchConnections() {
		loading.value.connections = true
		error.value = null
		try {
			const data = await api.connections.list()
			connections.value = data.connections
		} catch (err) {
			error.value = err.message
			throw err
		} finally {
			loading.value.connections = false
		}
	}

	async function createConnection(connectionData) {
		const data = await api.connections.create(connectionData)
		await fetchConnections()
		return data
	}

	async function updateConnection(connectionId, connectionData) {
		const data = await api.connections.update(connectionId, connectionData)
		await fetchConnections()
		return data
	}

	async function deleteConnection(connectionId) {
		await api.connections.delete(connectionId)
		if (activeConnectionId.value === connectionId) {
			disconnectFromServer()
		}
		await fetchConnections()
	}

	async function testConnection(connectionId) {
		return await api.connections.test(connectionId)
	}

	async function testNewConnection(connectionData) {
		return await api.connections.testNew(connectionData)
	}

	function setActiveConnection(connectionId) {
		// Avoid unnecessary state reset when clicking the same connection
		if (activeConnectionId.value === connectionId) {
			return
		}
		activeConnectionId.value = connectionId
		// Clear all data from previous connection
		databases.value = []
		selectedDatabase.value = null
		selectedCollection.value = null
		collections.value = []
		documents.value = []
		indexes.value = []
		collectionStats.value = null
	}

	function disconnectFromServer() {
		activeConnectionId.value = null
		databases.value = []
		selectedDatabase.value = null
		collections.value = []
		selectedCollection.value = null
		documents.value = []
		indexes.value = []
		collectionStats.value = null
		documentsPagination.value = {
			page: 1,
			pageSize: 20,
			totalCount: 0,
			totalPages: 0
		}
	}

	// =============================================================================
	// Actions - Databases
	// =============================================================================

	async function fetchDatabases() {
		if (!activeConnectionId.value) return

		loading.value.databases = true
		error.value = null
		try {
			const data = await api.databases.list(activeConnectionId.value)
			databases.value = data.databases
		} catch (err) {
			error.value = err.message
			throw err
		} finally {
			loading.value.databases = false
		}
	}

	async function createDatabase(name, initialCollection) {
		if (!activeConnectionId.value) return

		const data = await api.databases.create(activeConnectionId.value, {
			name,
			initialCollection
		})
		await fetchDatabases()
		return data
	}

	async function dropDatabase(dbName) {
		if (!activeConnectionId.value) return

		await api.databases.drop(activeConnectionId.value, dbName)
		if (selectedDatabase.value === dbName) {
			selectedDatabase.value = null
			collections.value = []
			selectedCollection.value = null
		}
		await fetchDatabases()
	}

	function selectDatabase(dbName) {
		// Avoid clearing collections when clicking the same database
		if (selectedDatabase.value === dbName) {
			return
		}
		selectedDatabase.value = dbName
		selectedCollection.value = null
		collections.value = []
		documents.value = []
		indexes.value = []
		collectionStats.value = null
	}

	// =============================================================================
	// Actions - Collections
	// =============================================================================

	async function fetchCollections() {
		if (!activeConnectionId.value || !selectedDatabase.value) return

		loading.value.collections = true
		error.value = null
		try {
			const data = await api.collections.list(activeConnectionId.value, selectedDatabase.value)
			collections.value = data.collections
		} catch (err) {
			error.value = err.message
			throw err
		} finally {
			loading.value.collections = false
		}
	}

	async function fetchCollectionStats() {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return

		loading.value.stats = true
		try {
			const data = await api.collections.stats(activeConnectionId.value, selectedDatabase.value, selectedCollection.value)
			collectionStats.value = data
		} catch (err) {
			collectionStats.value = null
		} finally {
			loading.value.stats = false
		}
	}

	async function createCollection(name, options = {}) {
		if (!activeConnectionId.value || !selectedDatabase.value) return

		const data = await api.collections.create(activeConnectionId.value, selectedDatabase.value, {name, options})
		await fetchCollections()
		return data
	}

	async function dropCollection(collectionName) {
		if (!activeConnectionId.value || !selectedDatabase.value) return

		await api.collections.drop(activeConnectionId.value, selectedDatabase.value, collectionName)
		if (selectedCollection.value === collectionName) {
			selectedCollection.value = null
			documents.value = []
		}
		await fetchCollections()
	}

	function selectCollection(collectionName) {
		selectedCollection.value = collectionName
		documents.value = []
		indexes.value = []
		documentsPagination.value = {
			page: 1,
			pageSize: 20,
			totalCount: 0,
			totalPages: 0
		}
		documentsFilter.value = '{}'
		documentsSort.value = '{}'
		collectionStats.value = null
	}

	// =============================================================================
	// Actions - Documents
	// =============================================================================

	async function fetchDocuments(options = {}) {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return

		loading.value.documents = true
		error.value = null
		try {
			const params = {
				page: options.page || documentsPagination.value.page,
				pageSize: options.pageSize || documentsPagination.value.pageSize,
				filter: options.filter !== undefined ? options.filter : documentsFilter.value,
				sort: options.sort !== undefined ? options.sort : documentsSort.value
			}

			const data = await api.documents.list(activeConnectionId.value, selectedDatabase.value, selectedCollection.value, params)

			documents.value = data.documents
			documentsPagination.value = data.pagination

			if (options.filter !== undefined) {
				documentsFilter.value = options.filter
			}
			if (options.sort !== undefined) {
				documentsSort.value = options.sort
			}
		} catch (err) {
			error.value = err.message
			throw err
		} finally {
			loading.value.documents = false
		}
	}

	async function getDocument(documentId) {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return null

		return await api.documents.get(activeConnectionId.value, selectedDatabase.value, selectedCollection.value, documentId)
	}

	async function insertDocument(document) {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return

		const result = await api.documents.insert(activeConnectionId.value, selectedDatabase.value, selectedCollection.value, document)
		await fetchDocuments()
		return result
	}

	async function updateDocument(documentId, document, replace = false) {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return

		const result = await api.documents.update(activeConnectionId.value, selectedDatabase.value, selectedCollection.value, documentId, document, replace)
		await fetchDocuments()
		return result
	}

	async function deleteDocument(documentId) {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return

		await api.documents.delete(activeConnectionId.value, selectedDatabase.value, selectedCollection.value, documentId)
		await fetchDocuments()
	}

	async function deleteDocuments(documentIds) {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return

		await api.documents.deleteMany(activeConnectionId.value, selectedDatabase.value, selectedCollection.value, documentIds)
		await fetchDocuments()
	}

	// =============================================================================
	// Actions - Indexes
	// =============================================================================

	async function fetchIndexes() {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return

		loading.value.indexes = true
		try {
			const data = await api.indexes.list(activeConnectionId.value, selectedDatabase.value, selectedCollection.value)
			indexes.value = data.indexes
		} catch (err) {
			error.value = err.message
			throw err
		} finally {
			loading.value.indexes = false
		}
	}

	async function createIndex(keys, options = {}) {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return

		const result = await api.indexes.create(activeConnectionId.value, selectedDatabase.value, selectedCollection.value, keys, options)
		await fetchIndexes()
		return result
	}

	async function dropIndex(indexName) {
		if (!activeConnectionId.value || !selectedDatabase.value || !selectedCollection.value) return

		await api.indexes.drop(activeConnectionId.value, selectedDatabase.value, selectedCollection.value, indexName)
		await fetchIndexes()
	}

	// =============================================================================
	// Utility
	// =============================================================================

	function clearError() {
		error.value = null
	}

	// Initialize theme
	applyTheme()

	// =============================================================================
	// Return
	// =============================================================================

	return {
		// State
		user,
		isLoggedIn,
		isDarkMode,
		appTheme,
		sidebarTheme,
		appFont,
		editorTheme,
		editorFontSize,
		editorFont,
		connections,
		activeConnectionId,
		databases,
		selectedDatabase,
		collections,
		selectedCollection,
		collectionStats,
		documents,
		documentsPagination,
		documentsFilter,
		documentsSort,
		indexes,
		loading,
		error,

		// Computed
		activeConnection,
		hasActiveConnection,

		// Actions - Theme & Settings
		toggleTheme,
		applyTheme,
		setAppTheme,
		applyAppTheme,
		setSidebarTheme,
		applySidebarTheme,
		setAppFont,
		applyAppFont,
		setEditorTheme,
		setEditorFontSize,
		setEditorFont,

		// Actions - Auth
		setUser,
		logout,
		checkAuth,

		// Actions - Reset
		resetState,

		// Actions - Connections
		fetchConnections,
		createConnection,
		updateConnection,
		deleteConnection,
		testConnection,
		testNewConnection,
		setActiveConnection,
		disconnectFromServer,

		// Actions - Databases
		fetchDatabases,
		createDatabase,
		dropDatabase,
		selectDatabase,

		// Actions - Collections
		fetchCollections,
		fetchCollectionStats,
		createCollection,
		dropCollection,
		selectCollection,

		// Actions - Documents
		fetchDocuments,
		getDocument,
		insertDocument,
		updateDocument,
		deleteDocument,
		deleteDocuments,

		// Actions - Indexes
		fetchIndexes,
		createIndex,
		dropIndex,

		// Utility
		clearError
	}
})
