<template>
	<div class="app">
		<!-- Global Confirm Dialog - Must be first to initialize before other components -->
		<ConfirmDialog />

		<!-- Login Screen -->
		<template v-if="!isLoggedIn || $route.path === '/login'">
			<router-view />
		</template>

		<!-- Main Application -->
		<template v-else>
			<!-- Top Bar -->
			<div class="top-bar">
				<div class="top-left">
					<button class="sidebar-menu-btn" @click="toggleSidebar" :title="sidebarCollapsed ? $t('showSidebar') : $t('hideSidebar')">
						<span class="hamburger-icon">
							<span></span>
							<span></span>
							<span></span>
						</span>
					</button>
					<div class="brand">
                        <img src="/database.svg" alt="Mongo Manager Icon" class="logoIcon"> <span>Mongo Manager</span>
                    </div>
					<span class="server-info" v-if="activeConnection">
						{{ activeConnection.name }} ({{ activeConnection.host }}:{{ activeConnection.port }})
					</span>
				</div>
				<div class="top-right">
					<div class="lang-dropdown">
						<button class="lang-btn" @click.stop="toggleLangDropdown">
							<span class="lang-icon">🌐</span>
							<span class="lang-current">{{ currentLocale === 'en' ? 'EN' : 'TR' }}</span>
							<span class="dropdown-arrow">▼</span>
						</button>
						<div class="lang-dropdown-menu" v-if="langDropdownOpen" @click.stop>
							<a href="#" @click.prevent="setLocale('en'); langDropdownOpen = false" :class="{active: currentLocale === 'en'}">
								<span class="lang-flag">EN</span> English
							</a>
							<a href="#" @click.prevent="setLocale('tr'); langDropdownOpen = false" :class="{active: currentLocale === 'tr'}">
								<span class="lang-flag">🇹🇷</span> Türkçe
							</a>
						</div>
					</div>
					<div class="user-dropdown">
						<button class="user-btn" @click.stop="toggleUserDropdown">
							<span class="user-icon">👤</span>
							<span class="user-name">{{ user?.username }}</span>
							<span class="dropdown-arrow">▼</span>
						</button>
						<div class="user-dropdown-menu" v-if="userDropdownOpen" @click.stop>
							<a href="#" @click.prevent="openAccountModal"> <span class="menu-icon">✎</span> {{ $t('profile') }} </a>
							<a href="#" @click.prevent="openSettingsModal"> <span class="menu-icon">⚙</span> {{ $t('settings') }} </a>
							<div class="dropdown-divider"></div>
							<a href="#" @click.prevent="handleLogout" class="logout-item"> <span class="menu-icon">☇</span> {{ $t('logout') }} </a>
						</div>
					</div>
				</div>
			</div>

			<!-- Main Layout -->
			<div
				class="main-layout"
				:class="{'sidebar-collapsed': sidebarCollapsed}"
				:style="{'--sidebar-width': (sidebarCollapsed ? 0 : leftPanelWidth) + 'px'}"
			>
				<!-- Mobile Overlay -->
				<div class="mobile-overlay" v-if="mobileMenuOpen" @click="mobileMenuOpen = false"></div>

				<!-- Left Panel - Database Tree -->
				<div
					class="left-panel"
					:class="{'mobile-open': mobileMenuOpen, collapsed: sidebarCollapsed && !mobileMenuOpen}"
					:style="{width: (sidebarCollapsed && !mobileMenuOpen) ? '0px' : isMobile ? '280px' : leftPanelWidth + 'px'}"
				>
					<div class="mobile-panel-header">
						<span>{{ $t('menu') }}</span>
						<button @click="mobileMenuOpen = false">✕</button>
					</div>
					<div class="panel-content">
						<!-- Favorites / Quick Access - Only show when connected -->
						<div class="section" v-if="activeConnection && currentConnectionFavorites.length > 0">
							<div class="section-title favorites-title">
								<span class="fav-icon">★</span> {{ $t('favorites') }}
								<a href="#" @click.prevent="clearCurrentConnectionFavorites" :title="$t('clearAll')">[x]</a>
							</div>
							<ul class="tree-list favorites-list">
								<li v-for="fav in currentConnectionFavorites" :key="fav.id" class="favorite-item">
									<a href="#" @click.prevent="goToFavorite(fav)" :title="getFavoriteTooltip(fav)">
										<span class="fav-type" :class="fav.type">{{ fav.type === 'collection' ? '📄' : '📁' }}</span>
										<span class="fav-label">
											{{ getFavoriteDisplayName(fav) }}
										</span>
									</a>
									<a href="#" class="action-link remove-fav" @click.prevent="removeFavorite(fav)" :title="$t('remove')">✕</a>
								</li>
							</ul>
						</div>

						<!-- Connection Selector -->
						<div class="section">
							<div class="section-title">
								{{ $t('connections') }}
								<a href="#" class="add-btn" @click.prevent="showConnectionModal = true">{{ $t('add') }}</a>
							</div>
							<div v-if="connections.length === 0" class="empty-text">{{ $t('noConnections') }}</div>
							<ul v-else class="tree-list">
								<li v-for="conn in connections" :key="conn.id" class="connection-item">
									<span class="conn-status" :class="{connected: activeConnectionId === conn.id}">●</span>
									<a href="#" :class="{active: activeConnectionId === conn.id}" @click.prevent="selectConnection(conn)">
										{{ conn.name }}
									</a>
									<div class="conn-dropdown">
										<button class="conn-dropdown-btn" @click.stop="toggleConnDropdown(conn.id)" :title="$t('actions')">⋮</button>
										<div class="conn-dropdown-menu" v-if="openConnDropdown === conn.id" @click.stop>
											<a href="#" @click.prevent="editConnectionItem(conn); closeConnDropdown()">
												<span class="dropdown-icon">✎</span> {{ $t('edit') }}
											</a>
											<a href="#" @click.prevent="disconnectConnection(conn); closeConnDropdown()" v-if="activeConnectionId === conn.id" class="disconnect">
												<span class="dropdown-icon">⊗</span> {{ $t('disconnect') }}
											</a>
											<a href="#" @click.prevent="deleteConnectionItem(conn); closeConnDropdown()" class="delete">
												<span class="dropdown-icon">🗑</span> {{ $t('delete') }}
											</a>
										</div>
									</div>
								</li>
							</ul>
						</div>

						<!-- Databases -->
						<div class="section" v-if="activeConnection">
							<div class="section-title">
								<span>{{ $t('databases') }}</span>
								<div>
								    <a href="#" @click.prevent="showCreateDbModal = true" :title="$t('createDatabase')">[+]</a>
                                    <a href="#" @click.prevent="refreshDatabases" :title="$t('refresh')" class="refresh-btn">↻</a>
                                </div>
							</div>
							<div v-if="loadingDatabases" class="empty-text">{{ $t('loading') }}</div>
							<div v-else-if="databases.length === 0" class="empty-text">{{ $t('noDatabases') }}</div>
							<ul v-else class="tree-list">
								<li v-for="db in sortedDatabases" :key="db.name" class="db-item">
									<a href="#" :class="{active: selectedDatabase === db.name}" @click.prevent="goToDatabase(db)">
										{{ db.name }}
										<span class="count">({{ db.collectionCount || 0 }})</span>
									</a>
									<a href="#" class="expand-link" @click.prevent="toggleDatabaseExpand(db)" :title="$t('showCollections')"
										>[{{ expandedDbs[db.name] ? '-' : '+' }}]</a
									>

									<!-- Collections under this database -->
									<ul v-if="expandedDbs[db.name]" class="tree-list nested">
										<li v-if="loadingCollections && selectedDatabase === db.name" class="empty-text">{{ $t('loading') }}</li>
										<li v-else-if="dbCollections[db.name]?.length === 0" class="empty-text">{{ $t('noCollections') }}</li>
										<li v-else v-for="coll in getSortedCollections(db.name)" :key="coll.name" class="coll-item">
											<a
												href="#"
												:class="{active: selectedDatabase === db.name && selectedCollection === coll.name}"
												@click.prevent="goToCollection(db.name, coll)"
											>
												{{ coll.name }}
												<span class="count">({{ formatCount(coll.count) }})</span>
											</a>
											<a
												href="#"
												class="pin-link"
												:class="{pinned: isFavorite('collection', db.name, coll.name)}"
												@click.prevent="toggleFavorite('collection', db.name, coll.name)"
												:title="isFavorite('collection', db.name, coll.name) ? $t('unpin') : $t('pin')"
											>
												{{ isFavorite('collection', db.name, coll.name) ? '★' : '☆' }}
											</a>
										</li>
									</ul>
								</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Resizer -->
				<div class="resizer" @mousedown="startResize"></div>

				<!-- Right Panel - Content -->
				<div class="right-panel">
					<router-view :key="$route.fullPath" />
				</div>
			</div>

			<!-- Connection Modal -->
			<div v-if="showConnectionModal" class="modal-overlay" @click.self="!connectionSaving && (showConnectionModal = false)">
				<div class="modal mongomanager-modal">
					<div class="modal-title">{{ $t('newConnection') }}</div>
					<div class="modal-body">
						<table class="form-table">
							<tr>
								<td width="120">{{ $t('connectionName') }} <span class="required">*</span></td>
								<td><input type="text" id="new-conn-name" name="name" v-model="newConnection.name" :disabled="connectionSaving" autocomplete="off" /></td>
							</tr>
							<tr>
								<td>{{ $t('host') }} <span class="required">*</span></td>
								<td><input type="text" id="new-conn-host" name="host" v-model="newConnection.host" placeholder="localhost" :disabled="connectionSaving" autocomplete="off" /></td>
							</tr>
							<tr>
								<td>{{ $t('port') }} <span class="required">*</span></td>
								<td><input type="number" id="new-conn-port" name="port" v-model="newConnection.port" placeholder="27017" :disabled="connectionSaving" autocomplete="off" /></td>
							</tr>
							<tr>
								<td>{{ $t('username') }}</td>
								<td><input type="text" id="new-conn-username" name="username" v-model="newConnection.username" :placeholder="'(' + $t('optional') + ')'" :disabled="connectionSaving" autocomplete="off" /></td>
							</tr>
							<tr>
								<td>{{ $t('password') }}</td>
								<td><input type="password" id="new-conn-password" name="password" v-model="newConnection.password" :placeholder="'(' + $t('optional') + ')'" :disabled="connectionSaving" autocomplete="new-password" /></td>
							</tr>
							<tr>
								<td>{{ $t('authDatabase') }}</td>
								<td><input type="text" id="new-conn-authdb" name="authDatabase" v-model="newConnection.authDatabase" placeholder="admin" :disabled="connectionSaving" autocomplete="off" /></td>
							</tr>
							<tr>
								<td>{{ $t('autoConnect') }}</td>
								<td>
									<label class="checkbox-label">
										<input type="checkbox" id="new-conn-autoconnect" name="autoConnect" v-model="newConnection.autoConnect" :disabled="connectionSaving" />
										<span>{{ $t('autoConnectDesc') }}</span>
									</label>
								</td>
							</tr>
						</table>
						<!-- Connection Test Status -->
						<div v-if="connectionTestStatus" class="connection-test-status" :class="connectionTestStatus.type">
							<span class="status-icon">{{ connectionTestStatus.type === 'success' ? '✓' : connectionTestStatus.type === 'error' ? '✕' : '⟳' }}</span>
							{{ connectionTestStatus.message }}
						</div>
					</div>
					<div class="modal-buttons connection-modal-buttons">
						<button type="button" class="btn-test" @click="testNewConnection" :disabled="connectionSaving">
							{{ $t('testConnection') }}
						</button>
						<div class="btn-group-right">
							<button type="button" @click="saveConnection(false)" :disabled="connectionSaving" class="btn-save">
								{{ connectionSaving ? $t('saving') : $t('save') }}
							</button>
							<button type="button" @click="saveConnection(true)" :disabled="connectionSaving" class="btn-save-connect">
								{{ $t('saveAndConnect') }}
							</button>
							<button type="button" @click="closeConnectionModal" :disabled="connectionSaving" class="btn-cancel">
								{{ $t('cancel') }}
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Edit Connection Modal -->
			<div v-if="showEditConnectionModal" class="modal-overlay" @click.self="showEditConnectionModal = false">
				<div class="modal mongomanager-modal">
					<div class="modal-title">{{ $t('editConnection') }}</div>
					<form @submit.prevent="updateConnection">
						<div class="modal-body">
							<table class="form-table">
								<tr>
									<td width="120">{{ $t('connectionName') }}</td>
									<td><input type="text" id="edit-conn-name" name="name" v-model="editConnection.name" required autocomplete="off" /></td>
								</tr>
								<tr>
									<td>{{ $t('host') }}</td>
									<td><input type="text" id="edit-conn-host" name="host" v-model="editConnection.host" placeholder="localhost" required autocomplete="off" /></td>
								</tr>
								<tr>
									<td>{{ $t('port') }}</td>
									<td><input type="number" id="edit-conn-port" name="port" v-model="editConnection.port" placeholder="27017" required autocomplete="off" /></td>
								</tr>
								<tr>
									<td>{{ $t('username') }}</td>
									<td><input type="text" id="edit-conn-username" name="username" v-model="editConnection.username" :placeholder="'(' + $t('optional') + ')'" autocomplete="off" /></td>
								</tr>
								<tr>
									<td>{{ $t('password') }}</td>
									<td><input type="password" id="edit-conn-password" name="password" v-model="editConnection.password" :placeholder="$t('leaveEmptyToKeep')" autocomplete="new-password" /></td>
								</tr>
								<tr>
									<td>{{ $t('authDatabase') }}</td>
									<td><input type="text" id="edit-conn-authdb" name="authDatabase" v-model="editConnection.authDatabase" placeholder="admin" autocomplete="off" /></td>
								</tr>
								<tr>
									<td>{{ $t('autoConnect') }}</td>
									<td>
										<label class="checkbox-label">
											<input type="checkbox" id="edit-conn-autoconnect" name="autoConnect" v-model="editConnection.autoConnect" />
											<span>{{ $t('autoConnectDesc') }}</span>
										</label>
									</td>
								</tr>
							</table>
						</div>
						<div class="modal-buttons">
							<button type="submit">{{ $t('save') }}</button>
							<button type="button" @click="showEditConnectionModal = false">{{ $t('cancel') }}</button>
						</div>
					</form>
				</div>
			</div>

			<!-- Create Database Modal -->
			<div v-if="showCreateDbModal" class="modal-overlay" @click.self="closeCreateDbModal">
				<div class="modal mongomanager-modal" style="width: 450px">
					<div class="modal-title">{{ $t('createDatabase') }}</div>

					<!-- Tabs -->
					<div class="modal-tabs">
						<button
							type="button"
							:class="['modal-tab', {active: createDbMode === 'manual'}]"
							@click="createDbMode = 'manual'"
						>
							{{ $t('manual') }}
						</button>
						<button
							type="button"
							:class="['modal-tab', {active: createDbMode === 'restore'}]"
							@click="createDbMode = 'restore'"
						>
							{{ $t('fromBackup') }}
						</button>
					</div>

					<!-- Manual Mode -->
					<form v-if="createDbMode === 'manual'" @submit.prevent="createDatabase">
						<div class="modal-body">
							<table class="form-table">
								<tr>
									<td width="120">{{ $t('databaseName') }}</td>
									<td><input type="text" id="new-db-name" name="databaseName" v-model="newDbName" required autocomplete="off" /></td>
								</tr>
								<tr>
									<td>{{ $t('initialCollection') }}</td>
									<td><input type="text" id="new-db-collection" name="initialCollection" v-model="newDbCollection" :placeholder="'(' + $t('optional') + ')'" autocomplete="off" /></td>
								</tr>
							</table>
						</div>
						<div class="modal-buttons">
							<button type="submit">{{ $t('create') }}</button>
							<button type="button" @click="closeCreateDbModal">{{ $t('cancel') }}</button>
						</div>
					</form>

					<!-- Restore Mode -->
					<form v-else @submit.prevent="createDatabaseFromBackup">
						<div class="modal-body">
							<table class="form-table">
								<tr>
									<td width="120">{{ $t('databaseName') }}</td>
									<td><input type="text" id="restore-db-name" name="databaseName" v-model="restoreDbName" required placeholder="my_database" autocomplete="off" /></td>
								</tr>
								<tr>
									<td>{{ $t('backupFile') }}</td>
									<td>
										<input
											type="file"
											id="restore-db-file"
											name="backupFile"
											ref="restoreDbFileInput"
											@change="handleRestoreDbFile"
											accept=".tar.gz,.tgz,.json"
										/>
									</td>
								</tr>
							</table>
							<p class="form-hint" style="margin: 10px 0 0; font-size: 12px; color: #888;">
								{{ $t('backupFileHint') }}
							</p>
						</div>
						<div class="modal-buttons">
							<button type="submit" :disabled="!restoreDbFile || restoringDb">
								{{ restoringDb ? $t('restoring') : $t('restore') }}
							</button>
							<button type="button" @click="closeCreateDbModal">{{ $t('cancel') }}</button>
						</div>
					</form>
				</div>
			</div>

			<!-- Settings Modal -->
			<SettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />

			<!-- Account Modal -->
			<AccountModal v-if="showAccountModal" @close="showAccountModal = false" />
		</template>
	</div>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, watch, nextTick} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {useAppStore} from './stores/app.js'
