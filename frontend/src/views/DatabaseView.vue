<template>
	<div class="database-view">
		<!-- Operation Links -->
		<div class="operation">
			<a href="#" :class="{current: currentTab === 'collections'}" @click.prevent="currentTab = 'collections'">{{ $t('collections') }}</a
			><span class="op-sep"> | </span>
			<a href="#" :class="{current: currentTab === 'statistics'}" @click.prevent="currentTab = 'statistics'">{{ $t('statistics') }}</a><span class="op-sep"> | </span>
			<a href="#" :class="{current: currentTab === 'command'}" @click.prevent="currentTab = 'command'">{{ $t('command') }}</a><span class="op-sep"> | </span>
			<a href="#" :class="{current: currentTab === 'transfer'}" @click.prevent="currentTab = 'transfer'">{{ $t('transfer') }}</a><span class="op-sep"> | </span>
			<a href="#" class="danger" @click.prevent="confirmDropDatabase">{{ $t('dropDatabase') }}</a>
		</div>

		<!-- Database Name -->
		<h3 class="db-title">{{ $t('database') }}: {{ database }}</h3>

		<!-- Collections Tab -->
		<div v-if="currentTab === 'collections'">
			<p>
				<a href="#" @click.prevent="showCreateCollModal = true">{{ $t('createNewCollection') }}</a>
			</p>

			<div v-if="loading" class="loading">{{ $t('loadingCollections') }}</div>

			<table v-else class="mongomanager-table" width="100%">
				<tr>
					<th width="30"><input type="checkbox" v-model="selectAll" @change="toggleSelectAll" /></th>
					<th class="sortable" @click="sortBy('name')">{{ $t('name') }} <span class="sort-icon">{{ getSortIcon('name') }}</span></th>
					<th width="100" class="sortable" @click="sortBy('count')">{{ $t('documents') }} <span class="sort-icon">{{ getSortIcon('count') }}</span></th>
					<th width="100" class="sortable" @click="sortBy('size')">{{ $t('size') }} <span class="sort-icon">{{ getSortIcon('size') }}</span></th>
					<th width="100" class="sortable" @click="sortBy('avgObjSize')">{{ $t('avgDocSize') }} <span class="sort-icon">{{ getSortIcon('avgObjSize') }}</span></th>
					<th width="100" class="sortable" @click="sortBy('nindexes')">{{ $t('indexes') }} <span class="sort-icon">{{ getSortIcon('nindexes') }}</span></th>
					<th width="200">{{ $t('operations') }}</th>
				</tr>
				<tr v-if="collections.length === 0">
					<td colspan="7" class="empty">{{ $t('noCollections') }}</td>
				</tr>
				<tr v-for="coll in collections" :key="coll.name">
					<td><input type="checkbox" v-model="selectedCollections" :value="coll.name" /></td>
					<td>
						<a href="#" @click.prevent="goToCollection(coll.name)">{{ coll.name }}</a>
					</td>
					<td>{{ formatNumber(coll.count) }}</td>
					<td>{{ formatSize(coll.size) }}</td>
					<td>{{ formatSize(coll.avgObjSize) }}</td>
					<td>{{ coll.nindexes || 0 }}</td>
					<td class="operations">
						<a href="#" @click.prevent="goToCollection(coll.name)">{{ $t('browse') }}</a> |
						<a href="#" @click.prevent="goToAggregation(coll.name)">{{ $t('aggregate') }}</a> |
						<a href="#" @click.prevent="confirmDropCollection(coll.name)" class="danger">{{ $t('drop') }}</a>
					</td>
				</tr>
			</table>

			<div v-if="selectedCollections.length > 0" class="bulk-actions">
				<button @click="confirmDropSelected">{{ $t('dropSelected') }} ({{ selectedCollections.length }})</button>
			</div>
		</div>

		<!-- Statistics Tab -->
		<div v-else-if="currentTab === 'statistics'">
			<div v-if="loadingStats" class="loading">{{ $t('loadingStatistics') }}</div>
			<div v-else-if="stats">
				<table class="mongomanager-table info-table">
					<tr>
						<th colspan="2">{{ $t('databaseStatistics') }}</th>
					</tr>
					<tr>
						<td class="label-col">{{ $t('database') }}</td>
						<td>{{ stats.db }}</td>
					</tr>
					<tr>
						<td>{{ $t('collections') }}</td>
						<td>{{ stats.collections }}</td>
					</tr>
					<tr>
						<td>{{ $t('views') }}</td>
						<td>{{ stats.views || 0 }}</td>
					</tr>
					<tr>
						<td>{{ $t('objects') }}</td>
						<td>{{ formatNumber(stats.objects) }}</td>
					</tr>
					<tr>
						<td>{{ $t('avgDocSize') }}</td>
						<td>{{ formatSize(stats.avgObjSize) }}</td>
					</tr>
					<tr>
						<td>{{ $t('dataSize') }}</td>
						<td>{{ formatSize(stats.dataSize) }}</td>
					</tr>
					<tr>
						<td>{{ $t('storageSize') }}</td>
						<td>{{ formatSize(stats.storageSize) }}</td>
					</tr>
					<tr>
						<td>{{ $t('indexes') }}</td>
						<td>{{ stats.indexes }}</td>
					</tr>
					<tr>
						<td>{{ $t('indexSize') }}</td>
						<td>{{ formatSize(stats.indexSize) }}</td>
					</tr>
					<tr>
						<td>{{ $t('totalSize') }}</td>
						<td>{{ formatSize(stats.totalSize) }}</td>
					</tr>
					<tr>
						<td>{{ $t('fsUsedSize') }}</td>
						<td>{{ formatSize(stats.fsUsedSize) }}</td>
					</tr>
					<tr>
						<td>{{ $t('fsTotalSize') }}</td>
						<td>{{ formatSize(stats.fsTotalSize) }}</td>
					</tr>
				</table>
			</div>
		</div>

		<!-- Command Tab -->
		<div v-else-if="currentTab === 'command'">
			<p>{{ $t('executeDbCommand') }}</p>
			<form @submit.prevent="executeCommand">
				<table class="form-table">
					<tr>
						<td width="100">{{ $t('command') }}</td>
						<td>
							<textarea v-model="commandText" rows="5" style="width: 100%" placeholder='{"dbStats": 1}'></textarea>
						</td>
					</tr>
					<tr>
						<td></td>
						<td><button type="submit">{{ $t('execute') }}</button></td>
					</tr>
				</table>
			</form>
			<div v-if="commandResult" class="command-result">
				<p><strong>{{ $t('result') }}:</strong></p>
				<pre>{{ JSON.stringify(commandResult, null, 2) }}</pre>
			</div>
		</div>

		<!-- Transfer Tab -->
		<div v-else-if="currentTab === 'transfer'">
			<table class="mongomanager-table transfer-table">
				<tr>
					<th colspan="2">{{ $t('exportDatabase') }}</th>
				</tr>
				<tr>
					<td colspan="2" style="padding: 15px">
						<div class="export-options">
							<div class="export-option" @click="exportMongodump">
								<strong>{{ $t('exportDatabase') }}</strong>
								<span>{{ $t('exportDbDesc') }}</span>
							</div>
						</div>
						<div v-if="exporting" class="progress-box">{{ $t('exportingDb') }}</div>
					</td>
				</tr>
			</table>

			<div class="gap"></div>

			<table class="mongomanager-table transfer-table">
				<tr>
					<th colspan="2">{{ $t('restoreDatabase') }}</th>
				</tr>
				<tr>
					<td colspan="2" style="padding: 15px">
						<p>{{ $t('restoreDbDesc') }}</p>
						<div class="restore-form">
							<input type="file" @change="handleRestoreFile" accept=".tar.gz,.tgz,.json" ref="restoreFileInput" />
							<button @click="restoreDatabase" :disabled="!restoreFile || restoring" class="restore-btn">
								{{ restoring ? $t('restoring') : $t('restoreDatabase') }}
							</button>
						</div>
						<p class="warning-text">{{ $t('restoreWarning') }}</p>
						<div v-if="restoring" class="progress-box">{{ $t('restoringDb') }}</div>
					</td>
				</tr>
			</table>
		</div>

		<!-- Create Collection Modal -->
		<div v-if="showCreateCollModal" class="modal-overlay" @click.self="showCreateCollModal = false">
			<div class="mongomanager-modal">
				<div class="modal-title">{{ $t('createCollection') }}</div>
				<form @submit.prevent="createCollection">
                    <div class="modal-body">
                        <table class="form-table" style="padding: 10px">
                            <tr>
                                <td width="120">{{ $t('collectionName') }}</td>
                                <td><input type="text" v-model="newCollName" required /></td>
                            </tr>
                            <tr>
                                <td>{{ $t('capped') }}</td>
                                <td><input type="checkbox" v-model="newCollCapped" /></td>
                            </tr>
                            <tr v-if="newCollCapped">
                                <td>{{ $t('cappedSize') }}</td>
                                <td><input type="number" v-model="newCollSize" placeholder="10485760" /></td>
                            </tr>
                            <tr v-if="newCollCapped">
                                <td>{{ $t('maxDocuments') }}</td>
                                <td><input type="number" v-model="newCollMax" :placeholder="'(' + $t('optional') + ')'" /></td>
                            </tr>
                        </table>
                    </div>
					<div class="modal-buttons">
						<button type="submit">{{ $t('create') }}</button>
						<button type="button" @click="showCreateCollModal = false">{{ $t('cancel') }}</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, onMounted, watch} from 'vue'
