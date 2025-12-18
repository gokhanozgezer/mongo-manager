<template>
	<div class="collection-view">
		<!-- Operation Links -->
		<div class="operation">
			<a href="#" @click.prevent="showHistory = true">{{ $t('history') }}</a
			><span class="op-sep"> | </span> <a href="#" @click.prevent="refresh">{{ $t('refresh') }}</a
			><span class="op-sep"> | </span> <a href="#" @click.prevent="showInsertModal = true">{{ $t('insert') }}</a
			><span class="op-sep"> | </span> <a href="#" @click.prevent="showNewFieldModal = true">{{ $t('newField') }}</a
			><span class="op-sep"> | </span>
			<a href="#" :class="{current: currentTab === 'statistics'}" @click.prevent="currentTab = 'statistics'">{{ $t('statistics') }}</a
			><span class="op-sep"> | </span>
			<router-link :to="{name: 'aggregation', params: {connectionId, database, collection}}">{{ $t('aggregate') }}</router-link
			><span class="op-sep"> | </span> <a href="#" @click.prevent="showExportModal = true">{{ $t('export') }}</a
			><span class="op-sep"> | </span> <a href="#" @click.prevent="showImportModal = true">{{ $t('import') }}</a
			><span class="op-sep"> | </span> <a href="#" @click.prevent="showPropertiesModal = true">{{ $t('properties') }}</a
			><span class="op-sep"> | </span>
			<span class="more-menu">
				<a href="#" @click.prevent="toggleMoreMenu">{{ $t('more') }} »</a>
				<div v-if="showMoreMenu" class="dropdown-menu">
					<a href="#" @click.prevent="currentTab = 'indexes'; showMoreMenu = false">{{ $t('indexes') }}</a>
					<a href="#" @click.prevent="showRenameModal = true; showMoreMenu = false">{{ $t('rename') }}</a>
					<a href="#" @click.prevent="duplicateCollection">{{ $t('duplicate') }}</a>
					<a href="#" @click.prevent="showTransferModal = true; showMoreMenu = false">{{ $t('transfer') }}</a>
					<a href="#" @click.prevent="validateCollection">{{ $t('validate') }}</a>
					<a href="#" @click.prevent="confirmDropCollection(); showMoreMenu = false" class="danger-link">{{ $t('drop') }}</a>
				</div>
			</span>
		</div>

		<h2 class="coll-title">{{ database }}.{{ collection }}</h2>

		<!-- Documents Tab -->
		<div v-if="currentTab === 'documents'" class="documents-tab">
			<!-- Advanced Query Form - Hidden when collection is truly empty -->
			<table v-if="!isCollectionEmpty" class="mongomanager-table query-table" width="100%">
				<tr>
					<th colspan="6">{{ $t('query') }}</th>
				</tr>
				<tr>
					<td width="80">{{ $t('filter') }}</td>
					<td colspan="5">
						<MongoQueryInput
							ref="filterInputRef"
							v-model="filterQuery"
							:document-fields="documentFields"
							placeholder='{ "_id": ObjectId("..."), "date": ISODate("...") }'
							input-style="width: 100%; padding: 4px 6px; border: 1px solid #ccc; font-size: 12px;"
							@search="search"
						/>
					</td>
				</tr>
				<tr>
					<td>{{ $t('fields') }}</td>
					<td colspan="3">
						<MongoQueryInput
							ref="projectionInputRef"
							v-model="projectionQuery"
							:document-fields="documentFields"
							placeholder='{ "field1": 1, "field2": 1 }'
							input-style="width: 100%; padding: 4px 6px; border: 1px solid #ccc; font-size: 12px;"
							@search="search"
						/>
					</td>
					<td width="80">{{ $t('sort') }}</td>
					<td width="200">
						<MongoQueryInput
							ref="sortInputRef"
							v-model="sortQuery"
							:document-fields="documentFields"
							placeholder='{ "_id": -1 }'
							input-style="width: 100%; padding: 4px 6px; border: 1px solid #ccc; font-size: 12px;"
							@search="search"
						/>
					</td>
				</tr>
				<tr>
					<td>{{ $t('limit') }}</td>
					<td width="100">
						<select v-model="pageSize" @change="search">
							<option :value="10">10</option>
							<option :value="20">20</option>
							<option :value="50">50</option>
							<option :value="100">100</option>
							<option :value="200">200</option>
						</select>
					</td>
					<td width="80">{{ $t('skip') }}</td>
					<td width="100">
						<input type="number" v-model.number="skipCount" style="width: 80px" min="0" />
					</td>
					<td colspan="2">
						<button @click="search">{{ $t('query') }}</button>
						<button @click="clearSearch">{{ $t('clear') }}</button>
						<button @click="explainQuery">{{ $t('explain') }}</button>
					</td>
				</tr>
			</table>

			<!-- Actions Bar - Hidden when collection is empty or no documents found -->
			<div v-if="!isCollectionEmpty && documents.length > 0" class="actions-bar">
				<span class="left-actions">
					<input type="checkbox" v-model="selectAll" @change="toggleSelectAll" id="selectAll" />
					<label for="selectAll">{{ $t('selectPage') }}</label>
					<span v-if="selectedDocs.length > 0" class="selected-actions">
						| {{ $t('selected') }}: {{ selectedDocs.length }} | <a href="#" @click.prevent="updateSelectedDocs">{{ $t('update') }}</a> |
						<a href="#" @click.prevent="deleteSelectedDocs" class="danger-link">{{ $t('delete') }}</a>
					</span>
					<span class="filter-actions" v-if="filterQuery.trim() || true">
						| <a href="#" @click.prevent="openMultiUpdateModal">{{ $t('updateAll') }} ({{ totalDocs }})</a> |
						<a href="#" @click.prevent="showMultiDeleteModal = true" class="danger-link">{{ $t('deleteAll') }} ({{ totalDocs }})</a>
					</span>
				</span>
				<span class="right-info"> {{ $t('documents') }}: {{ totalDocs }} | {{ $t('page') }} {{ page }} {{ $t('of') }} {{ totalPages }} </span>
			</div>

			<!-- Loading -->
			<div v-if="loading" class="loading">{{ $t('loading') }}</div>

			<!-- Empty Collection Message -->
			<div v-else-if="isCollectionEmpty" class="empty-collection-message">
				<div class="empty-icon">📭</div>
				<h3>{{ $t('emptyCollection') || 'This collection is empty' }}</h3>
				<p>{{ $t('emptyCollectionHint') || 'Use the Insert button above to add documents.' }}</p>
			</div>

			<!-- Documents List - Scrollable Container -->
			<div v-else class="documents-container">
				<div class="documents-scroll">
					<div v-if="documents.length === 0" class="empty-text">{{ $t('noDocumentsFound') || 'No documents match your query' }}</div>

					<div v-for="(doc, index) in documents" :key="getDocId(doc)" class="doc-row">
						<div class="doc-header">
							<input type="checkbox" :checked="isSelected(doc)" @change="toggleSelect(doc)" />
							<span class="doc-num">#{{ skipCount + index + 1 }}</span>
							<span class="doc-id">_id: {{ getDocIdDisplay(doc) }}</span>
							<span class="doc-actions">
								<a href="#" @click.prevent="editDoc(doc)">{{ $t('update') }}</a
								><span class="action-sep"> | </span> <a href="#" @click.prevent="duplicateDoc(doc)">{{ $t('duplicate') }}</a
								><span class="action-sep"> | </span> <a href="#" @click.prevent="deleteDoc(doc)" class="danger-link">{{ $t('delete') }}</a
								><span class="action-sep"> | </span> <a href="#" @click.prevent="copyDoc(doc)">{{ $t('copy') }}</a
								><span class="action-sep"> | </span>
								<a href="#" @click.prevent="toggleExpand(doc)">{{ isExpanded(doc) ? $t('collapse') : $t('expand') }}</a>
							</span>
						</div>
						<div class="doc-content">
							<JsonViewer :value="doc" :max-height="isExpanded(doc) ? 'none' : '120px'" :defaultExpanded="true" :expandAll="isExpanded(doc)" :key="getDocId(doc) + '-' + isExpanded(doc)" />
						</div>
					</div>
				</div>

				<!-- Fixed Pagination -->
				<div class="pagination-fixed" v-if="totalPages > 1">
					<a href="#" @click.prevent="goToPage(1)" :class="{disabled: page === 1}">« {{ $t('first') }}</a>
					<a href="#" @click.prevent="goToPage(page - 1)" :class="{disabled: page === 1}">‹ {{ $t('prev') }}</a>
					<span class="page-info">{{ $t('page') }} {{ page }} {{ $t('of') }} {{ totalPages }} ({{ totalDocs }} {{ $t('docs') }})</span>
					<a href="#" @click.prevent="goToPage(page + 1)" :class="{disabled: page === totalPages}">{{ $t('next') }} ›</a>
					<a href="#" @click.prevent="goToPage(totalPages)" :class="{disabled: page === totalPages}">{{ $t('last') }} »</a>
					<span class="page-jump">
						{{ $t('goTo') }}: <input type="number" v-model.number="jumpToPage" min="1" :max="totalPages" @keyup.enter="goToPage(jumpToPage)" />
					</span>
				</div>
			</div>
		</div>

		<!-- Indexes Tab -->
		<div v-else-if="currentTab === 'indexes'">
			<div class="operation sub-operation">
				<a href="#" @click.prevent="currentTab = 'documents'">« {{ $t('backToDocuments') }}</a
				><span class="op-sep"> | </span> <a href="#" @click.prevent="showCreateIndexModal = true">{{ $t('createIndex') }}</a
				><span class="op-sep"> | </span>
				<a href="#" @click.prevent="loadIndexes">{{ $t('refresh') }}</a>
			</div>

			<table class="mongomanager-table" width="100%">
				<tr>
					<th>{{ $t('name') }}</th>
					<th>{{ $t('indexKeys') }}</th>
					<th>{{ $t('unique') }}</th>
					<th>{{ $t('sparse') }}</th>
					<th>TTL</th>
					<th>{{ $t('size') }}</th>
					<th>{{ $t('operations') }}</th>
					<th>{{ $t('actions') }}</th>
				</tr>
				<tr v-if="indexes.length === 0">
					<td colspan="8" class="empty">{{ $t('noIndexes') }}</td>
				</tr>
				<tr v-for="idx in indexes" :key="idx.name">
					<td>{{ idx.name }}</td>
					<td>
						<code>{{ JSON.stringify(idx.key) }}</code>
					</td>
					<td>{{ idx.unique ? 'Yes' : '-' }}</td>
					<td>{{ idx.sparse ? 'Yes' : '-' }}</td>
					<td>{{ idx.expireAfterSeconds ? idx.expireAfterSeconds + 's' : '-' }}</td>
					<td>{{ formatSize(idx.size) }}</td>
					<td>{{ idx.accesses?.ops || '-' }}</td>
					<td>
						<a href="#" v-if="idx.name !== '_id_'" @click.prevent="dropIndex(idx)" class="danger-link">{{ $t('drop') }}</a>
						<span v-else>-</span>
					</td>
				</tr>
			</table>
		</div>

		<!-- Statistics Tab -->
		<div v-else-if="currentTab === 'statistics'">
			<div class="operation sub-operation">
				<a href="#" @click.prevent="currentTab = 'documents'">« {{ $t('backToDocuments') }}</a
				><span class="op-sep"> | </span>
				<a href="#" @click.prevent="loadStats">{{ $t('refresh') }}</a>
			</div>

			<table class="mongomanager-table info-table" v-if="stats">
				<tr>
					<th colspan="2">{{ $t('collectionStats') }}: {{ collection }}</th>
				</tr>
				<tr>
					<td class="label-col">{{ $t('namespace') }}</td>
					<td>{{ stats.ns }}</td>
				</tr>
				<tr>
					<td>{{ $t('documentCount') }}</td>
					<td>{{ stats.count?.toLocaleString() || 0 }}</td>
				</tr>
				<tr>
					<td>{{ $t('size') }}</td>
					<td>{{ formatSize(stats.size) }}</td>
				</tr>
				<tr>
					<td>{{ $t('avgDocSize') }}</td>
					<td>{{ formatSize(stats.avgObjSize) }}</td>
				</tr>
				<tr>
					<td>{{ $t('storageSize') }}</td>
					<td>{{ formatSize(stats.storageSize) }}</td>
				</tr>
				<tr>
					<td>{{ $t('totalIndexSize') }}</td>
					<td>{{ formatSize(stats.totalIndexSize) }}</td>
				</tr>
				<tr>
					<td>{{ $t('indexes') }}</td>
					<td>{{ stats.nindexes || 0 }}</td>
				</tr>
				<tr>
					<td>{{ $t('capped') }}</td>
					<td>{{ stats.capped ? $t('yes') : $t('no') }}</td>
				</tr>
				<tr v-if="stats.capped">
					<td>{{ $t('cappedSize') }}</td>
					<td>{{ formatSize(stats.maxSize) }}</td>
				</tr>
				<tr v-if="stats.capped">
					<td>{{ $t('maxDocuments') }}</td>
					<td>{{ stats.max || '-' }}</td>
				</tr>
			</table>
		</div>

		<!-- Insert Modal -->
		<div v-if="showInsertModal" class="modal-overlay" @click.self="showInsertModal = false">
			<div class="mongomanager-modal" style="width: 750px">
				<div class="modal-title">{{ $t('insertDocumentInto') }} {{ collection }}</div>
				<form @submit.prevent="insertDoc">
					<div style="padding: 10px">
						<p class="hint">{{ $t('enterValidJson') }}. {{ $t('idAutoGenerated') }}.</p>
						<JsonEditor v-model="insertDocJson" height="400px" />
					</div>
					<div class="modal-buttons">
						<button type="submit">{{ $t('insert') }}</button>
						<button type="button" @click="showInsertModal = false">{{ $t('cancel') }}</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Edit/Update Modal -->
		<div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
			<div class="mongomanager-modal" style="width: 750px">
				<div class="modal-title">{{ $t('updateDocument') }}</div>
				<form @submit.prevent="updateDoc">
					<div style="padding: 10px">
						<p class="hint">_id: {{ getDocIdDisplay(editingDoc) }} ({{ $t('idCannotChange') }})</p>
						<JsonEditor v-model="editDocJson" height="400px" />
					</div>
					<div class="modal-buttons">
						<button type="submit">{{ $t('update') }}</button>
						<button type="button" @click="showEditModal = false">{{ $t('cancel') }}</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Multi Update Modal (Filter-based) -->
		<div v-if="showMultiUpdateModal" class="modal-overlay" @click.self="showMultiUpdateModal = false">
			<div class="mongomanager-modal" style="width: 700px">
				<div class="modal-title">{{ $t('updateAllMatchingDocs') }} ({{ totalDocs }})</div>
				<form @submit.prevent="multiUpdateByFilter">
					<div style="padding: 10px">
						<p class="hint">
							{{ $t('filter') }}: <code>{{ filterQuery.trim() || '{}' }}</code>
						</p>
						<p class="hint">{{ $t('enterUpdateOps') }}:</p>
						<JsonEditor v-model="multiUpdateJson" height="250px" placeholder='{ "$set": { "status": "updated" } }' />
					</div>
					<div class="modal-buttons">
						<button type="submit" class="danger-btn">{{ $t('update') }} {{ totalDocs }} {{ $t('documents') }}</button>
						<button type="button" @click="showMultiUpdateModal = false">{{ $t('cancel') }}</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Multi Delete Modal (Filter-based) -->
		<div v-if="showMultiDeleteModal" class="modal-overlay" @click.self="showMultiDeleteModal = false">
			<div class="mongomanager-modal" style="width: 500px">
				<div class="modal-title">{{ $t('deleteAllMatchingDocs') }}</div>
				<div style="padding: 15px">
					<p>
						<strong>{{ $t('warning') }}:</strong> {{ $t('delete') }} <strong>{{ totalDocs }}</strong> {{ $t('documents') }}
						{{ $t('matchingFilter') }}:
					</p>
					<p>
						<code>{{ filterQuery.trim() || '{ } (' + $t('allDocuments') + ')' }}</code>
					</p>
					<p style="color: #c00; margin-top: 10px">{{ $t('confirmDeleteDocs') }}</p>
					<div style="margin-top: 15px">
						<label>
							<input type="checkbox" v-model="confirmMultiDelete" />
							{{ $t('iUnderstandDelete') }}
						</label>
					</div>
				</div>
				<div class="modal-buttons">
					<button type="button" @click="multiDeleteByFilter" :disabled="!confirmMultiDelete" class="danger-btn">
						{{ $t('delete') }} {{ totalDocs }} {{ $t('documents') }}
					</button>
					<button type="button" @click="showMultiDeleteModal = false; confirmMultiDelete = false">{{ $t('cancel') }}</button>
				</div>
			</div>
		</div>

		<!-- Update Selected Documents Modal -->
		<div v-if="showSelectedUpdateModal" class="modal-overlay" @click.self="showSelectedUpdateModal = false">
			<div class="mongomanager-modal" style="width: 700px">
				<div class="modal-title">{{ $t('updateSelectedDocs') }} ({{ selectedDocs.length }})</div>
				<form @submit.prevent="executeSelectedUpdate">
					<div style="padding: 10px">
						<p class="hint">{{ $t('enterUpdateOps') }} {{ selectedDocs.length }} {{ $t('forSelectedDocs') }}:</p>
						<JsonEditor v-model="selectedUpdateJson" height="250px" />
					</div>
					<div class="modal-buttons">
						<button type="submit">{{ $t('update') }} {{ selectedDocs.length }} {{ $t('documents') }}</button>
						<button type="button" @click="showSelectedUpdateModal = false">{{ $t('cancel') }}</button>
					</div>
				</form>
			</div>
		</div>

		<!-- New Field Modal -->
		<div v-if="showNewFieldModal" class="modal-overlay" @click.self="showNewFieldModal = false">
			<div class="mongomanager-modal modal-form" style="width: 420px">
				<div class="modal-title">{{ $t('addNewFieldToAll') }}</div>
				<form @submit.prevent="addNewField">
					<div class="modal-form-body">
						<div class="form-group">
							<label class="form-label">{{ $t('fieldName') }}</label>
							<input type="text" v-model="newFieldName" required class="form-input" />
						</div>
						<div class="form-group">
							<label class="form-label">{{ $t('fieldType') }}</label>
							<select v-model="newFieldType" class="form-select">
								<option value="string">String</option>
								<option value="number">Number</option>
								<option value="boolean">Boolean</option>
								<option value="null">Null</option>
								<option value="array">Array</option>
								<option value="object">Object</option>
							</select>
						</div>
						<div class="form-group">
							<label class="form-label">{{ $t('defaultValue') }}</label>
							<input type="text" v-model="newFieldValue" class="form-input" :placeholder="$t('leaveEmptyNull')" />
						</div>
					</div>
					<div class="modal-buttons">
						<button type="button" @click="showNewFieldModal = false" class="btn-cancel">{{ $t('cancel') }}</button>
						<button type="submit" class="btn-primary">{{ $t('add') }}</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Rename Modal -->
		<div v-if="showRenameModal" class="modal-overlay" @click.self="showRenameModal = false">
			<div class="mongomanager-modal modal-form" style="width: 400px">
				<div class="modal-title">{{ $t('renameCollection') }}</div>
				<form @submit.prevent="renameCollection">
					<div class="modal-form-body">
						<div class="form-group">
							<label class="form-label">{{ $t('currentName') }}</label>
							<div class="form-value">{{ collection }}</div>
						</div>
						<div class="form-group">
							<label class="form-label">{{ $t('newName') }}</label>
							<input type="text" v-model="newCollectionName" required class="form-input" />
						</div>
					</div>
					<div class="modal-buttons">
						<button type="button" @click="showRenameModal = false" class="btn-cancel">{{ $t('cancel') }}</button>
						<button type="submit" class="btn-primary">{{ $t('rename') }}</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Export Modal -->
		<div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
			<div class="mongomanager-modal" style="width: 500px">
				<div class="modal-title">{{ $t('exportCollection') }}: {{ collection }}</div>
				<div style="padding: 15px">
					<p>{{ $t('export') }}:</p>
					<div class="export-options">
						<div class="export-option" @click="exportMongodump">
							<strong>{{ $t('mongodump') }}</strong>
							<p>{{ $t('mongodumpDesc') }}</p>
						</div>
						<div class="export-option" @click="exportJson">
							<strong>{{ $t('jsonExport') }}</strong>
							<p>{{ $t('jsonExportDesc') }}</p>
						</div>
						<div class="export-option" @click="exportJsonFiltered" v-if="filterQuery.trim()">
							<strong>{{ $t('jsonExport') }} ({{ $t('filter') }})</strong>
							<p>{{ $t('export') }} {{ $t('matchingFilter') }}.</p>
						</div>
					</div>
					<div v-if="exporting" class="export-progress">
						{{ $t('exporting') }}
					</div>
				</div>
				<div class="modal-buttons">
					<button type="button" @click="showExportModal = false">{{ $t('cancel') }}</button>
				</div>
			</div>
		</div>

		<!-- Import Modal -->
		<div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
			<div class="mongomanager-modal" style="width: 550px">
				<div class="modal-title">{{ $t('importCollection') }}: {{ collection }}</div>
				<div style="padding: 15px">
					<div class="import-tabs">
						<a href="#" :class="{active: importTab === 'mongorestore'}" @click.prevent="importTab = 'mongorestore'">{{ $t('mongodump') }}</a>
						<a href="#" :class="{active: importTab === 'json'}" @click.prevent="importTab = 'json'">JSON</a>
					</div>

					<div v-if="importTab === 'mongorestore'" class="import-section">
						<p>{{ $t('mongodumpDesc') }}</p>
						<input type="file" @change="handleRestoreFile" accept=".tar.gz,.tgz" ref="restoreFileInput" />
						<p class="hint" style="margin-top: 10px">{{ $t('restoreWarning') }}</p>
					</div>

					<div v-if="importTab === 'json'" class="import-section">
						<p>{{ $t('jsonExportDesc') }}</p>
						<input type="file" @change="handleImportFile" accept=".json" ref="importFileInput" />
						<div v-if="importPreview" style="margin-top: 10px">
							<p>{{ importPreview.count }} {{ $t('documents') }}</p>
						</div>
						<div style="margin-top: 10px">
							<label>{{ $t('import') }}:</label>
							<select v-model="importMode" style="margin-left: 10px">
								<option value="insert">{{ $t('insert') }}</option>
								<option value="upsert">Upsert</option>
								<option value="drop">{{ $t('drop') }} & {{ $t('insert') }}</option>
							</select>
						</div>
					</div>

					<div v-if="importing" class="import-progress">
						{{ $t('importing') }}
					</div>
				</div>
				<div class="modal-buttons">
					<button type="button" @click="doImport" :disabled="importing || (!importFile && !restoreFile)">
						{{ importTab === 'mongorestore' ? $t('restoreDatabase') : $t('import') }}
					</button>
					<button type="button" @click="closeImportModal">{{ $t('cancel') }}</button>
				</div>
			</div>
		</div>

		<!-- Properties Modal -->
		<div v-if="showPropertiesModal" class="modal-overlay" @click.self="showPropertiesModal = false">
			<div class="mongomanager-modal" style="width: 500px">
				<div class="modal-title">{{ $t('properties') }}: {{ collection }}</div>
				<div style="padding: 15px">
					<table class="mongomanager-table" width="100%" v-if="stats">
						<tr>
							<td width="150">{{ $t('databases') }}</td>
							<td>{{ database }}</td>
						</tr>
						<tr>
							<td>{{ $t('collections') }}</td>
							<td>{{ collection }}</td>
						</tr>
						<tr>
							<td>{{ $t('documents') }}</td>
							<td>{{ stats.count?.toLocaleString() || 0 }}</td>
						</tr>
						<tr>
							<td>{{ $t('indexes') }}</td>
							<td>{{ stats.nindexes || 0 }}</td>
						</tr>
						<tr>
							<td>{{ $t('size') }}</td>
							<td>{{ formatSize(stats.size) }}</td>
						</tr>
						<tr>
							<td>{{ $t('storageSize') }}</td>
							<td>{{ formatSize(stats.storageSize) }}</td>
						</tr>
						<tr>
							<td>{{ $t('capped') }}</td>
							<td>{{ stats.capped ? $t('yes') : $t('no') }}</td>
						</tr>
					</table>
				</div>
				<div class="modal-buttons">
					<button type="button" @click="showPropertiesModal = false">{{ $t('close') }}</button>
				</div>
			</div>
		</div>

		<!-- Transfer Modal -->
		<div v-if="showTransferModal" class="modal-overlay" @click.self="showTransferModal = false">
			<div class="mongomanager-modal modal-form" style="width: 420px">
				<div class="modal-title">{{ $t('transfer') }}: {{ collection }}</div>
				<form @submit.prevent="transferCollection">
					<div class="modal-form-body">
						<div class="form-group">
							<label class="form-label">{{ $t('targetDatabase') }}</label>
							<select v-model="transferTargetDb" class="form-select">
								<option v-for="db in availableDatabases" :key="db.name" :value="db.name">{{ db.name }}</option>
							</select>
						</div>
						<div class="form-group">
							<label class="form-label">{{ $t('targetCollection') }}</label>
							<input type="text" v-model="transferTargetColl" :placeholder="collection" class="form-input" />
						</div>
						<div class="form-group">
							<label class="form-label">{{ $t('options') }}</label>
							<div class="checkbox-group">
								<label class="checkbox-item"> <input type="checkbox" v-model="transferCopyIndexes" /> {{ $t('copyIndexes') }} </label>
								<label class="checkbox-item"> <input type="checkbox" v-model="transferDropTarget" /> {{ $t('dropTargetFirst') }} </label>
							</div>
						</div>
					</div>
					<div class="modal-buttons">
						<button type="button" @click="showTransferModal = false" class="btn-cancel">{{ $t('cancel') }}</button>
						<button type="submit" class="btn-primary">{{ $t('transfer') }}</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Create Index Modal -->
		<div v-if="showCreateIndexModal" class="modal-overlay" @click.self="showCreateIndexModal = false">
			<div class="mongomanager-modal modal-form" style="width: 500px">
				<div class="modal-title">{{ $t('createIndex') }}: {{ collection }}</div>
				<form @submit.prevent="createIndex">
					<div class="modal-form-body">
						<!-- Index Name -->
						<div class="form-group">
							<label class="form-label">{{ $t('name') }}</label>
							<input type="text" v-model="newIndexName" class="form-input" :placeholder="$t('optional')" />
						</div>

						<!-- Index Fields -->
						<div class="form-group">
							<label class="form-label">{{ $t('fields') }}</label>
							<div class="index-fields-list">
								<div v-for="(field, index) in indexFields" :key="index" class="index-field-item">
									<input
										type="text"
										v-model="field.name"
										class="form-input field-name"
										:placeholder="$t('fieldName')"
										:required="index === 0"
									/>
									<select v-model="field.order" class="form-select field-order">
										<option :value="1">ASC (1)</option>
										<option :value="-1">DESC (-1)</option>
										<option value="text">Text</option>
										<option value="2dsphere">2dsphere</option>
										<option value="hashed">Hashed</option>
									</select>
									<div class="field-actions">
										<button
											type="button"
											v-if="index === indexFields.length - 1"
											@click="addIndexField"
											class="btn-icon btn-add"
											title="Add"
										>
											+
										</button>
										<button
											type="button"
											v-if="indexFields.length > 1"
											@click="removeIndexField(index)"
											class="btn-icon btn-remove"
											title="Remove"
										>
											−
										</button>
									</div>
								</div>
							</div>
						</div>

						<!-- Options -->
						<div class="form-group">
							<label class="form-label">{{ $t('options') }}</label>
							<div class="checkbox-group">
								<label class="checkbox-item"> <input type="checkbox" v-model="newIndexUnique" /> {{ $t('unique') }} </label>
								<label class="checkbox-item"> <input type="checkbox" v-model="newIndexSparse" /> {{ $t('sparse') }} </label>
								<label class="checkbox-item"> <input type="checkbox" v-model="newIndexBackground" /> {{ $t('background') }} </label>
								<label class="checkbox-item" v-if="newIndexUnique">
									<input type="checkbox" v-model="newIndexDropDups" /> {{ $t('dropDuplicates') }}
								</label>
							</div>
						</div>

						<!-- TTL -->
						<div class="form-group">
							<label class="form-label">TTL ({{ $t('optional') }})</label>
							<div class="ttl-input">
								<input type="number" v-model.number="newIndexTTL" class="form-input" style="width: 120px" :placeholder="$t('seconds')" min="0" />
								<span class="form-hint">{{ $t('ttlHint') }}</span>
							</div>
						</div>
					</div>

					<div class="modal-buttons">
						<button type="button" @click="closeCreateIndexModal" class="btn-cancel">{{ $t('cancel') }}</button>
						<button type="submit" class="btn-primary">{{ $t('createIndex') }}</button>
					</div>
				</form>
			</div>
		</div>

		<!-- History Modal -->
		<div v-if="showHistory" class="modal-overlay" @click.self="showHistory = false">
			<div class="mongomanager-modal" style="width: 600px">
				<div class="modal-title">{{ $t('queryHistory') }}</div>
				<div style="padding: 15px; max-height: 400px; overflow-y: auto">
					<div v-if="queryHistory.length === 0" class="empty-text">{{ $t('noQueryHistory') }}</div>
					<div v-for="(h, i) in queryHistory" :key="i" class="history-item" @click="applyHistory(h)">
						<div class="history-query">{{ h.filter || '{}' }}</div>
						<div class="history-meta">{{ h.date }} | {{ h.count }} {{ $t('result') }}</div>
					</div>
				</div>
				<div class="modal-buttons">
					<button type="button" @click="clearHistory">{{ $t('clearHistory') }}</button>
					<button type="button" @click="showHistory = false">{{ $t('close') }}</button>
				</div>
			</div>
		</div>

		<!-- Explain Modal -->
		<div v-if="showExplainModal" class="modal-overlay" @click.self="showExplainModal = false">
			<div class="mongomanager-modal" style="width: 700px">
				<div class="modal-title">{{ $t('queryExplain') }}</div>
				<div style="padding: 15px; max-height: 500px; overflow-y: auto">
					<pre style="font-size: 11px">{{ JSON.stringify(explainResult, null, 2) }}</pre>
				</div>
				<div class="modal-buttons">
					<button type="button" @click="showExplainModal = false">{{ $t('close') }}</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, onMounted, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useAppStore} from '../stores/app.js'
