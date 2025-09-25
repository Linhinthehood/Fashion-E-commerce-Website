const Category = require('../models/Category');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Get all categories
const getCategories = async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    
    const categories = await Category.find(filter)
      .populate('parent', 'name')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get category tree
const getCategoryTree = async (req, res) => {
  try {
    const tree = await Category.getCategoryTree();

    res.json({
      success: true,
      data: { tree }
    });
  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id)
      .populate('parent', 'name')
      .populate('subcategories', 'name description isActive productCount')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get all subcategories
    const subcategories = await category.getAllSubcategories();
    const categoryIds = [id, ...subcategories.map(sub => sub._id.toString())];

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

    const products = await Product.find({
      category: { $in: categoryIds },
      isActive: true
    })
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Product.countDocuments({
      category: { $in: categoryIds },
      isActive: true
    });

    res.json({
      success: true,
      data: {
        products,
        category: {
          _id: category._id,
          name: category.name,
          description: category.description
        },
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
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get root categories
const getRootCategories = async (req, res) => {
  try {
    const categories = await Category.getRootCategories();

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get root categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get category statistics
const getCategoryStats = async (req, res) => {
  try {
    const stats = await Category.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          totalProducts: { $sum: '$productCount' },
          averageProductsPerCategory: { $avg: '$productCount' }
        }
      }
    ]);

    const topCategories = await Category.aggregate([
      { $match: { isActive: true } },
      { $sort: { productCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: 1,
          productCount: 1,
          description: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        general: stats[0] || {
          totalCategories: 0,
          totalProducts: 0,
          averageProductsPerCategory: 0
        },
        topCategories
      }
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCategories,
  getCategoryTree,
  getCategoryById,
  getProductsByCategory,
  getRootCategories,
  getCategoryStats
};
