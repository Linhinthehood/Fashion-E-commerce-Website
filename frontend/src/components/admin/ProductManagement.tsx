
import { useState, useEffect } from 'react'
import { productApi, categoryApi, variantApi } from '../../utils/apiService'

type Product = {
  _id: string
  name: string
  description: string
  brand: string
  gender: string
  usage: string
  categoryId: {
    _id: string
    masterCategory: string
    subCategory: string
    articleType: string
  }
  color: string
  defaultPrice: number
  images: string[]
  hasImage: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  primaryImage?: string
}

type Category = {
  _id: string
  masterCategory: string
  subCategory: string
  articleType: string
  description: string
  isActive: boolean
  productCount: number
  createdAt: string
  updatedAt: string
}

type Variant = {
  _id: string
  productId: {
    _id: string
    name: string
    brand: string
    gender: string
  }
  size: string
  stock: number
  status: 'Active' | 'Inactive'
  price?: number
  sku?: string
  createdAt: string
  updatedAt: string
}

type TabType = 'products' | 'categories' | 'variants'

function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}


export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('products')
  
  // Products state
  const [products, setProducts] = useState<Product[]>([])
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState<string | null>(null)
  const [productPagination, setProductPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [productFilters, setProductFilters] = useState({
    categoryId: '',
    brand: '',
    gender: '',
    color: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  })

  // Categories state
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  // Variants state
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantLoading, setVariantLoading] = useState(true)
  const [variantError, setVariantError] = useState<string | null>(null)
  const [variantPagination, setVariantPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalVariants: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [variantFilters, setVariantFilters] = useState({
    productId: '',
    status: 'Active',
    size: '',
    hasStock: false
  })

  const tabs = [
    { id: 'products' as TabType, label: 'Products', icon: '🛍️' },
    { id: 'categories' as TabType, label: 'Categories', icon: '📂' },
    { id: 'variants' as TabType, label: 'Variants', icon: '📦' }
  ]

  // Load products
  const loadProducts = async (page: number = 1) => {
    try {
      setProductLoading(true)
      setProductError(null)

      const params = {
        page,
        limit: 12,
        ...(productFilters.categoryId && { categoryId: productFilters.categoryId }),
        ...(productFilters.brand && { brand: productFilters.brand }),
        ...(productFilters.gender && { gender: productFilters.gender }),
        ...(productFilters.color && { color: productFilters.color }),
        sortBy: productFilters.sortBy,
        sortOrder: productFilters.sortOrder
      }

      const response = await productApi.getProducts(params)
      
      if (response.success && response.data) {
        const data = response.data as any
        setProducts(data.products || [])
        setProductPagination(data.pagination || productPagination)
      } else {
        throw new Error(response.message || 'Failed to load products')
      }
    } catch (error: any) {
      console.error('Error loading products:', error)
      setProductError(error.message || 'Có lỗi xảy ra khi tải sản phẩm')
    } finally {
      setProductLoading(false)
    }
  }

  // Load categories
  const loadCategories = async () => {
    try {
      setCategoryLoading(true)
      setCategoryError(null)

      const response = await categoryApi.getCategories()
      
      if (response.success && response.data) {
        const data = response.data as any
        setCategories(data.categories || [])
      } else {
        throw new Error(response.message || 'Failed to load categories')
      }
    } catch (error: any) {
      console.error('Error loading categories:', error)
      setCategoryError(error.message || 'Có lỗi xảy ra khi tải danh mục')
    } finally {
      setCategoryLoading(false)
    }
  }

  // Load variants
  const loadVariants = async (page: number = 1) => {
    try {
      setVariantLoading(true)
      setVariantError(null)

      const params = {
        page,
        limit: 12,
        ...(variantFilters.productId && { productId: variantFilters.productId }),
        status: variantFilters.status,
        ...(variantFilters.size && { size: variantFilters.size }),
        hasStock: variantFilters.hasStock
      }

      const response = await variantApi.getVariants(params)
      
      if (response.success && response.data) {
        const data = response.data as any
        setVariants(data.variants || [])
        setVariantPagination(data.pagination || variantPagination)
      } else {
        throw new Error(response.message || 'Failed to load variants')
      }
    } catch (error: any) {
      console.error('Error loading variants:', error)
      setVariantError(error.message || 'Có lỗi xảy ra khi tải variants')
    } finally {
      setVariantLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'products') {
      loadProducts()
    } else if (activeTab === 'categories') {
      loadCategories()
    } else if (activeTab === 'variants') {
      loadVariants()
    }
  }, [activeTab, productFilters, variantFilters])

  const renderProductsTab = () => (
    <div>
      {/* Products Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Products Management</h2>
        <button
          onClick={() => loadProducts(productPagination.currentPage)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Products Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={productFilters.categoryId}
              onChange={(e) => setProductFilters(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.masterCategory} - {category.subCategory} - {category.articleType}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input
              type="text"
              value={productFilters.brand}
              onChange={(e) => setProductFilters(prev => ({ ...prev, brand: e.target.value }))}
              placeholder="Enter brand..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={productFilters.gender}
              onChange={(e) => setProductFilters(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="text"
              value={productFilters.color}
              onChange={(e) => setProductFilters(prev => ({ ...prev, color: e.target.value }))}
              placeholder="Enter color..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Products List */}
      {productLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {productError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {productError}
        </div>
      )}

      {!productLoading && !productError && products.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có sản phẩm nào</h3>
          <p className="text-gray-600">Thử thay đổi bộ lọc để xem thêm sản phẩm</p>
        </div>
      )}

      {!productLoading && !productError && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {product.primaryImage && (
                <img 
                  src={product.primaryImage} 
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
                <p className="text-sm text-gray-500 mb-2">
                  {product.categoryId?.masterCategory} - {product.categoryId?.subCategory} - {product.categoryId?.articleType}
                </p>
                <p className="text-sm text-gray-500 mb-2">Gender: {product.gender}</p>
                <p className="text-sm text-gray-500 mb-2">Color: {product.color}</p>
                <p className="text-lg font-bold text-red-600 mb-4">{formatCurrencyVND(product.defaultPrice)}</p>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    product.isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderCategoriesTab = () => (
    <div>
      {/* Categories Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Categories Management</h2>
        <button
          onClick={() => loadCategories()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Categories List */}
      {categoryLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {categoryError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {categoryError}
        </div>
      )}

      {!categoryLoading && !categoryError && categories.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có danh mục nào</h3>
        </div>
      )}

      {!categoryLoading && !categoryError && categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {category.masterCategory}
              </h3>
              <p className="text-sm text-gray-600 mb-1">{category.subCategory}</p>
              <p className="text-sm text-gray-500 mb-3">{category.articleType}</p>
              {category.description && (
                <p className="text-sm text-gray-500 mb-3">{category.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {category.productCount} products
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  category.isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                }`}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderVariantsTab = () => (
    <div>
      {/* Variants Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Variants Management</h2>
        <button
          onClick={() => loadVariants(variantPagination.currentPage)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Variants Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={variantFilters.productId}
              onChange={(e) => setVariantFilters(prev => ({ ...prev, productId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Products</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name} - {product.brand}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={variantFilters.status}
              onChange={(e) => setVariantFilters(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
            <input
              type="text"
              value={variantFilters.size}
              onChange={(e) => setVariantFilters(prev => ({ ...prev, size: e.target.value }))}
              placeholder="Enter size..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasStock"
              checked={variantFilters.hasStock}
              onChange={(e) => setVariantFilters(prev => ({ ...prev, hasStock: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="hasStock" className="text-sm font-medium text-gray-700">
              Has Stock Only
            </label>
          </div>
        </div>
      </div>

      {/* Variants List */}
      {variantLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {variantError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {variantError}
        </div>
      )}

      {!variantLoading && !variantError && variants.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có variants nào</h3>
          <p className="text-gray-600">Thử thay đổi bộ lọc để xem thêm variants</p>
        </div>
      )}

      {!variantLoading && !variantError && variants.length > 0 && (
        <div className="space-y-4">
          {variants.map((variant) => (
            <div key={variant._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {variant.productId?.name} - {variant.productId?.brand}
                  </h3>
                  <p className="text-sm text-gray-600">Size: {variant.size}</p>
                  {variant.sku && <p className="text-sm text-gray-500">SKU: {variant.sku}</p>}
                  <p className="text-sm text-gray-500">
                    Stock: <span className={`font-semibold ${variant.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variant.stock}
                    </span>
                  </p>
                  {variant.price && (
                    <p className="text-sm text-gray-500">Price: {formatCurrencyVND(variant.price)}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    variant.status === 'Active' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                  }`}>
                    {variant.status}
                  </span>
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                    Edit Stock
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'products' && renderProductsTab()}
        {activeTab === 'categories' && renderCategoriesTab()}
        {activeTab === 'variants' && renderVariantsTab()}
      </div>
    </div>
  )
}
