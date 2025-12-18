<template>
	<div class="aggregation-editor" :class="{'results-mode': resultsMode}">
		<!-- Top Toolbar -->
		<div class="toolbar">
			<div class="toolbar-left">
				<!-- Results Mode: Edit Button -->
				<template v-if="resultsMode">
					<button class="btn btn-secondary btn-sm" @click="exitResultsMode">
						<span class="edit-icon">✎</span> {{ t('edit') }}
					</button>
					<span class="toolbar-divider"></span>
					<span class="results-info">{{ t('allResults') }} ({{ finalResultCount }} {{ t('docs') }})</span>
				</template>

				<!-- Editor Mode: Normal Toolbar -->
				<template v-else>
					<!-- Saved Pipelines Dropdown -->
					<div class="pipelines-dropdown-container">
						<button class="btn btn-secondary btn-sm pipelines-btn" @click.stop="togglePipelinesDropdown">
							<span class="folder-icon">📁</span>
							<span class="dropdown-arrow">▼</span>
						</button>
						<div v-if="showPipelinesDropdown" class="pipelines-dropdown">
							<div class="pipelines-dropdown-header">{{ t('savedPipelines') }}</div>
							<div v-if="loadingPipelines" class="pipelines-loading">{{ t('loading') }}</div>
							<div v-else-if="savedPipelines.length === 0" class="pipelines-empty">{{ t('noSavedPipelines') }}</div>
							<div v-else class="pipelines-list">
								<div v-for="pipeline in savedPipelines" :key="pipeline.id" class="pipeline-item" @click="loadPipelineFromDropdown(pipeline)">
									<span class="pipeline-item-name">{{ pipeline.name }}</span>
									<button class="pipeline-delete-btn" @click.stop="confirmDeletePipeline(pipeline)" :title="t('delete')">×</button>
								</div>
							</div>
						</div>
					</div>

					<!-- Create New Button -->
					<button class="btn btn-secondary btn-sm" @click="createNewPipeline">{{ t('createNew') }}</button>

					<!-- Save Button -->
					<button class="btn btn-secondary btn-sm" @click="showSaveModal = true" :disabled="stages.length === 0">{{ t('save') }}</button>

					<span class="toolbar-divider"></span>

					<!-- Stage Badges -->
					<div class="stage-badges" v-if="stages.length > 0">
						<template v-for="(stage, index) in stages" :key="stage.id">
							<span
								class="stage-badge"
								:class="{'has-error': stage.error, disabled: !stage.enabled}"
								@click="openFocusMode(index)"
								:title="stage.error || stage.operator || t('selectStage')"
							>
								{{ stage.operator || '?' }}
								<span v-if="stage.error" class="error-indicator">⊗</span>
							</span>
							<span v-if="index < stages.length - 1" class="badge-arrow">→</span>
						</template>
					</div>
				</template>
			</div>

			<div class="toolbar-right">
				<!-- Results Mode: Export and Run Again -->
				<template v-if="resultsMode">
					<button class="btn btn-secondary btn-sm" @click="openExportModal">{{ t('exportToLanguage') }}</button>
					<button class="btn btn-primary btn-sm" @click="runFullPipeline" :disabled="running">
						{{ running ? t('running') : t('runAgain') }}
					</button>
				</template>

				<!-- Editor Mode: Normal Toolbar -->
				<template v-else>
					<!-- STAGES/TEXT Toggle -->
					<div class="mode-toggle">
						<button :class="['mode-btn', editorMode === 'stages' ? 'active' : '']" @click="switchToStagesMode">{{ t('stages') }}</button>
						<button :class="['mode-btn', editorMode === 'text' ? 'active' : '']" @click="switchToTextMode">{{ t('text') }}</button>
					</div>

					<span class="toolbar-divider"></span>

					<label class="preview-toggle">
						<input type="checkbox" v-model="autoPreview" />
						<span class="toggle-label">{{ t('autoPreview') }}</span>
					</label>
					<button class="btn btn-secondary btn-sm" @click="showExplainModal = true" :disabled="stages.length === 0">{{ t('explain') }}</button>

					<!-- Export to Language Dropdown -->
					<button class="btn btn-secondary btn-sm" @click="openExportModal" :disabled="stages.length === 0">{{ t('exportToLanguage') }}</button>

					<button class="btn btn-primary btn-sm" @click="runFullPipeline" :disabled="running || stages.length === 0">
						{{ running ? t('running') : t('run') }}
					</button>
				</template>
			</div>
		</div>

		<!-- Collection Preview (input documents) - Hidden in results mode -->
		<div class="collection-preview" v-if="collectionDocs.length > 0 && !resultsMode">
			<div class="preview-header">
				<span class="preview-title">{{ t('collectionPreview') }}</span>
				<button class="btn-icon" @click="refreshCollectionPreview" :title="t('refresh')">↻</button>
			</div>
			<div class="preview-docs-row">
				<div class="preview-doc" v-for="(doc, idx) in collectionDocs.slice(0, 10)" :key="idx">
					<JsonViewer :value="doc" max-height="200px" />
				</div>
			</div>
		</div>

		<!-- ========== STAGES MODE ========== -->
		<template v-if="editorMode === 'stages' && !resultsMode">
			<!-- Add Stage Button (top) -->
			<div class="add-stage-top" v-if="stages.length === 0">
				<button class="btn-add-stage" @click="addStage(0)"><span class="plus-icon">+</span> {{ t('addStage') }}</button>
			</div>

			<!-- Stages List -->
			<div class="stages-container">
				<div v-for="(stage, index) in stages" :key="stage.id" class="stage-wrapper">
					<!-- Stage Card -->
					<div class="stage-card" :class="{collapsed: stage.collapsed, disabled: !stage.enabled}">
						<div class="stage-header">
							<button class="collapse-btn" @click="toggleStageCollapse(index)">
								{{ stage.collapsed ? '▶' : '▼' }}
							</button>
							<span class="stage-number">{{ t('stage') }} {{ index + 1 }}</span>
							<select v-model="stage.operator" @change="onOperatorChange(index)" class="stage-select">
								<option value="">{{ t('selectStage') }}...</option>
								<optgroup :label="t('stageGroupCommon')">
									<option value="$match">$match</option>
									<option value="$project">$project</option>
									<option value="$group">$group</option>
									<option value="$sort">$sort</option>
									<option value="$limit">$limit</option>
									<option value="$skip">$skip</option>
								</optgroup>
								<optgroup :label="t('stageGroupJoinLookup')">
									<option value="$lookup">$lookup</option>
									<option value="$unwind">$unwind</option>
									<option value="$graphLookup">$graphLookup</option>
								</optgroup>
								<optgroup :label="t('stageGroupTransform')">
									<option value="$addFields">$addFields</option>
									<option value="$set">$set</option>
									<option value="$unset">$unset</option>
									<option value="$replaceRoot">$replaceRoot</option>
									<option value="$replaceWith">$replaceWith</option>
								</optgroup>
								<optgroup :label="t('stageGroupArray')">
									<option value="$filter">$filter</option>
									<option value="$map">$map</option>
									<option value="$reduce">$reduce</option>
								</optgroup>
								<optgroup :label="t('stageGroupGrouping')">
									<option value="$bucket">$bucket</option>
									<option value="$bucketAuto">$bucketAuto</option>
									<option value="$facet">$facet</option>
									<option value="$sortByCount">$sortByCount</option>
								</optgroup>
								<optgroup :label="t('stageGroupOutput')">
									<option value="$out">$out</option>
									<option value="$merge">$merge</option>
									<option value="$count">$count</option>
								</optgroup>
								<optgroup :label="t('stageGroupOther')">
									<option value="$sample">$sample</option>
									<option value="$redact">$redact</option>
									<option value="$geoNear">$geoNear</option>
									<option value="$unionWith">$unionWith</option>
								</optgroup>
							</select>
							<label class="stage-toggle" :title="stage.enabled ? t('disabled') : t('enabled')">
								<input type="checkbox" v-model="stage.enabled" @change="onStageToggle(index)" />
								<span class="toggle-slider"></span>
							</label>
							<div class="stage-actions">
								<!-- Focus Mode Button -->
								<button class="btn-icon focus-btn" @click="openFocusMode(index)" :title="t('focusMode')">
									<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
										<path d="M1 1h5v2H3v3H1V1zm14 0h-5v2h3v3h2V1zM1 15h5v-2H3v-3H1v5zm14 0h-5v-2h3v-3h2v5z" />
									</svg>
								</button>
								<!-- 3-dot Menu Button -->
								<div class="stage-menu-container">
									<button class="btn-icon menu-btn" @click.stop="toggleStageMenu(index)" :title="t('more')">
										<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
											<circle cx="8" cy="2" r="1.5" />
											<circle cx="8" cy="8" r="1.5" />
											<circle cx="8" cy="14" r="1.5" />
										</svg>
									</button>
									<!-- Dropdown Menu -->
									<div v-if="openMenuIndex === index" class="stage-dropdown-menu">
										<button @click="addStageAfter(index)"><span class="menu-icon">+</span> {{ t('addStage') }}</button>
										<button @click="addStageBefore(index)"><span class="menu-icon">+</span> {{ t('addStage') }}</button>
										<div class="menu-divider"></div>
										<button @click="duplicateStage(index)"><span class="menu-icon">⧉</span> {{ t('duplicateStage') }}</button>
										<button @click="moveStageUp(index)" :disabled="index === 0"><span class="menu-icon">↑</span> {{ t('moveUp') }}</button>
										<button @click="moveStageDown(index)" :disabled="index === stages.length - 1">
											<span class="menu-icon">↓</span> {{ t('moveDown') }}
										</button>
										<div class="menu-divider"></div>
										<button class="danger" @click="removeStage(index)"><span class="menu-icon">🗑</span> {{ t('deleteStage') }}</button>
									</div>
								</div>
							</div>
						</div>

						<div class="stage-body" v-show="!stage.collapsed">
							<div class="stage-editor-container">
								<!-- Stage Code Editor -->
								<div class="stage-code">
									<MongoCodeEditor
										v-model="stage.code"
										@update:modelValue="onStageCodeChange(index)"
										:placeholder="getPlaceholder(stage.operator)"
										height="270px"
										:showFooter="false"
										:documentFields="documentFields"
									/>
									<div v-if="!stage.operator" class="stage-warning">{{ t('selectOperator') }}</div>
									<div v-if="stage.error" class="stage-error">{{ stage.error }}</div>
								</div>

								<!-- Stage Preview -->
								<div class="stage-preview" v-if="autoPreview && stage.enabled">
									<div class="preview-header">
										<span
											>{{ t('stageOutput') }}
											<a :href="getDocsUrl(stage.operator)" target="_blank" class="operator-link">{{ stage.operator }}</a></span
										>
										<span class="preview-count" v-if="stage.previewCount !== null">
											({{ stage.previewDocs.length }} {{ t('docs') }})
										</span>
									</div>
									<div class="preview-content" v-if="stage.previewLoading">
										<div class="loading-spinner">{{ t('loadingPreview') }}</div>
									</div>
									<div class="preview-content" v-else-if="stage.previewError">
										<div class="preview-error">{{ stage.previewError }}</div>
									</div>
									<div class="preview-content" v-else-if="stage.previewDocs && stage.previewDocs.length > 0">
										<div class="preview-docs-row">
											<div v-for="(doc, docIndex) in stage.previewDocs" :key="docIndex" class="preview-doc">
												<JsonViewer :value="doc" min-height="200px" max-height="200px" />
											</div>
										</div>
									</div>
									<div class="preview-content empty" v-else>
										<span>{{ t('noDocuments') }}</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Add Stage Button between stages -->
					<div class="add-stage-between">
						<button class="btn-add-stage-small" @click="addStage(index + 1)" :title="t('addStage')">
							<span class="plus-icon">+</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Add Stage Button (bottom) -->
			<div class="add-stage-bottom" v-if="stages.length > 0">
				<button class="btn-add-stage" @click="addStage(stages.length)"><span class="plus-icon">+</span> {{ t('addStage') }}</button>
			</div>
		</template>

		<!-- ========== TEXT MODE ========== -->
		<div v-if="editorMode === 'text' && !resultsMode" class="text-mode-container">
			<div class="text-mode-editor">
				<div class="text-mode-header">
					<span class="text-mode-title">Pipeline (JSON)</span>
					<span class="text-mode-hint">{{ t('textModeDesc') }}</span>
				</div>
				<MongoCodeEditor
					v-model="textModeContent"
					@update:modelValue="onTextModeChange"
					placeholder="[
  { $match: { field: value } },
  { $project: { field: 1 } }
]"
					height="400px"
					:showFooter="true"
					:documentFields="documentFields"
				/>
				<!-- Error Banner -->
				<div v-if="textModeError" class="text-mode-error-banner">
					<span class="error-icon">⊗</span>
					<span class="error-text">{{ textModeError }}</span>
				</div>
			</div>
			<div class="text-mode-preview">
				<div class="text-mode-preview-header">
					<span class="preview-title">{{ t('stageOutput') }}</span>
					<span class="preview-count" v-if="textModePreviewDocs.length > 0"> ({{ textModePreviewDocs.length }} {{ t('docs') }}) </span>
				</div>
				<div class="text-mode-preview-content" v-if="textModePreviewLoading">
					<div class="loading-spinner">{{ t('loadingPreview') }}</div>
				</div>
				<div class="text-mode-preview-content" v-else-if="textModePreviewDocs.length > 0">
					<div class="preview-docs-vertical">
						<div class="preview-doc" v-for="(doc, idx) in textModePreviewDocs" :key="idx">
							<JsonViewer :value="doc" max-height="200px" />
						</div>
					</div>
				</div>
				<div class="text-mode-preview-content empty" v-else>
					<span>{{ t('noPreviewAvailable') }}</span>
				</div>
			</div>
		</div>

		<!-- Final Results Section -->
		<div class="results-section" :class="{'results-fullpage': resultsMode}" v-if="finalResults">
			<div class="results-header" v-if="!resultsMode">
				<h3>{{ t('pipelineResults') }}</h3>
				<span class="result-count">{{ finalResultCount }} {{ t('docs') }}</span>
				<div class="view-toggle">
					<button :class="['btn', 'btn-sm', viewMode === 'json' ? 'btn-primary' : 'btn-secondary']" @click="viewMode = 'json'">{{ t('viewJson') }}</button>
					<button :class="['btn', 'btn-sm', viewMode === 'table' ? 'btn-primary' : 'btn-secondary']" @click="viewMode = 'table'">{{ t('viewTable') }}</button>
				</div>
			</div>
			<!-- Results Mode Header -->
			<div class="results-header results-fullpage-header" v-if="resultsMode">
				<div class="results-pagination-info">
					<span class="showing-info">
						{{ t('showing') }} {{ paginationStart }} – {{ paginationEnd }} {{ t('of') }} {{ finalResultCount }}
					</span>
					<span class="per-page-info">({{ paginationLimit }} {{ t('perPage') }})</span>
				</div>
				<div class="results-pagination-controls" v-if="pagination.totalPages > 1">
					<button class="btn btn-sm" :disabled="pagination.page <= 1" @click="changePage(1)" :title="t('first')">«</button>
					<button class="btn btn-sm" :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)" :title="t('previous')">‹</button>
					<span class="page-info">{{ pagination.page }} / {{ pagination.totalPages }}</span>
					<button class="btn btn-sm" :disabled="pagination.page >= pagination.totalPages" @click="changePage(pagination.page + 1)" :title="t('next')">›</button>
					<button class="btn btn-sm" :disabled="pagination.page >= pagination.totalPages" @click="changePage(pagination.totalPages)" :title="t('last')">»</button>
				</div>
				<div class="view-toggle">
					<button :class="['btn', 'btn-sm', viewMode === 'json' ? 'btn-primary' : 'btn-secondary']" @click="viewMode = 'json'">{{ t('viewJson') }}</button>
					<button :class="['btn', 'btn-sm', viewMode === 'table' ? 'btn-primary' : 'btn-secondary']" @click="viewMode = 'table'">{{ t('viewTable') }}</button>
					<!-- Expand/Collapse Dropdown -->
					<div class="expand-dropdown" v-if="viewMode === 'json'">
						<button class="btn btn-sm btn-secondary expand-dropdown-btn" @click.stop="toggleExpandDropdown">
							⋮
						</button>
						<div class="expand-dropdown-menu" v-if="showExpandDropdown" @click.stop>
							<a href="#" @click.prevent="collapseAllFields">{{ t('collapseAllFields') }}</a>
							<a href="#" @click.prevent="expandAllFields">{{ t('expandAllFields') }}</a>
						</div>
					</div>
				</div>
			</div>
			<div class="results-content">
				<!-- JSON View -->
				<div v-if="viewMode === 'json'" class="json-results">
					<div class="result-doc" v-for="(doc, idx) in finalResults" :key="idx + '-' + jsonExpandKey">
						<JsonViewer :value="doc" :expandAll="jsonExpandAll" :defaultExpanded="!jsonExpandAll" />
					</div>
				</div>
				<!-- Table View -->
				<div v-else class="table-results">
					<table>
						<thead>
							<tr>
								<th v-for="col in resultColumns" :key="col">{{ col }}</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(row, idx) in finalResults" :key="idx">
								<td v-for="col in resultColumns" :key="col">
									<code>{{ formatCellValue(row[col]) }}</code>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Explain Plan Modal -->
		<div v-if="showExplainModal" class="modal-overlay" @click.self="showExplainModal = false">
			<div class="explain-modal">
				<div class="modal-header">
					<h2>{{ t('explainPlan') }}</h2>
					<button class="close-btn" @click="showExplainModal = false">&times;</button>
				</div>
				<p class="explain-desc">{{ t('executionStats') }}</p>

				<div class="explain-tabs">
					<button :class="['tab-btn', explainTab === 'visual' ? 'active' : '']" @click="explainTab = 'visual'">
						<span class="tab-icon">🌳</span> {{ t('visualTree') }}
					</button>
					<button :class="['tab-btn', explainTab === 'raw' ? 'active' : '']" @click="explainTab = 'raw'">
						<span class="tab-icon">{}</span> {{ t('rawOutput') }}
					</button>
				</div>

				<div class="explain-content" v-if="explainLoading">
					<div class="loading-spinner">{{ t('loading') }}</div>
				</div>
				<div class="explain-content" v-else-if="explainError">
					<div class="error-message">{{ explainError }}</div>
				</div>
				<div class="explain-content" v-else-if="explainData">
					<!-- Visual Tree View -->
					<div v-if="explainTab === 'visual'" class="explain-visual">
						<div class="explain-tree">
							<div class="tree-stages">
								<div class="tree-stage" v-for="(stage, idx) in explainStages" :key="idx">
									<div class="stage-node">
										<span class="stage-name">{{ stage.stage }}</span>
										<div class="stage-metrics">
											<span class="metric"
												>{{ t('nReturned') }}: <strong>{{ stage.nReturned || 0 }}</strong></span
											>
											<span class="metric"
												>{{ t('execTime') }}: <strong>{{ stage.executionTimeMillisEstimate || 0 }}ms</strong></span
											>
										</div>
										<div class="stage-details" v-if="stage.indexName">
											<span
												>{{ t('indexUsed') }}: <strong>{{ stage.indexName }}</strong></span
											>
										</div>
									</div>
									<div class="tree-connector" v-if="idx < explainStages.length - 1"></div>
								</div>
							</div>
						</div>
						<div class="explain-summary">
							<h4>{{ t('stageDetails') }}</h4>
							<ul>
								<li><span class="icon">📄</span> {{ explainSummary.docsReturned }} {{ t('docs') }} {{ t('nReturned') }}</li>
								<li><span class="icon">🔍</span> {{ explainSummary.docsExamined }} {{ t('totalDocsExamined') }}</li>
								<li><span class="icon">⏱</span> {{ explainSummary.executionTime }}ms {{ t('totalExecutionTime') }}</li>
								<li><span class="icon">📊</span> {{ explainSummary.indexesUsed.length > 0 ? t('indexUsed') : t('noExplainData') }}</li>
							</ul>
							<div class="indexes-used" v-if="explainSummary.indexesUsed.length > 0">
								<span>{{ t('indexUsed') }}:</span>
								<span class="index-tag" v-for="idx in explainSummary.indexesUsed" :key="idx">{{ idx }}</span>
							</div>
						</div>
					</div>
					<!-- Raw Output View -->
					<div v-else class="explain-raw">
						<pre>{{ JSON.stringify(explainData, null, 2) }}</pre>
					</div>
				</div>
				<div class="explain-content empty" v-else>
					<button class="btn btn-primary" @click="runExplain">{{ t('run') }} {{ t('explain') }}</button>
				</div>
			</div>
		</div>

		<!-- Save/Load Pipeline Modals -->
		<div v-if="showSaveModal" class="modal-overlay" @click.self="showSaveModal = false">
			<div class="modal-content">
				<h3>{{ t('savePipeline') }}</h3>
				<form @submit.prevent="savePipeline">
					<div class="form-group">
						<label>{{ t('pipelineName') }} *</label>
						<input v-model="saveName" type="text" placeholder="My Pipeline" required />
					</div>
					<div class="form-group">
						<label>{{ t('description') }}</label>
						<textarea v-model="saveDescription" :placeholder="t('optional')" rows="3"></textarea>
					</div>
					<div class="modal-actions">
						<button type="button" class="btn btn-secondary" @click="showSaveModal = false">{{ t('cancel') }}</button>
						<button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('loading') : t('save') }}</button>
					</div>
				</form>
			</div>
		</div>

		<div v-if="showLoadModal" class="modal-overlay" @click.self="showLoadModal = false">
			<div class="modal-content">
				<h3>{{ t('loadPipeline') }}</h3>
				<div v-if="loadingPipelines" class="loading">{{ t('loading') }}</div>
				<div v-else-if="savedPipelines.length === 0" class="empty-state">{{ t('noSavedPipelines') }}</div>
				<ul v-else class="pipeline-list">
					<li v-for="pipeline in savedPipelines" :key="pipeline.id">
						<div class="pipeline-info" @click="loadPipeline(pipeline)">
							<span class="pipeline-name">{{ pipeline.name }}</span>
							<span v-if="pipeline.description" class="pipeline-desc">{{ pipeline.description }}</span>
						</div>
						<button class="btn-icon danger" @click="confirmDeletePipeline(pipeline)" :title="t('delete')">×</button>
					</li>
				</ul>
				<div class="modal-actions">
					<button class="btn btn-secondary" @click="showLoadModal = false">{{ t('close') }}</button>
				</div>
			</div>
		</div>

		<!-- Export to Language Modal -->
		<div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
			<div class="export-modal">
				<div class="modal-header">
					<h2>{{ t('exportPipelineToLanguage') }}</h2>
					<button class="close-btn" @click="showExportModal = false">&times;</button>
				</div>

				<div class="export-languages">
					<button
						v-for="lang in exportLanguages"
						:key="lang.id"
						:class="['lang-btn', selectedExportLanguage === lang.id ? 'active' : '']"
						@click="selectExportLanguage(lang.id)"
					>
						<span class="lang-icon">{{ lang.icon }}</span>
						<span class="lang-name">{{ lang.name }}</span>
					</button>
				</div>

				<div class="export-code-container">
					<pre class="export-code">{{ exportCode }}</pre>
				</div>

				<div class="modal-actions">
					<button class="btn btn-secondary" @click="showExportModal = false">{{ t('close') }}</button>
					<button class="btn btn-primary" @click="copyExportCode">{{ t('copyToClipboard') }}</button>
				</div>
			</div>
		</div>

		<!-- Focus Mode Modal -->
		<div v-if="focusModeIndex !== null" class="modal-overlay focus-mode-overlay" @click.self="closeFocusMode">
			<div class="focus-mode-modal">
				<div class="focus-modal-header">
					<div class="focus-header-left">
						<button class="focus-nav-btn" @click="focusNavigate(-1)" :disabled="focusModeIndex === 0">‹</button>
						<span class="focus-stage-title">{{ t('stage') }} {{ focusModeIndex + 1 }}: {{ stages[focusModeIndex]?.operator || t('selectStage') }}</span>
						<button class="focus-nav-btn" @click="focusNavigate(1)" :disabled="focusModeIndex === stages.length - 1">›</button>
					</div>
					<div class="focus-header-center">
						<label class="stage-toggle">
							<span class="toggle-text">{{ t('enabled') }}</span>
							<input type="checkbox" v-model="stages[focusModeIndex].enabled" @change="onStageToggle(focusModeIndex)" />
							<span class="toggle-slider"></span>
						</label>
					</div>
					<div class="focus-header-right">
						<button class="btn btn-secondary btn-sm" @click="addStageAfter(focusModeIndex)">+ {{ t('addStage') }}</button>
						<button class="close-btn" @click="closeFocusMode">&times;</button>
					</div>
				</div>

				<div class="focus-modal-body">
					<!-- Left Panel: Stage Input -->
					<div class="focus-panel focus-input-panel">
						<div class="focus-panel-header">
							<span class="panel-title">{{ t('stageInput') }}</span>
							<span class="panel-subtitle">{{ focusInputDocs.length }} {{ t('docs') }}</span>
						</div>
						<div class="focus-panel-content">
							<div class="focus-doc" v-for="(doc, idx) in focusInputDocs" :key="'input-' + idx">
								<JsonViewer :value="doc" />
							</div>
							<div v-if="focusInputDocs.length === 0" class="empty-docs">{{ t('noDocuments') }}</div>
						</div>
					</div>

					<!-- Center Panel: Code Editor -->
					<div class="focus-panel focus-editor-panel">
						<div class="focus-panel-header">
							<div class="focus-editor-toolbar">
								<select v-model="stages[focusModeIndex].operator" @change="onOperatorChange(focusModeIndex)" class="focus-stage-select">
									<option value="">{{ t('selectStage') }}...</option>
									<optgroup :label="t('stageGroupCommon')">
										<option value="$match">$match</option>
										<option value="$project">$project</option>
										<option value="$group">$group</option>
										<option value="$sort">$sort</option>
										<option value="$limit">$limit</option>
										<option value="$skip">$skip</option>
									</optgroup>
									<optgroup :label="t('stageGroupJoinLookup')">
										<option value="$lookup">$lookup</option>
										<option value="$unwind">$unwind</option>
										<option value="$graphLookup">$graphLookup</option>
									</optgroup>
									<optgroup :label="t('stageGroupTransform')">
										<option value="$addFields">$addFields</option>
										<option value="$set">$set</option>
										<option value="$unset">$unset</option>
										<option value="$replaceRoot">$replaceRoot</option>
										<option value="$replaceWith">$replaceWith</option>
									</optgroup>
									<optgroup :label="t('stageGroupArray')">
										<option value="$filter">$filter</option>
										<option value="$map">$map</option>
										<option value="$reduce">$reduce</option>
									</optgroup>
									<optgroup :label="t('stageGroupGrouping')">
										<option value="$bucket">$bucket</option>
										<option value="$bucketAuto">$bucketAuto</option>
										<option value="$facet">$facet</option>
										<option value="$sortByCount">$sortByCount</option>
									</optgroup>
									<optgroup :label="t('stageGroupOutput')">
										<option value="$out">$out</option>
										<option value="$merge">$merge</option>
										<option value="$count">$count</option>
									</optgroup>
									<optgroup :label="t('stageGroupOther')">
										<option value="$sample">$sample</option>
										<option value="$redact">$redact</option>
										<option value="$geoNear">$geoNear</option>
										<option value="$unionWith">$unionWith</option>
									</optgroup>
								</select>
								<a :href="getDocsUrl(stages[focusModeIndex]?.operator)" target="_blank" class="docs-link">
									{{ t('openDocs') }} <span class="external-icon">↗</span>
								</a>
							</div>
						</div>
						<div class="focus-panel-content focus-code-content">
							<MongoCodeEditor
								v-model="stages[focusModeIndex].code"
								@update:modelValue="onFocusCodeChange"
								:placeholder="getPlaceholder(stages[focusModeIndex]?.operator)"
								height="100%"
								:showFooter="true"
								:documentFields="documentFields"
							/>
						</div>
						<div v-if="stages[focusModeIndex]?.error" class="focus-error">{{ stages[focusModeIndex].error }}</div>
					</div>

					<!-- Right Panel: Stage Output -->
					<div class="focus-panel focus-output-panel">
						<div class="focus-panel-header">
							<span class="panel-title">{{ t('stageOutput') }}</span>
							<span class="panel-subtitle">{{ focusOutputDocs.length }} {{ t('docs') }}</span>
						</div>
						<div class="focus-panel-content">
							<div v-if="focusOutputLoading" class="loading-spinner">{{ t('loadingPreview') }}</div>
							<div v-else-if="focusOutputError" class="focus-output-error">{{ focusOutputError }}</div>
							<template v-else>
								<div class="focus-doc" v-for="(doc, idx) in focusOutputDocs" :key="'output-' + idx">
									<JsonViewer :value="doc" />
								</div>
								<div v-if="focusOutputDocs.length === 0" class="empty-docs">{{ t('noDocuments') }}</div>
							</template>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, watch, nextTick} from 'vue'