import {api} from '../api/index.js'
import {useDialog} from '../composables/useDialog.js'
import JsonViewer from '../components/JsonViewer.vue'
import JsonEditor from '../components/JsonEditor.vue'
import MongoQueryInput from '../components/MongoQueryInput.vue'

const dialog = useDialog()

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const connectionId = computed(() => route.params.connectionId)
const database = computed(() => route.params.database)
const collection = computed(() => route.params.collection)

// Tabs
const currentTab = ref('documents')

// Query state
const loading = ref(false)
const documents = ref([])
const indexes = ref([])
const stats = ref(null)
const totalDocs = ref(0)
const page = ref(1)
const pageSize = ref(20)
const skipCount = ref(0)
const filterQuery = ref('')
const sortQuery = ref('{ "_id": -1 }')
const projectionQuery = ref('')
const jumpToPage = ref(1)

// Selection
const selectedDocs = ref([])
const selectAll = ref(false)
const expandedDocs = ref({})

// Modals
const showInsertModal = ref(false)
const showEditModal = ref(false)
const showMultiUpdateModal = ref(false)
const showSelectedUpdateModal = ref(false)
const selectedUpdateJson = ref('{\n  "$set": {\n    \n  }\n}')
const showMultiDeleteModal = ref(false)
const confirmMultiDelete = ref(false)
const showNewFieldModal = ref(false)
const showRenameModal = ref(false)
const showImportModal = ref(false)
const showPropertiesModal = ref(false)
const showTransferModal = ref(false)
const showCreateIndexModal = ref(false)
const showHistory = ref(false)
const showExplainModal = ref(false)
const showMoreMenu = ref(false)

