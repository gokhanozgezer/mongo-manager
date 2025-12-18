<template>
	<div class="mongo-query-input" ref="containerRef">
		<input
			ref="inputRef"
			type="text"
			:value="modelValue"
			@input="handleInput"
			@focus="handleFocus"
			@blur="handleBlur"
			@keydown="handleKeydown"
			:placeholder="placeholder"
			:style="inputStyle"
			autocomplete="off"
			spellcheck="false"
		/>
		<!-- Autocomplete dropdown -->
		<div v-if="showAutocomplete && filteredSuggestions.length > 0" class="autocomplete-dropdown">
			<div
				v-for="(suggestion, index) in filteredSuggestions"
				:key="suggestion.value"
				:class="['autocomplete-item', {active: index === selectedIndex}]"
				@mousedown.prevent="selectSuggestion(suggestion)"
				@mouseenter="selectedIndex = index"
			>
				<span class="suggestion-value">{{ suggestion.value }}</span>
				<span class="suggestion-desc">{{ suggestion.desc }}</span>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, watch, nextTick} from 'vue'

const props = defineProps({
	modelValue: {
		type: String,
		default: ''
	},
	placeholder: {
		type: String,
		default: ''
	},
	inputStyle: {
		type: [String, Object],
		default: ''
	},
	// Document fields for autocomplete
	documentFields: {
		type: Array,
		default: () => []
	}
})

const emit = defineEmits(['update:modelValue', 'search'])

const inputRef = ref(null)
const containerRef = ref(null)
const showAutocomplete = ref(false)
const selectedIndex = ref(0)
const currentWord = ref('')
const cursorPosition = ref(0)

// Base MongoDB suggestions
const baseSuggestions = [
	// Query operators
	{value: '$eq', desc: 'Matches values equal to', category: 'operator'},
	{value: '$ne', desc: 'Matches values not equal to', category: 'operator'},
	{value: '$gt', desc: 'Matches values greater than', category: 'operator'},
	{value: '$gte', desc: 'Matches values greater than or equal', category: 'operator'},
	{value: '$lt', desc: 'Matches values less than', category: 'operator'},
	{value: '$lte', desc: 'Matches values less than or equal', category: 'operator'},
	{value: '$in', desc: 'Matches any value in array', category: 'operator'},
	{value: '$nin', desc: 'Matches none of the values in array', category: 'operator'},

	// Logical operators
	{value: '$and', desc: 'Joins query clauses with AND', category: 'operator'},
	{value: '$or', desc: 'Joins query clauses with OR', category: 'operator'},
	{value: '$not', desc: 'Inverts the effect of query', category: 'operator'},
	{value: '$nor', desc: 'Joins query clauses with NOR', category: 'operator'},

	// Element operators
	{value: '$exists', desc: 'Matches documents with field', category: 'operator'},
	{value: '$type', desc: 'Matches documents with field type', category: 'operator'},

	// Array operators
	{value: '$all', desc: 'Matches arrays with all elements', category: 'operator'},
	{value: '$elemMatch', desc: 'Matches array element conditions', category: 'operator'},
	{value: '$size', desc: 'Matches array with size', category: 'operator'},

	// Evaluation operators
	{value: '$regex', desc: 'Matches regular expression', category: 'operator'},
	{value: '$text', desc: 'Text search', category: 'operator'},
	{value: '$where', desc: 'JavaScript expression', category: 'operator'},
	{value: '$expr', desc: 'Aggregation expression', category: 'operator'},
	{value: '$mod', desc: 'Modulo operation', category: 'operator'},

	// Update operators
	{value: '$set', desc: 'Sets field value', category: 'operator'},
	{value: '$unset', desc: 'Removes field', category: 'operator'},
	{value: '$inc', desc: 'Increments field value', category: 'operator'},
	{value: '$push', desc: 'Adds element to array', category: 'operator'},
	{value: '$pull', desc: 'Removes element from array', category: 'operator'},
	{value: '$addToSet', desc: 'Adds unique element to array', category: 'operator'},
	{value: '$pop', desc: 'Removes first/last array element', category: 'operator'},
	{value: '$rename', desc: 'Renames field', category: 'operator'},
	{value: '$min', desc: 'Updates if value is less', category: 'operator'},
	{value: '$max', desc: 'Updates if value is greater', category: 'operator'},
	{value: '$mul', desc: 'Multiplies field value', category: 'operator'},
	{value: '$currentDate', desc: 'Sets to current date', category: 'operator'},

	// MongoDB types
	{value: 'ObjectId("', desc: 'MongoDB ObjectId', category: 'type'},
	{value: 'ISODate("', desc: 'MongoDB Date', category: 'type'},
	{value: 'NumberLong(', desc: 'MongoDB Long integer', category: 'type'},
	{value: 'NumberDecimal("', desc: 'MongoDB Decimal128', category: 'type'},

	// Common values
	{value: 'true', desc: 'Boolean true', category: 'value'},
	{value: 'false', desc: 'Boolean false', category: 'value'},
	{value: 'null', desc: 'Null value', category: 'value'}
]