import {useI18n} from 'vue-i18n'
import {useAppStore} from '../stores/app.js'
import {useDialog} from '../composables/useDialog.js'
import api from '../api/index.js'
import JsonViewer from './JsonViewer.vue'
import JsonEditor from './JsonEditor.vue'
import MongoCodeEditor from './MongoCodeEditor.vue'

const {t} = useI18n()

const props = defineProps({
	connectionId: {type: String, required: true},
	database: {type: String, required: true},
	collection: {type: String, required: true}
})

const dialog = useDialog()
const store = useAppStore()

// Editor settings from store
const editorTheme = computed(() => store.editorTheme || 'default')
const editorFontSize = computed(() => store.editorFontSize || 13)
const editorFont = computed(() => store.editorFont || 'Consolas')

// Theme colors mapping
const themeColors = {
	default: {bg: '#1e1e1e', text: '#d4d4d4', comment: '#6a9955'},
	monokai: {bg: '#272822', text: '#f8f8f2', comment: '#75715e'},
	dracula: {bg: '#282a36', text: '#f8f8f2', comment: '#6272a4'},
	material: {bg: '#263238', text: '#eeffff', comment: '#546e7a'},
	nord: {bg: '#2e3440', text: '#d8dee9', comment: '#616e88'},
	cobalt: {bg: '#002240', text: '#ffffff', comment: '#0088ff'},
	'solarized-dark': {bg: '#002b36', text: '#839496', comment: '#586e75'},
	'gruvbox-dark': {bg: '#282828', text: '#ebdbb2', comment: '#928374'},
	'one-dark': {bg: '#282c34', text: '#abb2bf', comment: '#5c6370'},
	twilight: {bg: '#141414', text: '#f7f7f7', comment: '#5f5a60'},
	ambiance: {bg: '#202020', text: '#e6e1dc', comment: '#555'},
	eclipse: {bg: '#ffffff', text: '#000000', comment: '#3f7f5f'},
	'solarized-light': {bg: '#fdf6e3', text: '#657b83', comment: '#93a1a1'},
	idea: {bg: '#ffffff', text: '#000000', comment: '#808080'},
	neo: {bg: '#ffffff', text: '#2e383c', comment: '#75787b'},
	neat: {bg: '#ffffff', text: '#2e383c', comment: '#75787b'},
	elegant: {bg: '#ffffff', text: '#2e383c', comment: '#75787b'},
	yeti: {bg: '#eceae8', text: '#546e7a', comment: '#9fb4bf'}
}

