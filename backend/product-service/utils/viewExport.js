const fs = require('fs').promises;
const path = require('path');

// View exported data summary
const viewExportSummary = async () => {
  try {
    const exportDir = path.join(__dirname, '../exports');
    const summaryPath = path.join(exportDir, 'export-summary.json');

    // Check if summary exists
    try {
      await fs.access(summaryPath);
    } catch (err) {
      console.error('❌ Export summary not found.');
      console.error('Run "npm run export:db" first to generate export files.\n');
      process.exit(1);
    }

    // Read and display summary
    const summaryData = await fs.readFile(summaryPath, 'utf8');
    const summary = JSON.parse(summaryData);

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║       DATABASE EXPORT SUMMARY                      ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log(`📅 Export Date: ${new Date(summary.exportDate).toLocaleString()}\n`);

    console.log('📊 STATISTICS:');
    console.log('─────────────────────────────────────────────────────');
    console.log(`  Total Categories:     ${summary.totalCategories}`);
    console.log(`  Total Products:       ${summary.totalProducts}`);
    console.log(`  ├─ Active:            ${summary.activeProducts}`);
    console.log(`  ├─ Inactive:          ${summary.inactiveProducts}`);
    console.log(`  ├─ With Images:       ${summary.productsWithImages}`);
    console.log(`  └─ Without Images:    ${summary.productsWithoutImages}\n`);

    console.log('👥 GENDER DISTRIBUTION:');
    console.log('─────────────────────────────────────────────────────');
    console.log(`  Male:                 ${summary.genderDistribution.Male}`);
    console.log(`  Female:               ${summary.genderDistribution.Female}`);
    console.log(`  Unisex:               ${summary.genderDistribution.Unisex}\n`);

    console.log('🏷️  TOP BRANDS:');
    console.log('─────────────────────────────────────────────────────');
    summary.topBrands.forEach((brand, index) => {
      console.log(`  ${index + 1}. ${brand.name.padEnd(25)} ${brand.count} products`);
    });
    console.log('');

    console.log('📦 PRODUCTS BY CATEGORY:');
    console.log('─────────────────────────────────────────────────────');
    const sortedCategories = Object.entries(summary.productsByCategory)
      .sort((a, b) => b[1] - a[1]);
    
    sortedCategories.forEach(([category, count]) => {
      const barLength = Math.min(Math.floor(count / 2), 40);
      const bar = '█'.repeat(barLength);
      console.log(`  ${category.padEnd(25)} ${bar} ${count}`);
    });
    console.log('');

    console.log('📁 EXPORTED FILES:');
    console.log('─────────────────────────────────────────────────────');
    const files = [
      'categories.json',
      'products.json',
      'database-export.json',
      'products.csv',
      'export-summary.json'
    ];

    for (const file of files) {
      const filePath = path.join(exportDir, file);
      try {
        const stats = await fs.stat(filePath);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`  ✓ ${file.padEnd(25)} ${size} KB`);
      } catch (err) {
        console.log(`  ✗ ${file.padEnd(25)} Not found`);
      }
    }

    console.log('\n─────────────────────────────────────────────────────');
    console.log(`📂 Location: ${exportDir}`);
    console.log('─────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Error reading export summary:', error.message);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  viewExportSummary();
}

module.exports = { viewExportSummary };
