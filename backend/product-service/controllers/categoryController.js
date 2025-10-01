const Category = require('../models/Category');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Get all categories
const getCategories = async (req, res) => {
  try {
    const { 
      includeInactive = false,
      masterCategory,
      subCategory,
      articleType 
    } = req.query;
    
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    
    // Add specific filters
    if (masterCategory) filter.masterCategory = masterCategory;
    if (subCategory) filter.subCategory = subCategory;
    if (articleType) filter.articleType = articleType;
    
    const categories = await Category.find(filter)
      .sort({ masterCategory: 1, subCategory: 1, articleType: 1 })
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

// Create new category
const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { masterCategory, subCategory, articleType, description } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({
      masterCategory,
      subCategory,
      articleType
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }

    const category = new Category({
      masterCategory,
      subCategory,
      articleType,
      description
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error);
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

    const category = await Category.findById(id).lean();

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

// Update category
const updateCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { masterCategory, subCategory, articleType, description, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if updated category already exists (excluding current category)
    if (masterCategory || subCategory || articleType) {
      const existingCategory = await Category.findOne({
        _id: { $ne: id },
        masterCategory: masterCategory || category.masterCategory,
        subCategory: subCategory || category.subCategory,
        articleType: articleType || category.articleType
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category already exists'
        });
      }
    }

    // Update fields
    if (masterCategory) category.masterCategory = masterCategory;
    if (subCategory) category.subCategory = subCategory;
    if (articleType) category.articleType = articleType;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ categoryId: id, isActive: true });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing products'
      });
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
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

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const products = await Product.find({
      categoryId: id,
      isActive: true
    })
      .populate('categoryId', 'masterCategory subCategory articleType')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Product.countDocuments({
      categoryId: id,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        products,
        category: {
          _id: category._id,
          masterCategory: category.masterCategory,
          subCategory: category.subCategory,
          articleType: category.articleType,
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

// Get master categories
const getMasterCategories = async (req, res) => {
  try {
    const masterCategories = await Category.getMasterCategories();

    res.json({
      success: true,
      data: { masterCategories }
    });
  } catch (error) {
    console.error('Get master categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get sub categories
const getSubCategories = async (req, res) => {
  try {
    const { masterCategory } = req.query;
    const subCategories = await Category.getSubCategories(masterCategory);

    res.json({
      success: true,
      data: { subCategories }
    });
  } catch (error) {
    console.error('Get sub categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get article types
const getArticleTypes = async (req, res) => {
  try {
    const { masterCategory, subCategory } = req.query;
    const articleTypes = await Category.getArticleTypes(masterCategory, subCategory);

    res.json({
      success: true,
      data: { articleTypes }
    });
  } catch (error) {
    console.error('Get article types error:', error);
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
          masterCategory: 1,
          subCategory: 1,
          articleType: 1,
          productCount: 1,
          description: 1
        }
      }
    ]);

    const categoryBreakdown = await Category.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$masterCategory',
          count: { $sum: 1 },
          totalProducts: { $sum: '$productCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        general: stats[0] || {
          totalCategories: 0,
          totalProducts: 0,
          averageProductsPerCategory: 0
        },
        topCategories,
        categoryBreakdown
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
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getProductsByCategory,
  getMasterCategories,
  getSubCategories,
  getArticleTypes,
  getCategoryStats
};
