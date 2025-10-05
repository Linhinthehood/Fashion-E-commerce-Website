const mongoose = require('mongoose');
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

// Check variants in database
const checkVariants = async () => {
  try {
    await connectDB();

    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║       VARIANT DATABASE CHECK                       ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Get all variants
    const variants = await Variant.find({})
      .populate('productId', 'name brand')
      .lean();

    console.log(`📊 Total Variants: ${variants.length}\n`);

    if (variants.length > 0) {
      console.log('🔍 VARIANT DETAILS:');
      console.log('─────────────────────────────────────────────────────');

      // Group by product
      const variantsByProduct = {};
      variants.forEach(variant => {
        const productName = variant.productId?.name || 'Unknown Product';
        if (!variantsByProduct[productName]) {
          variantsByProduct[productName] = [];
        }
        variantsByProduct[productName].push(variant);
      });

      // Display grouped variants
      Object.entries(variantsByProduct).forEach(([productName, productVariants]) => {
        console.log(`\n📦 ${productName}`);
        console.log(`   Product ID: ${productVariants[0].productId?._id || 'N/A'}`);
        console.log(`   Brand: ${productVariants[0].productId?.brand || 'N/A'}`);
        console.log(`   Variants: ${productVariants.length}`);
        
        productVariants.forEach((variant, index) => {
          console.log(`   ${index + 1}. Size: ${variant.size.padEnd(8)} | Stock: ${String(variant.stock).padStart(3)} | Status: ${variant.status} | Price: ${variant.price ? variant.price.toLocaleString() + ' VND' : 'N/A'}`);
        });
      });

      // Statistics
      console.log('\n\n📈 STATISTICS:');
      console.log('─────────────────────────────────────────────────────');
      console.log(`  Total Products with Variants: ${Object.keys(variantsByProduct).length}`);
      console.log(`  Total Variants:               ${variants.length}`);
      console.log(`  Active Variants:              ${variants.filter(v => v.status === 'Active').length}`);
      console.log(`  Inactive Variants:            ${variants.filter(v => v.status === 'Inactive').length}`);
      console.log(`  In Stock:                     ${variants.filter(v => v.stock > 0).length}`);
      console.log(`  Out of Stock:                 ${variants.filter(v => v.stock === 0).length}`);
      
      // Size distribution
      const sizeStats = {};
      variants.forEach(v => {
        sizeStats[v.size] = (sizeStats[v.size] || 0) + 1;
      });
      console.log('\n  📏 Size Distribution:');
      Object.entries(sizeStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([size, count]) => {
          console.log(`     ${size.padEnd(10)} ${count} variants`);
        });

    } else {
      console.log('ℹ️  No variants found in database.');
      console.log('   You can create variants using the API or import script.\n');
      
      // Show example
      console.log('💡 EXAMPLE VARIANT:');
      console.log('─────────────────────────────────────────────────────');
      console.log('   {');
      console.log('     "productId": "67e0c8c16a50c12a58a0a4e8",');
      console.log('     "size": "M",');
      console.log('     "stock": 50,');
      console.log('     "status": "Active",');
      console.log('     "price": 350000');
      console.log('   }\n');
    }

    console.log('─────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Database connection closed\n');
  }
};

// Run the script
if (require.main === module) {
  checkVariants();
}

module.exports = { checkVariants };