// Form data
const insertDocJson = ref('{\n  \n}')
const editDocJson = ref('')
const editingDoc = ref(null)
const multiUpdateJson = ref('{\n  "$set": {\n    \n  }\n}')
const newFieldName = ref('')
const newFieldType = ref('string')
const newFieldValue = ref('')
const newCollectionName = ref('')
const importFile = ref(null)
const importPreview = ref(null)
const restoreFile = ref(null)
const importTab = ref('mongorestore')
const importMode = ref('insert')
const importing = ref(false)
const exporting = ref(false)
const showExportModal = ref(false)
const restoreFileInput = ref(null)
const importFileInput = ref(null)

// Transfer
const transferTargetDb = ref('')
const transferTargetColl = ref('')
const transferCopyIndexes = ref(true)
const transferDropTarget = ref(false)
const availableDatabases = computed(() => store.databases)

// Check if collection is truly empty (not filtered, but actually has no documents)
const isCollectionEmpty = computed(() => stats.value && stats.value.count === 0)

// Query input refs
const filterInputRef = ref(null)
const projectionInputRef = ref(null)
const sortInputRef = ref(null)

// Extract fields from documents for autocomplete
const documentFields = computed(() => {
	const fields = new Map()

	function extractFields(obj, prefix = '') {
		if (!obj || typeof obj !== 'object') return

		for (const [key, value] of Object.entries(obj)) {
			// Skip MongoDB extended JSON keys
			if (key.startsWith('$')) continue

			const path = prefix ? `${prefix}.${key}` : key
			let type = 'unknown'

			if (value === null) {
				type = 'null'
			} else if (Array.isArray(value)) {
				type = 'array'
			} else if (typeof value === 'object') {
				if (value.$oid) type = 'ObjectId'
				else if (value.$date) type = 'Date'
				else if (value.$numberLong) type = 'NumberLong'
				else if (value.$numberDecimal) type = 'Decimal'
				else {
					type = 'object'
					// Recursively extract nested fields
					extractFields(value, path)
				}
			} else {
				type = typeof value
			}

			if (!fields.has(path)) {
				fields.set(path, {path, type})
			}
		}
	}

	// Extract from first few documents
	for (const doc of documents.value.slice(0, 10)) {
		extractFields(doc)
	}

	return Array.from(fields.values()).sort((a, b) => a.path.localeCompare(b.path))
})

