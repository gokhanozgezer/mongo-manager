<template>
	<div class="server-view">
		<!-- No Connection -->
		<div v-if="!activeConnection" class="no-connection">
			<div class="no-connection-icon">🔌</div>
			<h3>{{ $t('selectConnection') }}</h3>
			<p>{{ $t('noConnectionInfo') }}</p>
		</div>

		<!-- Operation Links - Only show when connected -->
		<template v-else>
			<div class="operation">
				<a href="#" :class="{current: currentTab === 'server'}" @click.prevent="currentTab = 'server'">{{ $t('server') }}</a
				><span class="op-sep"> | </span>
				<a href="#" :class="{current: currentTab === 'status'}" @click.prevent="currentTab = 'status'">{{ $t('status') }}</a
				><span class="op-sep"> | </span>
				<a href="#" :class="{current: currentTab === 'databases'}" @click.prevent="currentTab = 'databases'">{{ $t('databases') }}</a
				><span class="op-sep"> | </span>
				<a href="#" :class="{current: currentTab === 'processlist'}" @click.prevent="currentTab = 'processlist'">{{ $t('processlist') }}</a
				><span class="op-sep"> | </span>
				<a href="#" :class="{current: currentTab === 'command'}" @click.prevent="currentTab = 'command'">{{ $t('command') }}</a
				><span class="op-sep"> | </span>
				<a href="#" :class="{current: currentTab === 'execute'}" @click.prevent="currentTab = 'execute'">{{ $t('execute') }}</a>
			</div>

			<!-- Server Tab -->
			<div v-if="currentTab === 'server'">
				<!-- Connection Info -->
				<table class="mongomanager-table info-table">
					<tr>
						<th colspan="2">{{ $t('connection') }}</th>
					</tr>
					<tr>
						<td class="label-col">{{ $t('host') }}</td>
						<td>{{ activeConnection.host }}</td>
					</tr>
					<tr>
						<td>{{ $t('port') }}</td>
						<td>{{ activeConnection.port }}</td>
					</tr>
					<tr>
						<td>{{ $t('username') }}</td>
						<td>{{ activeConnection.username || '(' + $t('noData') + ')' }}</td>
					</tr>
					<tr>
						<td>{{ $t('authDatabase') }}</td>
						<td>{{ activeConnection.authDatabase || 'admin' }}</td>
					</tr>
				</table>

				<div class="gap"></div>

				<!-- Build Info -->
				<table class="mongomanager-table info-table" v-if="serverInfo">
					<tr>
						<th colspan="2">{{ $t('buildInfo') }}</th>
					</tr>
					<tr>
						<td class="label-col">{{ $t('version') }}</td>
						<td>{{ serverInfo.version || 'N/A' }}</td>
					</tr>
					<tr v-if="serverInfo.gitVersion">
						<td>{{ $t('gitVersion') }}</td>
						<td>{{ serverInfo.gitVersion }}</td>
					</tr>
					<tr v-if="serverInfo.bits">
						<td>{{ $t('bits') }}</td>
						<td>{{ serverInfo.bits }}</td>
					</tr>
					<tr v-if="serverInfo.maxBsonObjectSize">
						<td>{{ $t('maxBson') }}</td>
						<td>{{ formatSize(serverInfo.maxBsonObjectSize) }}</td>
					</tr>
					<tr v-if="serverInfo.storageEngines">
						<td>{{ $t('storageEngines') }}</td>
						<td>{{ serverInfo.storageEngines.join(', ') }}</td>
					</tr>
				</table>

				<div class="gap"></div>

				<!-- Web Server -->
				<table class="mongomanager-table info-table">
					<tr>
						<th colspan="2">{{ $t('webServer') }}</th>
					</tr>
					<tr>
						<td class="label-col">{{ $t('platform') }}</td>
						<td>Node.js (Express)</td>
					</tr>
					<tr>
						<td>{{ $t('mongoDriver') }}</td>
						<td>mongodb (Node.js Official Driver)</td>
					</tr>
				</table>
			</div>

			<!-- Status Tab -->
			<div v-else-if="currentTab === 'status'">
				<div v-if="loadingStatus" class="loading">{{ $t('loadingStatus') }}</div>
				<div v-else-if="serverStatus">
					<table class="mongomanager-table info-table">
						<tr>
							<th colspan="2">{{ $t('serverStatus') }}</th>
						</tr>
						<tr>
							<td class="label-col">{{ $t('host') }}</td>
							<td>{{ serverStatus.host || 'N/A' }}</td>
						</tr>
						<tr>
							<td>{{ $t('version') }}</td>
							<td>{{ serverStatus.version || 'N/A' }}</td>
						</tr>
						<tr>
							<td>{{ $t('uptime') }}</td>
							<td>{{ formatUptime(serverStatus.uptime) }}</td>
						</tr>
						<tr>
							<td>{{ $t('currentConnections') }}</td>
							<td>{{ serverStatus.connections?.current || 0 }}</td>
						</tr>
						<tr>
							<td>{{ $t('availableConnections') }}</td>
							<td>{{ serverStatus.connections?.available || 0 }}</td>
						</tr>
					</table>

					<div class="gap"></div>

					<table class="mongomanager-table info-table" v-if="serverStatus.opcounters">
						<tr>
							<th colspan="2">{{ $t('operationCounters') }}</th>
						</tr>
						<tr>
							<td class="label-col">{{ $t('insert') }}</td>
							<td>{{ serverStatus.opcounters.insert || 0 }}</td>
						</tr>
						<tr>
							<td>{{ $t('query') }}</td>
							<td>{{ serverStatus.opcounters.query || 0 }}</td>
						</tr>
						<tr>
							<td>{{ $t('update') }}</td>
							<td>{{ serverStatus.opcounters.update || 0 }}</td>
						</tr>
						<tr>
							<td>{{ $t('delete') }}</td>
							<td>{{ serverStatus.opcounters.delete || 0 }}</td>
						</tr>
						<tr>
							<td>{{ $t('getmore') }}</td>
							<td>{{ serverStatus.opcounters.getmore || 0 }}</td>
						</tr>
						<tr>
							<td>{{ $t('command') }}</td>
							<td>{{ serverStatus.opcounters.command || 0 }}</td>
						</tr>
					</table>

					<div class="gap"></div>

					<table class="mongomanager-table info-table" v-if="serverStatus.mem">
						<tr>
							<th colspan="2">{{ $t('memory') }}</th>
						</tr>
						<tr>
							<td class="label-col">{{ $t('resident') }}</td>
							<td>{{ serverStatus.mem.resident || 0 }} MB</td>
						</tr>
						<tr>
							<td>{{ $t('virtual') }}</td>
							<td>{{ serverStatus.mem.virtual || 0 }} MB</td>
						</tr>
					</table>
				</div>
			</div>

			<!-- Databases Tab -->
			<div v-else-if="currentTab === 'databases'">
				<p>
					<a href="#" @click.prevent="showCreateDbModal = true">{{ $t('createNewDb') }}</a>
				</p>

				<table class="mongomanager-table data-table">
					<tr>
						<th>{{ $t('name') }}</th>
						<th>{{ $t('size') }}</th>
						<th>{{ $t('storageSize') }}</th>
						<th>{{ $t('dataSize') }}</th>
						<th>{{ $t('indexSize') }}</th>
						<th>{{ $t('collections') }}</th>
						<th>{{ $t('objects') }}</th>
					</tr>
					<tr v-for="db in sortedDatabases" :key="db.name">
						<td>
							<a href="#" @click.prevent="goToDatabase(db)">{{ db.name }}</a>
						</td>
						<td>{{ formatSize(db.sizeOnDisk) }}</td>
						<td>{{ formatSize(db.storageSize) }}</td>
						<td>{{ formatSize(db.dataSize) }}</td>
						<td>{{ formatSize(db.indexSize) }}</td>
						<td>{{ db.collectionCount || 0 }}</td>
						<td>{{ db.objects || 0 }}</td>
					</tr>
				</table>
			</div>

			<!-- Processlist Tab -->
			<div v-else-if="currentTab === 'processlist'">
				<p>
					<a href="#" @click.prevent="loadProcesslist">{{ $t('refresh') }}</a>
				</p>
				<div v-if="loadingProcesslist" class="loading">{{ $t('loadingProcesslist') }}</div>
				<table v-else class="mongomanager-table" width="100%">
					<tr>
						<th>{{ $t('opId') }}</th>
						<th>{{ $t('type') }}</th>
						<th>{{ $t('operation') }}</th>
						<th>{{ $t('namespace') }}</th>
						<th>{{ $t('secsRunning') }}</th>
						<th>{{ $t('description') }}</th>
					</tr>
					<tr v-if="processlist.length === 0">
						<td colspan="6">{{ $t('noActiveOps') }}</td>
					</tr>
					<tr v-for="op in processlist" :key="op.opid">
						<td>{{ op.opid }}</td>
						<td>{{ op.type }}</td>
						<td>{{ op.op }}</td>
						<td>{{ op.ns || '-' }}</td>
						<td>{{ op.secs_running || 0 }}</td>
						<td>{{ op.desc || '-' }}</td>
					</tr>
				</table>
			</div>

			<!-- Command Tab -->
			<div v-else-if="currentTab === 'command'">
				<p>{{ $t('executeDbCommand') }}</p>
				<form @submit.prevent="executeCommand">
					<table class="form-table">
						<tr>
							<td width="100">{{ $t('database') }}</td>
							<td>
								<select v-model="commandDb">
									<option value="admin">admin</option>
									<option v-for="db in databases" :key="db.name" :value="db.name">{{ db.name }}</option>
								</select>
							</td>
						</tr>
						<tr>
							<td>{{ $t('command') }}</td>
							<td>
								<textarea v-model="commandText" rows="5" style="width: 100%" placeholder='{"ping": 1}'></textarea>
							</td>
						</tr>
						<tr>
							<td></td>
							<td>
								<button type="submit">{{ $t('execute') }}</button>
							</td>
						</tr>
					</table>
				</form>
				<div v-if="commandResult" class="command-result">
					<p>
						<strong>{{ $t('result') }}:</strong>
					</p>
					<pre>{{ JSON.stringify(commandResult, null, 2) }}</pre>
				</div>
			</div>

			<!-- Shell Tab (MongoDB Compass style) -->
			<div v-else-if="currentTab === 'execute'" class="shell-tab-container">
				<MongoShell
					v-if="activeConnection"
					:connectionId="store.activeConnectionId"
					:databases="databaseNames"
					:initialDb="shellDb"
					@dbChange="shellDb = $event"
				/>
			</div>
		</template>

		<!-- Create Database Modal -->
		<div v-if="showCreateDbModal" class="modal-overlay" @click.self="closeCreateDbModal">
			<div class="mongomanager-modal" style="width: 450px">
				<div class="modal-title">{{ $t('createDatabase') }}</div>

				<!-- Tabs -->
				<div class="modal-tabs">
					<button type="button" :class="['modal-tab', {active: createDbMode === 'manual'}]" @click="createDbMode = 'manual'">
						{{ $t('manual') }}
					</button>
					<button type="button" :class="['modal-tab', {active: createDbMode === 'restore'}]" @click="createDbMode = 'restore'">
						{{ $t('fromBackup') }}
					</button>
				</div>

				<!-- Manual Mode -->
				<form v-if="createDbMode === 'manual'" @submit.prevent="createDatabase">
					<div class="modal-body">
						<table class="form-table" style="padding: 10px">
							<tr>
								<td width="120">{{ $t('databaseName') }}</td>
								<td><input type="text" v-model="newDbName" required /></td>
							</tr>
							<tr>
								<td>{{ $t('initialCollection') }}</td>
								<td><input type="text" v-model="newDbCollection" :placeholder="'(' + $t('optional') + ')'" /></td>
							</tr>
						</table>
					</div>
					<div class="modal-buttons">
						<button type="submit">{{ $t('create') }}</button>
						<button type="button" @click="closeCreateDbModal">{{ $t('cancel') }}</button>
					</div>
				</form>

				<!-- Restore Mode -->
				<form v-else @submit.prevent="createDatabaseFromBackup">
					<div class="modal-body">
						<table class="form-table" style="padding: 10px">
							<tr>
								<td width="120">{{ $t('databaseName') }}</td>
								<td><input type="text" v-model="restoreDbName" required placeholder="my_database" /></td>
							</tr>
							<tr>
								<td>{{ $t('backupFile') }}</td>
								<td>
									<input type="file" ref="restoreDbFileInput" @change="handleRestoreDbFile" accept=".tar.gz,.tgz,.json" />
								</td>
							</tr>
						</table>
						<p class="form-hint" style="margin: 10px 0 0; font-size: 12px; color: #888;">
							{{ $t('backupFileHint') }}
						</p>
					</div>
					<div class="modal-buttons">
						<button type="submit" :disabled="!restoreDbFile || restoringDb">
							{{ restoringDb ? $t('restoring') : $t('restore') }}
						</button>
						<button type="button" @click="closeCreateDbModal">{{ $t('cancel') }}</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, onMounted, watch} from 'vue'
