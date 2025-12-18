<template>
	<div class="json-editor" :class="themeClass" :style="editorVars">
		<div class="editor-container" :style="{height: height}">
			<div class="line-numbers" ref="lineNumbersRef">
				<div v-for="n in lineCount" :key="n" class="line-num">{{ n }}</div>
			</div>
			<div class="editor-wrapper">
				<textarea
					ref="textareaRef"
					:value="modelValue"
					@input="handleInput"
					@scroll="syncScroll"
					@keydown="handleKeydown"
					class="editor-textarea"
					spellcheck="false"
					:placeholder="placeholder"
					:readonly="readonly"
				></textarea>
				<pre class="syntax-highlight" ref="highlightRef" aria-hidden="true"><code v-html="highlightedCode"></code></pre>
			</div>
		</div>
		<div class="editor-footer">
			<span class="status" :class="{error: !isValidJson, valid: isValidJson && modelValue.trim()}">
				{{ !modelValue.trim() ? '' : isValidJson ? '✓ Valid JSON' : '✗ Invalid JSON' }}
			</span>
			<div class="actions" v-if="showActions && !readonly">
				<button type="button" class="action-btn" @click="format" title="Format">Format</button>
				<button type="button" class="action-btn" @click="compact" title="Compact">Compact</button>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, watch, nextTick} from 'vue'
import {useAppStore} from '../stores/app.js'

const store = useAppStore()

