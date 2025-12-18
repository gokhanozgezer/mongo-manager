<template>
	<div class="json-viewer" :class="themeClass" :style="viewerStyle">
		<div class="json-content">
			<JsonNode :data="parsedData" :expanded="defaultExpanded" :depth="0" :expandAll="expandAll" :showToggle="showToggle" />
		</div>
	</div>
</template>

<script setup>
import {computed, ref, h, defineComponent} from 'vue'
import {useAppStore} from '../stores/app.js'

const store = useAppStore()

const props = defineProps({
	value: {
		type: [Object, Array, String],
		required: true
	},
	maxHeight: {
		type: String,
		default: 'none'
	},
	minHeight: {
		type: String,
		default: 'none'
	},
	defaultExpanded: {
		type: Boolean,
		default: false
	},
	expandAll: {
		type: Boolean,
		default: false
	},
	showToggle: {
		type: Boolean,
		default: true
	}
})

// Theme class based on store
const themeClass = computed(() => {
	const theme = store.editorTheme || 'default'
	return `theme-${theme.replace(/\s+/g, '-')}`
})

// Style with font size from store
const viewerStyle = computed(() => ({
	maxHeight: props.maxHeight,
	minHeight: props.minHeight,
	'--viewer-font-size': (store.editorFontSize || 12) + 'px',
	'--viewer-line-height': Math.round((store.editorFontSize || 12) * 1.5) + 'px'
}))

// Parse data if string
const parsedData = computed(() => {
	let data = props.value
	if (typeof data === 'string') {
		try {
			data = JSON.parse(data)
		} catch (e) {
			return data
		}
	}
	return data
})
</script>

