# Database Export/Import Utilities

This folder contains utilities for exporting and importing the product database (categories and products) to/from JSON files.

## 📋 Features

### Export Script (`exportDatabase.js`)
- Exports all categories to `categories.json`
- Exports all products with populated category data to `products.json`
- Generates a combined export file `database-export.json`
- Creates a CSV file `products.csv` for spreadsheet analysis
- Generates a summary report `export-summary.json` with statistics

### Import Script (`importDatabase.js`)
- Imports categories and products from JSON files
- Supports upsert (update or insert) to avoid duplicates
- Optional flag to clear existing data before import

## 🚀 Usage

### Export Database

```bash
# Navigate to product-service directory
cd backend/product-service

# Run the export script
npm run export:db
```

This will create an `exports` folder with the following files:
- `categories.json` - All categories
- `products.json` - All products with category details
- `database-export.json` - Combined data with statistics
- `products.csv` - Products in CSV format
- `export-summary.json` - Export summary and statistics

### Import Database

```bash
# Import data (keeps existing records, updates duplicates)
npm run import:db

# Import and clear existing data first (⚠️ WARNING: Destructive!)
npm run import:db:clear
```

## 📊 Export Files Structure

### categories.json
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "masterCategory": "Apparel",
    "subCategory": "Topwear",
    "articleType": "Shirts",
    "productCount": 150,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### products.json
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Casual Shirt",
    "description": "Comfortable cotton shirt",
    "brand": "Brand Name",
    "gender": "Male",
    "color": "Blue",
    "usage": "Casual",
    "categoryId": {
      "_id": "507f1f77bcf86cd799439011",
      "masterCategory": "Apparel",
      "subCategory": "Topwear",
      "articleType": "Shirts"
    },
    "hasImage": true,
    "isActive": true,
    "imageUrl": "https://cloudinary.com/...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### database-export.json
```json
{
  "exportDate": "2024-01-01T00:00:00.000Z",
  "statistics": {
    "totalCategories": 50,
    "totalProducts": 1000,
    "activeProducts": 950,
    "inactiveProducts": 50
  },
  "categories": [...],
  "products": [...]
}
```

### export-summary.json
```json
{
  "exportDate": "2024-01-01T00:00:00.000Z",
  "totalCategories": 50,
  "totalProducts": 1000,
  "activeProducts": 950,
  "inactiveProducts": 50,
  "productsWithImages": 800,
  "productsWithoutImages": 200,
  "productsByCategory": {
    "Shirts": 150,
    "Jeans": 120,
    "Shoes": 100
  },
  "topBrands": [
    { "name": "Nike", "count": 80 },
    { "name": "Adidas", "count": 75 }
  ],
  "genderDistribution": {
    "Male": 400,
    "Female": 500,
    "Unisex": 100
  }
}
```

## 🛠️ Manual Usage

You can also run the scripts directly:

```bash
# Export
node utils/exportDatabase.js

# Import
node utils/importDatabase.js

# Import with clearing existing data
node utils/importDatabase.js --clear
```

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running import with `--clear` flag
2. **MongoDB Connection**: Ensure your `.env` file has the correct `MONGODB_URI`
3. **File Location**: Export files are saved to `backend/product-service/exports/`
4. **Large Datasets**: For very large datasets, consider using MongoDB's native tools like `mongodump` and `mongorestore`

## 📝 Use Cases

1. **Backup**: Regular backups of your product catalog
2. **Migration**: Moving data between development, staging, and production
3. **Analysis**: Export to CSV for analysis in Excel/Google Sheets
4. **Versioning**: Keep snapshots of your database at different points in time
5. **Testing**: Create test datasets from production data
6. **Data Recovery**: Restore data after accidental deletion

## 🔧 Troubleshooting

**Error: Export files not found**
- Run the export script first before attempting to import

**Error: MongoDB connection failed**
- Check your `.env` file and ensure `MONGODB_URI` is correct
- Ensure MongoDB is running and accessible

**Error: Module not found**
- Run `npm install` in the product-service directory

**Import doesn't update existing records**
- The script uses `findOneAndUpdate` with `upsert: true`, which should update existing records
- Check that the `_id` fields match between export and import

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Product Service API](../README.md)
