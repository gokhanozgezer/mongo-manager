<template>
	<div class="document-table">
		<!-- Filter Controls -->
		<div class="filter-card">
			<div class="filter-row">
				<div class="filter-group">
					<label>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
						</svg>
						Filter (JSON)
					</label>
					<input v-model="localFilter" type="text" placeholder='{ "field": "value" }' @keyup.enter="applyFilter" />
				</div>
				<div class="filter-group">
					<label>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="4" y1="9" x2="20" y2="9" />
							<line x1="4" y1="15" x2="20" y2="15" />
							<line x1="10" y1="3" x2="8" y2="21" />
							<line x1="16" y1="3" x2="14" y2="21" />
						</svg>
						Sort (JSON)
					</label>
					<input v-model="localSort" type="text" placeholder='{ "createdAt": -1 }' @keyup.enter="applyFilter" />
				</div>
				<div class="filter-actions">
					<button class="btn btn-primary" @click="applyFilter">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						Apply
					</button>
					<button class="btn btn-secondary" @click="clearFilter">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
						Clear
					</button>
				</div>
			</div>
		</div>

		<!-- Actions Bar -->
		<div class="actions-bar">
			<div class="actions-left">
				<button class="btn btn-primary" @click="$emit('insert')">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					Insert Document
				</button>
				<button class="btn btn-danger" :disabled="selectedIds.length === 0" @click="confirmDeleteSelected">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3,6 5,6 21,6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
					Delete ({{ selectedIds.length }})
				</button>
			</div>
			<button class="btn btn-secondary" @click="refresh">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="23 4 23 10 17 10" />
					<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
				</svg>
				Refresh
			</button>
		</div>

		<!-- Loading State -->
		<div v-if="loading" class="loading-state">
			<div class="spinner"></div>
			<span>Loading documents...</span>
		</div>

		<!-- Empty State -->
		<div v-else-if="documents.length === 0" class="empty-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="12" y1="18" x2="12" y2="12" />
				<line x1="9" y1="15" x2="15" y2="15" />
			</svg>
			<span>No documents found</span>
			<button class="btn btn-primary btn-sm" @click="$emit('insert')">Insert First Document</button>
		</div>

		<!-- Documents List -->
		<div v-else class="documents-list">
			<div v-for="(doc, index) in documents" :key="getDocId(doc)" class="document-card" :class="{selected: isSelected(doc)}">
				<!-- Document Header -->
				<div class="document-header">
					<div class="document-select">
						<input type="checkbox" :checked="isSelected(doc)" @change="toggleSelect(doc)" />
					</div>
					<div class="document-index">#{{ getDocIndex(index) }}</div>
					<div class="document-id">
						<span class="id-label">_id:</span>
						<code>{{ getDocIdDisplay(doc) }}</code>
					</div>
					<div class="document-actions">
						<button class="action-link" @click="$emit('edit', doc)">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
							</svg>
							Update
						</button>
						<span class="action-divider">|</span>
						<button class="action-link danger" @click="confirmDelete(doc)">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="3,6 5,6 21,6" />
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
							</svg>
							Delete
						</button>
						<span class="action-divider">|</span>
						<button class="action-link" @click="toggleExpand(doc)">
							<svg v-if="isExpanded(doc)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="18 15 12 9 6 15" />
							</svg>
							<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="6 9 12 15 18 9" />
							</svg>
							{{ isExpanded(doc) ? 'Collapse' : 'Expand' }}
						</button>
					</div>
				</div>

				<!-- Document Content -->
				<div class="document-content" :class="{collapsed: !isExpanded(doc)}" @dblclick="toggleExpand(doc)">
					<div class="json-formatted" v-html="formatJson(doc)"></div>
				</div>
			</div>
		</div>

		<!-- Pagination -->
		<Pagination
			v-if="pagination.totalCount > 0"
			:page="pagination.page"
			:page-size="pagination.pageSize"
			:total-count="pagination.totalCount"
			:total-pages="pagination.totalPages"
			@page-change="changePage"
			@page-size-change="changePageSize"
		/>

		<ConfirmDialog ref="confirmDialog" />
	</div>
