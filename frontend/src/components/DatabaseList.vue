<template>
	<div class="database-list">
		<div class="section-header">
			<h3>
				<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<ellipse cx="12" cy="5" rx="9" ry="3" />
					<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
					<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
				</svg>
				{{ t('databases') }}
			</h3>
			<button class="btn-add" @click="showCreateModal = true" :disabled="!hasConnection" :title="t('createDatabase')">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</button>
		</div>

		<div v-if="!hasConnection" class="empty-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</svg>
			<span>{{ t('selectAConnection') }}</span>
		</div>

		<div v-else-if="loading" class="loading-state">
			<div class="spinner"></div>
			<span>{{ t('loadingDatabases') }}</span>
		</div>

		<div v-else-if="databases.length === 0" class="empty-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<ellipse cx="12" cy="5" rx="9" ry="3" />
				<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
				<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
			</svg>
			<span>{{ t('noDatabases') }}</span>
		</div>

		<ul v-else class="db-list">
			<li v-for="db in databases" :key="db.name" :class="{active: db.name === selectedDatabase}" @click="selectDb(db)">
				<div class="db-info">
					<svg class="db-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<ellipse cx="12" cy="5" rx="9" ry="3" />
						<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
						<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
					</svg>
					<div class="db-details">
						<span class="db-name">{{ db.name }}</span>
						<span class="db-meta">
							<span class="db-collections">{{ db.collectionCount || 0 }} colls</span>
							<span class="db-size">{{ formatSize(db.sizeOnDisk) }}</span>
						</span>
					</div>
				</div>
				<button
					class="btn-delete"
					@click.stop="confirmDrop(db)"
					:disabled="isSystemDb(db.name)"
					:title="isSystemDb(db.name) ? 'Cannot drop system database' : 'Drop database'"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3,6 5,6 21,6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
				</button>
			</li>
		</ul>

		<!-- Create Database Modal -->
		<div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
			<div class="modal-content">
				<div class="modal-header">
					<h3>{{ t('createDatabase') }}</h3>
					<button class="btn-close" @click="closeModal">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>

				<!-- Tabs -->
				<div class="modal-tabs">
					<button type="button" :class="['tab-btn', {active: createMode === 'manual'}]" @click="createMode = 'manual'">
						{{ t('manual') }}
					</button>
					<button type="button" :class="['tab-btn', {active: createMode === 'restore'}]" @click="createMode = 'restore'">
						{{ t('fromBackup') }}
					</button>
				</div>

				<!-- Manual Mode -->
				<form v-if="createMode === 'manual'" @submit.prevent="createDb">
					<div class="form-group">
						<label for="dbName">{{ t('databaseName') }} <span class="required">*</span></label>
						<input id="dbName" v-model="newDbName" type="text" placeholder="my_database" required pattern="[a-zA-Z_][a-zA-Z0-9_]*" />
					</div>
					<div class="form-group">
						<label for="initialCollection">{{ t('initialCollection') }}</label>
						<input id="initialCollection" v-model="initialCollection" type="text" :placeholder="'(' + t('optional') + ')'" />
					</div>
					<div class="modal-actions">
						<button type="button" class="btn btn-secondary" @click="closeModal">{{ t('cancel') }}</button>
						<button type="submit" class="btn btn-primary" :disabled="creating">
							<span v-if="creating" class="spinner-sm"></span>
							{{ creating ? t('loading') : t('createDatabase') }}
						</button>
					</div>
				</form>

				<!-- Restore Mode -->
				<form v-else @submit.prevent="createDbFromBackup">
					<div class="form-group">
						<label for="restoreDbName">{{ t('databaseName') }} <span class="required">*</span></label>
						<input id="restoreDbName" v-model="restoreDbName" type="text" placeholder="my_database" required />
					</div>
					<div class="form-group">
						<label for="backupFile">{{ t('backupFile') }} <span class="required">*</span></label>
						<input id="backupFile" type="file" ref="restoreFileInput" @change="handleRestoreFile" accept=".tar.gz,.tgz,.json" />
						<small>{{ t('backupFileHint') }}</small>
					</div>
					<div class="modal-actions">
						<button type="button" class="btn btn-secondary" @click="closeModal">{{ t('cancel') }}</button>
						<button type="submit" class="btn btn-primary" :disabled="!restoreFile || restoring">
							<span v-if="restoring" class="spinner-sm"></span>
							{{ restoring ? t('restoring') : t('restoreDatabase') }}
						</button>
					</div>
				</form>
			</div>
		</div>

		<ConfirmDialog ref="confirmDialog" />
	</div>