const props = defineProps({
	modelValue: {
		type: String,
		default: ''
	},
	placeholder: {
		type: String,
		default: '{\n  \n}'
	},
	height: {
		type: String,
		default: '300px'
	},
	showActions: {
		type: Boolean,
		default: true
	},
	readonly: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['update:modelValue'])

const textareaRef = ref(null)
const lineNumbersRef = ref(null)
const highlightRef = ref(null)

const lineCount = computed(() => {
	return Math.max((props.modelValue || '').split('\n').length, 1)
})

// Theme class based on store
const themeClass = computed(() => {
	const theme = store.editorTheme || 'default'
	return `theme-${theme.replace(/\s+/g, '-')}`
})

// CSS variables for font size
const editorVars = computed(() => ({
	'--editor-font-size': (store.editorFontSize || 13) + 'px',
	'--editor-line-height': Math.round((store.editorFontSize || 13) * 1.5) + 'px'
}))

const isValidJson = computed(() => {
	try {
		if (!props.modelValue || !props.modelValue.trim()) return true
		JSON.parse(props.modelValue)
		return true
	} catch {
		return false
	}
})

const highlightedCode = computed(() => {
	return highlightJson(props.modelValue || ' ')
})

function escapeHtml(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightJson(code) {
	if (!code) return ' '

	let result = escapeHtml(code)

	// Highlight strings first (including keys)
	result = result.replace(/"([^"\\]|\\.)*"/g, match => {
		return `<span class="hl-string">${match}</span>`
	})

	// Highlight numbers
	result = result.replace(/\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="hl-number">$1</span>')

	// Highlight booleans
	result = result.replace(/\b(true|false)\b/g, '<span class="hl-boolean">$1</span>')

	// Highlight null
	result = result.replace(/\b(null)\b/g, '<span class="hl-null">$1</span>')

	// Convert string keys to key style (strings before colon)
	result = result.replace(/<span class="hl-string">("(?:[^"\\]|\\.)*")<\/span>(\s*:)/g, '<span class="hl-key">$1</span>$2')

	// Highlight brackets and braces
	result = result.replace(/([{}[\]])/g, '<span class="hl-bracket">$1</span>')

	// Highlight colons
	result = result.replace(/(:)(\s*)/g, '<span class="hl-colon">$1</span>$2')

	// Highlight commas
	result = result.replace(/(,)/g, '<span class="hl-comma">$1</span>')

	// Highlight MongoDB types if present in strings
	result = result.replace(/\b(ObjectId|ISODate|NumberLong|NumberDecimal|BinData|Timestamp|UUID)\s*\(/g, '<span class="hl-mongo-type">$1</span>(')

	return result
}

function handleInput(e) {
	emit('update:modelValue', e.target.value)
	nextTick(syncScroll)
}

function syncScroll() {
	if (highlightRef.value && textareaRef.value) {
		highlightRef.value.scrollTop = textareaRef.value.scrollTop
		highlightRef.value.scrollLeft = textareaRef.value.scrollLeft
	}
	if (lineNumbersRef.value && textareaRef.value) {
		lineNumbersRef.value.scrollTop = textareaRef.value.scrollTop
	}
}

function handleKeydown(e) {
	if (props.readonly) return

	// Tab key inserts 2 spaces
	if (e.key === 'Tab') {
		e.preventDefault()
		const start = e.target.selectionStart
		const end = e.target.selectionEnd
		const value = e.target.value

		const newValue = value.substring(0, start) + '  ' + value.substring(end)
		e.target.value = newValue
		e.target.selectionStart = e.target.selectionEnd = start + 2
		emit('update:modelValue', newValue)
	}

	// Enter key - auto indent
	if (e.key === 'Enter') {
		const start = e.target.selectionStart
		const value = e.target.value

		// Get current line's indentation
		const lineStart = value.lastIndexOf('\n', start - 1) + 1
		const line = value.substring(lineStart, start)
		const indent = line.match(/^\s*/)[0]

		// Check if we're after an opening bracket
		const charBefore = value[start - 1]
		const charAfter = value[start]

		if ((charBefore === '{' || charBefore === '[') && (charAfter === '}' || charAfter === ']')) {
			e.preventDefault()
			const newValue = value.substring(0, start) + '\n' + indent + '  \n' + indent + value.substring(start)
			e.target.value = newValue
			e.target.selectionStart = e.target.selectionEnd = start + indent.length + 3
			emit('update:modelValue', newValue)
		} else if (charBefore === '{' || charBefore === '[') {
			e.preventDefault()
			const newValue = value.substring(0, start) + '\n' + indent + '  ' + value.substring(start)
			e.target.value = newValue
			e.target.selectionStart = e.target.selectionEnd = start + indent.length + 3
			emit('update:modelValue', newValue)
		}
	}

	// Auto-close brackets (only for { and [, NOT for quotes)
	const pairs = {'{': '}', '[': ']'}
	if (pairs[e.key] && !props.readonly) {
		const start = e.target.selectionStart
		const end = e.target.selectionEnd
		const value = e.target.value

		// Only auto-close if nothing is selected
		if (start === end) {
			e.preventDefault()
			const newValue = value.substring(0, start) + e.key + pairs[e.key] + value.substring(end)
			e.target.value = newValue
			e.target.selectionStart = e.target.selectionEnd = start + 1
			emit('update:modelValue', newValue)
		}
	}
}

function format() {
	try {
		const parsed = JSON.parse(props.modelValue)
		const formatted = JSON.stringify(parsed, null, 2)
		emit('update:modelValue', formatted)
	} catch (e) {
		// Invalid JSON, can't format
	}
}

function compact() {
	try {
		const parsed = JSON.parse(props.modelValue)
		const compacted = JSON.stringify(parsed)
		emit('update:modelValue', compacted)
	} catch (e) {
		// Invalid JSON, can't compact
	}
}

function isValid() {
	return isValidJson.value
}

function getParsedValue() {
	try {
		return JSON.parse(props.modelValue)
	} catch {
		return null
	}
}

defineExpose({isValid, getParsedValue, format, compact})

// Sync scroll on mount and value change
watch(
	() => props.modelValue,
	() => {
		nextTick(syncScroll)
	}
)
</script>

<style scoped>
.json-editor {
	--editor-font-size: 13px;
	--editor-line-height: 20px;
	/* Default theme colors */
	--bg: #1e1e1e;
	--lines-bg: #252526;
	--text: #e8e8e8;
	--line-num: #858585;
	--border: #3c3c3c;
	--caret: #fff;
	--hl-key: #9cdcfe;
	--hl-string: #ce9178;
	--hl-number: #b5cea8;
	--hl-boolean: #569cd6;
	--hl-null: #569cd6;
	--hl-bracket: #ffd700;
	--hl-colon: #e8e8e8;
	--hl-mongo: #4ec9b0;

	border: 1px solid var(--border);
	border-radius: 6px;
	overflow: hidden;
	background: var(--bg);
}

.editor-container {
	position: relative;
	display: flex;
	overflow: hidden;
}

.line-numbers {
	background: var(--lines-bg);
	color: var(--line-num);
	padding: 10px 0;
	text-align: right;
	user-select: none;
	overflow: hidden;
	min-width: 45px;
	border-right: 1px solid var(--border);
	font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
	font-size: var(--editor-font-size);
	line-height: var(--editor-line-height);
}

.line-num {
	padding: 0 10px 0 5px;
}

.editor-wrapper {
	flex: 1;
	position: relative;
	overflow: hidden;
}

.editor-textarea,
.syntax-highlight {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 10px 12px;
	font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
	font-size: var(--editor-font-size);
	line-height: var(--editor-line-height);
	white-space: pre;
	overflow: auto;
	border: none;
	outline: none;
	resize: none;
	box-sizing: border-box;
}

.editor-textarea {
	background: transparent;
	color: transparent;
	caret-color: var(--caret);
	z-index: 2;
}

.editor-textarea::placeholder {
	color: var(--line-num);
}

.syntax-highlight {
	background: var(--bg);
	color: var(--text);
	pointer-events: none;
	z-index: 1;
}

.syntax-highlight code {
	font-family: inherit;
}

/* Syntax highlighting colors */
:deep(.hl-key) {
	color: var(--hl-key);
}
:deep(.hl-string) {
	color: var(--hl-string);
}
:deep(.hl-number) {
	color: var(--hl-number);
}
:deep(.hl-boolean) {
	color: var(--hl-boolean);
	font-weight: 600;
}
:deep(.hl-null) {
	color: var(--hl-null);
	font-style: italic;
}
:deep(.hl-bracket) {
	color: var(--hl-bracket);
	font-weight: 600;
}
:deep(.hl-colon) {
	color: var(--hl-colon);
}
:deep(.hl-comma) {
	color: var(--hl-colon);
}
:deep(.hl-mongo-type) {
	color: var(--hl-mongo);
	font-weight: 600;
}

.editor-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 6px 12px;
	background: var(--lines-bg);
	border-top: 1px solid var(--border);
	font-size: 11px;
	min-height: 28px;
}