<script>
// JsonNode component for recursive rendering
const JsonNode = defineComponent({
	name: 'JsonNode',
	props: {
		data: {
			required: true
		},
		expanded: {
			type: Boolean,
			default: false
		},
		depth: {
			type: Number,
			default: 0
		},
		keyName: {
			type: String,
			default: ''
		},
		expandAll: {
			type: Boolean,
			default: false
		},
		showToggle: {
			type: Boolean,
			default: true
		}
	},
	setup(props) {
		// Root level (depth=0) is expanded by default
		// If expandAll is true, all levels are expanded
		// If showToggle is false, always expanded (no collapsing possible)
		// Otherwise, nested levels (depth>0) are collapsed by default
		const shouldExpand = !props.showToggle || props.expandAll || props.expanded || props.depth === 0
		const isExpanded = ref(shouldExpand)

		const toggle = () => {
			isExpanded.value = !isExpanded.value
		}

		const isObject = computed(() => {
			return props.data !== null && typeof props.data === 'object' && !isMongoType(props.data)
		})

		const isArray = computed(() => Array.isArray(props.data))

		const isEmpty = computed(() => {
			if (isArray.value) return props.data.length === 0
			if (isObject.value) return Object.keys(props.data).length === 0
			return false
		})

		const itemCount = computed(() => {
			if (isArray.value) return props.data.length
			if (isObject.value) return Object.keys(props.data).length
			return 0
		})

		function isMongoType(value) {
			if (!value || typeof value !== 'object') return false
			return value.$oid || value.$date || value.$numberLong || value.$numberDecimal || value.$binary || value.$regex || value.$timestamp
		}

		function escapeHtml(str) {
			return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
		}

		function formatMongoType(value) {
			if (value.$oid) {
				return h('span', {class: 'json-objectid'}, ['ObjectId(', h('span', {class: 'json-objectid-value'}, `"${value.$oid}"`), ')'])
			}
			if (value.$date) {
				let dateStr
				if (typeof value.$date === 'object' && value.$date.$numberLong) {
					dateStr = new Date(parseInt(value.$date.$numberLong)).toISOString()
				} else {
					dateStr = new Date(value.$date).toISOString()
				}
				return h('span', {class: 'json-date'}, ['ISODate(', h('span', {class: 'json-date-value'}, `"${dateStr}"`), ')'])
			}
			if (value.$numberLong) {
				return h('span', {class: 'json-numberlong'}, ['NumberLong(', h('span', {class: 'json-numberlong-value'}, value.$numberLong), ')'])
			}
			if (value.$numberDecimal) {
				return h('span', {class: 'json-decimal'}, ['NumberDecimal(', h('span', {class: 'json-decimal-value'}, `"${value.$numberDecimal}"`), ')'])
			}
			if (value.$binary) {
				return h('span', {class: 'json-binary'}, [
					'BinData(',
					h('span', {class: 'json-binary-value'}, `${value.$binary.subType || 0}, "${value.$binary.base64}"`),
					')'
				])
			}
			if (value.$regex) {
				return h('span', {class: 'json-regex'}, `/${escapeHtml(value.$regex)}/${value.$options || ''}`)
			}
			if (value.$timestamp) {
				return h('span', {class: 'json-timestamp'}, `Timestamp(${value.$timestamp.t}, ${value.$timestamp.i})`)
			}
			return null
		}

		function formatPrimitive(value) {
			if (value === null) {
				return h('span', {class: 'json-null'}, 'null')
			}
			if (value === undefined) {
				return h('span', {class: 'json-undefined'}, 'undefined')
			}
			if (typeof value === 'boolean') {
				return h('span', {class: 'json-boolean'}, String(value))
			}
			if (typeof value === 'number') {
				return h('span', {class: 'json-number'}, String(value))
			}
			if (typeof value === 'string') {
				return h('span', {class: 'json-string'}, `"${escapeHtml(value)}"`)
			}
			return h('span', null, String(value))
		}

		return () => {
			const data = props.data

			// Handle MongoDB extended types
			if (data && typeof data === 'object' && isMongoType(data)) {
				return formatMongoType(data)
			}

			// Handle primitives
			if (data === null || data === undefined || typeof data !== 'object') {
				return formatPrimitive(data)
			}

			// Handle empty arrays/objects
			if (isEmpty.value) {
				if (isArray.value) {
					return h('span', {class: 'json-bracket'}, '[]')
				}
				return h('span', {class: 'json-bracket'}, '{}')
			}

			// Handle arrays and objects
			const bracket = isArray.value ? ['[', ']'] : ['{', '}']
			const typeLabel = isArray.value ? 'Array' : 'Object'

			// When showToggle is false, always show expanded without toggle
			if (!props.showToggle) {
				const entries = isArray.value ? data.map((item, index) => [index, item]) : Object.entries(data)

				const children = entries.map(([key, value], idx) => {
					const isLast = idx === entries.length - 1
					const keyClass = key === '_id' ? 'json-key json-key-id' : 'json-key'

					return h('div', {class: 'json-line', key: key}, [
						h('span', {class: keyClass}, isArray.value ? `${key}` : `"${key}"`),
						h('span', {class: 'json-colon'}, ': '),
						h(JsonNode, {data: value, expanded: true, depth: props.depth + 1, keyName: String(key), expandAll: true, showToggle: false}),
						!isLast ? h('span', {class: 'json-comma'}, ',') : null
					])
				})

				return h('span', {class: 'json-collapsible expanded no-toggle'}, [
					h('span', {class: 'json-bracket'}, bracket[0]),
					h('div', {class: 'json-children'}, children),
					h('span', {class: 'json-bracket'}, bracket[1])
				])
			}

			if (!isExpanded.value) {
				// Collapsed view
				return h('span', {class: 'json-collapsible'}, [
					h('span', {class: 'json-toggle', onClick: toggle}, '▶'),
					h('span', {class: 'json-bracket'}, bracket[0]),
					h('span', {class: 'json-preview'}, `${typeLabel}(${itemCount.value})`),
					h('span', {class: 'json-bracket'}, bracket[1])
				])
			}

			// Expanded view
			const entries = isArray.value ? data.map((item, index) => [index, item]) : Object.entries(data)

			const children = entries.map(([key, value], idx) => {
				const isLast = idx === entries.length - 1
				const keyClass = key === '_id' ? 'json-key json-key-id' : 'json-key'

				return h('div', {class: 'json-line', key: key}, [
					h('span', {class: keyClass}, isArray.value ? `${key}` : `"${key}"`),
					h('span', {class: 'json-colon'}, ': '),
					h(JsonNode, {data: value, expanded: false, depth: props.depth + 1, keyName: String(key), expandAll: props.expandAll, showToggle: props.showToggle}),
					!isLast ? h('span', {class: 'json-comma'}, ',') : null
				])
			})

			return h('span', {class: 'json-collapsible expanded'}, [
				h('span', {class: 'json-toggle', onClick: toggle}, '▼'),
				h('span', {class: 'json-bracket'}, bracket[0]),
				h('div', {class: 'json-children'}, children),
				h('span', {class: 'json-bracket'}, bracket[1])
			])
		}
	}
})

export default {
	components: {JsonNode}
}
</script>

