<template>
	<div class="pagination">
		<div class="pagination-info">
			<span class="pagination-count">
				<strong>{{ startItem }}-{{ endItem }}</strong> {{ t('of') }} <strong>{{ totalCount }}</strong>
			</span>
		</div>
		<div class="pagination-controls">
			<button class="pagination-btn" :disabled="page <= 1" @click="$emit('page-change', 1)" :title="t('firstPage')">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="11 17 6 12 11 7" />
					<polyline points="18 17 13 12 18 7" />
				</svg>
			</button>
			<button class="pagination-btn" :disabled="page <= 1" @click="$emit('page-change', page - 1)" :title="t('previousPage')">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6" />
				</svg>
			</button>
			<span class="pagination-current">
				{{ t('page') }} <strong>{{ page }}</strong> {{ t('of') }} <strong>{{ totalPages }}</strong>
			</span>
			<button class="pagination-btn" :disabled="page >= totalPages" @click="$emit('page-change', page + 1)" :title="t('nextPage')">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</button>
			<button class="pagination-btn" :disabled="page >= totalPages" @click="$emit('page-change', totalPages)" :title="t('lastPage')">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="13 17 18 12 13 7" />
					<polyline points="6 17 11 12 6 7" />
				</svg>
			</button>
		</div>
		<div class="pagination-size">
			<label>
				{{ t('perPage') }}:
				<select :value="pageSize" @change="$emit('page-size-change', +$event.target.value)">
					<option :value="10">10</option>
					<option :value="20">20</option>
					<option :value="50">50</option>
					<option :value="100">100</option>
				</select>
			</label>
		</div>
	</div>
</template>

<script setup>
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

const {t} = useI18n()

const props = defineProps({
	page: {type: Number, required: true},
	pageSize: {type: Number, required: true},
	totalCount: {type: Number, required: true},
	totalPages: {type: Number, required: true}
})

defineEmits(['page-change', 'page-size-change'])

const startItem = computed(() => {
	if (props.totalCount === 0) return 0
	return (props.page - 1) * props.pageSize + 1
})

const endItem = computed(() => {
	return Math.min(props.page * props.pageSize, props.totalCount)
})
</script>

<style scoped>
.pagination {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem 1.25rem;
	background: var(--card-bg);
	border: 1px solid var(--border-color);
	border-radius: 12px;
	flex-wrap: wrap;
}

.pagination-info {
	color: var(--text-secondary);
	font-size: 0.8125rem;
}

.pagination-count strong {
	color: var(--text-primary);
	font-weight: 600;
}

.pagination-controls {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}

.pagination-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	color: var(--text-secondary);
	cursor: pointer;
	transition: all 0.2s;
}

.pagination-btn svg {
	width: 16px;
	height: 16px;
}

.pagination-btn:hover:not(:disabled) {
	background: var(--hover-bg);
	border-color: var(--primary-color);
	color: var(--primary-color);
}

.pagination-btn:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.pagination-current {
	padding: 0 1rem;
	color: var(--text-secondary);
	font-size: 0.8125rem;
	white-space: nowrap;
}

.pagination-current strong {
	color: var(--text-primary);
	font-weight: 600;
}

.pagination-size label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--text-secondary);
	font-size: 0.8125rem;
}

.pagination-size select {
	padding: 0.375rem 0.625rem;
	border: 1px solid var(--border-color);
	border-radius: 6px;
	font-size: 0.8125rem;
	background: var(--input-bg);
	color: var(--text-primary);
	cursor: pointer;
	transition: all 0.2s;
}

.pagination-size select:hover {
	border-color: var(--primary-color);
}

.pagination-size select:focus {
	outline: none;
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
</style>
