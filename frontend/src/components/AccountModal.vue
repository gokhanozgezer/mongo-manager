<template>
	<div class="modal-overlay" @keydown.esc="$emit('close')" tabindex="0" ref="modalOverlay">
		<div class="account-modal">
			<div class="modal-header">
				<h3>{{ $t('profile') || 'Profile' }}</h3>
				<button class="close-btn" @click="$emit('close')">&times;</button>
			</div>

			<div class="modal-body">
				<!-- Profile Section -->
				<div class="profile-section">
					<div class="avatar">
						<span class="avatar-icon">👤</span>
					</div>

					<div class="username-section">
						<div class="username-display" v-if="!editingUsername">
							<span class="username">{{ store.user?.username || 'admin' }}</span>
							<button class="edit-btn" @click="startEditUsername" :title="$t('edit') || 'Edit'">✎</button>
						</div>
						<div class="username-edit" v-else>
							<input
								type="text"
								id="account-username"
								name="username"
								v-model="newUsername"
								class="username-input"
								:placeholder="$t('username') || 'Username'"
								ref="usernameInput"
								autocomplete="username"
								@keyup.enter="handleChangeUsername"
								@keyup.escape="cancelEditUsername"
							/>
							<div class="edit-buttons">
								<button class="btn-save" @click="handleChangeUsername" :disabled="changingUsername || !newUsername.trim()">
									{{ changingUsername ? '...' : $t('save') || 'Save' }}
								</button>
								<button class="btn-cancel" @click="cancelEditUsername">
									{{ $t('cancel') || 'Cancel' }}
								</button>
							</div>
						</div>
						<div v-if="usernameError" class="message error">{{ usernameError }}</div>
						<div v-if="usernameSuccess" class="message success">{{ usernameSuccess }}</div>
					</div>
				</div>

				<div class="divider"></div>

				<!-- Change Password Section -->
				<div class="password-section">
					<h4>{{ $t('changePassword') || 'Change Password' }}</h4>

					<div class="form-group">
						<label for="account-current-password">{{ $t('currentPassword') || 'Current Password' }}</label>
						<input type="password" id="account-current-password" name="currentPassword" v-model="currentPassword" :placeholder="$t('currentPassword') || 'Current Password'" autocomplete="current-password" />
					</div>

					<div class="form-group">
						<label for="account-new-password">{{ $t('newPassword') || 'New Password' }}</label>
						<input type="password" id="account-new-password" name="newPassword" v-model="newPassword" :placeholder="$t('newPassword') || 'New Password'" autocomplete="new-password" />
					</div>

					<button class="btn-change-password" @click="handleChangePassword" :disabled="changingPassword || !currentPassword || !newPassword">
						{{ changingPassword ? '...' : $t('changePassword') || 'Change Password' }}
					</button>

					<div v-if="passwordError" class="message error">{{ passwordError }}</div>
					<div v-if="passwordSuccess" class="message success">{{ passwordSuccess }}</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, nextTick, onMounted} from 'vue'
import {useAppStore} from '../stores/app.js'
import {useI18n} from 'vue-i18n'
import {auth} from '../api/index.js'

const store = useAppStore()
const {t} = useI18n()

const emit = defineEmits(['close'])

const modalOverlay = ref(null)

onMounted(() => {
	nextTick(() => {
		modalOverlay.value?.focus()
	})
})

// Username editing state
const editingUsername = ref(false)
const newUsername = ref('')
const changingUsername = ref(false)
const usernameError = ref('')
const usernameSuccess = ref('')
const usernameInput = ref(null)

// Password state
const currentPassword = ref('')
const newPassword = ref('')
const changingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

function startEditUsername() {
	editingUsername.value = true
	newUsername.value = store.user?.username || ''
	usernameError.value = ''
	usernameSuccess.value = ''
	nextTick(() => {
		usernameInput.value?.focus()
		usernameInput.value?.select()
	})
}

function cancelEditUsername() {
	editingUsername.value = false
	newUsername.value = ''
	usernameError.value = ''
}

async function handleChangeUsername() {
	if (!newUsername.value.trim()) return

	usernameError.value = ''
	usernameSuccess.value = ''

	// Don't change if same as current
	if (newUsername.value.trim() === store.user?.username) {
		editingUsername.value = false
		return
	}

	changingUsername.value = true
	try {
		await auth.changeUsername(newUsername.value.trim())
		usernameSuccess.value = t('usernameChanged') || 'Username changed successfully'
		editingUsername.value = false
		// Refresh user data
		store.checkAuth()
	} catch (error) {
		usernameError.value = error.message
	} finally {
		changingUsername.value = false
	}
}