</template>

<script setup>
import {ref, computed, watch} from 'vue'
import {useAppStore} from '../stores/app.js'
import {useDialog} from '../composables/useDialog.js'
import Pagination from './Pagination.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const dialog = useDialog()
const store = useAppStore()
const confirmDialog = ref(null)

const localFilter = ref('{}')
const localSort = ref('{}')
const selectedIds = ref([])
const expandedIds = ref(new Set())

const documents = computed(() => store.documents)
const pagination = computed(() => store.documentsPagination)
const loading = computed(() => store.loading.documents)

const allSelected = computed(() => {
	if (documents.value.length === 0) return false
	return documents.value.every(doc => isSelected(doc))
})

// Reset selection when documents change
watch(documents, () => {
	selectedIds.value = []
	// All documents collapsed by default
	expandedIds.value = new Set()
})

function getDocId(doc) {
	if (doc._id && doc._id.$oid) {
		return doc._id.$oid
	}
	return String(doc._id)
}

function getDocIndex(index) {
	return (pagination.value.page - 1) * pagination.value.pageSize + index + 1
}

function getDocIdDisplay(doc) {
	const id = getDocId(doc)
	return id
}

function isSelected(doc) {
	return selectedIds.value.includes(getDocId(doc))
}

function isExpanded(doc) {
	return expandedIds.value.has(getDocId(doc))
}

function toggleExpand(doc) {
	const id = getDocId(doc)
	if (expandedIds.value.has(id)) {
		expandedIds.value.delete(id)
	} else {
		expandedIds.value.add(id)
	}
	// Force reactivity
	expandedIds.value = new Set(expandedIds.value)
}

function toggleSelect(doc) {
	const id = getDocId(doc)
	const index = selectedIds.value.indexOf(id)
	if (index === -1) {
		selectedIds.value.push(id)
	} else {
		selectedIds.value.splice(index, 1)
	}
}

function toggleSelectAll() {
	if (allSelected.value) {
		selectedIds.value = []
	} else {
		selectedIds.value = documents.value.map(doc => getDocId(doc))
	}
}

// Format JSON with syntax highlighting
function formatJson(obj, indent = 0) {
	const spaces = '&nbsp;'.repeat(indent * 2)
	let html = ''

	if (Array.isArray(obj)) {
		if (obj.length === 0) {
			return '<span class="json-bracket">[</span><span class="json-bracket">]</span>'
		}
		html += '<span class="json-bracket">[</span><br>'
		obj.forEach((item, i) => {
			html += spaces + '&nbsp;&nbsp;' + formatJson(item, indent + 1)
			if (i < obj.length - 1) html += '<span class="json-comma">,</span>'
			html += '<br>'
		})
		html += spaces + '<span class="json-bracket">]</span>'
	} else if (obj !== null && typeof obj === 'object') {
		// Handle special MongoDB types
		if (obj.$oid) {
			return `<span class="json-type">ObjectId</span><span class="json-paren">(</span><span class="json-string">"${obj.$oid}"</span><span class="json-paren">)</span>`
		}
		if (obj.$date) {
			const date = new Date(obj.$date)
			return `<span class="json-type">ISODate</span><span class="json-paren">(</span><span class="json-string">"${date.toISOString()}"</span><span class="json-paren">)</span>`
		}
		if (obj.$numberLong) {
			return `<span class="json-type">NumberLong</span><span class="json-paren">(</span><span class="json-number">${obj.$numberLong}</span><span class="json-paren">)</span>`
		}
		if (obj.$numberInt) {
			return `<span class="json-type">NumberInt</span><span class="json-paren">(</span><span class="json-number">${obj.$numberInt}</span><span class="json-paren">)</span>`
		}
		if (obj.$numberDouble) {
			return `<span class="json-type">NumberDouble</span><span class="json-paren">(</span><span class="json-number">${obj.$numberDouble}</span><span class="json-paren">)</span>`
		}
		if (obj.$binary) {
			return `<span class="json-type">BinData</span><span class="json-paren">(</span><span class="json-string">"..."</span><span class="json-paren">)</span>`
		}

		const keys = Object.keys(obj)
		if (keys.length === 0) {
			return '<span class="json-bracket">{</span><span class="json-bracket">}</span>'
		}

		html += '<span class="json-bracket">{</span><br>'
		keys.forEach((key, i) => {
			html += spaces + '&nbsp;&nbsp;'
			html += `<span class="json-key">"${escapeHtml(key)}"</span>`
			html += '<span class="json-colon">:</span> '
			html += formatJson(obj[key], indent + 1)
			if (i < keys.length - 1) html += '<span class="json-comma">,</span>'
			html += '<br>'
		})
		html += spaces + '<span class="json-bracket">}</span>'
	} else if (typeof obj === 'string') {
		html += `<span class="json-string">"${escapeHtml(obj)}"</span>`
	} else if (typeof obj === 'number') {
		html += `<span class="json-number">${obj}</span>`
	} else if (typeof obj === 'boolean') {
		html += `<span class="json-boolean">${obj}</span>`
	} else if (obj === null) {
		html += '<span class="json-null">null</span>'
	}

	return html
}

