# 📦 Product Import Guide

## 🎯 Quick Start

Import the sample products I created for you (20 products matching your categories):

```bash
cd backend/product-service
npm run import:sample
```

This will import 20 sample products that automatically match your existing categories!

---

## 📋 Sample Products Included

The `data/sample-products.json` file contains 20 products across all your categories:

### 👕 Shirts (6 products)
- Classic White Dress Shirt (Formal, Male)
- Casual Blue Denim Shirt (Casual, Male)
- Checkered Pattern Shirt (Casual, Unisex)
- Women's Elegant Shirt (Casual, Female)
- Sports Performance Shirt (Sports, Unisex)

### 👖 Pants (3 products)
- Slim Fit Black Pants (Formal, Male)
- Casual Khaki Chinos (Casual, Male)
- Women's Slim Fit Pants (Casual, Female)

### 🧢 Baseball Caps (4 products)
- Navy Blue Sports Cap (Sports, Unisex)
- Red Baseball Cap (Casual, Unisex)
- Vintage Baseball Cap (Casual, Unisex)

### ⌚ Watches (3 products)
- Leather Casual Watch (Casual, Male)
- Digital Sports Watch (Sports, Unisex)
- Smart Watch Digital (Daily, Unisex)

### 👟 Shoes (3 products)
- Classic Running Shoes (Sports, Unisex)
- Formal Leather Shoes (Formal, Male)
- Sneakers Casual (Casual, Unisex)
- Hiking Boots (Sports, Unisex)

### 👛 Wallets (2 products)
- Genuine Leather Wallet (Daily, Male)
- Slim Card Holder Wallet (Daily, Unisex)

---

## 🔧 How to Import Your Own Products

### Step 1: Create Your JSON File

Create a JSON file (e.g., `my-products.json`) with this format:

```json
[
  {
    "name": "Product Name",
    "description": "Product description",
    "brand": "Brand Name",
    "gender": "Male",
    "color": "Blue",
    "usage": "Casual",
    "articleType": "Shirt",
    "hasImage": false,
    "isActive": true
  }
]
```

### Step 2: Match Categories

The import script will automatically match products to categories using:

**Method 1: By articleType** (Recommended)
```json
{
  "name": "Cool Shirt",
  "articleType": "Shirt"
}
```

**Method 2: By category object**
```json
{
  "name": "Cool Shirt",
  "category": {
    "masterCategory": "Apparel",
    "subCategory": "Topwear",
    "articleType": "Shirt"
  }
}
```

**Method 3: By categoryId**
```json
{
  "name": "Cool Shirt",
  "categoryId": "68dfcc3f84cd07dea32e23b0"
}
```

### Step 3: Run Import

```bash
# Import your custom file
node utils/importProducts.js path/to/my-products.json

# Or add to package.json and use npm
npm run import:products path/to/my-products.json
```

---

## 📊 Your Current Categories

The import script will match products to these categories:

| Master Category | Sub Category | Article Type |
|----------------|--------------|--------------|
| Accessories | Hat | **Baseball cap** |
| Apparel | Topwear | **Shirt** |
| Accessories | Watch | **Watch** |
| Apparel | Bottomwear | **Pants** |
| Footwear | Shoes | **Shoes** |
| Accessories | Wallets | **Wallet** |

---

## 📝 JSON Field Reference

### Required Fields:
- `name` - Product name (string)
- `articleType` - Must match one of your categories (Shirt, Pants, Baseball cap, Watch, Shoes, Wallet)

### Optional Fields:
- `description` - Product description (default: "")
- `brand` - Brand name (default: "Unknown")
- `gender` - "Male", "Female", or "Unisex" (default: "Unisex")
- `color` - Color description (default: "Default")
- `usage` - Usage type: Casual, Formal, Sports, Daily (default: "Casual")
- `hasImage` - Boolean (default: false)
- `imageUrl` - Cloudinary URL (default: "")
- `imagePublicId` - Cloudinary public ID (default: "")
- `isActive` - Boolean (default: true)

---

## 💡 Examples

### Example 1: Simple Import
```json
[
  {
    "name": "Blue T-Shirt",
    "brand": "Nike",
    "articleType": "Shirt"
  },
  {
    "name": "Running Shoes",
    "brand": "Adidas",
    "articleType": "Shoes"
  }
]
```

### Example 2: Detailed Import
```json
[
  {
    "name": "Premium Leather Jacket",
    "description": "High-quality leather jacket with zipper closure",
    "brand": "Leather King",
    "gender": "Male",
    "color": "Black",
    "usage": "Casual",
    "articleType": "Shirt",
    "hasImage": true,
    "imageUrl": "https://res.cloudinary.com/...",
    "isActive": true
  }
]
```

### Example 3: Bulk Import
```json
[
  {"name": "Product 1", "brand": "Brand A", "articleType": "Shirt"},
  {"name": "Product 2", "brand": "Brand A", "articleType": "Pants"},
  {"name": "Product 3", "brand": "Brand B", "articleType": "Shoes"},
  {"name": "Product 4", "brand": "Brand B", "articleType": "Watch"},
  {"name": "Product 5", "brand": "Brand C", "articleType": "Wallet"}
]
```

---

## 🚀 Usage Commands

```bash
# Navigate to product-service
cd backend/product-service

# Import sample products (20 products)
npm run import:sample

# Import your own products
node utils/importProducts.js data/my-products.json

# Or using npm script
npm run import:products data/my-products.json
```

---

## ✅ Import Process

1. **Reads your JSON file**
2. **Connects to MongoDB**
3. **Loads existing categories**
4. **For each product:**
   - Finds matching category
   - Validates data
   - Inserts or updates product
5. **Updates category product counts**
6. **Shows summary report**

---

## 📈 After Import

Check the results:

```bash
# View database stats
npm run view:export

# Or start the server and check via API
npm start

# Then visit:
# http://localhost:3002/api/products
# http://localhost:3002/api/categories
```

---

## ⚠️ Troubleshooting

### "No matching category found"
- Check that `articleType` matches exactly: Shirt, Pants, Baseball cap, Watch, Shoes, or Wallet
- Case-insensitive matching is supported

### "File not found"
- Use correct path: `node utils/importProducts.js data/my-products.json`
- Or use absolute path: `node utils/importProducts.js D:/path/to/file.json`

### "JSON parse error"
- Validate your JSON at https://jsonlint.com/
- Ensure proper comma placement
- Use double quotes for strings

### Products not showing up
- Check if `isActive: true`
- Verify category was matched correctly
- Check database connection

---

## 🎯 Tips

1. **Start Small**: Import 5-10 products first to test
2. **Use Sample**: Modify `sample-products.json` as a template
3. **Validate JSON**: Always validate JSON syntax before importing
4. **Backup First**: Run `npm run export:db` before large imports
5. **Check Logs**: Watch console output for errors

---

## 📚 Next Steps

1. **Import sample products**: `npm run import:sample`
2. **View results**: `npm run view:export`
3. **Create your own products JSON**
4. **Import your products**: `node utils/importProducts.js your-file.json`
5. **Add images via API** (use the product creation endpoint with image upload)

---

## 🎉 Ready to Import!

Run this command now to import 20 sample products:

```bash
npm run import:sample
```

This will add products to all your categories automatically! 🚀
