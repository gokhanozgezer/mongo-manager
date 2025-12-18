import {Router} from 'express'
import multer from 'multer'
import path from 'path'
import os from 'os'

// Import controllers
import * as auth from '../controllers/auth.js'
import * as connections from '../controllers/connections.js'
import * as databases from '../controllers/databases.js'
import * as collections from '../controllers/collections.js'
import * as documents from '../controllers/documents.js'
import * as indexes from '../controllers/indexes.js'
import * as aggregations from '../controllers/aggregations.js'
import * as server from '../controllers/server.js'
import * as backup from '../controllers/backup.js'
import * as settings from '../controllers/settings.js'
import {authMiddleware} from '../config/auth.js'

// Configure multer for file uploads
const upload = multer({
	dest: path.join(os.tmpdir(), 'mongo-manager-uploads'),
	limits: {fileSize: 500 * 1024 * 1024} // 500MB limit
})

const router = Router()

// =============================================================================
// Auth Routes (Public)
// =============================================================================

router.post('/auth/login', auth.login)
router.post('/auth/logout', auth.logoutHandler)
router.get('/auth/me', auth.me)

// =============================================================================
// Protected Routes - All routes below require authentication
// =============================================================================

router.use(authMiddleware)

// Account management
router.post('/auth/change-password', auth.changePasswordHandler)
router.post('/auth/change-username', auth.changeUsernameHandler)

// =============================================================================
// Settings Routes
// =============================================================================

router.get('/settings/access', settings.getAccessSettings)
router.put('/settings/access', settings.updateAccessSettings)

// =============================================================================
// Connection Routes
// =============================================================================

router.get('/connections', connections.listConnections)
router.get('/connections/:connectionId', connections.getConnection)
router.post('/connections', connections.createConnection)
router.put('/connections/:connectionId', connections.updateConnection)
router.delete('/connections/:connectionId', connections.deleteConnection)
router.post('/connections/:connectionId/test', connections.testConnection)
router.post('/connections/test', connections.testNewConnection)

// =============================================================================
// Server Routes
// =============================================================================

router.get('/connections/:connectionId/server-info', server.getServerInfo)
router.get('/connections/:connectionId/server-status', server.getServerStatus)
router.get('/connections/:connectionId/processlist', server.getProcesslist)
router.post('/connections/:connectionId/command', server.executeCommand)
router.post('/connections/:connectionId/execute', server.executeJs)
router.post('/connections/:connectionId/shell', server.executeShell)

// =============================================================================
// Database Routes
// =============================================================================

router.get('/connections/:connectionId/databases', databases.listDatabases)
router.get('/connections/:connectionId/databases/:dbName/stats', databases.getDatabaseStats)
router.post('/connections/:connectionId/databases', databases.createDatabase)
router.delete('/connections/:connectionId/databases/:dbName', databases.dropDatabase)

// =============================================================================
// Collection Routes
// =============================================================================

router.get('/connections/:connectionId/databases/:dbName/collections', collections.listCollections)
router.get('/connections/:connectionId/databases/:dbName/collections/:collectionName/stats', collections.getCollectionStats)
router.post('/connections/:connectionId/databases/:dbName/collections', collections.createCollection)
router.delete('/connections/:connectionId/databases/:dbName/collections/:collectionName', collections.dropCollection)
router.put('/connections/:connectionId/databases/:dbName/collections/:collectionName/rename', collections.renameCollection)

// =============================================================================
// Document Routes
// =============================================================================

router.get('/connections/:connectionId/databases/:dbName/collections/:collectionName/documents', documents.listDocuments)
router.get('/connections/:connectionId/databases/:dbName/collections/:collectionName/documents/:documentId', documents.getDocument)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/documents', documents.insertDocument)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/documents/bulk', documents.insertDocuments)
router.put('/connections/:connectionId/databases/:dbName/collections/:collectionName/documents/:documentId', documents.updateDocument)
router.delete('/connections/:connectionId/databases/:dbName/collections/:collectionName/documents/:documentId', documents.deleteDocument)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/documents/delete', documents.deleteDocuments)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/documents/update-many', documents.updateManyDocuments)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/documents/delete-many', documents.deleteManyDocuments)

// =============================================================================
// Index Routes
// =============================================================================

router.get('/connections/:connectionId/databases/:dbName/collections/:collectionName/indexes', indexes.listIndexes)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/indexes', indexes.createIndex)
router.delete('/connections/:connectionId/databases/:dbName/collections/:collectionName/indexes/:indexName', indexes.dropIndex)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/reindex', indexes.reindexCollection)

// =============================================================================
// Aggregation Routes
// =============================================================================

router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/aggregate', aggregations.runAggregation)
router.get('/connections/:connectionId/databases/:dbName/collections/:collectionName/pipelines', aggregations.listSavedPipelines)
router.get('/pipelines/:pipelineId', aggregations.getSavedPipeline)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/pipelines', aggregations.savePipeline)
router.put('/pipelines/:pipelineId', aggregations.updateSavedPipeline)
router.delete('/pipelines/:pipelineId', aggregations.deleteSavedPipeline)

// =============================================================================
// Backup/Restore Routes (mongodump/mongorestore)
// =============================================================================

// Database backup/restore
router.get('/connections/:connectionId/databases/:dbName/export', backup.exportDatabase)
router.post('/connections/:connectionId/databases/:dbName/restore', upload.single('file'), backup.restoreDatabase)

// Collection backup/restore
router.get('/connections/:connectionId/databases/:dbName/collections/:collectionName/export', backup.exportCollection)
router.get('/connections/:connectionId/databases/:dbName/collections/:collectionName/export-json', backup.exportCollectionJson)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/restore', upload.single('file'), backup.restoreCollection)
router.post('/connections/:connectionId/databases/:dbName/collections/:collectionName/import-json', upload.single('file'), backup.importCollectionJson)

export default router