.status {
	color: var(--line-num);
}
.status.valid {
	color: #89d185;
}
.status.error {
	color: #f48771;
}

.actions {
	display: flex;
	gap: 8px;
}

.action-btn {
	background: #0e639c;
	color: #fff;
	border: none;
	padding: 3px 10px;
	border-radius: 3px;
	cursor: pointer;
	font-size: 11px;
	transition: background 0.2s;
}

.action-btn:hover {
	background: #1177bb;
}

/* Scrollbar */
.editor-textarea::-webkit-scrollbar,
.syntax-highlight::-webkit-scrollbar,
.line-numbers::-webkit-scrollbar {
	width: 10px;
	height: 10px;
}

.editor-textarea::-webkit-scrollbar-track,
.syntax-highlight::-webkit-scrollbar-track,
.line-numbers::-webkit-scrollbar-track {
	background: var(--bg);
}

.editor-textarea::-webkit-scrollbar-thumb,
.syntax-highlight::-webkit-scrollbar-thumb,
.line-numbers::-webkit-scrollbar-thumb {
	background: var(--border);
	border-radius: 5px;
}

.editor-textarea::-webkit-scrollbar-thumb:hover,
.syntax-highlight::-webkit-scrollbar-thumb:hover,
.line-numbers::-webkit-scrollbar-thumb:hover {
	background: var(--line-num);
}

.editor-textarea::-webkit-scrollbar-corner,
.syntax-highlight::-webkit-scrollbar-corner {
	background: var(--bg);
}

/* ============================================
   THEME DEFINITIONS
   ============================================ */

