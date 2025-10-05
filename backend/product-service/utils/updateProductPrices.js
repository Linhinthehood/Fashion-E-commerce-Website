const mongoose = require('mongoose');
const fs = require('fs').promises;
require('dotenv').config();

const Product = require('../models/Product');

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

// Update product prices based on sample-products.json
const updatePrices = async () => {
  try {
    console.log('Starting price update...\n');

    // Read sample products JSON
    const data = await fs.readFile('./data/sample-products.json', 'utf8');
    const sampleProducts = JSON.parse(data);

    console.log(`Found ${sampleProducts.length} products in sample file\n`);

    let updateCount = 0;
    let skipCount = 0;
    let notFoundCount = 0;

    // Update each product
    for (const sampleProduct of sampleProducts) {
      try {
        // Find product by name
        const product = await Product.findOne({ name: sampleProduct.name });

        if (!product) {
          console.log(`⚠️  Product not found: ${sampleProduct.name}`);
          notFoundCount++;
          continue;
        }

        // Check if price needs update
        if (product.defaultPrice === sampleProduct.defaultPrice) {
          console.log(`⊘ Skipped (price already set): ${product.name} - ${sampleProduct.defaultPrice} VND`);
          skipCount++;
          continue;
        }

        // Update price
        product.defaultPrice = sampleProduct.defaultPrice;
        await product.save();

        updateCount++;
        console.log(`✓ Updated: ${product.name} - ${sampleProduct.defaultPrice} VND`);

      } catch (error) {
        console.error(`✗ Error updating ${sampleProduct.name}:`, error.message);
      }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('           UPDATE SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`✓ Prices updated: ${updateCount}`);
    console.log(`⊘ Skipped (already set): ${skipCount}`);
    console.log(`⚠️  Products not found: ${notFoundCount}`);
    console.log(`Total processed: ${sampleProducts.length}`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error updating prices:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await updatePrices();
    
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

module.exports = { updatePrices };