// Parse MongoDB query syntax (ObjectId, ISODate, etc.)
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
		throw new Error('Invalid query: ' + e.message)
	}
}

// Index form with multiple fields
const indexFields = ref([{name: '', order: 1}])
const newIndexName = ref('')
const newIndexUnique = ref(false)
const newIndexSparse = ref(false)
const newIndexBackground = ref(false)
const newIndexDropDups = ref(false)
const newIndexTTL = ref(null)

function addIndexField() {
	indexFields.value.push({name: '', order: 1})
}

function removeIndexField(index) {
	if (indexFields.value.length > 1) {
		indexFields.value.splice(index, 1)
	}
}

function closeCreateIndexModal() {
	showCreateIndexModal.value = false
	indexFields.value = [{name: '', order: 1}]
	newIndexName.value = ''
	newIndexUnique.value = false
	newIndexSparse.value = false
	newIndexBackground.value = false
	newIndexDropDups.value = false
	newIndexTTL.value = null
}

// History & Explain
const queryHistory = ref(JSON.parse(localStorage.getItem('queryHistory') || '[]'))
const explainResult = ref(null)

const totalPages = computed(() => Math.ceil(totalDocs.value / pageSize.value) || 1)

// Load documents
async function loadDocuments() {
	// Guard against undefined route params
	if (!connectionId.value || !database.value || !collection.value) {
		return
	}
	loading.value = true
	try {
		const params = new URLSearchParams()
		params.set('page', page.value.toString())
		params.set('pageSize', pageSize.value.toString())

		// Parse and convert MongoDB syntax (ObjectId, ISODate, etc.) to Extended JSON
		if (filterQuery.value.trim()) {
			try {
				const parsed = parseMongoQuery(filterQuery.value)
				params.set('filter', JSON.stringify(parsed))
			} catch (e) {
				dialog.error('Filter error: ' + e.message)
				loading.value = false
				return
			}
		}
		if (sortQuery.value.trim()) {
			try {
				const parsed = parseMongoQuery(sortQuery.value)
				params.set('sort', JSON.stringify(parsed))
			} catch (e) {
				dialog.error('Sort error: ' + e.message)
				loading.value = false
				return
			}
		}
		if (projectionQuery.value.trim()) {
			try {
				const parsed = parseMongoQuery(projectionQuery.value)
				params.set('projection', JSON.stringify(parsed))
			} catch (e) {
				dialog.error('Projection error: ' + e.message)
				loading.value = false
				return
			}
		}

		const response = await api.get(
			`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents?${params.toString()}`
		)

		documents.value = response.data.documents || []
		totalDocs.value = response.data.pagination?.totalCount || 0
		skipCount.value = (page.value - 1) * pageSize.value
		selectedDocs.value = []
		selectAll.value = false
		expandedDocs.value = {}

		// Save to history
		if (filterQuery.value.trim()) {
			addToHistory(filterQuery.value, documents.value.length)
		}
	} catch (e) {
		console.error('Failed to load documents:', e)
		dialog.error('Error: ' + e.message)
	} finally {
		loading.value = false
	}
}

async function loadIndexes() {
	if (!connectionId.value || !database.value || !collection.value) return
	try {
		const response = await api.get(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/indexes`)
		indexes.value = response.data.indexes || []
	} catch (e) {
		console.error('Failed to load indexes:', e)
	}
}

async function loadStats() {
	if (!connectionId.value || !database.value || !collection.value) return
	try {
		const response = await api.get(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/stats`)
		stats.value = response.data
	} catch (e) {
		console.error('Failed to load stats:', e)
	}
}

function search() {
	page.value = 1
	loadDocuments()
}

function clearSearch() {
	filterQuery.value = ''
	sortQuery.value = '{ "_id": -1 }'
	projectionQuery.value = ''
	page.value = 1
	loadDocuments()
}

function refresh() {
	loadDocuments()
	loadStats()
	// Also refresh sidebar collection counts
	store.fetchCollections()
}

function goToPage(p) {
	if (p < 1 || p > totalPages.value) return
	page.value = p
	jumpToPage.value = p
	loadDocuments()
}

// Document helpers
function getDocId(doc) {
	if (doc._id && doc._id.$oid) return doc._id.$oid
	return String(doc._id)
}

function getDocIdDisplay(doc) {
	const id = getDocId(doc)
	return id.length > 30 ? id.substring(0, 30) + '...' : id
}

function isSelected(doc) {
	return selectedDocs.value.includes(getDocId(doc))
}

function toggleSelect(doc) {
	const id = getDocId(doc)
	const idx = selectedDocs.value.indexOf(id)
	if (idx === -1) {
		selectedDocs.value.push(id)
	} else {
		selectedDocs.value.splice(idx, 1)
	}
}

function toggleSelectAll() {
	if (selectAll.value) {
		selectedDocs.value = documents.value.map(d => getDocId(d))
	} else {
		selectedDocs.value = []
	}
}

function isExpanded(doc) {
	return !!expandedDocs.value[getDocId(doc)]
}

