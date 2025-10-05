const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');
const Variant = require('../models/Variant');
const Category = require('../models/Category');

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

// View products with their variants
const viewProductsWithVariants = async () => {
  try {
    await connectDB();

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       PRODUCTS & VARIANTS RELATIONSHIP                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Get all products
    const products = await Product.find({})
      .populate('categoryId', 'articleType')
      .sort({ name: 1 })
      .lean();

    console.log(`📦 Total Products: ${products.length}\n`);

    // Get all variants
    const variants = await Variant.find({}).lean();
    console.log(`📏 Total Variants: ${variants.length}\n`);

    // Create a map of productId -> variants
    const variantsByProduct = {};
    variants.forEach(variant => {
      const productId = variant.productId.toString();
      if (!variantsByProduct[productId]) {
        variantsByProduct[productId] = [];
      }
      variantsByProduct[productId].push(variant);
    });

    console.log('═══════════════════════════════════════════════════════════════\n');

    let productsWithVariants = 0;
    let productsWithoutVariants = 0;

    // Group by category
    const productsByCategory = {};
    products.forEach(product => {
      const category = product.categoryId?.articleType || 'Uncategorized';
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    });

    // Display by category
    Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
      console.log(`\n📁 ${category.toUpperCase()}`);
      console.log('─────────────────────────────────────────────────────────────');

      categoryProducts.forEach((product, index) => {
        const productId = product._id.toString();
        const productVariants = variantsByProduct[productId] || [];
        const hasVariants = productVariants.length > 0;

        if (hasVariants) productsWithVariants++;
        else productsWithoutVariants++;

        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   ID: ${product._id}`);
        console.log(`   Brand: ${product.brand} | Gender: ${product.gender}`);
        console.log(`   Price: ${product.defaultPrice ? product.defaultPrice.toLocaleString() + ' VND' : 'N/A'}`);
        console.log(`   Variants: ${hasVariants ? '✅' : '❌'} (${productVariants.length})`);

        if (hasVariants) {
          productVariants.forEach((variant, vIndex) => {
            const stockStatus = variant.stock > 0 ? '✓' : '✗';
            console.log(`      ${vIndex + 1}. [${variant.status === 'Active' ? '●' : '○'}] Size: ${variant.size.padEnd(8)} | Stock: ${String(variant.stock).padStart(3)} ${stockStatus} | Price: ${variant.price ? variant.price.toLocaleString() + ' VND' : 'Use Default'}`);
          });
        } else {
          console.log(`      ⚠️  No variants defined - Need to add sizes!`);
        }
      });
    });

    // Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║       SUMMARY                                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`  Total Products:                ${products.length}`);
    console.log(`  ├─ With Variants:             ${productsWithVariants} ✅`);
    console.log(`  └─ Without Variants:          ${productsWithoutVariants} ❌`);
    console.log(`\n  Total Variants:                ${variants.length}`);
    console.log(`  ├─ Active:                     ${variants.filter(v => v.status === 'Active').length}`);
    console.log(`  ├─ Inactive:                   ${variants.filter(v => v.status === 'Inactive').length}`);
    console.log(`  ├─ In Stock:                   ${variants.filter(v => v.stock > 0).length}`);
    console.log(`  └─ Out of Stock:               ${variants.filter(v => v.stock === 0).length}`);

    if (productsWithoutVariants > 0) {
      console.log('\n\n💡 RECOMMENDATION:');
      console.log('─────────────────────────────────────────────────────────────');
      console.log(`  You have ${productsWithoutVariants} products without variants.`);
      console.log('  Consider creating variants for these products to enable:');
      console.log('    • Size selection');
      console.log('    • Stock management per size');
      console.log('    • Better inventory control\n');
    }

    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Database connection closed\n');
  }
};

// Run the script
if (require.main === module) {
  viewProductsWithVariants();
}

module.exports = { viewProductsWithVariants };