<style scoped>
.json-viewer {
	/* Default theme colors (VS Code Dark) */
	--bg: #1e1e1e;
	--text: #e8e8e8;
	--key: #9cdcfe;
	--key-id: #4fc1ff;
	--string: #ce9178;
	--number: #b5cea8;
	--boolean: #569cd6;
	--null: #569cd6;
	--bracket: #ffd700;
	--mongo-type: #4ec9b0;
	--mongo-value: #dcdcaa;
	--date-type: #c586c0;
	--date-value: #d7ba7d;
	--regex: #d16969;
	--toggle: #888;
	--preview: #888;
	--scrollbar-bg: #2d2d2d;
	--scrollbar-thumb: #555;

	--viewer-font-size: 12px;
	--viewer-line-height: 18px;

	background: var(--bg);
	border-radius: 6px;
	overflow: auto;
	font-family: 'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
	font-size: var(--viewer-font-size);
	line-height: var(--viewer-line-height);
}

.json-content {
	margin: 0;
	padding: 12px 15px;
	color: var(--text);
}

/* Toggle arrow */
:deep(.json-toggle) {
	display: inline-block;
	width: 16px;
	cursor: pointer;
	color: var(--toggle);
	font-size: 10px;
	user-select: none;
	transition: color 0.15s;
}

:deep(.json-toggle:hover) {
	color: var(--text);
}

/* Collapsible container */
:deep(.json-collapsible) {
	display: inline;
}

:deep(.json-collapsible.expanded) {
	display: inline;
}

/* Preview text for collapsed */
:deep(.json-preview) {
	color: var(--preview);
	font-style: italic;
	margin: 0 4px;
}

/* Children container */
:deep(.json-children) {
	display: block;
	padding-left: 20px;
	border-left: 1px solid #3c3c3c;
	margin-left: 7px;
}

/* Line */
:deep(.json-line) {
	display: block;
	padding: 1px 0;
}

/* Keys */
:deep(.json-key) {
	color: var(--key);
}

:deep(.json-key-id) {
	color: var(--key-id);
	font-weight: 600;
}

/* Values */
:deep(.json-string) {
	color: var(--string);
}

:deep(.json-number) {
	color: var(--number);
}

:deep(.json-boolean) {
	color: var(--boolean);
	font-weight: 600;
}

:deep(.json-null) {
	color: var(--null);
	font-style: italic;
}

:deep(.json-undefined) {
	color: #808080;
	font-style: italic;
}

/* MongoDB Types */
:deep(.json-objectid) {
	color: var(--mongo-type);
	font-weight: 600;
}

:deep(.json-objectid-value) {
	color: var(--mongo-value);
}

:deep(.json-date) {
	color: var(--date-type);
	font-weight: 600;
}

:deep(.json-date-value) {
	color: var(--date-value);
}

:deep(.json-numberlong) {
	color: var(--mongo-type);
}

:deep(.json-numberlong-value) {
	color: var(--number);
}

:deep(.json-decimal) {
	color: var(--mongo-type);
}

:deep(.json-decimal-value) {
	color: var(--number);
}

:deep(.json-binary) {
	color: var(--mongo-value);
}

:deep(.json-binary-value) {
	color: var(--string);
}

:deep(.json-regex) {
	color: var(--regex);
}

:deep(.json-timestamp) {
	color: var(--date-type);
}

/* Punctuation */
:deep(.json-bracket) {
	color: var(--bracket);
	font-weight: 600;
}

:deep(.json-colon) {
	color: var(--text);
}

:deep(.json-comma) {
	color: var(--text);
}

/* Scrollbar */
.json-viewer::-webkit-scrollbar {
	width: 8px;
	height: 8px;
}

.json-viewer::-webkit-scrollbar-track {
	background: var(--scrollbar-bg);
}

.json-viewer::-webkit-scrollbar-thumb {
	background: var(--scrollbar-thumb);
	border-radius: 4px;
}

.json-viewer::-webkit-scrollbar-thumb:hover {
	background: #666;
}

/* ============================================
   THEME DEFINITIONS
   ============================================ */

/* Monokai */
.theme-monokai {
	--bg: #272822;
	--text: #f8f8f2;
	--key: #66d9ef;
	--key-id: #fd971f;
	--string: #e6db74;
	--number: #ae81ff;
	--boolean: #ae81ff;
	--null: #ae81ff;
	--bracket: #f8f8f2;
	--mongo-type: #a6e22e;
	--mongo-value: #e6db74;
	--date-type: #f92672;
	--date-value: #e6db74;
	--regex: #f92672;
	--toggle: #75715e;
	--preview: #75715e;
	--scrollbar-bg: #1e1f1c;
	--scrollbar-thumb: #3e3d32;
}