/* Monokai */
.theme-monokai {
	--bg: #272822;
	--lines-bg: #1e1f1c;
	--text: #f8f8f2;
	--line-num: #90908a;
	--border: #3e3d32;
	--caret: #f8f8f0;
	--hl-key: #66d9ef;
	--hl-string: #e6db74;
	--hl-number: #ae81ff;
	--hl-boolean: #ae81ff;
	--hl-null: #ae81ff;
	--hl-bracket: #f8f8f2;
	--hl-colon: #f8f8f2;
	--hl-mongo: #a6e22e;
}

/* Dracula */
.theme-dracula {
	--bg: #282a36;
	--lines-bg: #21222c;
	--text: #f8f8f2;
	--line-num: #6272a4;
	--border: #44475a;
	--caret: #f8f8f2;
	--hl-key: #8be9fd;
	--hl-string: #f1fa8c;
	--hl-number: #bd93f9;
	--hl-boolean: #bd93f9;
	--hl-null: #bd93f9;
	--hl-bracket: #ff79c6;
	--hl-colon: #f8f8f2;
	--hl-mongo: #50fa7b;
}

/* Material */
.theme-material {
	--bg: #263238;
	--lines-bg: #1e272c;
	--text: #eeffff;
	--line-num: #546e7a;
	--border: #37474f;
	--caret: #ffcc00;
	--hl-key: #82aaff;
	--hl-string: #c3e88d;
	--hl-number: #f78c6c;
	--hl-boolean: #89ddff;
	--hl-null: #89ddff;
	--hl-bracket: #89ddff;
	--hl-colon: #eeffff;
	--hl-mongo: #c792ea;
}

/* Nord */
.theme-nord {
	--bg: #2e3440;
	--lines-bg: #272c36;
	--text: #d8dee9;
	--line-num: #4c566a;
	--border: #3b4252;
	--caret: #d8dee9;
	--hl-key: #88c0d0;
	--hl-string: #a3be8c;
	--hl-number: #b48ead;
	--hl-boolean: #81a1c1;
	--hl-null: #81a1c1;
	--hl-bracket: #eceff4;
	--hl-colon: #d8dee9;
	--hl-mongo: #8fbcbb;
}

/* Cobalt */
.theme-cobalt {
	--bg: #002240;
	--lines-bg: #001b33;
	--text: #ffffff;
	--line-num: #0088ff;
	--border: #003366;
	--caret: #ffffff;
	--hl-key: #ffee80;
	--hl-string: #3ad900;
	--hl-number: #ff628c;
	--hl-boolean: #ff9d00;
	--hl-null: #ff9d00;
	--hl-bracket: #ffffff;
	--hl-colon: #ffffff;
	--hl-mongo: #80ffbb;
}

/* Solarized Dark */
.theme-solarized-dark {
	--bg: #002b36;
	--lines-bg: #073642;
	--text: #839496;
	--line-num: #586e75;
	--border: #073642;
	--caret: #839496;
	--hl-key: #268bd2;
	--hl-string: #2aa198;
	--hl-number: #d33682;
	--hl-boolean: #cb4b16;
	--hl-null: #cb4b16;
	--hl-bracket: #93a1a1;
	--hl-colon: #839496;
	--hl-mongo: #859900;
}

/* Gruvbox Dark */
.theme-gruvbox-dark {
	--bg: #282828;
	--lines-bg: #1d2021;
	--text: #ebdbb2;
	--line-num: #928374;
	--border: #3c3836;
	--caret: #ebdbb2;
	--hl-key: #83a598;
	--hl-string: #b8bb26;
	--hl-number: #d3869b;
	--hl-boolean: #fe8019;
	--hl-null: #fe8019;
	--hl-bracket: #fabd2f;
	--hl-colon: #ebdbb2;
	--hl-mongo: #8ec07c;
}

/* One Dark */
.theme-one-dark {
	--bg: #282c34;
	--lines-bg: #21252b;
	--text: #abb2bf;
	--line-num: #636d83;
	--border: #3e4451;
	--caret: #528bff;
	--hl-key: #e06c75;
	--hl-string: #98c379;
	--hl-number: #d19a66;
	--hl-boolean: #56b6c2;
	--hl-null: #56b6c2;
	--hl-bracket: #c678dd;
	--hl-colon: #abb2bf;
	--hl-mongo: #61afef;
}

