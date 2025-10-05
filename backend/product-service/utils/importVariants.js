const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const Variant = require('../models/Variant');
const Product = require('../models/Product');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ MongoDB Connected\n');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Import variants from JSON file
const importVariants = async () => {
  try {
    await connectDB();

    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║       IMPORTING VARIANTS                           ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Read variants data file
    const dataPath = path.join(__dirname, '../data/sample-variants.json');
    const fileContent = await fs.readFile(dataPath, 'utf8');
    const variantsData = JSON.parse(fileContent);

    console.log(`📁 Loaded ${variantsData.length} products with variants\n`);

    let totalVariantsCreated = 0;
    let totalVariantsSkipped = 0;
    let totalProductsProcessed = 0;
    let totalProductsNotFound = 0;

    // Process each product's variants
    for (const productData of variantsData) {
      const { productId, productName, variants } = productData;
      
      console.log(`\n📦 Processing: ${productName}`);
      console.log(`   Product ID: ${productId}`);

      // Verify product exists
      const product = await Product.findById(productId);
      if (!product) {
        console.log(`   ❌ Product not found in database - SKIPPING`);
        totalProductsNotFound++;
        continue;
      }

      totalProductsProcessed++;
      let variantsCreated = 0;
      let variantsSkipped = 0;

      // Process each variant
      for (const variantData of variants) {
        const { size, stock, status, price } = variantData;

        // Check if variant already exists
        const existingVariant = await Variant.findOne({
          productId: productId,
          size: size
        });

        if (existingVariant) {
          console.log(`   ⏭️  Size ${size} already exists - SKIPPING`);
          variantsSkipped++;
          totalVariantsSkipped++;
          continue;
        }

        // Create new variant
        const newVariant = new Variant({
          productId: productId,
          size: size,
          stock: stock,
          status: status,
          price: price
        });

        await newVariant.save();
        console.log(`   ✅ Created variant: Size ${size} | Stock: ${stock} | Price: ${price.toLocaleString()} VND`);
        variantsCreated++;
        totalVariantsCreated++;
      }

      console.log(`   📊 Summary: ${variantsCreated} created, ${variantsSkipped} skipped`);
    }

    // Final summary
    console.log('\n\n╔════════════════════════════════════════════════════╗');
    console.log('║       IMPORT SUMMARY                               ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    console.log(`  Products Processed:        ${totalProductsProcessed}`);
    console.log(`  Products Not Found:        ${totalProductsNotFound}`);
    console.log(`  Total Variants Created:    ${totalVariantsCreated} ✅`);
    console.log(`  Total Variants Skipped:    ${totalVariantsSkipped} ⏭️`);
    console.log('\n═════════════════════════════════════════════════════\n');

    if (totalVariantsCreated > 0) {
      console.log('✅ Variants import completed successfully!\n');
    } else {
      console.log('ℹ️  No new variants were created.\n');
    }

  } catch (error) {
    console.error('❌ Error importing variants:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Database connection closed\n');
  }
};

// Run the script
if (require.main === module) {
  importVariants();
}

module.exports = { importVariants };
