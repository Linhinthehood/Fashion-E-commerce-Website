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

// Import data from JSON files
const importData = async (clearExisting = false) => {
  try {
    console.log('Starting database import...\n');

    const exportDir = path.join(__dirname, '../exports');

    // Check if files exist
    const categoriesPath = path.join(exportDir, 'categories.json');
    const productsPath = path.join(exportDir, 'products.json');

    try {
      await fs.access(categoriesPath);
      await fs.access(productsPath);
    } catch (err) {
      console.error('❌ Export files not found. Please run the export script first.');
      console.error(`Expected files at: ${exportDir}`);
      process.exit(1);
    }

    // Clear existing data if requested
    if (clearExisting) {
      console.log('⚠️  Clearing existing data...');
      await Product.deleteMany({});
      console.log('✓ Products cleared');
      await Category.deleteMany({});
      console.log('✓ Categories cleared\n');
    }

    // Import Categories
    console.log('Importing Categories...');
    const categoriesData = await fs.readFile(categoriesPath, 'utf8');
    const categories = JSON.parse(categoriesData);
    
    let categoryCount = 0;
    for (const category of categories) {
      try {
        await Category.findOneAndUpdate(
          { _id: category._id },
          category,
          { upsert: true, new: true }
        );
        categoryCount++;
      } catch (err) {
        console.error(`Failed to import category: ${category.articleType}`, err.message);
      }
    }
    console.log(`✓ Imported ${categoryCount} categories\n`);

    // Import Products
    console.log('Importing Products...');
    const productsData = await fs.readFile(productsPath, 'utf8');
    const products = JSON.parse(productsData);
    
    let productCount = 0;
    for (const product of products) {
      try {
        // Extract categoryId if it's populated
        if (product.categoryId && typeof product.categoryId === 'object') {
          product.categoryId = product.categoryId._id;
        }
        
        await Product.findOneAndUpdate(
          { _id: product._id },
          product,
          { upsert: true, new: true }
        );
        productCount++;
      } catch (err) {
        console.error(`Failed to import product: ${product.name}`, err.message);
      }
    }
    console.log(`✓ Imported ${productCount} products\n`);

    console.log('═══════════════════════════════════════════');
    console.log('           IMPORT SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`Categories Imported: ${categoryCount}`);
    console.log(`Products Imported: ${productCount}`);
    console.log('═══════════════════════════════════════════\n');

    console.log('✅ Database import completed successfully!');

  } catch (error) {
    console.error('❌ Error importing data:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    // Check command line arguments
    const clearExisting = process.argv.includes('--clear');
    
    if (clearExisting) {
      console.log('⚠️  WARNING: This will clear all existing data!');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await connectDB();
    await importData(clearExisting);
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

module.exports = { importData };