const currentThemeColors = computed(() => {
	const themeName = editorTheme.value.toLowerCase().replace(/\s+/g, '-')
	return themeColors[themeName] || themeColors['default']
})

// Stage templates
const stageTemplates = {
	$match: `/**
 * query: The query in MQL.
 */
{
  field: "value"
}`,
	$project: `/**
 * specifications: The fields to include or exclude.
 * 1 = include, 0 = exclude
 */
{
  _id: 1,
  field: 1
}`,
	$group: `/**
 * _id: The id of the group.
 * fieldN: The computed fields.
 */
{
  _id: "$field",
  count: { $sum: 1 }
}`,
	$sort: `/**
 * Specify sort order: 1 for ascending, -1 for descending.
 */
{
  field: -1
}`,
	$limit: `/**
 * Provide the number of documents to limit.
 */
10`,
	$skip: `/**
 * Provide the number of documents to skip.
 */
0`,
	$lookup: `/**
 * from: The collection to join.
 * localField: Field from input documents.
 * foreignField: Field from the documents of the "from" collection.
 * as: Output array field.
 */
{
  from: "collection",
  localField: "field",
  foreignField: "field",
  as: "result"
}`,
	$unwind: `/**
 * path: Path to the array field.
 * preserveNullAndEmptyArrays: Optional.
 */
{
  path: "$arrayField",
  preserveNullAndEmptyArrays: false
}`,
	$addFields: `/**
 * newField: The new field name.
 * expression: The new field expression.
 */
{
  newField: "expression"
}`,
	$set: `/**
 * field: The field to set.
 * expression: The value expression.
 */
{
  field: "value"
}`,
	$unset: `/**
 * Specify fields to remove.
 */
"fieldToRemove"`,
	$replaceRoot: `/**
 * newRoot: The new root document.
 */
{
  newRoot: "$subdocument"
}`,
	$replaceWith: `/**
 * replacementDocument: The replacement document.
 */
"$subdocument"`,
	$bucket: `/**
 * groupBy: Field to group by.
 * boundaries: Array of boundary values.
 * default: Bucket for values outside boundaries.
 * output: Output fields.
 */
{
  groupBy: "$field",
  boundaries: [0, 100, 200],
  default: "Other",
  output: {
    count: { $sum: 1 }
  }
}`,
	$bucketAuto: `/**
 * groupBy: Field to group by.
 * buckets: Number of buckets.
 */
{
  groupBy: "$field",
  buckets: 5
}`,
	$facet: `/**
 * outputFieldN: Array of stages.
 */
{
  output1: [{ $match: {} }],
  output2: [{ $match: {} }]
}`,
	$sortByCount: `/**
 * expression: The expression to sort by count.
 */
"$field"`,
	$count: `/**
 * string: The name of the output field.
 */
"totalCount"`,
	$out: `/**
 * collection: Output collection name.
 */
"outputCollection"`,
	$merge: `/**
 * into: Target collection.
 * on: Field(s) to match.
 * whenMatched: Action when matched.
 * whenNotMatched: Action when not matched.
 */
{
  into: "targetCollection",
  on: "_id",
  whenMatched: "merge",
  whenNotMatched: "insert"
}`,
	$sample: `/**
 * size: Number of random documents.
 */
{
  size: 10
}`,
	$redact: `/**
 * expression: Redact expression.
 */
{
  $cond: {
    if: { $eq: ["$level", 1] },
    then: "$$DESCEND",
    else: "$$PRUNE"
  }
}`,
	$geoNear: `/**
 * near: The point for which to find nearby documents.
 * distanceField: Output field for distance.
 */
{
  near: { type: "Point", coordinates: [0, 0] },
  distanceField: "distance",
  maxDistance: 1000,
  spherical: true
}`,
	$graphLookup: `/**
 * Recursive lookup within a collection.
 */
{
  from: "collection",
  startWith: "$field",
  connectFromField: "field",
  connectToField: "field",
  as: "result"
}`,
	$unionWith: `/**
 * coll: Collection to union with.
 * pipeline: Optional pipeline to apply.
 */
{
  coll: "otherCollection",
  pipeline: []
}`,
	$filter: `/**
 * Filter array elements.
 */
{
  input: "$arrayField",
  as: "item",
  cond: { $gte: ["$$item.value", 10] }
}`,
	$map: `/**
 * Map array elements.
 */
{
  input: "$arrayField",
  as: "item",
  in: "$$item.field"
}`,
	$reduce: `/**
 * Reduce array to single value.
 */
{
  input: "$arrayField",
  initialValue: 0,
  in: { $add: ["$$value", "$$this"] }
}`
}

// Export language templates
const exportLanguages = [
	{id: 'java', name: 'Java', icon: '☕'},
	{id: 'node', name: 'Node.js', icon: '🟢'},
	{id: 'csharp', name: 'C#', icon: '#'},
	{id: 'python', name: 'Python', icon: '🐍'},
	{id: 'ruby', name: 'Ruby', icon: '💎'},
	{id: 'go', name: 'Go', icon: '🔵'},
	{id: 'rust', name: 'Rust', icon: '🦀'},
	{id: 'php', name: 'PHP', icon: '🐘'}
]

function generateExportCode(language, pipeline, collection) {
	const pipelineJson = JSON.stringify(pipeline, null, 2)
	const pipelineJsonIndented = pipelineJson
		.split('\n')
		.map((line, i) => (i === 0 ? line : '    ' + line))
		.join('\n')

	const templates = {
		java: `import com.mongodb.client.MongoCollection;
import com.mongodb.client.AggregateIterable;
import org.bson.Document;
import java.util.Arrays;
import java.util.List;

// Get collection
MongoCollection<Document> collection = database.getCollection("${collection}");

// Build pipeline
List<Document> pipeline = Arrays.asList(
${pipeline.map(stage => `    Document.parse("${JSON.stringify(stage).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`).join(',\n')}
);

// Execute aggregation
AggregateIterable<Document> results = collection.aggregate(pipeline);
for (Document doc : results) {
    System.out.println(doc.toJson());
}`,

		node: `const { MongoClient } = require('mongodb');

async function runAggregation() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        const db = client.db('your_database');
        const collection = db.collection('${collection}');

        const pipeline = ${pipelineJsonIndented};

        const results = await collection.aggregate(pipeline).toArray();
        console.log(results);

        return results;
    } finally {
        await client.close();
    }
}