/* Dracula */
.theme-dracula {
	--bg: #282a36;
	--text: #f8f8f2;
	--key: #8be9fd;
	--key-id: #ffb86c;
	--string: #f1fa8c;
	--number: #bd93f9;
	--boolean: #bd93f9;
	--null: #bd93f9;
	--bracket: #ff79c6;
	--mongo-type: #50fa7b;
	--mongo-value: #f1fa8c;
	--date-type: #ff79c6;
	--date-value: #f1fa8c;
	--regex: #ff5555;
	--toggle: #6272a4;
	--preview: #6272a4;
	--scrollbar-bg: #21222c;
	--scrollbar-thumb: #44475a;
}

/* Material */
.theme-material {
	--bg: #263238;
	--text: #eeffff;
	--key: #82aaff;
	--key-id: #ffcb6b;
	--string: #c3e88d;
	--number: #f78c6c;
	--boolean: #89ddff;
	--null: #89ddff;
	--bracket: #89ddff;
	--mongo-type: #c792ea;
	--mongo-value: #c3e88d;
	--date-type: #c792ea;
	--date-value: #c3e88d;
	--regex: #f07178;
	--toggle: #546e7a;
	--preview: #546e7a;
	--scrollbar-bg: #1e272c;
	--scrollbar-thumb: #37474f;
}

/* Nord */
.theme-nord {
	--bg: #2e3440;
	--text: #d8dee9;
	--key: #88c0d0;
	--key-id: #ebcb8b;
	--string: #a3be8c;
	--number: #b48ead;
	--boolean: #81a1c1;
	--null: #81a1c1;
	--bracket: #eceff4;
	--mongo-type: #8fbcbb;
	--mongo-value: #a3be8c;
	--date-type: #b48ead;
	--date-value: #a3be8c;
	--regex: #bf616a;
	--toggle: #616e88;
	--preview: #616e88;
	--scrollbar-bg: #272c36;
	--scrollbar-thumb: #3b4252;
}

/* Cobalt */
.theme-cobalt {
	--bg: #002240;
	--text: #ffffff;
	--key: #ffee80;
	--key-id: #ff9d00;
	--string: #3ad900;
	--number: #ff628c;
	--boolean: #ff9d00;
	--null: #ff9d00;
	--bracket: #ffffff;
	--mongo-type: #80ffbb;
	--mongo-value: #3ad900;
	--date-type: #ff9d00;
	--date-value: #3ad900;
	--regex: #ff628c;
	--toggle: #0088ff;
	--preview: #0088ff;
	--scrollbar-bg: #001b33;
	--scrollbar-thumb: #003366;
}

/* Solarized Dark */
.theme-solarized-dark {
	--bg: #002b36;
	--text: #839496;
	--key: #268bd2;
	--key-id: #cb4b16;
	--string: #2aa198;
	--number: #d33682;
	--boolean: #cb4b16;
	--null: #cb4b16;
	--bracket: #93a1a1;
	--mongo-type: #859900;
	--mongo-value: #2aa198;
	--date-type: #d33682;
	--date-value: #2aa198;
	--regex: #dc322f;
	--toggle: #586e75;
	--preview: #586e75;
	--scrollbar-bg: #073642;
	--scrollbar-thumb: #586e75;
}

/* Gruvbox Dark */
.theme-gruvbox-dark {
	--bg: #282828;
	--text: #ebdbb2;
	--key: #83a598;
	--key-id: #fe8019;
	--string: #b8bb26;
	--number: #d3869b;
	--boolean: #fe8019;
	--null: #fe8019;
	--bracket: #fabd2f;
	--mongo-type: #8ec07c;
	--mongo-value: #b8bb26;
	--date-type: #d3869b;
	--date-value: #b8bb26;
	--regex: #fb4934;
	--toggle: #928374;
	--preview: #928374;
	--scrollbar-bg: #1d2021;
	--scrollbar-thumb: #3c3836;
}

/* One Dark */
.theme-one-dark {
	--bg: #282c34;
	--text: #abb2bf;
	--key: #e06c75;
	--key-id: #d19a66;
	--string: #98c379;
	--number: #d19a66;
	--boolean: #56b6c2;
	--null: #56b6c2;
	--bracket: #c678dd;
	--mongo-type: #61afef;
	--mongo-value: #98c379;
	--date-type: #c678dd;
	--date-value: #98c379;
	--regex: #e06c75;
	--toggle: #5c6370;
	--preview: #5c6370;
	--scrollbar-bg: #21252b;
	--scrollbar-thumb: #3e4451;
}

