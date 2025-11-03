const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const { validationResult } = require('express-validator');
const userService = require('../services/userService');

/**
 * Helper function to build date filter based on period and date
 * @param {string} period - 'day', 'month', 'year', or 'all'
 * @param {string} date - Date string in format YYYY-MM-DD (for day), YYYY-MM (for month), YYYY (for year)
 * @returns {Object} MongoDB date filter object
 */
function buildDateFilter(period, date) {
  const filter = {};
  
  if (!period || period === 'all') {
    return filter; // No date filter for 'all'
  }

  if (!date) {
    // If no date provided, default to today for day, current month for month, current year for year
    const now = new Date();
    if (period === 'day') {
      date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (period === 'month') {
      date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    } else if (period === 'year') {
      date = String(now.getFullYear()); // YYYY
    }
  }

  let startDate, endDate;

  if (period === 'day') {
    // YYYY-MM-DD format
    startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    // YYYY-MM format
    const [year, month] = date.split('-');
    startDate = new Date(year, parseInt(month) - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(year, parseInt(month), 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'year') {
    // YYYY format
    const year = parseInt(date);
    startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);
  }

  if (startDate && endDate) {
    filter.createdAt = {
      $gte: startDate,
      $lte: endDate
    };
  }

  return filter;
}

/**
 * Get top products by sales quantity or revenue
 * GET /api/orders/analytics/top-products
 * Query params: period (day/month/year/all), date, limit (default 10), sortBy (quantity/revenue, default quantity)
 */
const getTopProducts = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { period = 'all', date, limit = 10, sortBy = 'quantity' } = req.query;
    const limitNum = parseInt(limit);

    // Build date filter
    const dateFilter = buildDateFilter(period, date);

    // Base match filter
    const matchFilter = {
      isActive: true,
      ...dateFilter
    };

    // Aggregation pipeline
    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            productId: '$productId',
            productName: '$productName',
            brand: '$brand',
            image: '$image'
          },
          totalQuantity: { $sum: '$quantity' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$subPrice' }
        }
      },
      {
        $project: {
          _id: 0,
          productId: '$_id.productId',
          productName: '$_id.productName',
          brand: '$_id.brand',
          image: '$_id.image',
          totalQuantity: 1,
          totalOrders: 1,
          totalRevenue: { $round: ['$totalRevenue', 0] }
        }
      }
    ];

    // Sort by quantity or revenue
    const sortField = sortBy === 'revenue' ? 'totalRevenue' : 'totalQuantity';
    pipeline.push({ $sort: { [sortField]: -1 } });
    pipeline.push({ $limit: limitNum });

    const topProducts = await OrderItem.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        topProducts,
        period,
        date: date || null,
        sortBy,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get orders statistics (count, revenue, average order value)
 * GET /api/orders/analytics/orders-stats
 * Query params: period (day/month/year/all), date
 */
