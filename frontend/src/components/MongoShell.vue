<template>
	<div class="mongo-shell" :style="shellStyles">
		<!-- Header -->
		<div class="shell-header">
			<div class="shell-title">
				<span class="shell-icon">&#62;_</span>
				<span>{{ $t('mongoShell') }}</span>
			</div>
			<div class="shell-controls">
				<select v-model="selectedDb" class="db-select" @change="onDbChange">
					<option v-for="db in databases" :key="db" :value="db">{{ db }}</option>
				</select>
				<button class="shell-btn" @click="clearOutput" :title="$t('clear')">
					<span class="btn-icon">&#x2715;</span>
					{{ $t('clear') }}
				</button>
			</div>
		</div>

		<!-- Output Area -->
		<div class="shell-output" ref="outputRef">
			<!-- Welcome message -->
			<div class="output-entry welcome" v-if="outputHistory.length === 0">
				<div class="welcome-text">MongoDB Shell</div>
				<div class="welcome-hint">{{ $t('shellWelcome') }}</div>
			</div>

			<!-- History entries -->
			<div v-for="(entry, i) in outputHistory" :key="i" class="output-entry">
				<div class="entry-command" :style="{fontSize: fontSize}">
					<span class="prompt">{{ entry.db }} &gt;</span>
					<span class="command-text">{{ entry.command }}</span>
				</div>
				<div class="entry-result" :class="{'is-error': entry.error}">
					<pre v-if="entry.result" :style="{fontSize: fontSize, lineHeight: lineHeight}">{{ entry.result }}</pre>
					<span v-if="entry.duration" class="duration">{{ entry.duration }}ms</span>
				</div>
			</div>
		</div>

		<!-- Input Area -->
		<div class="shell-input-area">
			<div class="input-header">
				<span class="input-prompt">{{ selectedDb }} &gt;</span>
				<div class="input-mode" v-if="isMultiline">
					<span class="mode-badge">{{ $t('multilineMode') }}</span>
					<span class="mode-hint">Shift+Enter: {{ $t('newLine') }}, Enter: {{ $t('execute') }}</span>
				</div>
			</div>

			<div class="input-container">
				<textarea
					ref="inputRef"
					v-model="inputText"
					@keydown="handleKeydown"
					@input="handleInput"
					class="shell-input"
					:placeholder="$t('shellPlaceholder')"
					:rows="inputRows"
					spellcheck="false"
					:style="{fontSize: fontSize, lineHeight: lineHeight}"
				></textarea>

				<!-- Autocomplete dropdown -->
				<div v-if="showAutocomplete" class="autocomplete-dropdown">
					<div
						v-for="(suggestion, i) in filteredSuggestions"
						:key="i"
						class="autocomplete-item"
						:class="{active: i === autocompleteIndex}"
						@click="selectSuggestion(suggestion)"
					>
						<span class="suggestion-text">{{ suggestion.text }}</span>
						<span class="suggestion-type">{{ suggestion.type }}</span>
					</div>
				</div>
			</div>

			<div class="input-actions">
				<button class="run-btn" @click="executeCommand" :disabled="!inputText.trim()">
					<span class="run-icon">&#9654;</span>
					{{ $t('execute') }}
				</button>
			</div>
		</div>

		<!-- Quick Commands -->
		<div class="quick-commands">
			<span class="quick-label">{{ $t('quickCommands') }}:</span>
			<button v-for="cmd in quickCommands" :key="cmd.cmd" @click="runQuickCommand(cmd.cmd)" class="quick-btn" :title="cmd.desc">
				{{ cmd.label }}
			</button>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, watch, nextTick, onMounted} from 'vue'
import {api} from '../api/index.js'
import {useAppStore} from '../stores/app.js'

const store = useAppStore()

const props = defineProps({
	connectionId: {
		type: String,
		required: true
	},
	databases: {
		type: Array,
		default: () => []
	},
	initialDb: {
		type: String,
		default: 'admin'
	}
})

const emit = defineEmits(['execute', 'dbChange'])