import {useAppStore} from '../stores/app.js'
import {useRouter} from 'vue-router'
import {api} from '../api/index.js'
import {useDialog} from '../composables/useDialog.js'
import MongoShell from '../components/MongoShell.vue'

const dialog = useDialog()
const store = useAppStore()
const router = useRouter()

const currentTab = ref('server')
const serverInfo = ref(null)
const serverStatus = ref(null)
const processlist = ref([])
const loadingStatus = ref(false)
const loadingProcesslist = ref(false)
const commandDb = ref('admin')
const commandText = ref('{"ping": 1}')
const commandResult = ref(null)
const showCreateDbModal = ref(false)
const newDbName = ref('')
const newDbCollection = ref('')
const createDbMode = ref('manual')
const restoreDbName = ref('')
const restoreDbFile = ref(null)
const restoreDbFileInput = ref(null)
const restoringDb = ref(false)

// Shell state
const shellDb = ref('admin')

const activeConnection = computed(() => store.activeConnection)
const databases = computed(() => store.databases)
const sortedDatabases = computed(() => {
	return [...databases.value].sort((a, b) => a.name.localeCompare(b.name))
})
const databaseNames = computed(() => databases.value.map(db => db.name))

async function loadServerInfo() {
	if (!activeConnection.value) return
	try {
		const response = await api.get(`/connections/${store.activeConnectionId}/server-info`)
		serverInfo.value = response.data
	} catch (e) {
		console.error('Failed to load server info:', e)
	}
}

