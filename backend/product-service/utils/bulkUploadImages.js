const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const Product = require('../models/Product');
const configureCloudinary = require('../config/cloudinary');

// Initialize Cloudinary
const cloudinary = configureCloudinary();

// Convert Vietnamese characters to ASCII
const vietnameseToAscii = (str) => {
  const vietnameseMap = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A', 'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D'
  };

  let result = str;
  for (const [vietnamese, ascii] of Object.entries(vietnameseMap)) {
    result = result.replace(new RegExp(vietnamese, 'g'), ascii);
  }
  return result;
};

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

// Upload image buffer to Cloudinary
const uploadToCloudinary = async (buffer, productName, imageIndex) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'fashion-ecommerce/products',
        resource_type: 'auto',
        public_id: `${productName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${imageIndex}`,
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

// Bulk upload images and update products
const bulkUploadImages = async (imagesDir) => {
  try {
    console.log('Starting bulk image upload...\n');

    // Check if images directory exists
    try {
      await fs.access(imagesDir);
    } catch (err) {
      console.error(`❌ Images directory not found: ${imagesDir}`);
      console.log('\nPlease create the directory and add your images.');
      console.log('Expected structure:');
      console.log('  assets/');
      console.log('    product-name-1.jpg');
      console.log('    product-name-2.jpg');
      console.log('    product-name-3.jpg');
      console.log('    another-product-1.png');
      console.log('    another-product-2.png');
      process.exit(1);
    }

    // Read all image files
    const files = await fs.readdir(imagesDir);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    if (imageFiles.length === 0) {
      console.log('❌ No image files found in the directory.');
      console.log('Supported formats: jpg, jpeg, png, gif, webp');
      process.exit(1);
    }

    console.log(`Found ${imageFiles.length} image files\n`);

    // Group images by product name
    // Expected naming: "product-name-1.jpg", "product-name-2.jpg", etc.
    const productImages = {};
    
    imageFiles.forEach(file => {
      // Extract product name by removing the number and extension
      // Example: "white-dress-shirt-1.jpg" -> "white-dress-shirt"
      const match = file.match(/^(.+?)(-\d+)?\.(jpg|jpeg|png|gif|webp)$/i);
      if (match) {
        const productKey = match[1].toLowerCase();
        if (!productImages[productKey]) {
          productImages[productKey] = [];
        }
        productImages[productKey].push(file);
      }
    });

    console.log('📦 Grouped images by product:');
    Object.entries(productImages).forEach(([key, files]) => {
      console.log(`  ${key}: ${files.length} image(s)`);
    });
    console.log('');

    // Get all products from database
    const products = await Product.find({}).lean();
    console.log(`Found ${products.length} products in database\n`);

    let uploadCount = 0;
    let productUpdateCount = 0;
    let skippedCount = 0;
    let duplicatesRemoved = 0;
    const errors = [];

    // Process each product
    for (const product of products) {
      try {
        // Check if product already has images
        if (product.images && product.images.length > 0 && product.hasImage) {
          // Check for duplicate images in the array
          const uniqueImages = [...new Set(product.images)];
          
          if (uniqueImages.length < product.images.length) {
            // Found duplicates, update with unique images only
            const duplicateCount = product.images.length - uniqueImages.length;
            await Product.findByIdAndUpdate(product._id, { 
              images: uniqueImages 
            });
            duplicatesRemoved += duplicateCount;
            console.log(`  🗑️  Removed ${duplicateCount} duplicate image(s) for: ${product.name}`);
          }
          
          console.log(`  ⊘ Skipped (already has images): ${product.name} (${uniqueImages.length} image(s))`);
          skippedCount++;
          continue;
        }

        // Create searchable product name variations
        // Convert Vietnamese to ASCII first, then normalize
        const productNameKey = vietnameseToAscii(product.name).toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        // Find matching images
        let matchingImages = productImages[productNameKey];

        // If no exact match, try partial matching
        if (!matchingImages) {
          // Convert Vietnamese product name to ASCII for better matching
          const asciiProductName = vietnameseToAscii(product.name).toLowerCase();
          const productWords = asciiProductName.split(/\s+/);
          
          for (const [key, images] of Object.entries(productImages)) {
            // Check if key matches the product name pattern
            const matches = productWords.filter(word => 
              word.length > 2 && key.includes(word)
            );
            
            // Need at least 2 matching words, or if it's a short name, 1 word is enough
            const requiredMatches = productWords.length <= 3 ? 1 : 2;
            
            if (matches.length >= requiredMatches) {
              matchingImages = images;
              console.log(`  📌 Matched "${product.name}" with images: ${key}`);
              break;
            }
          }
        }

        if (!matchingImages || matchingImages.length === 0) {
          console.log(`  ⊘ No images found for: ${product.name}`);
          console.log(`     Expected pattern: ${productNameKey}-1.jpg, ${productNameKey}-2.jpg, etc.`);
          continue;
        }

        console.log(`\n📤 Uploading ${matchingImages.length} image(s) for: ${product.name}`);

        const uploadedImages = [];

        // Upload each image for this product
        for (let i = 0; i < matchingImages.length; i++) {
          const imagePath = path.join(imagesDir, matchingImages[i]);
          
          try {
            // Read image file
            const imageBuffer = await fs.readFile(imagePath);
            
            // Upload to Cloudinary
            console.log(`  ⏳ Uploading ${matchingImages[i]}...`);
            const result = await uploadToCloudinary(imageBuffer, product.name, i + 1);
            
            uploadedImages.push({
              url: result.secure_url,
              publicId: result.public_id
            });

            uploadCount++;
            console.log(`  ✓ Uploaded: ${matchingImages[i]}`);
          } catch (uploadError) {
            const errorMsg = `Failed to upload ${matchingImages[i]}: ${uploadError.message}`;
            console.error(`  ✗ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }

        // Update product with images
        if (uploadedImages.length > 0) {
          const updateData = {
            hasImage: true,
            // Save all image URLs as array of strings (matching your model)
            images: uploadedImages.map(img => img.url)
          };

          await Product.findByIdAndUpdate(product._id, updateData);
          productUpdateCount++;
          console.log(`  ✓ Updated product with ${uploadedImages.length} image(s)`);
        }

      } catch (error) {
        const errorMsg = `Error processing ${product.name}: ${error.message}`;
        console.error(`  ✗ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('           UPLOAD SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`✓ Images uploaded: ${uploadCount}`);
    console.log(`✓ Products updated: ${productUpdateCount}`);
    console.log(`⊘ Skipped (already has images): ${skippedCount}`);
    console.log(`🗑️  Duplicate images removed: ${duplicatesRemoved}`);
    console.log(`✗ Errors: ${errors.length}`);
    console.log('═══════════════════════════════════════════\n');

    if (errors.length > 0) {
      console.log('Errors encountered:');
      errors.forEach(err => console.log(`  - ${err}`));
      console.log('');
    }

    return { uploaded: uploadCount, updated: productUpdateCount, errors: errors.length };

  } catch (error) {
    console.error('❌ Error in bulk upload:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    // Get images directory from command line or use default
    const imagesDir = process.argv[2] || path.join(__dirname, '../assets/products');

    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║       BULK IMAGE UPLOAD TO CLOUDINARY             ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`Images directory: ${imagesDir}\n`);

    await connectDB();
    await bulkUploadImages(imagesDir);
    
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

module.exports = { bulkUploadImages };
