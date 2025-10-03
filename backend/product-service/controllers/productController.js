const Product = require('../models/Product');
const Category = require('../models/Category');
const { validationResult } = require('express-validator');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Helper: recalculate and persist productCount for a category
const recalculateCategoryProductCount = async (categoryId) => {
  if (!categoryId) return;
  const count = await Product.countDocuments({ categoryId, isActive: true });
  await Category.updateOne({ _id: categoryId }, { productCount: count });
};

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to upload image to Cloudinary
const uploadImageToCloudinary = async (buffer, folder = 'fashion-ecommerce/products') => {
  return new Promise((resolve, reject) => {
    const cloudinaryConfig = cloudinary();
    cloudinaryConfig.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto' },
          { format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
};

// Get all products with filtering and pagination
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      categoryId,
      brand,
      gender,
      color,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      hasVariants = false
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter = { isActive: true };

    if (categoryId) filter.categoryId = categoryId;
    if (brand) filter.brand = new RegExp(brand, 'i');
    if (gender) filter.gender = gender;
    if (color) filter.color = new RegExp(color, 'i');

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    let query = Product.find(filter).populate('categoryId', 'masterCategory subCategory articleType');

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

    // Add primaryImage to each product (now from product.images directly)
    const productsWithImages = products.map(product => ({
      ...product,
      primaryImage: product.images && product.images.length > 0 ? product.images[0] : null
    }));

    res.json({
      success: true,
      data: {
        products: productsWithImages,
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

// Create new product
const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, description, brand, gender, usage, categoryId, color } = req.body;

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Handle image upload if files are provided (optional)
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadImageToCloudinary(file.buffer));
      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map(result => result.secure_url);
    }

    const product = new Product({
      name,
      description,
      brand,
      gender,
      usage,
      categoryId,
      color,
      images: imageUrls,
      hasImage: imageUrls.length > 0
    });

    await product.save();

    // Update category product count
    await recalculateCategoryProductCount(categoryId);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error);
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
      .populate('categoryId', 'masterCategory subCategory articleType description');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get primary image (now from product.images directly)
    const productWithImage = {
      ...product.toObject(),
      primaryImage: product.images && product.images.length > 0 ? product.images[0] : null
    };

    res.json({
      success: true,
      data: { product: productWithImage }
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

// Update product
const updateProduct = async (req, res) => {
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
    const { name, description, brand, gender, usage, categoryId, color, hasImage, isActive } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify category exists if provided
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    // Handle image upload if files are provided (optional)
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadImageToCloudinary(file.buffer));
      const uploadResults = await Promise.all(uploadPromises);
      newImageUrls = uploadResults.map(result => result.secure_url);
    }

    // Update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (brand) product.brand = brand;
    if (gender) product.gender = gender;
    if (usage) product.usage = usage;
    const oldCategoryId = product.categoryId?.toString();
    if (categoryId) product.categoryId = categoryId;
    if (color) product.color = color;
    if (hasImage !== undefined) product.hasImage = hasImage;
    if (isActive !== undefined) product.isActive = isActive;
    
    // Update images if new ones are provided
    if (newImageUrls.length > 0) {
      product.images = [...product.images, ...newImageUrls];
      product.hasImage = true;
    }

    const wasActive = product.isModified('isActive') ? !product.isActive : product.isActive;
    const categoryChanged = product.isModified('categoryId') && oldCategoryId !== String(product.categoryId);

    await product.save();

    // Recalculate counts if needed
    if (categoryChanged) {
      if (oldCategoryId) await recalculateCategoryProductCount(oldCategoryId);
      await recalculateCategoryProductCount(product.categoryId);
    } else if (product.isModified('isActive')) {
      await recalculateCategoryProductCount(product.categoryId);
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

      const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

      const categoryId = product.categoryId;
      await Product.findByIdAndDelete(id);

      // Update category product count
      await recalculateCategoryProductCount(categoryId);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
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
    const { categoryId } = req.params;
    const { limit = 20 } = req.query;
    
    const products = await Product.getByCategory(categoryId, parseInt(limit));

    res.json({
      success: true,
      data: { products }
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

// Get products by brand
const getProductsByBrand = async (req, res) => {
  try {
    const { brand } = req.params;
    const { limit = 20 } = req.query;
    
    const products = await Product.getByBrand(brand, parseInt(limit));

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Get products by brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get products by gender
const getProductsByGender = async (req, res) => {
  try {
    const { gender } = req.params;
    const { limit = 20 } = req.query;
    
    const products = await Product.getByGender(gender, parseInt(limit));

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Get products by gender error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// Get products with variants
const getProductsWithVariants = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const products = await Product.getWithVariants(parseInt(limit));

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Get products with variants error:', error);
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


// Upload images for product
const uploadProductImages = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const uploadPromises = req.files.map(file => uploadImageToCloudinary(file.buffer));
    const uploadResults = await Promise.all(uploadPromises);

    const imageUrls = uploadResults.map(result => result.secure_url);
    
    // Update product with new images
    product.images = [...product.images, ...imageUrls];
    product.hasImage = true;
    await product.save();

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        productId: product._id,
        images: product.images,
        newImages: imageUrls
      }
    });
  } catch (error) {
    console.error('Upload product images error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete product image
const deleteProductImage = async (req, res) => {
  try {
    const { productId, imageUrl } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Remove image from product's images array
    const imageIndex = product.images.indexOf(imageUrl);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in product'
      });
    }

    product.images.splice(imageIndex, 1);
    product.hasImage = product.images.length > 0;
    await product.save();

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        productId: product._id,
        remainingImages: product.images,
        hasImage: product.hasImage
      }
    });
  } catch (error) {
    console.error('Delete product image error:', error);
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
          totalProducts: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$categoryId',
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
          categoryName: {
            $concat: [
              '$categoryInfo.masterCategory',
              ' - ',
              '$categoryInfo.subCategory',
              ' - ',
              '$categoryInfo.articleType'
            ]
          },
          count: 1
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const brandStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const genderStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        general: stats[0] || {
          totalProducts: 0
        },
        categories: categoryStats,
        brands: brandStats,
        genders: genderStats,
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
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getProductsByBrand,
  getProductsByGender,
  getProductsWithVariants,
  searchProducts,
  getProductStats,
  uploadProductImages,
  deleteProductImage,
  upload
};
