# 📝 Quick Command Reference

## 📍 First - Navigate to Product Service
```bash
cd d:\Secret\duan\Fashion-E-commerce-Website\backend\product-service
```
⚠️ **Always run commands from this directory!**

---

## 🔧 Main Commands

### 1. Import Products (Data Only - No Images)
```bash
cmd /c "npm run import:sample"
```
✅ Creates products in database with `hasImage: false`

### 2. Upload Images to Cloudinary
```bash
cmd /c "npm run upload:images"
```
✅ Uploads images from `assets/products/` and updates products
📁 Make sure images are in: `assets/products/` folder first!

### 3. View Database Summary
```bash
cmd /c "npm run view:export"
```
✅ Shows statistics: products, categories, images, etc.

### 4. Export Database to JSON
```bash
cmd /c "npm run export:db"
```
✅ Saves to: `exports/` folder (JSON + CSV files)

### 5. Import Database Backup
```bash
cmd /c "npm run import:db"
```
✅ Imports from: `exports/` folder

### 6. Import Variants
```bash
cmd /c "npm run import:variants"
```
✅ Creates size variants for all products from `data/sample-variants.json`

### 7. View Products with Variants
```bash
cmd /c "npm run view:variants"
```
✅ Shows all products grouped by category with their size variants

---

## 🎯 Complete Workflow

```bash
# Step 1: Navigate
cd d:\Secret\duan\Fashion-E-commerce-Website\backend\product-service

# Step 2: Import product data
cmd /c "npm run import:sample"

# Step 3: Add images to assets/products/
# (Manually copy your images here)

# Step 4: Upload images
cmd /c "npm run upload:images"

# Step 5: Verify
cmd /c "npm run view:export"
```

---

## 📁 Important Paths

- **Product Service:** `d:\Secret\duan\Fashion-E-commerce-Website\backend\product-service`
- **Product Data:** `data/sample-products.json`
- **Images Folder:** `assets/products/` ← Put images here
- **Export Folder:** `exports/` ← Exported data goes here

---

## 🔍 Check Results

### Via API (Browser):
```
http://localhost:3002/api/products
http://localhost:3002/api/categories
```

### Via Export File:
```bash
cmd /c "npm run export:db"
# Then open: exports/products.json
```

---

## 📸 Image Naming Convention

For product: **"Áo Khoác Blazer Dáng Rộng No Style M67 Đen"**

Name images as:
```
ao-khoac-blazer-dang-rong-no-style-m67-den-1.jpg
ao-khoac-blazer-dang-rong-no-style-m67-den-2.jpg
ao-khoac-blazer-dang-rong-no-style-m67-den-3.jpg
```

**Rules:**
- Lowercase
- Remove accents (á→a, ó→o, ă→a, đ→d)
- Spaces → hyphens (-)
- Add numbers: -1, -2, -3

---

## ⚡ Quick Reference

| Command | What It Does |
|---------|-------------|
| `import:sample` | Add products to database |
| `upload:images` | Upload images + update products |
| `import:variants` | Add size variants to products |
| `view:variants` | View products with variants |
| `view:export` | Show database stats |
| `export:db` | Backup database to JSON |
| `import:db` | Restore from backup |

---

## 💡 Remember

✅ Always `cd` to product-service first  
✅ Use `cmd /c "..."` in PowerShell  
✅ Import data **before** uploading images  
✅ Put images in `assets/products/`  
✅ Follow naming convention for images  

---

## 🆘 Troubleshooting

**"Scripts disabled" error?**
→ Use `cmd /c "npm run ..."`

**"Images not found" error?**
→ Check images are in `assets/products/` folder

**"No matching category" error?**
→ Check `articleType` matches: Shirt, Pants, Baseball cap, Watch, Shoes, Wallet

**Want to verify upload?**
→ Visit `http://localhost:3002/api/products`

---

**That's all you need!** 🚀
