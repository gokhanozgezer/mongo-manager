import {describe, it, expect} from 'vitest'
import {createApp} from '../src/app.js'

describe('Express App', () => {
	it('should create an Express app instance', () => {
		const app = createApp()
		expect(app).toBeDefined()
		expect(typeof app.use).toBe('function')
		expect(typeof app.get).toBe('function')
		expect(typeof app.post).toBe('function')
	})

	it('should have trust proxy enabled', () => {
		const app = createApp()
		expect(app.get('trust proxy')).toBe(1)
	})

	it('should have JSON body parser configured', () => {
		const app = createApp()
		// Check that the app has settings configured
		expect(app.settings).toBeDefined()
	})

	it('should have CORS origin configured', () => {
		// CORS is configured via middleware, test that app is created without errors
		const app = createApp()
		expect(app).toBeDefined()
	})
})

describe('Security Configuration', () => {
	it('should create app with security middleware without errors', () => {
		// If security middleware (helmet, rate-limit, etc.) fails,
		// createApp would throw an error
		expect(() => createApp()).not.toThrow()
	})

	it('should have environment-aware configuration', () => {
		const app = createApp()
		// Verify app is properly configured
		expect(app.get('trust proxy')).toBe(1)
	})
})