// State
const selectedDb = ref(props.initialDb)
const inputText = ref('')
const outputHistory = ref([])
const commandHistory = ref([])
const historyIndex = ref(-1)
const inputRef = ref(null)
const outputRef = ref(null)
const showAutocomplete = ref(false)
const autocompleteIndex = ref(0)
const isMultiline = ref(false)

// Computed
const inputRows = computed(() => {
	const lines = inputText.value.split('\n').length
	return Math.min(Math.max(lines, 1), 10)
})

const fontSize = computed(() => store.editorFontSize + 'px')
const lineHeight = computed(() => Math.round(store.editorFontSize * 1.5) + 'px')

// Theme color schemes (same as JsonEditor)
const themes = {
	default: {bg: '#1e1e1e', linesBg: '#252526', text: '#e8e8e8', lineNum: '#858585', border: '#3c3c3c', key: '#9cdcfe', string: '#ce9178', caret: '#fff'},
	monokai: {bg: '#272822', linesBg: '#1e1f1c', text: '#f8f8f2', lineNum: '#90908a', border: '#3e3d32', key: '#66d9ef', string: '#e6db74', caret: '#f8f8f0'},
	dracula: {bg: '#282a36', linesBg: '#21222c', text: '#f8f8f2', lineNum: '#6272a4', border: '#44475a', key: '#8be9fd', string: '#f1fa8c', caret: '#f8f8f2'},
	material: {bg: '#263238', linesBg: '#1e272c', text: '#eeffff', lineNum: '#546e7a', border: '#37474f', key: '#82aaff', string: '#c3e88d', caret: '#ffcc00'},
	nord: {bg: '#2e3440', linesBg: '#272c36', text: '#d8dee9', lineNum: '#4c566a', border: '#3b4252', key: '#88c0d0', string: '#a3be8c', caret: '#d8dee9'},
	twilight: {bg: '#141414', linesBg: '#1a1a1a', text: '#f7f7f7', lineNum: '#5f5a60', border: '#2a2a2a', key: '#7587a6', string: '#8f9d6a', caret: '#a7a7a7'},
	cobalt: {bg: '#002240', linesBg: '#001b33', text: '#ffffff', lineNum: '#0088ff', border: '#003366', key: '#ffee80', string: '#3ad900', caret: '#ffffff'},
	ambiance: {bg: '#202020', linesBg: '#1a1a1a', text: '#e6e1dc', lineNum: '#555', border: '#3d3d3d', key: '#e6e1dc', string: '#65b042', caret: '#e6e1dc'},
	'solarized-dark': {
		bg: '#002b36',
		linesBg: '#073642',
		text: '#839496',
		lineNum: '#586e75',
		border: '#073642',
		key: '#268bd2',
		string: '#2aa198',
		caret: '#839496'
	},
	'tomorrow-night': {
		bg: '#1d1f21',
		linesBg: '#151618',
		text: '#c5c8c6',
		lineNum: '#969896',
		border: '#373b41',
		key: '#81a2be',
		string: '#b5bd68',
		caret: '#c5c8c6'
	},
	'gruvbox-dark': {
		bg: '#282828',
		linesBg: '#1d2021',
		text: '#ebdbb2',
		lineNum: '#928374',
		border: '#3c3836',
		key: '#83a598',
		string: '#b8bb26',
		caret: '#ebdbb2'
	},
	'oceanic-next': {
		bg: '#1b2b34',
		linesBg: '#152028',
		text: '#d8dee9',
		lineNum: '#65737e',
		border: '#343d46',
		key: '#6699cc',
		string: '#99c794',
		caret: '#d8dee9'
	},
	'ayu-dark': {
		bg: '#0a0e14',
		linesBg: '#050709',
		text: '#b3b1ad',
		lineNum: '#626a73',
		border: '#11151c',
		key: '#59c2ff',
		string: '#c2d94c',
		caret: '#e6b450'
	},
	'one-dark': {
		bg: '#282c34',
		linesBg: '#21252b',
		text: '#abb2bf',
		lineNum: '#636d83',
		border: '#3e4451',
		key: '#e06c75',
		string: '#98c379',
		caret: '#528bff'
	},
	eclipse: {bg: '#ffffff', linesBg: '#f7f7f7', text: '#000000', lineNum: '#999999', border: '#d4d4d4', key: '#0000c0', string: '#2a00ff', caret: '#000000'},
	'solarized-light': {
		bg: '#fdf6e3',
		linesBg: '#eee8d5',
		text: '#657b83',
		lineNum: '#93a1a1',
		border: '#eee8d5',
		key: '#268bd2',
		string: '#2aa198',
		caret: '#657b83'
	},
	'github-light': {
		bg: '#ffffff',
		linesBg: '#f6f8fa',
		text: '#24292e',
		lineNum: '#959da5',
		border: '#e1e4e8',
		key: '#005cc5',
		string: '#032f62',
		caret: '#24292e'
	},
	xcode: {bg: '#ffffff', linesBg: '#f7f7f7', text: '#000000', lineNum: '#999999', border: '#d4d4d4', key: '#c41a16', string: '#c41a16', caret: '#000000'},
	'ayu-light': {
		bg: '#fafafa',
		linesBg: '#f0f0f0',
		text: '#575f66',
		lineNum: '#959da5',
		border: '#e7e8e9',
		key: '#399ee6',
		string: '#86b300',
		caret: '#ff6a00'
	},
	'one-light': {
		bg: '#fafafa',
		linesBg: '#f0f0f0',
		text: '#383a42',
		lineNum: '#9d9d9f',
		border: '#e5e5e6',
		key: '#e45649',
		string: '#50a14f',
		caret: '#526eff'
	}
}