function escapeHtml(str) {
	if (typeof str !== 'string') return str
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function applyFilter() {
	store.fetchDocuments({
		page: 1,
		filter: localFilter.value,
		sort: localSort.value
	})
}

function clearFilter() {
	localFilter.value = '{}'
	localSort.value = '{}'
	store.fetchDocuments({
		page: 1,
		filter: '{}',
		sort: '{}'
	})
}

function refresh() {
	store.fetchDocuments()
}

function changePage(page) {
	store.fetchDocuments({page})
}

function changePageSize(pageSize) {
	store.fetchDocuments({page: 1, pageSize})
}

async function confirmDelete(doc) {
	const confirmed = await dialog.confirm({
		title: 'Delete Document',
		message: `Are you sure you want to delete this document?`,
		type: 'warning',
		confirmText: 'Delete',
		cancelText: 'Cancel'
	})

	if (confirmed) {
		try {
			await store.deleteDocument(getDocId(doc))
		} catch (error) {
			dialog.error(`Failed to delete: ${error.message}`)
		}
	}
}

async function confirmDeleteSelected() {
	if (selectedIds.value.length === 0) return

	const confirmed = await dialog.confirm({
		title: 'Delete Documents',
		message: `Are you sure you want to delete ${selectedIds.value.length} documents?`,
		type: 'warning',
		confirmText: 'Delete All',
		cancelText: 'Cancel'
	})

	if (confirmed) {
		try {
			await store.deleteDocuments([...selectedIds.value])
			selectedIds.value = []
		} catch (error) {
			dialog.error(`Failed to delete: ${error.message}`)
		}
	}
}
</script>

<style scoped>
.document-table {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Filter Card */
.filter-card {
	background: var(--card-bg);
	border: 1px solid var(--border-color);
	border-radius: 12px;
	padding: 1rem;
}

.filter-row {
	display: flex;
	align-items: flex-end;
	gap: 1rem;
	flex-wrap: wrap;
}

.filter-group {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
	flex: 1;
	min-width: 200px;
}

.filter-group label {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-size: 0.75rem;
	font-weight: 500;
	color: var(--text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.filter-group label svg {
	width: 12px;
	height: 12px;
}

.filter-group input {
	padding: 0.625rem 0.875rem;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
	font-size: 0.8125rem;
	background: var(--input-bg);
	color: var(--text-primary);
	transition: all 0.2s;
}

.filter-group input:focus {
	outline: none;
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.filter-group input::placeholder {
	color: var(--text-secondary);
}

.filter-actions {
	display: flex;
	gap: 0.5rem;
}

/* Actions Bar */
.actions-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 0.75rem;
	flex-wrap: wrap;
}

.actions-left {
	display: flex;
	gap: 0.5rem;
}

/* Documents List */
.documents-list {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

/* Document Card */
.document-card {
	background: var(--card-bg);
	border: 2px solid var(--border-color);
	border-radius: 8px;
	overflow: hidden;
	transition: border-color 0.2s;
}

.document-card:hover {
	border-color: var(--primary-color);
}

.document-card.selected {
	border-color: var(--primary-color);
	background: var(--active-item-bg);
}

/* Document Header */
.document-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	background: var(--table-header-bg);
	border-bottom: 1px solid var(--border-color);
}

.document-select input[type='checkbox'] {
	width: 16px;
	height: 16px;
	accent-color: var(--primary-color);
	cursor: pointer;
}

.document-index {
	font-weight: 600;
	font-size: 0.875rem;
	color: var(--text-secondary);
	min-width: 50px;
}

.document-id {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex: 1;
}

.document-id .id-label {
	font-size: 0.75rem;
	color: var(--text-secondary);
}

.document-id code {
	font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
	font-size: 0.75rem;
	color: #8b5cf6;
	background: rgba(139, 92, 246, 0.1);
	padding: 0.25rem 0.5rem;
	border-radius: 4px;
}

.document-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.action-link {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	background: none;
	border: none;
	font-size: 0.75rem;
	color: var(--primary-color);
	cursor: pointer;
	transition: all 0.2s;
	padding: 0.25rem 0.5rem;
	border-radius: 4px;
}

.action-link:hover {
	background: var(--hover-bg);
	text-decoration: underline;
}

.action-link.danger {
	color: #ef4444;
}

.action-link.danger:hover {
	background: rgba(239, 68, 68, 0.1);
}

.action-link svg {
	width: 14px;
	height: 14px;
}

.action-divider {
	color: var(--border-color);
	font-size: 0.75rem;
}

/* Document Content */
.document-content {
	padding: 1rem;
	overflow-x: auto;
	transition: max-height 0.3s ease;
	cursor: default;
}

.document-content.collapsed {
	max-height: 120px;
	overflow: hidden;
	position: relative;
}

.document-content.collapsed::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 40px;
	background: linear-gradient(transparent, var(--card-bg));
	pointer-events: none;
}

/* JSON Formatting */
.json-formatted {
	font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
	font-size: 0.8125rem;
	line-height: 1.6;
	white-space: pre-wrap;
	word-break: break-word;
}

:deep(.json-bracket) {
	color: var(--primary-color);
	font-weight: 600;
}

:deep(.json-key) {
	color: #dc2626;
}

:deep(.json-string) {
	color: #dc2626;
}

:deep(.json-number) {
	color: #2563eb;
}

:deep(.json-boolean) {
	color: #2563eb;
}

:deep(.json-null) {
	color: #6b7280;
}

:deep(.json-type) {
	color: #2563eb;
}

:deep(.json-paren) {
	color: #2563eb;
}

:deep(.json-colon) {
	color: var(--primary-color);
}

:deep(.json-comma) {
	color: var(--text-secondary);
}

/* States */
.loading-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	color: var(--text-secondary);
	text-align: center;
	gap: 1rem;
	background: var(--card-bg);
	border: 1px solid var(--border-color);
	border-radius: 12px;
}

.loading-state svg,
.empty-state svg {
	width: 48px;
	height: 48px;
	opacity: 0.4;
}

.loading-state span,
.empty-state span {
	font-size: 0.875rem;
}

.spinner {
	width: 32px;
	height: 32px;
	border: 3px solid var(--border-color);
	border-top-color: var(--primary-color);
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
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
	gap: 0.5rem;
}

.btn svg {
	width: 16px;
	height: 16px;
}

.btn-sm {
	padding: 0.375rem 0.75rem;
	font-size: 0.75rem;
}

.btn-primary {
	background: var(--primary-color);
	border: none;
	color: #ffffff;
	font-weight: 600;
	box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.btn-primary:hover {
	background: var(--primary-hover);
	box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
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

/* Responsive */
@media (max-width: 768px) {
	.document-header {
		flex-wrap: wrap;
	}

	.document-actions {
		width: 100%;
		margin-top: 0.5rem;
		justify-content: flex-end;
	}

	.document-id {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.document-id code {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 150px;
	}
}
</style>