import {useRouter} from 'vue-router'
import {useAppStore} from '../stores/app.js'
import {api} from '../api/index.js'
import {useDialog} from '../composables/useDialog.js'

const props = defineProps({
	connectionId: {type: String, required: true},
	database: {type: String, required: true}
})

const dialog = useDialog()
const router = useRouter()
const store = useAppStore()

const currentTab = ref('collections')
const loading = ref(true)
const loadingStats = ref(false)
const stats = ref(null)
const selectedCollections = ref([])
const selectAll = ref(false)
const showCreateCollModal = ref(false)
const newCollName = ref('')
const newCollCapped = ref(false)
const newCollSize = ref(10485760)
const newCollMax = ref('')
const commandText = ref('{"dbStats": 1}')
const commandResult = ref(null)
const restoreFile = ref(null)
const exporting = ref(false)
const restoring = ref(false)
const restoreFileInput = ref(null)

// Sorting
const sortField = ref(localStorage.getItem('collectionsSortField') || 'name')
const sortDirection = ref(localStorage.getItem('collectionsSortDirection') || 'asc')

const sortedCollections = computed(() => {
	const colls = [...store.collections]
	const field = sortField.value
	const dir = sortDirection.value === 'asc' ? 1 : -1

	return colls.sort((a, b) => {
		let valA = a[field]
		let valB = b[field]

		// Handle string comparison (name)
		if (field === 'name') {
			return dir * valA.localeCompare(valB)
		}

		// Handle numeric comparison
		valA = valA || 0
		valB = valB || 0
		return dir * (valA - valB)
	})
})

