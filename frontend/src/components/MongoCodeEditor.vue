<template>
	<div class="mongo-code-editor" :class="themeClass" ref="containerRef">
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
					@focus="handleFocus"
					@blur="handleBlur"
					class="editor-textarea"
					spellcheck="false"
					:placeholder="placeholder"
					:readonly="readonly"
				></textarea>
			</div>
		</div>

		<!-- Autocomplete dropdown -->
		<div v-if="showAutocomplete && filteredSuggestions.length > 0" class="autocomplete-dropdown" :style="autocompletePosition" ref="autocompleteRef">
			<div
				v-for="(suggestion, index) in filteredSuggestions"
				:key="suggestion.value"
				:class="['autocomplete-item', {active: index === selectedIndex}]"
				@mousedown.prevent="selectSuggestion(suggestion)"
				@mouseenter="selectedIndex = index"
			>
				<span class="suggestion-value">{{ suggestion.value }}</span>
				<span class="suggestion-type" :class="suggestion.category">{{ suggestion.category }}</span>
				<span class="suggestion-desc">{{ suggestion.desc }}</span>
			</div>
		</div>

		<div class="editor-footer" v-if="showFooter">
			<span class="status" :class="{error: !isValidJson, valid: isValidJson && modelValue.trim()}">
				{{ !modelValue.trim() ? '' : isValidJson ? '✓ Valid JSON' : '✗ Invalid JSON' }}
			</span>
			<div class="actions">
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
		default: '200px'
	},
	showFooter: {
		type: Boolean,
		default: false
	},
	readonly: {
		type: Boolean,
		default: false
	},
	// Document fields for autocomplete (from collection data)
	documentFields: {
		type: Array,
		default: () => []
	}
})

const emit = defineEmits(['update:modelValue'])

const textareaRef = ref(null)
const lineNumbersRef = ref(null)
const containerRef = ref(null)
const autocompleteRef = ref(null)

const showAutocomplete = ref(false)
const selectedIndex = ref(0)
const currentWord = ref('')
const cursorPosition = ref(0)
const autocompletePosition = ref({top: '0px', left: '0px'})

const lineCount = computed(() => {
	return Math.max((props.modelValue || '').split('\n').length, 1)
})

// Theme class based on store
const themeClass = computed(() => {
	const theme = store.editorTheme || 'default'
	return `theme-${theme.replace(/\s+/g, '-').toLowerCase()}`
})

const isValidJson = computed(() => {
	try {
		if (!props.modelValue || !props.modelValue.trim()) return true
		JSON.parse(props.modelValue)
		return true
	} catch {
		return false
	}
})

