# 📸 Bulk Image Upload Guide

## 🎯 How It Works

This script allows you to upload **multiple images per product** to Cloudinary and automatically update your products in the database.

---

## 📁 Setup Your Images

### 1️⃣ Create the assets folder structure:

```
backend/product-service/
  └── assets/
      └── products/
          ├── classic-white-dress-shirt-1.jpg
          ├── classic-white-dress-shirt-2.jpg
          ├── classic-white-dress-shirt-3.jpg
          ├── casual-blue-denim-shirt-1.jpg
          ├── casual-blue-denim-shirt-2.png
          └── ...
```

### 2️⃣ Image Naming Convention:

**Format:** `product-name-NUMBER.extension`

Examples:
- `classic-white-dress-shirt-1.jpg` ← First image
- `classic-white-dress-shirt-2.jpg` ← Second image
- `classic-white-dress-shirt-3.jpg` ← Third image

**Rules:**
- Use lowercase
- Replace spaces with hyphens `-`
- Add `-1`, `-2`, `-3` for multiple images
- Supported formats: jpg, jpeg, png, gif, webp

---

## 🔄 Image Matching

The script matches images to products using the product name. It will:

1. **Exact match:** Look for product name in filename
2. **Smart match:** Match by key words in the name
3. **Group images:** All files with same base name are grouped together

**Example:**

Product in database: **"Classic White Dress Shirt"**

Matching files:
- ✅ `classic-white-dress-shirt-1.jpg`
- ✅ `classic-white-dress-shirt-2.jpg`
- ✅ `classic-white-dress-shirt-3.jpg`

All 3 images will be uploaded for this product!

---

## 🚀 Usage

### Step 1: Import products (without images)

```bash
cd backend/product-service
npm run import:sample
```

This creates the test product: **"Classic White Dress Shirt"**

### Step 2: Add your images

Create the folder and add images:

```
backend/product-service/assets/products/
  ├── classic-white-dress-shirt-1.jpg
  ├── classic-white-dress-shirt-2.jpg
  └── classic-white-dress-shirt-3.jpg
```

### Step 3: Upload images

```bash
npm run upload:images
```

**That's it!** The script will:
- Find all images in `assets/products/`
- Match them to products in database
- Upload to Cloudinary
- Update products with image URLs

---

## 📊 What Happens

```
1. Script reads: assets/products/
   
2. Groups images:
   classic-white-dress-shirt: 3 images
   
3. Finds product in database:
   "Classic White Dress Shirt" ✓
   
4. Uploads to Cloudinary:
   ⏳ Uploading classic-white-dress-shirt-1.jpg...
   ✓ Uploaded
   ⏳ Uploading classic-white-dress-shirt-2.jpg...
   ✓ Uploaded
   ⏳ Uploading classic-white-dress-shirt-3.jpg...
   ✓ Uploaded
   
5. Updates product:
   - hasImage: true
   - imageUrl: (first image URL)
   - imagePublicId: (first image ID)
   - images: [all 3 images] ← if supported
   
6. Summary:
   ✓ Images uploaded: 3
   ✓ Products updated: 1
```

---

## 🎨 Advanced Usage

### Custom images directory:

```bash
node utils/bulkUploadImages.js path/to/your/images
```

### Example folder structure for multiple products:

```
assets/products/
  ├── classic-white-dress-shirt-1.jpg
  ├── classic-white-dress-shirt-2.jpg
  ├── classic-white-dress-shirt-3.jpg
  ├── casual-blue-denim-shirt-1.jpg
  ├── casual-blue-denim-shirt-2.jpg
  ├── navy-blue-sports-cap-1.png
  ├── navy-blue-sports-cap-2.png
  ├── leather-casual-watch-1.jpg
  ├── leather-casual-watch-2.jpg
  ├── leather-casual-watch-3.jpg
  └── running-shoes-1.webp
```

---

## ✅ Testing with One Product

### Current sample-products.json has:
```json
[
  {
    "name": "Classic White Dress Shirt",
    "description": "Elegant white dress shirt...",
    "brand": "Elegant Style",
    "gender": "Male",
    "color": "White",
    "usage": "Formal",
    "articleType": "Shirt"
  }
]
```

### Test steps:

1. **Import the product:**
   ```bash
   npm run import:sample
   ```

2. **Add 3 images to assets/products/:**
   - `classic-white-dress-shirt-1.jpg`
   - `classic-white-dress-shirt-2.jpg`
   - `classic-white-dress-shirt-3.jpg`

3. **Upload images:**
   ```bash
   npm run upload:images
   ```

4. **Check result:**
   - Product will have `hasImage: true`
   - Product will have image URLs from Cloudinary
   - All 3 images will be stored

---

## 📋 Complete Workflow

```bash
# 1. Import products
npm run import:sample

# 2. Add images to assets/products/
# (manually copy your image files)

# 3. Upload images to Cloudinary
npm run upload:images

# 4. View results
npm run view:export

# 5. Check in browser
# http://localhost:3002/api/products
```

---

## 💡 Tips

1. **Start with 1 product** - Test with the sample product first
2. **Image quality** - Images will be auto-resized to 800x800
3. **Naming matters** - Follow the naming convention exactly
4. **Multiple images** - Add as many as you want per product
5. **First image** - First image becomes the primary/featured image

---

## ⚠️ Important Notes

- Images are uploaded to Cloudinary (using your credentials in `.env`)
- Original images stay in your `assets` folder (not deleted)
- Product must exist in database before uploading images
- Image names must match product names (case-insensitive)
- Supported formats: jpg, jpeg, png, gif, webp

---

## 🎉 Ready to Test!

1. Import the sample product: `npm run import:sample`
2. Create folder: `backend/product-service/assets/products/`
3. Add 3 images named:
   - `classic-white-dress-shirt-1.jpg`
   - `classic-white-dress-shirt-2.jpg`
   - `classic-white-dress-shirt-3.jpg`
4. Run: `npm run upload:images`

Your product will now have 3 images on Cloudinary! 📸✨