runAggregation().catch(console.error);`,

		csharp: `using MongoDB.Driver;
using MongoDB.Bson;
using System.Collections.Generic;

// Get collection
var collection = database.GetCollection<BsonDocument>("${collection}");

// Build pipeline
var pipeline = new BsonDocument[]
{
${pipeline.map(stage => `    BsonDocument.Parse(@"${JSON.stringify(stage).replace(/"/g, '""')}")`).join(',\n')}
};

// Execute aggregation
var results = collection.Aggregate<BsonDocument>(pipeline).ToList();
foreach (var doc in results)
{
    Console.WriteLine(doc.ToJson());
}`,

		python: `from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017')
db = client['your_database']
collection = db['${collection}']

# Define pipeline
pipeline = ${pipelineJson}

# Execute aggregation
results = collection.aggregate(pipeline)
for doc in results:
    print(doc)`,

		ruby: `require 'mongo'

# Connect to MongoDB
client = Mongo::Client.new('mongodb://localhost:27017/your_database')
collection = client[:${collection}]

# Define pipeline
pipeline = ${pipelineJson}

# Execute aggregation
results = collection.aggregate(pipeline)
results.each do |doc|
  puts doc.to_json
end`,

		go: `package main

import (
    "context"
    "fmt"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
    // Connect to MongoDB
    client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI("mongodb://localhost:27017"))
    if err != nil {
        panic(err)
    }
    defer client.Disconnect(context.TODO())

    collection := client.Database("your_database").Collection("${collection}")

    // Define pipeline
    pipeline := mongo.Pipeline{
${pipeline.map(stage => `        bson.D${formatGoBson(stage)}`).join(',\n')}
    }

    // Execute aggregation
    cursor, err := collection.Aggregate(context.TODO(), pipeline)
    if err != nil {
        panic(err)
    }

    var results []bson.M
    if err = cursor.All(context.TODO(), &results); err != nil {
        panic(err)
    }

    for _, result := range results {
        fmt.Println(result)
    }
}`,

		rust: `use mongodb::{Client, bson::doc};
use futures::stream::TryStreamExt;

#[tokio::main]
async fn main() -> mongodb::error::Result<()> {
    // Connect to MongoDB
    let client = Client::with_uri_str("mongodb://localhost:27017").await?;
    let db = client.database("your_database");
    let collection = db.collection::<mongodb::bson::Document>("${collection}");

    // Define pipeline
    let pipeline = vec![
${pipeline.map(stage => `        doc! ${formatRustBson(stage)}`).join(',\n')}
    ];

    // Execute aggregation
    let mut cursor = collection.aggregate(pipeline, None).await?;

    while let Some(doc) = cursor.try_next().await? {
        println!("{:?}", doc);
    }

    Ok(())
}`,

		php: `<?php
require 'vendor/autoload.php';

// Connect to MongoDB
$client = new MongoDB\\Client('mongodb://localhost:27017');
$collection = $client->your_database->${collection};

// Define pipeline
$pipeline = json_decode('${JSON.stringify(pipeline)}', true);

// Execute aggregation
$cursor = $collection->aggregate($pipeline);

foreach ($cursor as $document) {
    var_dump($document);
}
?>`
	}

	return templates[language] || templates.node
}

// Helper functions for language-specific formatting
function formatGoBson(obj) {
	// Simplified Go bson formatting
	return JSON.stringify(obj)
}

function formatRustBson(obj) {
	// Simplified Rust bson formatting
	const key = Object.keys(obj)[0]
	const value = obj[key]
	return `{ "${key}": ${JSON.stringify(value)} }`
}

// State
const stages = ref([])
const autoPreview = ref(true)
const running = ref(false)
const totalDocs = ref(null)
const collectionDocs = ref([])
const finalResults = ref(null)
const finalResultCount = ref(0)
const viewMode = ref('json')

const pagination = ref({
	page: 1,
	limit: 20,
	pageSize: 20,
	totalCount: 0,
	totalPages: 0
})

// JSON expand state
const jsonExpandAll = ref(false)
const jsonExpandKey = ref(0)
const showExpandDropdown = ref(false)

// Computed pagination info
const paginationLimit = computed(() => {
	return pagination.value.limit || pagination.value.pageSize || 20
})

const paginationStart = computed(() => {
	if (finalResultCount.value === 0) return 0
	return (pagination.value.page - 1) * paginationLimit.value + 1
})

const paginationEnd = computed(() => {
	const end = pagination.value.page * paginationLimit.value
	return Math.min(end, finalResultCount.value)
})

// Explain state
const showExplainModal = ref(false)
const explainTab = ref('visual')
const explainData = ref(null)
const explainLoading = ref(false)
const explainError = ref('')

// Save/Load state
const showSaveModal = ref(false)
const showLoadModal = ref(false)
const savedPipelines = ref([])
const loadingPipelines = ref(false)
const saveName = ref('')
const saveDescription = ref('')
const saving = ref(false)

// Stage menu state
const openMenuIndex = ref(null)

// Focus mode state
const focusModeIndex = ref(null)
const focusInputDocs = ref([])
const focusOutputDocs = ref([])
const focusOutputLoading = ref(false)
const focusOutputError = ref('')

// Pipelines dropdown state
const showPipelinesDropdown = ref(false)

// Editor mode (stages or text)
const editorMode = ref('stages') // 'stages' | 'text'
const resultsMode = ref(false) // true when showing full results after Run

// Exit results mode and return to editor
function exitResultsMode() {
	resultsMode.value = false
}

// Toggle expand dropdown
function toggleExpandDropdown() {
	showExpandDropdown.value = !showExpandDropdown.value
}

// Collapse all JSON fields
function collapseAllFields() {
	jsonExpandAll.value = false
	jsonExpandKey.value++ // Force re-render
	showExpandDropdown.value = false
}

// Expand all JSON fields
function expandAllFields() {
	jsonExpandAll.value = true
	jsonExpandKey.value++ // Force re-render
	showExpandDropdown.value = false
}

// TEXT mode state
const textModeContent = ref('[]')
const textModeError = ref('')
const textModeErrors = ref([]) // [{line, message, stageIndex}]
const textModePreviewDocs = ref([])
const textModePreviewLoading = ref(false)

// Export modal state
const showExportModal = ref(false)
const selectedExportLanguage = ref('node')
const exportCode = ref('')

// Debounce timer
let previewDebounceTimer = null
let focusDebounceTimer = null

// Computed - Extract document fields for autocomplete
const documentFields = computed(() => {
	const fields = new Map()

	function extractFields(obj, prefix = '') {
		if (!obj || typeof obj !== 'object') return

		for (const [key, value] of Object.entries(obj)) {
			if (key === '_id') continue // Skip _id

			const path = prefix ? `${prefix}.${key}` : key
			const type = Array.isArray(value) ? 'array' : typeof value

			if (!fields.has(path)) {
				fields.set(path, {path, type})
			}

			// Recursively extract nested fields
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				extractFields(value, path)
			}

			// Extract array element fields
			if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
				extractFields(value[0], path)
			}
		}
	}

	// Extract from collection preview docs
	collectionDocs.value.forEach(doc => extractFields(doc))

	return Array.from(fields.values()).sort((a, b) => a.path.localeCompare(b.path))
})

// Computed
const resultColumns = computed(() => {
	if (!finalResults.value || finalResults.value.length === 0) return []
	const keys = new Set()
	finalResults.value.forEach(doc => {
		Object.keys(doc).forEach(key => keys.add(key))
	})
	return Array.from(keys)
})

const explainStages = computed(() => {
	if (!explainData.value) return []
	const stages = []

	function extractStages(plan) {
		if (!plan) return
		if (plan.stage) {
			stages.unshift({
				stage: plan.stage,
				nReturned: plan.nReturned,
				executionTimeMillisEstimate: plan.executionTimeMillisEstimate,
				indexName: plan.indexName || plan.keyPattern ? Object.keys(plan.keyPattern || {}).join(', ') : null
			})
		}
		if (plan.inputStage) {
			extractStages(plan.inputStage)
		}
		if (plan.inputStages) {
			plan.inputStages.forEach(s => extractStages(s))
		}
	}

	const executionStats = explainData.value.executionStats || explainData.value.stages?.[0]?.$cursor?.executionStats
	if (executionStats?.executionStages) {
		extractStages(executionStats.executionStages)
	}

	return stages
})

const explainSummary = computed(() => {
	if (!explainData.value) return {docsReturned: 0, docsExamined: 0, executionTime: 0, indexesUsed: []}

	const stats = explainData.value.executionStats || explainData.value.stages?.[0]?.$cursor?.executionStats || {}
	const indexes = []

	function findIndexes(plan) {
		if (!plan) return
		if (plan.indexName) indexes.push(plan.indexName)
		if (plan.inputStage) findIndexes(plan.inputStage)
		if (plan.inputStages) plan.inputStages.forEach(findIndexes)
	}
	findIndexes(stats.executionStages)

	return {
		docsReturned: stats.nReturned || 0,
		docsExamined: stats.totalDocsExamined || 0,
		executionTime: stats.executionTimeMillis || 0,
		indexesUsed: [...new Set(indexes)]
	}
})

// Methods
function generateStageId() {
	return 'stage_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function addStage(index) {
	const newStage = {
		id: generateStageId(),
		operator: '',
		code: '',
		enabled: true,
		collapsed: false,
		previewDocs: [],
		previewCount: null,
		previewLoading: false,
		previewError: null,
		error: null
	}
	stages.value.splice(index, 0, newStage)
}

function removeStage(index) {
	closeStageMenu()
	stages.value.splice(index, 1)
	if (focusModeIndex.value === index) {
		focusModeIndex.value = null
	} else if (focusModeIndex.value !== null && focusModeIndex.value > index) {
		focusModeIndex.value--
	}
	if (autoPreview.value) {
		updateAllPreviews()
	}
}

function addStageAfter(index) {
	closeStageMenu()
	addStage(index + 1)
}

function addStageBefore(index) {
	closeStageMenu()
	addStage(index)
	if (focusModeIndex.value !== null && focusModeIndex.value >= index) {
		focusModeIndex.value++
	}
}

// Stage menu functions
function toggleStageMenu(index) {
	if (openMenuIndex.value === index) {
		openMenuIndex.value = null
	} else {
		openMenuIndex.value = index
	}
}

function closeStageMenu() {
	openMenuIndex.value = null
}

// Focus mode functions
function openFocusMode(index) {
	focusModeIndex.value = index
	loadFocusData()
}

function closeFocusMode() {
	focusModeIndex.value = null
	focusInputDocs.value = []
	focusOutputDocs.value = []
	focusOutputError.value = ''
	// Update previews after closing focus mode
	if (autoPreview.value) {
		updateAllPreviews()
	}
}

function focusNavigate(direction) {
	const newIndex = focusModeIndex.value + direction
	if (newIndex >= 0 && newIndex < stages.value.length) {
		focusModeIndex.value = newIndex
		loadFocusData()
	}
}

async function loadFocusData() {
	if (focusModeIndex.value === null) return

	// Load input documents (from previous stage or collection)
	try {
		if (focusModeIndex.value === 0) {
			// First stage - use collection documents
			focusInputDocs.value = collectionDocs.value.slice(0, 10)
		} else {
			// Get output from previous stage
			const pipeline = buildPipelineUpTo(focusModeIndex.value - 1)
			if (pipeline) {
				const response = await api.aggregations.run(props.connectionId, props.database, props.collection, pipeline, {page: 1, pageSize: 10})
				focusInputDocs.value = response.results || []
			}
		}
	} catch (err) {
		focusInputDocs.value = []
	}

	// Load output documents
	await loadFocusOutput()
}

async function loadFocusOutput() {
	if (focusModeIndex.value === null) return

	const stage = stages.value[focusModeIndex.value]
	if (!stage.enabled || !stage.operator) {
		focusOutputDocs.value = []
		return
	}

	focusOutputLoading.value = true
	focusOutputError.value = ''

	try {
		const pipeline = buildPipelineUpTo(focusModeIndex.value)
		if (!pipeline) {
			focusOutputError.value = 'Invalid pipeline'
			focusOutputLoading.value = false
			return
		}

		const response = await api.aggregations.run(props.connectionId, props.database, props.collection, pipeline, {page: 1, pageSize: 10})

		focusOutputDocs.value = response.results || []
		stage.error = null
	} catch (err) {
		focusOutputError.value = err.message
		focusOutputDocs.value = []
		stage.error = err.message
	} finally {
		focusOutputLoading.value = false
	}
}

function onFocusCodeChange() {
	if (focusModeIndex.value === null) return

	stages.value[focusModeIndex.value].error = null

	// Debounced output update
	if (focusDebounceTimer) {
		clearTimeout(focusDebounceTimer)
	}
	focusDebounceTimer = setTimeout(() => {
		loadFocusOutput()
	}, 500)
}

function duplicateStage(index) {
	closeStageMenu()
	const original = stages.value[index]
	const duplicate = {
		...original,
		id: generateStageId(),
		previewDocs: [],
		previewCount: null,
		previewLoading: false,
		previewError: null
	}
	stages.value.splice(index + 1, 0, duplicate)

	if (autoPreview.value) {
		schedulePreviewUpdate(index + 1)
	}
}

function moveStageUp(index) {
	closeStageMenu()
	if (index > 0) {
		const temp = stages.value[index]
		stages.value[index] = stages.value[index - 1]
		stages.value[index - 1] = temp
		if (autoPreview.value) {
			updateAllPreviews()
		}
	}
}

function moveStageDown(index) {
	closeStageMenu()
	if (index < stages.value.length - 1) {
		const temp = stages.value[index]
		stages.value[index] = stages.value[index + 1]
		stages.value[index + 1] = temp
		if (autoPreview.value) {
			updateAllPreviews()
		}
	}
}

function toggleStageCollapse(index) {
	stages.value[index].collapsed = !stages.value[index].collapsed
}

function onOperatorChange(index) {
	const stage = stages.value[index]
	if (stage.operator && stageTemplates[stage.operator]) {
		stage.code = stageTemplates[stage.operator]
	}
	stage.error = null

	if (autoPreview.value) {
		schedulePreviewUpdate(index)
	}
}

function onStageCodeChange(index) {
	stages.value[index].error = null

	if (autoPreview.value) {
		schedulePreviewUpdate(index)
	}
}

function onStageToggle(index) {
	if (autoPreview.value) {
		updateAllPreviews()
	}
}

function getPlaceholder(operator) {
	return stageTemplates[operator] || '{\n  \n}'
}

function getDocsUrl(operator) {
	const op = operator?.replace('$', '') || 'match'
	return `https://www.mongodb.com/docs/manual/reference/operator/aggregation/${op}/`
}

