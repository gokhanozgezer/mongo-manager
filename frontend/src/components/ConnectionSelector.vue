<template>
	<div class="connection-selector">
		<div class="section-header">
			<h3>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
				</svg>
				Connections
			</h3>
			<button class="btn btn-primary btn-sm" @click="openAddModal">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				Add
			</button>
		</div>

		<div v-if="loading" class="loading-state">
			<div class="spinner"></div>
			<span>Loading connections...</span>
		</div>

		<div v-else-if="connections.length === 0" class="empty-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				<path d="M9 10h.01M15 10h.01M9.5 15.5S11 17 12 17s2.5-1.5 2.5-1.5" />
			</svg>
			<p>No connections yet</p>
			<button class="btn btn-primary btn-sm" @click="openAddModal">Add Connection</button>
		</div>

		<div v-else class="connection-list">
			<div
				v-for="conn in connections"
				:key="conn.id"
				class="connection-item"
				:class="{active: conn.id === activeConnectionId, connected: conn.id === activeConnectionId}"
				@click="connectTo(conn)"
			>
				<div class="connection-icon" :class="{connected: conn.id === activeConnectionId}">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<ellipse cx="12" cy="5" rx="9" ry="3" />
						<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
						<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
					</svg>
				</div>
				<div class="connection-info">
					<span class="connection-name">{{ conn.name }}</span>
					<span class="connection-host">{{ conn.host }}:{{ conn.port }}</span>
				</div>
				<div class="connection-actions">
					<button class="action-btn" @click.stop="testConn(conn)" title="Test Connection">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
					</button>
					<button class="action-btn" @click.stop="openEditModal(conn)" title="Edit">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
					</button>
					<button class="action-btn danger" @click.stop="confirmDelete(conn)" title="Delete">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
						</svg>
					</button>
				</div>
			</div>

			<button v-if="activeConnectionId" class="disconnect-btn" @click="disconnect">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18.36 6.64a9 9 0 11-12.73 0" />
					<line x1="12" y1="2" x2="12" y2="12" />
				</svg>
				Disconnect
			</button>
		</div>

		<!-- Add/Edit Modal -->
		<div v-if="showModal" class="modal-overlay" @click.self="closeModal">
			<div class="modal-content">
				<div class="modal-header">
					<h3>{{ editingConnection ? 'Edit Connection' : 'New Connection' }}</h3>
				</div>
				<form @submit.prevent="saveConnection">
					<div class="modal-body">
						<div class="form-group">
							<label>Connection Name</label>
							<input v-model="form.name" type="text" placeholder="My MongoDB Server" required />
						</div>

						<div class="form-row">
							<div class="form-group">
								<label>Host</label>
								<input v-model="form.host" type="text" placeholder="localhost" required />
							</div>
							<div class="form-group" style="max-width: 120px">
								<label>Port</label>
								<input v-model.number="form.port" type="number" placeholder="27017" required />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label>Username <span class="optional">(optional)</span></label>
								<input v-model="form.username" type="text" placeholder="Username" />
							</div>
							<div class="form-group">
								<label>Password <span class="optional">(optional)</span></label>
								<input v-model="form.password" type="password" placeholder="Password" />
							</div>
						</div>

						<div class="form-group">
							<label>Auth Database <span class="optional">(optional)</span></label>
							<input v-model="form.authDatabase" type="text" placeholder="admin" />
						</div>

						<div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
							<svg v-if="testResult.success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
								<polyline points="22 4 12 14.01 9 11.01" />
							</svg>
							<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10" />
								<line x1="15" y1="9" x2="9" y2="15" />
								<line x1="9" y1="9" x2="15" y2="15" />
							</svg>
							{{ testResult.message }}
						</div>
					</div>

					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" @click="testConnectionConfig" :disabled="testing">
							{{ testing ? 'Testing...' : 'Test Connection' }}
						</button>
						<div style="flex: 1"></div>
						<button type="button" class="btn btn-ghost" @click="closeModal">Cancel</button>
						<button type="submit" class="btn btn-primary" :disabled="saving">
							{{ saving ? 'Saving...' : 'Save' }}
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Confirm Delete Modal -->
		<div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
			<div class="modal-content" style="max-width: 400px">
				<div class="modal-header">
					<h3>Delete Connection</h3>
				</div>
				<div class="modal-body">
					<p>
						Are you sure you want to delete <strong>{{ deletingConnection?.name }}</strong
						>?
					</p>
					<p class="text-muted">This action cannot be undone.</p>
				</div>
				<div class="modal-footer">
					<button class="btn btn-ghost" @click="showDeleteModal = false">Cancel</button>
					<button class="btn btn-danger" @click="deleteConn" :disabled="deleting">
						{{ deleting ? 'Deleting...' : 'Delete' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {useAppStore} from '../stores/app.js'
import {useDialog} from '../composables/useDialog.js'

const dialog = useDialog()
const store = useAppStore()
const router = useRouter()

const showModal = ref(false)
const showDeleteModal = ref(false)
const editingConnection = ref(null)
const deletingConnection = ref(null)
const saving = ref(false)
const testing = ref(false)
const deleting = ref(false)
const testResult = ref(null)

const form = ref({
	name: '',
	host: '',
	port: 27017,
	username: '',
	password: '',
	authDatabase: 'admin'
})

const connections = computed(() => store.connections)
const activeConnectionId = computed(() => store.activeConnectionId)
const loading = computed(() => store.loading.connections)

onMounted(() => {
	store.fetchConnections()
})

function resetForm() {
	form.value = {
		name: '',
		host: '',
		port: 27017,
		username: '',
		password: '',
		authDatabase: 'admin'
	}
	testResult.value = null
	editingConnection.value = null
}

function openAddModal() {
	resetForm()
	showModal.value = true
}

function openEditModal(conn) {
	editingConnection.value = conn
	form.value = {
		name: conn.name,
		host: conn.host,
		port: conn.port,
		username: '',
		password: '',
		authDatabase: 'admin'
	}
	testResult.value = null
	showModal.value = true
}

function closeModal() {
	showModal.value = false
	resetForm()
}

async function connectTo(conn) {
	if (activeConnectionId.value === conn.id) return

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

		// Success - now switch to this connection
		store.activeConnectionId = conn.id
		store.databases = data.databases || []
		store.selectedDatabase = null
		store.selectedCollection = null
		store.collections = []
		store.documents = []
		store.indexes = []
		store.collectionStats = null
	} catch (error) {
		// Connection failed - keep current connection, just show error
		dialog.error(error.message || 'Failed to connect to database', 'Connection Error')
	} finally {
		store.loading.databases = false
	}
}

function disconnect() {
	store.disconnectFromServer()
	router.push('/')
}

async function testConn(conn) {
	try {
		const result = await store.testConnection(conn.id)
		if (result.success) {
			dialog.success(`Connected! MongoDB ${result.version}`)
		} else {
			dialog.error(result.message)
		}
	} catch (error) {
		dialog.error(`Test failed: ${error.message}`)
	}
}

async function testConnectionConfig() {
	testing.value = true
	testResult.value = null

	try {
		const result = await store.testNewConnection(form.value)
		testResult.value = result
	} catch (error) {
		testResult.value = {success: false, message: error.message}
	} finally {
		testing.value = false
	}
}

async function saveConnection() {
	saving.value = true

	try {
		if (editingConnection.value) {
			await store.updateConnection(editingConnection.value.id, form.value)
		} else {
			await store.createConnection(form.value)
		}
		closeModal()
	} catch (error) {
		dialog.error(`Failed to save: ${error.message}`)
	} finally {
		saving.value = false
	}
}

function confirmDelete(conn) {
	deletingConnection.value = conn
	showDeleteModal.value = true
}

async function deleteConn() {
	deleting.value = true

	try {
		await store.deleteConnection(deletingConnection.value.id)
		showDeleteModal.value = false
		deletingConnection.value = null
	} catch (error) {
		dialog.error(`Failed to delete: ${error.message}`)
	} finally {
		deleting.value = false
	}
}
</script>

<style scoped>
.connection-selector {
	padding: 1rem;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1rem;
}

.section-header h3 {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.75rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-secondary);
	margin: 0;
}

