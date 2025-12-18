<template>
	<div class="aggregation-view">
		<div class="view-header">
			<div class="breadcrumb">
				<router-link :to="{name: 'home'}">{{ t('server') }}</router-link>
				<span>/</span>
				<router-link :to="{name: 'database', params: {connectionId, database}}">
					{{ database }}
				</router-link>
				<span>/</span>
				<router-link :to="{name: 'collection', params: {connectionId, database, collection}}">
					{{ collection }}
				</router-link>
				<span>/</span>
				<span>{{ t('aggregate') }}</span>
			</div>
			<div class="header-row">
				<h1>{{ t('aggregationPipeline') }}</h1>
				<router-link :to="{name: 'collection', params: {connectionId, database, collection}}" class="btn btn-secondary">
					{{ t('backToDocuments') }}
				</router-link>
			</div>
		</div>

		<AggregationEditor :connection-id="connectionId" :database="database" :collection="collection" />
	</div>
</template>

<script setup>
import AggregationEditor from '../components/AggregationEditor.vue'
import {useI18n} from 'vue-i18n'

const {t} = useI18n()

defineProps({
	connectionId: {type: String, required: true},
	database: {type: String, required: true},
	collection: {type: String, required: true}
})
</script>

<style scoped>
.aggregation-view {
	padding: 1.5rem;
}

.view-header {
	margin-bottom: 1.5rem;
}

.breadcrumb {
	font-size: 0.875rem;
	color: #718096;
	margin-bottom: 0.5rem;
}

.breadcrumb a {
	color: #4299e1;
	text-decoration: none;
}

.breadcrumb a:hover {
	text-decoration: underline;
}

.breadcrumb span {
	margin: 0 0.5rem;
}

.header-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.header-row h1 {
	margin: 0;
	font-size: 1.5rem;
	color: #2d3748;
}
</style>