async function handleChangePassword() {
	if (!currentPassword.value || !newPassword.value) return

	passwordError.value = ''
	passwordSuccess.value = ''

	changingPassword.value = true
	try {
		await auth.changePassword(currentPassword.value, newPassword.value)
		passwordSuccess.value = t('passwordChanged') || 'Password changed successfully'
		currentPassword.value = ''
		newPassword.value = ''
	} catch (error) {
		passwordError.value = error.message
	} finally {
		changingPassword.value = false
	}
}
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
}

.account-modal {
	background: #fff;
	border-radius: 12px;
	width: 90%;
	max-width: 380px;
	overflow: hidden;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px 20px;
	border-bottom: 1px solid #eee;
}

.modal-header h3 {
	margin: 0;
	font-size: 16px;
	font-weight: 600;
	color: #333;
}

.close-btn {
	background: none;
	border: none;
	font-size: 22px;
	cursor: pointer;
	color: #999;
	padding: 0;
	line-height: 1;
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
}

.close-btn:hover {
	background: #f0f0f0;
	color: #333;
}

.modal-body {
	padding: 24px;
}

/* Profile Section */
.profile-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
}

.avatar {
	width: 80px;
	height: 80px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.avatar-icon {
	font-size: 40px;
	filter: grayscale(1) brightness(10);
}

.username-section {
	text-align: center;
	width: 100%;
}

.username-display {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.username {
	font-size: 20px;
	font-weight: 600;
	color: #333;
}

.edit-btn {
	background: none;
	border: none;
	cursor: pointer;
	font-size: 16px;
	color: #999;
	padding: 4px 8px;
	border-radius: 4px;
}

.edit-btn:hover {
	background: #f0f0f0;
	color: #666;
}

.username-edit {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	width: 100%;
}

.username-input {
	width: 100%;
	max-width: 200px;
	padding: 10px 14px;
	border: 2px solid #e0e0e0;
	border-radius: 8px;
	font-size: 16px;
	text-align: center;
	outline: none;
	transition: border-color 0.2s;
}

.username-input:focus {
	border-color: #667eea;
}

.edit-buttons {
	display: flex;
	gap: 8px;
}

.btn-save {
	padding: 8px 16px;
	border: none;
	border-radius: 6px;
	background: #667eea;
	color: #fff;
	cursor: pointer;
	font-size: 13px;
	font-weight: 500;
}

.btn-save:hover:not(:disabled) {
	background: #5a6fd6;
}

.btn-save:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-cancel {
	padding: 8px 16px;
	border: 1px solid #ddd;
	border-radius: 6px;
	background: #fff;
	color: #666;
	cursor: pointer;
	font-size: 13px;
}

.btn-cancel:hover {
	background: #f5f5f5;
}

/* Divider */
.divider {
	height: 1px;
	background: #eee;
	margin: 24px 0;
}

/* Password Section */
.password-section h4 {
	margin: 0 0 16px 0;
	font-size: 14px;
	font-weight: 600;
	color: #666;
}

.form-group {
	margin-bottom: 14px;
}

.form-group label {
	display: block;
	font-size: 12px;
	font-weight: 500;
	color: #666;
	margin-bottom: 6px;
}

.form-group input {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid #ddd;
	border-radius: 6px;
	font-size: 14px;
	outline: none;
	transition: border-color 0.2s;
}

.form-group input:focus {
	border-color: #667eea;
}

.btn-change-password {
	width: 100%;
	padding: 12px;
	border: none;
	border-radius: 6px;
	background: #667eea;
	color: #fff;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	margin-top: 4px;
}

.btn-change-password:hover:not(:disabled) {
	background: #5a6fd6;
}

.btn-change-password:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* Messages */
.message {
	font-size: 12px;
	margin-top: 10px;
	padding: 8px 12px;
	border-radius: 6px;
}

.message.error {
	background: #fee;
	color: #c00;
}

.message.success {
	background: #efe;
	color: #080;
}

/* Dark Mode */
:global(.dark) .account-modal {
	background: #1e1e1e;
}

:global(.dark) .modal-header {
	border-color: #333;
}

:global(.dark) .modal-header h3 {
	color: #e8e8e8;
}

:global(.dark) .close-btn {
	color: #888;
}

:global(.dark) .close-btn:hover {
	background: #333;
	color: #fff;
}

:global(.dark) .username {
	color: #e8e8e8;
}

:global(.dark) .edit-btn {
	color: #888;
}

:global(.dark) .edit-btn:hover {
	background: #333;
	color: #ccc;
}

:global(.dark) .username-input {
	background: #2d2d2d;
	border-color: #444;
	color: #e8e8e8;
}

:global(.dark) .username-input:focus {
	border-color: #667eea;
}

:global(.dark) .btn-cancel {
	background: #2d2d2d;
	border-color: #444;
	color: #ccc;
}

:global(.dark) .btn-cancel:hover {
	background: #3d3d3d;
}

:global(.dark) .divider {
	background: #333;
}

:global(.dark) .password-section h4 {
	color: #999;
}

:global(.dark) .form-group label {
	color: #999;
}

:global(.dark) .form-group input {
	background: #2d2d2d;
	border-color: #444;
	color: #e8e8e8;
}

:global(.dark) .form-group input:focus {
	border-color: #667eea;
}

:global(.dark) .message.error {
	background: #3c2020;
	color: #f88;
}

:global(.dark) .message.success {
	background: #203c20;
	color: #8f8;
}

/* Modern Theme */
.modern-theme .account-modal {
	border-radius: var(--modern-radius-xl);
	box-shadow: var(--modern-shadow-lg);
}

.modern-theme .modal-header {
	border-color: var(--modern-border);
}

.modern-theme .modal-header h3 {
	color: var(--modern-text-primary);
}

.modern-theme .avatar {
	background: linear-gradient(135deg, var(--modern-primary) 0%, #7c3aed 100%);
}

.modern-theme .username {
	color: var(--modern-text-primary);
}

.modern-theme .edit-btn:hover {
	background: var(--modern-gray-100);
}

.modern-theme .username-input {
	border-radius: var(--modern-radius);
	border-color: var(--modern-border);
}

.modern-theme .username-input:focus {
	border-color: var(--modern-primary);
	box-shadow: 0 0 0 3px var(--modern-primary-light);
}

.modern-theme .btn-save {
	background: var(--modern-primary);
	border-radius: var(--modern-radius);
}

.modern-theme .btn-save:hover:not(:disabled) {
	background: var(--modern-primary-hover);
}

.modern-theme .btn-cancel {
	border-radius: var(--modern-radius);
	border-color: var(--modern-border);
}

.modern-theme .divider {
	background: var(--modern-border);
}

.modern-theme .password-section h4 {
	color: var(--modern-text-secondary);
}

.modern-theme .form-group label {
	color: var(--modern-text-secondary);
}

.modern-theme .form-group input {
	border-radius: var(--modern-radius);
	border-color: var(--modern-border);
}

.modern-theme .form-group input:focus {
	border-color: var(--modern-primary);
	box-shadow: 0 0 0 3px var(--modern-primary-light);
}

.modern-theme .btn-change-password {
	background: var(--modern-primary);
	border-radius: var(--modern-radius);
}

.modern-theme .btn-change-password:hover:not(:disabled) {
	background: var(--modern-primary-hover);
}

/* Dark Modern Theme */
.dark.modern-theme .account-modal {
	background: var(--modern-bg-card);
}

.dark.modern-theme .modal-header {
	border-color: var(--modern-border);
}

.dark.modern-theme .modal-header h3 {
	color: var(--modern-text-primary);
}

.dark.modern-theme .username {
	color: var(--modern-text-primary);
}

.dark.modern-theme .edit-btn:hover {
	background: var(--modern-gray-100);
}

.dark.modern-theme .username-input {
	background: var(--modern-bg-page);
	border-color: var(--modern-border);
	color: var(--modern-text-primary);
}

.dark.modern-theme .btn-cancel {
	background: var(--modern-gray-100);
	border-color: var(--modern-border);
	color: var(--modern-text-secondary);
}

.dark.modern-theme .divider {
	background: var(--modern-border);
}

.dark.modern-theme .form-group input {
	background: var(--modern-bg-page);
	border-color: var(--modern-border);
	color: var(--modern-text-primary);
}
</style>
