import {describe, it, expect} from 'vitest'
import sanitizeModule, {
	validateRequired,
	validateLength,
	validatePattern,
	patterns
} from '../src/middleware/sanitize.js'

const {sanitizeString, sanitizeObject} = sanitizeModule

describe('sanitizeString', () => {
	it('should return non-string values as-is', () => {
		expect(sanitizeString(123)).toBe(123)
		expect(sanitizeString(null)).toBe(null)
		expect(sanitizeString(undefined)).toBe(undefined)
	})

	it('should remove null bytes', () => {
		expect(sanitizeString('hello\0world')).toBe('helloworld')
	})

	it('should remove leading $ from strings', () => {
		expect(sanitizeString('$gt')).toBe('gt')
		expect(sanitizeString('$set')).toBe('set')
	})

	it('should not modify normal strings', () => {
		expect(sanitizeString('hello world')).toBe('hello world')
		expect(sanitizeString('test123')).toBe('test123')
	})
})

describe('sanitizeObject', () => {
	it('should handle null and undefined', () => {
		expect(sanitizeObject(null)).toBe(null)
		expect(sanitizeObject(undefined)).toBe(undefined)
	})

	it('should sanitize nested objects', () => {
		const input = {
			name: 'test\0name',
			nested: {
				value: '$dangerous'
			}
		}
		const result = sanitizeObject(input)
		expect(result.name).toBe('testname')
		expect(result.nested.value).toBe('dangerous')
	})

	it('should sanitize arrays', () => {
		const input = ['$test', 'normal', '$another']
		const result = sanitizeObject(input)
		expect(result).toEqual(['test', 'normal', 'another'])
	})

	it('should handle deep nesting up to limit', () => {
		let obj = {value: 'test'}
		for (let i = 0; i < 25; i++) {
			obj = {nested: obj}
		}
		// Should not throw, just return deeply nested object
		expect(() => sanitizeObject(obj)).not.toThrow()
	})
})

describe('validateRequired', () => {
	it('should return valid true when all fields present', () => {
		const obj = {name: 'test', email: 'test@example.com'}
		const result = validateRequired(obj, ['name', 'email'])
		expect(result.valid).toBe(true)
		expect(result.missing).toEqual([])
	})

	it('should return missing fields', () => {
		const obj = {name: 'test'}
		const result = validateRequired(obj, ['name', 'email', 'password'])
		expect(result.valid).toBe(false)
		expect(result.missing).toEqual(['email', 'password'])
	})

	it('should treat empty strings as missing', () => {
		const obj = {name: '', email: '   '}
		const result = validateRequired(obj, ['name', 'email'])
		expect(result.valid).toBe(false)
		expect(result.missing).toContain('name')
		expect(result.missing).toContain('email')
	})

	it('should treat null/undefined as missing', () => {
		const obj = {name: null, email: undefined}
		const result = validateRequired(obj, ['name', 'email'])
		expect(result.valid).toBe(false)
		expect(result.missing).toEqual(['name', 'email'])
	})
})

describe('validateLength', () => {
	it('should return false for non-strings', () => {
		expect(validateLength(123, 1, 10)).toBe(false)
		expect(validateLength(null, 1, 10)).toBe(false)
	})

	it('should validate minimum length', () => {
		expect(validateLength('ab', 3)).toBe(false)
		expect(validateLength('abc', 3)).toBe(true)
	})

	it('should validate maximum length', () => {
		expect(validateLength('abcdef', 0, 5)).toBe(false)
		expect(validateLength('abcde', 0, 5)).toBe(true)
	})

	it('should validate range', () => {
		expect(validateLength('abc', 2, 5)).toBe(true)
		expect(validateLength('a', 2, 5)).toBe(false)
		expect(validateLength('abcdef', 2, 5)).toBe(false)
	})
})

describe('validatePattern', () => {
	it('should return false for non-strings', () => {
		expect(validatePattern(123, /\d+/)).toBe(false)
	})

	it('should validate against pattern', () => {
		expect(validatePattern('test123', /^[a-z0-9]+$/)).toBe(true)
		expect(validatePattern('test 123', /^[a-z0-9]+$/)).toBe(false)
	})
})

describe('patterns', () => {
	describe('dbName', () => {
		it('should match valid database names', () => {
			expect(patterns.dbName.test('mydb')).toBe(true)
			expect(patterns.dbName.test('my_db')).toBe(true)
			expect(patterns.dbName.test('my-db')).toBe(true)
			expect(patterns.dbName.test('my.db')).toBe(true)
			expect(patterns.dbName.test('MyDB123')).toBe(true)
		})

		it('should reject invalid database names', () => {
			expect(patterns.dbName.test('')).toBe(false)
			expect(patterns.dbName.test('-invalid')).toBe(false)
			expect(patterns.dbName.test('.invalid')).toBe(false)
		})
	})

	describe('collectionName', () => {
		it('should match valid collection names', () => {
			expect(patterns.collectionName.test('users')).toBe(true)
			expect(patterns.collectionName.test('user_profiles')).toBe(true)
			expect(patterns.collectionName.test('system.users')).toBe(true)
		})
	})

	describe('connectionName', () => {
		it('should match valid connection names', () => {
			expect(patterns.connectionName.test('My Connection')).toBe(true)
			expect(patterns.connectionName.test('prod-server-1')).toBe(true)
			expect(patterns.connectionName.test('Local_Dev')).toBe(true)
		})
	})

	describe('host', () => {
		it('should match valid hostnames', () => {
			expect(patterns.host.test('localhost')).toBe(true)
			expect(patterns.host.test('mongodb.example.com')).toBe(true)
			expect(patterns.host.test('192.168.1.1')).toBe(true)
		})

		it('should reject invalid hostnames', () => {
			expect(patterns.host.test('-invalid')).toBe(false)
		})
	})
})