async function loadServerStatus() {
	if (!activeConnection.value) return
	loadingStatus.value = true
	try {
		const response = await api.get(`/connections/${store.activeConnectionId}/server-status`)
		serverStatus.value = response.data
	} catch (e) {
		console.error('Failed to load server status:', e)
	} finally {
		loadingStatus.value = false
	}
}

async function loadProcesslist() {
	if (!activeConnection.value) return
	loadingProcesslist.value = true
	try {
		const response = await api.get(`/connections/${store.activeConnectionId}/processlist`)
		processlist.value = response.data.processes || []
	} catch (e) {
		console.error('Failed to load processlist:', e)
		processlist.value = []
	} finally {
		loadingProcesslist.value = false
	}
}

async function executeCommand() {
	try {
		const cmd = JSON.parse(commandText.value)
		const response = await api.post(`/connections/${store.activeConnectionId}/command`, {
			database: commandDb.value,
			command: cmd
		})
		commandResult.value = response.data
	} catch (e) {
		commandResult.value = {error: e.message}
	}
}

async function createDatabase() {
	try {
		await store.createDatabase(newDbName.value, newDbCollection.value || 'init')
		closeCreateDbModal()
	} catch (error) {
		dialog.error('Failed to create database: ' + error.message)
	}
}

function closeCreateDbModal() {
	showCreateDbModal.value = false
	newDbName.value = ''
	newDbCollection.value = ''
	createDbMode.value = 'manual'
	restoreDbName.value = ''
	restoreDbFile.value = null
	if (restoreDbFileInput.value) {
		restoreDbFileInput.value.value = ''
	}
}

