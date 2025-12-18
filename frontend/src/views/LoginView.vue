<template>
	<div class="login-container">
		<!-- Language Selector -->
		<div class="lang-selector">
			<button class="lang-btn" @click.stop="toggleLangDropdown">
				<span class="lang-icon">🌐</span>
				<span class="lang-current">{{ currentLocale === 'en' ? 'EN' : 'TR' }}</span>
				<span class="dropdown-arrow">▼</span>
			</button>
			<div class="lang-dropdown-menu" v-if="langDropdownOpen" @click.stop>
				<a href="#" @click.prevent="setLocale('en')" :class="{active: currentLocale === 'en'}">
					<span class="lang-flag">EN</span> English
				</a>
				<a href="#" @click.prevent="setLocale('tr')" :class="{active: currentLocale === 'tr'}">
					<span class="lang-flag">🇹🇷</span> Türkçe
				</a>
			</div>
		</div>

		<div class="login-card">
			<div class="login-header">
                <div class="login-header-top">
                    <img src="/database.svg" alt="Mongo Manager Icon" class="logoIcon">
				    <h1>{{ $t('welcome') }}</h1>
                </div>
				<p>{{ $t('welcomeSubtitle') }}</p>
			</div>

			<form @submit.prevent="handleLogin" class="login-form">
				<div class="form-group">
					<label for="username">{{ $t('username') }}</label>
					<div class="input-wrapper">
						<svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
							<circle cx="12" cy="7" r="4" />
						</svg>
						<input id="username" name="username" v-model="username" type="text" placeholder="Enter your username" required autocomplete="username" />
					</div>
				</div>

				<div class="form-group">
					<label for="password">{{ $t('password') }}</label>
					<div class="input-wrapper">
						<svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
						<input
							id="password"
							name="password"
							v-model="password"
							:type="showPassword ? 'text' : 'password'"
							placeholder="Enter your password"
							required
							autocomplete="current-password"
						/>
						<button type="button" class="toggle-password" @click="showPassword = !showPassword">
							<svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
							<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path
									d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
								/>
								<line x1="1" y1="1" x2="23" y2="23" />
							</svg>
						</button>
					</div>
				</div>

				<button type="submit" class="btn-login" :disabled="loading">
					<span v-if="loading" class="spinner"></span>
					<span v-else>{{ $t('loginButton') }}</span>
				</button>
			</form>

			<div class="login-footer">
				<p>Secure MongoDB Administration</p>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue'
import {useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {auth, setToken} from '../api/index.js'
import {useAppStore} from '../stores/app.js'
import {useDialog} from '../composables/useDialog.js'

const router = useRouter()
const store = useAppStore()
const dialog = useDialog()
const {t, locale} = useI18n()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)

// Language selector
const langDropdownOpen = ref(false)
const currentLocale = computed(() => locale.value)

function toggleLangDropdown() {
	langDropdownOpen.value = !langDropdownOpen.value
}

function setLocale(lang) {
	locale.value = lang
	localStorage.setItem('locale', lang)
	langDropdownOpen.value = false
}

// Close dropdown when clicking outside
function handleClickOutside(e) {
	if (!e.target.closest('.lang-selector')) {
		langDropdownOpen.value = false
	}
}

onMounted(() => {
	document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside)
})

async function handleLogin() {
	loading.value = true

	try {
		const response = await auth.login(username.value, password.value)
		setToken(response.token)
		store.setUser(response.user)
		// Fetch connections after login
		await store.fetchConnections()
		router.push('/')
	} catch (err) {
		dialog.error(err.message || t('loginError'), t('login'))
	} finally {
		loading.value = false
	}
}
</script>

<style scoped>
.login-container {
	position: relative;
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #ffffff, #cfcfcf, #5b5b5b);
	padding: 1rem;
}

