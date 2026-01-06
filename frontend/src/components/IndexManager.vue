<template>
	<div class="index-manager">
		<div class="section-header">
			<h3>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 3h18v18H3zM3 9h18M9 21V9" />
				</svg>
				Indexes
			</h3>
			<button class="btn btn-primary btn-sm" @click="showCreateModal = true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				Create Index
			</button>
		</div>

		<div v-if="loading" class="loading-state">
			<div class="spinner"></div>
			<span>Loading indexes...</span>
		</div>

		<div v-else-if="indexes.length === 0" class="empty-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M3 3h18v18H3zM3 9h18M9 21V9" />
			</svg>
			<span>No indexes found</span>
		</div>

		<div v-else class="index-list">
			<div v-for="index in indexes" :key="index.name" class="index-card">
				<div class="index-header">
					<div class="index-info">
						<span class="index-name">{{ index.name }}</span>
						<div class="index-badges">
							<span v-if="index.unique" class="badge badge-blue">Unique</span>
							<span v-if="index.sparse" class="badge badge-purple">Sparse</span>
							<span v-if="index.expireAfterSeconds" class="badge badge-yellow"> TTL: {{ index.expireAfterSeconds }}s </span>
							<span v-if="index.name === '_id_'" class="badge badge-gray">Default</span>
						</div>
					</div>
					<button
						class="btn btn-danger btn-sm"
						@click="confirmDropIndex(index)"
						:disabled="index.name === '_id_' || deletingIndex !== null"
						:title="index.name === '_id_' ? 'Cannot drop _id index' : 'Drop index'"
					>
						<template v-if="deletingIndex === index.name">
							<span class="spinner-sm"></span>
							Deleting...
						</template>
						<template v-else>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="3,6 5,6 21,6" />
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
							</svg>
							Drop
						</template>
					</button>
				</div>
				<div class="index-keys">
					<label>Keys:</label>
					<code>{{ formatKeys(index.key) }}</code>
				</div>
			</div>
		</div>

		<!-- Create Index Modal -->
		<div v-if="showCreateModal" class="modal-overlay" @keydown.esc="closeModal" tabindex="0" ref="createModal">
			<div class="modal-content">
				<div class="modal-header">
					<h3>Create Index</h3>
					<button class="btn-close" @click="closeModal">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
				<form @submit.prevent="createIdx">
					<div class="form-group">
						<label for="indexName">Index Name (optional)</label>
						<input id="indexName" v-model="form.name" type="text" placeholder="Auto-generated if empty" />
					</div>

					<div class="form-group">
						<label>Keys <span class="required">*</span></label>
						<JsonEditor ref="keysEditor" v-model="form.keys" :rows="4" placeholder='{ "field": 1, "otherField": -1 }' />
						<small>Use 1 for ascending, -1 for descending, "text" for text index</small>
					</div>

					<div class="form-group options-group">
						<label class="checkbox-label">
							<input type="checkbox" v-model="form.unique" />
							Unique
						</label>
						<label class="checkbox-label">
							<input type="checkbox" v-model="form.sparse" />
							Sparse
						</label>
						<label class="checkbox-label">
							<input type="checkbox" v-model="form.background" />
							Background
						</label>
					</div>

					<div class="form-group">
						<label class="checkbox-label">
							<input type="checkbox" v-model="hasTTL" />
							TTL Index
						</label>
						<input v-if="hasTTL" v-model.number="form.expireAfterSeconds" type="number" placeholder="Expire after seconds" class="ttl-input" />
					</div>

					<div v-if="createError" class="error-message">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						{{ createError }}
					</div>

					<div class="modal-actions">
						<button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
						<button type="submit" class="btn btn-primary" :disabled="creating">
							<span v-if="creating" class="spinner-sm"></span>
							{{ creating ? 'Creating...' : 'Create Index' }}
						</button>
					</div>
				</form>
			</div>
		</div>

		<ConfirmDialog ref="confirmDialog" />
	</div>
</template>

<script setup>
import {ref, computed, onMounted, watch, nextTick} from 'vue'
import {useAppStore} from '../stores/app.js'
import {useDialog} from '../composables/useDialog.js'
import JsonEditor from './JsonEditor.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const dialog = useDialog()
const store = useAppStore()
const confirmDialog = ref(null)
const keysEditor = ref(null)

const showCreateModal = ref(false)
const createModal = ref(null)

watch(showCreateModal, newVal => {
	if (newVal) {
		nextTick(() => {
			createModal.value?.focus()
		})
	}
})

const creating = ref(false)
const createError = ref('')
const hasTTL = ref(false)
const deletingIndex = ref(null)

const form = ref({
	name: '',
	keys: '{ "fieldName": 1 }',
	unique: false,
	sparse: false,
	background: false,
	expireAfterSeconds: 0
})

const indexes = computed(() => store.indexes)
const loading = computed(() => store.loading.indexes)

onMounted(() => {
	store.fetchIndexes()
})

function formatKeys(keys) {
	return JSON.stringify(keys)
}

function resetForm() {
	form.value = {
		name: '',
		keys: '{ "fieldName": 1 }',
		unique: false,
		sparse: false,
		background: false,
		expireAfterSeconds: 0
	}
	hasTTL.value = false
	createError.value = ''
}

function closeModal() {
	showCreateModal.value = false
	resetForm()
}