function schedulePreviewUpdate(fromIndex) {
	if (previewDebounceTimer) {
		clearTimeout(previewDebounceTimer)
	}
	previewDebounceTimer = setTimeout(() => {
		updatePreviewsFrom(fromIndex)
	}, 500)
}

function updateAllPreviews() {
	updatePreviewsFrom(0)
}

async function updatePreviewsFrom(fromIndex) {
	for (let i = fromIndex; i < stages.value.length; i++) {
		if (stages.value[i].enabled) {
			await updateStagePreview(i)
		}
	}
}

async function updateStagePreview(index) {
	const stage = stages.value[index]
	if (!stage.enabled || !stage.operator) {
		stage.previewDocs = []
		stage.previewCount = null
		return
	}

	stage.previewLoading = true
	stage.previewError = null

	try {
		const pipeline = buildPipelineUpTo(index)
		if (!pipeline) {
			stage.previewError = 'Invalid pipeline'
			stage.previewLoading = false
			return
		}

		const response = await api.aggregations.run(props.connectionId, props.database, props.collection, pipeline, {page: 1, pageSize: 10})

		// Extract documents from results (up to 10)
		const results = response.results || []
		stage.previewDocs = results.slice(0, 10)
		stage.previewCount = response.pagination?.totalCount || results.length || 0
		stage.error = null
	} catch (err) {
		stage.previewError = err.message
		stage.previewDocs = []
		stage.previewCount = null
		stage.error = err.message
	} finally {
		stage.previewLoading = false
	}
}

function buildPipelineUpTo(index) {
	const pipeline = []

	for (let i = 0; i <= index; i++) {
		const stage = stages.value[i]
		if (!stage.enabled) continue

		try {
			const stageObj = parseStageCode(stage.operator, stage.code)
			if (stageObj) {
				pipeline.push(stageObj)
			}
		} catch (err) {
			stages.value[i].error = err.message
			return null
		}
	}

	return pipeline
}

function buildFullPipeline() {
	return buildPipelineUpTo(stages.value.length - 1)
}

function parseStageCode(operator, code) {
	if (!operator || !code) return null

	// Remove comments
	const cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').trim()

	if (!cleanCode) return null

	try {
		// Try to parse as JSON first
		const value = Function('"use strict"; return (' + cleanCode + ')')()
		return {[operator]: value}
	} catch (err) {
		throw new Error(`Invalid syntax: ${err.message}`)
	}
}

async function runFullPipeline() {
	const pipeline = buildFullPipeline()
	if (!pipeline) {
		dialog.error(t('invalidPipeline'))
		return
	}

	running.value = true

	try {
		const response = await api.aggregations.run(props.connectionId, props.database, props.collection, pipeline, {
			page: pagination.value.page,
			pageSize: pagination.value.pageSize
		})

		finalResults.value = response.results
		finalResultCount.value = response.pagination?.totalCount || response.results?.length || 0
		pagination.value = response.pagination || pagination.value
		resultsMode.value = true // Enter results mode after successful run
	} catch (err) {
		dialog.error(t('pipelineError') + ': ' + err.message)
		finalResults.value = null
	} finally {
		running.value = false
	}
}

async function runExplain() {
	const pipeline = buildFullPipeline()
	if (!pipeline) {
		explainError.value = 'Invalid pipeline'
		return
	}

	explainLoading.value = true
	explainError.value = ''

	try {
		const response = await api.aggregations.run(props.connectionId, props.database, props.collection, pipeline, {explain: true})

		explainData.value = response.explain
	} catch (err) {
		explainError.value = err.message
	} finally {
		explainLoading.value = false
	}
}

function changePage(page) {
	pagination.value.page = page
	runFullPipeline()
}

function formatCellValue(value) {
	if (value === null || value === undefined) return 'null'
	if (typeof value === 'object') {
		const str = JSON.stringify(value)
		return str.length > 50 ? str.substring(0, 50) + '...' : str
	}
	return String(value)
}

function exportPipeline() {
	const pipeline = buildFullPipeline()
	if (!pipeline) {
		dialog.error(t('invalidPipeline'))
		return
	}

	const json = JSON.stringify(pipeline, null, 2)
	const blob = new Blob([json], {type: 'application/json'})
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `${props.collection}_pipeline.json`
	a.click()
	URL.revokeObjectURL(url)
}

async function fetchCollectionPreview() {
	try {
		const response = await api.aggregations.run(props.connectionId, props.database, props.collection, [], {page: 1, pageSize: 10})
		collectionDocs.value = response.results || []
		totalDocs.value = response.pagination?.totalCount || 0
	} catch (err) {
		console.error('Failed to fetch collection preview:', err)
	}
}

function refreshCollectionPreview() {
	fetchCollectionPreview()
}

// Save/Load Pipeline
async function fetchSavedPipelines() {
	loadingPipelines.value = true
	try {
		const response = await api.aggregations.listSaved(props.connectionId, props.database, props.collection)
		savedPipelines.value = response.pipelines || []
	} catch (err) {
		console.error('Failed to fetch pipelines:', err)
		savedPipelines.value = []
	} finally {
		loadingPipelines.value = false
	}
}

watch(showLoadModal, val => {
	if (val) {
		fetchSavedPipelines()
	}
})

async function savePipeline() {
	const pipeline = buildFullPipeline()
	if (!pipeline) {
		dialog.warning('Invalid pipeline')
		return
	}

	saving.value = true
	try {
		await api.aggregations.save(props.connectionId, props.database, props.collection, {
			name: saveName.value,
			description: saveDescription.value,
			pipeline
		})

		showSaveModal.value = false
		saveName.value = ''
		saveDescription.value = ''
		dialog.success(t('pipelineSaved'))
	} catch (err) {
		dialog.error(`Failed to save: ${err.message}`)
	} finally {
		saving.value = false
	}
}

function loadPipeline(pipelineData) {
	stages.value = []

	if (pipelineData.pipeline && Array.isArray(pipelineData.pipeline)) {
		pipelineData.pipeline.forEach((stageObj, idx) => {
			const operator = Object.keys(stageObj)[0]
			const value = stageObj[operator]

			stages.value.push({
				id: generateStageId(),
				operator: operator,
				code: typeof value === 'string' ? `"${value}"` : JSON.stringify(value, null, 2),
				enabled: true,
				collapsed: false,
				previewDocs: [],
				previewCount: null,
				previewLoading: false,
				previewError: null,
				error: null
			})
		})
	}

	showLoadModal.value = false

	if (autoPreview.value && stages.value.length > 0) {
		updateAllPreviews()
	}
}

async function confirmDeletePipeline(pipeline) {
	const confirmed = await dialog.confirm({
		title: t('deletePipeline'),
		message: t('deletePipelineConfirm'),
		type: 'warning',
		confirmText: t('delete'),
		cancelText: t('cancel')
	})

	if (confirmed) {
		try {
			await api.aggregations.deleteSaved(pipeline.id)
			await fetchSavedPipelines()
		} catch (err) {
			dialog.error(`Failed to delete: ${err.message}`)
		}
	}
}

// ========== NEW FUNCTIONS FOR ENHANCED FEATURES ==========

// Pipelines dropdown
function togglePipelinesDropdown() {
	showPipelinesDropdown.value = !showPipelinesDropdown.value
	if (showPipelinesDropdown.value) {
		fetchSavedPipelines()
	}
}

function loadPipelineFromDropdown(pipeline) {
	loadPipeline(pipeline)
	showPipelinesDropdown.value = false
}

// Create new pipeline
async function createNewPipeline() {
	if (stages.value.length > 0) {
		const confirmed = await dialog.confirm({
			title: t('createNewPipeline'),
			message: t('currentPipelineCleared'),
			type: 'warning',
			confirmText: t('create'),
			cancelText: t('cancel')
		})
		if (!confirmed) return
	}

	stages.value = []
	finalResults.value = null
	textModeContent.value = '[]'
	textModeError.value = ''
	textModePreviewDocs.value = []
}

// Mode switching
function switchToStagesMode() {
	if (editorMode.value === 'stages') return

	// Sync TEXT → STAGES before switching
	syncTextToStages()
	editorMode.value = 'stages'

	if (autoPreview.value && stages.value.length > 0) {
		updateAllPreviews()
	}
}

function switchToTextMode() {
	if (editorMode.value === 'text') return

	// Sync STAGES → TEXT before switching
	syncStagesToText()
	editorMode.value = 'text'

	// Run preview in text mode
	runTextModePreview()
}

// Bidirectional sync functions
function syncStagesToText() {
	try {
		const pipeline = stages.value
			.filter(s => s.enabled && s.operator)
			.map(s => {
				const stageObj = parseStageCode(s.operator, s.code)
				return stageObj
			})
			.filter(s => s !== null)

		textModeContent.value = JSON.stringify(pipeline, null, 2)
		textModeError.value = ''
	} catch (err) {
		textModeError.value = 'Failed to convert stages: ' + err.message
	}
}

