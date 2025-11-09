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

router.post('/batch', batchValidation, ingestBatch);

// Simple metrics: counts grouped by event type per day
router.get('/metrics', [
  query('startDate').optional().isISO8601().withMessage('startDate must be ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be ISO date')
], getCountsByTypePerDay);

// Aggregations: Top viewed products
router.get('/aggregates/top-viewed', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], getTopViewed);

// Aggregations: Popularity score (weighted by event type)
router.get('/aggregates/popularity', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 200 })
], getPopularity);

// Aggregations: User affinity (top items by user weighted interactions)
router.get('/aggregates/affinity', [
  query('userId').isString().notEmpty().withMessage('userId is required'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 500 })
], getUserAffinity);

// Get recent item IDs for a user (for personalized recommendations)
router.get('/recent-items', [
  query('userId').isString().notEmpty().withMessage('userId is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('days').optional().isInt({ min: 1, max: 365 })
], getRecentItemIds);

// A/B Testing metrics
router.get('/ab-test-metrics', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('strategy').optional().isString()
], getABTestMetrics);

module.exports = router;


