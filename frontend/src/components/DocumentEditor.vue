<template>
	<div v-if="visible" class="modal-overlay" @click.self="close">
		<div class="modal-content document-editor">
			<div class="editor-header">
				<div class="header-title">
					<div class="header-icon" :class="{edit: isEditing || isNew}">
						<svg v-if="isNew" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="12" y1="18" x2="12" y2="12" />
							<line x1="9" y1="15" x2="15" y2="15" />
						</svg>
						<svg v-else-if="isEditing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
						<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
							<circle cx="12" cy="12" r="3" />
						</svg>
					</div>
					<h3>{{ isNew ? 'Insert Document' : isEditing ? 'Edit Document' : 'View Document' }}</h3>
				</div>
				<div class="header-actions">
					<button v-if="!isNew && !isEditing" class="btn btn-primary" @click="startEdit">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
						Edit
					</button>
					<button class="btn-close" @click="close" title="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			</div>

			<div class="editor-body">
				<JsonEditor
					ref="jsonEditor"
					v-model="documentJson"
					:rows="20"
					:placeholder="defaultPlaceholder"
					:show-actions="isEditing || isNew"
					:readonly="!isEditing && !isNew"
				/>
			</div>

			<div class="editor-footer">
				<div v-if="error" class="error-message">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
					{{ error }}
				</div>

				<div class="modal-actions">
					<button class="btn btn-secondary" @click="close">
						{{ isEditing || isNew ? 'Cancel' : 'Close' }}
					</button>
					<button v-if="isEditing || isNew" class="btn btn-primary" @click="save" :disabled="saving">
						<span v-if="saving" class="spinner-sm"></span>
						<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						{{ saving ? 'Saving...' : isNew ? 'Insert' : 'Save' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, nextTick} from 'vue'
import {useAppStore} from '../stores/app.js'
import JsonEditor from './JsonEditor.vue'

const store = useAppStore()

const visible = ref(false)
const isNew = ref(false)
const isEditing = ref(false)
const documentJson = ref('')
const originalDocument = ref(null)
const saving = ref(false)
const error = ref('')
const jsonEditor = ref(null)

const defaultPlaceholder = computed(() => {
	return isNew.value ? '{ "field": "value" }' : ''
})

function formatDocument(doc) {
	return JSON.stringify(doc, null, 2)
}

function openNew() {
	visible.value = true
	isNew.value = true
	isEditing.value = true
	documentJson.value = '{\n  \n}'
	originalDocument.value = null
	error.value = ''
}

function openView(doc) {
	visible.value = true
	isNew.value = false
	isEditing.value = false
	documentJson.value = formatDocument(doc)
	originalDocument.value = doc
	error.value = ''
}

function openEdit(doc) {
	visible.value = true
	isNew.value = false
	isEditing.value = true
	documentJson.value = formatDocument(doc)
	originalDocument.value = doc
	error.value = ''
}

function startEdit() {
	isEditing.value = true
}

function close() {
	visible.value = false
	isNew.value = false
	isEditing.value = false
	documentJson.value = ''
	originalDocument.value = null
	error.value = ''
}

async function save() {
	error.value = ''

	// Validate JSON
	if (!jsonEditor.value?.isValid()) {
		error.value = 'Invalid JSON format'
		return
	}

	const document = jsonEditor.value?.getParsedValue()
	if (!document) {
		error.value = 'Failed to parse document'
		return
	}

	saving.value = true

	try {
		if (isNew.value) {
			await store.insertDocument(document)
		} else {
			// Get the document ID
			let docId
			if (originalDocument.value._id && originalDocument.value._id.$oid) {
				docId = originalDocument.value._id.$oid
			} else {
				docId = String(originalDocument.value._id)
			}

			await store.updateDocument(docId, document, true)
		}
		close()
	} catch (err) {
		error.value = err.message
	} finally {
		saving.value = false
	}
}

defineExpose({openNew, openView, openEdit})
</script>

<style scoped>
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
	padding: 2rem;
}

.document-editor {
	background: var(--bg-secondary);
	border-radius: 16px;
	width: 100%;
	max-width: 800px;
	max-height: 90vh;
	display: flex;
	flex-direction: column;
	box-shadow: 0 25px 50px rgba(0, 0, 0, 0.35);
	border: 1px solid var(--border-color);
}

.editor-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1.25rem 1.5rem;
	border-bottom: 1px solid var(--border-color);
}

.header-title {
	display: flex;
	align-items: center;
	gap: 0.875rem;
}

.header-icon {
	width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(16, 185, 129, 0.1);
	border-radius: 10px;
}

.header-icon svg {
	width: 20px;
	height: 20px;
	color: var(--primary-color);
}

.header-icon.edit {
	background: rgba(139, 92, 246, 0.1);
}

.header-icon.edit svg {
	color: #8b5cf6;
}

.editor-header h3 {
	margin: 0;
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--text-primary);
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.btn-close {
	width: 36px;
	height: 36px;
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

.editor-body {
	flex: 1;
	overflow-y: auto;
	padding: 1.5rem;
}

.editor-footer {
	padding: 1rem 1.5rem 1.5rem;
	border-top: 1px solid var(--border-color);
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
}

.btn {
	padding: 0.625rem 1.25rem;
	font-size: 0.875rem;
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

.spinner-sm {
	width: 14px;
	height: 14px;
	border: 2px solid rgba(255, 255, 255, 0.3);
	border-top-color: white;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