function toggleExpand(doc) {
	const id = getDocId(doc)
	if (expandedDocs.value[id]) {
		delete expandedDocs.value[id]
	} else {
		expandedDocs.value[id] = true
	}
	// Trigger reactivity
	expandedDocs.value = {...expandedDocs.value}
}

function toggleMoreMenu() {
	showMoreMenu.value = !showMoreMenu.value
}

// Format document for display
function formatDoc(doc) {
	const formatted = formatMongoDoc(doc)
	return syntaxHighlight(formatted)
}

function formatMongoDoc(obj, indent = 0) {
	const spaces = '  '.repeat(indent)
	const nextSpaces = '  '.repeat(indent + 1)

	if (obj === null) return 'null'
	if (obj === undefined) return 'undefined'

	if (obj && typeof obj === 'object') {
		if (obj.$date) {
			const dateVal = typeof obj.$date === 'object' ? new Date(parseInt(obj.$date.$numberLong)) : new Date(obj.$date)
			return `ISODate("${dateVal.toISOString()}")`
		}
		if (obj.$oid) {
			return `ObjectId("${obj.$oid}")`
		}
		if (obj.$numberLong) {
			return `NumberLong(${obj.$numberLong})`
		}
		if (obj.$numberDecimal) {
			return `NumberDecimal("${obj.$numberDecimal}")`
		}
		if (obj.$binary) {
			return `BinData(${obj.$binary.subType || 0}, "${obj.$binary.base64}")`
		}
		if (obj.$regex) {
			return `/${obj.$regex}/${obj.$options || ''}`
		}

		if (Array.isArray(obj)) {
			if (obj.length === 0) return '[]'
			const items = obj.map(item => nextSpaces + formatMongoDoc(item, indent + 1))
			return '[\n' + items.join(',\n') + '\n' + spaces + ']'
		}

		const keys = Object.keys(obj)
		if (keys.length === 0) return '{}'

		const pairs = keys.map(key => {
			const value = formatMongoDoc(obj[key], indent + 1)
			return `${nextSpaces}"${key}": ${value}`
		})

		return '{\n' + pairs.join(',\n') + '\n' + spaces + '}'
	}

	if (typeof obj === 'string') {
		return `"${obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
	}

	return String(obj)
}

function syntaxHighlight(text) {
	text = text.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
	text = text.replace(/(ISODate|ObjectId|NumberLong|NumberDecimal|BinData)(\([^)]*\))/g, '<span class="mongo-type">$1$2</span>')
	text = text.replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
	text = text.replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
	text = text.replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
	text = text.replace(/: (null)/g, ': <span class="json-null">$1</span>')
	return text
}

// Document CRUD
function editDoc(doc) {
	editingDoc.value = doc
	const editableDoc = {...doc}
	delete editableDoc._id
	editDocJson.value = JSON.stringify(editableDoc, null, 2)
	showEditModal.value = true
}

function copyDoc(doc) {
	const text = JSON.stringify(doc, null, 2)
	navigator.clipboard
		.writeText(text)
		.then(() => {
			dialog.success('Copied to clipboard')
		})
		.catch(() => {
			const textarea = document.createElement('textarea')
			textarea.value = text
			document.body.appendChild(textarea)
			textarea.select()
			document.execCommand('copy')
			document.body.removeChild(textarea)
			dialog.success('Copied to clipboard')
		})
}

function duplicateDoc(doc) {
	const newDoc = {...doc}
	delete newDoc._id
	insertDocJson.value = JSON.stringify(newDoc, null, 2)
	showInsertModal.value = true
}

async function insertDoc() {
	try {
		const doc = JSON.parse(insertDocJson.value)
		await api.post(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents`, {document: doc})
		showInsertModal.value = false
		insertDocJson.value = '{\n  \n}'
		refresh()
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

async function updateDoc() {
	try {
		const doc = JSON.parse(editDocJson.value)
		const docId = getDocId(editingDoc.value)
		await api.put(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents/${docId}`, {
			document: doc,
			replace: true
		})
		showEditModal.value = false
		refresh()
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

async function deleteDoc(doc) {
	const confirmed = await dialog.confirm({
		title: 'Delete Document',
		message: 'Delete this document?',
		type: 'warning',
		confirmText: 'Delete',
		cancelText: 'Cancel'
	})
	if (!confirmed) return
	try {
		const docId = getDocId(doc)
		await api.delete(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents/${docId}`)
		refresh()
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

// Delete selected documents (by ID)
async function deleteSelectedDocs() {
	const confirmed = await dialog.confirm({
		title: 'Delete Documents',
		message: `Delete ${selectedDocs.value.length} selected documents?`,
		type: 'warning',
		confirmText: 'Delete',
		cancelText: 'Cancel'
	})
	if (!confirmed) return
	try {
		await api.post(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents/delete`, {
			documentIds: selectedDocs.value
		})
		refresh()
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

// Update selected documents (by ID) - opens modal
function updateSelectedDocs() {
	selectedUpdateJson.value = '{\n  "$set": {\n    \n  }\n}'
	showSelectedUpdateModal.value = true
}

// Execute update on selected documents
async function executeSelectedUpdate() {
	try {
		const update = JSON.parse(selectedUpdateJson.value)
		for (const docId of selectedDocs.value) {
			await api.put(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents/${docId}`, {
				document: update,
				replace: false
			})
		}
		showSelectedUpdateModal.value = false
		refresh()
		dialog.success(`Updated ${selectedDocs.value.length} documents`)
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

// Open multi update modal with default $set
function openMultiUpdateModal() {
	multiUpdateJson.value = '{\n  "$set": {\n    \n  }\n}'
	showMultiUpdateModal.value = true
}

// Multi Update by filter (updateMany)
async function multiUpdateByFilter() {
	try {
		const update = parseMongoQuery(multiUpdateJson.value)
		const filter = filterQuery.value.trim() ? parseMongoQuery(filterQuery.value) : {}

		const response = await api.post(
			`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents/update-many`,
			{filter, update}
		)

		showMultiUpdateModal.value = false
		refresh()
		dialog.success(`Updated ${response.data.modifiedCount || 'multiple'} documents`)
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

// Multi Delete by filter (deleteMany)
async function multiDeleteByFilter() {
	try {
		const filter = filterQuery.value.trim() ? parseMongoQuery(filterQuery.value) : {}

		const response = await api.post(
			`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents/delete-many`,
			{filter}
		)

		showMultiDeleteModal.value = false
		confirmMultiDelete.value = false
		refresh()
		dialog.success(`Deleted ${response.data.deletedCount || 'multiple'} documents`)
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

async function addNewField() {
	try {
		let value
		switch (newFieldType.value) {
			case 'number':
				value = Number(newFieldValue.value) || 0
				break
			case 'boolean':
				value = newFieldValue.value === 'true'
				break
			case 'null':
				value = null
				break
			case 'array':
				value = []
				break
			case 'object':
				value = {}
				break
			default:
				value = newFieldValue.value
		}

		const update = {$set: {[newFieldName.value]: value}}

		// This would need a backend endpoint for updateMany
		// For now, we'll update all documents one by one
		const allDocs = await api.get(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents?pageSize=10000`)

		for (const doc of allDocs.data.documents || []) {
			const docId = getDocId(doc)
			await api.put(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents/${docId}`, {
				document: update,
				replace: false
			})
		}

		showNewFieldModal.value = false
		newFieldName.value = ''
		newFieldValue.value = ''
		refresh()
		dialog.success('Field added to all documents')
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

// Collection operations
async function renameCollection() {
	try {
		await api.put(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/rename`, {
			newName: newCollectionName.value
		})
		showRenameModal.value = false
		router.push({
			name: 'collection',
			params: {
				connectionId: connectionId.value,
				database: database.value,
				collection: newCollectionName.value
			}
		})
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

async function duplicateCollection() {
	const newName = prompt('Enter name for duplicate collection:', collection.value + '_copy')
	if (!newName) return

	try {
		// Get all documents
		const allDocs = await api.get(
			`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/documents?pageSize=100000`
		)

		// Create new collection and insert documents
		await api.post(`/connections/${connectionId.value}/databases/${database.value}/collections`, {name: newName})

		if (allDocs.data.documents?.length > 0) {
			const docsWithoutId = allDocs.data.documents.map(d => {
				const newDoc = {...d}
				delete newDoc._id
				return newDoc
			})

			await api.post(`/connections/${connectionId.value}/databases/${database.value}/collections/${newName}/documents/bulk`, {documents: docsWithoutId})
		}

		dialog.success(`Collection duplicated as "${newName}"`)
		store.fetchCollections()
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

async function validateCollection() {
	try {
		const response = await api.post(`/connections/${connectionId.value}/command`, {
			database: database.value,
			command: {validate: collection.value}
		})
		dialog.alert({
			title: 'Validation Result',
			message: `<pre style="max-height: 300px; overflow: auto; font-size: 12px;">${JSON.stringify(response.data, null, 2)}</pre>`,
			type: 'info'
		})
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

async function transferCollection() {
	dialog.warning('Transfer functionality requires additional backend support')
	showTransferModal.value = false
}

// Export with mongodump (tar.gz)
async function exportMongodump() {
	exporting.value = true
	try {
		const response = await api.get(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/export`, {
			responseType: 'blob'
		})

		const blob = new Blob([response.data], {type: 'application/gzip'})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${database.value}-${collection.value}.tar.gz`
		a.click()
		URL.revokeObjectURL(url)
		showExportModal.value = false
	} catch (e) {
		dialog.error('Export failed: ' + (e.response?.data?.error || e.message))
	} finally {
		exporting.value = false
	}
}

// Export as JSON
async function exportJson() {
	exporting.value = true
	try {
		const response = await api.get(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/export-json`, {
			responseType: 'blob'
		})

		const blob = new Blob([response.data], {type: 'application/json'})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${database.value}-${collection.value}.json`
		a.click()
		URL.revokeObjectURL(url)
		showExportModal.value = false
	} catch (e) {
		dialog.error('Export failed: ' + (e.response?.data?.error || e.message))
	} finally {
		exporting.value = false
	}
}

// Export filtered JSON
async function exportJsonFiltered() {
	exporting.value = true
	try {
		const filter = encodeURIComponent(filterQuery.value.trim())
		const response = await api.get(
			`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/export-json?filter=${filter}`,
			{responseType: 'blob'}
		)

		const blob = new Blob([response.data], {type: 'application/json'})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${database.value}-${collection.value}-filtered.json`
		a.click()
		URL.revokeObjectURL(url)
		showExportModal.value = false
	} catch (e) {
		dialog.error('Export failed: ' + (e.response?.data?.error || e.message))
	} finally {
		exporting.value = false
	}
}

function handleImportFile(e) {
	importFile.value = e.target.files[0]
	if (importFile.value) {
		const reader = new FileReader()
		reader.onload = event => {
			try {
				const data = JSON.parse(event.target.result)
				const docs = Array.isArray(data) ? data : data.documents || [data]
				importPreview.value = {count: docs.length}
			} catch (e) {
				importPreview.value = null
				dialog.error('Invalid JSON file')
			}
		}
		reader.readAsText(importFile.value)
	}
}

function handleRestoreFile(e) {
	restoreFile.value = e.target.files[0]
}

function closeImportModal() {
	showImportModal.value = false
	importFile.value = null
	restoreFile.value = null
	importPreview.value = null
	importTab.value = 'mongorestore'
	importMode.value = 'insert'
}

async function doImport() {
	if (importTab.value === 'mongorestore') {
		await restoreFromBackup()
	} else {
		await importJsonDocuments()
	}
}

// Restore from tar.gz backup (mongorestore)
async function restoreFromBackup() {
	if (!restoreFile.value) return

	const confirmed = await dialog.confirm({
		title: 'Restore Collection',
		message: 'This will replace the existing collection data. Continue?',
		type: 'warning',
		confirmText: 'Restore',
		cancelText: 'Cancel'
	})
	if (!confirmed) return

	importing.value = true
	try {
		const formData = new FormData()
		formData.append('file', restoreFile.value)

		const response = await api.post(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/restore`, formData)

		closeImportModal()
		refresh()
		dialog.success(response.data.message || 'Restore completed successfully')
	} catch (e) {
		dialog.error('Restore failed: ' + (e.response?.data?.error || e.message))
	} finally {
		importing.value = false
	}
}

// Import JSON documents
async function importJsonDocuments() {
	if (!importFile.value) return

	importing.value = true
	try {
		const formData = new FormData()
		formData.append('file', importFile.value)
		formData.append('mode', importMode.value)

		const response = await api.post(
			`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/import-json`,
			formData
		)

		closeImportModal()
		refresh()
		dialog.success(response.data.message || 'Import completed successfully')
	} catch (e) {
		dialog.error('Import failed: ' + (e.response?.data?.error || e.message))
	} finally {
		importing.value = false
	}
}

// Index operations
async function createIndex() {
	try {
		// Build keys object from indexFields array
		const keys = {}
		for (const field of indexFields.value) {
			if (field.name.trim()) {
				keys[field.name.trim()] = field.order
			}
		}

		if (Object.keys(keys).length === 0) {
			dialog.warning('Please specify at least one field for the index')
			return
		}

		const options = {}
		if (newIndexName.value) options.name = newIndexName.value
		if (newIndexUnique.value) options.unique = true
		if (newIndexSparse.value) options.sparse = true
		if (newIndexBackground.value) options.background = true
		if (newIndexTTL.value) options.expireAfterSeconds = newIndexTTL.value

		await api.post(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/indexes`, {keys, options})
		closeCreateIndexModal()
		loadIndexes()
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

async function dropIndex(idx) {
	const confirmed = await dialog.confirm({
		title: 'Drop Index',
		message: `Drop index "${idx.name}"?`,
		type: 'warning',
		confirmText: 'Drop',
		cancelText: 'Cancel'
	})
	if (!confirmed) return
	try {
		await api.delete(`/connections/${connectionId.value}/databases/${database.value}/collections/${collection.value}/indexes/${idx.name}`)
		loadIndexes()
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

// Drop collection
async function confirmDropCollection() {
	const collName = collection.value

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
		await api.post('/auth/login', {username, password: step2.value})
	} catch (e) {
		dialog.error('Invalid password')
		return
	}

	// Drop the collection
	try {
		await api.delete(`/connections/${connectionId.value}/databases/${database.value}/collections/${collName}`)
		dialog.success(`Collection "${collName}" dropped successfully`)
		store.fetchCollections()
		router.push({name: 'database', params: {connectionId: connectionId.value, database: database.value}})
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

// Explain
async function explainQuery() {
	try {
		const filter = filterQuery.value.trim() ? parseMongoQuery(filterQuery.value) : {}
		const response = await api.post(`/connections/${connectionId.value}/command`, {
			database: database.value,
			command: {
				explain: {
					find: collection.value,
					filter: filter
				},
				verbosity: 'executionStats'
			}
		})
		explainResult.value = response.data
		showExplainModal.value = true
	} catch (e) {
		dialog.error('Error: ' + e.message)
	}
}

// History
function addToHistory(filter, count) {
	const entry = {
		filter,
		count,
		date: new Date().toLocaleString()
	}
	queryHistory.value.unshift(entry)
	if (queryHistory.value.length > 20) {
		queryHistory.value = queryHistory.value.slice(0, 20)
	}
	localStorage.setItem('queryHistory', JSON.stringify(queryHistory.value))
}

function applyHistory(h) {
	filterQuery.value = h.filter
	showHistory.value = false
	search()
}

function clearHistory() {
	queryHistory.value = []
	localStorage.removeItem('queryHistory')
}

function formatSize(bytes) {
	if (!bytes || bytes === 0) return '0 B'
	const units = ['B', 'KB', 'MB', 'GB']
	let i = 0
	while (bytes >= 1024 && i < units.length - 1) {
		bytes /= 1024
		i++
	}
	return bytes.toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

// Watch for tab changes
watch(currentTab, tab => {
	if (tab === 'indexes' && indexes.value.length === 0) loadIndexes()
	if (tab === 'statistics' && !stats.value) loadStats()
})

// Watch for route changes
watch(
	() => [connectionId.value, database.value, collection.value],
	() => {
		if (connectionId.value && database.value && collection.value) {
			currentTab.value = 'documents'
			page.value = 1
			filterQuery.value = ''
			sortQuery.value = '{ "_id": -1 }'
			projectionQuery.value = ''
			documents.value = []
			indexes.value = []
			stats.value = null
			selectedDocs.value = []
			expandedDocs.value = {}
			loadDocuments()
			loadStats()
		}
	}
)

// Close more menu on outside click
document.addEventListener('click', e => {
	if (!e.target.closest('.more-menu')) {
		showMoreMenu.value = false
	}
})

onMounted(async () => {
	if (connectionId.value && database.value && collection.value) {
		// Ensure store is properly set up for sidebar
		if (store.activeConnectionId !== connectionId.value) {
			store.setActiveConnection(connectionId.value)
		}
		store.selectDatabase(database.value)
		store.selectCollection(collection.value)
		// Fetch databases for sidebar if not loaded
		if (store.databases.length === 0) {
			await store.fetchDatabases()
		}
		loadDocuments()
		loadStats()
	}
})
</script>

<style scoped>
.collection-view {
	max-width: 100%;
}

.coll-title {
	font-size: 14px;
	font-weight: bold;
	margin: 10px 0;
	color: #333;
}

.sub-operation {
	margin-bottom: 10px;
	background: #f9f9f9;
}

/* Query Table */
.query-table td {
	padding: 5px 10px;
	vertical-align: middle;
}

.query-table input[type='text'],
.query-table input[type='number'] {
	padding: 4px 6px;
	border: 1px solid #ccc;
	font-size: 12px;
}

.query-table select {
	padding: 4px 6px;
	border: 1px solid #ccc;
}

.query-table button {
	padding: 4px 12px;
	margin-right: 5px;
	cursor: pointer;
	border: 1px solid #ccc;
	background: #eee;
}

.query-table button:hover {
	background: #ddd;
}

/* Actions Bar */
.actions-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px;
	border-bottom: 1px solid #ddd;
	margin: 10px 0;
}

.selected-actions {
	margin-left: 10px;
}

.right-info {
	color: #666;
}

/* More Menu */
.more-menu {
	position: relative;
	display: inline-block;
}

.dropdown-menu {
	position: absolute;
	top: 100%;
	left: 0;
	background: #fff;
	border: 1px solid #ccc;
	box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
	z-index: 100;
	min-width: 120px;
}

.dropdown-menu a {
	display: block;
	padding: 5px 10px;
}

.dropdown-menu a:hover {
	background: #f0f0f0;
}

/* Document Row */
.doc-row {
	margin-bottom: 10px;
	border: 1px solid #ccc;
	background: #fff;
}

.doc-header {
	background: #f0f0f0;
	padding: 5px 10px;
	border-bottom: 1px solid #ccc;
	display: flex;
	align-items: center;
	gap: 10px;
}

.doc-num {
	color: #666;
	font-weight: bold;
}

.doc-id {
	color: #004499;
	flex: 1;
}

.doc-actions {
	font-size: 11px;
}

.doc-actions a {
	margin: 0 3px;
}

.doc-content {
	padding: 0;
	background: #1e1e1e;
	overflow: hidden;
}

.doc-content :deep(.json-viewer) {
	border: none;
	border-radius: 0;
}

/* CodeMirror JSON Viewer is now used for syntax highlighting */

/* Documents Tab Layout */
.documents-tab {
	display: flex;
	flex-direction: column;
	/* Account for top-bar (22px), operation bar (~40px), title (~30px), query table (~130px), actions bar (~35px), padding (20px) */
	height: calc(100vh - 135px);
	min-height: 400px;
}

.documents-container {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	position: relative;
}

.documents-scroll {
	flex: 1;
	/*overflow-y: auto;*/
	padding-bottom: 70px; /* Space for fixed pagination */
}

/* Fixed Pagination at Bottom */
.pagination-fixed {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: linear-gradient(to bottom, rgba(255, 255, 255, 0.95), #fff);
	padding: 12px 15px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border-top: 2px solid #ddd;
	box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.1);
	z-index: 100;
	flex-wrap: wrap;
}

.pagination-fixed a {
	padding: 8px 14px;
	border: 1px solid #ccc;
	background: #f5f5f5;
	border-radius: 4px;
	text-decoration: none;
	color: #333;
	font-weight: 500;
	transition: all 0.2s;
}

.pagination-fixed a:hover:not(.disabled) {
	background: #e0e0e0;
	border-color: #999;
}

.pagination-fixed a.disabled {
	color: #bbb;
	pointer-events: none;
	background: #f9f9f9;
}

.pagination-fixed .page-info {
	margin: 0 15px;
	color: #333;
	font-weight: 600;
	background: #e3f2fd;
	padding: 8px 15px;
	border-radius: 4px;
}

.pagination-fixed .page-jump {
	margin-left: 15px;
}

.pagination-fixed .page-jump input {
	width: 60px;
	padding: 6px 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
}

/* Legacy Pagination (keep for other tabs) */
.pagination {
	margin-top: 15px;
	padding: 10px 0;
	display: flex;
	align-items: center;
	gap: 5px;
}

.pagination a {
	padding: 4px 10px;
	border: 1px solid #ccc;
	background: #f5f5f5;
}

.pagination a:hover {
	background: #e0e0e0;
}

.pagination a.disabled {
	color: #999;
	pointer-events: none;
}

.page-info {
	margin: 0 10px;
	color: #666;
}

.page-jump {
	margin-left: 15px;
}

.page-jump input {
	width: 60px;
	padding: 3px;
	border: 1px solid #ccc;
}

/* History */
.history-item {
	padding: 8px;
	border-bottom: 1px solid #eee;
	cursor: pointer;
}

.history-item:hover {
	background: #f5f5f5;
}

.history-query {
	color: #004499;
}

.history-meta {
	font-size: 11px;
	color: #999;
	margin-top: 3px;
}

/* Common */
.loading,
.empty-text,
.empty {
	color: #666;
	font-style: italic;
	padding: 10px;
}

/* Empty Collection Message */
.empty-collection-message {
	text-align: center;
	padding: 60px 20px;
	color: #666;
}

.empty-collection-message .empty-icon {
	font-size: 48px;
	margin-bottom: 16px;
}

.empty-collection-message h3 {
	margin: 0 0 8px 0;
	font-size: 18px;
	font-weight: 600;
	color: #444;
}

.empty-collection-message p {
	margin: 0;
	font-size: 14px;
	color: #888;
}

.danger-link {
	color: #c00 !important;
}

.danger-btn {
	background: #c00 !important;
	border-color: #900 !important;
	color: #fff !important;
}

.hint {
	color: #666;
	font-size: 11px;
	margin-bottom: 10px;
}

textarea {
	font-size: 12px;
	padding: 8px;
	border: 1px solid #ccc;
}

code {
	background: #f5f5f5;
	padding: 2px 5px;
	font-size: 11px;
}

:global(.dark) code {
	background: #2d2d2d;
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

:global(.dark) .mongomanager-modal p {
	color: #cfcfcf;
}

:global(.dark) .mongomanager-modal strong {
	color: #fff;
}

input[type='checkbox'] {
	margin-right: 5px;
}

label {
	cursor: pointer;
}

/* ============================================
   Modal Form Styles
   ============================================ */
.modal-form .modal-form-body {
	padding: 20px;
}

.modal-form .form-group {
	margin-bottom: 16px;
}

.modal-form .form-group:last-child {
	margin-bottom: 0;
}

.modal-form .form-label {
	display: block;
	font-weight: 600;
	margin-bottom: 6px;
	color: #333;
	font-size: 13px;
}

:global(.dark) .modal-form .form-label {
	color: #3c3c3c;
}

.modal-form .form-input,
.modal-form .form-select {
	width: 100%;
	padding: 8px 12px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 13px;
	background: #fff;
}

:global(.dark) .modal-form .form-input,
:global(.dark) .modal-form .form-select {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #3c3c3c;
}

.modal-form .form-input:focus,
.modal-form .form-select:focus {
	outline: none;
	border-color: #0e639c;
	box-shadow: 0 0 0 2px rgba(14, 99, 156, 0.2);
}

.modal-form .form-value {
	padding: 8px 12px;
	background: #f5f5f5;
	border: 1px solid #ddd;
	border-radius: 4px;
	font-family: monospace;
	color: #333;
}

:global(.dark) .modal-form .form-value {
	background: #1e1e1e;
	border-color: #3c3c3c;
	color: #3c3c3c;
}

.modal-form .form-hint {
	font-size: 11px;
	color: #666;
	margin-left: 10px;
}

:global(.dark) .modal-form .form-hint {
	color: #999;
}

.modal-form .checkbox-group {
	display: flex;
	flex-wrap: wrap;
	gap: 15px;
}

.modal-form .checkbox-item {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	cursor: pointer;
}

.modal-form .checkbox-item input {
	margin: 0;
}

/* Index Fields List */
.index-fields-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.index-field-item {
	display: flex;
	gap: 8px;
	align-items: center;
}

.index-field-item .field-name {
	flex: 1;
}

.index-field-item .field-order {
	width: 110px;
}

.index-field-item .field-actions {
	display: flex;
	gap: 4px;
	min-width: 60px;
}

.btn-icon {
	width: 28px;
	height: 28px;
	border-radius: 4px;
	border: 1px solid #ccc;
	cursor: pointer;
	font-size: 16px;
	font-weight: bold;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: #f5f5f5;
}

.btn-icon.btn-add {
	background: #e8f5e9;
	color: #2e7d32;
	border-color: #a5d6a7;
}

.btn-icon.btn-add:hover {
	background: #c8e6c9;
}

.btn-icon.btn-remove {
	background: #ffebee;
	color: #c62828;
	border-color: #ef9a9a;
}

.btn-icon.btn-remove:hover {
	background: #ffcdd2;
}

/* TTL Input */
.ttl-input {
	display: flex;
	align-items: center;
}

/* Modal buttons */
.modal-buttons {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	padding: 15px 20px;
	border-top: 1px solid #e0e0e0;
	background: #fafafa;
}

:global(.dark) .modal-buttons {
	background: #252526;
	border-color: #3c3c3c;
}

.btn-cancel {
	padding: 8px 16px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background: #fff;
	cursor: pointer;
	font-size: 13px;
}

:global(.dark) .btn-cancel {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #3c3c3c;
}

.btn-cancel:hover {
	background: #f0f0f0;
}

:global(.dark) .btn-cancel:hover {
	background: #3c3c3c;
}

.btn-primary {
	padding: 8px 16px;
	border: none;
	border-radius: 4px;
	background: #0e639c;
	color: #fff;
	cursor: pointer;
	font-size: 13px;
	font-weight: 500;
}

.btn-primary:hover {
	background: #1177bb;
}

/* ===========================================
   DARK MODE STYLES
   =========================================== */

/* Dark Mode - Query Table */
:global(.dark) .query-table {
	background: #3c3c3c;
}

:global(.dark) .query-table th {
	background: #333;
	color: #cfcfcf;
}

:global(.dark) .query-table td {
	background: #252526;
	color: #cfcfcf;
}

/* Dark Mode - Document Header */
:global(.dark) .doc-header {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

:global(.dark) .doc-id {
	color: #9cdcfe;
}

:global(.dark) .doc-num {
	color: #858585;
}

/* Dark Mode - Document Row */
:global(.dark) .doc-row {
	background: #1e1e1e;
	border-color: #3c3c3c;
}

/* Dark Mode - Dropdown Menu */
:global(.dark) .dropdown-menu {
	background: #1e1e1e;
	border-color: #3c3c3c;
	box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
}

:global(.dark) .dropdown-menu a {
	color: #cfcfcf;
}

:global(.dark) .dropdown-menu a:hover {
	background: #2d2d2d;
	color: #fff;
}

/* Dark Mode - Pagination */
:global(.dark) .pagination-fixed {
	background: linear-gradient(to bottom, rgba(30, 30, 30, 0.95), #1e1e1e);
	border-color: #3c3c3c;
	box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.3);
}

:global(.dark) .pagination-fixed a {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #3c3c3c;
}

:global(.dark) .pagination-fixed a:hover:not(.disabled) {
	background: #3c3c3c;
	border-color: #555;
}

:global(.dark) .pagination-fixed a.disabled {
	background: #252526;
	color: #555;
}

:global(.dark) .pagination-fixed .page-info {
	color: #3c3c3c;
	background: #333;
}

:global(.dark) .pagination-fixed .page-jump input {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #3c3c3c;
}

/* Dark Mode - Actions Bar */
:global(.dark) .actions-bar {
	background: #252526;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

/* Dark Mode - Inputs (Global) */
:global(.dark) input[type='text'],
:global(.dark) input[type='number'],
:global(.dark) input[type='password'],
:global(.dark) input[type='email'],
:global(.dark) textarea,
:global(.dark) select {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

:global(.dark) input[type='text']:focus,
:global(.dark) input[type='number']:focus,
:global(.dark) input[type='password']:focus,
:global(.dark) input[type='email']:focus,
:global(.dark) textarea:focus,
:global(.dark) select:focus {
	border-color: #0e639c;
}

/* Dark Mode - MongoManager Tables */
:global(.dark) .mongomanager-table {
	background: #3c3c3c;
}

:global(.dark) .mongomanager-table th {
	background: #333;
	color: #3c3c3c;
}

:global(.dark) .mongomanager-table td {
	background: #252526;
	color: #cfcfcf;
}

:global(.dark) .mongomanager-table tr:hover td {
	background: #2d2d2d;
}

/* Dark Mode - Operation Bar */
:global(.dark) .operation {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

:global(.dark) .operation a {
	color: #e2fbff;
}

/* Dark Mode - Collection Title */
:global(.dark) .coll-title {
	color: #cfcfcf;
}

/* Dark Mode - Statistics */
:global(.dark) .stat-card {
	background: #252526;
	border-color: #3c3c3c;
}

:global(.dark) .stat-value {
	color: #4ec9b0;
}

:global(.dark) .stat-label {
	color: #858585;
}

/* Dark Mode - Index Table */
:global(.dark) .index-table th {
	background: #333;
	color: #cfcfcf;
}

:global(.dark) .index-table td {
	background: #252526;
	color: #cfcfcf;
}

/* Dark Mode - Export Options */
:global(.dark) .export-option {
	background: #252526;
	border-color: #3c3c3c;
}

:global(.dark) .export-option:hover {
	background: #2d2d2d;
	border-color: #0e639c;
}

:global(.dark) .export-option strong {
	color: #569cd6;
}

:global(.dark) .export-option p {
	color: #858585;
}

/* Dark Mode - Import */
:global(.dark) .import-dropzone {
	background: #252526;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

:global(.dark) .import-dropzone.dragover {
	background: #2d2d2d;
	border-color: #0e639c;
}

/* Dark Mode - Btn Icon */
:global(.dark) .btn-icon {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #cfcfcf;
}

/* Legacy index field styles (deprecated) */
.index-field-row td {
	padding: 5px;
}

.index-field-row input,
.index-field-row select {
	padding: 6px 8px;
	border: 1px solid #ccc;
	font-size: 13px;
}

/* Export/Import Styles */
.export-options {
	margin-top: 15px;
}

.export-option {
	padding: 12px;
	border: 1px solid #ddd;
	margin-bottom: 10px;
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
}

.export-option p {
	margin: 5px 0 0;
	font-size: 11px;
	color: #666;
}

.export-progress,
.import-progress {
	margin-top: 15px;
	padding: 10px;
	background: #fff8e0;
	border: 1px solid #ffe066;
	color: #856404;
	text-align: center;
}

.import-tabs {
	display: flex;
	border-bottom: 2px solid #ddd;
	margin-bottom: 15px;
}

.import-tabs a {
	padding: 8px 15px;
	color: #666;
	text-decoration: none;
	border-bottom: 2px solid transparent;
	margin-bottom: -2px;
}

.import-tabs a:hover {
	color: #004499;
}

.import-tabs a.active {
	color: #004499;
	border-bottom-color: #004499;
	font-weight: bold;
}

.import-section {
	padding: 10px 0;
}

.import-section input[type='file'] {
	margin: 10px 0;
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

/* ============================================
   MOBILE RESPONSIVE STYLES - CollectionView
   ============================================ */
@media screen and (max-width: 768px) {
	.collection-view {
		padding: 5px;
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

	.more-menu {
		position: static;
		grid-column: span 2;
	}

	.more-menu > a {
		width: 100%;
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

	.info-table td.label-col,
	.info-table td:first-child {
		width: 100%;
		font-weight: bold;
		color: #666;
		font-size: 12px;
	}

	.info-table td:not(.label-col):not(:first-child) {
		width: 100%;
	}

	.dropdown-menu {
		position: fixed;
		top: auto;
		bottom: 0;
		left: 0;
		right: 0;
		width: 100%;
		border-radius: 10px 10px 0 0;
		max-height: 50vh;
		overflow-y: auto;
		box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.2);
	}

	.dropdown-menu a {
		display: block;
		padding: 15px;
		border-bottom: 1px solid #eee;
	}

	/* Query panel mobile */
	.query-panel {
		padding: 10px;
	}

	.query-panel table {
		display: block;
	}

	.query-panel tr {
		display: flex;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}

	.query-panel td {
		display: block;
		width: 100%;
		padding: 3px 0;
	}

	.query-panel td:first-child {
		font-weight: bold;
		margin-bottom: 3px;
	}

	.query-panel input[type='text'],
	.query-panel select {
		width: 100%;
		padding: 10px;
		font-size: 16px;
	}

	.query-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.query-buttons button {
		flex: 1;
		min-width: 45%;
		padding: 12px;
		font-size: 14px;
	}

	/* Filter actions mobile */
	.filter-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}

	.filter-actions button {
		flex: 1;
		min-width: 45%;
		padding: 10px;
	}

	/* Document blocks mobile */
	.doc-row {
		margin: 10px 0;
	}

	.doc-header {
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		padding: 10px;
	}

	.doc-header > input[type='checkbox'] {
		position: absolute;
		top: 10px;
		right: 10px;
		width: 22px;
		height: 22px;
	}

	.doc-row {
		position: relative;
	}

	.doc-num {
		font-size: 13px;
	}

	.doc-id {
		font-size: 11px;
		word-break: break-all;
		padding-right: 35px;
	}

	.doc-actions {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 5px;
		font-size: 12px;
	}

	/* Hide pipe separators on mobile in doc-actions */
	.doc-actions .action-sep {
		display: none;
	}

	.doc-actions a {
		padding: 8px 12px;
		background: #3c3c3c;
		border-radius: 4px;
		border: 1px solid #ccc;
		text-decoration: none;
		margin: 0;
	}

	.doc-actions a:hover {
		background: #ddd;
	}

	.doc-actions a.danger-link {
		background: #fee;
		border-color: #fcc;
	}

	.doc-content {
		max-height: none;
		overflow-x: auto;
		font-size: 11px;
		padding: 10px;
	}

	.doc-content pre {
		white-space: pre-wrap;
		word-break: break-all;
		font-size: 11px;
		line-height: 1.4;
	}

	/* Pagination mobile */
	.pagination {
		flex-wrap: wrap;
		gap: 10px;
		padding: 10px;
	}

	.pagination a {
		padding: 10px 15px;
	}

	/* Tables mobile - horizontal scroll */
	.mongomanager-table {
		display: block;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	/* Modal mobile */
	.mongomanager-modal {
		width: 95% !important;
		max-width: none;
		margin: 10px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.mongomanager-modal textarea {
		min-height: 150px;
		font-size: 14px;
	}

	/* Statistics table */
	.stats-table {
		display: block;
		overflow-x: auto;
	}

	/* Select all bar */
	.select-bar {
		flex-wrap: wrap;
		gap: 8px;
		padding: 10px;
	}

	.select-bar button {
		flex: 1;
		min-width: 45%;
	}
}

/* Small Mobile */
@media screen and (max-width: 480px) {
	.operation a {
		padding: 6px 8px;
		font-size: 11px;
	}

	.doc-header {
		font-size: 11px;
	}

	.doc-content {
		font-size: 10px;
		padding: 8px;
	}

	.query-panel {
		padding: 8px;
	}

	.pagination {
		justify-content: center;
	}

	.pagination .page-info {
		width: 100%;
		text-align: center;
		order: -1;
	}
}

/* Touch improvements */
@media (pointer: coarse) {
	.doc-actions a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.operation a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}

	input[type='checkbox'] {
		width: 20px;
		height: 20px;
	}
}
</style>

<!-- Unscoped styles for dark mode (scoped :global doesn't always work) -->
<style>
/* Dark Mode - Collection View */
.dark .collection-view .doc-header {
	background: #2d2d2d !important;
	border-color: #3c3c3c !important;
	color: #cfcfcf !important;
}

.dark .collection-view .doc-id {
	color: #9cdcfe !important;
}

.dark .collection-view .doc-num {
	color: #858585 !important;
}

.dark .collection-view .doc-row {
	background: #1e1e1e !important;
	border-color: #3c3c3c !important;
}

.dark .collection-view .doc-actions a {
	color: #cee2fa !important;
}

.dark .collection-view .doc-actions .danger-link {
	color: #f48771 !important;
}

.dark .collection-view .action-sep {
	color: #555 !important;
}

/* Dark Mode - Pagination */
.dark .collection-view .pagination-fixed {
	background: linear-gradient(to bottom, rgba(30, 30, 30, 0.98), #1e1e1e) !important;
	border-color: #3c3c3c !important;
	box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.4) !important;
}

.dark .collection-view .pagination-fixed a {
	background: #2d2d2d !important;
	border-color: #3c3c3c !important;
	color: #cfcfcf !important;
}

.dark .collection-view .pagination-fixed a:hover:not(.disabled) {
	background: #3c3c3c !important;
	border-color: #555 !important;
}

.dark .collection-view .pagination-fixed a.disabled {
	background: #252526 !important;
	color: #555 !important;
}

.dark .collection-view .pagination-fixed .page-info {
	color: #cfcfcf !important;
	background: #333 !important;
}

.dark .collection-view .pagination-fixed .page-jump input {
	background: #2d2d2d !important;
	border-color: #3c3c3c !important;
	color: #cfcfcf !important;
}

/* Dark Mode - Query Table */
.dark .collection-view .query-table {
	background: #3c3c3c !important;
}

.dark .collection-view .query-table th {
	background: #333 !important;
	color: #cfcfcf !important;
}

.dark .collection-view .query-table td {
	background: #252526 !important;
	color: #cfcfcf !important;
}

/* Dark Mode - Actions Bar */
.dark .collection-view .actions-bar {
	background: #252526 !important;
	border-color: #3c3c3c !important;
	color: #cfcfcf !important;
}

.dark .collection-view .actions-bar a {
	color: #cee2fa !important;
}

.dark .collection-view .actions-bar .danger-link {
	color: #f48771 !important;
}

/* Dark Mode - Dropdown Menu */
.dark .collection-view .dropdown-menu {
	background: #1e1e1e !important;
	border-color: #3c3c3c !important;
	box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3) !important;
}

.dark .collection-view .dropdown-menu a {
	color: #cfcfcf;
}

.dark .collection-view .dropdown-menu a:hover {
	background: #2d2d2d;
	color: #fff;
}

.dark code {
	background: transparent !important;
}

/* Dark Mode - Empty Collection Message */
.dark .collection-view .empty-collection-message {
	color: #888;
}

.dark .collection-view .empty-collection-message h3 {
	color: #cfcfcf;
}

.dark .collection-view .empty-collection-message p {
	color: #888;
}
</style>