// Base MongoDB/Aggregation suggestions
const baseSuggestions = [
	// Aggregation Pipeline Stages
	{value: '$match', desc: 'Filter documents', category: 'stage'},
	{value: '$project', desc: 'Reshape documents', category: 'stage'},
	{value: '$group', desc: 'Group by expression', category: 'stage'},
	{value: '$sort', desc: 'Sort documents', category: 'stage'},
	{value: '$limit', desc: 'Limit results', category: 'stage'},
	{value: '$skip', desc: 'Skip documents', category: 'stage'},
	{value: '$unwind', desc: 'Deconstruct array', category: 'stage'},
	{value: '$lookup', desc: 'Left outer join', category: 'stage'},
	{value: '$addFields', desc: 'Add new fields', category: 'stage'},
	{value: '$set', desc: 'Add/update fields', category: 'stage'},
	{value: '$unset', desc: 'Remove fields', category: 'stage'},
	{value: '$replaceRoot', desc: 'Replace root document', category: 'stage'},
	{value: '$replaceWith', desc: 'Replace document', category: 'stage'},
	{value: '$count', desc: 'Count documents', category: 'stage'},
	{value: '$out', desc: 'Write to collection', category: 'stage'},
	{value: '$merge', desc: 'Merge into collection', category: 'stage'},
	{value: '$facet', desc: 'Multi-facet aggregation', category: 'stage'},
	{value: '$bucket', desc: 'Bucket by boundaries', category: 'stage'},
	{value: '$bucketAuto', desc: 'Auto-bucket', category: 'stage'},
	{value: '$sortByCount', desc: 'Group and count', category: 'stage'},
	{value: '$sample', desc: 'Random sample', category: 'stage'},
	{value: '$redact', desc: 'Restrict content', category: 'stage'},
	{value: '$geoNear', desc: 'Geospatial near', category: 'stage'},
	{value: '$graphLookup', desc: 'Recursive lookup', category: 'stage'},
	{value: '$unionWith', desc: 'Union collections', category: 'stage'},
	{value: '$setWindowFields', desc: 'Window functions', category: 'stage'},
	{value: '$densify', desc: 'Fill gaps in data', category: 'stage'},
	{value: '$fill', desc: 'Fill null values', category: 'stage'},

	// Query operators
	{value: '$eq', desc: 'Equal to', category: 'query'},
	{value: '$ne', desc: 'Not equal', category: 'query'},
	{value: '$gt', desc: 'Greater than', category: 'query'},
	{value: '$gte', desc: 'Greater than or equal', category: 'query'},
	{value: '$lt', desc: 'Less than', category: 'query'},
	{value: '$lte', desc: 'Less than or equal', category: 'query'},
	{value: '$in', desc: 'In array', category: 'query'},
	{value: '$nin', desc: 'Not in array', category: 'query'},
	{value: '$and', desc: 'Logical AND', category: 'query'},
	{value: '$or', desc: 'Logical OR', category: 'query'},
	{value: '$not', desc: 'Logical NOT', category: 'query'},
	{value: '$nor', desc: 'Logical NOR', category: 'query'},
	{value: '$exists', desc: 'Field exists', category: 'query'},
	{value: '$type', desc: 'Field type', category: 'query'},
	{value: '$regex', desc: 'Regex match', category: 'query'},
	{value: '$expr', desc: 'Aggregation expression', category: 'query'},
	{value: '$elemMatch', desc: 'Array element match', category: 'query'},
	{value: '$all', desc: 'All elements match', category: 'query'},
	{value: '$size', desc: 'Array size', category: 'query'},

	// Expression operators
	{value: '$sum', desc: 'Sum values', category: 'expr'},
	{value: '$avg', desc: 'Average value', category: 'expr'},
	{value: '$min', desc: 'Minimum value', category: 'expr'},
	{value: '$max', desc: 'Maximum value', category: 'expr'},
	{value: '$first', desc: 'First value', category: 'expr'},
	{value: '$last', desc: 'Last value', category: 'expr'},
	{value: '$push', desc: 'Push to array', category: 'expr'},
	{value: '$addToSet', desc: 'Add unique to array', category: 'expr'},
	{value: '$concat', desc: 'Concatenate strings', category: 'expr'},
	{value: '$substr', desc: 'Substring', category: 'expr'},
	{value: '$toLower', desc: 'To lowercase', category: 'expr'},
	{value: '$toUpper', desc: 'To uppercase', category: 'expr'},
	{value: '$trim', desc: 'Trim whitespace', category: 'expr'},
	{value: '$split', desc: 'Split string', category: 'expr'},
	{value: '$arrayElemAt', desc: 'Array element at index', category: 'expr'},
	{value: '$filter', desc: 'Filter array', category: 'expr'},
	{value: '$map', desc: 'Map array', category: 'expr'},
	{value: '$reduce', desc: 'Reduce array', category: 'expr'},
	{value: '$cond', desc: 'Conditional', category: 'expr'},
	{value: '$ifNull', desc: 'If null default', category: 'expr'},
	{value: '$switch', desc: 'Switch case', category: 'expr'},
	{value: '$dateToString', desc: 'Date to string', category: 'expr'},
	{value: '$dateFromString', desc: 'String to date', category: 'expr'},
	{value: '$year', desc: 'Get year', category: 'expr'},
	{value: '$month', desc: 'Get month', category: 'expr'},
	{value: '$dayOfMonth', desc: 'Get day', category: 'expr'},
	{value: '$hour', desc: 'Get hour', category: 'expr'},
	{value: '$minute', desc: 'Get minute', category: 'expr'},
	{value: '$second', desc: 'Get second', category: 'expr'},
	{value: '$toInt', desc: 'Convert to int', category: 'expr'},
	{value: '$toString', desc: 'Convert to string', category: 'expr'},
	{value: '$toDouble', desc: 'Convert to double', category: 'expr'},
	{value: '$toBool', desc: 'Convert to boolean', category: 'expr'},
	{value: '$toDate', desc: 'Convert to date', category: 'expr'},
	{value: '$toObjectId', desc: 'Convert to ObjectId', category: 'expr'},

	// MongoDB types
	{value: 'ObjectId("', desc: 'MongoDB ObjectId', category: 'type'},
	{value: 'ISODate("', desc: 'MongoDB Date', category: 'type'},
	{value: 'NumberLong(', desc: 'Long integer', category: 'type'},
	{value: 'NumberDecimal("', desc: 'Decimal128', category: 'type'},

	// Common values
	{value: 'true', desc: 'Boolean true', category: 'value'},
	{value: 'false', desc: 'Boolean false', category: 'value'},
	{value: 'null', desc: 'Null value', category: 'value'}
]

