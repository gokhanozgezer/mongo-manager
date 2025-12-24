import {describe, it, expect} from 'vitest'
import i18n from '../src/i18n/index.js'

describe('i18n Configuration', () => {
	it('should have English as fallback locale', () => {
		expect(i18n.global.fallbackLocale.value).toBe('en')
	})

	it('should have English translations', () => {
		const messages = i18n.global.messages.value
		expect(messages.en).toBeDefined()
	})

	it('should have Turkish translations', () => {
		const messages = i18n.global.messages.value
		expect(messages.tr).toBeDefined()
	})

	describe('English Translations', () => {
		const en = i18n.global.messages.value.en

		it('should have common translations', () => {
			expect(en.save).toBe('Save')
			expect(en.cancel).toBe('Cancel')
			expect(en.delete).toBe('Delete')
			expect(en.edit).toBe('Edit')
			expect(en.add).toBe('Add')
			expect(en.refresh).toBe('Refresh')
		})

		it('should have auth translations', () => {
			expect(en.login).toBeDefined()
			expect(en.logout).toBeDefined()
			expect(en.username).toBeDefined()
			expect(en.password).toBeDefined()
		})

		it('should have connection translations', () => {
			expect(en.connections).toBeDefined()
			expect(en.newConnection).toBeDefined()
			expect(en.testConnection).toBeDefined()
		})

		it('should have database translations', () => {
			expect(en.databases).toBeDefined()
			expect(en.createDatabase).toBeDefined()
			expect(en.dropDatabase).toBeDefined()
		})

		it('should have collection translations', () => {
			expect(en.collections).toBeDefined()
			expect(en.createCollection).toBeDefined()
		})

		it('should have document translations', () => {
			expect(en.documents).toBeDefined()
			expect(en.insertDocument).toBeDefined()
		})

		it('should have search and filter translations', () => {
			expect(en.searchAll).toBeDefined()
			expect(en.filterOptions).toBeDefined()
			expect(en.showOnlyActiveConnections).toBeDefined()
		})
	})

	describe('Turkish Translations', () => {
		const tr = i18n.global.messages.value.tr

		it('should have common translations', () => {
			expect(tr.save).toBe('Kaydet')
			expect(tr.cancel).toBe('İptal')
			expect(tr.delete).toBe('Sil')
			expect(tr.edit).toBe('Düzenle')
		})

		it('should have auth translations', () => {
			expect(tr.login).toBeDefined()
			expect(tr.logout).toBeDefined()
		})

		it('should have search and filter translations', () => {
			expect(tr.searchAll).toBeDefined()
			expect(tr.filterOptions).toBeDefined()
			expect(tr.showOnlyActiveConnections).toBeDefined()
		})
	})

	describe('Translation Parity', () => {
		it('should have same top-level keys in both languages', () => {
			const messages = i18n.global.messages.value
			const enKeys = Object.keys(messages.en).sort()
			const trKeys = Object.keys(messages.tr).sort()

			// Check that all English keys exist in Turkish
			for (const key of enKeys) {
				expect(trKeys).toContain(key)
			}
		})
	})
})
