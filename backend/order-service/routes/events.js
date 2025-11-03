const express = require('express');
const { body, query } = require('express-validator');
const { ingestBatch, getCountsByTypePerDay } = require('../controllers/eventsController');

const router = express.Router();

const batchValidation = [
  body('events').isArray({ min: 1 }).withMessage('events must be a non-empty array'),
  body('events.*.type').isIn(['view', 'add_to_cart', 'purchase', 'wishlist', 'search']).withMessage('Invalid event type'),
  body('events.*.sessionId').isString().notEmpty().withMessage('sessionId is required'),
  body('events.*.occurredAt').optional().isISO8601().withMessage('occurredAt must be a valid ISO date')
];

router.post('/batch', batchValidation, ingestBatch);

// Simple metrics: counts grouped by event type per day
router.get('/metrics', [
  query('startDate').optional().isISO8601().withMessage('startDate must be ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be ISO date')
], getCountsByTypePerDay);

module.exports = router;