function syncTextToStages() {
	try {
		const cleanCode = textModeContent.value.replace(/\/\*[\s\S]*?\*\//g, '').trim()
		if (!cleanCode || cleanCode === '[]') {
			stages.value = []
			textModeError.value = ''
			return
		}

		const pipeline = Function('"use strict"; return (' + cleanCode + ')')()

		if (!Array.isArray(pipeline)) {
			textModeError.value = 'Pipeline must be an array'
			return
		}

		stages.value = pipeline.map(stageObj => {
			const operator = Object.keys(stageObj)[0]
			const value = stageObj[operator]

			return {
				id: generateStageId(),
				operator: operator,
				code: typeof value === 'string' ? `"${value}"` : JSON.stringify(value, null, 2),
				enabled: true,
				collapsed: false,
				previewDocs: [],
				previewCount: null,
				previewLoading: false,
				previewError: null,
				error: null
			}
		})

		textModeError.value = ''
	} catch (err) {
		textModeError.value = 'Invalid JSON: ' + err.message
	}
}

// TEXT mode change handler
let textModeDebounceTimer = null

function onTextModeChange() {
	if (textModeDebounceTimer) {
		clearTimeout(textModeDebounceTimer)
	}
	textModeDebounceTimer = setTimeout(() => {
		validateTextMode()
		if (!textModeError.value && autoPreview.value) {
			runTextModePreview()
		}
	}, 500)
}

function validateTextMode() {
	try {
		const cleanCode = textModeContent.value.replace(/\/\*[\s\S]*?\*\//g, '').trim()
		if (!cleanCode || cleanCode === '[]') {
			textModeError.value = ''
			return true
		}

		const pipeline = Function('"use strict"; return (' + cleanCode + ')')()

		if (!Array.isArray(pipeline)) {
			textModeError.value = 'Pipeline must be an array'
			return false
		}

		// Validate each stage
		for (let i = 0; i < pipeline.length; i++) {
			const stage = pipeline[i]
			if (typeof stage !== 'object' || stage === null) {
				textModeError.value = `Stage ${i + 1}: Must be an object`
				return false
			}
			const keys = Object.keys(stage)
			if (keys.length === 0) {
				textModeError.value = `Stage ${i + 1}: Empty stage`
				return false
			}
			const operator = keys[0]
			if (!operator.startsWith('$')) {
				textModeError.value = `Stage ${i + 1}: Invalid operator "${operator}" (must start with $)`
				return false
			}
		}

		textModeError.value = ''
		return true
	} catch (err) {
		textModeError.value = 'Invalid syntax: ' + err.message
		return false
	}
}

async function runTextModePreview() {
	if (!validateTextMode()) {
		textModePreviewDocs.value = []
		return
	}

	textModePreviewLoading.value = true

	try {
		const cleanCode = textModeContent.value.replace(/\/\*[\s\S]*?\*\//g, '').trim()
		if (!cleanCode || cleanCode === '[]') {
			textModePreviewDocs.value = []
			textModePreviewLoading.value = false
			return
		}

		const pipeline = Function('"use strict"; return (' + cleanCode + ')')()

		const response = await api.aggregations.run(props.connectionId, props.database, props.collection, pipeline, {page: 1, pageSize: 10})

		textModePreviewDocs.value = response.results || []
	} catch (err) {
		textModeError.value = err.message
		textModePreviewDocs.value = []
	} finally {
		textModePreviewLoading.value = false
	}
}

// Export to Language functions
function openExportModal() {
	const pipeline = buildFullPipeline()
	if (!pipeline || pipeline.length === 0) {
		dialog.warning('No valid pipeline to export')
		return
	}

	showExportModal.value = true
	updateExportCode()
}

function selectExportLanguage(langId) {
	selectedExportLanguage.value = langId
	updateExportCode()
}

function updateExportCode() {
	const pipeline = buildFullPipeline()
	if (!pipeline) {
		exportCode.value = '// Invalid pipeline'
		return
	}

	exportCode.value = generateExportCode(selectedExportLanguage.value, pipeline, props.collection)
}

async function copyExportCode() {
	try {
		await navigator.clipboard.writeText(exportCode.value)
		dialog.success(t('copied'))
	} catch (err) {
		dialog.error(err.message)
	}
}

// Close pipelines dropdown when clicking outside
function handlePipelinesDropdownClickOutside(event) {
	if (showPipelinesDropdown.value) {
		const container = event.target.closest('.pipelines-dropdown-container')
		if (!container) {
			showPipelinesDropdown.value = false
		}
	}
}

// Watch for collection changes
watch(
	() => props.collection,
	() => {
		stages.value = []
		finalResults.value = null
		explainData.value = null
		fetchCollectionPreview()
	}
)

// Watch for explain modal open
watch(showExplainModal, val => {
	if (val && !explainData.value) {
		runExplain()
	}
})

// Close menu when clicking outside
function handleClickOutside(event) {
	if (openMenuIndex.value !== null) {
		const menuContainer = event.target.closest('.stage-menu-container')
		if (!menuContainer) {
			closeStageMenu()
		}
	}
	// Close expand dropdown when clicking outside
	if (showExpandDropdown.value) {
		const expandDropdown = event.target.closest('.expand-dropdown')
		if (!expandDropdown) {
			showExpandDropdown.value = false
		}
	}
}

// Initialize
onMounted(() => {
	fetchCollectionPreview()
	document.addEventListener('click', handleClickOutside)
	document.addEventListener('click', handlePipelinesDropdownClickOutside)
})

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside)
	document.removeEventListener('click', handlePipelinesDropdownClickOutside)
})
</script>

<style scoped>
.aggregation-editor {
	display: flex;
	flex-direction: column;
	gap: 15px;
	padding: 15px;
	background: #f5f5f5;
	min-height: 100%;
	height: 100%;
}

.aggregation-editor.results-mode {
	gap: 0;
	padding: 0;
}

/* Toolbar */
.toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 15px;
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 4px;
	flex-shrink: 0;
}

.results-mode .toolbar {
	border-radius: 0;
	border-left: none;
	border-right: none;
	border-top: none;
}

.results-info {
	font-size: 14px;
	font-weight: 500;
	color: #666;
}

.dark .results-info {
	color: #aaa;
}

.edit-icon {
	font-size: 12px;
}

.toolbar-left {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.doc-count {
	font-size: 13px;
	color: #666;
}

.toolbar-right {
	display: flex;
	align-items: center;
	gap: 10px;
}

.preview-toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	font-size: 13px;
}

.preview-toggle input {
	width: 16px;
	height: 16px;
}

.toggle-label {
	color: #333;
}

/* Collection Preview */
.collection-preview {
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 4px;
	padding: 15px;
}

.preview-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
}

.preview-title {
	font-size: 13px;
	font-weight: 600;
	color: #333;
}

.preview-docs-row {
	display: flex;
	gap: 15px;
	overflow-x: auto;
}

.preview-doc {
	flex: 1;
	min-width: 350px;
	max-width: 350px;
	border: 1px solid #e0e0e0;
	border-radius: 4px;
	background: #fafafa;
	overflow: hidden;
}

/* Add Stage Buttons */
.add-stage-top,
.add-stage-bottom {
	display: flex;
	justify-content: center;
	padding: 20px;
}

.btn-add-stage {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px 24px;
	background: #0e639c;
	color: #fff;
	border: none;
	border-radius: 4px;
	font-size: 14px;
	cursor: pointer;
	transition: background 0.2s;
}

.btn-add-stage:hover {
	background: #1177bb;
}

.plus-icon {
	font-size: 18px;
	font-weight: bold;
}

.add-stage-between {
	display: flex;
	justify-content: center;
	padding: 5px 0;
}

.btn-add-stage-small {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: #e0e0e0;
	border: none;
	cursor: pointer;
	font-size: 16px;
	color: #666;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
}

.btn-add-stage-small:hover {
	background: #0e639c;
	color: #fff;
}

/* Stage Card */
.stages-container {
	display: flex;
	flex-direction: column;
}

.stage-wrapper {
	display: flex;
	flex-direction: column;
}

.stage-card {
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 4px;
	overflow: hidden;
}

.stage-card.disabled {
	opacity: 0.6;
}

.stage-header {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 15px;
	background: #f8f8f8;
	border-bottom: 1px solid #e0e0e0;
}

.collapse-btn {
	background: none;
	border: none;
	cursor: pointer;
	font-size: 12px;
	color: #666;
	padding: 0;
	width: 20px;
}

.stage-number {
	font-size: 13px;
	font-weight: 600;
	color: #333;
	min-width: 60px;
}

.stage-select {
	padding: 6px 10px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 13px;
	min-width: 140px;
	background: #fff;
}

.stage-toggle {
	position: relative;
	display: inline-block;
	width: 36px;
	height: 20px;
	margin-left: 10px;
}

.stage-toggle input {
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
	border-radius: 20px;
}

.toggle-slider:before {
	position: absolute;
	content: '';
	height: 14px;
	width: 14px;
	left: 3px;
	bottom: 3px;
	background-color: white;
	transition: 0.3s;
	border-radius: 50%;
}

.stage-toggle input:checked + .toggle-slider {
	background-color: #0e639c;
}

.stage-toggle input:checked + .toggle-slider:before {
	transform: translateX(16px);
}

.stage-actions {
	display: flex;
	gap: 5px;
	margin-left: auto;
	align-items: center;
}

.stage-actions .btn-icon {
	padding: 6px 8px;
	background: none;
	border: 1px solid transparent;
	cursor: pointer;
	border-radius: 4px;
	font-size: 14px;
	color: #666;
	display: flex;
	align-items: center;
	justify-content: center;
}

.stage-actions .btn-icon:hover {
	background: #e8e8e8;
	border-color: #ddd;
}

.stage-actions .btn-icon.danger:hover {
	background: #fee;
	color: #c00;
}

.stage-actions .btn-icon:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

.stage-actions .focus-btn {
	color: #888;
}

.stage-actions .focus-btn:hover {
	color: #0e639c;
	background: #e0f0ff;
	border-color: #0e639c;
}

/* Stage Menu Container */
.stage-menu-container {
	position: relative;
}

.stage-dropdown-menu {
	position: absolute;
	top: 100%;
	right: 0;
	margin-top: 4px;
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 8px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	min-width: 180px;
	z-index: 100;
	overflow: hidden;
}

.stage-dropdown-menu button {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 10px 15px;
	background: none;
	border: none;
	text-align: left;
	cursor: pointer;
	font-size: 13px;
	color: #333;
}

.stage-dropdown-menu button:hover {
	background: #f0f0f0;
}

.stage-dropdown-menu button:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.stage-dropdown-menu button.danger {
	color: #c00;
}

.stage-dropdown-menu button.danger:hover {
	background: #fee;
}

.stage-dropdown-menu .menu-icon {
	width: 16px;
	text-align: center;
}

.stage-dropdown-menu .menu-divider {
	height: 1px;
	background: #e0e0e0;
	margin: 5px 0;
}

/* Stage Body */
.stage-body {
	padding: 0;
}

.stage-editor-container {
	display: flex;
	gap: 0;
}

.stage-code {
	flex: 1;
	border-right: 1px solid #e0e0e0;
}

.stage-warning {
	padding: 8px 15px;
	background: #fff3cd;
	color: #856404;
	font-size: 12px;
	border-top: 1px solid #ffc107;
}

.stage-error {
	padding: 8px 15px;
	background: #fee;
	color: #c00;
	font-size: 12px;
	border-top: 1px solid #fcc;
}

/* Stage Preview */
.stage-preview {
	flex: 2;
	display: flex;
	flex-direction: column;
	background: transparent;
	min-width: 400px;
}

.stage-preview .preview-header {
	padding: 10px 15px;
	background: #333;
	border-bottom: 1px solid #444;
	margin-bottom: 0;
	font-size: 12px;
	color: #ccc;
}

.operator-link {
	color: #4ec9b0;
	text-decoration: none;
}

.operator-link:hover {
	text-decoration: underline;
}

.preview-count {
	color: #888;
	margin-left: 5px;
}

.preview-content {
	flex: 1;
	padding: 10px;
	overflow-x: auto;
	overflow-y: hidden;
	max-height: 300px;
}

.preview-docs-row {
	display: flex;
	flex-direction: row;
	gap: 10px;
	padding-bottom: 10px;
}

.preview-doc {
	flex: 0 0 auto;
	width: 280px;
	border-radius: 4px;
	overflow: hidden;
	border: 1px solid #333;
}

.preview-doc:hover {
	border-color: #555;
}

.preview-content.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	color: #888;
}

.preview-error {
	color: #f48771;
	font-size: 12px;
}

.loading-spinner {
	color: #888;
	text-align: center;
	padding: 20px;
}

/* Results Section */
.results-section {
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 4px;
	padding: 15px;
}

.results-section.results-fullpage {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	border: none;
	border-radius: 0;
	padding: 0;
	margin: 0;
}

.results-fullpage .json-results,
.results-fullpage .table-results {
	flex: 1;
	overflow: auto;
	min-height: 0;
}

.results-fullpage-header {
	padding: 10px 15px;
	background: #f8f9fa;
	border-bottom: 1px solid #ddd;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 15px;
}

.results-pagination-info {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	color: #666;
}

.results-pagination-info .showing-info {
	font-weight: 500;
	color: #333;
}

.results-pagination-info .per-page-info {
	color: #888;
	font-size: 12px;
}

.results-pagination-controls {
	display: flex;
	align-items: center;
	gap: 5px;
}

.results-pagination-controls .page-info {
	font-size: 13px;
	color: #333;
	padding: 0 8px;
	font-weight: 500;
}