const currentTheme = computed(() => themes[store.editorTheme] || themes['default'])

const shellStyles = computed(() => ({
	'--shell-bg': currentTheme.value.bg,
	'--shell-lines-bg': currentTheme.value.linesBg,
	'--shell-text': currentTheme.value.text,
	'--shell-line-num': currentTheme.value.lineNum,
	'--shell-border': currentTheme.value.border,
	'--shell-key': currentTheme.value.key,
	'--shell-string': currentTheme.value.string,
	'--shell-caret': currentTheme.value.caret
}))

// Quick commands
const quickCommands = [
	{cmd: 'db.getCollectionNames()', label: 'Collections', desc: 'List all collections'},
	{cmd: 'db.stats()', label: 'DB Stats', desc: 'Database statistics'},
	{cmd: 'db.serverStatus()', label: 'Server Status', desc: 'Server status info'},
	{cmd: 'db.currentOp()', label: 'Current Ops', desc: 'Current operations'},
	{cmd: 'show collections', label: 'Show', desc: 'Show collections'}
]

// Autocomplete suggestions
const suggestions = [
	{text: 'db.getCollectionNames()', type: 'method'},
	{text: 'db.stats()', type: 'method'},
	{text: 'db.serverStatus()', type: 'command'},
	{text: 'db.currentOp()', type: 'command'},
	{text: 'db.collection.find()', type: 'query'},
	{text: 'db.collection.findOne()', type: 'query'},
	{text: 'db.collection.countDocuments()', type: 'query'},
	{text: 'db.collection.aggregate()', type: 'query'},
	{text: 'db.collection.insertOne()', type: 'write'},
	{text: 'db.collection.updateOne()', type: 'write'},
	{text: 'db.collection.deleteOne()', type: 'write'},
	{text: 'db.collection.createIndex()', type: 'index'},
	{text: 'db.collection.getIndexes()', type: 'index'},
	{text: 'db.collection.drop()', type: 'danger'}
]

const filteredSuggestions = computed(() => {
	if (!inputText.value.trim()) return []
	const query = inputText.value.toLowerCase()
	return suggestions.filter(s => s.text.toLowerCase().includes(query)).slice(0, 8)
})

