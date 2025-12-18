<template>
	<div class="modal-overlay" @click.self="$emit('close')">
		<div class="settings-modal">
			<div class="modal-header">
				<h3>{{ $t('settings') }}</h3>
				<button class="close-btn" @click="$emit('close')">&times;</button>
			</div>

			<!-- Tab Navigation -->
			<div class="tab-nav">
				<button
					class="tab-btn"
					:class="{active: activeTab === 'appearance'}"
					@click="activeTab = 'appearance'"
				>
					{{ $t('appearance') }}
				</button>
				<button
					class="tab-btn"
					:class="{active: activeTab === 'editor'}"
					@click="activeTab = 'editor'"
				>
					{{ $t('editorSettings') }}
				</button>
				<button
					class="tab-btn"
					:class="{active: activeTab === 'access'}"
					@click="activeTab = 'access'"
				>
					{{ $t('accessSettings') }}
				</button>
				<button
					class="tab-btn"
					:class="{active: activeTab === 'ai'}"
					@click="activeTab = 'ai'"
				>
					{{ $t('aiSettings') }}
				</button>
			</div>

			<div class="modal-body">
				<!-- Appearance Tab -->
				<div class="settings-section" v-show="activeTab === 'appearance'">
					<!-- App Theme -->
					<div class="setting-item">
						<div class="setting-label">
							<span class="setting-name">{{ $t('appTheme') }}</span>
							<span class="setting-desc">{{ $t('appThemeDesc') }}</span>
						</div>
						<select v-model="selectedAppTheme" class="setting-select">
							<option value="classic">Classic</option>
							<option value="modern">Modern</option>
						</select>
					</div>

					<!-- Sidebar Theme (only for Modern theme) -->
					<div class="setting-item" v-if="selectedAppTheme === 'modern'">
						<div class="setting-label">
							<span class="setting-name">{{ $t('sidebarTheme') }}</span>
							<span class="setting-desc">{{ $t('sidebarThemeDesc') }}</span>
						</div>
						<select v-model="selectedSidebarTheme" class="setting-select">
							<option value="dark">{{ $t('sidebarDark') }}</option>
							<option value="light">{{ $t('sidebarLight') }}</option>
						</select>
					</div>

					<!-- App Font -->
					<div class="setting-item">
						<div class="setting-label">
							<span class="setting-name">{{ $t('appFont') }}</span>
							<span class="setting-desc">{{ $t('appFontDesc') }}</span>
						</div>
						<select v-model="selectedAppFont" class="setting-select font-select" :style="{fontFamily: selectedAppFont}">
							<optgroup label="Sans-Serif">
								<option value="'Inter', sans-serif">Inter</option>
								<option value="'Open Sans', sans-serif">Open Sans</option>
								<option value="'Roboto', sans-serif">Roboto</option>
								<option value="'Segoe UI', sans-serif">Segoe UI</option>
								<option value="'Helvetica Neue', sans-serif">Helvetica Neue</option>
								<option value="'Source Sans Pro', sans-serif">Source Sans Pro</option>
								<option value="'Nunito', sans-serif">Nunito</option>
								<option value="system-ui, sans-serif">System Default</option>
							</optgroup>
							<optgroup label="Monospace">
								<option value="'JetBrains Mono', monospace">JetBrains Mono</option>
								<option value="'Roboto Mono', monospace">Roboto Mono</option>
								<option value="'Source Code Pro', monospace">Source Code Pro</option>
								<option value="'IBM Plex Mono', monospace">IBM Plex Mono</option>
								<option value="'Inconsolata', monospace">Inconsolata</option>
								<option value="'Space Mono', monospace">Space Mono</option>
								<option value="'Google Sans Mono', monospace">Google Sans Mono</option>
								<option value="'Cutive Mono', monospace">Cutive Mono</option>
								<option value="'VT323', monospace">VT323</option>
							</optgroup>
						</select>
					</div>

					<!-- Dark Mode Toggle -->
					<div class="setting-item">
						<div class="setting-label">
							<span class="setting-name">{{ $t('darkMode') }}</span>
							<span class="setting-desc">{{ $t('darkModeDesc') }}</span>
						</div>
						<label class="toggle-switch">
							<input type="checkbox" v-model="darkMode" />
							<span class="toggle-slider"></span>
						</label>
					</div>

					<!-- Language -->
					<div class="setting-item">
						<div class="setting-label">
							<span class="setting-name">{{ $t('language') }}</span>
							<span class="setting-desc">{{ $t('languageDesc') }}</span>
						</div>
						<select v-model="language" class="setting-select">
							<option value="en">English</option>
							<option value="tr">Türkçe</option>
						</select>
					</div>
				</div>

				<!-- Editor Tab -->
				<div class="settings-section" v-show="activeTab === 'editor'">
					<!-- Editor Theme -->
					<div class="setting-item">
						<div class="setting-label">
							<span class="setting-name">{{ $t('editorTheme') }}</span>
							<span class="setting-desc">{{ $t('editorThemeDesc') }}</span>
						</div>
						<select v-model="selectedTheme" class="setting-select theme-select">
							<optgroup label="Dark Themes">
								<option value="default">Default (VS Code Dark)</option>
								<option value="monokai">Monokai</option>
								<option value="dracula">Dracula</option>
								<option value="material">Material</option>
								<option value="nord">Nord</option>
								<option value="cobalt">Cobalt</option>
								<option value="solarized-dark">Solarized Dark</option>
								<option value="gruvbox-dark">Gruvbox Dark</option>
								<option value="one-dark">One Dark</option>
								<option value="twilight">Twilight</option>
								<option value="ambiance">Ambiance</option>
							</optgroup>
							<optgroup label="Light Themes">
								<option value="eclipse">Eclipse</option>
								<option value="solarized-light">Solarized Light</option>
								<option value="idea">IDEA</option>
								<option value="neo">Neo</option>
								<option value="yeti">Yeti</option>
							</optgroup>
						</select>
					</div>

					<!-- Editor Font Size -->
					<div class="setting-item">
						<div class="setting-label">
							<span class="setting-name">{{ $t('fontSize') }}</span>
							<span class="setting-desc">{{ $t('fontSizeDesc') }}</span>
						</div>
						<div class="font-size-control">
							<button @click="decreaseFontSize" class="size-btn">-</button>
							<span class="size-value">{{ fontSize }}px</span>
							<button @click="increaseFontSize" class="size-btn">+</button>
						</div>
					</div>

					<!-- Theme Preview -->
					<div class="theme-preview">
						<div class="preview-label">{{ $t('preview') }}</div>
						<div class="preview-editor" :class="previewClass" :style="previewStyle">
							<pre><code><span class="cm-keyword">function</span> <span class="cm-def">findDocument</span>(<span class="cm-def">query</span>) {
  <span class="cm-keyword">return</span> <span class="cm-variable">db</span>.<span class="cm-property">collection</span>.<span class="cm-property">find</span>({
    <span class="cm-property">"name"</span>: <span class="cm-string">"MongoDB"</span>,
    <span class="cm-property">"version"</span>: <span class="cm-number">7.0</span>,
    <span class="cm-property">"active"</span>: <span class="cm-atom">true</span>
  });
}</code></pre>
						</div>
					</div>
				</div>

				<!-- Access Settings Tab -->
				<div class="settings-section" v-show="activeTab === 'access'">
					<!-- Current IP -->
					<div class="setting-item">
						<div class="setting-label">
							<span class="setting-name">{{ $t('yourIpAddress') }}</span>
							<span class="setting-desc">{{ $t('yourIpAddressDesc') }}</span>
						</div>
						<div class="ip-display">
							<span class="ip-value">{{ currentIp || $t('loading') }}</span>
						</div>
					</div>

					<!-- IP Access Mode -->
					<div class="setting-item">
						<div class="setting-label">
							<span class="setting-name">{{ $t('ipAccessMode') }}</span>
							<span class="setting-desc">{{ $t('ipAccessModeDesc') }}</span>
						</div>
						<select v-model="ipAccessMode" class="setting-select">
							<option value="disabled">{{ $t('ipAccessDisabled') }}</option>
							<option value="whitelist">{{ $t('ipAccessWhitelist') }}</option>
							<option value="blacklist">{{ $t('ipAccessBlacklist') }}</option>
						</select>
					</div>

					<!-- Whitelist -->
					<div class="ip-list-section" v-if="ipAccessMode === 'whitelist'">
						<div class="ip-list-header">
							<h5>{{ $t('ipWhitelist') }}</h5>
							<span class="ip-list-desc">{{ $t('ipWhitelistDesc') }}</span>
						</div>
						<div class="ip-input-row">
							<input
								type="text"
								v-model="newWhitelistIp"
								:placeholder="$t('ipPlaceholder')"
								class="setting-input"
								@keyup.enter="addWhitelistIp"
							/>
							<button class="btn-small" @click="addWhitelistIp" :disabled="!newWhitelistIp.trim()">
								{{ $t('add') }}
							</button>
						</div>
						<div class="ip-list">
							<div v-if="whitelist.length === 0" class="ip-list-empty">
								{{ $t('noIpsInList') }}
							</div>
							<div v-for="(ip, index) in whitelist" :key="'w-' + index" class="ip-item">
								<span class="ip-text">{{ ip }}</span>
								<button class="ip-remove-btn" @click="removeWhitelistIp(index)">&times;</button>
							</div>
						</div>
					</div>

					<!-- Blacklist -->
					<div class="ip-list-section" v-if="ipAccessMode === 'blacklist'">
						<div class="ip-list-header">
							<h5>{{ $t('ipBlacklist') }}</h5>
							<span class="ip-list-desc">{{ $t('ipBlacklistDesc') }}</span>
						</div>
						<div class="ip-input-row">
							<input
								type="text"
								v-model="newBlacklistIp"
								:placeholder="$t('ipPlaceholder')"
								class="setting-input"
								@keyup.enter="addBlacklistIp"
							/>
							<button class="btn-small" @click="addBlacklistIp" :disabled="!newBlacklistIp.trim()">
								{{ $t('add') }}
							</button>
						</div>
						<div class="ip-list">
							<div v-if="blacklist.length === 0" class="ip-list-empty">
								{{ $t('noIpsInList') }}
							</div>
							<div v-for="(ip, index) in blacklist" :key="'b-' + index" class="ip-item">
								<span class="ip-text">{{ ip }}</span>
								<button class="ip-remove-btn" @click="removeBlacklistIp(index)">&times;</button>
							</div>
						</div>
					</div>

					<!-- Warning message -->
					<div class="access-warning" v-if="ipAccessMode !== 'disabled'">
						<span class="warning-icon">!</span>
						<span class="warning-text">{{ $t('ipAccessWarning') }}</span>
					</div>
				</div>

				<!-- AI Settings Tab -->
				<div class="settings-section" v-show="activeTab === 'ai'">
					<div class="ai-coming-soon">
						<div class="ai-icon">
							<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 0 1 1h1a4 4 0 0 1 0 8h-1a1 1 0 0 0-1 1v1a4 4 0 0 1-8 0v-1a1 1 0 0 0-1-1H6a4 4 0 0 1 0-8h1a1 1 0 0 0 1-1V6a4 4 0 0 1 4-4z"/>
								<circle cx="12" cy="12" r="2"/>
							</svg>
						</div>
						<h4>{{ $t('aiSettingsTitle') }}</h4>
						<p class="ai-description">{{ $t('aiSettingsDescription') }}</p>
						<div class="ai-features">
							<div class="ai-feature-item">
								<span class="feature-bullet"></span>
								<span>{{ $t('aiFeature1') }}</span>
							</div>
							<div class="ai-feature-item">
								<span class="feature-bullet"></span>
								<span>{{ $t('aiFeature2') }}</span>
							</div>
							<div class="ai-feature-item">
								<span class="feature-bullet"></span>
								<span>{{ $t('aiFeature3') }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button class="btn-secondary" @click="$emit('close')">{{ $t('cancel') }}</button>
				<button class="btn-primary" @click="saveSettings" :disabled="saving">
					{{ saving ? $t('saving') : $t('save') }}
				</button>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import {useAppStore} from '../stores/app.js'
import {useI18n} from 'vue-i18n'
import {api} from '../api/index.js'
import {useDialog} from '../composables/useDialog.js'

const store = useAppStore()
const {locale} = useI18n()
const dialog = useDialog()

const emit = defineEmits(['close'])

// Tab state
const activeTab = ref('appearance')

// Saving state
const saving = ref(false)

// Local state (copy of store values - only saved on Save button)
const darkMode = ref(store.isDarkMode)
const selectedAppTheme = ref(store.appTheme || 'classic')
const selectedSidebarTheme = ref(store.sidebarTheme || 'dark')
const selectedAppFont = ref(store.appFont || "'Open Sans', sans-serif")
const language = ref(locale.value)
const selectedTheme = ref(store.editorTheme || 'default')
const fontSize = ref(store.editorFontSize || 13)

// Access settings state
const currentIp = ref('')
const ipAccessMode = ref('disabled')
const whitelist = ref([])
const blacklist = ref([])
const newWhitelistIp = ref('')
const newBlacklistIp = ref('')

// Computed - theme class for preview
const previewClass = computed(() => {
	return `theme-${selectedTheme.value.replace(/\s+/g, '-')}`
})

// Computed - preview style for font and size (uses App Font)
const previewStyle = computed(() => {
	return {
		fontSize: fontSize.value + 'px',
		fontFamily: selectedAppFont.value
	}
})

// Load access settings on mount
onMounted(async () => {
	try {
		const {data} = await api.get('/settings/access')
		currentIp.value = data.currentIp || ''
		ipAccessMode.value = data.mode || 'disabled'
		whitelist.value = data.whitelist || []
		blacklist.value = data.blacklist || []
	} catch (error) {
		console.error('Failed to load access settings:', error)
	}
})

// Methods
function increaseFontSize() {
	if (fontSize.value < 24) {
		fontSize.value++
	}
}

function decreaseFontSize() {
	if (fontSize.value > 10) {
		fontSize.value--
	}
}

// IP list management
function addWhitelistIp() {
	const ip = newWhitelistIp.value.trim()
	if (ip && !whitelist.value.includes(ip)) {
		whitelist.value.push(ip)
		newWhitelistIp.value = ''
	}
}

function removeWhitelistIp(index) {
	whitelist.value.splice(index, 1)
}

function addBlacklistIp() {
	const ip = newBlacklistIp.value.trim()
	if (ip && !blacklist.value.includes(ip)) {
		blacklist.value.push(ip)
		newBlacklistIp.value = ''
	}
}

function removeBlacklistIp(index) {
	blacklist.value.splice(index, 1)
}

// Save all settings
async function saveSettings() {
	saving.value = true

	try {
		// Save app theme
		store.setAppTheme(selectedAppTheme.value)

		// Save sidebar theme (for modern theme)
		store.setSidebarTheme(selectedSidebarTheme.value)

		// Save app font
		store.setAppFont(selectedAppFont.value)

		// Save dark mode
		if (darkMode.value !== store.isDarkMode) {
			store.toggleTheme()
		}

		// Save language
		if (language.value !== locale.value) {
			locale.value = language.value
			localStorage.setItem('locale', language.value)
		}

		// Save editor theme
		store.setEditorTheme(selectedTheme.value)

		// Save font size
		store.setEditorFontSize(fontSize.value)

		// Save access settings to backend
		await api.put('/settings/access', {
			mode: ipAccessMode.value,
			whitelist: whitelist.value,
			blacklist: blacklist.value
		})

		// Close modal
		emit('close')
	} catch (error) {
		console.error('Failed to save settings:', error)
		dialog.error(error.message || 'Failed to save settings', 'Error')
	} finally {
		saving.value = false
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

.settings-modal {
	background: #fff;
	border-radius: 8px;
	width: 90%;
	max-width: 600px;
	max-height: 90vh;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

:global(.dark) .settings-modal {
	background: #1e1e1e;
	color: #e8e8e8;
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px 20px;
	border-bottom: 1px solid #e0e0e0;
}

:global(.dark) .modal-header {
	border-color: #3c3c3c;
}

/* Tab Navigation */
.tab-nav {
	display: flex;
	border-bottom: 1px solid #e0e0e0;
	background: #f5f5f5;
}

:global(.dark) .tab-nav {
	background: #252525;
	border-color: #3c3c3c;
}

.tab-btn {
	flex: 1;
	padding: 12px 16px;
	border: none;
	background: none;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	color: #666;
	border-bottom: 2px solid transparent;
	transition: all 0.2s;
}

:global(.dark) .tab-btn {
	color: #999;
}

.tab-btn:hover {
	color: #333;
	background: rgba(0, 0, 0, 0.03);
}

:global(.dark) .tab-btn:hover {
	color: #fff;
	background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
	color: #0e639c;
	border-bottom-color: #0e639c;
	background: #fff;
}

:global(.dark) .tab-btn.active {
	color: #4fc3f7;
	border-bottom-color: #4fc3f7;
	background: #1e1e1e;
}

.modal-header h3 {
	margin: 0;
	font-size: 18px;
	font-weight: 600;
}

.close-btn {
	background: none;
	border: none;
	font-size: 24px;
	cursor: pointer;
	color: #666;
	padding: 0;
	line-height: 1;
}

:global(.dark) .close-btn {
	color: #999;
}

.close-btn:hover {
	color: #333;
}

:global(.dark) .close-btn:hover {
	color: #fff;
}

.modal-body {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
}

.settings-section {
	margin-bottom: 25px;
}

.settings-section h4 {
	margin: 0 0 15px 0;
	font-size: 14px;
	font-weight: 600;
	color: #666;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

:global(.dark) .settings-section h4 {
	color: #999;
}

.setting-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 0;
	border-bottom: 1px solid #f0f0f0;
}

:global(.dark) .setting-item {
	border-color: #2d2d2d;
}

.setting-label {
	flex: 1;
}

.setting-name {
	display: block;
	font-weight: 500;
	margin-bottom: 2px;
}

.setting-desc {
	display: block;
	font-size: 12px;
	color: #666;
}

:global(.dark) .setting-desc {
	color: #999;
}

/* Toggle Switch */
.toggle-switch {
	position: relative;
	display: inline-block;
	width: 48px;
	height: 26px;
}

.toggle-switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

.toggle-slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #ccc;
	transition: 0.3s;
	border-radius: 26px;
}

.toggle-slider:before {
	position: absolute;
	content: '';
	height: 20px;
	width: 20px;
	left: 3px;
	bottom: 3px;
	background-color: white;
	transition: 0.3s;
	border-radius: 50%;
}

input:checked + .toggle-slider {
	background-color: #0e639c;
}

input:checked + .toggle-slider:before {
	transform: translateX(22px);
}

/* Select */
.setting-select {
	padding: 8px 12px;
	border: 1px solid #ddd;
	border-radius: 4px;
	background: #fff;
	font-size: 14px;
	min-width: 150px;
	cursor: pointer;
}

:global(.dark) .setting-select {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #e8e8e8;
}

.theme-select {
	min-width: 200px;
}

.font-select {
	min-width: 180px;
}

/* Account Section */
.setting-item.column {
	flex-direction: column;
	align-items: flex-start;
	gap: 10px;
}

.setting-label.full-width {
	width: 100%;
}

.account-form {
	display: flex;
	gap: 10px;
	width: 100%;
}

.setting-input {
	flex: 1;
	padding: 8px 12px;
	border: 1px solid #ddd;
	border-radius: 4px;
	font-size: 14px;
}

:global(.dark) .setting-input {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #e8e8e8;
}

.btn-small {
	padding: 8px 16px;
	border: none;
	border-radius: 4px;
	background: #0e639c;
	color: #fff;
	cursor: pointer;
	font-size: 13px;
	white-space: nowrap;
}

.btn-small:hover {
	background: #1177bb;
}

.btn-small:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.error-message {
	color: #c00;
	font-size: 12px;
	width: 100%;
}

:global(.dark) .error-message {
	color: #f48771;
}

.success-message {
	color: #2e7d32;
	font-size: 12px;
	width: 100%;
}

:global(.dark) .success-message {
	color: #4ec9b0;
}

/* Font Size Control */
.font-size-control {
	display: flex;
	align-items: center;
	gap: 10px;
}

.size-btn {
	width: 30px;
	height: 30px;
	border: 1px solid #ddd;
	border-radius: 4px;
	background: #f5f5f5;
	cursor: pointer;
	font-size: 18px;
	font-weight: bold;
	display: flex;
	align-items: center;
	justify-content: center;
}

:global(.dark) .size-btn {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #e8e8e8;
}

.size-btn:hover {
	background: #e0e0e0;
}

:global(.dark) .size-btn:hover {
	background: #3c3c3c;
}

.size-value {
	min-width: 50px;
	text-align: center;
	font-weight: 500;
}

/* Theme Preview */
.theme-preview {
	margin-top: 15px;
	border: 1px solid #ddd;
	border-radius: 6px;
	overflow: hidden;
}

:global(.dark) .theme-preview {
	border-color: #3c3c3c;
}

.preview-label {
	padding: 8px 12px;
	background: #f5f5f5;
	font-size: 12px;
	font-weight: 500;
	color: #666;
	border-bottom: 1px solid #ddd;
}

:global(.dark) .preview-label {
	background: #252525;
	color: #999;
	border-color: #3c3c3c;
}

.preview-editor {
	padding: 15px;
	font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
	line-height: 1.5;
	/* Default theme */
	--bg: #1e1e1e;
	--text: #e8e8e8;
	--keyword: #569cd6;
	--def: #9cdcfe;
	--string: #ce9178;
	--number: #b5cea8;
	--atom: #569cd6;
	--property: #9cdcfe;
	background: var(--bg);
	color: var(--text);
}

.preview-editor pre {
	margin: 0;
	font-family: inherit;
}

.preview-editor code {
	font-family: inherit;
}

.preview-editor .cm-keyword {
	color: var(--keyword);
}
.preview-editor .cm-def {
	color: var(--def);
}
.preview-editor .cm-variable {
	color: var(--text);
}
.preview-editor .cm-property {
	color: var(--property);
}
.preview-editor .cm-string {
	color: var(--string);
}
.preview-editor .cm-number {
	color: var(--number);
}
.preview-editor .cm-atom {
	color: var(--atom);
}

/* Theme previews */
.theme-default {
	--bg: #1e1e1e;
	--text: #e8e8e8;
	--keyword: #569cd6;
	--def: #9cdcfe;
	--string: #ce9178;
	--number: #b5cea8;
	--atom: #569cd6;
	--property: #9cdcfe;
}
.theme-monokai {
	--bg: #272822;
	--text: #f8f8f2;
	--keyword: #f92672;
	--def: #a6e22e;
	--string: #e6db74;
	--number: #ae81ff;
	--atom: #ae81ff;
	--property: #a6e22e;
}
.theme-dracula {
	--bg: #282a36;
	--text: #f8f8f2;
	--keyword: #ff79c6;
	--def: #50fa7b;
	--string: #f1fa8c;
	--number: #bd93f9;
	--atom: #bd93f9;
	--property: #66d9ef;
}
.theme-material {
	--bg: #263238;
	--text: #eeffff;
	--keyword: #c792ea;
	--def: #82aaff;
	--string: #c3e88d;
	--number: #f78c6c;
	--atom: #f78c6c;
	--property: #ffcb6b;
}
.theme-nord {
	--bg: #2e3440;
	--text: #d8dee9;
	--keyword: #81a1c1;
	--def: #88c0d0;
	--string: #a3be8c;
	--number: #b48ead;
	--atom: #b48ead;
	--property: #8fbcbb;
}
.theme-cobalt {
	--bg: #002240;
	--text: #ffffff;
	--keyword: #ff9d00;
	--def: #ffee80;
	--string: #3ad900;
	--number: #ff628c;
	--atom: #ff9d00;
	--property: #ffee80;
}
.theme-solarized-dark {
	--bg: #002b36;
	--text: #839496;
	--keyword: #859900;
	--def: #268bd2;
	--string: #2aa198;
	--number: #d33682;
	--atom: #cb4b16;
	--property: #2aa198;
}
.theme-gruvbox-dark {
	--bg: #282828;
	--text: #ebdbb2;
	--keyword: #fb4934;
	--def: #83a598;
	--string: #b8bb26;
	--number: #d3869b;
	--atom: #fe8019;
	--property: #83a598;
}
.theme-one-dark {
	--bg: #282c34;
	--text: #abb2bf;
	--keyword: #c678dd;
	--def: #e06c75;
	--string: #98c379;
	--number: #d19a66;
	--atom: #56b6c2;
	--property: #e06c75;
}
.theme-twilight {
	--bg: #141414;
	--text: #f7f7f7;
	--keyword: #cda869;
	--def: #7587a6;
	--string: #8f9d6a;
	--number: #cf6a4c;
	--atom: #cf6a4c;
	--property: #7587a6;
}
.theme-ambiance {
	--bg: #202020;
	--text: #e6e1dc;
	--keyword: #cf6a4c;
	--def: #e6e1dc;
	--string: #65b042;
	--number: #3387cc;
	--atom: #cf6a4c;
	--property: #e6e1dc;
}
.theme-eclipse {
	--bg: #ffffff;
	--text: #000000;
	--keyword: #7f0055;
	--def: #000000;
	--string: #2a00ff;
	--number: #116644;
	--atom: #7f0055;
	--property: #000000;
}
.theme-solarized-light {
	--bg: #fdf6e3;
	--text: #657b83;
	--keyword: #859900;
	--def: #268bd2;
	--string: #2aa198;
	--number: #d33682;
	--atom: #cb4b16;
	--property: #268bd2;
}
.theme-idea {
	--bg: #ffffff;
	--text: #000000;
	--keyword: #000080;
	--def: #000000;
	--string: #008000;
	--number: #0000ff;
	--atom: #000080;
	--property: #660e7a;
}
.theme-neo,
.theme-neat,
.theme-elegant {
	--bg: #ffffff;
	--text: #2e383c;
	--keyword: #a535ae;
	--def: #2e95d3;
	--string: #00a67d;
	--number: #9c3328;
	--atom: #a535ae;
	--property: #2e95d3;
}
.theme-yeti {
	--bg: #eceae8;
	--text: #546e7a;
	--keyword: #a074c4;
	--def: #55b5db;
	--string: #96c0d8;
	--number: #a074c4;
	--atom: #a074c4;
	--property: #9fb4bf;
}

.modal-footer {
	padding: 15px 20px;
	border-top: 1px solid #e0e0e0;
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}

:global(.dark) .modal-footer {
	border-color: #3c3c3c;
}

.btn-secondary {
	padding: 8px 20px;
	border: 1px solid #ddd;
	border-radius: 4px;
	background: #f5f5f5;
	cursor: pointer;
	font-size: 14px;
}

:global(.dark) .btn-secondary {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #e8e8e8;
}

.btn-secondary:hover {
	background: #e0e0e0;
}

:global(.dark) .btn-secondary:hover {
	background: #3c3c3c;
}

.btn-primary {
	padding: 8px 20px;
	border: none;
	border-radius: 4px;
	background: #0e639c;
	color: #fff;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
}

.btn-primary:hover {
	background: #1177bb;
}

:global(.dark) .btn-primary {
	background: #0e639c;
}

:global(.dark) .btn-primary:hover {
	background: #1177bb;
}

.btn-primary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

/* IP Access Settings */
.ip-display {
	background: #f5f5f5;
	padding: 8px 12px;
	border-radius: 4px;
	font-family: monospace;
}

:global(.dark) .ip-display {
	background: #2d2d2d;
}

.ip-value {
	font-weight: 500;
	color: #0e639c;
}

:global(.dark) .ip-value {
	color: #4fc3f7;
}

.ip-list-section {
	margin-top: 20px;
	padding: 15px;
	background: #f9f9f9;
	border-radius: 6px;
	border: 1px solid #e0e0e0;
}

:global(.dark) .ip-list-section {
	background: #252525;
	border-color: #3c3c3c;
}

.ip-list-header {
	margin-bottom: 12px;
}

.ip-list-header h5 {
	margin: 0 0 4px 0;
	font-size: 14px;
	font-weight: 600;
}

.ip-list-desc {
	font-size: 12px;
	color: #666;
}

:global(.dark) .ip-list-desc {
	color: #999;
}

.ip-input-row {
	display: flex;
	gap: 10px;
	margin-bottom: 12px;
}

.ip-input-row .setting-input {
	flex: 1;
}

.ip-list {
	max-height: 150px;
	overflow-y: auto;
	border: 1px solid #e0e0e0;
	border-radius: 4px;
	background: #fff;
}

:global(.dark) .ip-list {
	background: #1e1e1e;
	border-color: #3c3c3c;
}

.ip-list-empty {
	padding: 15px;
	text-align: center;
	color: #999;
	font-size: 13px;
}

.ip-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	border-bottom: 1px solid #f0f0f0;
}

:global(.dark) .ip-item {
	border-color: #2d2d2d;
}

.ip-item:last-child {
	border-bottom: none;
}

.ip-text {
	font-family: monospace;
	font-size: 13px;
}

.ip-remove-btn {
	background: none;
	border: none;
	color: #c00;
	font-size: 18px;
	cursor: pointer;
	padding: 0 4px;
	line-height: 1;
}

.ip-remove-btn:hover {
	color: #f00;
}

.access-warning {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-top: 15px;
	padding: 12px;
	background: #fff3cd;
	border: 1px solid #ffc107;
	border-radius: 4px;
}

:global(.dark) .access-warning {
	background: #3d3000;
	border-color: #856404;
}

.warning-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	background: #ffc107;
	color: #000;
	border-radius: 50%;
	font-weight: bold;
	font-size: 12px;
}

.warning-text {
	font-size: 13px;
	color: #856404;
}

:global(.dark) .warning-text {
	color: #ffc107;
}

/* AI Settings Coming Soon */
.ai-coming-soon {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	text-align: center;
}

.ai-icon {
	width: 80px;
	height: 80px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 20px;
	margin-bottom: 20px;
	color: #fff;
	animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
	0%, 100% {
		transform: scale(1);
		box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
	}
	50% {
		transform: scale(1.05);
		box-shadow: 0 0 20px 10px rgba(102, 126, 234, 0);
	}
}

.ai-coming-soon h4 {
	margin: 0 0 10px 0;
	font-size: 20px;
	font-weight: 600;
	color: #333;
}

:global(.dark) .ai-coming-soon h4 {
	color: #e8e8e8;
}

.ai-description {
	margin: 0 0 25px 0;
	color: #666;
	font-size: 14px;
	max-width: 350px;
	line-height: 1.6;
}

:global(.dark) .ai-description {
	color: #999;
}

.ai-features {
	display: flex;
	flex-direction: column;
	gap: 12px;
	text-align: left;
}

.ai-feature-item {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 13px;
	color: #555;
}

:global(.dark) .ai-feature-item {
	color: #aaa;
}

.feature-bullet {
	width: 8px;
	height: 8px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 50%;
	flex-shrink: 0;
}

/* Mobile */
@media screen and (max-width: 600px) {
	.settings-modal {
		width: 95%;
		max-height: 95vh;
	}

	.setting-item {
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
	}

	.setting-select,
	.theme-select {
		width: 100%;
	}
}
</style>

<style>
/* Dark Mode - Settings Modal (unscoped for proper cascade) */
.dark .settings-modal {
	background: #1e1e1e !important;
	color: #e8e8e8;
}

.dark .modal-header {
	border-color: #3c3c3c;
}

.dark .close-btn {
	color: #999;
}

.dark .close-btn:hover {
	color: #fff;
}

.dark .settings-section h4 {
	color: #999;
}

.dark .setting-item {
	border-color: #2d2d2d;
}

.dark .setting-desc {
	color: #999;
}

.dark .setting-select {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #e8e8e8;
}

.dark .size-btn {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #e8e8e8;
}

.dark .size-btn:hover {
	background: #3c3c3c;
}

.dark .theme-preview {
	border-color: #3c3c3c;
}

.dark .preview-label {
	background: #252525;
	color: #999;
	border-color: #3c3c3c;
}

.dark .modal-footer {
	border-color: #3c3c3c;
}

.dark .btn-secondary {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #e8e8e8;
}

.dark .btn-secondary:hover {
	background: #3c3c3c;
}

.dark .btn-primary {
	background: #0e639c;
}

.dark .btn-primary:hover {
	background: #1177bb;
}
</style>
