import {describe, it, expect, beforeEach, vi} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {useAppStore} from '../src/stores/app.js'

// Mock the API module
vi.mock('../src/api/index.js', () => ({
	default: {
		auth: {
			logout: vi.fn(),
			me: vi.fn()
		},
		connections: {
			list: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			test: vi.fn(),
			testNew: vi.fn()
		},
		databases: {
			list: vi.fn(),
			create: vi.fn(),
			drop: vi.fn()
		},
		collections: {
			list: vi.fn(),
			stats: vi.fn(),
			create: vi.fn(),
			drop: vi.fn()
		},
		documents: {
			list: vi.fn(),
			get: vi.fn(),
			insert: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			deleteMany: vi.fn()
		},
		indexes: {
			list: vi.fn(),
			create: vi.fn(),
			drop: vi.fn()
		}
	},
	setToken: vi.fn(),
	isAuthenticated: vi.fn(() => false)
}))

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
}
Object.defineProperty(global, 'localStorage', {value: localStorageMock})

// Mock document.documentElement
Object.defineProperty(global, 'document', {
	value: {
		documentElement: {
			classList: {
				add: vi.fn(),
				remove: vi.fn()
			},
			style: {
				setProperty: vi.fn()
			}
		}
	}
})

describe('App Store', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.clearAllMocks()
		localStorageMock.getItem.mockReturnValue(null)
	})

	describe('Initial State', () => {
		it('should have correct initial state', () => {
			const store = useAppStore()

			expect(store.user).toBe(null)
			expect(store.isLoggedIn).toBe(false)
			expect(store.connections).toEqual([])
			expect(store.activeConnectionId).toBe(null)
			expect(store.databases).toEqual([])
			expect(store.selectedDatabase).toBe(null)
			expect(store.collections).toEqual([])
			expect(store.selectedCollection).toBe(null)
		})

		it('should have loading states initialized to false', () => {
			const store = useAppStore()

			expect(store.loading.connections).toBe(false)
			expect(store.loading.databases).toBe(false)
			expect(store.loading.collections).toBe(false)
			expect(store.loading.documents).toBe(false)
			expect(store.loading.indexes).toBe(false)
		})
	})

	describe('Theme Actions', () => {
		it('should toggle dark mode', () => {
			const store = useAppStore()

			store.toggleTheme()
			expect(store.isDarkMode).toBe(true)

			store.toggleTheme()
			expect(store.isDarkMode).toBe(false)
		})

		it('should set editor theme', () => {
			const store = useAppStore()

			store.setEditorTheme('monokai')
			expect(store.editorTheme).toBe('monokai')
			expect(localStorageMock.setItem).toHaveBeenCalledWith('editorTheme', 'monokai')
		})

		it('should set editor font size', () => {
			const store = useAppStore()

			store.setEditorFontSize(16)
			expect(store.editorFontSize).toBe(16)
			expect(localStorageMock.setItem).toHaveBeenCalledWith('editorFontSize', '16')
		})

		it('should set app theme', () => {
			const store = useAppStore()

			store.setAppTheme('modern')
			expect(store.appTheme).toBe('modern')
			expect(localStorageMock.setItem).toHaveBeenCalledWith('appTheme', 'modern')
		})
	})

	describe('Auth Actions', () => {
		it('should set user data', () => {
			const store = useAppStore()
			const userData = {id: 1, username: 'testuser'}

			store.setUser(userData)

			expect(store.user).toEqual(userData)
			expect(store.isLoggedIn).toBe(true)
		})
	})

	describe('Connection Actions', () => {
		it('should set active connection', () => {
			const store = useAppStore()

			store.setActiveConnection('conn-123')

			expect(store.activeConnectionId).toBe('conn-123')
		})

		it('should not reset state when setting same connection', () => {
			const store = useAppStore()
			store.activeConnectionId = 'conn-123'
			store.databases = [{name: 'testdb'}]

			store.setActiveConnection('conn-123')

			// Should not clear databases since same connection
			expect(store.databases).toEqual([{name: 'testdb'}])
		})

		it('should disconnect from server', () => {
			const store = useAppStore()
			store.activeConnectionId = 'conn-123'
			store.databases = [{name: 'testdb'}]
			store.selectedDatabase = 'testdb'
			store.collections = [{name: 'testcoll'}]

			store.disconnectFromServer()

			expect(store.activeConnectionId).toBe(null)
			expect(store.databases).toEqual([])
			expect(store.selectedDatabase).toBe(null)
			expect(store.collections).toEqual([])
		})
	})

	describe('Database Actions', () => {
		it('should select database', () => {
			const store = useAppStore()

			store.selectDatabase('mydb')

			expect(store.selectedDatabase).toBe('mydb')
			expect(store.selectedCollection).toBe(null)
			expect(store.collections).toEqual([])
		})

		it('should not reset when selecting same database', () => {
			const store = useAppStore()
			store.selectedDatabase = 'mydb'
			store.collections = [{name: 'coll1'}]

			store.selectDatabase('mydb')

			expect(store.collections).toEqual([{name: 'coll1'}])
		})
	})

	describe('Collection Actions', () => {
		it('should select collection', () => {
			const store = useAppStore()

			store.selectCollection('users')

			expect(store.selectedCollection).toBe('users')
			expect(store.documents).toEqual([])
			expect(store.indexes).toEqual([])
		})

		it('should reset pagination when selecting collection', () => {
			const store = useAppStore()
			store.documentsPagination = {page: 5, pageSize: 50, totalCount: 100, totalPages: 2}

			store.selectCollection('users')

			expect(store.documentsPagination.page).toBe(1)
			expect(store.documentsPagination.pageSize).toBe(20)
		})
	})

	describe('Reset State', () => {
		it('should reset all state', () => {
			const store = useAppStore()

			// Set some state
			store.connections = [{id: 1, name: 'test'}]
			store.activeConnectionId = 'conn-1'
			store.databases = [{name: 'db1'}]
			store.selectedDatabase = 'db1'
			store.error = 'Some error'

			store.resetState()

			expect(store.connections).toEqual([])
			expect(store.activeConnectionId).toBe(null)
			expect(store.databases).toEqual([])
			expect(store.selectedDatabase).toBe(null)
			expect(store.error).toBe(null)
		})
	})

	describe('Computed Properties', () => {
		it('should compute activeConnection', () => {
			const store = useAppStore()
			const conn = {id: 'conn-1', name: 'Test Connection'}
			store.connections = [conn]
			store.activeConnectionId = 'conn-1'

			expect(store.activeConnection).toEqual(conn)
		})

		it('should compute hasActiveConnection', () => {
			const store = useAppStore()

			expect(store.hasActiveConnection).toBe(false)

			store.activeConnectionId = 'conn-1'
			expect(store.hasActiveConnection).toBe(true)
		})
	})

	describe('Error Handling', () => {
		it('should clear error', () => {
			const store = useAppStore()
			store.error = 'Some error message'

			store.clearError()

			expect(store.error).toBe(null)
		})
	})
})