const getOrdersStats = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { period = 'all', date } = req.query;

    // Build date filter
    const dateFilter = buildDateFilter(period, date);

    // Base match filter - only count orders with Paid status for revenue
    const matchFilter = {
      isActive: true,
      ...dateFilter
    };

    // Overall statistics
    const overallStats = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$finalPrice' },
          averageOrderValue: { $avg: '$finalPrice' }
        }
      }
    ]);

    // Paid orders statistics (actual revenue)
    const paidStats = await Order.aggregate([
      {
        $match: {
          ...matchFilter,
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          paidOrders: { $sum: 1 },
          paidRevenue: { $sum: '$finalPrice' }
        }
      }
    ]);

    // Orders by payment status
    const ordersByPaymentStatus = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Orders by shipment status
    const ordersByShipmentStatus = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$shipmentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Timeline data for charts (group by day/month/year based on period)
    let timelineGroup = {};
    if (period === 'day') {
      // Group by hour for day view
      timelineGroup = {
        $hour: '$createdAt'
      };
    } else if (period === 'month') {
      // Group by day for month view
      timelineGroup = {
        $dayOfMonth: '$createdAt'
      };
    } else if (period === 'year') {
      // Group by month for year view
      timelineGroup = {
        $month: '$createdAt'
      };
    } else {
      // For 'all', group by day
      timelineGroup = {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$createdAt'
        }
      };
    }

    const timelineStats = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: timelineGroup,
          orders: { $sum: 1 },
          revenue: { $sum: '$finalPrice' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const stats = overallStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    };

    const paid = paidStats[0] || {
      paidOrders: 0,
      paidRevenue: 0
    };

    res.json({
      success: true,
      data: {
        period,
        date: date || null,
        overview: {
          totalOrders: stats.totalOrders || 0,
          totalRevenue: Math.round(stats.totalRevenue || 0),
          averageOrderValue: Math.round(stats.averageOrderValue || 0),
          paidOrders: paid.paidOrders || 0,
          paidRevenue: Math.round(paid.paidRevenue || 0)
        },
        byPaymentStatus: ordersByPaymentStatus.map(item => ({
          status: item._id,
          count: item.count
        })),
        byShipmentStatus: ordersByShipmentStatus.map(item => ({
          status: item._id,
          count: item.count
        })),
        timeline: timelineStats.map(item => ({
          period: item._id,
          orders: item.orders,
          revenue: Math.round(item.revenue || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Get orders stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get top customers by revenue
 * GET /api/orders/analytics/top-customers
 * Query params: period (day/month/year/all), date, limit (default 10)
 */
const getTopCustomers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { period = 'all', date, limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    // Build date filter
    const dateFilter = buildDateFilter(period, date);

    // Base match filter
    const matchFilter = {
      isActive: true,
      ...dateFilter
    };

    // Aggregate orders by userId
    const topCustomersAgg = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$userId',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$finalPrice' },
          averageOrderValue: { $avg: '$finalPrice' }
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          totalOrders: 1,
          totalRevenue: { $round: ['$totalRevenue', 0] },
          averageOrderValue: { $round: ['$averageOrderValue', 0] }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limitNum }
    ]);

    // Enrich with user information from user service
    const topCustomers = await Promise.all(
      topCustomersAgg.map(async (customer) => {
        let userInfo = {
          name: 'Unknown User',
          email: 'N/A'
        };

        try {
          const user = await userService.getUserById(customer.userId);
          if (user) {
            userInfo = {
              name: user.name || 'Unknown User',
              email: user.email || 'N/A'
            };
          }
        } catch (error) {
          console.error(`Failed to fetch user ${customer.userId}:`, error.message);
          // Continue with default values if user service fails
        }

        return {
          ...customer,
          ...userInfo
        };
      })
    );

    res.json({
      success: true,
      data: {
        topCustomers,
        period,
        date: date || null,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get dashboard overview - all metrics in one call
 * GET /api/orders/analytics/overview
 * Query params: period (day/month/year/all), date
 */
const getDashboardOverview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { period = 'all', date } = req.query;

    // Get all stats in parallel
    const [ordersStatsResult, topProductsResult, topCustomersResult] = await Promise.all([
      // Orders stats
      (async () => {
        const dateFilter = buildDateFilter(period, date);
        const matchFilter = { isActive: true, ...dateFilter };

        const overallStats = await Order.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$finalPrice' },
              averageOrderValue: { $avg: '$finalPrice' }
            }
          }
        ]);

        const paidStats = await Order.aggregate([
          {
            $match: {
              ...matchFilter,
              paymentStatus: 'Paid'
            }
          },
          {
            $group: {
              _id: null,
              paidOrders: { $sum: 1 },
              paidRevenue: { $sum: '$finalPrice' }
            }
          }
        ]);

        return {
          overview: {
            totalOrders: overallStats[0]?.totalOrders || 0,
            totalRevenue: Math.round(overallStats[0]?.totalRevenue || 0),
            averageOrderValue: Math.round(overallStats[0]?.averageOrderValue || 0),
            paidOrders: paidStats[0]?.paidOrders || 0,
            paidRevenue: Math.round(paidStats[0]?.paidRevenue || 0)
          }
        };
      })(),

      // Top products (limit 5 for overview)
      (async () => {
        const dateFilter = buildDateFilter(period, date);
        const matchFilter = { isActive: true, ...dateFilter };

        const topProducts = await OrderItem.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: {
                productId: '$productId',
                productName: '$productName',
                brand: '$brand',
                image: '$image'
              },
              totalQuantity: { $sum: '$quantity' },
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$subPrice' }
            }
          },
          {
            $project: {
              _id: 0,
              productId: '$_id.productId',
              productName: '$_id.productName',
              brand: '$_id.brand',
              image: '$_id.image',
              totalQuantity: 1,
              totalOrders: 1,
              totalRevenue: { $round: ['$totalRevenue', 0] }
            }
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 5 }
        ]);

        return { topProducts };
      })(),

      // Top customers (limit 5 for overview)
      (async () => {
        const dateFilter = buildDateFilter(period, date);
        const matchFilter = { isActive: true, ...dateFilter };

        const topCustomersAgg = await Order.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: '$userId',
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$finalPrice' },
              averageOrderValue: { $avg: '$finalPrice' }
            }
          },
          {
            $project: {
              _id: 0,
              userId: '$_id',
              totalOrders: 1,
              totalRevenue: { $round: ['$totalRevenue', 0] },
              averageOrderValue: { $round: ['$averageOrderValue', 0] }
            }
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 5 }
        ]);

        const topCustomers = await Promise.all(
          topCustomersAgg.map(async (customer) => {
            let userInfo = { name: 'Unknown User', email: 'N/A' };
            try {
              const user = await userService.getUserById(customer.userId);
              if (user) {
                userInfo = { name: user.name || 'Unknown User', email: user.email || 'N/A' };
              }
            } catch (error) {
              console.error(`Failed to fetch user ${customer.userId}:`, error.message);
            }
            return {
              userId: customer.userId,
              ...userInfo,
              totalOrders: customer.totalOrders,
              totalRevenue: customer.totalRevenue || 0,
              averageOrderValue: customer.averageOrderValue || 0
            };
          })
        );

        return { topCustomers };
      })()
    ]);

    res.json({
      success: true,
      data: {
        period,
        date: date || null,
        ...ordersStatsResult,
        ...topProductsResult,
        ...topCustomersResult
      }
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getTopProducts,
  getOrdersStats,
  getTopCustomers,
  getDashboardOverview
};
