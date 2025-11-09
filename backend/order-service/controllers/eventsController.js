const { validationResult } = require('express-validator');
const Event = require('../models/Event');

const validateAndNormalizeEvent = (evt) => {
  const now = new Date();
  const occurredAt = evt.occurredAt ? new Date(evt.occurredAt) : now;

  // Handle itemIds array for impression events
  let itemIds = null;
  if (evt.itemIds && Array.isArray(evt.itemIds)) {
    itemIds = evt.itemIds.map(id => String(id)).filter(id => id.length > 0);
    if (itemIds.length === 0) itemIds = null;
  }

  return {
    userId: typeof evt.userId === 'string' && evt.userId.length ? evt.userId : null,
    sessionId: String(evt.sessionId || '').trim(),
    type: String(evt.type || '').trim(),
    itemId: evt.itemId ? String(evt.itemId) : null,
    itemIds: itemIds, // Array of item IDs for impression events
    variantId: evt.variantId ? String(evt.variantId) : null,
    quantity: Number.isFinite(evt.quantity) && evt.quantity > 0 ? Math.floor(evt.quantity) : 1,
    price: Number.isFinite(evt.price) && evt.price >= 0 ? Number(evt.price) : null,
    searchQuery: evt.searchQuery ? String(evt.searchQuery) : null,
    context: {
      device: evt.context?.device ? String(evt.context.device) : null,
      geo: evt.context?.geo ? String(evt.context.geo) : null,
      page: evt.context?.page ? String(evt.context.page) : null,
      referrer: evt.context?.referrer ? String(evt.context.referrer) : null,
      source: evt.context?.source ? String(evt.context.source) : null,
      strategy: evt.context?.strategy ? String(evt.context.strategy) : null,
      position: evt.context?.position ? String(evt.context.position) : null
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

    // Debug logging for A/B testing events
    const abTestEvents = docs.filter(doc => 
      doc.type === 'impression' || 
      (doc.context && (doc.context.source === 'recommendation' || doc.context.strategy))
    );
    if (abTestEvents.length > 0) {
      console.log('📊 Backend received A/B Testing Events:', abTestEvents.map(e => ({
        type: e.type,
        userId: e.userId,
        sessionId: e.sessionId?.substring(0, 8) + '...',
        source: e.context?.source,
        strategy: e.context?.strategy,
        position: e.context?.position,
        itemId: e.itemId,
        itemIds: e.itemIds?.length,
        page: e.context?.page
      })));
    }

    await Event.insertMany(docs, { ordered: false });

    console.log(`✅ Successfully saved ${docs.length} events to database (${abTestEvents.length} A/B test events)`);

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

const getTopViewed = async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    const match = { type: 'view' };
    if (startDate || endDate) {
      match.occurredAt = {};
      if (startDate) match.occurredAt.$gte = new Date(startDate);
      if (endDate) match.occurredAt.$lte = new Date(endDate);
    }

    const results = await Event.aggregate([
      { $match: match },
      { $group: { _id: '$itemId', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: Math.max(1, Math.min(parseInt(limit, 10) || 20, 100)) },
      { $project: { _id: 0, itemId: '$_id', views: 1 } }
    ]);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Top viewed error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getPopularity = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.occurredAt = {};
      if (startDate) match.occurredAt.$gte = new Date(startDate);
      if (endDate) match.occurredAt.$lte = new Date(endDate);
    }

    const weights = { view: 1, add_to_cart: 3, purchase: 5, wishlist: 2, search: 0 };

    const results = await Event.aggregate([
      Object.keys(match).length ? { $match: match } : null,
      { $match: { itemId: { $ne: null } } },
      {
        $group: {
          _id: { itemId: '$itemId', type: '$type' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.itemId',
          byType: { $push: { k: '$_id.type', v: '$count' } },
          score: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id.type', 'view'] }, then: { $multiply: ['$count', weights.view] } },
                  { case: { $eq: ['$_id.type', 'add_to_cart'] }, then: { $multiply: ['$count', weights.add_to_cart] } },
                  { case: { $eq: ['$_id.type', 'purchase'] }, then: { $multiply: ['$count', weights.purchase] } },
                  { case: { $eq: ['$_id.type', 'wishlist'] }, then: { $multiply: ['$count', weights.wishlist] } }
                ],
                default: 0
              }
            }
          }
        }
      },
      { $addFields: { counts: { $arrayToObject: '$byType' } } },
      { $project: { _id: 0, itemId: '$_id', score: 1, counts: 1 } },
      { $sort: { score: -1 } },
      { $limit: Math.max(1, Math.min(parseInt(limit, 10) || 50, 200)) }
    ].filter(Boolean));

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Popularity error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getUserAffinity = async (req, res) => {
  try {
    const { userId, startDate, endDate, limit = 100 } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const match = { userId: String(userId) };
    if (startDate || endDate) {
      match.occurredAt = {};
      if (startDate) match.occurredAt.$gte = new Date(startDate);
      if (endDate) match.occurredAt.$lte = new Date(endDate);
    }

    const weights = { view: 1, add_to_cart: 3, purchase: 5, wishlist: 2 };

    const results = await Event.aggregate([
      { $match: match },
      { $match: { itemId: { $ne: null } } },
      { $group: { _id: { itemId: '$itemId', type: '$type' }, count: { $sum: 1 } } },
      {
        $group: {
          _id: '$_id.itemId',
          byType: { $push: { k: '$_id.type', v: '$count' } },
          score: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id.type', 'view'] }, then: { $multiply: ['$count', weights.view] } },
                  { case: { $eq: ['$_id.type', 'add_to_cart'] }, then: { $multiply: ['$count', weights.add_to_cart] } },
                  { case: { $eq: ['$_id.type', 'purchase'] }, then: { $multiply: ['$count', weights.purchase] } },
                  { case: { $eq: ['$_id.type', 'wishlist'] }, then: { $multiply: ['$count', weights.wishlist] } }
                ],
                default: 0
              }
            }
          }
        }
      },
      { $addFields: { counts: { $arrayToObject: '$byType' } } },
      { $project: { _id: 0, itemId: '$_id', score: 1, counts: 1 } },
      { $sort: { score: -1 } },
      { $limit: Math.max(1, Math.min(parseInt(limit, 10) || 100, 500)) }
    ]);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Affinity error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getRecentItemIds = async (req, res) => {
  try {
    const { userId, limit = 10, days = 30 } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days, 10));

    const results = await Event.aggregate([
      {
        $match: {
          userId: String(userId),
          itemId: { $ne: null },
          occurredAt: { $gte: daysAgo },
          type: { $in: ['view', 'add_to_cart', 'purchase', 'wishlist'] }
        }
      },
      {
        $group: {
          _id: '$itemId',
          lastViewed: { $max: '$occurredAt' },
          count: { $sum: 1 },
          // Weight by event type
          score: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$type', 'view'] }, then: 1 },
                  { case: { $eq: ['$type', 'add_to_cart'] }, then: 3 },
                  { case: { $eq: ['$type', 'purchase'] }, then: 5 },
                  { case: { $eq: ['$type', 'wishlist'] }, then: 2 }
                ],
                default: 0
              }
            }
          }
        }
      },
      { $sort: { lastViewed: -1, score: -1 } },
      { $limit: Math.max(1, Math.min(parseInt(limit, 10) || 10, 50)) },
      { $project: { _id: 0, itemId: '$_id', lastViewed: 1, score: 1 } }
    ]);

    const itemIds = results.map(r => r.itemId);

    res.json({
      success: true,
      data: {
        itemIds,
        count: itemIds.length,
        items: results
      }
    });
  } catch (error) {
    console.error('Recent itemIds error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getABTestMetrics = async (req, res) => {
  try {
    const { startDate, endDate, strategy } = req.query;

    const match = {
      $or: [
        { type: 'impression', 'context.source': 'recommendation' },
        { type: { $in: ['view', 'add_to_cart', 'purchase'] }, 'context.source': 'recommendation' }
      ]
    };

    if (startDate || endDate) {
      match.occurredAt = {};
      if (startDate) match.occurredAt.$gte = new Date(startDate);
      if (endDate) match.occurredAt.$lte = new Date(endDate);
    }

    if (strategy) {
      match['context.strategy'] = String(strategy);
    }

    // Get impressions (recommendations shown)
    const impressions = await Event.aggregate([
      { $match: { ...match, type: 'impression' } },
      {
        $group: {
          _id: '$context.strategy',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          _id: 0,
          strategy: '$_id',
          impressions: '$count',
          uniqueSessions: { $size: '$uniqueSessions' },
          uniqueUsers: { $size: { $filter: { input: '$uniqueUsers', as: 'u', cond: { $ne: ['$$u', null] } } } }
        }
      }
    ]);

    // Get clicks (views from recommendations)
    const clicks = await Event.aggregate([
      { $match: { ...match, type: 'view', 'context.source': 'recommendation' } },
      {
        $group: {
          _id: '$context.strategy',
          count: { $sum: 1 },
          uniqueItems: { $addToSet: '$itemId' }
        }
      },
      {
        $project: {
          _id: 0,
          strategy: '$_id',
          clicks: '$count',
          uniqueItemsClicked: { $size: { $filter: { input: '$uniqueItems', as: 'i', cond: { $ne: ['$$i', null] } } } }
        }
      }
    ]);

    // Get add_to_cart from recommendations
    const addToCarts = await Event.aggregate([
      { $match: { ...match, type: 'add_to_cart', 'context.source': 'recommendation' } },
      {
        $group: {
          _id: '$context.strategy',
          count: { $sum: 1 },
          uniqueItems: { $addToSet: '$itemId' }
        }
      },
      {
        $project: {
          _id: 0,
          strategy: '$_id',
          addToCarts: '$count',
          uniqueItemsAdded: { $size: { $filter: { input: '$uniqueItems', as: 'i', cond: { $ne: ['$$i', null] } } } }
        }
      }
    ]);

    // Get purchases from recommendations
    const purchases = await Event.aggregate([
      { $match: { ...match, type: 'purchase', 'context.source': 'recommendation' } },
      {
        $group: {
          _id: '$context.strategy',
          count: { $sum: 1 },
          revenue: { $sum: '$price' },
          uniqueItems: { $addToSet: '$itemId' }
        }
      },
      {
        $project: {
          _id: 0,
          strategy: '$_id',
          purchases: '$count',
          revenue: '$revenue',
          uniqueItemsPurchased: { $size: { $filter: { input: '$uniqueItems', as: 'i', cond: { $ne: ['$$i', null] } } } }
        }
      }
    ]);

    // Combine metrics by strategy
    const strategyMap = new Map();

    // Initialize with impressions
    impressions.forEach(imp => {
      strategyMap.set(imp.strategy || 'unknown', {
        strategy: imp.strategy || 'unknown',
        impressions: imp.impressions || 0,
        uniqueSessions: imp.uniqueSessions || 0,
        uniqueUsers: imp.uniqueUsers || 0,
        clicks: 0,
        addToCarts: 0,
        purchases: 0,
        revenue: 0,
        uniqueItemsClicked: 0,
        uniqueItemsAdded: 0,
        uniqueItemsPurchased: 0
      });
    });

    // Add clicks
    clicks.forEach(click => {
      const key = click.strategy || 'unknown';
      if (!strategyMap.has(key)) {
        strategyMap.set(key, {
          strategy: key,
          impressions: 0,
          uniqueSessions: 0,
          uniqueUsers: 0,
          clicks: 0,
          addToCarts: 0,
          purchases: 0,
          revenue: 0,
          uniqueItemsClicked: 0,
          uniqueItemsAdded: 0,
          uniqueItemsPurchased: 0
        });
      }
      const metrics = strategyMap.get(key);
      metrics.clicks = click.clicks || 0;
      metrics.uniqueItemsClicked = click.uniqueItemsClicked || 0;
    });

    // Add add_to_carts
    addToCarts.forEach(atc => {
      const key = atc.strategy || 'unknown';
      if (!strategyMap.has(key)) {
        strategyMap.set(key, {
          strategy: key,
          impressions: 0,
          uniqueSessions: 0,
          uniqueUsers: 0,
          clicks: 0,
          addToCarts: 0,
          purchases: 0,
          revenue: 0,
          uniqueItemsClicked: 0,
          uniqueItemsAdded: 0,
          uniqueItemsPurchased: 0
        });
      }
      const metrics = strategyMap.get(key);
      metrics.addToCarts = atc.addToCarts || 0;
      metrics.uniqueItemsAdded = atc.uniqueItemsAdded || 0;
    });

    // Add purchases
    purchases.forEach(purchase => {
      const key = purchase.strategy || 'unknown';
      if (!strategyMap.has(key)) {
        strategyMap.set(key, {
          strategy: key,
          impressions: 0,
          uniqueSessions: 0,
          uniqueUsers: 0,
          clicks: 0,
          addToCarts: 0,
          purchases: 0,
          revenue: 0,
          uniqueItemsClicked: 0,
          uniqueItemsAdded: 0,
          uniqueItemsPurchased: 0
        });
      }
      const metrics = strategyMap.get(key);
      metrics.purchases = purchase.purchases || 0;
      metrics.revenue = purchase.revenue || 0;
      metrics.uniqueItemsPurchased = purchase.uniqueItemsPurchased || 0;
    });

    // Calculate rates
    const results = Array.from(strategyMap.values()).map(metrics => ({
      ...metrics,
      ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) : 0,
      atcRate: metrics.impressions > 0 ? (metrics.addToCarts / metrics.impressions) : 0,
      conversionRate: metrics.impressions > 0 ? (metrics.purchases / metrics.impressions) : 0,
      revenuePerImpression: metrics.impressions > 0 ? (metrics.revenue / metrics.impressions) : 0
    }));

    res.json({
      success: true,
      data: {
        strategies: results,
        summary: {
          totalStrategies: results.length,
          totalImpressions: results.reduce((sum, m) => sum + m.impressions, 0),
          totalClicks: results.reduce((sum, m) => sum + m.clicks, 0),
          totalAddToCarts: results.reduce((sum, m) => sum + m.addToCarts, 0),
          totalPurchases: results.reduce((sum, m) => sum + m.purchases, 0),
          totalRevenue: results.reduce((sum, m) => sum + m.revenue, 0)
        }
      }
    });
  } catch (error) {
    console.error('AB test metrics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { ingestBatch, getCountsByTypePerDay, getTopViewed, getPopularity, getUserAffinity, getRecentItemIds, getABTestMetrics };