/* Twilight */
.theme-twilight {
	--bg: #141414;
	--text: #f7f7f7;
	--key: #7587a6;
	--key-id: #cda869;
	--string: #8f9d6a;
	--number: #cf6a4c;
	--boolean: #cf6a4c;
	--null: #cf6a4c;
	--bracket: #cda869;
	--mongo-type: #9b859d;
	--mongo-value: #8f9d6a;
	--date-type: #9b859d;
	--date-value: #8f9d6a;
	--regex: #cf6a4c;
	--toggle: #5f5a60;
	--preview: #5f5a60;
	--scrollbar-bg: #1a1a1a;
	--scrollbar-thumb: #2a2a2a;
}

/* Ambiance */
.theme-ambiance {
	--bg: #202020;
	--text: #e6e1dc;
	--key: #e6e1dc;
	--key-id: #cf6a4c;
	--string: #65b042;
	--number: #3387cc;
	--boolean: #cf6a4c;
	--null: #cf6a4c;
	--bracket: #cda869;
	--mongo-type: #8f9d6a;
	--mongo-value: #65b042;
	--date-type: #cf6a4c;
	--date-value: #65b042;
	--regex: #cf6a4c;
	--toggle: #555;
	--preview: #555;
	--scrollbar-bg: #1a1a1a;
	--scrollbar-thumb: #3d3d3d;
}

/* Light Themes */

/* Eclipse */
.theme-eclipse {
	--bg: #ffffff;
	--text: #000000;
	--key: #0000c0;
	--key-id: #7f0055;
	--string: #2a00ff;
	--number: #116644;
	--boolean: #7f0055;
	--null: #7f0055;
	--bracket: #000000;
	--mongo-type: #7f0055;
	--mongo-value: #2a00ff;
	--date-type: #7f0055;
	--date-value: #2a00ff;
	--regex: #2a00ff;
	--toggle: #999;
	--preview: #999;
	--scrollbar-bg: #f7f7f7;
	--scrollbar-thumb: #cccccc;
}

/* Solarized Light */
.theme-solarized-light {
	--bg: #fdf6e3;
	--text: #657b83;
	--key: #268bd2;
	--key-id: #cb4b16;
	--string: #2aa198;
	--number: #d33682;
	--boolean: #cb4b16;
	--null: #cb4b16;
	--bracket: #586e75;
	--mongo-type: #859900;
	--mongo-value: #2aa198;
	--date-type: #d33682;
	--date-value: #2aa198;
	--regex: #dc322f;
	--toggle: #93a1a1;
	--preview: #93a1a1;
	--scrollbar-bg: #eee8d5;
	--scrollbar-thumb: #93a1a1;
}

/* IDEA */
.theme-idea {
	--bg: #ffffff;
	--text: #000000;
	--key: #000080;
	--key-id: #660e7a;
	--string: #008000;
	--number: #0000ff;
	--boolean: #000080;
	--null: #000080;
	--bracket: #000000;
	--mongo-type: #660e7a;
	--mongo-value: #008000;
	--date-type: #660e7a;
	--date-value: #008000;
	--regex: #008000;
	--toggle: #999;
	--preview: #999;
	--scrollbar-bg: #f7f7f7;
	--scrollbar-thumb: #cccccc;
}

/* Neo */
.theme-neo,
.theme-neat,
.theme-elegant {
	--bg: #ffffff;
	--text: #2e383c;
	--key: #2e95d3;
	--key-id: #9c3328;
	--string: #00a67d;
	--number: #9c3328;
	--boolean: #a535ae;
	--null: #a535ae;
	--bracket: #2e383c;
	--mongo-type: #9c3328;
	--mongo-value: #00a67d;
	--date-type: #a535ae;
	--date-value: #00a67d;
	--regex: #9c3328;
	--toggle: #999;
	--preview: #999;
	--scrollbar-bg: #f5f5f5;
	--scrollbar-thumb: #cccccc;
}

/* Yeti */
.theme-yeti {
	--bg: #eceae8;
	--text: #546e7a;
	--key: #9fb4bf;
	--key-id: #a074c4;
	--string: #96c0d8;
	--number: #a074c4;
	--boolean: #a074c4;
	--null: #a074c4;
	--bracket: #546e7a;
	--mongo-type: #55b5db;
	--mongo-value: #96c0d8;
	--date-type: #a074c4;
	--date-value: #96c0d8;
	--regex: #a074c4;
	--toggle: #9fb4bf;
	--preview: #9fb4bf;
	--scrollbar-bg: #e0ddd9;
	--scrollbar-thumb: #9fb4bf;
}
</style>
