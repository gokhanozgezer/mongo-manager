<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div v-if="visible" class="dialog-overlay" @click.self="handleOverlayClick">
				<div class="dialog-box" :class="[typeClass, {dark: isDark}]">
					<div class="dialog-header" :class="typeClass">
						<span class="dialog-icon">{{ typeIcon }}</span>
						<h3 class="dialog-title">{{ title }}</h3>
					</div>
					<div class="dialog-body">
						<div v-html="message"></div>
						<!-- Prompt Input -->
						<div v-if="promptConfig" class="prompt-section">
							<label v-if="promptConfig.label" class="prompt-label">{{ promptConfig.label }}</label>
							<input
								v-if="promptConfig.type !== 'password'"
								ref="promptInput"
								type="text"
								v-model="promptValue"
								:placeholder="promptConfig.placeholder || ''"
								class="prompt-input"
								@keyup.enter="handleConfirm"
							/>
							<input
								v-else
								ref="promptInput"
								type="password"
								v-model="promptValue"
								:placeholder="promptConfig.placeholder || ''"
								class="prompt-input"
								autocomplete="new-password"
								@keyup.enter="handleConfirm"
							/>
							<p v-if="promptError" class="prompt-error">{{ promptError }}</p>
						</div>
					</div>
					<div class="dialog-footer">
						<button v-if="showCancel" class="btn btn-cancel" @click="handleCancel">
							{{ cancelText }}
						</button>
						<button class="btn" :class="confirmBtnClass" @click="handleConfirm" ref="confirmBtn">
							{{ confirmText }}
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup>
import {ref, computed, watch, nextTick} from 'vue'
import {useAppStore} from '../stores/app.js'
import {setDialogRef} from '../composables/useDialog.js'

const store = useAppStore()
const isDark = computed(() => store.isDarkMode)

const visible = ref(false)
const title = ref('')
const message = ref('')
const type = ref('info') // info, success, warning, error
const confirmText = ref('OK')
const cancelText = ref('Cancel')
const showCancel = ref(true)
const closeOnOverlay = ref(true)

// Prompt support
const promptConfig = ref(null)
const promptValue = ref('')
const promptError = ref('')

let resolvePromise = null
let validateFn = null

const confirmBtn = ref(null)
const promptInput = ref(null)

const typeClass = computed(() => `type-${type.value}`)

const typeIcon = computed(() => {
	const icons = {
		info: 'ℹ',
		success: '✓',
		warning: '⚠',
		error: '✕'
	}
	return icons[type.value] || 'ℹ'
})

const confirmBtnClass = computed(() => {
	if (type.value === 'error') return 'btn-danger'
	if (type.value === 'warning') return 'btn-warning'
	if (type.value === 'success') return 'btn-success'
	return 'btn-primary'
})

// Show confirm dialog (with cancel button)
function confirm(options) {
	title.value = options.title || 'Confirm'
	message.value = options.message || 'Are you sure?'
	type.value = options.type || 'warning'
	confirmText.value = options.confirmText || 'Confirm'
	cancelText.value = options.cancelText || 'Cancel'
	showCancel.value = true
	closeOnOverlay.value = options.closeOnOverlay !== false
	promptConfig.value = null
	promptValue.value = ''
	promptError.value = ''
	validateFn = null
	visible.value = true

	return new Promise(resolve => {
		resolvePromise = resolve
	})
}

// Show prompt dialog (with input field)
function prompt(options) {
	title.value = options.title || 'Input'
	message.value = options.message || ''
	type.value = options.type || 'info'
	confirmText.value = options.confirmText || 'Confirm'
	cancelText.value = options.cancelText || 'Cancel'
	showCancel.value = true
	closeOnOverlay.value = options.closeOnOverlay !== false

	promptConfig.value = {
		label: options.inputLabel || '',
		placeholder: options.inputPlaceholder || '',
		type: options.inputType || 'text',
		required: options.required !== false,
		matchValue: options.matchValue || null // Value that input must match
	}
	promptValue.value = options.defaultValue || ''
	promptError.value = ''
	validateFn = options.validate || null
	visible.value = true

	return new Promise(resolve => {
		resolvePromise = resolve
	})
}

