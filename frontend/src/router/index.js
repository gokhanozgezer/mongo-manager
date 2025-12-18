import {createRouter, createWebHistory} from 'vue-router'
import {isAuthenticated} from '../api/index.js'

const routes = [
	{
		path: '/login',
		name: 'login',
		component: () => import('../views/LoginView.vue'),
		meta: {requiresAuth: false}
	},
	{
		path: '/',
		name: 'home',
		component: () => import('../views/HomeView.vue'),
		meta: {requiresAuth: true}
	},
	{
		path: '/connection/:connectionId/database/:database',
		name: 'database',
		component: () => import('../views/DatabaseView.vue'),
		props: true,
		meta: {requiresAuth: true}
	},
	{
		path: '/connection/:connectionId/database/:database/collection/:collection',
		name: 'collection',
		component: () => import('../views/CollectionView.vue'),
		props: true,
		meta: {requiresAuth: true}
	},
	{
		path: '/connection/:connectionId/database/:database/collection/:collection/aggregate',
		name: 'aggregation',
		component: () => import('../views/AggregationView.vue'),
		props: true,
		meta: {requiresAuth: true}
	}
]

const router = createRouter({
	history: createWebHistory(),
	routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
	const requiresAuth = to.meta.requiresAuth !== false

	if (requiresAuth && !isAuthenticated()) {
		next('/login')
	} else if (to.path === '/login' && isAuthenticated()) {
		next('/')
	} else {
		next()
	}
})

export default router