/* Twilight */
.theme-twilight {
	--bg: #141414;
	--lines-bg: #1a1a1a;
	--text: #f7f7f7;
	--line-num: #5f5a60;
	--border: #2a2a2a;
	--caret: #a7a7a7;
	--hl-key: #7587a6;
	--hl-string: #8f9d6a;
	--hl-number: #cf6a4c;
	--hl-boolean: #cf6a4c;
	--hl-null: #cf6a4c;
	--hl-bracket: #cda869;
	--hl-colon: #f7f7f7;
	--hl-mongo: #9b859d;
}

/* Ambiance */
.theme-ambiance {
	--bg: #202020;
	--lines-bg: #1a1a1a;
	--text: #e6e1dc;
	--line-num: #555;
	--border: #3d3d3d;
	--caret: #e6e1dc;
	--hl-key: #e6e1dc;
	--hl-string: #65b042;
	--hl-number: #3387cc;
	--hl-boolean: #cf6a4c;
	--hl-null: #cf6a4c;
	--hl-bracket: #cda869;
	--hl-colon: #e6e1dc;
	--hl-mongo: #8f9d6a;
}

/* Light Themes */

/* Eclipse */
.theme-eclipse {
	--bg: #ffffff;
	--lines-bg: #f7f7f7;
	--text: #000000;
	--line-num: #999999;
	--border: #d4d4d4;
	--caret: #000000;
	--hl-key: #0000c0;
	--hl-string: #2a00ff;
	--hl-number: #116644;
	--hl-boolean: #7f0055;
	--hl-null: #7f0055;
	--hl-bracket: #000000;
	--hl-colon: #000000;
	--hl-mongo: #7f0055;
}

/* Solarized Light */
.theme-solarized-light {
	--bg: #fdf6e3;
	--lines-bg: #eee8d5;
	--text: #657b83;
	--line-num: #93a1a1;
	--border: #eee8d5;
	--caret: #657b83;
	--hl-key: #268bd2;
	--hl-string: #2aa198;
	--hl-number: #d33682;
	--hl-boolean: #cb4b16;
	--hl-null: #cb4b16;
	--hl-bracket: #586e75;
	--hl-colon: #657b83;
	--hl-mongo: #859900;
}

/* IDEA */
.theme-idea {
	--bg: #ffffff;
	--lines-bg: #f7f7f7;
	--text: #000000;
	--line-num: #999999;
	--border: #d4d4d4;
	--caret: #000000;
	--hl-key: #000080;
	--hl-string: #008000;
	--hl-number: #0000ff;
	--hl-boolean: #000080;
	--hl-null: #000080;
	--hl-bracket: #000000;
	--hl-colon: #000000;
	--hl-mongo: #660e7a;
}

/* Neo */
.theme-neo,
.theme-neat,
.theme-elegant {
	--bg: #ffffff;
	--lines-bg: #f5f5f5;
	--text: #2e383c;
	--line-num: #aaaaaa;
	--border: #e0e0e0;
	--caret: #2e383c;
	--hl-key: #2e95d3;
	--hl-string: #00a67d;
	--hl-number: #9c3328;
	--hl-boolean: #a535ae;
	--hl-null: #a535ae;
	--hl-bracket: #2e383c;
	--hl-colon: #2e383c;
	--hl-mongo: #9c3328;
}

/* Yeti */
.theme-yeti {
	--bg: #eceae8;
	--lines-bg: #e0ddd9;
	--text: #546e7a;
	--line-num: #9fb4bf;
	--border: #d4cfc9;
	--caret: #546e7a;
	--hl-key: #9fb4bf;
	--hl-string: #96c0d8;
	--hl-number: #a074c4;
	--hl-boolean: #a074c4;
	--hl-null: #a074c4;
	--hl-bracket: #546e7a;
	--hl-colon: #546e7a;
	--hl-mongo: #55b5db;
}
</style>