// Show alert dialog (only OK button)
function alert(options) {
	if (typeof options === 'string') {
		options = {message: options}
	}
	title.value = options.title || 'Notice'
	message.value = options.message || ''
	type.value = options.type || 'info'
	confirmText.value = options.confirmText || 'OK'
	showCancel.value = false
	closeOnOverlay.value = true
	promptConfig.value = null
	promptValue.value = ''
	promptError.value = ''
	validateFn = null
	visible.value = true

	return new Promise(resolve => {
		resolvePromise = resolve
	})
}

// Show success message
function success(message, title = 'Success') {
	return alert({title, message, type: 'success'})
}

// Show error message
function error(message, title = 'Error') {
	return alert({title, message, type: 'error'})
}

// Show warning message
function warning(message, title = 'Warning') {
	return alert({title, message, type: 'warning'})
}

function handleConfirm() {
	// Validate prompt if present
	if (promptConfig.value) {
		// Required check
		if (promptConfig.value.required && !promptValue.value.trim()) {
			promptError.value = 'This field is required'
			return
		}

		// Match value check
		if (promptConfig.value.matchValue && promptValue.value !== promptConfig.value.matchValue) {
			promptError.value = 'Value does not match'
			return
		}

		// Custom validation
		if (validateFn) {
			const validationResult = validateFn(promptValue.value)
			if (validationResult !== true) {
				promptError.value = validationResult || 'Invalid input'
				return
			}
		}
	}

	visible.value = false
	if (resolvePromise) {
		// For prompt, return the value; for confirm, return true
		if (promptConfig.value) {
			resolvePromise({confirmed: true, value: promptValue.value})
		} else {
			resolvePromise(true)
		}
		resolvePromise = null
	}
}

function handleCancel() {
	visible.value = false
	if (resolvePromise) {
		if (promptConfig.value) {
			resolvePromise({confirmed: false, value: null})
		} else {
			resolvePromise(false)
		}
		resolvePromise = null
	}
}

function handleOverlayClick() {
	if (closeOnOverlay.value) {
		handleCancel()
	}
}

// Focus appropriate element when dialog opens
watch(visible, val => {
	if (val) {
		nextTick(() => {
			if (promptConfig.value && promptInput.value) {
				promptInput.value.focus()
			} else if (confirmBtn.value) {
				confirmBtn.value.focus()
			}
		})
		document.addEventListener('keydown', handleKeydown)
	} else {
		document.removeEventListener('keydown', handleKeydown)
	}
})

function handleKeydown(e) {
	if (e.key === 'Escape') {
		handleCancel()
	} else if (e.key === 'Enter' && !promptConfig.value) {
		// Only auto-confirm on Enter if not a prompt dialog
		handleConfirm()
	}
}

// Create methods object and register globally
const dialogMethods = {confirm, prompt, alert, success, error, warning}
setDialogRef(dialogMethods)

defineExpose(dialogMethods)
</script>

<style scoped>
.dialog-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10000;
	backdrop-filter: blur(2px);
}

.dialog-box {
	background: #fff;
	border-radius: 8px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	min-width: 340px;
	max-width: 480px;
	overflow: hidden;
	animation: dialog-appear 0.2s ease-out;
}

.dialog-box.dark {
	background: #2d2d2d;
	color: #e8e8e8;
}

@keyframes dialog-appear {
	from {
		transform: scale(0.95) translateY(-10px);
		opacity: 0;
	}
	to {
		transform: scale(1) translateY(0);
		opacity: 1;
	}
}

/* Header */
.dialog-header {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 16px 20px;
	border-bottom: 1px solid #e0e0e0;
}

.dark .dialog-header {
	border-color: #3c3c3c;
}

.dialog-icon {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	font-weight: bold;
}

.dialog-title {
	margin: 0;
	font-size: 16px;
	font-weight: 600;
	color: #333;
}

.dark .dialog-title {
	color: #e0e0e0;
}

