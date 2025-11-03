const { validationResult } = require('express-validator');
const Event = require('../models/Event');

const validateAndNormalizeEvent = (evt) => {
  const now = new Date();
  const occurredAt = evt.occurredAt ? new Date(evt.occurredAt) : now;

  return {
    userId: typeof evt.userId === 'string' && evt.userId.length ? evt.userId : null,
    sessionId: String(evt.sessionId || '').trim(),
    type: String(evt.type || '').trim(),
    itemId: evt.itemId ? String(evt.itemId) : null,
    variantId: evt.variantId ? String(evt.variantId) : null,
    quantity: Number.isFinite(evt.quantity) && evt.quantity > 0 ? Math.floor(evt.quantity) : 1,
    price: Number.isFinite(evt.price) && evt.price >= 0 ? Number(evt.price) : null,
    searchQuery: evt.searchQuery ? String(evt.searchQuery) : null,
    context: {
      device: evt.context?.device ? String(evt.context.device) : null,
      geo: evt.context?.geo ? String(evt.context.geo) : null,
      page: evt.context?.page ? String(evt.context.page) : null,
      referrer: evt.context?.referrer ? String(evt.context.referrer) : null
    },
    occurredAt
  };
};

const ingestBatch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'events must be a non-empty array' });
    }

    // Basic shape checks and normalization
    const docs = [];
    for (const evt of events) {
      if (!evt || !evt.sessionId || !evt.type) {
        return res.status(400).json({ success: false, message: 'Each event requires sessionId and type' });
      }
      const normalized = validateAndNormalizeEvent(evt);
      docs.push(normalized);
    }

    await Event.insertMany(docs, { ordered: false });

    res.status(201).json({ success: true, ingested: docs.length });
  } catch (error) {
    console.error('Event ingest error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getCountsByTypePerDay = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.occurredAt = {};
      if (startDate) match.occurredAt.$gte = new Date(startDate);
      if (endDate) match.occurredAt.$lte = new Date(endDate);
    }

    const pipeline = [
      Object.keys(match).length ? { $match: match } : null,
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt' } },
            type: '$type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          type: '$_id.type',
          count: 1
        }
      },
      { $sort: { day: 1, type: 1 } }
    ].filter(Boolean);

    const results = await Event.aggregate(pipeline);

    // Also return totals by type (optional convenience)
    const totalsByType = results.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + r.count;
      return acc;
    }, {});

    res.json({ success: true, data: { series: results, totalsByType } });
  } catch (error) {
    console.error('Event metrics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { ingestBatch, getCountsByTypePerDay };