.results-pagination-controls .btn {
	min-width: 28px;
	padding: 4px 8px;
}

.results-header {
	display: flex;
	align-items: center;
	gap: 15px;
	margin-bottom: 15px;
}

.results-header h3 {
	margin: 0;
	font-size: 14px;
}

.result-count {
	color: #666;
	font-size: 13px;
}

.view-toggle {
	margin-left: auto;
	display: flex;
	gap: 5px;
	align-items: center;
}

/* Expand/Collapse Dropdown */
.expand-dropdown {
	position: relative;
	margin-left: 5px;
}

.expand-dropdown-btn {
	padding: 4px 8px !important;
	min-width: 28px;
	font-weight: bold;
}

.expand-dropdown-menu {
	position: absolute;
	top: 100%;
	right: 0;
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 6px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	padding: 6px 0;
	min-width: 180px;
	margin-top: 4px;
}

.expand-dropdown-menu a {
	display: block;
	padding: 8px 14px;
	color: #333;
	text-decoration: none;
	font-size: 13px;
}

.expand-dropdown-menu a:hover {
	background: #f5f5f5;
}

.results-content {
	max-height: 500px;
	overflow: auto;
}

.json-results .result-doc {
	margin-bottom: 10px;
	padding: 10px;
	background: #f8f8f8;
	border: 1px solid #e0e0e0;
	border-radius: 4px;
}

.table-results {
	overflow-x: auto;
}

.table-results table {
	width: 100%;
	border-collapse: collapse;
	font-size: 12px;
}

.table-results th,
.table-results td {
	padding: 8px 12px;
	text-align: left;
	border: 1px solid #e0e0e0;
}

.table-results th {
	background: #f5f5f5;
	font-weight: 600;
}

.table-results td code {
	font-size: 11px;
	color: #666;
}

.results-pagination {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 15px;
	margin-top: 15px;
	padding-top: 15px;
	border-top: 1px solid #e0e0e0;
}

.page-info {
	font-size: 13px;
	color: #666;
}

/* Explain Modal */
.explain-modal {
	background: #1e1e1e;
	color: #e0e0e0;
	border-radius: 8px;
	width: 90%;
	max-width: 1000px;
	max-height: 90vh;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.explain-modal .modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px;
	border-bottom: 1px solid #333;
}

.explain-modal h2 {
	margin: 0;
	font-size: 20px;
}

.explain-desc {
	padding: 0 20px;
	color: #888;
	font-size: 13px;
	margin: 10px 0;
}

.explain-tabs {
	display: flex;
	gap: 10px;
	padding: 0 20px 15px;
}

.tab-btn {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 16px;
	background: #2d2d2d;
	border: 1px solid #444;
	border-radius: 4px;
	color: #ccc;
	cursor: pointer;
	font-size: 13px;
}

.tab-btn.active {
	background: #0e639c;
	border-color: #0e639c;
	color: #fff;
}

.tab-btn:hover:not(.active) {
	background: #3c3c3c;
}

.tab-icon {
	font-size: 14px;
}

.explain-content {
	flex: 1;
	overflow: auto;
	padding: 20px;
}

.explain-visual {
	display: flex;
	gap: 30px;
}

.explain-tree {
	flex: 1;
}

.tree-stages {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.tree-stage {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.stage-node {
	background: #2d2d2d;
	border: 1px solid #444;
	border-radius: 8px;
	padding: 15px 20px;
	min-width: 250px;
}

.stage-node .stage-name {
	font-weight: 600;
	font-size: 14px;
	color: #fff;
	display: block;
	margin-bottom: 8px;
}

.stage-metrics {
	display: flex;
	gap: 20px;
	font-size: 12px;
	color: #888;
}

.stage-metrics .metric strong {
	color: #4ec9b0;
}

.stage-details {
	margin-top: 8px;
	font-size: 12px;
	color: #888;
}

.tree-connector {
	width: 2px;
	height: 30px;
	background: #444;
}

.explain-summary {
	min-width: 280px;
	background: #2d2d2d;
	border-radius: 8px;
	padding: 20px;
}

.explain-summary h4 {
	margin: 0 0 15px;
	font-size: 14px;
	color: #fff;
}

.explain-summary ul {
	list-style: none;
	padding: 0;
	margin: 0;
}

.explain-summary li {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 0;
	font-size: 13px;
	color: #ccc;
}

.explain-summary .icon {
	font-size: 14px;
}

.indexes-used {
	margin-top: 15px;
	padding-top: 15px;
	border-top: 1px solid #444;
}

.indexes-used span:first-child {
	display: block;
	font-size: 12px;
	color: #888;
	margin-bottom: 8px;
}

.index-tag {
	display: inline-block;
	padding: 4px 10px;
	background: #0e639c;
	border-radius: 4px;
	font-size: 12px;
	margin-right: 5px;
	margin-bottom: 5px;
}

.explain-raw {
	background: #252526;
	border-radius: 4px;
	padding: 15px;
	overflow: auto;
	max-height: 500px;
}

.explain-raw pre {
	margin: 0;
	font-family: 'Consolas', 'Monaco', monospace;
	font-size: 12px;
	color: #d4d4d4;
	white-space: pre-wrap;
}

/* Modals */
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

.modal-content {
	background: #fff;
	border-radius: 8px;
	padding: 20px;
	width: 90%;
	max-width: 500px;
	max-height: 80vh;
	overflow-y: auto;
}

.modal-content h3 {
	margin: 0 0 20px;
}

.form-group {
	margin-bottom: 15px;
}

.form-group label {
	display: block;
	margin-bottom: 5px;
	font-weight: 500;
	font-size: 13px;
}

.form-group input,
.form-group textarea {
	width: 100%;
	padding: 8px 12px;
	border: 1px solid #ddd;
	border-radius: 4px;
	font-size: 13px;
}

.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	margin-top: 20px;
}

.close-btn {
	background: none;
	border: none;
	font-size: 24px;
	cursor: pointer;
	color: #888;
}

.close-btn:hover {
	color: #fff;
}

/* Pipeline list */
.pipeline-list {
	list-style: none;
	padding: 0;
	margin: 0 0 15px;
	max-height: 300px;
	overflow-y: auto;
}

.pipeline-list li {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px;
	border: 1px solid #e0e0e0;
	border-radius: 4px;
	margin-bottom: 8px;
}

.pipeline-info {
	flex: 1;
	cursor: pointer;
}

.pipeline-info:hover {
	color: #0e639c;
}

.pipeline-name {
	font-weight: 500;
	display: block;
}

.pipeline-desc {
	font-size: 12px;
	color: #888;
}

/* Buttons */
.btn {
	padding: 8px 16px;
	border: 1px solid #ddd;
	border-radius: 4px;
	font-size: 13px;
	cursor: pointer;
	background: #fff;
}

.btn-sm {
	padding: 6px 12px;
	font-size: 12px;
}

.btn-primary {
	background: #0e639c;
	border-color: #0e639c;
	color: #fff;
}

.btn-primary:hover {
	background: #1177bb;
}

.btn-primary:disabled {
	background: #666;
	border-color: #666;
	cursor: not-allowed;
}

.btn-secondary {
	background: #f5f5f5;
	border-color: #ddd;
	color: #333;
}

.btn-secondary:hover {
	background: #e8e8e8;
}

.btn-icon {
	background: none;
	border: none;
	padding: 5px;
	cursor: pointer;
	color: #666;
	font-size: 14px;
}

.btn-icon:hover {
	color: #333;
}

.btn-icon.danger:hover {
	color: #c00;
}

.loading,
.empty-state {
	padding: 30px;
	text-align: center;
	color: #888;
}

.error-message {
	color: #f48771;
	padding: 15px;
	background: rgba(244, 135, 113, 0.1);
	border-radius: 4px;
}

/* Focus Mode Modal */
.focus-mode-overlay {
	background: rgba(0, 0, 0, 0.5);
}

.focus-mode-modal {
	width: 95vw;
	height: 90vh;
	max-width: none;
	background: #fff;
	border-radius: 8px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.focus-modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 20px;
	background: #f5f5f5;
	border-bottom: 1px solid #ddd;
}

.focus-header-left {
	display: flex;
	align-items: center;
	gap: 10px;
}

.focus-nav-btn {
	background: #e0e0e0;
	border: none;
	color: #333;
	width: 28px;
	height: 28px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.focus-nav-btn:hover:not(:disabled) {
	background: #d0d0d0;
}

.focus-nav-btn:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

.focus-stage-title {
	font-size: 14px;
	font-weight: 600;
	color: #333;
}

.focus-header-center {
	display: flex;
	align-items: center;
	gap: 10px;
}

.focus-header-center .stage-toggle {
	display: flex;
	align-items: center;
	width: auto;
	height: auto;
	gap: 8px;
}

.focus-header-center .toggle-text {
	font-size: 11px;
	font-weight: 600;
	color: #888;
	white-space: nowrap;
}

.focus-header-center .toggle-slider {
	position: relative;
	width: 36px;
	height: 20px;
	flex-shrink: 0;
}

.focus-header-right {
	display: flex;
	align-items: center;
	gap: 15px;
}

.focus-header-right .close-btn {
	background: none;
	border: none;
	color: #888;
	font-size: 24px;
	cursor: pointer;
	padding: 0;
	line-height: 1;
}

.focus-header-right .close-btn:hover {
	color: #333;
}

.focus-modal-body {
	display: flex;
	flex: 1;
	overflow: hidden;
}

.focus-panel {
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.focus-input-panel,
.focus-output-panel {
	flex: 1;
	min-width: 0;
	background: #fafafa;
}

.focus-editor-panel {
	flex: 1.2;
	min-width: 0;
	border-left: 1px solid #ddd;
	border-right: 1px solid #ddd;
}

.focus-panel-header {
	padding: 10px 15px;
	background: #f0f0f0;
	border-bottom: 1px solid #ddd;
}

.focus-panel-header .panel-title {
	font-size: 11px;
	font-weight: 600;
	color: #666;
	letter-spacing: 0.5px;
}

.focus-panel-header .panel-subtitle {
	font-size: 11px;
	color: #888;
	margin-left: 8px;
}

.focus-editor-toolbar {
	display: flex;
	align-items: center;
	gap: 15px;
}

.focus-stage-select {
	padding: 6px 12px;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 4px;
	color: #333;
	font-size: 13px;
	min-width: 160px;
}

.docs-link {
	color: #0e639c;
	text-decoration: none;
	font-size: 12px;
}

.docs-link:hover {
	text-decoration: underline;
}

.external-icon {
	font-size: 10px;
}

.focus-panel-content {
	flex: 1;
	overflow: auto;
	padding: 10px;
}

.focus-code-content {
	display: flex;
	flex-direction: column;
	padding: 0;
}

.focus-code-content .json-editor {
	flex: 1;
	border-radius: 0;
	border: none;
}

.focus-error {
	padding: 10px 15px;
	background: rgba(255, 0, 0, 0.1);
	color: #c00;
	font-size: 12px;
	border-top: 1px solid rgba(255, 0, 0, 0.2);
}

.focus-doc {
	margin-bottom: 10px;
	padding: 10px;
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 4px;
}

.empty-docs {
	color: #888;
	text-align: center;
	padding: 30px;
}

.focus-output-error {
	color: #c00;
	padding: 10px;
	font-size: 12px;
}

/* ========== NEW STYLES FOR ENHANCED FEATURES ========== */

/* Toolbar Divider */
.toolbar-divider {
	width: 1px;
	height: 24px;
	background: #ddd;
	margin: 0 10px;
}

/* Pipelines Dropdown */
.pipelines-dropdown-container {
	position: relative;
}

.pipelines-btn {
	display: flex;
	align-items: center;
	gap: 5px;
	padding: 6px 10px;
}

.folder-icon {
	font-size: 14px;
}

.dropdown-arrow {
	font-size: 10px;
	color: #666;
}

.pipelines-dropdown {
	position: absolute;
	top: 100%;
	left: 0;
	margin-top: 4px;
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 8px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	min-width: 250px;
	z-index: 100;
	overflow: hidden;
}

.pipelines-dropdown-header {
	padding: 10px 15px;
	font-weight: 600;
	font-size: 12px;
	color: #666;
	background: #f5f5f5;
	border-bottom: 1px solid #e0e0e0;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.pipelines-loading,
.pipelines-empty {
	padding: 20px 15px;
	text-align: center;
	color: #888;
	font-size: 13px;
}

.pipelines-list {
	max-height: 300px;
	overflow-y: auto;
}

.pipeline-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 15px;
	cursor: pointer;
	border-bottom: 1px solid #f0f0f0;
}

.pipeline-item:last-child {
	border-bottom: none;
}

.pipeline-item:hover {
	background: #f5f5f5;
}

.pipeline-item-name {
	font-size: 13px;
	color: #333;
}

.pipeline-delete-btn {
	background: none;
	border: none;
	color: #999;
	font-size: 18px;
	cursor: pointer;
	padding: 0 5px;
	line-height: 1;
}

.pipeline-delete-btn:hover {
	color: #c00;
}

/* Stage Badges */
.stage-badges {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;
}

.stage-badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 10px;
	background: #e3f2fd;
	color: #1565c0;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
}

.stage-badge:hover {
	background: #bbdefb;
}

.stage-badge.disabled {
	background: #f5f5f5;
	color: #999;
}

.stage-badge.has-error {
	background: #ffebee;
	color: #c62828;
}

.stage-badge .error-indicator {
	color: #c62828;
	font-weight: bold;
}

.badge-arrow {
	color: #999;
	font-size: 14px;
}

/* Mode Toggle */
.mode-toggle {
	display: flex;
	border: 1px solid #ddd;
	border-radius: 4px;
	overflow: hidden;
}

.mode-btn {
	padding: 6px 14px;
	background: #fff;
	border: none;
	font-size: 11px;
	font-weight: 600;
	color: #666;
	cursor: pointer;
	transition: all 0.2s;
	letter-spacing: 0.5px;
}

.mode-btn:first-child {
	border-right: 1px solid #ddd;
}

.mode-btn:hover {
	background: #f5f5f5;
}

.mode-btn.active {
	background: #0e639c;
	color: #fff;
}

/* TEXT Mode Container */
.text-mode-container {
	display: flex;
	gap: 0;
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 4px;
	overflow: hidden;
	min-height: 500px;
}

.text-mode-editor {
	flex: 1;
	display: flex;
	flex-direction: column;
	border-right: 1px solid #ddd;
}

.text-mode-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 15px;
	background: #f5f5f5;
	border-bottom: 1px solid #e0e0e0;
}

.text-mode-title {
	font-size: 13px;
	font-weight: 600;
	color: #333;
}

.text-mode-hint {
	font-size: 11px;
	color: #888;
}

.text-mode-error-banner {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 15px;
	background: #ffebee;
	border-top: 1px solid #ffcdd2;
}

.text-mode-error-banner .error-icon {
	color: #c62828;
	font-weight: bold;
	font-size: 16px;
}

.text-mode-error-banner .error-text {
	color: #c62828;
	font-size: 13px;
}

.text-mode-preview {
	flex: 1;
	display: flex;
	flex-direction: column;
	background: #1e1e1e;
}

.text-mode-preview-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 15px;
	background: #333;
	color: #ccc;
	font-size: 12px;
}