function sortBy(field) {
	if (sortField.value === field) {
		// Toggle direction
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
	} else {
		sortField.value = field
		sortDirection.value = field === 'name' ? 'asc' : 'desc' // Default desc for numbers
	}
	// Save to localStorage
	localStorage.setItem('collectionsSortField', sortField.value)
	localStorage.setItem('collectionsSortDirection', sortDirection.value)
}

function getSortIcon(field) {
	if (sortField.value !== field) return '↕'
	return sortDirection.value === 'asc' ? '↑' : '↓'
}

const collections = computed(() => sortedCollections.value)

async function loadData() {
	loading.value = true
	try {
		if (store.activeConnectionId !== props.connectionId) {
			store.setActiveConnection(props.connectionId)
		}
		store.selectDatabase(props.database)
		// Fetch databases for sidebar if not loaded
		if (store.databases.length === 0) {
			await store.fetchDatabases()
		}
		await store.fetchCollections()
	} catch (error) {
		console.error('Failed to load database:', error)
	} finally {
		loading.value = false
	}
}

async function loadStats() {
	loadingStats.value = true
	try {
		const response = await api.get(`/connections/${props.connectionId}/databases/${props.database}/stats`)
		stats.value = response.data
	} catch (error) {
		console.error('Failed to load stats:', error)
	} finally {
		loadingStats.value = false
	}
}

function goToCollection(collName) {
	store.selectCollection(collName)
	router.push({
		name: 'collection',
		params: {
			connectionId: props.connectionId,
			database: props.database,
			collection: collName
		}
	})
}