// Methods
function handleKeydown(e) {
	// Tab for autocomplete
	if (e.key === 'Tab' && showAutocomplete.value && filteredSuggestions.value.length > 0) {
		e.preventDefault()
		selectSuggestion(filteredSuggestions.value[autocompleteIndex.value])
		return
	}

	// Arrow keys for autocomplete navigation
	if (showAutocomplete.value && filteredSuggestions.value.length > 0) {
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			autocompleteIndex.value = (autocompleteIndex.value + 1) % filteredSuggestions.value.length
			return
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault()
			autocompleteIndex.value = (autocompleteIndex.value - 1 + filteredSuggestions.value.length) % filteredSuggestions.value.length
			return
		}
	}

	// Escape to close autocomplete
	if (e.key === 'Escape') {
		showAutocomplete.value = false
		return
	}

	// Enter to execute (Shift+Enter for new line)
	if (e.key === 'Enter') {
		if (e.shiftKey) {
			isMultiline.value = true
			return // Allow new line
		}
		e.preventDefault()
		if (inputText.value.trim()) {
			executeCommand()
		}
		return
	}

	// Up arrow for command history
	if (e.key === 'ArrowUp' && !isMultiline.value) {
		e.preventDefault()
		if (commandHistory.value.length > 0 && historyIndex.value < commandHistory.value.length - 1) {
			historyIndex.value++
			inputText.value = commandHistory.value[commandHistory.value.length - 1 - historyIndex.value]
		}
		return
	}

	// Down arrow for command history
	if (e.key === 'ArrowDown' && !isMultiline.value) {
		e.preventDefault()
		if (historyIndex.value > 0) {
			historyIndex.value--
			inputText.value = commandHistory.value[commandHistory.value.length - 1 - historyIndex.value]
		} else if (historyIndex.value === 0) {
			historyIndex.value = -1
			inputText.value = ''
		}
		return
	}

	// Ctrl+L to clear
	if (e.ctrlKey && e.key === 'l') {
		e.preventDefault()
		clearOutput()
		return
	}
}

function handleInput() {
	isMultiline.value = inputText.value.includes('\n')
	showAutocomplete.value = inputText.value.length > 0 && !inputText.value.includes('\n')
	autocompleteIndex.value = 0
}

function selectSuggestion(suggestion) {
	inputText.value = suggestion.text
	showAutocomplete.value = false
	inputRef.value?.focus()
}

async function executeCommand() {
	const cmd = inputText.value.trim()
	if (!cmd) return

	// Add to history
	commandHistory.value.push(cmd)
	historyIndex.value = -1

	const startTime = Date.now()

	try {
		let result
		let responseData

		// Try as JSON command first
		if (cmd.startsWith('{')) {
			try {
				const jsonCmd = JSON.parse(cmd)
				const response = await api.post(`/connections/${props.connectionId}/command`, {
					database: selectedDb.value,
					command: jsonCmd
				})
				responseData = response.data
				result = JSON.stringify(response.data, null, 2)
			} catch (parseError) {
				if (parseError.name === 'SyntaxError') {
					throw new Error('Invalid JSON: ' + parseError.message)
				}
				throw parseError
			}
		} else {
			// Execute as shell command
			const response = await api.post(`/connections/${props.connectionId}/shell`, {
				database: selectedDb.value,
				command: cmd
			})
			responseData = response.data
			result = JSON.stringify(response.data, null, 2)

			// Handle "use <database>" command - switch database
			if (responseData.database && responseData.message && responseData.message.startsWith('switched to db')) {
				selectedDb.value = responseData.database
				emit('dbChange', responseData.database)
			}
		}

		const duration = Date.now() - startTime

		outputHistory.value.push({
			db: selectedDb.value,
			command: cmd,
			result: result,
			error: false,
			duration: duration
		})

		emit('execute', {command: cmd, result, success: true})
	} catch (error) {
		const duration = Date.now() - startTime
		const errorMessage = error.response?.data?.error || error.message || 'Unknown error'

		outputHistory.value.push({
			db: selectedDb.value,
			command: cmd,
			result: errorMessage,
			error: true,
			duration: duration
		})

		emit('execute', {command: cmd, error: errorMessage, success: false})
	}

	inputText.value = ''
	isMultiline.value = false
	scrollToBottom()
}

