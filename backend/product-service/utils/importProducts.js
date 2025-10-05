const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const Product = require('../models/Product');
const Category = require('../models/Category');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Import products from JSON file with category matching
const importProducts = async (filePath) => {
  try {
    console.log('Starting product import...\n');

    // Read the JSON file
    const data = await fs.readFile(filePath, 'utf8');
    const productsToImport = JSON.parse(data);

    if (!Array.isArray(productsToImport)) {
      throw new Error('JSON file must contain an array of products');
    }

    console.log(`Found ${productsToImport.length} products to import\n`);

    // Get all existing categories
    const categories = await Category.find({}).lean();
    console.log(`Found ${categories.length} existing categories\n`);

    // Create category lookup map
    const categoryMap = new Map();
    categories.forEach(cat => {
      const key = `${cat.masterCategory}-${cat.subCategory}-${cat.articleType}`.toLowerCase();
      categoryMap.set(key, cat._id);
      // Also add by articleType only for easier matching
      categoryMap.set(cat.articleType.toLowerCase(), cat._id);
    });

    console.log('Available categories:');
    categories.forEach(cat => {
      console.log(`  - ${cat.masterCategory} > ${cat.subCategory} > ${cat.articleType}`);
    });
    console.log('');

    let successCount = 0;
    let failCount = 0;
    let duplicatesRemoved = 0;
    const errors = [];

    // Import each product
    for (let i = 0; i < productsToImport.length; i++) {
      const productData = productsToImport[i];
      
      try {
        // Check if product already exists (by name)
        const existingProducts = await Product.find({ name: productData.name });
        
        if (existingProducts.length > 0) {
          // If multiple duplicates exist, remove all except the first one
          if (existingProducts.length > 1) {
            const duplicateIds = existingProducts.slice(1).map(p => p._id);
            await Product.deleteMany({ _id: { $in: duplicateIds } });
            duplicatesRemoved += existingProducts.length - 1;
            console.log(`🗑️  [${i + 1}/${productsToImport.length}] Removed ${existingProducts.length - 1} duplicate(s): ${productData.name}`);
          }
          console.log(`⊘ [${i + 1}/${productsToImport.length}] Skipped (already exists): ${productData.name}`);
          continue; // Skip this product
        }

        // Find matching category
        let categoryId = null;

        // Method 1: If categoryId is provided and exists
        if (productData.categoryId) {
          if (typeof productData.categoryId === 'object') {
            categoryId = productData.categoryId._id;
          } else {
            categoryId = productData.categoryId;
          }
        }

        // Method 2: Match by category fields
        if (!categoryId && productData.category) {
          const cat = productData.category;
          const key = `${cat.masterCategory}-${cat.subCategory}-${cat.articleType}`.toLowerCase();
          categoryId = categoryMap.get(key);
        }

        // Method 3: Match by articleType only
        if (!categoryId && productData.articleType) {
          categoryId = categoryMap.get(productData.articleType.toLowerCase());
        }

        // Method 4: Match by category name
        if (!categoryId && productData.categoryName) {
          categoryId = categoryMap.get(productData.categoryName.toLowerCase());
        }

        if (!categoryId) {
          throw new Error(`No matching category found for product: ${productData.name}`);
        }

        // Prepare product data
        const product = {
          name: productData.name,
          description: productData.description || '',
          brand: productData.brand || 'Unknown',
          gender: productData.gender || 'Unisex',
          color: productData.color || 'Default',
          usage: productData.usage || 'Casual',
          categoryId: categoryId,
          defaultPrice: productData.defaultPrice || 0,
          hasImage: productData.hasImage || false,
          imageUrl: productData.imageUrl || '',
          imagePublicId: productData.imagePublicId || '',
          isActive: productData.isActive !== undefined ? productData.isActive : true,
        };

        // Insert or update product
        if (productData._id) {
          await Product.findByIdAndUpdate(productData._id, product, { upsert: true, new: true });
        } else {
          await Product.create(product);
        }

        successCount++;
        console.log(`✓ [${i + 1}/${productsToImport.length}] Imported: ${product.name}`);

      } catch (error) {
        failCount++;
        const errorMsg = `✗ [${i + 1}/${productsToImport.length}] Failed: ${productData.name || 'Unknown'} - ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Update category product counts
    console.log('\nUpdating category product counts...');
    for (const category of categories) {
      const count = await Product.countDocuments({ categoryId: category._id, isActive: true });
      await Category.updateOne({ _id: category._id }, { productCount: count });
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('           IMPORT SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`✓ Successfully imported: ${successCount}`);
    console.log(`⊘ Skipped (already exists): ${productsToImport.length - successCount - failCount}`);
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`);
    console.log(`✗ Failed to import: ${failCount}`);
    console.log(`Total processed: ${productsToImport.length}`);
    console.log('═══════════════════════════════════════════\n');

    if (errors.length > 0) {
      console.log('Errors:');
      errors.forEach(err => console.log(err));
      console.log('');
    }

    return { success: successCount, failed: failCount };

  } catch (error) {
    console.error('❌ Error importing products:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    // Get file path from command line argument
    const filePath = process.argv[2];

    if (!filePath) {
      console.log('Usage: node importProducts.js <path-to-json-file>');
      console.log('');
      console.log('Example:');
      console.log('  node utils/importProducts.js data/products.json');
      console.log('  node utils/importProducts.js data/sample-products.json');
      console.log('');
      process.exit(1);
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    await connectDB();
    await importProducts(filePath);
    
    console.log('Closing database connection...');
    await mongoose.connection.close();
    console.log('✓ Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { importProducts };