import {useI18n} from 'vue-i18n'
import SettingsModal from './components/SettingsModal.vue'
import AccountModal from './components/AccountModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import {useDialog} from './composables/useDialog.js'

const dialog = useDialog()

const router = useRouter()
const route = useRoute()
const store = useAppStore()
const {t, locale} = useI18n()

// Current locale for template
const currentLocale = computed(() => locale.value)

// State
const leftPanelWidth = ref(250)
const expandedDbs = ref({})
const dbCollections = ref({}) // Store collections per database
const connectionCache = ref({}) // Cache databases per connection { connectionId: databases[] }
const mobileMenuOpen = ref(false)
const isMobile = ref(window.innerWidth < 768)
const showConnectionModal = ref(false)
const showCreateDbModal = ref(false)
const showSettingsModal = ref(false)
const showAccountModal = ref(false)
const userDropdownOpen = ref(false)
const langDropdownOpen = ref(false)
const newDbName = ref('')
const newDbCollection = ref('')
const createDbMode = ref('manual') // 'manual' or 'restore'
const restoreDbName = ref('')
const restoreDbFile = ref(null)
const restoreDbFileInput = ref(null)
const restoringDb = ref(false)
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true')

// Favorites - stored in localStorage
const favorites = ref(JSON.parse(localStorage.getItem('favorites') || '[]'))

// Connection dropdown state
const openConnDropdown = ref(null)

const connectionSaving = ref(false)
const connectionTestStatus = ref(null) // { type: 'success'|'error'|'loading', message: string }

const newConnection = ref({
	name: '',
	host: 'localhost',
	port: 27017,
	username: '',
	password: '',
	authDatabase: 'admin',
	autoConnect: true
})
const showEditConnectionModal = ref(false)
const editConnection = ref({
	id: '',
	name: '',
	host: 'localhost',
	port: 27017,
	username: '',
	password: '',
	authDatabase: 'admin',
	autoConnect: true
})

// Computed
const isLoggedIn = computed(() => store.isLoggedIn)
const user = computed(() => store.user)
const connections = computed(() => store.connections)
const activeConnection = computed(() => store.activeConnection)
const activeConnectionId = computed(() => store.activeConnectionId)
const databases = computed(() => store.databases)
const collections = computed(() => store.collections)
const selectedDatabase = computed(() => store.selectedDatabase)
const selectedCollection = computed(() => store.selectedCollection)
const loadingDatabases = computed(() => store.loading.databases)
const loadingCollections = computed(() => store.loading.collections)

const sortedDatabases = computed(() => {
	return [...databases.value].sort((a, b) => a.name.localeCompare(b.name))
})

const sortedCollections = computed(() => {
	return [...collections.value].sort((a, b) => a.name.localeCompare(b.name))
})

// Filter favorites for current connection only
const currentConnectionFavorites = computed(() => {
	if (!activeConnectionId.value) return []
	return favorites.value.filter(f => f.connectionId === activeConnectionId.value)
})

// Check if there are multiple connections
const hasMultipleConnections = computed(() => connections.value.length > 1)

function getSortedCollections(dbName) {
	const colls = dbCollections.value[dbName] || []
	return [...colls].sort((a, b) => a.name.localeCompare(b.name))
}

// Methods
function toggleMobileMenu() {
	mobileMenuOpen.value = !mobileMenuOpen.value
}

function toggleSidebar() {
	// On mobile, toggle mobileMenuOpen instead
	if (isMobile.value) {
		mobileMenuOpen.value = !mobileMenuOpen.value
	} else {
		sidebarCollapsed.value = !sidebarCollapsed.value
		localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value)
	}
}

// Connection dropdown functions
function toggleConnDropdown(connId) {
	if (openConnDropdown.value === connId) {
		openConnDropdown.value = null
	} else {
		openConnDropdown.value = connId
	}
}

function closeConnDropdown() {
	openConnDropdown.value = null
}

// Close dropdown when clicking outside
function handleClickOutside(e) {
	if (openConnDropdown.value && !e.target.closest('.conn-dropdown')) {
		openConnDropdown.value = null
	}
	if (userDropdownOpen.value && !e.target.closest('.user-dropdown')) {
		userDropdownOpen.value = false
	}
	if (langDropdownOpen.value && !e.target.closest('.lang-dropdown')) {
		langDropdownOpen.value = false
	}
}

function handleResize() {
	isMobile.value = window.innerWidth < 768
	if (!isMobile.value) {
		mobileMenuOpen.value = false
	}
}

function setLocale(lang) {
	locale.value = lang
	localStorage.setItem('locale', lang)
}

// Language dropdown functions
function toggleLangDropdown() {
	langDropdownOpen.value = !langDropdownOpen.value
	if (langDropdownOpen.value) {
		userDropdownOpen.value = false
	}
}

// User dropdown functions
function toggleUserDropdown() {
	userDropdownOpen.value = !userDropdownOpen.value
	if (userDropdownOpen.value) {
		langDropdownOpen.value = false
	}
}

function closeUserDropdown() {
	userDropdownOpen.value = false
}

function openAccountModal() {
	userDropdownOpen.value = false
	showAccountModal.value = true
}

function openSettingsModal() {
	userDropdownOpen.value = false
	showSettingsModal.value = true
}

async function handleLogout() {
	userDropdownOpen.value = false
	// Clear lastLocation on logout so autoConnect rules apply on next login
	localStorage.removeItem('lastLocation')
	await store.logout()
	router.push('/login')
}

async function selectConnection(conn) {
	// If already on this connection, just navigate to connection home
	if (store.activeConnectionId === conn.id) {
		router.push('/')
		return
	}

	// Check if we have cached data for this connection
	if (connectionCache.value[conn.id]) {
		// Use cached data - no API call needed
		store.activeConnectionId = conn.id
		store.databases = connectionCache.value[conn.id]
		store.selectedDatabase = null
		store.selectedCollection = null
		store.collections = []
		store.documents = []
		store.indexes = []
		store.collectionStats = null
		router.push('/')
		return
	}

	// Show loading
	store.loading.databases = true

	try {
		// Test the connection first by trying to list databases
		const response = await fetch(`/api/connections/${conn.id}/databases`, {
			headers: {Authorization: `Bearer ${localStorage.getItem('auth_token')}`}
		})
		const data = await response.json()

		if (!response.ok) {
			throw new Error(data.message || data.error || 'Failed to connect')
		}

		// Cache the databases for this connection
		connectionCache.value[conn.id] = data.databases || []

		// Success - now switch to this connection
		store.activeConnectionId = conn.id
		store.databases = data.databases || []
		store.selectedDatabase = null
		store.selectedCollection = null
		store.collections = []
		store.documents = []
		store.indexes = []
		store.collectionStats = null

		router.push('/')
	} catch (error) {
		// Connection failed - keep current connection, just show error
		dialog.error(error.message || 'Failed to connect to database', 'Connection Error')
	} finally {
		store.loading.databases = false
	}
}