function handleRestoreDbFile(e) {
	restoreDbFile.value = e.target.files[0]
	if (restoreDbFile.value && !restoreDbName.value) {
		let name = restoreDbFile.value.name
		name = name.replace(/\.(tar\.gz|tgz|json)$/i, '')
		name = name.replace(/-\d{4}-\d{2}-\d{2}T[\d-]+$/, '')
		restoreDbName.value = name
	}
}

async function createDatabaseFromBackup() {
	if (!restoreDbFile.value || !restoreDbName.value) return

	restoringDb.value = true
	try {
		const formData = new FormData()
		formData.append('file', restoreDbFile.value)

		const response = await fetch(
			`/api/connections/${store.activeConnectionId}/databases/${restoreDbName.value}/restore`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${localStorage.getItem('auth_token')}`
				},
				body: formData
			}
		)

		const data = await response.json()

		if (!response.ok) {
			throw new Error(data.error || data.message || 'Restore failed')
		}

		dialog.success(data.message || 'Database restored successfully')
		closeCreateDbModal()
		await store.fetchDatabases()
	} catch (error) {
		dialog.error('Restore failed: ' + error.message)
	} finally {
		restoringDb.value = false
	}
}

function goToDatabase(db) {
	store.selectDatabase(db.name)
	store.fetchCollections()
	router.push({
		name: 'database',
		params: {
			connectionId: store.activeConnectionId,
			database: db.name
		}
	})
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

function formatUptime(seconds) {
	if (!seconds) return '0s'
	const days = Math.floor(seconds / 86400)
	const hours = Math.floor((seconds % 86400) / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = seconds % 60

	let result = ''
	if (days > 0) result += days + 'd '
	if (hours > 0) result += hours + 'h '
	if (minutes > 0) result += minutes + 'm '
	result += secs + 's'
	return result
}

watch(currentTab, tab => {
	if (tab === 'status' && !serverStatus.value) {
		loadServerStatus()
	}
	if (tab === 'processlist') {
		loadProcesslist()
	}
})

watch(
	activeConnection,
	() => {
		if (activeConnection.value) {
			loadServerInfo()
			if (databases.value.length > 0) {
				shellDb.value = databases.value[0].name
			}
		}
	},
	{immediate: true}
)

onMounted(() => {
	if (activeConnection.value) {
		loadServerInfo()
	}
})
</script>

<style scoped>
.server-view {
	max-width: 100%;
}

.no-connection {
	padding: 60px 20px;
	text-align: center;
	color: #666;
	max-width: 500px;
	margin: 0 auto;
}

.no-connection-icon {
	font-size: 48px;
	margin-bottom: 15px;
	opacity: 0.6;
}

.no-connection h3 {
	margin: 0 0 10px 0;
	color: #333;
	font-size: 16px;
}

.no-connection p {
	margin: 0;
	font-size: 13px;
	line-height: 1.5;
}

/* Dark mode */
:global(.dark) .no-connection h3 {
	color: #cfcfcf;
}

:global(.dark) .no-connection p {
	color: #999;
}

.loading {
	color: #666;
	font-style: italic;
	padding: 10px;
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

select {
	padding: 3px 5px;
	border: 1px solid #ccc;
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

/* Info table - key-value style */
.info-table {
	width: 100%;
	max-width: 600px;
}

.info-table .label-col {
	width: 150px;
	white-space: nowrap;
}

/* Data table - multi-column */
.data-table {
	width: 100%;
}

/* Shell Container */
.shell-tab-container {
	height: calc(100vh - 150px);
	min-height: 400px;
}

/* ============================================
   MOBILE RESPONSIVE STYLES - HomeView
   ============================================ */
@media screen and (max-width: 768px) {
	.server-view {
		padding: 5px;
	}

	h2 {
		font-size: 16px;
		margin: 10px 0;
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

	/* Data table - horizontal scroll */
	.data-table {
		display: block;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.data-table th,
	.data-table td {
		padding: 10px 8px;
		white-space: nowrap;
	}

	/* Shell Tab Mobile */
	.shell-tab-container {
		height: calc(100vh - 180px);
		min-height: 300px;
	}

	/* Form tables */
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

	.form-table input,
	.form-table select,
	.form-table textarea {
		width: 100%;
		padding: 12px;
		font-size: 16px;
	}

	/* Buttons */
	button {
		padding: 12px 20px;
		font-size: 14px;
	}

	/* Process list */
	.process-list {
		overflow-x: auto;
	}
}

/* Small Mobile */
@media screen and (max-width: 480px) {
	h2 {
		font-size: 14px;
	}

	.tabs a {
		padding: 8px 12px;
		font-size: 12px;
	}

	.shell-tab-container {
		height: calc(100vh - 150px);
		min-height: 250px;
	}
}

/* Touch improvements */
@media (pointer: coarse) {
	.tabs a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
}
</style>