// Combined suggestions (document fields + base operators)
const suggestions = computed(() => {
	// Convert documentFields to suggestions format
	const fieldSuggestions = props.documentFields.map(f => ({
		value: f.path,
		desc: f.type || 'field',
		category: 'field'
	}))
	// Fields first, then operators
	return [...fieldSuggestions, ...baseSuggestions]
})

// Filter suggestions based on current input
const filteredSuggestions = computed(() => {
	if (!currentWord.value || currentWord.value.length < 1) return []

	const word = currentWord.value.toLowerCase()
	return suggestions.value
		.filter(s => s.value.toLowerCase().startsWith(word) || s.value.toLowerCase().includes(word))
		.sort((a, b) => {
			// Prioritize exact prefix matches
			const aStarts = a.value.toLowerCase().startsWith(word)
			const bStarts = b.value.toLowerCase().startsWith(word)
			if (aStarts && !bStarts) return -1
			if (!aStarts && bStarts) return 1
			// Then prioritize fields over operators
			if (a.category === 'field' && b.category !== 'field') return -1
			if (a.category !== 'field' && b.category === 'field') return 1
			return a.value.localeCompare(b.value)
		})
		.slice(0, 12)
})

// Get the current word being typed
function getCurrentWord(value, position) {
	const beforeCursor = value.substring(0, position)
	// Find the start of the current word (after space, :, {, [, (, or ,)
	const match = beforeCursor.match(/[^\s:{[()\],}"']*$/)
	return match ? match[0].replace(/^["']/, '') : ''
}

function updateAutocompletePosition() {
	if (!textareaRef.value || !containerRef.value) return

	const textarea = textareaRef.value
	const container = containerRef.value
	const text = textarea.value.substring(0, textarea.selectionStart)
	const lines = text.split('\n')
	const currentLine = lines.length
	const currentCol = lines[lines.length - 1].length

	// Get container's position on screen
	const containerRect = container.getBoundingClientRect()

	// Calculate position relative to viewport
	const lineHeight = 20
	const charWidth = 8
	const scrollTop = textarea.scrollTop

	// Position relative to container, accounting for scroll
	const relativeTop = currentLine * lineHeight - scrollTop + 10
	const relativeLeft = Math.min(currentCol * charWidth + 50, 300)

	// Convert to fixed position (viewport coordinates)
	let top = containerRect.top + relativeTop
	let left = containerRect.left + relativeLeft

	// Check if dropdown would go below viewport
	const dropdownHeight = 250 // max-height of dropdown
	const viewportHeight = window.innerHeight

	if (top + dropdownHeight > viewportHeight - 20) {
		// Show above the cursor instead
		top = containerRect.top + relativeTop - dropdownHeight - lineHeight
	}

	// Ensure left doesn't go off-screen
	const dropdownWidth = 350
	if (left + dropdownWidth > window.innerWidth - 20) {
		left = window.innerWidth - dropdownWidth - 20
	}

	autocompletePosition.value = {
		top: `${Math.max(10, top)}px`,
		left: `${Math.max(10, left)}px`
	}
}

function handleInput(e) {
	const value = e.target.value
	emit('update:modelValue', value)

	cursorPosition.value = e.target.selectionStart
	currentWord.value = getCurrentWord(value, cursorPosition.value)

	if (currentWord.value.length >= 1) {
		showAutocomplete.value = true
		selectedIndex.value = 0
		updateAutocompletePosition()
	} else {
		showAutocomplete.value = false
	}

	nextTick(syncScroll)
}

function handleFocus() {
	// Don't auto-add {} - let the placeholder guide the user
}

function handleBlur() {
	// Delay hiding to allow click on suggestion
	setTimeout(() => {
		showAutocomplete.value = false
	}, 200)

	// Auto-format on blur if valid JSON
	autoFormat()
}

// Auto-format with prettier-like config
function autoFormat() {
	if (!props.modelValue || !props.modelValue.trim()) return

	try {
		const parsed = JSON.parse(props.modelValue)
		// Format with tabs (tabWidth: 4 simulated with \t)
		const formatted = JSON.stringify(parsed, null, '\t')
		emit('update:modelValue', formatted)
	} catch {
		// Invalid JSON, can't format - ignore
	}
}

function syncScroll() {
	if (lineNumbersRef.value && textareaRef.value) {
		lineNumbersRef.value.scrollTop = textareaRef.value.scrollTop
	}
	// Update autocomplete position on scroll
	if (showAutocomplete.value) {
		updateAutocompletePosition()
	}
}

function handleKeydown(e) {
	if (props.readonly) return

	// Tab key inserts a tab character (prettier config: useTabs: true)
	if (e.key === 'Tab' && !showAutocomplete.value) {
		e.preventDefault()
		const start = e.target.selectionStart
		const end = e.target.selectionEnd
		const value = e.target.value

		const newValue = value.substring(0, start) + '\t' + value.substring(end)
		e.target.value = newValue
		e.target.selectionStart = e.target.selectionEnd = start + 1
		emit('update:modelValue', newValue)
		return
	}

	// Handle autocomplete navigation
	if (showAutocomplete.value && filteredSuggestions.value.length > 0) {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				selectedIndex.value = Math.min(selectedIndex.value + 1, filteredSuggestions.value.length - 1)
				return
			case 'ArrowUp':
				e.preventDefault()
				selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
				return
			case 'Tab':
			case 'Enter':
				e.preventDefault()
				selectSuggestion(filteredSuggestions.value[selectedIndex.value])
				return
			case 'Escape':
				e.preventDefault()
				showAutocomplete.value = false
				return
		}
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
			const newValue = value.substring(0, start) + '\n' + indent + '\t\n' + indent + value.substring(start)
			e.target.value = newValue
			e.target.selectionStart = e.target.selectionEnd = start + indent.length + 2
			emit('update:modelValue', newValue)
		} else if (charBefore === '{' || charBefore === '[') {
			e.preventDefault()
			const newValue = value.substring(0, start) + '\n' + indent + '\t' + value.substring(start)
			e.target.value = newValue
			e.target.selectionStart = e.target.selectionEnd = start + indent.length + 2
			emit('update:modelValue', newValue)
		}
	}

	// Auto-close brackets
	const pairs = {'{': '}', '[': ']'}
	if (pairs[e.key] && !props.readonly) {
		const start = e.target.selectionStart
		const end = e.target.selectionEnd
		const value = e.target.value

		if (start === end) {
			e.preventDefault()
			const newValue = value.substring(0, start) + e.key + pairs[e.key] + value.substring(end)
			e.target.value = newValue
			e.target.selectionStart = e.target.selectionEnd = start + 1
			emit('update:modelValue', newValue)
		}
	}
}

function selectSuggestion(suggestion) {
	const value = props.modelValue
	const wordStart = cursorPosition.value - currentWord.value.length
	const fieldName = suggestion.value

	// Check context before the current word
	const beforeWord = value.substring(0, wordStart)
	const afterWord = value.substring(cursorPosition.value)

	let insertValue = fieldName
	let cursorOffset = 0

	// Check if we're inside quotes already
	const lastQuotePos = beforeWord.lastIndexOf('"')
	const lastColonPos = beforeWord.lastIndexOf(':')
	const lastCommaPos = beforeWord.lastIndexOf(',')
	const lastOpenBrace = beforeWord.lastIndexOf('{')

	// Determine if we're in a key position (after { or ,) or value position (after :)
	const isInKeyPosition = lastOpenBrace > lastColonPos || lastCommaPos > lastColonPos

	if (fieldName.startsWith('$')) {
		// Operators - always need quotes
		if (!beforeWord.endsWith('"')) {
			insertValue = '"' + fieldName + '"'
		} else {
			insertValue = fieldName + '"'
		}
	} else if (isInKeyPosition) {
		// We're adding a new field key
		if (beforeWord.endsWith('"')) {
			// User already typed opening quote
			insertValue = fieldName + '": ""'
			cursorOffset = -1
		} else {
			// Need to add quotes
			insertValue = '"' + fieldName + '": ""'
			cursorOffset = -1
		}
	} else {
		// We're in a value position (after :)
		// Check if value should be a field reference (for aggregation like $field)
		const trimmedBefore = beforeWord.trimEnd()
		if (trimmedBefore.endsWith(':') || trimmedBefore.endsWith(': ')) {
			// Value position - wrap in quotes
			if (!beforeWord.endsWith('"')) {
				insertValue = '"' + fieldName + '"'
			} else {
				insertValue = fieldName + '"'
			}
		} else if (!beforeWord.endsWith('"')) {
			insertValue = '"' + fieldName + '"'
		} else {
			insertValue = fieldName + '"'
		}
	}

	const newValue = value.substring(0, wordStart) + insertValue + afterWord
	emit('update:modelValue', newValue)

	// Set cursor position after insertion
	nextTick(() => {
		if (textareaRef.value) {
			const newPos = wordStart + insertValue.length + cursorOffset
			textareaRef.value.setSelectionRange(newPos, newPos)
			textareaRef.value.focus()
		}
	})

	showAutocomplete.value = false
	currentWord.value = ''
}

function format() {
	try {
		const parsed = JSON.parse(props.modelValue)
		// Format with tabs (prettier config: useTabs: true)
		const formatted = JSON.stringify(parsed, null, '\t')
		emit('update:modelValue', formatted)
	} catch {
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

// Sync scroll on value change
watch(
	() => props.modelValue,
	() => {
		nextTick(syncScroll)
	}
)
</script>

<style scoped>
.mongo-code-editor {
	--bg: #1e1e1e;
	--lines-bg: #252526;
	--text: #e8e8e8;
	--line-num: #858585;
	--border: #3c3c3c;
	--caret: #fff;

	border: 1px solid var(--border);
	border-radius: 6px;
	overflow: hidden;
	background: var(--bg);
	position: relative;
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
	min-width: 40px;
	border-right: 1px solid var(--border);
	font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
	font-size: 13px;
	line-height: 20px;
}

.line-num {
	padding: 0 8px 0 5px;
}

.editor-wrapper {
	flex: 1;
	position: relative;
	overflow: hidden;
}

.editor-textarea {
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 10px 12px;
	font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
	font-size: 13px;
	line-height: 20px;
	white-space: pre;
	overflow: auto;
	border: none;
	outline: none;
	resize: none;
	box-sizing: border-box;
	background: var(--bg);
	color: var(--text);
	caret-color: var(--caret);
}

.editor-textarea::placeholder {
	color: var(--line-num);
}

/* Autocomplete dropdown */
.autocomplete-dropdown {
	position: fixed;
	max-height: 250px;
	overflow-y: auto;
	background: #252526;
	border: 1px solid #3c3c3c;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
	z-index: 10000;
	border-radius: 4px;
	min-width: 320px;
	max-width: 450px;
}

.autocomplete-item {
	padding: 6px 10px;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 8px;
	border-bottom: 1px solid #333;
}

.autocomplete-item:last-child {
	border-bottom: none;
}

.autocomplete-item:hover,
.autocomplete-item.active {
	background: #82cdff;
}

.suggestion-value {
	font-family: 'Fira Code', 'Consolas', monospace;
	font-weight: 600;
	color: #4fc1ff;
	min-width: 120px;
}

.suggestion-type {
	font-size: 10px;
	padding: 2px 6px;
	border-radius: 3px;
	text-transform: uppercase;
	font-weight: 600;
}

.suggestion-type.stage {
	background: #264f78;
	color: #9cdcfe;
}

.suggestion-type.query {
	background: #4d3800;
	color: #dcdcaa;
}

.suggestion-type.expr {
	background: #3c2a54;
	color: #c586c0;
}

.suggestion-type.type {
	background: #2d4a2d;
	color: #6a9955;
}

.suggestion-type.value {
	background: #4a3232;
	color: #ce9178;
}

.suggestion-type.field {
	background: #1e3a3a;
	color: #4ec9b0;
}

.suggestion-desc {
	font-size: 11px;
	color: #888;
	margin-left: auto;
}

.autocomplete-item.active .suggestion-desc {
	color: #ccc;
}

/* Footer */
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
.line-numbers::-webkit-scrollbar {
	width: 10px;
	height: 10px;
}

.editor-textarea::-webkit-scrollbar-track,
.line-numbers::-webkit-scrollbar-track {
	background: var(--bg);
}

.editor-textarea::-webkit-scrollbar-thumb,
.line-numbers::-webkit-scrollbar-thumb {
	background: var(--border);
	border-radius: 5px;
}

.editor-textarea::-webkit-scrollbar-thumb:hover,
.line-numbers::-webkit-scrollbar-thumb:hover {
	background: var(--line-num);
}

.autocomplete-dropdown::-webkit-scrollbar {
	width: 8px;
}

.autocomplete-dropdown::-webkit-scrollbar-track {
	background: #1e1e1e;
}

.autocomplete-dropdown::-webkit-scrollbar-thumb {
	background: #555;
	border-radius: 4px;
}

/* Theme variants */
.theme-monokai {
	--bg: #272822;
	--lines-bg: #1e1f1c;
	--text: #f8f8f2;
	--line-num: #90908a;
	--border: #3e3d32;
	--caret: #f8f8f0;
}

.theme-dracula {
	--bg: #282a36;
	--lines-bg: #21222c;
	--text: #f8f8f2;
	--line-num: #6272a4;
	--border: #44475a;
	--caret: #f8f8f2;
}

.theme-material {
	--bg: #263238;
	--lines-bg: #1e272c;
	--text: #eeffff;
	--line-num: #546e7a;
	--border: #37474f;
	--caret: #ffcc00;
}

.theme-nord {
	--bg: #2e3440;
	--lines-bg: #272c36;
	--text: #d8dee9;
	--line-num: #4c566a;
	--border: #3b4252;
	--caret: #d8dee9;
}

.theme-one-dark {
	--bg: #282c34;
	--lines-bg: #21252b;
	--text: #abb2bf;
	--line-num: #636d83;
	--border: #3e4451;
	--caret: #528bff;
}

.theme-gruvbox-dark {
	--bg: #282828;
	--lines-bg: #1d2021;
	--text: #ebdbb2;
	--line-num: #928374;
	--border: #3c3836;
	--caret: #ebdbb2;
}

/* Light themes */
.theme-eclipse,
.theme-idea,
.theme-neo,
.theme-neat,
.theme-elegant {
	--bg: #ffffff;
	--lines-bg: #f7f7f7;
	--text: #000000;
	--line-num: #999999;
	--border: #d4d4d4;
	--caret: #000000;
}

.theme-eclipse .autocomplete-dropdown,
.theme-idea .autocomplete-dropdown,
.theme-neo .autocomplete-dropdown,
.theme-neat .autocomplete-dropdown,
.theme-elegant .autocomplete-dropdown {
	background: #fff;
	border-color: #ccc;
}

.theme-eclipse .autocomplete-item,
.theme-idea .autocomplete-item,
.theme-neo .autocomplete-item,
.theme-neat .autocomplete-item,
.theme-elegant .autocomplete-item {
	border-color: #eee;
}

.theme-eclipse .suggestion-value,
.theme-idea .suggestion-value,
.theme-neo .suggestion-value,
.theme-neat .suggestion-value,
.theme-elegant .suggestion-value {
	color: #0066cc;
}

.theme-eclipse .suggestion-desc,
.theme-idea .suggestion-desc,
.theme-neo .suggestion-desc,
.theme-neat .suggestion-desc,
.theme-elegant .suggestion-desc {
	color: #666;
}

.theme-solarized-light {
	--bg: #fdf6e3;
	--lines-bg: #eee8d5;
	--text: #657b83;
	--line-num: #93a1a1;
	--border: #eee8d5;
	--caret: #657b83;
}

.theme-yeti {
	--bg: #eceae8;
	--lines-bg: #e0ddd9;
	--text: #546e7a;
	--line-num: #9fb4bf;
	--border: #d4cfc9;
	--caret: #546e7a;
}
</style>