async function createIdx() {
	createError.value = ''

	// Validate keys JSON
	if (!keysEditor.value?.isValid()) {
		createError.value = 'Invalid JSON for keys'
		return
	}

	const keys = keysEditor.value?.getParsedValue()
	if (!keys || Object.keys(keys).length === 0) {
		createError.value = 'At least one key is required'
		return
	}

	creating.value = true

	try {
		const options = {}

		if (form.value.name) {
			options.name = form.value.name
		}
		if (form.value.unique) {
			options.unique = true
		}
		if (form.value.sparse) {
			options.sparse = true
		}
		if (form.value.background) {
			options.background = true
		}
		if (hasTTL.value && form.value.expireAfterSeconds > 0) {
			options.expireAfterSeconds = form.value.expireAfterSeconds
		}

		await store.createIndex(keys, options)
		closeModal()
	} catch (error) {
		createError.value = error.message
	} finally {
		creating.value = false
	}
}

async function confirmDropIndex(index) {
	if (index.name === '_id_' || deletingIndex.value !== null) return

	const confirmed = await dialog.confirm({
		title: 'Drop Index',
		message: `Are you sure you want to drop the index "${index.name}"?`,
		type: 'warning',
		confirmText: 'Drop Index',
		cancelText: 'Cancel'
	})

	if (confirmed) {
		deletingIndex.value = index.name
		try {
			await store.dropIndex(index.name)
		} catch (error) {
			dialog.error(`Failed to drop index: ${error.message}`)
		} finally {
			deletingIndex.value = null
		}
	}
}
</script>

<style scoped>
.index-manager {
	padding: 1.5rem;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.25rem;
}

.section-header h3 {
	margin: 0;
	font-size: 1rem;
	font-weight: 600;
	color: var(--text-primary);
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.section-header h3 svg {
	width: 18px;
	height: 18px;
	color: var(--primary-color);
}

.index-list {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.index-card {
	padding: 1rem 1.25rem;
	border: 1px solid var(--border-color);
	border-radius: 10px;
	background: var(--card-bg);
	transition: all 0.2s;
}

.index-card:hover {
	border-color: var(--primary-color);
	box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
}

.index-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 0.75rem;
}

.index-info {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.index-name {
	font-weight: 600;
	font-size: 0.9375rem;
	color: var(--text-primary);
}

.index-badges {
	display: flex;
	gap: 0.375rem;
	flex-wrap: wrap;
}

.badge {
	padding: 0.125rem 0.5rem;
	font-size: 0.6875rem;
	font-weight: 500;
	text-transform: uppercase;
	border-radius: 4px;
	letter-spacing: 0.025em;
}

.badge-blue {
	background: rgba(59, 130, 246, 0.1);
	color: #3b82f6;
}

.badge-purple {
	background: rgba(139, 92, 246, 0.1);
	color: #8b5cf6;
}

.badge-yellow {
	background: rgba(245, 158, 11, 0.1);
	color: #f59e0b;
}

.badge-gray {
	background: var(--hover-bg);
	color: var(--text-secondary);
}

.index-keys {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.index-keys label {
	font-size: 0.75rem;
	color: var(--text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.index-keys code {
	font-size: 0.75rem;
	font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
	color: var(--text-secondary);
	background: var(--hover-bg);
	padding: 0.25rem 0.625rem;
	border-radius: 4px;
}

/* States */
.loading-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 3rem 2rem;
	color: var(--text-secondary);
	text-align: center;
	gap: 0.75rem;
}

.loading-state svg,
.empty-state svg {
	width: 40px;
	height: 40px;
	opacity: 0.4;
}

.loading-state span,
.empty-state span {
	font-size: 0.875rem;
}

.spinner {
	width: 28px;
	height: 28px;
	border: 3px solid var(--border-color);
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
	backdrop-filter: blur(4px);
}

.modal-content {
	background: var(--card-bg);
	border-radius: 16px;
	padding: 1.5rem;
	width: 100%;
	max-width: 480px;
	box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
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

/* Form */
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

.form-group input[type='text'],
.form-group input[type='number'] {
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

.options-group {
	display: flex;
	gap: 1.25rem;
	flex-wrap: wrap;
}

.checkbox-label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	cursor: pointer;
	font-size: 0.875rem;
	color: var(--text-primary);
}

.checkbox-label input[type='checkbox'] {
	width: 18px;
	height: 18px;
	accent-color: var(--primary-color);
	cursor: pointer;
}

.ttl-input {
	margin-top: 0.75rem;
}

.error-message {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	background: rgba(239, 68, 68, 0.1);
	border: 1px solid rgba(239, 68, 68, 0.2);
	border-radius: 8px;
	color: #ef4444;
	font-size: 0.875rem;
	margin-bottom: 1rem;
}

.error-message svg {
	width: 18px;
	height: 18px;
	flex-shrink: 0;
}

.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 0.75rem;
	margin-top: 1.5rem;
}

/* Buttons */
.btn {
	padding: 0.5rem 1rem;
	font-size: 0.8125rem;
	font-weight: 500;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s;
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
}

.btn svg {
	width: 14px;
	height: 14px;
}

.btn-sm {
	padding: 0.375rem 0.75rem;
	font-size: 0.75rem;
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

.btn-danger {
	background: transparent;
	border: 1px solid #ef4444;
	color: #ef4444;
}

.btn-danger:hover:not(:disabled) {
	background: #ef4444;
	color: white;
}

.btn-danger:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}
</style>