function runQuickCommand(cmd) {
	inputText.value = cmd
	executeCommand()
}

function clearOutput() {
	outputHistory.value = []
}

function onDbChange() {
	emit('dbChange', selectedDb.value)
}

function scrollToBottom() {
	nextTick(() => {
		if (outputRef.value) {
			outputRef.value.scrollTop = outputRef.value.scrollHeight
		}
	})
}

// Watch for database changes
watch(
	() => props.initialDb,
	newDb => {
		if (newDb) {
			selectedDb.value = newDb
		}
	}
)

// Focus input on mount
onMounted(() => {
	inputRef.value?.focus()
})

// Expose methods
defineExpose({
	focus: () => inputRef.value?.focus(),
	clear: clearOutput,
	execute: executeCommand
})
</script>

<style scoped>
.mongo-shell {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: var(--shell-bg, #1e1e1e);
	border: 1px solid var(--shell-border, #333);
	border-radius: 8px;
	overflow: hidden;
	font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
}

/* Header */
.shell-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 15px;
	background: var(--shell-lines-bg, #252526);
	border-bottom: 1px solid var(--shell-border, #3c3c3c);
}

.shell-title {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--shell-string, #4ec9b0);
	font-weight: 600;
	font-size: 14px;
}

.shell-icon {
	font-size: 16px;
	color: var(--shell-key, #569cd6);
}

.shell-controls {
	display: flex;
	align-items: center;
	gap: 10px;
}

.db-select {
	background: var(--shell-lines-bg, #3c3c3c);
	color: var(--shell-text, #d4d4d4);
	border: 1px solid var(--shell-border, #555);
	border-radius: 4px;
	padding: 6px 10px;
	font-size: 13px;
	cursor: pointer;
}

.db-select:hover {
	border-color: #007acc;
}

.shell-btn {
	display: flex;
	align-items: center;
	gap: 5px;
	background: var(--shell-lines-bg, #3c3c3c);
	color: var(--shell-text, #ccc);
	border: 1px solid var(--shell-border, #555);
	border-radius: 4px;
	padding: 6px 12px;
	font-size: 12px;
	cursor: pointer;
	transition: all 0.2s;
}

.shell-btn:hover {
	background: var(--shell-border, #4c4c4c);
}

/* Output Area */
.shell-output {
	flex: 1;
	overflow-y: auto;
	padding: 15px;
	background: var(--shell-bg, #1e1e1e);
}

.output-entry {
	margin-bottom: 15px;
}

.output-entry.welcome {
	text-align: center;
	padding: 40px 20px;
	color: var(--shell-line-num, #858585);
}

.welcome-text {
	font-size: 24px;
	color: var(--shell-string, #4ec9b0);
	margin-bottom: 10px;
}

.welcome-hint {
	font-size: 13px;
}

.entry-command {
	display: flex;
	gap: 8px;
	margin-bottom: 5px;
}

.prompt {
	color: var(--shell-key, #569cd6);
	font-weight: 600;
}

.command-text {
	color: var(--shell-key, #9cdcfe);
	word-break: break-all;
}

.entry-result {
	padding-left: 20px;
	position: relative;
}

.entry-result pre {
	margin: 0;
	color: var(--shell-text, #d4d4d4);
	white-space: pre-wrap;
	word-wrap: break-word;
	font-size: 12px;
	line-height: 1.5;
}

.entry-result.is-error pre {
	color: #f48771;
}

.duration {
	position: absolute;
	right: 0;
	top: 0;
	font-size: 10px;
	color: var(--shell-line-num, #858585);
}

/* Input Area */
.shell-input-area {
	border-top: 1px solid var(--shell-border, #3c3c3c);
	background: var(--shell-lines-bg, #252526);
	padding: 10px 15px;
}

.input-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
}

.input-prompt {
	color: var(--shell-key, #569cd6);
	font-weight: 600;
	font-size: 13px;
}

.input-mode {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 11px;
}

.mode-badge {
	background: #007acc;
	color: #fff;
	padding: 2px 8px;
	border-radius: 10px;
}

.mode-hint {
	color: var(--shell-line-num, #858585);
}

.input-container {
	position: relative;
}

.shell-input {
	width: 100%;
	background: var(--shell-bg, #1e1e1e);
	color: var(--shell-text, #d4d4d4);
	border: 1px solid var(--shell-border, #3c3c3c);
	border-radius: 4px;
	padding: 10px 12px;
	font-family: inherit;
	font-size: 13px;
	line-height: 1.5;
	resize: none;
	outline: none;
	caret-color: var(--shell-caret, #fff);
}

.shell-input:focus {
	border-color: #007acc;
}

.shell-input::placeholder {
	color: var(--shell-line-num, #5a5a5a);
}

/* Autocomplete */
.autocomplete-dropdown {
	position: absolute;
	bottom: 100%;
	left: 0;
	right: 0;
	background: var(--shell-lines-bg, #252526);
	border: 1px solid var(--shell-border, #3c3c3c);
	border-radius: 4px;
	margin-bottom: 5px;
	max-height: 200px;
	overflow-y: auto;
	z-index: 100;
	box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
}

.autocomplete-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	cursor: pointer;
	font-size: 12px;
}

.autocomplete-item:hover,
.autocomplete-item.active {
	background: #094771;
}

.suggestion-text {
	color: var(--shell-text, #d4d4d4);
}

.suggestion-type {
	color: var(--shell-line-num, #858585);
	font-size: 10px;
	padding: 2px 6px;
	background: var(--shell-border, #3c3c3c);
	border-radius: 3px;
}

/* Input Actions */
.input-actions {
	display: flex;
	justify-content: flex-end;
	margin-top: 10px;
}

.run-btn {
	display: flex;
	align-items: center;
	gap: 6px;
	background: #0e639c;
	color: #fff;
	border: none;
	border-radius: 4px;
	padding: 8px 16px;
	font-size: 13px;
	cursor: pointer;
	transition: background 0.2s;
}

.run-btn:hover:not(:disabled) {
	background: #1177bb;
}

.run-btn:disabled {
	background: var(--shell-border, #3c3c3c);
	color: var(--shell-line-num, #858585);
	cursor: not-allowed;
}

.run-icon {
	font-size: 10px;
}

/* Quick Commands */
.quick-commands {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 15px;
	background: var(--shell-lines-bg, #2d2d2d);
	border-top: 1px solid var(--shell-border, #3c3c3c);
	overflow-x: auto;
}

.quick-label {
	color: var(--shell-line-num, #858585);
	font-size: 11px;
	white-space: nowrap;
}

.quick-btn {
	background: var(--shell-border, #3c3c3c);
	color: var(--shell-key, #9cdcfe);
	border: 1px solid var(--shell-border, #555);
	border-radius: 4px;
	padding: 4px 10px;
	font-size: 11px;
	cursor: pointer;
	white-space: nowrap;
	transition: all 0.2s;
}

.quick-btn:hover {
	background: var(--shell-line-num, #4c4c4c);
	border-color: #007acc;
}

/* Scrollbar */
.shell-output::-webkit-scrollbar {
	width: 8px;
}

.shell-output::-webkit-scrollbar-track {
	background: var(--shell-bg, #1e1e1e);
}

.shell-output::-webkit-scrollbar-thumb {
	background: var(--shell-border, #424242);
	border-radius: 4px;
}

.shell-output::-webkit-scrollbar-thumb:hover {
	background: var(--shell-line-num, #555);
}

/* Mobile */
@media screen and (max-width: 768px) {
	.shell-header {
		flex-direction: column;
		gap: 10px;
	}

	.shell-controls {
		width: 100%;
		justify-content: space-between;
	}

	.db-select {
		flex: 1;
	}

	.quick-commands {
		padding: 10px;
	}

	.quick-btn {
		padding: 8px 12px;
		font-size: 12px;
	}

	.shell-input {
		font-size: 16px; /* Prevent zoom on iOS */
	}
}
</style>
