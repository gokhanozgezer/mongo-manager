<template>
	<div class="collection-list">
		<div class="section-header">
			<h3>
				<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 3h18v18H3zM3 9h18M9 21V9" />
				</svg>
				{{ t('collections') }}
			</h3>
			<button class="btn-add" @click="showCreateModal = true" :disabled="!hasDatabase" :title="t('createCollection')">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</button>
		</div>

		<div v-if="!hasDatabase" class="empty-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<ellipse cx="12" cy="5" rx="9" ry="3" />
				<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
				<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
			</svg>
			<span>{{ t('selectDatabase') }}</span>
		</div>

		<div v-else-if="loading" class="loading-state">
			<div class="spinner"></div>
			<span>{{ t('loadingCollections') }}</span>
		</div>

		<div v-else-if="collections.length === 0" class="empty-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M3 3h18v18H3zM3 9h18M9 21V9" />
			</svg>
			<span>{{ t('noCollections') }}</span>
		</div>

		<ul v-else class="coll-list">
			<li v-for="coll in collections" :key="coll.name" :class="{active: coll.name === selectedCollection}" @click="selectColl(coll)">
				<div class="coll-info">
					<svg class="coll-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 3h18v18H3zM3 9h18M9 21V9" />
					</svg>
					<div class="coll-details">
						<span class="coll-name">{{ coll.name }}</span>
						<span class="coll-meta">
							<span class="coll-count">{{ formatCount(coll.count) }} docs</span>
							<span v-if="coll.size" class="coll-size">{{ formatSize(coll.size) }}</span>
						</span>
					</div>
				</div>
				<button class="btn-delete" @click.stop="confirmDrop(coll)" :title="t('dropCollection')">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3,6 5,6 21,6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
				</button>
			</li>
		</ul>

		<!-- Create Collection Modal -->
		<div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
			<div class="modal-content">
				<div class="modal-header">
					<h3>{{ t('createCollection') }}</h3>
					<button class="btn-close" @click="closeModal">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
				<form @submit.prevent="createColl">
					<div class="form-group">
						<label for="collName">{{ t('collectionName') }} <span class="required">*</span></label>
						<input id="collName" v-model="newCollName" type="text" placeholder="my_collection" required />
					</div>

					<div class="form-group checkbox-group">
						<label class="checkbox-label">
							<input type="checkbox" v-model="isCapped" />
							<span class="checkmark"></span>
							{{ t('capped') }}
						</label>
					</div>

					<div v-if="isCapped" class="form-row">
						<div class="form-group">
							<label for="cappedSize">{{ t('cappedSize') }}</label>
							<input id="cappedSize" v-model.number="cappedSize" type="number" placeholder="1048576" />
						</div>
						<div class="form-group">
							<label for="cappedMax">{{ t('maxDocuments') }}</label>
							<input id="cappedMax" v-model.number="cappedMax" type="number" :placeholder="'(' + t('optional') + ')'" />
						</div>
					</div>

					<div class="modal-actions">
						<button type="button" class="btn btn-secondary" @click="closeModal">{{ t('cancel') }}</button>
						<button type="submit" class="btn btn-primary" :disabled="creating">
							<span v-if="creating" class="spinner-sm"></span>
							{{ creating ? t('loading') : t('createCollection') }}
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
import {useRouter} from 'vue-router'
import {useDialog} from '../composables/useDialog.js'
import {useI18n} from 'vue-i18n'
import ConfirmDialog from './ConfirmDialog.vue'

const {t} = useI18n()
const dialog = useDialog()
const store = useAppStore()
const router = useRouter()
const confirmDialog = ref(null)

const showCreateModal = ref(false)
const newCollName = ref('')
const isCapped = ref(false)
const cappedSize = ref(1048576)
const cappedMax = ref(null)
const creating = ref(false)

const hasDatabase = computed(() => store.selectedDatabase !== null)
const collections = computed(() => {
	return [...store.collections].sort((a, b) => a.name.localeCompare(b.name))
})
const selectedCollection = computed(() => store.selectedCollection)
const loading = computed(() => store.loading.collections)

function selectColl(coll) {
	store.selectCollection(coll.name)
	router.push({
		name: 'collection',
		params: {
			connectionId: store.activeConnectionId,
			database: store.selectedDatabase,
			collection: coll.name
		}
	})
}

function formatCount(count) {
	if (count === undefined || count === null) return '0'
	if (count >= 1000000) {
		return (count / 1000000).toFixed(1) + 'M'
	}
	if (count >= 1000) {
		return (count / 1000).toFixed(1) + 'K'
	}
	return count.toString()
}

function formatSize(bytes) {
	if (!bytes) return ''
	const units = ['B', 'KB', 'MB', 'GB']
	let unitIndex = 0
	let size = bytes
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024
		unitIndex++
	}
	return size.toFixed(unitIndex > 0 ? 1 : 0) + ' ' + units[unitIndex]
}

function closeModal() {
	showCreateModal.value = false
	newCollName.value = ''
	isCapped.value = false
	cappedSize.value = 1048576
	cappedMax.value = null
}

async function createColl() {
	creating.value = true
	try {
		const options = {}
		if (isCapped.value) {
			options.capped = true
			options.size = cappedSize.value
			if (cappedMax.value) {
				options.max = cappedMax.value
			}
		}

		await store.createCollection(newCollName.value, options)
		closeModal()
	} catch (error) {
		dialog.error(`Failed to create collection: ${error.message}`)
	} finally {
		creating.value = false
	}
}

async function confirmDrop(coll) {
	const confirmed = await dialog.confirm({
		title: 'Drop Collection',
		message: `Are you sure you want to drop "${coll.name}"? This action cannot be undone.`,
		type: 'error',
		confirmText: 'Drop Collection',
		cancelText: 'Cancel'
	})

	if (confirmed) {
		try {
			await store.dropCollection(coll.name)
		} catch (error) {
			dialog.error(`Failed to drop collection: ${error.message}`)
		}
	}
}
</script>

<style scoped>
.collection-list {
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

.coll-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.coll-list li {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0.625rem 0.75rem;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s;
	background: transparent;
}

.coll-list li:hover {
	background: var(--hover-bg);
}

.coll-list li.active {
	background: var(--active-item-bg);
}

.coll-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-width: 0;
}

.coll-icon {
	width: 18px;
	height: 18px;
	flex-shrink: 0;
	color: #8b5cf6;
}

.coll-details {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.coll-name {
	font-weight: 500;
	font-size: 0.875rem;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.coll-meta {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.7rem;
	color: var(--text-secondary);
}

.coll-count {
	color: var(--primary-color);
	font-weight: 500;
}

.coll-size {
	opacity: 0.8;
}

.coll-size::before {
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

.coll-list li:hover .btn-delete {
	opacity: 1;
}

.btn-delete:hover {
	background: rgba(239, 68, 68, 0.1);
	color: #ef4444;
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

.form-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 1rem;
}

.checkbox-group {
	margin-bottom: 1rem;
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