.text-mode-preview-content {
	flex: 1;
	padding: 15px;
	overflow: auto;
	max-height: 400px;
}

.text-mode-preview-content.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	color: #888;
}

.preview-docs-vertical {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.preview-docs-vertical .preview-doc {
	border: 1px solid #3c3c3c;
	border-radius: 4px;
	overflow: hidden;
	width: 100%;
	min-width: 100%;
	max-width: 100%;
}

/* Export Modal */
.export-modal {
	background: #1e1e1e;
	color: #e0e0e0;
	border-radius: 8px;
	width: 90%;
	max-width: 900px;
	max-height: 90vh;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.export-modal .modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px;
	border-bottom: 1px solid #333;
}

.export-modal h2 {
	margin: 0;
	font-size: 18px;
}

.export-languages {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	padding: 20px;
	background: #252526;
	border-bottom: 1px solid #333;
}

.lang-btn {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 16px;
	background: #2d2d2d;
	border: 1px solid #3c3c3c;
	border-radius: 6px;
	color: #ccc;
	cursor: pointer;
	font-size: 13px;
	transition: all 0.2s;
}

.lang-btn:hover {
	background: #3c3c3c;
	border-color: #555;
}

.lang-btn.active {
	background: #0e639c;
	border-color: #0e639c;
	color: #fff;
}

.lang-icon {
	font-size: 16px;
}

.lang-name {
	font-weight: 500;
}

.export-code-container {
	flex: 1;
	overflow: auto;
	padding: 20px;
	max-height: 400px;
}

.export-code {
	margin: 0;
	padding: 15px;
	background: #252526;
	border-radius: 4px;
	font-family: 'Fira Code', 'Consolas', monospace;
	font-size: 12px;
	color: #d4d4d4;
	white-space: pre-wrap;
	word-wrap: break-word;
	line-height: 1.5;
}

.export-modal .modal-actions {
	padding: 15px 20px;
	border-top: 1px solid #333;
	background: #252526;
}
</style>

<style>
/* Dark Mode - Aggregation Editor */
.dark .aggregation-editor {
	background: #1e1e1e;
}

.dark .toolbar {
	background: #252526;
	border-color: #3c3c3c;
}

.dark .doc-count {
	color: #888;
}

.dark .toggle-label {
	color: #ccc;
}

.dark .collection-preview {
	background: #252526;
	border-color: #3c3c3c;
}

.dark .preview-title {
	color: #ccc;
}

.dark .preview-doc {
	background: #1e1e1e;
	border-color: #3c3c3c;
}

.dark .stage-card {
	background: #252526;
	border-color: #3c3c3c;
}

.dark .stage-header {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

.dark .stage-number {
	color: #ccc;
}

.dark .stage-select {
	background: #1e1e1e;
	border-color: #3c3c3c;
	color: #ccc;
}

.dark .stage-actions .btn-icon {
	color: #888;
}

.dark .stage-actions .btn-icon:hover {
	background: #3c3c3c;
	border-color: #555;
}

.dark .stage-code {
	border-color: #3c3c3c;
}

.dark .stage-warning {
	background: #3d3a1a;
	color: #f0c674;
	border-color: #6d5e1a;
}

.dark .results-section {
	background: #252526;
	border-color: #3c3c3c;
}

.dark .results-fullpage-header {
	background: #1e1e1e;
	border-color: #3c3c3c;
}

.dark .results-pagination-info .showing-info {
	color: #ccc;
}

.dark .results-pagination-info .per-page-info {
	color: #888;
}

.dark .results-pagination-controls .page-info {
	color: #ccc;
}

.dark .expand-dropdown-menu {
	background: #252526;
	border-color: #3c3c3c;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.dark .expand-dropdown-menu a {
	color: #cfcfcf;
}

.dark .expand-dropdown-menu a:hover {
	background: #333;
}

.dark .results-header h3 {
	color: #ccc;
}

.dark .result-count {
	color: #888;
}

.dark .json-results .result-doc {
	background: #1e1e1e;
	border-color: #3c3c3c;
}

.dark .table-results th {
	background: #2d2d2d;
	color: #ccc;
}

.dark .table-results td {
	background: #1e1e1e;
	border-color: #3c3c3c;
}

.dark .table-results td code {
	color: #888;
}

.dark .results-pagination {
	border-color: #3c3c3c;
}

.dark .btn-add-stage-small {
	background: #3c3c3c;
	color: #ccc;
}

.dark .btn-add-stage-small:hover {
	background: #0e639c;
	color: #fff;
}

.dark .modal-content {
	background: #252526;
	color: #ccc;
}

.dark .modal-content h3 {
	color: #fff;
}

.dark .form-group label {
	color: #ccc;
}

.dark .form-group input,
.dark .form-group textarea {
	background: #1e1e1e;
	border-color: #3c3c3c;
	color: #ccc;
}

.dark .pipeline-list li {
	border-color: #3c3c3c;
}

.dark .pipeline-info:hover {
	color: #4ec9b0;
}

.dark .pipeline-desc {
	color: #888;
}

.dark .btn-secondary {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #ccc;
}

.dark .btn-secondary:hover {
	background: #3c3c3c;
}

.dark .btn {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #ccc;
}

.dark .loading,
.dark .empty-state {
	color: #666;
}

.dark .collapse-btn {
	color: #888;
}

.dark .page-info {
	color: #888;
}

/* Dark mode - Dropdown Menu */
.dark .stage-dropdown-menu {
	background: #252526;
	border-color: #3c3c3c;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.dark .stage-dropdown-menu button {
	color: #ccc;
}

.dark .stage-dropdown-menu button:hover {
	background: #3c3c3c;
}

.dark .stage-dropdown-menu button.danger {
	color: #f48771;
}

.dark .stage-dropdown-menu button.danger:hover {
	background: rgba(244, 135, 113, 0.15);
}

.dark .stage-dropdown-menu .menu-divider {
	background: #3c3c3c;
}

.dark .stage-actions .btn-icon {
	color: #888;
}

.dark .stage-actions .btn-icon:hover {
	background: #3c3c3c;
	border-color: #555;
}

.dark .stage-actions .focus-btn:hover {
	color: #4ec9b0;
	background: rgba(78, 201, 176, 0.1);
	border-color: #4ec9b0;
}

/* Dark Mode - Focus Mode Modal */
.dark .focus-mode-overlay {
	background: rgba(0, 0, 0, 0.85);
}

.dark .focus-mode-modal {
	background: #1e1e1e;
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.dark .focus-modal-header {
	background: #252526;
	border-color: #3c3c3c;
}

.dark .focus-nav-btn {
	background: #3c3c3c;
	color: #ccc;
}

.dark .focus-nav-btn:hover:not(:disabled) {
	background: #4a4a4a;
}

.dark .focus-stage-title {
	color: #fff;
}

.dark .focus-header-right .close-btn:hover {
	color: #fff;
}

.dark .focus-input-panel,
.dark .focus-output-panel {
	background: #252526;
}

.dark .focus-editor-panel {
	border-color: #3c3c3c;
}

.dark .focus-panel-header {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

.dark .focus-panel-header .panel-title {
	color: #888;
}

.dark .focus-panel-header .panel-subtitle {
	color: #666;
}

.dark .focus-stage-select {
	background: #1e1e1e;
	border-color: #3c3c3c;
	color: #ccc;
}

.dark .docs-link {
	color: #4ec9b0;
}

.dark .focus-error {
	color: #f48771;
}

.dark .focus-doc {
	background: #1e1e1e;
	border-color: #3c3c3c;
}

.dark .focus-output-error {
	color: #f48771;
}

/* Dark Mode - New Features */
.dark .toolbar-divider {
	background: #3c3c3c;
}

.dark .pipelines-dropdown {
	background: #252526;
	border-color: #3c3c3c;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.dark .pipelines-dropdown-header {
	background: #2d2d2d;
	border-color: #3c3c3c;
	color: #888;
}

.dark .pipelines-loading,
.dark .pipelines-empty {
	color: #666;
}

.dark .pipeline-item {
	border-color: #3c3c3c;
}

.dark .pipeline-item:hover {
	background: #3c3c3c;
}

.dark .pipeline-item-name {
	color: #ccc;
}

.dark .pipeline-delete-btn {
	color: #666;
}

.dark .pipeline-delete-btn:hover {
	color: #f48771;
}

.dark .stage-badge {
	background: #0e639c30;
	color: #4ec9b0;
}

.dark .stage-badge:hover {
	background: #0e639c50;
}

.dark .stage-badge.disabled {
	background: #3c3c3c;
	color: #666;
}

.dark .stage-badge.has-error {
	background: rgba(244, 135, 113, 0.2);
	color: #f48771;
}

.dark .stage-badge .error-indicator {
	color: #f48771;
}

.dark .badge-arrow {
	color: #666;
}

.dark .mode-toggle {
	border-color: #3c3c3c;
}

.dark .mode-btn {
	background: #2d2d2d;
	color: #888;
}

.dark .mode-btn:first-child {
	border-color: #3c3c3c;
}

.dark .mode-btn:hover {
	background: #3c3c3c;
}

.dark .mode-btn.active {
	background: #0e639c;
	color: #fff;
}

.dark .text-mode-container {
	background: #252526;
	border-color: #3c3c3c;
}

.dark .text-mode-editor {
	border-color: #3c3c3c;
}

.dark .text-mode-header {
	background: #2d2d2d;
	border-color: #3c3c3c;
}

.dark .text-mode-title {
	color: #ccc;
}

.dark .text-mode-hint {
	color: #666;
}

.dark .text-mode-error-banner {
	background: rgba(244, 135, 113, 0.15);
	border-color: rgba(244, 135, 113, 0.3);
}

.dark .text-mode-error-banner .error-icon,
.dark .text-mode-error-banner .error-text {
	color: #f48771;
}

.dark .dropdown-arrow {
	color: #888;
}
</style>