.section-header h3 svg {
	width: 16px;
	height: 16px;
}

.loading-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.75rem;
	padding: 2rem 1rem;
	text-align: center;
	color: var(--text-secondary);
}

.empty-state svg {
	width: 48px;
	height: 48px;
	opacity: 0.5;
}

.empty-state p {
	margin: 0;
	font-size: 0.875rem;
}

.spinner {
	width: 24px;
	height: 24px;
	border: 2px solid var(--border-color);
	border-top-color: var(--accent-color);
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.connection-list {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.connection-item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem;
	background: var(--bg-tertiary);
	border: 1px solid transparent;
	border-radius: var(--radius-md);
	cursor: pointer;
	transition: all 0.2s;
}

.connection-item:hover {
	border-color: var(--border-color);
}

.connection-item.active {
	background: rgba(16, 185, 129, 0.1);
	border-color: var(--accent-color);
}

.connection-icon {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--bg-secondary);
	border-radius: var(--radius-sm);
	color: var(--text-muted);
	transition: all 0.2s;
}

.connection-icon.connected {
	background: var(--accent-color);
	color: white;
}

.connection-icon svg {
	width: 18px;
	height: 18px;
}

.connection-info {
	flex: 1;
	min-width: 0;
}

.connection-name {
	display: block;
	font-weight: 500;
	font-size: 0.875rem;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.connection-host {
	display: block;
	font-size: 0.75rem;
	color: var(--text-muted);
}

.connection-actions {
	display: flex;
	gap: 0.25rem;
	opacity: 0;
	transition: opacity 0.2s;
}

.connection-item:hover .connection-actions {
	opacity: 1;
}

.action-btn {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--bg-secondary);
	border: none;
	border-radius: var(--radius-sm);
	color: var(--text-secondary);
	cursor: pointer;
	transition: all 0.2s;
}

.action-btn:hover {
	color: var(--text-primary);
	background: var(--border-color);
}

.action-btn.danger:hover {
	color: var(--danger-color);
	background: rgba(239, 68, 68, 0.1);
}

.action-btn svg {
	width: 14px;
	height: 14px;
}

.disconnect-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	width: 100%;
	padding: 0.625rem;
	margin-top: 0.5rem;
	background: var(--bg-tertiary);
	border: 1px solid var(--border-color);
	border-radius: var(--radius-md);
	color: var(--text-secondary);
	font-size: 0.75rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
}

.disconnect-btn:hover {
	color: var(--danger-color);
	border-color: var(--danger-color);
	background: rgba(239, 68, 68, 0.05);
}

.disconnect-btn svg {
	width: 14px;
	height: 14px;
}

.form-row {
	display: flex;
	gap: 1rem;
}

.form-row .form-group {
	flex: 1;
}

.optional {
	font-weight: 400;
	color: var(--text-muted);
}

.test-result {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border-radius: var(--radius-md);
	font-size: 0.875rem;
}

.test-result.success {
	background: rgba(16, 185, 129, 0.1);
	color: var(--accent-color);
}

.test-result.error {
	background: rgba(239, 68, 68, 0.1);
	color: var(--danger-color);
}

.test-result svg {
	width: 18px;
	height: 18px;
	flex-shrink: 0;
}

.text-muted {
	color: var(--text-muted);
	font-size: 0.875rem;
}
</style>
