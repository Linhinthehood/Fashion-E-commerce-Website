const express = require('express');
const { body, query } = require('express-validator');
const { ingestBatch, getCountsByTypePerDay, getTopViewed, getPopularity, getUserAffinity, getRecentItemIds, getABTestMetrics } = require('../controllers/eventsController');

const router = express.Router();

const batchValidation = [
  body('events').isArray({ min: 1 }).withMessage('events must be a non-empty array'),
  body('events.*.type').isIn(['view', 'add_to_cart', 'purchase', 'wishlist', 'search', 'impression']).withMessage('Invalid event type'),
  body('events.*.sessionId').isString().notEmpty().withMessage('sessionId is required'),
  body('events.*.occurredAt').optional().isISO8601().withMessage('occurredAt must be a valid ISO date'),
  body('events.*.itemIds').optional().isArray().withMessage('itemIds must be an array'),
  body('events.*.context.source').optional().isString().withMessage('context.source must be a string'),
  body('events.*.context.strategy').optional().isString().withMessage('context.strategy must be a string'),
  body('events.*.context.position').optional().isString().withMessage('context.position must be a string')
];

/**
 * @swagger
 * /api/events/batch:
 *   post:
 *     summary: Ingest batch of events
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - events
 *             properties:
 *               events:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - sessionId
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [view, add_to_cart, purchase, wishlist, search, impression]
 *                       example: "view"
 *                     sessionId:
 *                       type: string
 *                       example: "session-123"
 *                     userId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     itemIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["507f1f77bcf86cd799439014"]
 *                     occurredAt:
 *                       type: string
 *                       format: date-time
 *                     context:
 *                       type: object
 *                       properties:
 *                         source:
 *                           type: string
 *                         strategy:
 *                           type: string
 *                         position:
 *                           type: string
 *     responses:
 *       200:
 *         description: Events ingested successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 */
router.post('/batch', batchValidation, ingestBatch);

// Simple metrics: counts grouped by event type per day
/**
 * @swagger
 * /api/events/metrics:
 *   get:
 *     summary: Get event counts by type per day
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO 8601)
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/metrics', [
  query('startDate').optional().isISO8601().withMessage('startDate must be ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be ISO date')
], getCountsByTypePerDay);

// Aggregations: Top viewed products
/**
 * @swagger
 * /api/events/aggregates/top-viewed:
 *   get:
 *     summary: Get top viewed products
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Top viewed products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/aggregates/top-viewed', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], getTopViewed);

// Aggregations: Popularity score (weighted by event type)
/**
 * @swagger
 * /api/events/aggregates/popularity:
 *   get:
 *     summary: Get product popularity scores (trending products)
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 200
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: Popularity scores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/aggregates/popularity', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 200 })
], getPopularity);

// Aggregations: User affinity (top items by user weighted interactions)
/**
 * @swagger
 * /api/events/aggregates/affinity:
 *   get:
 *     summary: Get user affinity scores (personalized recommendations)
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 500
 *         description: Number of items to return
 *     responses:
 *       200:
 *         description: User affinity scores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: userId is required
 */
router.get('/aggregates/affinity', [
  query('userId').isString().notEmpty().withMessage('userId is required'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 500 })
], getUserAffinity);

// Get recent item IDs for a user (for personalized recommendations)
/**
 * @swagger
 * /api/events/recent-items:
 *   get:
 *     summary: Get recent item IDs for a user
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Number of recent items to return
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           minimum: 1
 *           maximum: 365
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Recent items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: userId is required
 */
router.get('/recent-items', [
  query('userId').isString().notEmpty().withMessage('userId is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('days').optional().isInt({ min: 1, max: 365 })
], getRecentItemIds);

// A/B Testing metrics
/**
 * @swagger
 * /api/events/ab-test-metrics:
 *   get:
 *     summary: Get A/B test metrics
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO 8601)
 *       - in: query
 *         name: strategy
 *         schema:
 *           type: string
 *         description: Filter by strategy name
 *     responses:
 *       200:
 *         description: A/B test metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/ab-test-metrics', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('strategy').optional().isString()
], getABTestMetrics);

module.exports = router;


