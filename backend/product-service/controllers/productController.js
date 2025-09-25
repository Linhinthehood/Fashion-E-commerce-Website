const Product = require('../models/Product');
const Category = require('../models/Category');
const { validationResult } = require('express-validator');

// Get all products with filtering and pagination
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      brand,
      minPrice,
      maxPrice,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      isFeatured,
      isNew,
      isOnSale
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (brand) filter.brand = new RegExp(brand, 'i');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      filter.tags = { $in: tagArray };
    }
    if (isFeatured === 'true') filter.isFeatured = true;
    if (isNew === 'true') filter.isNew = true;
    if (isOnSale === 'true') filter.discount = { $gt: 0 };

    // Build sort object
    const sort = {};
    if (sortBy === 'price') {
      sort.price = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'rating') {
      sort['rating.average'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'sales') {
      sort.salesCount = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    let query = Product.find(filter).populate('category', 'name');

    // Add search functionality
    if (search) {
      query = query.find({
        $text: { $search: search },
        ...filter
      });
      sort.score = { $meta: 'textScore' };
    }

    // Execute query with pagination
    const products = await query
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalProducts: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('category', 'name description')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    await Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const products = await Product.getFeatured(parseInt(limit));

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get new products
const getNewProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const products = await Product.getNew(parseInt(limit));

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Get new products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get best sellers
const getBestSellers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const products = await Product.getBestSellers(parseInt(limit));

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Get best sellers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    const { q, filters = {} } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const products = await Product.search(q, filters);

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get related products
const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 8 } = req.query;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: id },
      category: product.category,
      isActive: true
    })
      .populate('category', 'name')
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: { products: relatedProducts }
    });
  } catch (error) {
    console.error('Get related products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Check product availability
const checkAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { color, size } = req.query;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const isAvailable = product.isInStock(color, size);
    const variant = product.getVariant(color, size);

    res.json({
      success: true,
      data: {
        isAvailable,
        stock: variant ? variant.stock : product.totalStock,
        variant: variant || null
      }
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get product statistics
const getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          totalViews: { $sum: '$viewCount' },
          totalSales: { $sum: '$salesCount' }
        }
      }
    ]);

    const categoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: '$categoryInfo'
      },
      {
        $project: {
          categoryName: '$categoryInfo.name',
          count: 1
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        general: stats[0] || {
          totalProducts: 0,
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalViews: 0,
          totalSales: 0
        },
        categories: categoryStats
      }
    });
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getNewProducts,
  getBestSellers,
  searchProducts,
  getRelatedProducts,
  checkAvailability,
  getProductStats
};