function disconnectConnection(conn) {
	store.disconnectFromServer()
	router.push('/')
}

async function refreshDatabases() {
	if (!store.activeConnectionId) return
	store.loading.databases = true
	try {
		await store.fetchDatabases()
		// Update cache with new data
		connectionCache.value[store.activeConnectionId] = store.databases
		// Clear cached collections for all databases
		dbCollections.value = {}
		expandedDbs.value = {}

		// Restore current database/collection from URL
		const dbName = route.params.database
		if (dbName) {
			store.selectDatabase(dbName)
			expandedDbs.value = {[dbName]: true}
			await loadCollectionsForDb(dbName)

			const collName = route.params.collection
			if (collName) {
				store.selectCollection(collName)
				await nextTick()
				setTimeout(() => scrollToSelectedCollection(), 100)
			}
		}
	} catch (error) {
		dialog.error(error.message || 'Failed to refresh databases')
	} finally {
		store.loading.databases = false
	}
}

async function deleteConnectionItem(conn) {
	const confirmed = await dialog.confirm({
		title: 'Delete Connection',
		message: `Delete connection "${conn.name}"?`,
		confirmText: 'Delete',
		cancelText: 'Cancel'
	})
	if (confirmed) {
		await store.deleteConnection(conn.id)
	}
}

function editConnectionItem(conn) {
	editConnection.value = {
		id: conn.id,
		name: conn.name,
		host: conn.host,
		port: conn.port,
		username: conn.username || '',
		password: '', // Don't show current password
		authDatabase: conn.authDatabase || 'admin',
		autoConnect: conn.autoConnect !== false // Default to true if not set
	}
	showEditConnectionModal.value = true
}

async function updateConnection() {
	try {
		const updateData = {
			name: editConnection.value.name,
			host: editConnection.value.host,
			port: editConnection.value.port,
			username: editConnection.value.username,
			authDatabase: editConnection.value.authDatabase,
			autoConnect: editConnection.value.autoConnect
		}
		// Only include password if user entered a new one
		if (editConnection.value.password) {
			updateData.password = editConnection.value.password
		}
		await store.updateConnection(editConnection.value.id, updateData)
		showEditConnectionModal.value = false
	} catch (error) {
		dialog.error('Failed to update connection: ' + error.message)
	}
}

function goToDatabase(db) {
	store.selectDatabase(db.name)
	router.push({
		name: 'database',
		params: {
			connectionId: activeConnectionId.value,
			database: db.name
		}
	})
}

async function toggleDatabaseExpand(db) {
	const isExpanded = expandedDbs.value[db.name]
	if (isExpanded) {
		const newState = {...expandedDbs.value}
		delete newState[db.name]
		expandedDbs.value = newState
	} else {
		expandedDbs.value = {...expandedDbs.value, [db.name]: true}
		// Load collections for this database
		await loadCollectionsForDb(db.name)
	}
}

async function loadCollectionsForDb(dbName) {
	try {
		const response = await fetch(`/api/connections/${activeConnectionId.value}/databases/${dbName}/collections`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('auth_token')}`
			}
		})
		const data = await response.json()
		dbCollections.value[dbName] = data.collections || []
		dbCollections.value = {...dbCollections.value} // Trigger reactivity
	} catch (e) {
		console.error('Failed to load collections for', dbName, e)
		dbCollections.value[dbName] = []
	}
}

function goToCollection(dbName, coll) {
	store.selectDatabase(dbName)
	store.selectCollection(coll.name)
	mobileMenuOpen.value = false // Close menu on mobile
	router.push({
		name: 'collection',
		params: {
			connectionId: activeConnectionId.value,
			database: dbName,
			collection: coll.name
		}
	})
}

// Scroll to selected collection in sidebar
function scrollToSelectedCollection() {
	const selectedEl = document.querySelector('.coll-item a.active')
	if (selectedEl) {
		selectedEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
	}
}

// Validate connection form
function validateConnectionForm() {
	const errors = []
	if (!newConnection.value.name?.trim()) {
		errors.push(t('connectionNameRequired'))
	}
	if (!newConnection.value.host?.trim()) {
		errors.push(t('hostRequired'))
	}
	if (!newConnection.value.port) {
		errors.push(t('portRequired'))
	}
	return errors
}

// Test new connection without saving
async function testNewConnection() {
	const errors = validateConnectionForm()
	if (errors.length > 0) {
		connectionTestStatus.value = { type: 'error', message: errors[0] }
		return false
	}

	connectionTestStatus.value = { type: 'loading', message: t('testingConnection') }

	try {
		const response = await fetch('/api/connections/test', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
			},
			body: JSON.stringify({
				host: newConnection.value.host,
				port: newConnection.value.port,
				username: newConnection.value.username || undefined,
				password: newConnection.value.password || undefined,
				authDatabase: newConnection.value.authDatabase || 'admin'
			})
		})
		const data = await response.json()

		if (!response.ok) {
			throw new Error(data.error || data.message || 'Connection test failed')
		}

		// Check the success field in response
		if (data.success === false) {
			throw new Error(data.message || 'Connection test failed')
		}

		connectionTestStatus.value = { type: 'success', message: t('connectionSuccessful') }
		return true
	} catch (error) {
		connectionTestStatus.value = { type: 'error', message: `${t('connectionFailed')}: ${error.message}` }
		return false
	}
}

// Save connection (with optional connect after)
async function saveConnection(connectAfter = false) {
	const errors = validateConnectionForm()
	if (errors.length > 0) {
		connectionTestStatus.value = { type: 'error', message: errors[0] }
		return
	}

	connectionSaving.value = true
	connectionTestStatus.value = { type: 'loading', message: t('testingConnection') }

	try {
		// Test connection first
		const testResult = await testNewConnection()
		if (!testResult) {
			connectionSaving.value = false
			return
		}

		// Store autoConnect value before reset
		const shouldAutoConnect = newConnection.value.autoConnect

		// Create the connection
		const createdConn = await store.createConnection(newConnection.value)

		// Reset form and close modal
		resetConnectionForm()
		showConnectionModal.value = false

		// Connect if requested or if autoConnect is enabled and this is the only connection
		if (connectAfter || (shouldAutoConnect && connections.value.length === 1)) {
			await selectConnection(createdConn)
		}
	} catch (error) {
		connectionTestStatus.value = { type: 'error', message: `${t('connectionFailed')}: ${error.message}` }
	} finally {
		connectionSaving.value = false
	}
}

// Reset connection form to defaults
function resetConnectionForm() {
	newConnection.value = {
		name: '',
		host: 'localhost',
		port: 27017,
		username: '',
		password: '',
		authDatabase: 'admin',
		autoConnect: true
	}
	connectionTestStatus.value = null
}

// Close connection modal
function closeConnectionModal() {
	if (connectionSaving.value) return
	showConnectionModal.value = false
	resetConnectionForm()
}

async function createDatabase() {
	try {
		await store.createDatabase(newDbName.value, newDbCollection.value || 'init')
		closeCreateDbModal()
	} catch (error) {
		dialog.error('Failed to create database: ' + error.message)
	}
}

function closeCreateDbModal() {
	showCreateDbModal.value = false
	newDbName.value = ''
	newDbCollection.value = ''
	createDbMode.value = 'manual'
	restoreDbName.value = ''
	restoreDbFile.value = null
	if (restoreDbFileInput.value) {
		restoreDbFileInput.value.value = ''
	}
}

function handleRestoreDbFile(e) {
	restoreDbFile.value = e.target.files[0]
	// Auto-fill database name from filename if empty
	if (restoreDbFile.value && !restoreDbName.value) {
		let name = restoreDbFile.value.name
		// Remove extensions like .tar.gz, .tgz, .json
		name = name.replace(/\.(tar\.gz|tgz|json)$/i, '')
		// Remove timestamp patterns like -2024-01-15T12-30-00
		name = name.replace(/-\d{4}-\d{2}-\d{2}T[\d-]+$/, '')
		restoreDbName.value = name
	}
}

async function createDatabaseFromBackup() {
	if (!restoreDbFile.value || !restoreDbName.value) return

	restoringDb.value = true
	try {
		const formData = new FormData()
		formData.append('file', restoreDbFile.value)

		const response = await fetch(
			`/api/connections/${store.activeConnectionId}/databases/${restoreDbName.value}/restore`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${localStorage.getItem('auth_token')}`
				},
				body: formData
			}
		)

		const data = await response.json()

		if (!response.ok) {
			throw new Error(data.error || data.message || 'Restore failed')
		}

		dialog.success(data.message || 'Database restored successfully')
		closeCreateDbModal()
		await store.fetchDatabases()
	} catch (error) {
		dialog.error('Restore failed: ' + error.message)
	} finally {
		restoringDb.value = false
	}
}

function formatCount(count) {
	if (count === undefined || count === null) return '0'
	if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
	if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
	return count.toString()
}

// Favorites functions
function saveFavorites() {
	localStorage.setItem('favorites', JSON.stringify(favorites.value))
}

function isFavorite(type, dbName, collName = null) {
	const id = collName ? `${activeConnectionId.value}:${dbName}:${collName}` : `${activeConnectionId.value}:${dbName}`
	return favorites.value.some(f => f.id === id)
}

function toggleFavorite(type, dbName, collName = null) {
	const id = collName ? `${activeConnectionId.value}:${dbName}:${collName}` : `${activeConnectionId.value}:${dbName}`
	const existingIndex = favorites.value.findIndex(f => f.id === id)

	if (existingIndex >= 0) {
		// Remove - create new array to trigger reactivity
		favorites.value = favorites.value.filter(f => f.id !== id)
	} else {
		// Add - create new array to trigger reactivity
		favorites.value = [
			...favorites.value,
			{
				id,
				type,
				connectionId: activeConnectionId.value,
				connectionName: activeConnection.value?.name || 'Unknown',
				database: dbName,
				collection: collName,
				name: collName || dbName,
				path: collName ? `${dbName}/${collName}` : dbName
			}
		]
	}
	saveFavorites()
}

function removeFavorite(fav) {
	favorites.value = favorites.value.filter(f => f.id !== fav.id)
	saveFavorites()
}

async function clearFavorites() {
	const confirmed = await dialog.confirm({
		title: 'Clear Favorites',
		message: 'Clear all favorites?',
		confirmText: 'Clear',
		cancelText: 'Cancel'
	})
	if (confirmed) {
		favorites.value = []
		saveFavorites()
	}
}

// Clear only current connection's favorites
async function clearCurrentConnectionFavorites() {
	const confirmed = await dialog.confirm({
		title: 'Clear Favorites',
		message: 'Clear favorites for this connection?',
		confirmText: 'Clear',
		cancelText: 'Cancel'
	})
	if (confirmed) {
		favorites.value = favorites.value.filter(f => f.connectionId !== activeConnectionId.value)
		saveFavorites()
	}
}

// Get display name for favorite (shows database for collections)
function getFavoriteDisplayName(fav) {
	if (fav.type === 'collection') {
		// Always show database.collection format for collections
		return `${fav.database}.${fav.collection}`
	}
	return fav.name
}

// Get tooltip with full path info
function getFavoriteTooltip(fav) {
	if (fav.type === 'collection') {
		return `${fav.connectionName} → ${fav.database} → ${fav.collection}`
	}
	return `${fav.connectionName} → ${fav.database}`
}