</template>

<script setup>
import {ref, computed} from 'vue'
import {useAppStore} from '../stores/app.js'
import {useDialog} from '../composables/useDialog.js'
import {useI18n} from 'vue-i18n'
import ConfirmDialog from './ConfirmDialog.vue'

const {t} = useI18n()
const dialog = useDialog()
const store = useAppStore()
const confirmDialog = ref(null)

const showCreateModal = ref(false)
const newDbName = ref('')
const initialCollection = ref('')
const creating = ref(false)
const createMode = ref('manual')
const restoreDbName = ref('')
const restoreFile = ref(null)
const restoreFileInput = ref(null)
const restoring = ref(false)

const hasConnection = computed(() => store.hasActiveConnection)
const databases = computed(() => {
	return [...store.databases].sort((a, b) => a.name.localeCompare(b.name))
})
const selectedDatabase = computed(() => store.selectedDatabase)
const loading = computed(() => store.loading.databases)

const systemDbs = ['admin', 'local', 'config']

function isSystemDb(name) {
	return systemDbs.includes(name)
}

function formatSize(bytes) {
	if (!bytes || bytes === 0) return '0 B'
	const units = ['B', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function selectDb(db) {
	store.selectDatabase(db.name)
	store.fetchCollections()
}

function closeModal() {
	showCreateModal.value = false
	newDbName.value = ''
	initialCollection.value = ''
	createMode.value = 'manual'
	restoreDbName.value = ''
	restoreFile.value = null
	if (restoreFileInput.value) {
		restoreFileInput.value.value = ''
	}
}

function handleRestoreFile(e) {
	restoreFile.value = e.target.files[0]
	if (restoreFile.value && !restoreDbName.value) {
		let name = restoreFile.value.name
		name = name.replace(/\.(tar\.gz|tgz|json)$/i, '')
		name = name.replace(/-\d{4}-\d{2}-\d{2}T[\d-]+$/, '')
		restoreDbName.value = name
	}
}

async function createDbFromBackup() {
	if (!restoreFile.value || !restoreDbName.value) return

	restoring.value = true
	try {
		const formData = new FormData()
		formData.append('file', restoreFile.value)

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
		closeModal()
		await store.fetchDatabases()
	} catch (error) {
		dialog.error('Restore failed: ' + error.message)
	} finally {
		restoring.value = false
	}
}

async function createDb() {
	creating.value = true
	try {
		await store.createDatabase(newDbName.value, initialCollection.value || 'init')
		closeModal()
	} catch (error) {
		dialog.error(`Failed to create database: ${error.message}`)
	} finally {
		creating.value = false
	}
}

async function confirmDrop(db) {
	if (isSystemDb(db.name)) return

	const confirmed = await dialog.confirm({
		title: 'Drop Database',
		message: `Are you sure you want to drop "${db.name}"? This action cannot be undone.`,
		type: 'error',
		confirmText: 'Drop Database',
		cancelText: 'Cancel'
	})

	if (confirmed) {
		try {
			await store.dropDatabase(db.name)
		} catch (error) {
			dialog.error(`Failed to drop database: ${error.message}`)
		}
	}
}
</script>

<style scoped>
.database-list {
	padding: 1rem;
	border-top: 1px solid var(--border-color);
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 0.75rem;
}

.section-header h3 {
	margin: 0;
	font-size: 0.75rem;
	font-weight: 600;
	color: var(--text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.section-icon {
	width: 14px;
	height: 14px;
	opacity: 0.7;
}

.btn-add {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: 1px solid var(--border-color);
	border-radius: 6px;
	color: var(--text-secondary);
	cursor: pointer;
	transition: all 0.2s;
}

.btn-add:hover:not(:disabled) {
	background: var(--primary-color);
	border-color: var(--primary-color);
	color: white;
}

.btn-add:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.btn-add svg {
	width: 14px;
	height: 14px;
}

.db-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.db-list li {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0.625rem 0.75rem;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s;
	background: transparent;
}

.db-list li:hover {
	background: var(--hover-bg);
}

.db-list li.active {
	background: var(--active-item-bg);
}

.db-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-width: 0;
}

.db-icon {
	width: 18px;
	height: 18px;
	flex-shrink: 0;
	color: var(--primary-color);
}

.db-details {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.db-name {
	font-weight: 500;
	font-size: 0.875rem;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.db-meta {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.7rem;
	color: var(--text-secondary);
}

.db-collections {
	color: var(--primary-color);
	font-weight: 500;
}

.db-size {
	opacity: 0.8;
}

.db-size::before {
	content: '•';
	margin-right: 0.5rem;
	opacity: 0.5;
}

.btn-delete {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	border-radius: 6px;
	color: var(--text-secondary);
	cursor: pointer;
	opacity: 0;
	transition: all 0.2s;
}

.db-list li:hover .btn-delete {
	opacity: 1;
}

.btn-delete:hover:not(:disabled) {
	background: rgba(239, 68, 68, 0.1);
	color: #ef4444;
}

.btn-delete:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

.btn-delete svg {
	width: 14px;
	height: 14px;
}

/* Empty & Loading States */
.empty-state,
.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 2rem 1rem;
	color: var(--text-secondary);
	text-align: center;
	gap: 0.5rem;
}

.empty-state svg,
.loading-state svg {
	width: 32px;
	height: 32px;
	opacity: 0.4;
}

.empty-state span,
.loading-state span {
	font-size: 0.8rem;
}

.spinner {
	width: 24px;
	height: 24px;
	border: 2px solid var(--border-color);
	border-top-color: var(--primary-color);
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

.spinner-sm {
	width: 14px;
	height: 14px;
	border: 2px solid rgba(255, 255, 255, 0.3);
	border-top-color: white;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
	display: inline-block;
	margin-right: 0.5rem;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

/* Modal Styles */
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
	backdrop-filter: blur(4px);
}

.modal-content {
	background: var(--bg-secondary);
	border-radius: 12px;
	padding: 1.5rem;
	width: 100%;
	max-width: 420px;
	box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
	border: 1px solid var(--border-color);
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.5rem;
}

.modal-header h3 {
	margin: 0;
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--text-primary);
}

.modal-tabs {
	display: flex;
	margin-bottom: 1.25rem;
	border-bottom: 1px solid var(--border-color);
}

.tab-btn {
	flex: 1;
	padding: 0.75rem 1rem;
	border: none;
	background: transparent;
	color: var(--text-secondary);
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
}

.tab-btn:hover {
	color: var(--text-primary);
}

.tab-btn.active {
	color: var(--primary-color);
	border-bottom-color: var(--primary-color);
}

.btn-close {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	border-radius: 8px;
	color: var(--text-secondary);
	cursor: pointer;
	transition: all 0.2s;
}

.btn-close:hover {
	background: var(--hover-bg);
	color: var(--text-primary);
}

.btn-close svg {
	width: 18px;
	height: 18px;
}

.form-group {
	margin-bottom: 1.25rem;
}

.form-group label {
	display: block;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--text-primary);
	margin-bottom: 0.5rem;
}

.form-group label .required {
	color: #ef4444;
}

.form-group input {
	width: 100%;
	padding: 0.75rem 1rem;
	font-size: 0.875rem;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	background: var(--input-bg);
	color: var(--text-primary);
	transition: all 0.2s;
}

.form-group input:focus {
	outline: none;
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.form-group input::placeholder {
	color: var(--text-secondary);
}

.form-group small {
	display: block;
	color: var(--text-secondary);
	font-size: 0.75rem;
	margin-top: 0.375rem;
}

.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 0.75rem;
	margin-top: 1.5rem;
}

.btn {
	padding: 0.625rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.btn-primary {
	background: var(--primary-color);
	border: none;
	color: white;
}

.btn-primary:hover:not(:disabled) {
	background: var(--primary-hover);
}

.btn-primary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-secondary {
	background: transparent;
	border: 1px solid var(--border-color);
	color: var(--text-primary);
}

.btn-secondary:hover {
	background: var(--hover-bg);
}
</style>