// Combined suggestions (base + document fields)
const suggestions = computed(() => {
	const fieldSuggestions = props.documentFields.map(f => ({
		value: f.path,
		desc: f.type || 'field',
		category: 'field'
	}))
	// Fields first, then operators and types
	return [...fieldSuggestions, ...baseSuggestions]
})

// Filter suggestions based on current input
const filteredSuggestions = computed(() => {
	if (!currentWord.value) return []

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
	// Find the start of the current word (after space, :, {, [, or ,)
	const match = beforeCursor.match(/[^\s:{[,]*$/)
	return match ? match[0].replace(/^["']/, '') : ''
}

function handleInput(e) {
	const value = e.target.value
	emit('update:modelValue', value)

	cursorPosition.value = e.target.selectionStart
	currentWord.value = getCurrentWord(value, cursorPosition.value)

	if (currentWord.value.length >= 1) {
		showAutocomplete.value = true
		selectedIndex.value = 0
	} else {
		showAutocomplete.value = false
	}
}

function handleFocus(e) {
	// Auto-add {} if empty
	if (!props.modelValue || props.modelValue.trim() === '') {
		emit('update:modelValue', '{}')
		nextTick(() => {
			if (inputRef.value) {
				inputRef.value.setSelectionRange(1, 1)
			}
		})
	}
}

function handleBlur() {
	// Delay hiding to allow click on suggestion
	setTimeout(() => {
		showAutocomplete.value = false
	}, 200)
}

function handleKeydown(e) {
	// Handle Enter for search when autocomplete is not active
	if (e.key === 'Enter') {
		if (showAutocomplete.value && filteredSuggestions.value.length > 0) {
			e.preventDefault()
			selectSuggestion(filteredSuggestions.value[selectedIndex.value])
		} else {
			e.preventDefault()
			emit('search')
		}
		return
	}

	if (!showAutocomplete.value || filteredSuggestions.value.length === 0) {
		return
	}

	switch (e.key) {
		case 'ArrowDown':
			e.preventDefault()
			selectedIndex.value = Math.min(selectedIndex.value + 1, filteredSuggestions.value.length - 1)
			break
		case 'ArrowUp':
			e.preventDefault()
			selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
			break
		case 'Tab':
			if (showAutocomplete.value && filteredSuggestions.value.length > 0) {
				e.preventDefault()
				selectSuggestion(filteredSuggestions.value[selectedIndex.value])
			}
			break
		case 'Escape':
			showAutocomplete.value = false
			break
	}
}

function selectSuggestion(suggestion) {
	let value = props.modelValue.trim()
	const wordStart = cursorPosition.value - currentWord.value.length
	const fieldName = suggestion.value

	// If value is empty or doesn't have {}, wrap it
	if (!value || value === '' || value === '{}') {
		// Create new object with the field
		const newValue = `{"${fieldName}": ""}`
		emit('update:modelValue', newValue)

		// Position cursor inside the empty quotes
		nextTick(() => {
			if (inputRef.value) {
				const cursorPos = newValue.length - 2 // Before closing "}
				inputRef.value.setSelectionRange(cursorPos, cursorPos)
				inputRef.value.focus()
			}
		})

		showAutocomplete.value = false
		currentWord.value = ''
		return
	}

	// Check context before the current word
	const beforeWord = value.substring(0, wordStart)
	const afterWord = value.substring(cursorPosition.value)

	let insertValue = fieldName
	let cursorOffset = 0

	// Check if we're inside quotes already (user typed "field)
	const lastQuotePos = beforeWord.lastIndexOf('"')
	const lastColonPos = beforeWord.lastIndexOf(':')
	const lastCommaPos = beforeWord.lastIndexOf(',')
	const lastOpenBrace = beforeWord.lastIndexOf('{')

	// Determine if we're in a key position (after { or ,) or value position (after :)
	const isInKeyPosition = lastOpenBrace > lastColonPos || lastCommaPos > lastColonPos

	if (fieldName.startsWith('$')) {
		// Operators - check if we need quotes
		if (!beforeWord.endsWith('"')) {
			insertValue = '"' + fieldName + '": '
			cursorOffset = 0
		} else {
			insertValue = fieldName + '": '
			cursorOffset = 0
		}
	} else if (isInKeyPosition) {
		// We're adding a new field key
		// Check if there's already a quote before
		if (beforeWord.endsWith('"')) {
			// User already typed opening quote
			insertValue = fieldName + '": ""'
			cursorOffset = -1 // Position inside the empty value quotes
		} else {
			// Need to add quotes
			insertValue = '"' + fieldName + '": ""'
			cursorOffset = -1
		}
	} else {
		// We're in a value position, just insert the value
		if (!beforeWord.endsWith('"')) {
			insertValue = '"' + fieldName + '"'
			cursorOffset = 0
		} else {
			insertValue = fieldName + '"'
			cursorOffset = 0
		}
	}

	const newValue = beforeWord.substring(0, wordStart) + insertValue + afterWord
	emit('update:modelValue', newValue)

	// Set cursor position after insertion
	nextTick(() => {
		if (inputRef.value) {
			const newPos = wordStart + insertValue.length + cursorOffset
			inputRef.value.setSelectionRange(newPos, newPos)
			inputRef.value.focus()
		}
	})

	showAutocomplete.value = false
	currentWord.value = ''
}

// Expose method to parse MongoDB-style query to JSON
function parseMongoQuery(query) {
	if (!query || !query.trim()) return {}

	let processed = query.trim()

	// Convert ObjectId("...") to {"$oid": "..."}
	processed = processed.replace(/ObjectId\s*\(\s*["']([^"']+)["']\s*\)/g, '{"$oid": "$1"}')

	// Convert ISODate("...") to {"$date": "..."}
	processed = processed.replace(/ISODate\s*\(\s*["']([^"']+)["']\s*\)/g, '{"$date": "$1"}')

	// Convert NumberLong(...) to {"$numberLong": "..."}
	processed = processed.replace(/NumberLong\s*\(\s*["']?([^"')]+)["']?\s*\)/g, '{"$numberLong": "$1"}')

	// Convert NumberDecimal("...") to {"$numberDecimal": "..."}
	processed = processed.replace(/NumberDecimal\s*\(\s*["']([^"']+)["']\s*\)/g, '{"$numberDecimal": "$1"}')

	// Convert new Date("...") to {"$date": "..."}
	processed = processed.replace(/new\s+Date\s*\(\s*["']([^"']+)["']\s*\)/g, '{"$date": "$1"}')

	// Convert Timestamp(...) to {"$timestamp": {...}}
	processed = processed.replace(/Timestamp\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, '{"$timestamp": {"t": $1, "i": $2}}')

	// Convert BinData(...) to {"$binary": {...}}
	processed = processed.replace(/BinData\s*\(\s*(\d+)\s*,\s*["']([^"']+)["']\s*\)/g, '{"$binary": {"base64": "$2", "subType": "$1"}}')

	// Convert regex /pattern/flags to {"$regex": "pattern", "$options": "flags"}
	processed = processed.replace(/\/([^/]+)\/([gimsuvy]*)/g, (match, pattern, flags) => {
		if (flags) {
			return `{"$regex": "${pattern}", "$options": "${flags}"}`
		}
		return `{"$regex": "${pattern}"}`
	})

	try {
		return JSON.parse(processed)
	} catch (e) {
		throw new Error('Invalid query syntax: ' + e.message)
	}
}

defineExpose({parseMongoQuery})
</script>

<style scoped>
.mongo-query-input {
	position: relative;
	width: 100%;
}

.mongo-query-input input {
	width: 100%;
	font-family: 'Fira Code', 'Consolas', monospace;
}

.autocomplete-dropdown {
	position: absolute;
	top: 100%;
	left: 0;
	right: 0;
	max-height: 250px;
	overflow-y: auto;
	background: #fff;
	border: 1px solid #ccc;
	border-top: none;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	border-radius: 0 0 4px 4px;
}

:global(.dark) .autocomplete-dropdown {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

.autocomplete-item {
	padding: 8px 12px;
	cursor: pointer;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1px solid #eee;
}

:global(.dark) .autocomplete-item {
	border-color: #3c3c3c;
}

.autocomplete-item:last-child {
	border-bottom: none;
}

.autocomplete-item:hover,
.autocomplete-item.active {
	background: #e3f2fd;
}

:global(.dark) .autocomplete-item:hover,
:global(.dark) .autocomplete-item.active {
	background: #0e639c;
}

.suggestion-value {
	font-family: 'Fira Code', 'Consolas', monospace;
	font-weight: 600;
	color: #0066cc;
}

:global(.dark) .suggestion-value {
	color: #4fc1ff;
}

.suggestion-desc {
	font-size: 11px;
	color: #666;
	margin-left: 10px;
}

:global(.dark) .suggestion-desc {
	color: #999;
}

/* Scrollbar */
.autocomplete-dropdown::-webkit-scrollbar {
	width: 8px;
}

.autocomplete-dropdown::-webkit-scrollbar-track {
	background: #f1f1f1;
}

:global(.dark) .autocomplete-dropdown::-webkit-scrollbar-track {
	background: #1e1e1e;
}

.autocomplete-dropdown::-webkit-scrollbar-thumb {
	background: #ccc;
	border-radius: 4px;
}

:global(.dark) .autocomplete-dropdown::-webkit-scrollbar-thumb {
	background: #555;
}
</style>