async function goToFavorite(fav) {
	// First, ensure we're connected to the right connection
	if (activeConnectionId.value !== fav.connectionId) {
		const conn = connections.value.find(c => c.id === fav.connectionId)
		if (conn) {
			await selectConnection(conn)
		} else {
			dialog.error('Connection not found')
			return
		}
	}

	mobileMenuOpen.value = false

	// Expand the database in sidebar and load its collections (force expansion)
	expandedDbs.value = {...expandedDbs.value, [fav.database]: true}

	// Load collections for the sidebar (uses dbCollections, not store.collections)
	await loadCollectionsForDb(fav.database)

	if (fav.type === 'collection') {
		store.selectDatabase(fav.database)
		store.selectCollection(fav.collection)

		router.push({
			name: 'collection',
			params: {
				connectionId: fav.connectionId,
				database: fav.database,
				collection: fav.collection
			}
		})

		// Scroll to the collection in sidebar after DOM update
		nextTick(() => {
			setTimeout(() => {
				const collectionEl = document.querySelector(`.coll-item a.active`)
				if (collectionEl) {
					collectionEl.scrollIntoView({behavior: 'smooth', block: 'center'})
				}
			}, 100)
		})
	} else {
		store.selectDatabase(fav.database)

		router.push({
			name: 'database',
			params: {
				connectionId: fav.connectionId,
				database: fav.database
			}
		})

		// Scroll to the database in sidebar
		nextTick(() => {
			setTimeout(() => {
				const dbEl = document.querySelector(`.db-item a.active`)
				if (dbEl) {
					dbEl.scrollIntoView({behavior: 'smooth', block: 'center'})
				}
			}, 100)
		})
	}
}

// Save last visited location - DISABLED
function saveLastLocation() {
	// Disabled - don't remember last location on login
}

// Resizer
let isResizing = false

function startResize(e) {
	isResizing = true
	document.addEventListener('mousemove', doResize)
	document.addEventListener('mouseup', stopResize)
}

function doResize(e) {
	if (!isResizing) return
	const newWidth = e.clientX
	if (newWidth >= 150 && newWidth <= 500) {
		leftPanelWidth.value = newWidth
	}
}

function stopResize() {
	isResizing = false
	document.removeEventListener('mousemove', doResize)
	document.removeEventListener('mouseup', stopResize)
}


onMounted(async () => {
	// Clear lastLocation - don't remember last location on login
	localStorage.removeItem('lastLocation')

	// Apply app theme and font on load
	store.applyAppTheme()
	store.applyAppFont()

	// Wait for router to be ready before accessing route params
	await router.isReady()

	await store.checkAuth()
	if (store.isLoggedIn) {
		await store.fetchConnections()

		// Restore connection from URL if on a connection route
		const connectionId = route.params.connectionId
		// Always try to restore from URL if connectionId exists (even if activeConnectionId is already set)
		if (connectionId) {
			// Check if connection exists
			const connectionExists = connections.value.some(c => c.id === connectionId)
			if (!connectionExists) {
				// Connection not found - redirect to home
				console.warn(`Connection not found: ${connectionId}`)
				router.push('/')
			} else {
				store.setActiveConnection(connectionId)
				try {
					await store.fetchDatabases()

					// Restore database selection from URL
					const dbName = route.params.database
					if (dbName) {
						store.selectDatabase(dbName)
						// Force expansion with single reactive assignment
						expandedDbs.value = {...expandedDbs.value, [dbName]: true}
						await loadCollectionsForDb(dbName)

						// Restore collection selection from URL
						const collName = route.params.collection
						if (collName) {
							store.selectCollection(collName)
							// Scroll to selected collection after DOM update
							await nextTick()
							setTimeout(() => scrollToSelectedCollection(), 100)
						}
					}
				} catch (error) {
					console.error('Failed to restore connection:', error)
					store.disconnectFromServer()
					router.push('/')
				}
			}
		} else if (route.path === '/' && !connectionId) {
			// Auto-connect: Find first connection with autoConnect enabled
			if (!store.activeConnectionId && connections.value.length > 0) {
				const autoConnectConn = connections.value.find(c => c.autoConnect === true)
				if (autoConnectConn) {
					await selectConnection(autoConnectConn)
				}
			}
		}
	}
	window.addEventListener('resize', handleResize)
	document.addEventListener('click', handleClickOutside)
})

// Watch store.collections changes to sync with sidebar's dbCollections cache
watch(
	() => store.collections,
	newCollections => {
		// When store.collections is updated (e.g., after dropCollection), sync to dbCollections
		if (store.selectedDatabase && newCollections) {
			dbCollections.value[store.selectedDatabase] = newCollections
			dbCollections.value = {...dbCollections.value} // Trigger reactivity
		}
	},
	{deep: true}
)

// Watch for login + connections loaded to trigger autoConnect
watch(
	() => ({isLoggedIn: store.isLoggedIn, connectionsCount: connections.value.length}),
	async (newVal, oldVal) => {
		// Trigger when user is logged in AND connections just loaded (count changed from 0)
		const justLoggedIn = newVal.isLoggedIn && (!oldVal || !oldVal.isLoggedIn)
		const connectionsJustLoaded = newVal.isLoggedIn && newVal.connectionsCount > 0 && (!oldVal || oldVal.connectionsCount === 0)

		if (justLoggedIn || connectionsJustLoaded) {
			// If already on a specific route or already connected, don't auto-connect
			if (route.params.connectionId || store.activeConnectionId) return

			// Need connections to be loaded
			if (connections.value.length === 0) return

			// Auto-connect: Find first connection with autoConnect enabled
			const autoConnectConn = connections.value.find(c => c.autoConnect === true)
			if (autoConnectConn) {
				await selectConnection(autoConnectConn)
			}
		}
	},
	{deep: true}
)

// Watch route changes to save last location
watch(
	() => route.fullPath,
	() => {
		if (store.isLoggedIn && activeConnectionId.value) {
			saveLastLocation()
		}
	}
)

// Watch route params to handle direct URL navigation
watch(
	() => ({
		connectionId: route.params.connectionId,
		database: route.params.database,
		collection: route.params.collection
	}),
	async (newParams, oldParams) => {
		if (!store.isLoggedIn || !newParams.connectionId) return

		// Wait for connections to be loaded before checking
		if (connections.value.length === 0) {
			// Connections not loaded yet, skip - onMounted will handle this
			return
		}

		// Check if connection exists
		const connectionExists = connections.value.some(c => c.id === newParams.connectionId)
		if (!connectionExists) {
			// Connection not found - redirect to home
			console.warn(`Connection not found: ${newParams.connectionId}`)
			store.disconnectFromServer()
			router.push('/')
			return
		}

		// Handle connection change
		if (newParams.connectionId !== store.activeConnectionId) {
			store.setActiveConnection(newParams.connectionId)
			try {
				await store.fetchDatabases()
			} catch (error) {
				console.error('Failed to fetch databases:', error)
				store.disconnectFromServer()
				router.push('/')
				return
			}
		}

		// Handle database selection and expansion
		if (newParams.database) {
			if (newParams.database !== store.selectedDatabase) {
				store.selectDatabase(newParams.database)
			}
			// Always expand the database and load collections (force expansion)
			expandedDbs.value = {...expandedDbs.value, [newParams.database]: true}

			if (!dbCollections.value[newParams.database] || dbCollections.value[newParams.database].length === 0) {
				await loadCollectionsForDb(newParams.database)
			}

			// Handle collection selection
			if (newParams.collection && newParams.collection !== store.selectedCollection) {
				store.selectCollection(newParams.collection)
				// Scroll to selected collection after DOM update
				await nextTick()
				setTimeout(() => scrollToSelectedCollection(), 200)
			}
		}
	},
	{deep: true}
)

onUnmounted(() => {
	document.removeEventListener('mousemove', doResize)
	document.removeEventListener('mouseup', stopResize)
	window.removeEventListener('resize', handleResize)
	document.removeEventListener('click', handleClickOutside)
})
</script>

