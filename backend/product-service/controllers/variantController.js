const Variant = require('../models/Variant');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Get all variants with filtering and pagination
const getVariants = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      productId,
      status = 'Active',
      size,
      hasStock = false
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter = {};
    
    if (productId) filter.productId = productId;
    if (status) filter.status = status;
    if (size) filter.size = size;
    if (hasStock === 'true') filter.stock = { $gt: 0 };

    const variants = await Variant.find(filter)
      .populate('productId', 'name brand gender season')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Variant.countDocuments(filter);

    res.json({
      success: true,
      data: {
        variants,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalVariants: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get variants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new variant (with optional image upload)
const createVariant = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { productId, size, stock, status = 'Active', price } = req.body;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if variant already exists for this product with same size
    const existingVariant = await Variant.findOne({
      productId,
      size
    });

    if (existingVariant) {
      return res.status(400).json({
        success: false,
        message: 'Variant already exists for this product with same size'
      });
    }

    const variant = new Variant({
      productId,
      size,
      stock,
      status,
      price
    });

    await variant.save();

    res.status(201).json({
      success: true,
      message: 'Variant created successfully',
      data: { variant }
    });
  } catch (error) {
    console.error('Create variant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single variant by ID
const getVariantById = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await Variant.findById(id)
      .populate('productId', 'name brand gender season categoryId')
      .lean();

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    res.json({
      success: true,
      data: { variant }
    });
  } catch (error) {
    console.error('Get variant by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update variant
const updateVariant = async (req, res) => {
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
    const { size, stock, status, price, sku } = req.body;

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    // Check if updated variant already exists (excluding current variant)
    if (size) {
      const existingVariant = await Variant.findOne({
        _id: { $ne: id },
        productId: variant.productId,
        size: size
      });

      if (existingVariant) {
        return res.status(400).json({
          success: false,
          message: 'Variant already exists for this product with same size'
        });
      }
    }

    // Update fields
    if (size) variant.size = size;
    if (stock !== undefined) variant.stock = stock;
    if (status) variant.status = status;
    if (price !== undefined) variant.price = price;
    if (sku) variant.sku = sku;

    await variant.save();

    res.json({
      success: true,
      message: 'Variant updated successfully',
      data: { variant }
    });
  } catch (error) {
    console.error('Update variant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete variant
const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    await Variant.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Variant deleted successfully'
    });
  } catch (error) {
    console.error('Delete variant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get variants by product
const getVariantsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { status = 'Active' } = req.query;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const variants = await Variant.getByProduct(productId, status);

    res.json({
      success: true,
      data: { variants }
    });
  } catch (error) {
    console.error('Get variants by product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get variants by size
const getVariantsBySize = async (req, res) => {
  try {
    const { size } = req.params;
    const { status = 'Active' } = req.query;

    const variants = await Variant.getBySize(size, status);

    res.json({
      success: true,
      data: { variants }
    });
  } catch (error) {
    console.error('Get variants by size error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// Get available variants (in stock)
const getAvailableVariants = async (req, res) => {
  try {
    const variants = await Variant.getAvailable();

    res.json({
      success: true,
      data: { variants }
    });
  } catch (error) {
    console.error('Get available variants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get low stock variants
const getLowStockVariants = async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    const rawThreshold = Array.isArray(threshold) ? threshold[0] : threshold;
    const thresholdNumber = parseInt(rawThreshold, 10);
    const effectiveThreshold = Number.isNaN(thresholdNumber) || thresholdNumber <= 0 ? 10 : thresholdNumber;

    const variants = await Variant.find({
      status: 'Active',
      stock: { $gt: 0, $lte: effectiveThreshold }
    })
      .populate('productId', 'name brand gender season categoryId')
      .sort({ stock: 1, updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { variants }
    });
  } catch (error) {
    console.error('Get low stock variants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get out of stock variants
const getOutOfStockVariants = async (req, res) => {
  try {
    const variants = await Variant.find({
      status: 'Active',
      stock: 0
    })
      .populate('productId', 'name brand gender season categoryId')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { variants }
    });
  } catch (error) {
    console.error('Get out of stock variants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update variant stock
const updateVariantStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a number'
      });
    }

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    await variant.updateStock(quantity);

    res.json({
      success: true,
      message: 'Variant stock updated successfully',
      data: { 
        variant: {
          _id: variant._id,
          stock: variant.stock
        }
      }
    });
  } catch (error) {
    console.error('Update variant stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reserve variant stock
const reserveVariantStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number'
      });
    }

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    await variant.reserveStock(quantity);

    res.json({
      success: true,
      message: 'Stock reserved successfully',
      data: { 
        variant: {
          _id: variant._id,
          stock: variant.stock
        }
      }
    });
  } catch (error) {
    console.error('Reserve variant stock error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Release variant stock
const releaseVariantStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number'
      });
    }

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    await variant.releaseStock(quantity);

    res.json({
      success: true,
      message: 'Stock released successfully',
      data: { 
        variant: {
          _id: variant._id,
          stock: variant.stock
        }
      }
    });
  } catch (error) {
    console.error('Release variant stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get variant statistics
const getVariantStats = async (req, res) => {
  try {
    const stats = await Variant.aggregate([
      {
        $group: {
          _id: null,
          totalVariants: { $sum: 1 },
          activeVariants: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
          },
          totalStock: { $sum: '$stock' },
        }
      }
    ]);

    const statusBreakdown = await Variant.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const sizeBreakdown = await Variant.aggregate([
      {
        $group: {
          _id: '$size',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);


    res.json({
      success: true,
      data: {
        general: stats[0] || {
          totalVariants: 0,
          activeVariants: 0,
          totalStock: 0
        },
        statusBreakdown,
        sizeBreakdown
      }
    });
  } catch (error) {
    console.error('Get variant stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getVariants,
  createVariant,
  getVariantById,
  updateVariant,
  deleteVariant,
  getVariantsByProduct,
  getVariantsBySize,
  getAvailableVariants,
  getLowStockVariants,
  getOutOfStockVariants,
  updateVariantStock,
  reserveVariantStock,
  releaseVariantStock,
  getVariantStats
};