function goToAggregation(collName) {
	router.push({
		name: 'aggregation',
		params: {
			connectionId: props.connectionId,
			database: props.database,
			collection: collName
		}
	})
}

function toggleSelectAll() {
	if (selectAll.value) {
		selectedCollections.value = collections.value.map(c => c.name)
	} else {
		selectedCollections.value = []
	}
}

async function createCollection() {
	try {
		const options = {}
		if (newCollCapped.value) {
			options.capped = true
			options.size = parseInt(newCollSize.value) || 10485760
			if (newCollMax.value) {
				options.max = parseInt(newCollMax.value)
			}
		}
		await store.createCollection(newCollName.value, options)
		showCreateCollModal.value = false
		newCollName.value = ''
		newCollCapped.value = false
		await loadData()
	} catch (error) {
		dialog.error('Failed to create collection: ' + error.message)
	}
}

async function confirmDropCollection(collName) {
	// Step 1: Ask for collection name confirmation
	const step1 = await dialog.prompt({
		title: 'Drop Collection',
		message: `To drop collection <strong>${collName}</strong>, type the collection name below:`,
		type: 'error',
		inputPlaceholder: collName,
		matchValue: collName,
		confirmText: 'Continue',
		cancelText: 'Cancel'
	})

	if (!step1.confirmed) return

	// Step 2: Ask for password confirmation
	const step2 = await dialog.prompt({
		title: 'Confirm Drop - Enter Password',
		message: 'This action <strong>cannot be undone</strong>. Enter your password to confirm:',
		type: 'error',
		inputType: 'password',
		inputPlaceholder: 'Enter your password',
		confirmText: 'Drop Collection',
		cancelText: 'Cancel'
	})

	if (!step2.confirmed) return

	// Verify password
	try {
		const username = store.user?.username
		await api.post('/auth/login', {
			username: username,
			password: step2.value
		})
	} catch (e) {
		dialog.error('Invalid password')
		return
	}

	// Drop the collection
	try {
		await store.dropCollection(collName)
		dialog.success(`Collection "${collName}" dropped successfully`)
		await loadData()
	} catch (error) {
		dialog.error('Failed to drop collection: ' + error.message)
	}
}

async function confirmDropSelected() {
	const collectionList = selectedCollections.value.join(', ')
	const result = await dialog.prompt({
		title: 'Drop Collections',
		message: `You are about to drop <strong>${selectedCollections.value.length}</strong> collections:<br><br><code>${collectionList}</code><br><br>Type <strong>DROP</strong> to confirm:`,
		type: 'error',
		placeholder: 'DROP',
		confirmText: 'Drop Collections',
		cancelText: 'Cancel'
	})

	// prompt returns {confirmed: boolean, value: string}
	if (!result.confirmed) return

	if (result.value?.trim() !== 'DROP') {
		dialog.error('You must type DROP to confirm')
		return
	}

	try {
		for (const collName of selectedCollections.value) {
			await store.dropCollection(collName)
		}
		selectedCollections.value = []
		selectAll.value = false
		await loadData()
	} catch (error) {
		dialog.error('Failed to drop collections: ' + error.message)
	}
}

async function confirmDropDatabase() {
	const confirmed1 = await dialog.confirm({
		title: 'Drop Database',
		message: `Are you sure you want to drop database "${props.database}"? This cannot be undone!`,
		type: 'error',
		confirmText: 'Continue',
		cancelText: 'Cancel'
	})
	if (!confirmed1) return

	const confirmed2 = await dialog.confirm({
		title: 'Confirm Drop Database',
		message: `This will delete ALL data in "${props.database}". Are you REALLY sure?`,
		type: 'error',
		confirmText: 'Drop Database',
		cancelText: 'Cancel'
	})
	if (!confirmed2) return

	try {
		await store.dropDatabase(props.database)
		router.push('/')
	} catch (error) {
		dialog.error('Failed to drop database: ' + error.message)
	}
}

async function executeCommand() {
	try {
		const cmd = JSON.parse(commandText.value)
		const response = await api.post(`/connections/${props.connectionId}/command`, {
			database: props.database,
			command: cmd
		})
		commandResult.value = response.data
	} catch (e) {
		commandResult.value = {error: e.message}
	}
}

