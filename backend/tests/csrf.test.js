import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock the middleware by testing its logic directly
describe('CSRF Light Middleware Logic', () => {
	const allowedOrigin = 'http://localhost:5173'

	function validateOrigin(origin, referer, allowedOrigin) {
		let allowedHost
		try {
			allowedHost = new URL(allowedOrigin).host
		} catch {
			allowedHost = 'localhost'
		}

		if (origin) {
			try {
				const originHost = new URL(origin).host
				if (originHost !== allowedHost && !originHost.startsWith('localhost')) {
					return {valid: false, error: 'Invalid origin'}
				}
			} catch {
				return {valid: false, error: 'Invalid origin format'}
			}
		} else if (referer) {
			try {
				const refererHost = new URL(referer).host
				if (refererHost !== allowedHost && !refererHost.startsWith('localhost')) {
					return {valid: false, error: 'Invalid referer'}
				}
			} catch {
				return {valid: false, error: 'Invalid referer format'}
			}
		}

		return {valid: true}
	}

	describe('Origin validation', () => {
		it('should accept requests from allowed origin', () => {
			const result = validateOrigin('http://localhost:5173', null, allowedOrigin)
			expect(result.valid).toBe(true)
		})

		it('should accept requests from localhost variants', () => {
			expect(validateOrigin('http://localhost:3000', null, allowedOrigin).valid).toBe(true)
			expect(validateOrigin('http://localhost:8080', null, allowedOrigin).valid).toBe(true)
		})

		it('should reject requests from unauthorized origins', () => {
			const result = validateOrigin('http://evil.com', null, allowedOrigin)
			expect(result.valid).toBe(false)
			expect(result.error).toBe('Invalid origin')
		})

		it('should reject malformed origin URLs', () => {
			const result = validateOrigin('not-a-url', null, allowedOrigin)
			expect(result.valid).toBe(false)
			expect(result.error).toBe('Invalid origin format')
		})
	})

	describe('Referer validation (fallback)', () => {
		it('should accept requests with valid referer when no origin', () => {
			const result = validateOrigin(null, 'http://localhost:5173/page', allowedOrigin)
			expect(result.valid).toBe(true)
		})

		it('should reject requests with invalid referer', () => {
			const result = validateOrigin(null, 'http://evil.com/page', allowedOrigin)
			expect(result.valid).toBe(false)
			expect(result.error).toBe('Invalid referer')
		})

		it('should reject malformed referer URLs', () => {
			const result = validateOrigin(null, 'not-a-url', allowedOrigin)
			expect(result.valid).toBe(false)
			expect(result.error).toBe('Invalid referer format')
		})
	})

	describe('No origin or referer', () => {
		it('should allow requests without origin or referer (REST clients)', () => {
			const result = validateOrigin(null, null, allowedOrigin)
			expect(result.valid).toBe(true)
		})
	})
})
