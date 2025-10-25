import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { productApi } from '../utils/apiService'

type Product = {
  _id: string
  name: string
  brand: string
  description: string
  primaryImage?: string | null
  defaultPrice?: number
  gender: 'Male' | 'Female' | 'Unisex'
  color: string
  usage: string
  categoryId?: string
  categoryName?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type SubCategory = {
  id: string
  name: string
  productCount: number
  articleTypes: Array<{
    id: string
    articleType: string
    productCount: number
  }>
}

export default function CategoryPage() {
  const { masterCategory, subCategory } = useParams<{ masterCategory: string; subCategory?: string }>()
  const [products, setProducts] = useState<Product[]>([])
  const [subCategories, setSubCategories] = useState<SubCategory[]>([])
  const [page, setPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const navigate = useNavigate()
  
  // Filter states
  const [filters, setFilters] = useState({
    brand: '',
    gender: '',
    color: '',
    search: ''
  })

  // Intersection Observer refs
  const observerRef = useRef<HTMLDivElement>(null)
  const intersectionObserver = useRef<IntersectionObserver | null>(null)

  // Load sub-categories for the master category
  const loadSubCategories = useCallback(async () => {
    if (!masterCategory) return

    try {
      const response = await productApi.getSubCategoriesByMaster(masterCategory)
      if (response.success && response.data) {
        const data = response.data as {
          masterCategory: string
          subCategories: SubCategory[]
        }
        setSubCategories(data.subCategories)
      }
    } catch (error) {
      console.error('Error loading sub-categories:', error)
    }
  }, [masterCategory])

  // Load products based on current category
  const fetchProducts = useCallback(async (pageNum: number, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }
      
      // If we have a specific sub-category, get its products
      if (subCategory && masterCategory) {
        const apiParams: any = {
          page: pageNum,
          limit: 50
        }
        
        if (filters.brand) apiParams.brand = filters.brand
        if (filters.gender) apiParams.gender = filters.gender
        if (filters.color) apiParams.color = filters.color
        if (filters.search) apiParams.search = filters.search
        
        const response = await productApi.getProductsBySubCategory(masterCategory, subCategory, apiParams)
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to load products')
        }
        
        const data = response.data as {
          products: Product[]
          pagination: {
            currentPage: number
            totalPages: number
            totalProducts: number
            hasNextPage: boolean
            hasPrevPage: boolean
          }
        }
        
        if (isLoadMore) {
          setProducts(prev => [...prev, ...data.products])
        } else {
          setProducts(data.products)
        }
        
        setTotalProducts(data.pagination.totalProducts)
        setHasMore(data.pagination.hasNextPage)
      } else {
        // Load all products for master category (filtered by master category)
        const apiParams: any = {
          page: pageNum,
          limit: 50
        }
        
        if (filters.brand) apiParams.brand = filters.brand
        if (filters.gender) apiParams.gender = filters.gender
        if (filters.color) apiParams.color = filters.color
        if (filters.search) apiParams.search = filters.search
        
        const response = await productApi.getProducts(apiParams)
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to load products')
        }
        
        const data = response.data as {
          products: Product[]
          total: number
          totalPages: number
          currentPage: number
        }
        
        // Filter products by master category name (basic filtering)
        let filteredProducts = data.products.filter(product => {
          const productName = product.name.toLowerCase()
          const masterCategoryLower = masterCategory?.toLowerCase() || ''
          
          // Basic filtering based on master category
          if (masterCategoryLower === 'apparel') {
            return productName.includes('áo') || 
                   productName.includes('quần') ||
                   productName.includes('shirt') ||
                   productName.includes('pants')
          } else if (masterCategoryLower === 'accessories') {
            return productName.includes('mũ') || 
                   productName.includes('đồng hồ') ||
                   productName.includes('ví') ||
                   productName.includes('hat') ||
                   productName.includes('watch') ||
                   productName.includes('wallet') ||
                   productName.includes('cap')
          } else if (masterCategoryLower === 'footwear') {
            return productName.includes('giày') || 
                   productName.includes('shoe') ||
                   productName.includes('sneaker') ||
                   productName.includes('boot')
          }
          
          return true
        })
        
        if (isLoadMore) {
          setProducts(prev => [...prev, ...filteredProducts])
        } else {
          setProducts(filteredProducts)
        }
        
        setTotalProducts(filteredProducts.length)
        setHasMore(false) // Disable infinite scroll since we're filtering on frontend
      }
      
    } catch (e: any) {
      console.error('Error fetching products:', e)
      setError(e?.message || 'Failed to load products')
      if (!isLoadMore) {
        setProducts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [masterCategory, subCategory, subCategories, filters])

  // Load sub-categories on mount
  useEffect(() => {
    loadSubCategories()
  }, [loadSubCategories])

  // Initial load and filter changes
  useEffect(() => {
    setPage(1)
    setProducts([])
    setHasMore(true)
    fetchProducts(1, false)
  }, [masterCategory, subCategory, filters])

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchProducts(page, true)
    }
  }, [page])

  // Intersection Observer setup
  useEffect(() => {
    const currentObserver = observerRef.current

    if (currentObserver) {
      intersectionObserver.current = new IntersectionObserver(
        (entries) => {
          const target = entries[0]
          if (target.isIntersecting && hasMore && !loading && !loadingMore) {
            setPage(prev => prev + 1)
          }
        },
        {
          threshold: 0.1,
          rootMargin: '100px'
        }
      )

      intersectionObserver.current.observe(currentObserver)
    }

    return () => {
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect()
      }
    }
  }, [hasMore, loading, loadingMore])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      brand: '',
      gender: '',
      color: '',
      search: ''
    })
  }

  const handleSubCategoryClick = (subCategoryName: string) => {
    navigate(`/c/${masterCategory}/${subCategoryName.toLowerCase()}`)
  }

  const getCategoryTitle = () => {
    if (subCategory) {
      return `${subCategory} Collection`
    }
    return `${masterCategory} Collection`
  }

  const getCategoryDescription = () => {
    if (subCategory) {
      return `Explore our ${subCategory.toLowerCase()} collection`
    }
    return `Discover our premium ${masterCategory?.toLowerCase()} collection`
  }

  const getCategoryColor = () => {
    const masterCategoryLower = masterCategory?.toLowerCase() || ''
    switch (masterCategoryLower) {
      case 'apparel':
        return 'blue'
      case 'accessories':
        return 'purple'
      case 'footwear':
        return 'green'
      default:
        return 'blue'
    }
  }

  const colorClass = getCategoryColor()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getCategoryTitle()}
          </h1>
          <p className="text-gray-600">
            {getCategoryDescription()} - {totalProducts} items available
          </p>
          
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mt-3">
            <a href="/" className="hover:text-gray-700">Trang chủ</a>
            <span>/</span>
            <span className="text-gray-900">{masterCategory}</span>
            {subCategory && (
              <>
                <span>/</span>
                <span className="text-gray-900 capitalize">{subCategory}</span>
              </>
            )}
          </nav>
        </div>

        {/* Sub-categories - Only show when no subCategory is selected */}
        {subCategories.length > 0 && !subCategory && (
          <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse by Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subCategories.map((subCat) => (
                <button
                  key={subCat.id}
                  onClick={() => handleSubCategoryClick(subCat.name)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
                >
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 mb-2">
                    {subCat.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {subCat.articleTypes.map(at => at.articleType).join(', ')}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    {subCat.productCount} products
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder={`Search ${masterCategory?.toLowerCase()}...`}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-${colorClass}-500`}
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                placeholder="Enter brand..."
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-${colorClass}-500`}
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-${colorClass}-500`}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                placeholder="Enter color..."
                value={filters.color}
                onChange={(e) => handleFilterChange('color', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-${colorClass}-500`}
              />
            </div>
          </div>
          
          {/* Clear Filters Button */}
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className={`px-4 py-2 text-sm text-${colorClass}-600 hover:text-${colorClass}-800 font-medium transition-colors`}
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-medium mb-2">Error Loading Products</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setPage(1)
                setProducts([])
                setHasMore(true)
                fetchProducts(1, false)
              }}
              className={`px-6 py-2 bg-${colorClass}-600 text-white rounded-lg hover:bg-${colorClass}-700 transition-colors`}
            >
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg font-medium mb-2">No Products Found</div>
            <p className="text-gray-500 mb-4">No products found with current filters</p>
            <button
              onClick={clearFilters}
              className={`px-6 py-2 bg-${colorClass}-600 text-white rounded-lg hover:bg-${colorClass}-700 transition-colors`}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  id={product._id}
                  name={product.name}
                  brand={product.brand}
                  imageUrl={product.primaryImage ?? undefined}
                  price={product.defaultPrice}
                />
              ))}
            </div>

            {/* Intersection Observer Target */}
            <div ref={observerRef} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">Loading more products...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