// Export database using mongodump (tar.gz)
async function exportMongodump() {
	exporting.value = true
	try {
		const response = await api.get(`/connections/${props.connectionId}/databases/${props.database}/export`, {responseType: 'blob'})

		const blob = new Blob([response.data], {type: 'application/gzip'})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${props.database}.tar.gz`
		a.click()
		URL.revokeObjectURL(url)
	} catch (e) {
		dialog.error('Export failed: ' + (e.message || 'Unknown error'))
	} finally {
		exporting.value = false
	}
}

function handleRestoreFile(e) {
	restoreFile.value = e.target.files[0]
}

// Restore database from tar.gz backup (mongorestore)
async function restoreDatabase() {
	if (!restoreFile.value) return

	const confirmed = await dialog.confirm({
		title: 'Restore Database',
		message: 'This will replace existing collections with the backup data. Continue?',
		type: 'warning',
		confirmText: 'Restore',
		cancelText: 'Cancel'
	})
	if (!confirmed) return

	restoring.value = true
	try {
		const formData = new FormData()
		formData.append('file', restoreFile.value)

		const response = await api.post(`/connections/${props.connectionId}/databases/${props.database}/restore`, formData)

		restoreFile.value = null
		if (restoreFileInput.value) {
			restoreFileInput.value.value = ''
		}
		await loadData()
		dialog.success(response.data.message || 'Restore completed successfully')
	} catch (e) {
		dialog.error('Restore failed: ' + (e.response?.data?.error || e.message))
	} finally {
		restoring.value = false
	}
}

function formatSize(bytes) {
	if (!bytes || bytes === 0) return '0 B'
	const units = ['B', 'KB', 'MB', 'GB', 'TB']
	let i = 0
	while (bytes >= 1024 && i < units.length - 1) {
		bytes /= 1024
		i++
	}
	return bytes.toFixed(bytes >= 100 ? 0 : 1) + ' ' + units[i]
}

function formatNumber(num) {
	if (!num) return '0'
	return num.toLocaleString()
}

watch(currentTab, tab => {
	if (tab === 'statistics' && !stats.value) {
		loadStats()
	}
})

onMounted(loadData)

watch(() => [props.connectionId, props.database], loadData)
</script>

<style scoped>
.database-view {
	max-width: 100%;
}

.db-title {
	margin: 10px 0;
	font-size: 14px;
	font-weight: bold;
	color: #333;
}

.loading {
	color: #666;
	font-style: italic;
	padding: 10px;
}

.empty {
	color: #999;
	font-style: italic;
	text-align: center;
}

.operations a {
	margin: 0 2px;
}

/* Sortable headers */
.sortable {
	cursor: pointer;
	user-select: none;
	white-space: nowrap;
}

.sortable:hover {
	background: #e8e8e8;
}

.sort-icon {
	font-size: 10px;
	margin-left: 4px;
	color: #666;
}

:global(.dark) .sortable:hover {
	background: #3c3c3c;
}

:global(.dark) .sort-icon {
	color: #999;
}

.danger {
	color: #c00 !important;
}

.danger:hover {
	color: #900 !important;
}

.bulk-actions {
	margin-top: 10px;
	padding: 10px;
	background: #f9f9f9;
	border: 1px solid #ddd;
}

.bulk-actions button {
	background: #c00;
	color: #fff;
	border: 1px solid #900;
	padding: 5px 15px;
	cursor: pointer;
}

.bulk-actions button:hover {
	background: #900;
}

.command-result {
	margin-top: 15px;
	background: #f9f9f9;
	border: 1px solid #ddd;
	padding: 10px;
}

.command-result pre {
	margin: 0;
	white-space: pre-wrap;
	word-wrap: break-word;
	max-height: 400px;
	overflow: auto;
}

textarea {
	padding: 5px;
	border: 1px solid #ccc;
}

button {
	padding: 5px 15px;
	cursor: pointer;
	border: 1px solid #ccc;
	background: #eee;
}

button:hover {
	background: #ddd;
}

button[type='submit'] {
	background: #004499;
	color: #fff;
	border-color: #003377;
}

button[type='submit']:hover {
	background: #003377;
}

button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

input[type='text'],
input[type='number'] {
	width: 100%;
	padding: 3px 5px;
	border: 1px solid #ccc;
}

input[type='file'] {
	margin-right: 10px;
}

/* Export/Restore Styles */
.export-options {
	margin: 10px 0;
}

.export-option {
	padding: 12px;
	border: 1px solid #ddd;
	cursor: pointer;
	background: #fafafa;
	transition: all 0.2s;
}

.export-option:hover {
	border-color: #004499;
	background: #f0f5ff;
}

.export-option strong {
	color: #004499;
	display: block;
	margin-bottom: 5px;
}

.export-option span {
	font-size: 12px;
	color: #666;
}

.restore-form {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 10px 0;
}

.restore-btn {
	background: #004499;
	color: #fff;
	border: 1px solid #003377;
	padding: 8px 20px;
}

.restore-btn:hover:not(:disabled) {
	background: #003377;
}

.restore-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.warning-text {
	color: #c00;
	font-size: 12px;
	margin-top: 10px;
}

.progress-box {
	margin-top: 15px;
	padding: 10px;
	background: #fff8e0;
	border: 1px solid #ffe066;
	color: #856404;
	text-align: center;
}

/* Info table - key-value style */
.info-table {
	width: 100%;
	max-width: 600px;
}

.info-table .label-col {
	width: 200px;
	white-space: nowrap;
}

/* Transfer table */
.transfer-table {
	width: 100%;
	max-width: 700px;
}

/* ============================================
   MOBILE RESPONSIVE STYLES - DatabaseView
   ============================================ */
@media screen and (max-width: 768px) {
	.database-view {
		padding: 5px;
	}

	.db-title {
		font-size: 16px;
		padding: 10px 0;
	}

	/* Operation bar - grid layout */
	.operation {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
		padding: 10px;
		white-space: normal;
	}

	/* Hide pipe separators on mobile */
	.operation .op-sep {
		display: none;
	}

	.operation a {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px 10px;
		background: #f0f0f0;
		border-radius: 6px;
		border: 1px solid #ddd;
		text-decoration: none;
		font-weight: 500;
		color: #004499;
	}

	.operation a:hover,
	.operation a:active {
		background: #e0e0e0;
	}

	.operation a.current {
		background: #004499;
		color: #fff;
		border-color: #003377;
	}

	.operation a.danger {
		background: #fee;
		border-color: #fcc;
		color: #c00;
	}

	/* Info table - card style on mobile */
	.info-table {
		max-width: 100%;
		display: block;
	}

	.info-table tbody {
		display: block;
	}

	.info-table tr {
		display: flex;
		flex-wrap: wrap;
		border-bottom: 1px solid #ddd;
		padding: 8px 0;
	}

	.info-table tr:first-child {
		display: block;
		padding: 10px;
	}

	.info-table th {
		display: block;
		width: 100%;
		text-align: left;
		padding: 8px 10px;
	}

	.info-table td {
		padding: 4px 10px;
		white-space: normal;
		word-break: break-word;
	}

	.info-table td.label-col {
		width: 100%;
		font-weight: bold;
		color: #666;
		font-size: 12px;
	}

	.info-table td:not(.label-col) {
		width: 100%;
	}

	/* Transfer table - full width */
	.transfer-table {
		max-width: 100%;
		display: block;
	}

	/* Data tables - horizontal scroll */
	.mongomanager-table:not(.info-table):not(.transfer-table) {
		display: block;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.mongomanager-table:not(.info-table):not(.transfer-table) th,
	.mongomanager-table:not(.info-table):not(.transfer-table) td {
		padding: 10px 8px;
		white-space: nowrap;
	}

	/* Form table */
	.form-table {
		display: block;
	}

	.form-table tr {
		display: block;
		margin-bottom: 15px;
	}

	.form-table td {
		display: block;
		width: 100%;
		padding: 5px 0;
	}

	.form-table input[type='text'],
	.form-table input[type='number'],
	.form-table textarea {
		width: 100%;
		padding: 12px;
		font-size: 16px;
	}

	/* Operations column */
	.operations {
		white-space: nowrap;
	}

	.operations a {
		padding: 5px 8px;
		display: inline-block;
	}

	/* Bulk actions */
	.bulk-actions {
		padding: 15px;
	}

	.bulk-actions button {
		width: 100%;
		padding: 12px;
		font-size: 14px;
	}

	/* Command result */
	.command-result {
		padding: 10px;
	}

	.command-result pre {
		font-size: 11px;
		max-height: 300px;
	}

	/* Modal */
	.mongomanager-modal {
		width: 95% !important;
		max-width: none;
		margin: 10px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-buttons {
		display: flex;
		gap: 10px;
	}

	.modal-buttons button {
		flex: 1;
		padding: 12px;
		font-size: 14px;
	}

	/* Export/Restore */
	.export-option {
		padding: 15px;
	}

	.restore-form {
		flex-direction: column;
		align-items: stretch;
	}

	.restore-form input[type='file'] {
		margin-bottom: 10px;
	}

	.restore-btn {
		width: 100%;
	}
}

/* Small Mobile */
@media screen and (max-width: 480px) {
	.operation a {
		padding: 6px 10px;
		font-size: 12px;
	}

	.mongomanager-table th,
	.mongomanager-table td {
		padding: 8px 5px;
		font-size: 11px;
	}

	.db-title {
		font-size: 14px;
	}
}

/* Touch improvements */
@media (pointer: coarse) {
	.mongomanager-table td a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}

	input[type='checkbox'] {
		width: 20px;
		height: 20px;
	}

	.operation a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
}

/* ============================================
   DARK MODE STYLES - DatabaseView
   ============================================ */
:global(.dark) .database-view {
	color: #cfcfcf;
}

/* Dark Mode - Modal */
:global(.dark) .mongomanager-modal {
	background: #252526;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

:global(.dark) .modal-title {
	background: #333;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

:global(.dark) .modal-buttons {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

:global(.dark) .modal-buttons button {
	background: #3c3c3c;
	border-color: #555;
	color: #cfcfcf;
}

:global(.dark) .modal-buttons button:hover {
	background: #4a4a4a;
}

:global(.dark) .form-table td {
	color: #cfcfcf;
}

:global(.dark) .form-table input {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

:global(.dark) .mongomanager-modal p {
	color: #cfcfcf;
}

:global(.dark) .mongomanager-modal strong {
	color: #fff;
}

:global(.dark) .db-title {
	color: #cfcfcf;
}

:global(.dark) .loading {
	color: #858585;
}

:global(.dark) .empty {
	color: #666;
}

:global(.dark) .bulk-actions {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

:global(.dark) .command-result {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

:global(.dark) .command-result pre {
	color: #cfcfcf;
}

:global(.dark) textarea {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

:global(.dark) button {
	background: #3c3c3c;
	border-color: #555;
	color: #cfcfcf;
}

:global(.dark) button:hover {
	background: #4c4c4c;
}

:global(.dark) button[type='submit'] {
	background: #0e639c;
	border-color: #094771;
	color: #fff;
}

:global(.dark) button[type='submit']:hover {
	background: #1177bb;
}

:global(.dark) input[type='text'],
:global(.dark) input[type='number'] {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

/* Export/Restore Dark Mode */
:global(.dark) .export-option {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

:global(.dark) .export-option:hover {
	border-color: #0e639c;
	background: #1e3a5f;
}

:global(.dark) .export-option strong {
	color: #cee2fa;
}

:global(.dark) .export-option span {
	color: #858585;
}

:global(.dark) .progress-box {
	background: #3d3a1e;
	border-color: #665c00;
	color: #dcdcaa;
}

:global(.dark) .restore-btn {
	background: #0e639c;
	border-color: #094771;
}

:global(.dark) .restore-btn:hover:not(:disabled) {
	background: #1177bb;
}

/* Mobile Dark Mode */
@media screen and (max-width: 768px) {
	:global(.dark) .operation a {
		background: #2d2d2d;
		border-color: #3c3c3c;
		color: #cee2fa;
	}

	:global(.dark) .operation a:hover,
	:global(.dark) .operation a:active {
		background: #3c3c3c;
	}

	:global(.dark) .operation a.current {
		background: #0e639c;
		color: #fff;
		border-color: #094771;
	}

	:global(.dark) .operation a.danger {
		background: #3d1e1e;
		border-color: #5c2d2d;
		color: #f48771;
	}

	:global(.dark) .info-table td.label-col {
		color: #858585;
	}
}
</style>
