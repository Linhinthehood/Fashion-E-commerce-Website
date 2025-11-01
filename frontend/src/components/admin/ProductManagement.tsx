
import { useState, useEffect, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react'
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
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [productFilters, setProductFilters] = useState({
    categoryId: '',
    brand: '',
    gender: '',
    color: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  })
  const productLoadMoreRef = useRef<HTMLDivElement | null>(null)

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
    hasStock: false
  })
  const [isVariantLoadingMore, setIsVariantLoadingMore] = useState(false)
  const variantLoadMoreRef = useRef<HTMLDivElement | null>(null)

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState<ProductFormState>({ ...INITIAL_EDIT_FORM })
  const [showEditModal, setShowEditModal] = useState(false)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [imageRemovalTarget, setImageRemovalTarget] = useState<string | null>(null)

  const tabs = [
    { id: 'products' as TabType, label: 'Products', icon: '🛍️' },
    { id: 'categories' as TabType, label: 'Categories', icon: '📂' },
    { id: 'variants' as TabType, label: 'Variants', icon: '📦' }
  ]

  // Load products
  const loadProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setProductLoading(true)
      }
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

        setProducts(prevProducts => {
          if (!append) {
            return incomingProducts
          }

          const existingIds = new Set(prevProducts.map(product => product._id))
          const mergedProducts = [...prevProducts]

          incomingProducts.forEach(product => {
            if (!existingIds.has(product._id)) {
              mergedProducts.push(product)
            }
          })

          return mergedProducts
        })

        if (data.pagination) {
          setProductPagination(prev => ({
            ...prev,
            ...data.pagination
          }))
        } else {
          setProductPagination(prev => ({
            ...prev,
            currentPage: page,
            hasPrevPage: page > 1
          }))
        }
      } else {
        throw new Error(response.message || 'Failed to load products')
      }
    } catch (error: any) {
      console.error('Error loading products:', error)
      setProductError(error.message || 'Có lỗi xảy ra khi tải sản phẩm')
    } finally {
      if (append) {
        setIsLoadingMore(false)
      } else {
        setProductLoading(false)
      }
    }
  }, [productFilters])

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
  const loadVariants = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setIsVariantLoadingMore(true)
      } else {
        setVariantLoading(true)
      }
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
        const incomingVariants: Variant[] = data.variants || []

        setVariants(prevVariants => {
          if (!append) {
            return incomingVariants
          }

          const existingIds = new Set(prevVariants.map(variant => variant._id))
          const mergedVariants = [...prevVariants]

          incomingVariants.forEach(variant => {
            if (!existingIds.has(variant._id)) {
              mergedVariants.push(variant)
            }
          })

          return mergedVariants
        })

        if (data.pagination) {
          setVariantPagination(prev => ({
            ...prev,
            ...data.pagination
          }))
        } else {
          setVariantPagination(prev => ({
            ...prev,
            currentPage: page,
            hasPrevPage: page > 1,
            hasNextPage: incomingVariants.length === 12
          }))
        }
      } else {
        throw new Error(response.message || 'Failed to load variants')
      }
    } catch (error: any) {
      console.error('Error loading variants:', error)
      setVariantError(error.message || 'Có lỗi xảy ra khi tải variants')
    } finally {
      if (append) {
        setIsVariantLoadingMore(false)
      } else {
        setVariantLoading(false)
      }
    }
  }, [variantFilters])

  useEffect(() => {
    if (activeTab === 'products') {
      setProducts([])
      setProductPagination(() => ({ ...INITIAL_PRODUCT_PAGINATION }))
      loadProducts(1, false)
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
      loadVariants(1, false)
    }
  }, [activeTab, loadVariants])

  useEffect(() => {
    if (activeTab !== 'variants') return

    const sentinel = variantLoadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(entries => {
      const [entry] = entries
      if (
        entry?.isIntersecting &&
        !variantLoading &&
        !isVariantLoadingMore &&
        variantPagination.hasNextPage
      ) {
        loadVariants(variantPagination.currentPage + 1, true)
      }
    }, { rootMargin: '200px 0px' })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [activeTab, variantLoading, isVariantLoadingMore, variantPagination.currentPage, variantPagination.hasNextPage, loadVariants])

  useEffect(() => {
    if (activeTab !== 'products') return

    const sentinel = productLoadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(entries => {
      const [entry] = entries
      if (
        entry?.isIntersecting &&
        !productLoading &&
        !isLoadingMore &&
        productPagination.hasNextPage
      ) {
        loadProducts(productPagination.currentPage + 1, true)
      }
    }, { rootMargin: '200px 0px' })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [activeTab, productLoading, isLoadingMore, productPagination.currentPage, productPagination.hasNextPage, loadProducts])

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

  const handleEditFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
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

  const renderProductsTab = () => (
    <div>
      {/* Products Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Products Management</h2>
        <button
          onClick={() => loadProducts(1, false)}
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
          {isLoadingMore && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          )}
          {!productPagination.hasNextPage && (
            <div className="py-4 text-center text-sm text-gray-500">
              Đã hiển thị tất cả sản phẩm
            </div>
          )}
          <div ref={productLoadMoreRef} className="h-1" />
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
            loadVariants(1, false)
          }}
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
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                      Edit Stock
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {isVariantLoadingMore && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          )}
          {!variantPagination.hasNextPage && (
            <div className="py-4 text-center text-sm text-gray-500">
              Đã hiển thị tất cả variants
            </div>
          )}
          <div ref={variantLoadMoreRef} className="h-1" />
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
    </div>
  )
}