.login-card {
	width: 100%;
	max-width: 420px;
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20px;
	padding: 2.5rem;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.login-header {
	text-align: center;
	margin-bottom: 2rem;
}

.logo {
	width: 64px;
	height: 64px;
	margin: 0 auto 1rem;
}

.logo svg {
	width: 100%;
	height: 100%;
}

.login-header-top h1 {
	margin: 0;
	font-size: 1.75rem;
	font-weight: 700;
	color: #1C274C;
}

.login-header p {
	margin: 0.5rem 0 0;
	color: #64748b;
	font-size: 0.875rem;
}

.login-form {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.form-group label {
	font-size: 0.875rem;
	font-weight: 600;
	color: #374151;
}

.input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.input-icon {
	position: absolute;
	left: 1rem;
	width: 20px;
	height: 20px;
	color: #9ca3af;
	pointer-events: none;
}

.input-wrapper input {
	width: 100%;
	padding: 0.875rem 1rem 0.875rem 3rem;
	font-size: 1rem;
	border: 2px solid #e5e7eb;
	border-radius: 12px;
	background: #f9fafb;
	transition: all 0.2s;
	color: #3c3c3c;
}

.input-wrapper input:focus {
	outline: none;
	border-color: #10b981;
	background: #fff;
	box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
}

.input-wrapper input::placeholder {
	color: #9ca3af;
}

.toggle-password {
	position: absolute;
	right: 1rem;
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	color: #9ca3af;
	display: flex;
	align-items: center;
	justify-content: center;
}

.toggle-password:hover {
	color: #6b7280;
}

.toggle-password svg {
	width: 20px;
	height: 20px;
}

.btn-login {
	width: 100%;
	padding: 1rem;
	font-size: 1rem;
	font-weight: 600;
	color: #fff;
	background: linear-gradient(135deg, #10b981 0%, #059669 100%);
	border: none;
	border-radius: 12px;
	cursor: pointer;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	margin-top: 0.5rem;
}

.btn-login:hover:not(:disabled) {
	transform: translateY(-2px);
	box-shadow: 0 10px 20px -10px rgba(16, 185, 129, 0.5);
}

.btn-login:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.spinner {
	width: 20px;
	height: 20px;
	border: 2px solid rgba(255, 255, 255, 0.3);
	border-top-color: #fff;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.login-footer {
	text-align: center;
	margin-top: 2rem;
	padding-top: 1.5rem;
	border-top: 1px solid #e5e7eb;
}

.login-footer p {
	margin: 0;
	color: #9ca3af;
	font-size: 0.75rem;
}

.login-header-top{
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
}

.logoIcon{
    width: 32px;
}

/* Mobile Responsive */
@media screen and (max-width: 480px) {
	.login-container {
		padding: 0.5rem;
	}

	.login-card {
		padding: 1.5rem;
		border-radius: 15px;
	}

	.logo {
		width: 56px;
		height: 56px;
	}

	.login-header h1 {
		font-size: 1.5rem;
	}

	.input-wrapper input {
		font-size: 16px; /* Prevents iOS zoom */
		padding: 1rem 1rem 1rem 2.75rem;
	}

	.btn-login {
		padding: 1rem;
		font-size: 1rem;
	}
}

/* Language Selector */
.lang-selector {
	position: absolute;
	top: 1rem;
	right: 1rem;
	z-index: 100;
}

.lang-btn {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 12px;
	background: rgba(255, 255, 255, 0.9);
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	cursor: pointer;
	font-size: 14px;
	color: #374151;
	transition: all 0.2s;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.lang-btn:hover {
	background: #fff;
	border-color: #d1d5db;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.lang-icon {
	font-size: 16px;
}

.lang-current {
	font-weight: 600;
}

.dropdown-arrow {
	font-size: 10px;
	color: #9ca3af;
	margin-left: 2px;
}

.lang-dropdown-menu {
	position: absolute;
	top: 100%;
	right: 0;
	margin-top: 4px;
	background: #fff;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	min-width: 140px;
	overflow: hidden;
}

.lang-dropdown-menu a {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 14px;
	color: #374151;
	text-decoration: none;
	font-size: 14px;
	transition: background 0.15s;
}

.lang-dropdown-menu a:hover {
	background: #f3f4f6;
}

.lang-dropdown-menu a.active {
	background: #ecfdf5;
	color: #059669;
	font-weight: 600;
}

.lang-flag {
	font-size: 14px;
	font-weight: 600;
}
</style>