/* Type-specific colors */
.type-info .dialog-header {
	background: #e3f2fd;
}
.type-info .dialog-icon {
	background: #2196f3;
	color: #fff;
}
.dark .type-info .dialog-header {
	background: #1e3a5f;
}

.type-success .dialog-header {
	background: #e8f5e9;
}
.type-success .dialog-icon {
	background: #4caf50;
	color: #fff;
}
.dark .type-success .dialog-header {
	background: #1e3d1e;
}

.type-warning .dialog-header {
	background: #fff3e0;
}
.type-warning .dialog-icon {
	background: #ff9800;
	color: #fff;
}
.dark .type-warning .dialog-header {
	background: #3d3a1e;
}

.type-error .dialog-header {
	background: #ffebee;
}
.type-error .dialog-icon {
	background: #f44336;
	color: #fff;
}
.dark .type-error .dialog-header {
	background: #3d1e1e;
}

/* Body */
.dialog-body {
	padding: 20px;
	font-size: 14px;
	line-height: 1.6;
	color: #444;
	max-height: 400px;
	overflow-y: auto;
}

.dark .dialog-body {
	color: #b0b0b0;
}

.dialog-body :deep(code) {
	background: #f0f0f0;
	padding: 2px 6px;
	border-radius: 3px;
	font-family: 'Fira Code', 'Consolas', monospace;
	font-size: 12px;
}

.dark .dialog-body :deep(code) {
	background: #1e1e1e;
}

.dialog-body :deep(strong) {
	color: #333;
}

.dark .dialog-body :deep(strong) {
	color: #fff;
}

/* Prompt Section */
.prompt-section {
	margin-top: 15px;
}

.prompt-label {
	display: block;
	font-size: 13px;
	font-weight: 500;
	margin-bottom: 6px;
	color: #333;
}

.dark .prompt-label {
	color: #ccc;
}

.prompt-input {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 14px;
	background: #fff;
	color: #333;
	transition: border-color 0.2s;
}

.prompt-input:focus {
	outline: none;
	border-color: #0e639c;
	box-shadow: 0 0 0 2px rgba(14, 99, 156, 0.2);
}

.dark .prompt-input {
	background: #1e1e1e;
	border-color: #3c3c3c;
	color: #e0e0e0;
}

.dark .prompt-input:focus {
	border-color: #0e639c;
}

.prompt-error {
	color: #f44336;
	font-size: 12px;
	margin-top: 6px;
	margin-bottom: 0;
}

/* Footer */
.dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	padding: 14px 20px;
	background: #fafafa;
	border-top: 1px solid #e0e0e0;
}

.dark .dialog-footer {
	background: #252526;
	border-color: #3c3c3c;
}

/* Buttons */
.btn {
	padding: 8px 20px;
	border-radius: 4px;
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s;
	border: none;
	min-width: 80px;
}

.btn:focus {
	outline: none;
	box-shadow: 0 0 0 2px rgba(14, 99, 156, 0.3);
}

.btn-cancel {
	background: #fff;
	border: 1px solid #ccc;
	color: #333;
}

.dark .btn-cancel {
	background: #3c3c3c;
	border-color: #555;
	color: #e8e8e8;
}

.btn-cancel:hover {
	background: #f0f0f0;
}

.dark .btn-cancel:hover {
	background: #4a4a4a;
}

.btn-primary {
	background: #0e639c;
	color: #fff;
}

.btn-primary:hover {
	background: #1177bb;
}

.btn-success {
	background: #4caf50;
	color: #fff;
}

.btn-success:hover {
	background: #43a047;
}

.btn-warning {
	background: #ff9800;
	color: #fff;
}

.btn-warning:hover {
	background: #f57c00;
}

.btn-danger {
	background: #f44336;
	color: #fff;
}

.btn-danger:hover {
	background: #d32f2f;
}

/* Transitions */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}

.dialog-fade-enter-from .dialog-box,
.dialog-fade-leave-to .dialog-box {
	transform: scale(0.95);
}
</style>
