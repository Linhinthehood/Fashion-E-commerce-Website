# 🚀 QUICK REFERENCE - Product Import

## 📝 Minimal Product JSON
```json
[
  {
    "name": "Product Name",
    "articleType": "Shirt"
  }
]
```

## 📋 Your Categories (articleType values)
- `Shirt`
- `Pants`
- `Baseball cap`
- `Watch`
- `Shoes`
- `Wallet`

## 🎯 Gender Options
- `Male`
- `Female`
- `Unisex`

## 🏷️ Usage Options
- `Casual`
- `Formal`
- `Sports`
- `Daily`

## ⚡ Quick Commands

```bash
# Import sample products (20 products ready to use!)
npm run import:sample

# Import your own JSON file
node utils/importProducts.js data/your-file.json

# View what's in database
npm run view:export

# Export current database
npm run export:db
```

## 📁 Files Provided

1. **`data/sample-products.json`** - 20 ready-to-import products
2. **`data/product-template.json`** - Template for creating your own
3. **`utils/importProducts.js`** - Import script
4. **`IMPORT_PRODUCTS_GUIDE.md`** - Full documentation

## ✅ Complete Product Example

```json
{
  "name": "Classic White Shirt",
  "description": "Elegant white cotton shirt",
  "brand": "Fashion Brand",
  "gender": "Male",
  "color": "White",
  "usage": "Formal",
  "articleType": "Shirt",
  "hasImage": false,
  "isActive": true
}
```

## 🔥 One Command to Import Everything

```bash
npm run import:sample
```

That's it! 20 products will be imported and matched to your categories automatically! 🎉
