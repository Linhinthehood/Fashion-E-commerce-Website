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

// Export data to JSON files
const exportData = async () => {
  try {
    console.log('Starting database export...\n');

    // Create exports directory if it doesn't exist
    const exportDir = path.join(__dirname, '../exports');
    try {
      await fs.mkdir(exportDir, { recursive: true });
      console.log(`✓ Export directory created: ${exportDir}\n`);
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Export Categories
    console.log('Exporting Categories...');
    const categories = await Category.find({}).lean();
    const categoriesPath = path.join(exportDir, 'categories.json');
    await fs.writeFile(
      categoriesPath,
      JSON.stringify(categories, null, 2),
      'utf8'
    );
    console.log(`✓ Exported ${categories.length} categories to: ${categoriesPath}\n`);

    // Export Products with populated category data
    console.log('Exporting Products...');
    const products = await Product.find({})
      .populate('categoryId', 'masterCategory subCategory articleType')
      .lean();
    const productsPath = path.join(exportDir, 'products.json');
    await fs.writeFile(
      productsPath,
      JSON.stringify(products, null, 2),
      'utf8'
    );
    console.log(`✓ Exported ${products.length} products to: ${productsPath}\n`);

    // Export Products with Categories (Combined)
    console.log('Exporting Combined Data...');
    const combinedData = {
      exportDate: new Date().toISOString(),
      statistics: {
        totalCategories: categories.length,
        totalProducts: products.length,
        activeProducts: products.filter(p => p.isActive).length,
        inactiveProducts: products.filter(p => !p.isActive).length,
      },
      categories: categories,
      products: products
    };
    const combinedPath = path.join(exportDir, 'database-export.json');
    await fs.writeFile(
      combinedPath,
      JSON.stringify(combinedData, null, 2),
      'utf8'
    );
    console.log(`✓ Exported combined data to: ${combinedPath}\n`);

    // Generate CSV for Products (optional)
    console.log('Generating CSV for Products...');
    const csvHeaders = [
      '_id',
      'name',
      'brand',
      'gender',
      'color',
      'usage',
      'categoryId',
      'category_masterCategory',
      'category_subCategory',
      'category_articleType',
      'hasImage',
      'isActive',
      'createdAt'
    ].join(',');

    const csvRows = products.map(product => {
      return [
        product._id,
        `"${product.name?.replace(/"/g, '""') || ''}"`,
        `"${product.brand?.replace(/"/g, '""') || ''}"`,
        product.gender || '',
        `"${product.color?.replace(/"/g, '""') || ''}"`,
        `"${product.usage?.replace(/"/g, '""') || ''}"`,
        product.categoryId?._id || product.categoryId || '',
        `"${product.categoryId?.masterCategory?.replace(/"/g, '""') || ''}"`,
        `"${product.categoryId?.subCategory?.replace(/"/g, '""') || ''}"`,
        `"${product.categoryId?.articleType?.replace(/"/g, '""') || ''}"`,
        product.hasImage || false,
        product.isActive || false,
        product.createdAt || ''
      ].join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const csvPath = path.join(exportDir, 'products.csv');
    await fs.writeFile(csvPath, csvContent, 'utf8');
    console.log(`✓ Exported products to CSV: ${csvPath}\n`);

    // Generate summary report
    const categoryStats = {};
    products.forEach(product => {
      const categoryName = product.categoryId?.articleType || 'Uncategorized';
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = 0;
      }
      categoryStats[categoryName]++;
    });

    const summaryReport = {
      exportDate: new Date().toISOString(),
      totalCategories: categories.length,
      totalProducts: products.length,
      activeProducts: products.filter(p => p.isActive).length,
      inactiveProducts: products.filter(p => !p.isActive).length,
      productsWithImages: products.filter(p => p.hasImage).length,
      productsWithoutImages: products.filter(p => !p.hasImage).length,
      productsByCategory: categoryStats,
      topBrands: getTopItems(products, 'brand', 10),
      genderDistribution: {
        Male: products.filter(p => p.gender === 'Male').length,
        Female: products.filter(p => p.gender === 'Female').length,
        Unisex: products.filter(p => p.gender === 'Unisex').length,
      }
    };

    const summaryPath = path.join(exportDir, 'export-summary.json');
    await fs.writeFile(
      summaryPath,
      JSON.stringify(summaryReport, null, 2),
      'utf8'
    );
    console.log(`✓ Generated summary report: ${summaryPath}\n`);

    // Print summary to console
    console.log('═══════════════════════════════════════════');
    console.log('           EXPORT SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`Export Date: ${summaryReport.exportDate}`);
    console.log(`Total Categories: ${summaryReport.totalCategories}`);
    console.log(`Total Products: ${summaryReport.totalProducts}`);
    console.log(`  - Active: ${summaryReport.activeProducts}`);
    console.log(`  - Inactive: ${summaryReport.inactiveProducts}`);
    console.log(`  - With Images: ${summaryReport.productsWithImages}`);
    console.log(`  - Without Images: ${summaryReport.productsWithoutImages}`);
    console.log('\nGender Distribution:');
    console.log(`  - Male: ${summaryReport.genderDistribution.Male}`);
    console.log(`  - Female: ${summaryReport.genderDistribution.Female}`);
    console.log(`  - Unisex: ${summaryReport.genderDistribution.Unisex}`);
    console.log('\nTop 5 Categories by Product Count:');
    Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([category, count]) => {
        console.log(`  - ${category}: ${count}`);
      });
    console.log('═══════════════════════════════════════════\n');

    console.log('✅ Database export completed successfully!');
    console.log(`📁 All files saved to: ${exportDir}\n`);

  } catch (error) {
    console.error('❌ Error exporting data:', error);
    throw error;
  }
};

// Helper function to get top items
const getTopItems = (array, field, limit = 10) => {
  const counts = {};
  array.forEach(item => {
    const value = item[field];
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await exportData();
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

module.exports = { exportData };