<style>
/* App Font Variable */
:root {
	--app-font: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Classic Style */
* {
	font-size: 12px;
	font-family: var(--app-font);
	box-sizing: border-box;
}

/* Monospace only for code/data display */
code,
pre,
.doc-content pre,
.shell-input,
.shell-output,
.shell-result,
.shell-prompt,
.shell-command,
.shell-hints code {
	font-family: 'Courier New', Consolas, monospace;
}

body {
	margin: 0;
	padding: 0;
	background: #fff;
}

a {
	text-decoration: none;
	color: #004499;
	line-height: 1.5;
}

a:hover {
	text-decoration: underline;
}

.app {
	height: 100vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

/* Top Bar */
.top-bar {
	height: 40px;
	background: #eee;
	border-bottom: 1px solid #ccc;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 10px;
}

.top-left {
	display: flex;
	align-items: center;
	gap: 15px;
}

.brand {
	font-weight: bold;
	color: #333;
    display: flex;
    align-items: center;
    gap: 5px;
}

.brand span {
    color: #1C274C;
    font-size: 1.2rem;
}

.server-info {
	color: #666;
}

.top-right {
	display: flex;
	align-items: center;
	gap: 5px;
}

.top-right a {
	color: #004499;
}

.top-sep {
	color: #999;
	margin: 0 3px;
}

/* Language Dropdown */
.lang-dropdown {
	position: relative;
}

.lang-btn {
	display: flex;
	align-items: center;
	gap: 6px;
	background: transparent;
	border: none;
	padding: 4px 8px;
	border-radius: 4px;
	cursor: pointer;
	color: #555;
	font-size: 12px;
}

.lang-btn:hover {
	background: rgba(0, 0, 0, 0.05);
}

.lang-btn .lang-icon {
	font-size: 14px;
}

.lang-btn .lang-current {
	font-weight: 600;
}

.lang-btn .dropdown-arrow {
	font-size: 8px;
	opacity: 0.6;
}

.lang-dropdown-menu {
	position: absolute;
	top: 100%;
	right: 0;
	min-width: 140px;
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 6px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	padding: 6px 0;
	margin-top: 4px;
}

.lang-dropdown-menu a {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 14px;
	color: #333;
	text-decoration: none;
	font-size: 13px;
}

.lang-dropdown-menu a:hover {
	background: #f5f5f5;
}

.lang-dropdown-menu a.active {
	background: #e8f4ff;
	color: #004499;
	font-weight: 500;
}

.lang-dropdown-menu .lang-flag {
	font-size: 16px;
}

/* User Dropdown */
.user-dropdown {
	position: relative;
}

.user-btn {
	display: flex;
	align-items: center;
	gap: 6px;
	background: #e0e0e0;
	border: none;
	border-radius: 4px;
	padding: 3px 10px;
	cursor: pointer;
	font-size: 12px;
}

.user-btn:hover {
	background: #d0d0d0;
}

.user-icon {
	font-size: 12px;
}

.user-btn .user-name {
	color: #333;
	font-weight: bold;
}

.dropdown-arrow {
	font-size: 8px;
	color: #666;
	margin-left: 2px;
}

.user-dropdown-menu {
	position: absolute;
	top: 100%;
	right: 0;
	margin-top: 4px;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 6px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	min-width: 160px;
	z-index: 1001;
	padding: 6px 0;
}

.user-dropdown-menu a {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	color: #333;
	font-size: 13px;
	text-decoration: none;
}

.user-dropdown-menu a:hover {
	background: #f5f5f5;
	text-decoration: none;
}

.user-dropdown-menu .menu-icon {
	font-size: 14px;
	width: 18px;
	text-align: center;
}

.dropdown-divider {
	height: 1px;
	background: #e0e0e0;
	margin: 6px 0;
}

.user-dropdown-menu .logout-item {
	color: #c00;
}

.user-dropdown-menu .logout-item:hover {
	background: #fee;
}

.user {
	color: #333;
	font-weight: bold;
}

/* Main Layout */
.main-layout {
	flex: 1;
	display: flex;
	overflow: hidden;
	position: relative;
}

/* Sidebar Menu Button in Top Bar */
.sidebar-menu-btn {
	background: none;
	border: none;
	cursor: pointer;
	padding: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 3px;
}

.sidebar-menu-btn:hover {
	background: #d0d0d0;
}

/* Hamburger Icon */
.hamburger-icon {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	width: 14px;
	height: 10px;
}

.hamburger-icon span {
	display: block;
	height: 2px;
	background: #555;
	border-radius: 1px;
}

/* Left Panel */
.left-panel {
	background: #f5f5f5;
	border-right: 1px solid #ccc;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	transition: width 0.3s ease;
    z-index: 999;
}

.left-panel.collapsed {
	width: 0 !important;
	border-right: none;
}

.left-panel.collapsed .panel-content {
	opacity: 0;
	visibility: hidden;
}

.panel-content {
	flex: 1;
	overflow-y: auto;
	padding: 5px;
}

/* Resizer */
.resizer {
	width: 6px;
	background: #ddd;
	cursor: ew-resize;
	border-left: 1px solid #ccc;
	border-right: 1px solid #ccc;
}

.resizer:hover {
	background: #bbb;
}

/* Right Panel */
.right-panel {
	flex: 1;
	overflow-y: auto;
	padding: 10px;
	background: #fff;
}

/* Sections */
.section {
	margin-bottom: 15px;
}

.section-title {
	font-weight: bold;
	color: #333;
	padding: 3px 5px;
	background: #ddd;
	border: 1px solid #ccc;
	margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.section-title a {
	float: right;
	font-weight: normal;
}

.section-title .refresh-btn {
	font-size: 14px;
	margin-right: 5px;
	transition: transform 0.3s;
}

.section-title .refresh-btn:hover {
	transform: rotate(180deg);
}

/* Tree List */
.tree-list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.tree-list li {
	padding: 2px 0;
}

.tree-list a {
	display: inline-block;
	padding: 1px 5px;
	color: #004499;
}

.tree-list a:hover {
	background: #e0e0e0;
}

.tree-list a.active {
	background: #004499;
	color: #fff;
        flex: 1;
}

.tree-list .nested {
	margin-left: 15px;
	border-left: 1px dashed #ccc;
	padding-left: 10px;
}

.toggle-icon {
	font-size: 10px;
	margin-right: 3px;
}

.count {
	color: #666;
	font-size: 11px;
}

.tree-list a.active .count {
	color: #ccc;
}

.action-link {
	color: #c00 !important;
	margin-left: 3px;
	font-size: 10px;
}

.action-link.delete {
	color: #999 !important;
}

.action-link.delete:hover {
	color: #c00 !important;
}

/* Favorites Section */
.favorites-title {
	background: #fff3cd;
	border-color: #ffc107;
}

.favorites-title .fav-icon {
	color: #ffc107;
}

.favorites-list {
	background: #fffef5;
	border: 1px solid #f0e68c;
	border-radius: 3px;
	padding: 5px;
}

.favorite-item {
	display: flex;
	align-items: center;
	gap: 5px;
}

.favorite-item > a:first-child {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 5px;
}

.fav-type {
	font-size: 12px;
}

.remove-fav {
	color: #999 !important;
	font-size: 10px;
	opacity: 0.5;
}

.remove-fav:hover {
	opacity: 1;
	color: #c00 !important;
}

.fav-label {
	display: inline-block;
	max-width: 180px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	vertical-align: middle;
}

/* Pin link in collection list */
.coll-item {
	display: flex;
	align-items: center;
}

.coll-item > a:first-child {
	flex: 1;
}

.pin-link {
	color: #ccc !important;
	font-size: 12px;
	padding: 2px 5px;
	text-decoration: none !important;
}

.pin-link:hover {
	color: #ffc107 !important;
}

.pin-link.pinned {
	color: #ffc107 !important;
}

.connection-item {
	display: flex;
	align-items: center;
	gap: 3px;
}

.conn-status {
	font-size: 8px;
	color: #ccc;
}

.conn-status.connected {
	color: #0a0;
}

/* Connection Dropdown */
.conn-dropdown {
	position: relative;
	margin-left: auto;
}

.conn-dropdown-btn {
	background: none;
	border: none;
	cursor: pointer;
	padding: 2px 6px;
	font-size: 14px;
	color: #666;
	border-radius: 3px;
	line-height: 1;
}

.conn-dropdown-btn:hover {
	background: #ddd;
	color: #333;
}

.conn-dropdown-menu {
	position: absolute;
	top: 100%;
	right: 0;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 4px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	min-width: 140px;
	z-index: 100;
	padding: 4px 0;
}

.conn-dropdown-menu a {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	color: #333;
	font-size: 12px;
	white-space: nowrap;
}

.conn-dropdown-menu a:hover {
	background: #f0f0f0;
	text-decoration: none;
}

.conn-dropdown-menu a.disconnect {
	color: #e67700;
}

.conn-dropdown-menu a.delete {
	color: #c00;
}

.dropdown-icon {
	font-size: 12px;
	width: 16px;
	text-align: center;
}

/* Add Button in Section Title */
.section-title .add-btn {
	float: right;
	font-weight: normal;
	font-size: 11px;
	padding: 1px 6px;
	border-radius: 3px;
}

.section-title .add-btn:hover {
	background: #ddd;
	text-decoration: none;
}

.expand-link {
	margin-left: 5px;
	color: #666 !important;
	font-size: 10px;
}

.expand-link:hover {
	color: #004499 !important;
}

.db-item {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
}

.db-item > a:first-child {
	flex: 1;
}

.db-item > .tree-list.nested {
	width: 100%;
}

.empty-text {
	color: #999;
	font-style: italic;
	padding: 5px;
}

/* Modal */
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.mongomanager-modal {
	background: #fff;
	border: 2px solid #ccc;
	padding: 0;
	min-width: 400px;
}

.modal-title {
	background: #ddd;
	padding: 5px 10px;
	font-weight: bold;
	border-bottom: 1px solid #ccc;
}

.modal-body {
	padding: 15px;
}

.modal-tabs {
	display: flex;
	border-bottom: 1px solid #ccc;
}

.modal-tab {
	flex: 1;
	padding: 10px 15px;
	border: none;
	background: #f5f5f5;
	cursor: pointer;
	font-size: 13px;
	color: #666;
	transition: all 0.2s;
}

.modal-tab:hover {
	background: #e8e8e8;
}

.modal-tab.active {
	background: #fff;
	color: #333;
	font-weight: 600;
	border-bottom: 2px solid #4a90d9;
	margin-bottom: -1px;
}

.form-table {
	width: 100%;
	border-collapse: collapse;
}

.form-table td {
	padding: 5px;
}

.form-table input {
	width: 100%;
	padding: 3px 5px;
	border: 1px solid #ccc;
}

.form-table input[type='checkbox'] {
	width: auto;
}

.checkbox-label {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
}

.checkbox-label input {
	width: auto !important;
	cursor: pointer;
}

.checkbox-label span {
	color: #666;
}

.modal-buttons {
	padding: 10px;
	text-align: right;
	background: #f5f5f5;
	border-top: 1px solid #ccc;
}

.modal-buttons button {
	padding: 5px 15px;
	margin-left: 5px;
	cursor: pointer;
	border: 1px solid #ccc;
	background: #eee;
}

.modal-buttons button:hover {
	background: #ddd;
}

.modal-buttons button[type='submit'] {
	background: #004499;
	color: #fff;
	border-color: #003377;
}

.modal-buttons button[type='submit']:hover {
	background: #003377;
}

/* Required field indicator */
.required {
	color: #dc3545;
	font-weight: bold;
	margin-left: 2px;
}

/* Connection Modal Buttons */
.connection-modal-buttons {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 10px;
}

.connection-modal-buttons .btn-group-right {
	display: flex;
	gap: 8px;
}

.connection-modal-buttons .btn-test {
	background: #17a2b8;
	color: #fff;
	border-color: #138496;
}

.connection-modal-buttons .btn-test:hover:not(:disabled) {
	background: #138496;
}

.connection-modal-buttons .btn-save {
	background: #28a745;
	color: #fff;
	border-color: #218838;
}

.connection-modal-buttons .btn-save:hover:not(:disabled) {
	background: #218838;
}

.connection-modal-buttons .btn-save-connect {
	background: #004499;
	color: #fff;
	border-color: #003377;
}

.connection-modal-buttons .btn-save-connect:hover:not(:disabled) {
	background: #003377;
}

.connection-modal-buttons .btn-cancel {
	background: #6c757d;
	color: #fff;
	border-color: #5a6268;
}

.connection-modal-buttons .btn-cancel:hover:not(:disabled) {
	background: #5a6268;
}

.connection-modal-buttons button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

/* Connection Test Status */
.connection-test-status {
	margin-top: 15px;
	padding: 10px 12px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
}

.connection-test-status .status-icon {
	font-size: 16px;
	font-weight: bold;
}

.connection-test-status.loading {
	background: #e7f3ff;
	color: #0066cc;
	border: 1px solid #b8daff;
}

.connection-test-status.loading .status-icon {
	animation: spin 1s linear infinite;
}

.connection-test-status.success {
	background: #d4edda;
	color: #155724;
	border: 1px solid #c3e6cb;
}

.connection-test-status.error {
	background: #f8d7da;
	color: #721c24;
	border: 1px solid #f5c6cb;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* MongoManager Table Styles */
.mongomanager-table {
	background: #ccc;
	border-collapse: separate;
	border-spacing: 1px;
}

.mongomanager-table th {
	background: #ddd;
	padding: 5px 10px;
	text-align: left;
	font-weight: bold;
}

.mongomanager-table td {
	background: #fffeee;
	padding: 5px 10px;
    white-space: nowrap;
}

.mongomanager-table tr:hover td {
	background: #ffffc0;
}

/* Operation Links */
.operation {
	margin-bottom: 15px;
	padding: 5px;
	background: #f5f5f5;
	border: 1px solid #ddd;
}

.operation a {
	margin: 0 5px;
}

.operation a.current {
	font-weight: bold;
	color: #333;
}

/* Gap */
.gap {
	height: 15px;
}

/* Scrollbar */
::-webkit-scrollbar {
	width: 8px;
	height: 8px;
}

::-webkit-scrollbar-track {
	background: #f0f0f0;
}

::-webkit-scrollbar-thumb {
	background: #ccc;
}

::-webkit-scrollbar-thumb:hover {
	background: #aaa;
}

/* Mobile Menu Button */
.mobile-menu-btn {
	display: none;
	background: none;
	border: none;
	font-size: 18px;
	cursor: pointer;
	padding: 0 10px 0 0;
	color: #333;
}

.mobile-panel-header {
	display: none;
}

/* Mobile Overlay */
.mobile-overlay {
	display: none;
}

/* ============================================
   MOBILE RESPONSIVE STYLES
   ============================================ */
@media screen and (max-width: 768px) {
	* {
		font-size: 14px;
	}

	/* Top Bar Mobile */
	.top-bar {
		height: auto;
		padding: 8px 10px;
		flex-wrap: wrap;
	}

	.mobile-menu-btn {
		display: block;
	}

	.server-info {
		display: none;
	}

	.top-right {
		font-size: 12px;
	}

	/* Mobile Overlay */
	.mobile-overlay {
		display: block;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 998;
	}

	/* Left Panel - Hidden by default on mobile */
	.left-panel {
		position: fixed;
		top: 0;
		left: -300px;
		height: 100vh;
		width: 280px !important;
		z-index: 999;
		transition: left 0.3s ease;
		box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
	}

	.left-panel.mobile-open {
		left: 0;
	}

	.mobile-panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 15px;
		background: #004499;
		color: #fff;
		font-weight: bold;
	}

	.mobile-panel-header button {
		background: none;
		border: none;
		color: #fff;
		font-size: 20px;
		cursor: pointer;
		padding: 0;
	}

	/* Hide Resizer on mobile */
	.resizer {
		display: none;
	}

	/* Right Panel - Full width on mobile */
	.right-panel {
		width: 100%;
		padding: 10px;
	}

	/* Tree List touch-friendly */
	.tree-list li {
		padding: 5px 0;
	}

	.tree-list a {
		padding: 8px 10px;
		display: block;
	}

	.section-title {
		padding: 8px 10px;
		font-size: 14px;
	}

	/* Modal Mobile */
	.mongomanager-modal {
		min-width: auto;
		width: 95%;
		max-width: 400px;
		margin: 10px;
	}

	.form-table td {
		display: block;
		width: 100%;
		padding: 5px 10px;
	}

	.form-table tr {
		display: block;
		margin-bottom: 10px;
	}

	.form-table input {
		padding: 10px;
		font-size: 16px;
	}

	.modal-buttons {
		display: flex;
		gap: 10px;
	}

	.modal-buttons button {
		flex: 1;
		padding: 12px;
		font-size: 14px;
	}

	/* MongoManager Table Mobile */
	.mongomanager-table {
		display: block;
		overflow-x: auto;
		white-space: nowrap;
	}

	.mongomanager-table th,
	.mongomanager-table td {
		padding: 8px;
		font-size: 12px;
	}

	/* Operation links */
	.operation {
		overflow-x: auto;
		white-space: nowrap;
		padding: 8px;
	}

	.operation a {
		display: inline-block;
		padding: 5px 8px;
		margin: 2px;
	}

	/* Connection item */
	.connection-item {
		padding: 5px 0;
	}

	.conn-actions {
		padding-left: 10px;
	}
}

/* Small Mobile (< 480px) */
@media screen and (max-width: 480px) {
	.top-bar {
		padding: 5px 8px;
	}

	.brand {
		font-size: 14px;
	}

	.top-right {
		font-size: 11px;
	}

	.top-right .user {
		display: none;
	}

	.right-panel {
		padding: 5px;
	}

	.mongomanager-modal {
		width: 100%;
		max-width: none;
		margin: 0;
		border-radius: 0;
		min-height: auto;
	}

	.modal-overlay {
		align-items: flex-end;
	}

    .brand .logoIcon{
        display: none;
    }

    .brand span {
        font-size: 1rem;
    }
}

/* Tablet (768px - 1024px) */
@media screen and (min-width: 769px) and (max-width: 1024px) {
	.left-panel {
		min-width: 200px;
	}

	.left-panel.collapsed {
		min-width: 0;
	}

	.right-panel {
		padding: 10px;
	}
}

/* Touch-friendly improvements */
@media (pointer: coarse) {
	.tree-list a {
		min-height: 34px;
		display: flex;
		align-items: center;
	}

	.action-link {
		padding: 10px;
		font-size: 14px;
	}

	.expand-link {
		padding: 10px;
		font-size: 14px;
	}

	button,
	input[type='submit'] {
		min-height: 44px;
	}

	input[type='text'],
	input[type='password'],
	input[type='number'],
	textarea,
	select {
		min-height: 34px;
		font-size: 14px;
		/* Prevents iOS zoom */
	}
}

/* Landscape orientation adjustments */
@media screen and (max-height: 500px) and (orientation: landscape) {
	.left-panel {
		height: 100vh;
	}

	.modal-overlay {
		align-items: flex-start;
		padding-top: 10px;
	}

	.mongomanager-modal {
		max-height: 90vh;
		overflow-y: auto;
	}
}

/* Settings Link */
.settings-link {
	font-size: 14px;
}

/* ============================================
   DARK MODE STYLES
   ============================================ */
:root.dark body,
.dark .app {
	background: #1e1e1e;
	color: #cfcfcf;
}

/* Global link color for dark mode */
.dark a {
	color: #cee2fa;
}

.dark a:hover {
	color: #fff;
}

.dark .top-bar {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

.dark .top-bar a {
	color: #cee2fa;
}

.dark .brand {
	color: #cfcfcf;
}

.dark .server-info {
	color: #858585;
}

.dark .user {
	color: #cfcfcf;
}

.dark .top-sep {
	color: #555;
}

/* Dark Mode - Language Dropdown */
.dark .lang-btn {
	color: #cfcfcf;
}

.dark .lang-btn:hover {
	background: rgba(255, 255, 255, 0.1);
}

.dark .lang-dropdown-menu {
	background: #252526;
	border-color: #3c3c3c;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.dark .lang-dropdown-menu a {
	color: #cfcfcf;
}

.dark .lang-dropdown-menu a:hover {
	background: #333;
}

.dark .lang-dropdown-menu a.active {
	background: #0e639c;
	color: #fff;
}

/* Dark Mode - User Dropdown */
.dark .user-btn {
	background: #3c3c3c;
}

.dark .user-btn:hover {
	background: #4c4c4c;
}

.dark .user-btn .user-name {
	color: #cfcfcf;
}

.dark .dropdown-arrow {
	color: #858585;
}

.dark .user-dropdown-menu {
	background: #252526;
	border-color: #3c3c3c;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.dark .user-dropdown-menu a {
	color: #cfcfcf;
}

.dark .user-dropdown-menu a:hover {
	background: #333;
}

.dark .dropdown-divider {
	background: #3c3c3c;
}

.dark .user-dropdown-menu .logout-item {
	color: #f48771;
}

.dark .user-dropdown-menu .logout-item:hover {
	background: #3c2020;
}

.dark .left-panel {
	background: #252526;
	border-color: #3c3c3c;
}

.dark .sidebar-menu-btn:hover {
	background: #3c3c3c;
}

.dark .hamburger-icon span {
	background: #ccc;
}

.dark .checkbox-label span {
	color: #999;
}

.dark .section-title {
	background: #333;
	border-color: #3c3c3c;
	color: #cfcfcf;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.dark .section-title a {
	color: #cee2fa;
}

.dark .tree-list a {
	color: #cee2fa;
}

.dark .tree-list a:hover {
	background: #333;
}

.dark .tree-list a.active {
	background: #0e639c;
	color: #fff;
}

.dark .tree-list .nested {
	border-color: #3c3c3c;
}

.dark .count {
	color: #858585;
}

.dark .tree-list a.active .count {
	color: #9cdcfe;
}

.dark .conn-status {
	color: #555;
}

.dark .conn-status.connected {
	color: #4ec9b0;
}

/* Dark Mode - Connection Dropdown */
.dark .conn-dropdown-btn {
	color: #858585;
}

.dark .conn-dropdown-btn:hover {
	background: #3c3c3c;
	color: #cfcfcf;
}

.dark .conn-dropdown-menu {
	background: #252526;
	border-color: #3c3c3c;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.dark .conn-dropdown-menu a {
	color: #cfcfcf;
}

.dark .conn-dropdown-menu a:hover {
	background: #333;
}

.dark .conn-dropdown-menu a.disconnect {
	color: #dcdcaa;
}

.dark .conn-dropdown-menu a.delete {
	color: #f48771;
}

/* Dark Mode - Add Button */
.dark .section-title .add-btn {
	background: #3c3c3c;
	color: #cee2fa;
}

.dark .section-title .add-btn:hover {
	background: #4c4c4c;
}

.dark .empty-text {
	color: #666;
}

.dark .expand-link {
	color: #858585 !important;
}

.dark .expand-link:hover {
	color: #569cd6 !important;
}

.dark .action-link.delete {
	color: #666 !important;
}

.dark .action-link.delete:hover {
	color: #f48771 !important;
}

/* Dark Mode - Favorites */
.dark .favorites-title {
	background: #3c3c1e;
	border-color: #5c5c2e;
}

.dark .favorites-list {
	background: #2d2d1e;
	border-color: #4c4c2e;
}

/* Dark Mode - Resizer */
.dark .resizer {
	background: #3c3c3c;
	border-color: #2d2d2d;
}

.dark .resizer:hover {
	background: #4c4c4c;
}

/* Dark Mode - Right Panel */
.dark .right-panel {
	background: #1e1e1e;
}

/* Dark Mode - Modal */
.dark .mongomanager-modal {
	background: #252526;
	border-color: #3c3c3c;
}

.dark .modal-title {
	background: #333;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

.dark .form-table input {
	background: #1e1e1e;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

/* Dark Mode - Global Inputs */
.dark input[type='text'],
.dark input[type='number'],
.dark input[type='password'],
.dark input[type='email'],
.dark input[type='search'],
.dark textarea,
.dark select {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

.dark input::placeholder,
.dark textarea::placeholder {
	color: #666;
}

.dark input:focus,
.dark textarea:focus,
.dark select:focus {
	border-color: #0e639c;
	outline: none;
}

.dark .modal-buttons {
	background: #2d2d2d !important;
	border-color: #3c3c3c;
}

.dark .modal-buttons button {
	background: #3c3c3c;
	border-color: #555;
	color: #cfcfcf;
}

.dark .modal-buttons button:hover {
	background: #4c4c4c;
}

.dark .modal-buttons button[type='submit'] {
	background: #0e639c;
	border-color: #094771;
	color: #fff;
}

.dark .modal-buttons button[type='submit']:hover {
	background: #1177bb;
}

/* Dark Mode - Connection Modal */
.dark .connection-modal-buttons .btn-test {
	background: #138496;
	border-color: #117a8b;
}

.dark .connection-modal-buttons .btn-test:hover:not(:disabled) {
	background: #117a8b;
}

.dark .connection-modal-buttons .btn-save {
	background: #218838;
	border-color: #1e7e34;
}

.dark .connection-modal-buttons .btn-save:hover:not(:disabled) {
	background: #1e7e34;
}

.dark .connection-modal-buttons .btn-save-connect {
	background: #0e639c;
	border-color: #094771;
}

.dark .connection-modal-buttons .btn-save-connect:hover:not(:disabled) {
	background: #1177bb;
}

.dark .connection-modal-buttons .btn-cancel {
	background: #5a6268;
	border-color: #4e555b;
}

.dark .connection-modal-buttons .btn-cancel:hover:not(:disabled) {
	background: #4e555b;
}

.dark .connection-test-status.loading {
	background: #1e3a5f;
	color: #6cb2eb;
	border-color: #2d4a6f;
}

.dark .connection-test-status.success {
	background: #1d3a29;
	color: #48c774;
	border-color: #2d4a39;
}

.dark .connection-test-status.error {
	background: #4a1a1a;
	color: #f14668;
	border-color: #5a2a2a;
}

.dark .modal-tabs {
	border-color: #3c3c3c;
}

.dark .modal-tab {
	background: #2d2d2d;
	color: #999;
}

.dark .modal-tab:hover {
	background: #3c3c3c;
}

.dark .modal-tab.active {
	background: #3c3c3c;
	color: #fff;
	border-bottom-color: #4a90d9;
}

/* Dark Mode - Tables */
.dark .mongomanager-table {
	background: #3c3c3c;
}

.dark .mongomanager-table th {
	background: #333;
	color: #cfcfcf;
}

.dark .mongomanager-table td {
	background: #252526;
	color: #cfcfcf;
}

.dark .mongomanager-table tr:hover td {
	background: #2d2d2d;
}

/* Dark Mode - Operation Links */
.dark .operation {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

.dark .operation a {
	color: #cee2fa;
}

.dark .operation a.current {
	color: #40ce46;
}

/* Dark Mode - Scrollbar */
.dark ::-webkit-scrollbar-track {
	background: #1e1e1e;
}

.dark ::-webkit-scrollbar-thumb {
	background: #424242;
}

.dark ::-webkit-scrollbar-thumb:hover {
	background: #555;
}

/* Dark Mode - Mobile */
.dark .mobile-panel-header {
	background: #0e639c;
}

.dark .pin-link {
	color: #555 !important;
}

.dark .pin-link:hover,
.dark .pin-link.pinned {
	color: #ffc107 !important;
}

/* ============================================
   MODERN THEME (Bootstrap 5 Style)
   Clean Admin Light Theme
   ============================================ */

/* Modern Theme - CSS Variables */
:root.modern-theme {
	/* Primary Colors */
	--modern-primary: #2563eb;
	--modern-primary-hover: #1d4ed8;
	--modern-primary-light: #dbeafe;

	/* Semantic Colors */
	--modern-success: #10b981;
	--modern-warning: #f59e0b;
	--modern-danger: #ef4444;
	--modern-info: #3b82f6;

	/* Neutral Colors */
	--modern-gray-50: #f9fafb;
	--modern-gray-100: #f3f4f6;
	--modern-gray-200: #e5e7eb;
	--modern-gray-300: #d1d5db;
	--modern-gray-400: #9ca3af;
	--modern-gray-500: #6b7280;
	--modern-gray-600: #4b5563;
	--modern-gray-700: #374151;
	--modern-gray-800: #1f2937;
	--modern-gray-900: #111827;

	/* Background Colors */
	--modern-bg-page: #f5f7fb;
	--modern-bg-card: #ffffff;
	--modern-bg-sidebar: linear-gradient(180deg, #1f2a37 0%, #111827 100%);

	/* Text Colors */
	--modern-text-primary: #111827;
	--modern-text-secondary: #6b7280;
	--modern-text-muted: #9ca3af;
	--modern-text-sidebar: #e5e7eb;
	--modern-text-sidebar-muted: #9ca3af;

	/* Border Colors */
	--modern-border: #e5e7eb;
	--modern-border-light: #f3f4f6;

	/* Shadow */
	--modern-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
	--modern-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	--modern-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);

	/* Typography - Uses global --app-font variable */
	--modern-font-family: var(--app-font);
	--modern-font-size-xs: 11px;
	--modern-font-size-sm: 12px;
	--modern-font-size-base: 13px;
	--modern-font-size-lg: 14px;
	--modern-font-size-xl: 16px;
	--modern-font-size-2xl: 20px;
	--modern-font-size-3xl: 24px;

	/* Spacing */
	--modern-radius-sm: 6px;
	--modern-radius: 8px;
	--modern-radius-lg: 12px;
	--modern-radius-xl: 16px;
}

/* Modern Theme Base */
:root.modern-theme body,
.modern-theme .app {
	background: var(--modern-bg-page);
	color: var(--modern-text-primary);
	font-family: var(--modern-font-family);
}

.modern-theme * {
	font-family: var(--modern-font-family);
	font-size: var(--modern-font-size-base);
}

.modern-theme code,
.modern-theme pre,
.modern-theme .doc-content pre,
.modern-theme .shell-input,
.modern-theme .shell-output {
	font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', Consolas, monospace;
}

.modern-theme a {
	color: var(--modern-primary);
	text-decoration: none;
	transition: color 0.15s ease;
}

.modern-theme a:hover {
	color: var(--modern-primary-hover);
	text-decoration: none;
}

/* Modern Theme - Top Bar */
.modern-theme .top-bar {
	height: 56px;
	background: var(--modern-bg-card);
	border-bottom: 1px solid var(--modern-border);
	box-shadow: var(--modern-shadow-sm);
	padding: 0 20px;
}

.modern-theme .brand {
	font-size: var(--modern-font-size-xl);
	font-weight: 700;
	color: var(--modern-primary);
	letter-spacing: -0.02em;
}

.modern-theme .server-info {
	color: var(--modern-text-secondary);
	font-size: var(--modern-font-size-sm);
	background: var(--modern-gray-100);
	padding: 4px 12px;
	border-radius: var(--modern-radius);
}

.modern-theme .top-right {
	gap: 12px;
}

.modern-theme .top-right a {
	color: var(--modern-text-secondary);
	font-size: var(--modern-font-size-sm);
	padding: 6px 12px;
	border-radius: var(--modern-radius);
	transition: all 0.15s ease;
}

.modern-theme .top-right a:hover {
	background: var(--modern-gray-100);
	color: var(--modern-text-primary);
}

.modern-theme .top-sep {
	display: none;
}

.modern-theme .lang-btn {
	background: var(--modern-gray-100);
	border-radius: var(--modern-radius);
	padding: 6px 12px;
	color: var(--modern-text-secondary);
	font-weight: 500;
}

.modern-theme .lang-btn:hover {
	background: var(--modern-gray-200);
}

.modern-theme .lang-dropdown-menu {
	background: var(--modern-bg-card);
	border: 1px solid var(--modern-border);
	border-radius: var(--modern-radius-lg);
	box-shadow: var(--modern-shadow-lg);
	padding: 8px;
}

.modern-theme .lang-dropdown-menu a {
	color: var(--modern-text-primary);
	border-radius: var(--modern-radius);
	padding: 10px 14px;
	font-weight: 500;
}

.modern-theme .lang-dropdown-menu a:hover {
	background: var(--modern-gray-100);
}

.modern-theme .lang-dropdown-menu a.active {
	background: var(--modern-primary);
	color: white;
}

.modern-theme .user {
	color: var(--modern-text-primary);
	font-weight: 500;
	background: var(--modern-gray-100);
	padding: 6px 14px;
	border-radius: var(--modern-radius);
}

.modern-theme .settings-link {
	font-size: 16px;
	width: 36px;
	height: 36px;
	display: flex !important;
	align-items: center;
	justify-content: center;
	background: var(--modern-gray-100);
	border-radius: var(--modern-radius);
	padding: 0 !important;
}

.modern-theme .settings-link:hover {
	background: var(--modern-gray-200);
}

/* Modern Theme - User Dropdown */
.modern-theme .user-btn {
	background: var(--modern-gray-100);
	border-radius: var(--modern-radius);
	padding: 8px 14px;
	gap: 8px;
}

.modern-theme .user-btn:hover {
	background: var(--modern-gray-200);
}

.modern-theme .user-btn .user-name {
	color: var(--modern-text-primary);
	font-weight: 500;
}

.modern-theme .user-icon {
	font-size: 14px;
}

.modern-theme .dropdown-arrow {
	color: var(--modern-text-muted);
	font-size: 10px;
}

.modern-theme .user-dropdown-menu {
	background: var(--modern-bg-card);
	border: 1px solid var(--modern-border);
	border-radius: var(--modern-radius-lg);
	box-shadow: var(--modern-shadow-lg);
	padding: 8px;
}

.modern-theme .user-dropdown-menu a {
	color: var(--modern-text-primary);
	border-radius: var(--modern-radius);
	padding: 10px 14px;
}

.modern-theme .user-dropdown-menu a:hover {
	background: var(--modern-gray-100);
}

.modern-theme .dropdown-divider {
	background: var(--modern-border);
	margin: 8px 0;
}

.modern-theme .user-dropdown-menu .logout-item {
	color: var(--modern-danger);
}

.modern-theme .user-dropdown-menu .logout-item:hover {
	background: rgba(239, 68, 68, 0.1);
}

/* Modern Theme - Left Panel / Sidebar */
.modern-theme .left-panel {
	background: var(--modern-bg-sidebar);
	border-right: none;
	box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
}

.modern-theme .panel-content {
	padding: 16px 12px;
}

.modern-theme .section {
	margin-bottom: 20px;
}

.modern-theme .section-title {
	background: rgba(255, 255, 255, 0.08);
	border: none;
	border-radius: var(--modern-radius);
	color: var(--modern-text-sidebar);
	font-size: var(--modern-font-size-xs);
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	padding: 8px 12px;
	margin-bottom: 8px;
}

.modern-theme .section-title a {
	color: var(--modern-text-sidebar-muted);
	font-size: var(--modern-font-size-lg);
	font-weight: normal;
}

.modern-theme .section-title a:hover {
	color: white;
}

/* Modern Theme - Tree List */
.modern-theme .tree-list a {
	color: var(--modern-text-sidebar);
	padding: 8px 12px;
	border-radius: var(--modern-radius);
	transition: all 0.15s ease;
	font-size: var(--modern-font-size-sm);
}

.modern-theme .tree-list a:hover {
	background: rgba(255, 255, 255, 0.08);
}

.modern-theme .tree-list a.active {
	background: var(--modern-primary);
	color: white;
	font-weight: 500;
}

.modern-theme .tree-list .nested {
	border-left: 2px solid rgba(255, 255, 255, 0.1);
	margin-left: 12px;
	padding-left: 12px;
}

.modern-theme .count {
	color: var(--modern-text-sidebar-muted);
	font-size: var(--modern-font-size-xs);
}

.modern-theme .tree-list a.active .count {
	color: rgba(255, 255, 255, 0.7);
}

.modern-theme .empty-text {
	color: var(--modern-text-sidebar-muted);
	font-size: var(--modern-font-size-sm);
	padding: 8px 12px;
}

/* Modern Theme - Connection Item */
.modern-theme .conn-status {
	color: var(--modern-text-sidebar-muted);
}

.modern-theme .conn-status.connected {
	color: var(--modern-success);
}

/* Modern Theme - Connection Dropdown */
.modern-theme .conn-dropdown-btn {
	color: var(--modern-text-sidebar-muted);
	border-radius: var(--modern-radius-sm);
}

.modern-theme .conn-dropdown-btn:hover {
	background: rgba(255, 255, 255, 0.1);
	color: white;
}

.modern-theme .conn-dropdown-menu {
	background: var(--modern-bg-card);
	border: 1px solid var(--modern-border);
	border-radius: var(--modern-radius);
	box-shadow: var(--modern-shadow-lg);
}

.modern-theme .conn-dropdown-menu a {
	color: var(--modern-text-primary);
	border-radius: var(--modern-radius-sm);
	margin: 2px 4px;
}

.modern-theme .conn-dropdown-menu a:hover {
	background: var(--modern-gray-100);
}

.modern-theme .conn-dropdown-menu a.disconnect {
	color: var(--modern-warning);
}

.modern-theme .conn-dropdown-menu a.delete {
	color: var(--modern-danger);
}

/* Modern Theme - Add Button */
.modern-theme .section-title .add-btn {
	background: rgba(255, 255, 255, 0.1);
	color: var(--modern-text-sidebar);
	border-radius: var(--modern-radius-sm);
	padding: 2px 8px;
	font-size: var(--modern-font-size-xs);
}

.modern-theme .section-title .add-btn:hover {
	background: rgba(255, 255, 255, 0.15);
	color: white;
}

.modern-theme .expand-link {
	color: var(--modern-text-sidebar-muted) !important;
	font-size: var(--modern-font-size-sm);
}

.modern-theme .expand-link:hover {
	color: white !important;
}

.modern-theme .action-link.delete {
	color: var(--modern-text-sidebar-muted) !important;
}

.modern-theme .action-link.delete:hover {
	color: var(--modern-danger) !important;
}

/* Modern Theme - Favorites */
.modern-theme .favorites-title {
	background: rgba(245, 158, 11, 0.15);
	border: none;
	color: #fcd34d;
}

.modern-theme .favorites-title .fav-icon {
	color: var(--modern-warning);
}

.modern-theme .favorites-list {
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: var(--modern-radius);
}

.modern-theme .pin-link {
	color: rgba(255, 255, 255, 0.3) !important;
}

.modern-theme .pin-link:hover,
.modern-theme .pin-link.pinned {
	color: var(--modern-warning) !important;
}

.modern-theme .remove-fav {
	color: rgba(255, 255, 255, 0.3) !important;
}

.modern-theme .remove-fav:hover {
	color: var(--modern-danger) !important;
}

/* Modern Theme - Resizer */
.modern-theme .resizer {
	width: 4px;
	background: transparent;
	border: none;
	cursor: ew-resize;
}

.modern-theme .resizer:hover {
	background: var(--modern-primary);
}

/* Modern Theme - Right Panel */
.modern-theme .right-panel {
	background: var(--modern-bg-page);
	padding: 24px;
}

/* Modern Theme - Modal */
.modern-theme .modal-overlay {
	background: rgba(17, 24, 39, 0.6);
	backdrop-filter: blur(4px);
}

.modern-theme .mongomanager-modal {
	background: var(--modern-bg-card);
	border: none;
	border-radius: var(--modern-radius-lg);
	box-shadow: var(--modern-shadow-lg);
	overflow: hidden;
}

.modern-theme .modal-title {
	background: var(--modern-bg-card);
	border-bottom: 1px solid var(--modern-border);
	color: var(--modern-text-primary);
	font-size: var(--modern-font-size-lg);
	font-weight: 600;
	padding: 16px 20px;
}

.modern-theme .form-table {
	padding: 20px;
}

.modern-theme .form-table td {
	padding: 8px 0;
	color: var(--modern-text-secondary);
	font-size: var(--modern-font-size-sm);
}

.modern-theme .form-table input {
	background: var(--modern-bg-card);
	border: 1px solid var(--modern-border);
	border-radius: var(--modern-radius);
	padding: 10px 14px;
	color: var(--modern-text-primary);
	font-size: var(--modern-font-size-base);
	transition:
		border-color 0.15s ease,
		box-shadow 0.15s ease;
}

.modern-theme .form-table input:focus {
	outline: none;
	border-color: var(--modern-primary);
	box-shadow: 0 0 0 3px var(--modern-primary-light);
}

.modern-theme .form-table input::placeholder {
	color: var(--modern-text-muted);
}

.modern-theme .modal-buttons {
	background: var(--modern-gray-50);
	border-top: 1px solid var(--modern-border);
	padding: 16px 20px;
	gap: 12px;
}

.modern-theme .modal-buttons button {
	border: none;
	border-radius: var(--modern-radius);
	padding: 10px 20px;
	font-weight: 500;
	font-size: var(--modern-font-size-sm);
	cursor: pointer;
	transition: all 0.15s ease;
}

.modern-theme .modal-buttons button {
	background: var(--modern-bg-card);
	border: 1px solid var(--modern-border);
	color: var(--modern-text-secondary);
}

.modern-theme .modal-buttons button:hover {
	background: var(--modern-gray-100);
	color: var(--modern-text-primary);
}

.modern-theme .modal-buttons button[type='submit'] {
	background: var(--modern-primary);
	border-color: var(--modern-primary);
	color: white;
}

.modern-theme .modal-buttons button[type='submit']:hover {
	background: var(--modern-primary-hover);
}

/* Modern Theme - Tables */
.modern-theme .mongomanager-table {
	background: transparent;
	border-collapse: separate;
	border-spacing: 0;
	border-radius: var(--modern-radius-lg);
	overflow: hidden;
	box-shadow: var(--modern-shadow);
}

.modern-theme .mongomanager-table th {
	background: var(--modern-gray-50);
	color: var(--modern-text-secondary);
	font-weight: 600;
	font-size: var(--modern-font-size-xs);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	padding: 12px 16px;
	border-bottom: 1px solid var(--modern-border);
}

.modern-theme .mongomanager-table td {
	background: var(--modern-bg-card);
	color: var(--modern-text-primary);
	padding: 12px 16px;
	border-bottom: 1px solid var(--modern-border-light);
}

.modern-theme .mongomanager-table tr:last-child td {
	border-bottom: none;
}

.modern-theme .mongomanager-table tr:hover td {
	background: var(--modern-gray-50);
}

/* Modern Theme - Operation Links */
.modern-theme .operation {
	background: var(--modern-bg-card);
	border: 1px solid var(--modern-border);
	border-radius: var(--modern-radius-lg);
	padding: 12px 16px;
	box-shadow: var(--modern-shadow-sm);
}

.modern-theme .operation a {
	color: var(--modern-text-secondary);
	padding: 6px 12px;
	border-radius: var(--modern-radius);
	margin: 0 2px;
	font-size: var(--modern-font-size-sm);
	transition: all 0.15s ease;
}

.modern-theme .operation a:hover {
	background: var(--modern-gray-100);
	color: var(--modern-text-primary);
}

.modern-theme .operation a.current {
	background: var(--modern-primary);
	color: white;
	font-weight: 500;
}

/* Modern Theme - Scrollbar */
.modern-theme ::-webkit-scrollbar {
	width: 8px;
	height: 8px;
}

.modern-theme ::-webkit-scrollbar-track {
	background: transparent;
}

.modern-theme ::-webkit-scrollbar-thumb {
	background: var(--modern-gray-300);
	border-radius: 4px;
}

.modern-theme ::-webkit-scrollbar-thumb:hover {
	background: var(--modern-gray-400);
}

.modern-theme .left-panel::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.2);
}

.modern-theme .left-panel::-webkit-scrollbar-thumb:hover {
	background: rgba(255, 255, 255, 0.3);
}

/* Modern Theme - Mobile */
.modern-theme .mobile-menu-btn {
	color: var(--modern-text-secondary);
	font-size: 20px;
}

.modern-theme .mobile-panel-header {
	background: var(--modern-gray-900);
	padding: 16px 20px;
}

/* Modern Theme Dark Mode Override */
:root.dark.modern-theme {
	--modern-bg-page: #0f172a;
	--modern-bg-card: #1e293b;
	--modern-bg-sidebar: linear-gradient(180deg, #0f172a 0%, #020617 100%);

	--modern-text-primary: #f1f5f9;
	--modern-text-secondary: #94a3b8;
	--modern-text-muted: #64748b;

	--modern-border: #334155;
	--modern-border-light: #1e293b;

	--modern-gray-50: #1e293b;
	--modern-gray-100: #334155;
	--modern-gray-200: #475569;
}

:root.dark.modern-theme body,
.dark.modern-theme .app {
	background: var(--modern-bg-page);
}

.dark.modern-theme .top-bar {
	background: var(--modern-bg-card);
	border-color: var(--modern-border);
}

.dark.modern-theme .server-info {
	background: var(--modern-gray-100);
}

.dark.modern-theme .lang-btn {
	background: var(--modern-gray-100);
}

.dark.modern-theme .lang-dropdown-menu {
	background: var(--modern-bg-card);
	border-color: var(--modern-border);
}

.dark.modern-theme .lang-dropdown-menu a {
	color: var(--modern-text-primary);
}

.dark.modern-theme .lang-dropdown-menu a:hover {
	background: var(--modern-gray-100);
}

.dark.modern-theme .user {
	background: var(--modern-gray-100);
	color: var(--modern-text-primary);
}

.dark.modern-theme .settings-link {
	background: var(--modern-gray-100);
}

.dark.modern-theme .settings-link:hover {
	background: var(--modern-gray-200);
}

.dark.modern-theme .right-panel {
	background: var(--modern-bg-page);
}

.dark.modern-theme .mongomanager-modal {
	background: var(--modern-bg-card);
}

.dark.modern-theme .modal-title {
	background: var(--modern-bg-card);
	border-color: var(--modern-border);
	color: var(--modern-text-primary);
}

.dark.modern-theme .form-table input {
	background: var(--modern-bg-page);
	border-color: var(--modern-border);
	color: var(--modern-text-primary);
}

.dark.modern-theme .modal-buttons {
	background: rgba(0, 0, 0, 0.2) !important;
	border-color: var(--modern-border);
}

.dark.modern-theme .modal-buttons button {
	background: var(--modern-gray-100);
	border-color: var(--modern-border);
	color: var(--modern-text-secondary);
}

.dark.modern-theme .modal-buttons button:hover {
	background: var(--modern-gray-200);
	color: var(--modern-text-primary);
}

.dark.modern-theme .modal-form .form-label {
	color: var(--modern-text-primary);
}

.dark.modern-theme .mongomanager-table th {
	background: rgba(0, 0, 0, 0.2);
	color: var(--modern-text-secondary);
	border-color: var(--modern-border);
}

.dark.modern-theme .mongomanager-table td {
	background: var(--modern-bg-card);
	color: var(--modern-text-primary);
	border-color: var(--modern-border);
}

.dark.modern-theme .mongomanager-table tr:hover td {
	background: var(--modern-gray-100);
}

.dark.modern-theme .operation {
	background: var(--modern-bg-card);
	border-color: var(--modern-border);
}

.dark.modern-theme .operation a:hover {
	background: var(--modern-gray-100);
}

.dark.modern-theme ::-webkit-scrollbar-thumb {
	background: var(--modern-gray-200);
}

.dark.modern-theme ::-webkit-scrollbar-thumb:hover {
	background: var(--modern-gray-400);
}

/* Dark Modern Theme - User Dropdown */
.dark.modern-theme .user-btn {
	background: var(--modern-gray-100);
}

.dark.modern-theme .user-btn:hover {
	background: var(--modern-gray-200);
}

.dark.modern-theme .user-btn .user-name {
	color: var(--modern-text-primary);
}

.dark.modern-theme .user-dropdown-menu {
	background: var(--modern-bg-card);
	border-color: var(--modern-border);
}

.dark.modern-theme .user-dropdown-menu a {
	color: var(--modern-text-primary);
}

.dark.modern-theme .user-dropdown-menu a:hover {
	background: var(--modern-gray-100);
}

.dark.modern-theme .dropdown-divider {
	background: var(--modern-border);
}

/* ============================================
   SIDEBAR LIGHT THEME (for Modern Theme)
   ============================================ */

/* Light sidebar when dark mode is OFF and sidebar-light is enabled */
.modern-theme.sidebar-light .left-panel {
	background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
	box-shadow: 4px 0 24px rgba(0, 0, 0, 0.08);
}

.modern-theme.sidebar-light .section-title {
	color: #64748b;
    background-color: #e6e6e6;
}

.modern-theme.sidebar-light .tree-list a {
	color: #475569;
}

.modern-theme.sidebar-light .tree-list a:hover {
	background: rgba(0, 0, 0, 0.05);
	color: #1e293b;
}

.modern-theme.sidebar-light .tree-list a.active {
	background: var(--modern-primary);
	color: white;
}

.modern-theme.sidebar-light .conn-status.connected {
	color: #22c55e;
}

.modern-theme.sidebar-light .count {
	color: #94a3b8;
}

.modern-theme.sidebar-light .add-btn,
.modern-theme.sidebar-light .expand-link {
	color: #64748b;
}

.modern-theme.sidebar-light .add-btn:hover,
.modern-theme.sidebar-light .expand-link:hover {
	color: var(--modern-primary);
}

.modern-theme.sidebar-light .empty-text {
	color: #94a3b8;
}

.modern-theme.sidebar-light .favorites-title .fav-icon {
	color: #f59e0b;
}

.modern-theme.sidebar-light .conn-dropdown-menu {
	background: #fff;
	border: 1px solid #e2e8f0;
}

.modern-theme.sidebar-light .conn-dropdown-menu a {
	color: #475569;
}

.modern-theme.sidebar-light .conn-dropdown-menu a:hover {
	background: #f1f5f9;
}

.modern-theme.sidebar-light .left-panel::-webkit-scrollbar-thumb {
	background: rgba(0, 0, 0, 0.15);
}

.modern-theme.sidebar-light .left-panel::-webkit-scrollbar-thumb:hover {
	background: rgba(0, 0, 0, 0.25);
}

/* Dark mode + sidebar-light = dark sidebar (ignore sidebar-light in dark mode) */
.dark.modern-theme.sidebar-light .left-panel {
	background: var(--modern-bg-sidebar);
}

.logoIcon{
    width: 20px;
}

.dark.modern-theme .logoIcon{
    width: 32px;
}

.dark.modern-theme .brand span {
    color: #1C274C;
    font-size: 1.5rem;
}
</style>
