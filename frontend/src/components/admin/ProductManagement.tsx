
import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react'
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

type ProductFormState = {
  name: string
  description: string
  brand: string
  gender: string
  usage: string
  color: string
  defaultPrice: string
  categoryId: string
  isActive: boolean
}

const INITIAL_EDIT_FORM: ProductFormState = {
  name: '',
  description: '',
  brand: '',
  gender: 'Unisex',
  usage: '',
  color: '',
  defaultPrice: '',
  categoryId: '',
  isActive: true
}

type TabType = 'products' | 'categories' | 'variants'

function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}


const INITIAL_PRODUCT_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalProducts: 0,
  hasNextPage: false,
  hasPrevPage: false
}

const INITIAL_VARIANT_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalVariants: 0,
  hasNextPage: false,
  hasPrevPage: false
}

export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('products')
  
  // Products state
  const [products, setProducts] = useState<Product[]>([])
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState<string | null>(null)
  const [productPagination, setProductPagination] = useState({ ...INITIAL_PRODUCT_PAGINATION })
  const [productFilters, setProductFilters] = useState({
    categoryId: '',
    brand: '',
    gender: '',
    color: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1
  })

  // Categories state
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  // Variants state
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantLoading, setVariantLoading] = useState(true)
  const [variantError, setVariantError] = useState<string | null>(null)
  const [variantPagination, setVariantPagination] = useState({ ...INITIAL_VARIANT_PAGINATION })
  const [variantFilters, setVariantFilters] = useState({
    productId: '',
    status: 'Active',
    size: '',
    hasStock: false,
    page: 1
  })
  const [variantViewMode, setVariantViewMode] = useState<'all' | 'lowStock' | 'outOfStock'>('all')
  const [lowStockThreshold, setLowStockThreshold] = useState(10)

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState<ProductFormState>({ ...INITIAL_EDIT_FORM })
  const [showEditModal, setShowEditModal] = useState(false)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [imageRemovalTarget, setImageRemovalTarget] = useState<string | null>(null)

  const [editingVariant, setEditingVariant] = useState<Variant | null>(null)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [variantEditMode, setVariantEditMode] = useState<'add' | 'subtract' | 'set'>('add')
  const [variantEditQuantity, setVariantEditQuantity] = useState('')
  const [variantEditLoading, setVariantEditLoading] = useState(false)
  const [variantEditError, setVariantEditError] = useState<string | null>(null)

  const tabs = [
    { id: 'products' as TabType, label: 'Products', icon: '🛍️' },
    { id: 'categories' as TabType, label: 'Categories', icon: '📂' },
    { id: 'variants' as TabType, label: 'Variants', icon: '📦' }
  ]

  // Load products
  const loadProducts = useCallback(async (page: number = 1) => {
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
        const incomingProducts: Product[] = data.products || []

        setProducts(incomingProducts)

        if (data.pagination) {
          setProductPagination(data.pagination)
        } else {
          setProductPagination({
            currentPage: page,
            totalPages: 1,
            totalProducts: incomingProducts.length,
            hasNextPage: false,
            hasPrevPage: page > 1
          })
        }
      } else {
        throw new Error(response.message || 'Failed to load products')
      }
    } catch (error: any) {
      console.error('Error loading products:', error)
      setProductError(error.message || 'Có lỗi xảy ra khi tải sản phẩm')
    } finally {
      setProductLoading(false)
    }
  }, [productFilters.categoryId, productFilters.brand, productFilters.gender, productFilters.color, productFilters.sortBy, productFilters.sortOrder])

  // Load categories
  const loadCategories = useCallback(async () => {
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
  }, [])

  // Load variants
  const loadVariants = useCallback(async (page: number = 1) => {
    try {
      if (variantViewMode === 'all') {
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
          const data = response.data as {
            variants?: Variant[]
            pagination?: typeof INITIAL_VARIANT_PAGINATION
          }
          const incomingVariants: Variant[] = data.variants || []

          setVariants(incomingVariants)

          if (data.pagination) {
            setVariantPagination(data.pagination)
          } else {
            setVariantPagination({
              currentPage: page,
              totalPages: 1,
              totalVariants: incomingVariants.length,
              hasNextPage: false,
              hasPrevPage: page > 1
            })
          }
        } else {
          throw new Error(response.message || 'Failed to load variants')
        }
      } else if (variantViewMode === 'lowStock') {
        setVariantLoading(true)
        setVariantError(null)

        const response = await variantApi.getLowStockVariants(lowStockThreshold)

        if (response.success && response.data) {
          const data = response.data as { variants?: Variant[] }
          const incomingVariants: Variant[] = data.variants || []
          setVariants(incomingVariants)
          setVariantPagination({
            ...INITIAL_VARIANT_PAGINATION,
            totalVariants: incomingVariants.length,
            hasNextPage: false
          })
        } else {
          throw new Error(response.message || 'Failed to load low stock variants')
        }
      } else {
        setVariantLoading(true)
        setVariantError(null)

        const response = await variantApi.getOutOfStockVariants()

        if (response.success && response.data) {
          const data = response.data as { variants?: Variant[] }
          const incomingVariants: Variant[] = data.variants || []
          setVariants(incomingVariants)
          setVariantPagination({
            ...INITIAL_VARIANT_PAGINATION,
            totalVariants: incomingVariants.length,
            hasNextPage: false
          })
        } else {
          throw new Error(response.message || 'Failed to load out of stock variants')
        }
      }
    } catch (error: any) {
      console.error('Error loading variants:', error)
      setVariantError(error.message || 'Có lỗi xảy ra khi tải variants')
    } finally {
      setVariantLoading(false)
    }
  }, [variantFilters.productId, variantFilters.status, variantFilters.size, variantFilters.hasStock, variantViewMode, lowStockThreshold])

  useEffect(() => {
    if (activeTab === 'products') {
      setProducts([])
      setProductPagination(() => ({ ...INITIAL_PRODUCT_PAGINATION }))
      setProductFilters(prev => ({ ...prev, page: 1 }))
      loadProducts(1)
    }
  }, [activeTab, loadProducts])

  useEffect(() => {
    if (activeTab === 'products' && categories.length === 0) {
      loadCategories()
    }
  }, [activeTab, categories.length, loadCategories])

  useEffect(() => {
    if (activeTab === 'categories') {
      loadCategories()
    }
  }, [activeTab, loadCategories])

  useEffect(() => {
    if (activeTab === 'variants') {
      setVariants([])
      setVariantPagination({ ...INITIAL_VARIANT_PAGINATION })
      setVariantFilters(prev => ({ ...prev, page: 1 }))
      loadVariants(1)
    }
  }, [activeTab, loadVariants])

  // Reload products when filters change
  useEffect(() => {
    if (activeTab === 'products') {
      loadProducts(productFilters.page)
    }
  }, [activeTab, productFilters.page, productFilters.categoryId, productFilters.brand, productFilters.gender, productFilters.color, productFilters.sortBy, productFilters.sortOrder, loadProducts])

  // Reload variants when filters change
  useEffect(() => {
    if (activeTab === 'variants') {
      loadVariants(variantFilters.page)
    }
  }, [activeTab, variantFilters.page, variantFilters.productId, variantFilters.status, variantFilters.size, variantFilters.hasStock, variantViewMode, lowStockThreshold, loadVariants])

  const resetEditState = () => {
    setEditingProduct(null)
    setEditForm({ ...INITIAL_EDIT_FORM })
    setExistingImages([])
    setNewImages([])
    setEditError(null)
    setImageRemovalTarget(null)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    resetEditState()
  }

  const resetVariantEditState = () => {
    setEditingVariant(null)
    setVariantEditMode('add')
    setVariantEditQuantity('')
    setVariantEditError(null)
    setVariantEditLoading(false)
  }

  const closeVariantModal = () => {
    setShowVariantModal(false)
    resetVariantEditState()
  }

  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name ?? '',
      description: product.description ?? '',
      brand: product.brand ?? '',
      gender: product.gender ?? 'Unisex',
      usage: product.usage ?? '',
      color: product.color ?? '',
      defaultPrice: product.defaultPrice !== undefined && product.defaultPrice !== null ? String(product.defaultPrice) : '',
      categoryId: product.categoryId?._id ?? '',
      isActive: product.isActive
    })
    setExistingImages(product.images ?? [])
    setNewImages([])
    setEditError(null)
    setShowEditModal(true)

    if (categories.length === 0) {
      loadCategories()
    }
  }

  const handleVariantEditClick = (variant: Variant) => {
    setEditingVariant(variant)
    setVariantEditMode('add')
    setVariantEditQuantity('')
    setVariantEditError(null)
    setShowVariantModal(true)
  }

  const handleEditFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleVariantViewModeChange = (mode: 'all' | 'lowStock' | 'outOfStock') => {
    setVariantViewMode(mode)
    setVariants([])
    setVariantPagination({ ...INITIAL_VARIANT_PAGINATION })
    setVariantFilters(prev => ({ ...prev, page: 1 }))
  }

  const handleLowStockThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    if (!Number.isNaN(value) && value > 0) {
      setLowStockThreshold(value)
    } else if (event.target.value === '') {
      setLowStockThreshold(1)
    }
  }

  const handleActiveToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target
    setEditForm(prev => ({
      ...prev,
      isActive: checked
    }))
  }

  const handleNewImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      setNewImages([])
      return
    }
    setNewImages(Array.from(event.target.files))
  }

  const handleVariantEditModeToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'add' | 'subtract' | 'set'
    setVariantEditMode(value)
  }

  const handleVariantQuantityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVariantEditQuantity(event.target.value)
  }

  const handleRemoveExistingImage = async (imageUrl: string) => {
    if (!editingProduct) return

    try {
      setImageRemovalTarget(imageUrl)
      const response = await productApi.deleteProductImage(editingProduct._id, imageUrl)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to remove image')
      }

      const data = response.data as {
        remainingImages?: string[]
        hasImage?: boolean
      }

      const updatedImages = data.remainingImages ?? existingImages.filter(img => img !== imageUrl)
      setExistingImages(updatedImages)

      setProducts(prev => prev.map(product => {
        if (product._id !== editingProduct._id) return product
        return {
          ...product,
          images: updatedImages,
          hasImage: data.hasImage ?? (updatedImages.length > 0),
          primaryImage: updatedImages[0] ?? undefined
        }
      }))

      setEditingProduct(prev => prev ? {
        ...prev,
        images: updatedImages,
        hasImage: data.hasImage ?? (updatedImages.length > 0),
        primaryImage: updatedImages[0] ?? undefined
      } : prev)
    } catch (error) {
      console.error('Error removing product image:', error)
      setEditError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi xoá ảnh sản phẩm')
    } finally {
      setImageRemovalTarget(null)
    }
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingProduct) return

    try {
      setEditSubmitting(true)
      setEditError(null)

      const formData = new FormData()

      formData.append('name', editForm.name)
      formData.append('description', editForm.description)
      formData.append('brand', editForm.brand)
      formData.append('gender', editForm.gender)
      formData.append('usage', editForm.usage)
      formData.append('color', editForm.color)
      if (editForm.defaultPrice) {
        formData.append('defaultPrice', editForm.defaultPrice)
      }
      if (editForm.categoryId) {
        formData.append('categoryId', editForm.categoryId)
      }
      formData.append('isActive', String(editForm.isActive))

      newImages.forEach(file => {
        formData.append('images', file)
      })

      const response = await productApi.updateProduct(editingProduct._id, formData)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to update product')
      }

      const data = response.data as { product: Product }
      const updatedProduct = {
        ...data.product,
        primaryImage: data.product.images && data.product.images.length > 0 ? data.product.images[0] : undefined
      }

      setProducts(prev => prev.map(product => product._id === updatedProduct._id ? updatedProduct : product))

      setEditingProduct(updatedProduct)
      setExistingImages(updatedProduct.images ?? [])
      setNewImages([])
      closeEditModal()
    } catch (error) {
      console.error('Error updating product:', error)
      setEditError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật sản phẩm')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleVariantEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingVariant) return

    const quantityValue = Number(variantEditQuantity)
    if (variantEditMode !== 'set' && (Number.isNaN(quantityValue) || quantityValue <= 0)) {
      setVariantEditError('Vui lòng nhập số lượng lớn hơn 0')
      return
    }

    let delta = 0
    if (variantEditMode === 'set') {
      if (Number.isNaN(quantityValue) || quantityValue < 0) {
        setVariantEditError('Tồn kho phải là số không âm')
        return
      }
      delta = quantityValue - editingVariant.stock
      if (delta === 0) {
        setVariantEditError('Tồn kho không thay đổi')
        return
      }
    } else if (variantEditMode === 'add') {
      delta = quantityValue
    } else {
      if (quantityValue > editingVariant.stock) {
        setVariantEditError('Số lượng cần trừ vượt quá tồn kho hiện tại')
        return
      }
      delta = -quantityValue
    }

    try {
      setVariantEditLoading(true)
      setVariantEditError(null)

      const response = await variantApi.updateStock(editingVariant._id, delta)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to update stock')
      }

      const data = response.data as { variant?: { _id: string; stock: number } }
      const updatedStock = data.variant?.stock ?? editingVariant.stock + delta

      if (variantViewMode === 'all') {
        setVariants(prev => prev.map(variant => variant._id === editingVariant._id ? { ...variant, stock: updatedStock } : variant))
      } else {
        await loadVariants(1)
      }

      setEditingVariant(prev => prev ? { ...prev, stock: updatedStock } : prev)
      setVariantEditQuantity('')
      closeVariantModal()
    } catch (error) {
      console.error('Error updating variant stock:', error)
      setVariantEditError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật tồn kho')
    } finally {
      setVariantEditLoading(false)
    }
  }

  const renderProductsTab = () => (
    <div>
      {/* Products Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Products Management</h2>
        <button
          onClick={() => {
            setProductFilters(prev => ({ ...prev, page: 1 }))
            loadProducts(1)
          }}
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
        <>
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
                    <button
                      onClick={() => handleEditClick(product)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {productPagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Trang {productPagination.currentPage} / {productPagination.totalPages} (Tổng {productPagination.totalProducts} sản phẩm)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prevPage = productPagination.currentPage - 1
                    setProductFilters(prev => ({ ...prev, page: prevPage }))
                    loadProducts(prevPage)
                  }}
                  disabled={!productPagination.hasPrevPage}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Trước
                </button>
                <button
                  onClick={() => {
                    const nextPage = productPagination.currentPage + 1
                    setProductFilters(prev => ({ ...prev, page: nextPage }))
                    loadProducts(nextPage)
                  }}
                  disabled={!productPagination.hasNextPage}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
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
          onClick={() => {
            setVariants([])
            setVariantPagination({ ...INITIAL_VARIANT_PAGINATION })
            setVariantFilters(prev => ({ ...prev, page: 1 }))
            loadVariants(1)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm font-medium text-gray-600">
          <button
            type="button"
            onClick={() => handleVariantViewModeChange('all')}
            className={`px-3 py-1.5 rounded-md transition ${variantViewMode === 'all' ? 'bg-white text-blue-600 shadow' : 'hover:text-gray-900'}`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => handleVariantViewModeChange('lowStock')}
            className={`px-3 py-1.5 rounded-md transition ${variantViewMode === 'lowStock' ? 'bg-white text-blue-600 shadow' : 'hover:text-gray-900'}`}
          >
            Sắp hết hàng
          </button>
          <button
            type="button"
            onClick={() => handleVariantViewModeChange('outOfStock')}
            className={`px-3 py-1.5 rounded-md transition ${variantViewMode === 'outOfStock' ? 'bg-white text-blue-600 shadow' : 'hover:text-gray-900'}`}
          >
            Hết hàng
          </button>
        </div>

        {variantViewMode === 'lowStock' && (
          <div className="flex items-center gap-2">
            <label htmlFor="lowStockThreshold" className="text-sm font-medium text-gray-700">
              Ngưỡng tồn kho ≤
            </label>
            <input
              id="lowStockThreshold"
              type="number"
              min={1}
              value={lowStockThreshold}
              onChange={handleLowStockThresholdChange}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {variantViewMode !== 'all' && (
          <p className="text-sm text-gray-500">
            Hiển thị {variantViewMode === 'lowStock' ? 'các biến thể sắp hết hàng' : 'các biến thể đã hết hàng'} (tổng {variants.length})
          </p>
        )}
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
              disabled={variantViewMode !== 'all'}
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
              disabled={variantViewMode !== 'all'}
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
              disabled={variantViewMode !== 'all'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasStock"
              checked={variantFilters.hasStock}
              onChange={(e) => setVariantFilters(prev => ({ ...prev, hasStock: e.target.checked }))}
              disabled={variantViewMode !== 'all'}
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
        <>
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
                    <button
                      onClick={() => handleVariantEditClick(variant)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit Stock
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination - Only show for 'all' view mode */}
          {variantViewMode === 'all' && variantPagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Trang {variantPagination.currentPage} / {variantPagination.totalPages} (Tổng {variantPagination.totalVariants} variants)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prevPage = variantPagination.currentPage - 1
                    setVariantFilters(prev => ({ ...prev, page: prevPage }))
                    loadVariants(prevPage)
                  }}
                  disabled={!variantPagination.hasPrevPage}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Trước
                </button>
                <button
                  onClick={() => {
                    const nextPage = variantPagination.currentPage + 1
                    setVariantFilters(prev => ({ ...prev, page: nextPage }))
                    loadVariants(nextPage)
                  }}
                  disabled={!variantPagination.hasNextPage}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
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

      {showEditModal && editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Chỉnh sửa sản phẩm</h3>
                <p className="text-sm text-gray-500">Cập nhật thông tin và hình ảnh sản phẩm</p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
                  <input
                    name="brand"
                    value={editForm.brand}
                    onChange={handleEditFormChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                  <select
                    name="gender"
                    value={editForm.gender}
                    onChange={handleEditFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unisex">Unisex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sử dụng</label>
                  <input
                    name="usage"
                    value={editForm.usage}
                    onChange={handleEditFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Màu sắc</label>
                  <input
                    name="color"
                    value={editForm.color}
                    onChange={handleEditFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá mặc định (₫)</label>
                  <input
                    name="defaultPrice"
                    type="number"
                    min="0"
                    step="1000"
                    value={editForm.defaultPrice}
                    onChange={handleEditFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select
                    name="categoryId"
                    value={editForm.categoryId}
                    onChange={handleEditFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.masterCategory} - {category.subCategory} - {category.articleType}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <input
                    id="productActive"
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={handleActiveToggle}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="productActive" className="text-sm text-gray-700">Hiển thị sản phẩm</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Ảnh hiện tại</h4>
                  <p className="text-xs text-gray-500">Bạn có thể xoá ảnh cũ hoặc thêm ảnh mới bên dưới</p>
                </div>
                {existingImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {existingImages.map(image => (
                      <div key={image} className="relative rounded-lg border border-gray-200 overflow-hidden">
                        <img src={image} alt={editingProduct.name} className="h-32 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(image)}
                          disabled={imageRemovalTarget === image || editSubmitting}
                          className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-red-600 shadow disabled:opacity-60"
                        >
                          {imageRemovalTarget === image ? 'Đang xoá...' : 'Xoá ảnh'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sản phẩm hiện chưa có ảnh.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Thêm ảnh mới</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewImagesChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
                {newImages.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    {newImages.map(file => (
                      <li key={file.name}>{file.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  disabled={editSubmitting}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {editSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVariantModal && editingVariant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeVariantModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Điều chỉnh tồn kho</h3>
                <p className="text-sm text-gray-500">{editingVariant.productId?.name} · Size {editingVariant.size}</p>
              </div>
              <button
                type="button"
                onClick={closeVariantModal}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {variantEditError && (
              <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {variantEditError}
              </div>
            )}

            <form onSubmit={handleVariantEditSubmit} className="px-5 py-5 space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-600">Tồn kho hiện tại</span>
                <span className="text-lg font-semibold text-gray-900">{editingVariant.stock}</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Kiểu cập nhật</p>
                <div className="flex flex-col gap-2 text-sm text-gray-600">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="variantEditMode"
                      value="add"
                      checked={variantEditMode === 'add'}
                      onChange={handleVariantEditModeToggle}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tăng thêm số lượng</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="variantEditMode"
                      value="subtract"
                      checked={variantEditMode === 'subtract'}
                      onChange={handleVariantEditModeToggle}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Giảm bớt số lượng</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="variantEditMode"
                      value="set"
                      checked={variantEditMode === 'set'}
                      onChange={handleVariantEditModeToggle}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Đặt tồn kho chính xác</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {variantEditMode === 'set' ? 'Tồn kho mới' : 'Số lượng'}
                </label>
                <input
                  type="number"
                  min={variantEditMode === 'set' ? 0 : 1}
                  value={variantEditQuantity}
                  onChange={handleVariantQuantityChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
                {variantEditMode === 'set' && (
                  <p className="mt-1 text-xs text-gray-500">Nhập giá trị tồn kho mong muốn (≥ 0)</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeVariantModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  disabled={variantEditLoading}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={variantEditLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {variantEditLoading ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
