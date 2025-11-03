import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  categoryId?: string | {
    _id: string
    masterCategory: string
    subCategory: string
    articleType: string
  }
  categoryName?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ApparelPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const navigate = useNavigate()
  
  // Filter states
  const [filters, setFilters] = useState({
    subcategory: '', // topwear or bottomwear
    brand: '',
    gender: '',
    color: '',
    search: ''
  })

  // Intersection Observer refs
  const observerRef = useRef<HTMLDivElement>(null)
  const intersectionObserver = useRef<IntersectionObserver | null>(null)

  const fetchProducts = useCallback(async (pageNum: number, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }
      
      // Prepare API parameters
      const apiParams: any = {
        page: pageNum,
        limit: 50 // Get more products to filter on frontend
      }
      
      // Add additional filters
      if (filters.brand) apiParams.brand = filters.brand
      if (filters.gender) apiParams.gender = filters.gender
      if (filters.color) apiParams.color = filters.color
      if (filters.search) apiParams.search = filters.search
      
      const response = await productApi.getProducts(apiParams)
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to load apparel products')
      }
      
      const data = response.data as {
        products: Product[]
        pagination?: {
          totalProducts: number
          totalPages: number
          currentPage: number
          hasNextPage: boolean
          hasPrevPage: boolean
        }
      }
      
      // Filter products on frontend for apparel items only using category data
      let filteredProducts = data.products.filter(product => {
        // Get category info from the populated categoryId field
        const category = product.categoryId as any
        
        // First filter: Only apparel items (masterCategory === "Apparel")
        const isApparel = category?.masterCategory === 'Apparel'
        
        if (!isApparel) return false
        
        // Second filter: Apply subcategory filter based on category subCategory
        if (filters.subcategory === 'topwear') {
          return category?.subCategory === 'Topwear'
        } else if (filters.subcategory === 'bottomwear') {
          return category?.subCategory === 'Bottomwear'
        }
        
        // If no subcategory, return all apparel items
        return true
      })
      
      if (isLoadMore) {
        setProducts(prev => [...prev, ...filteredProducts])
      } else {
        setProducts(filteredProducts)
      }
      
      setTotalProducts(filteredProducts.length)
      setHasMore(false) // Disable infinite scroll since we're filtering on frontend
      
    } catch (e: any) {
      console.error('Error fetching apparel products:', e)
      setError(e?.message || 'Failed to load apparel products')
      if (!isLoadMore) {
        setProducts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filters]) // Remove products.length dependency

  // Initial load and filter changes
  useEffect(() => {
    setPage(1)
    setProducts([])
    setHasMore(true)
    fetchProducts(1, false)
  }, [filters])

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

  // Simplified URL handling - only check path
  useEffect(() => {
    const currentPath = window.location.pathname
    let subcategoryFromPath = ''
    
    if (currentPath.includes('/topwear')) {
      subcategoryFromPath = 'topwear'
    } else if (currentPath.includes('/bottomwear')) {
      subcategoryFromPath = 'bottomwear'
    }
    
    if (subcategoryFromPath !== filters.subcategory) {
      setFilters(prev => ({ ...prev, subcategory: subcategoryFromPath }))
    }
  }, [window.location.pathname])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    
    // Navigate to proper URL for subcategory changes
    if (key === 'subcategory') {
      if (value === 'topwear') {
        navigate('/c/apparel/topwear')
      } else if (value === 'bottomwear') {
        navigate('/c/apparel/bottomwear')
      } else {
        navigate('/c/apparel')
      }
    }
  }

  const clearFilters = () => {
    setFilters({
      subcategory: '',
      brand: '',
      gender: '',
      color: '',
      search: ''
    })
    navigate('/c/apparel') // Navigate to base apparel page
  }

  // Count products by type for display (for future use)
  // const topwearCount = products.filter(p => 
  //   p.name.toLowerCase().includes('áo') || 
  //   p.name.toLowerCase().includes('shirt')
  // ).length
  
  // const bottomwearCount = products.filter(p => 
  //   p.name.toLowerCase().includes('quần') || 
  //   p.name.toLowerCase().includes('pants')
  // ).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {filters.subcategory === 'topwear' ? 'Bộ sưu tập Áo' :
             filters.subcategory === 'bottomwear' ? 'Bộ sưu tập Quần' : 
             'Bộ sưu tập Trang phục'}
          </h1>
          <p className="text-gray-600">
            {filters.subcategory === 'topwear' ? 'Áo sơ mi, áo phông & áo trên' :
             filters.subcategory === 'bottomwear' ? 'Quần, jeans & quần tây' :
             'Bộ sưu tập thời trang cao cấp - áo, quần & hơn thế nữa'} - {totalProducts} mặt hàng có sẵn
          </p>
          
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mt-3">
            <a href="/" className="hover:text-gray-700">Trang chủ</a>
            <span>/</span>
            <span className="text-gray-900">Trang phục</span>
            {filters.subcategory && (
              <>
                <span>/</span>
                <span className="text-gray-900 capitalize">
                  {filters.subcategory === 'topwear' ? 'Topwear' : 'Bottomwear'}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Category Quick Filter Tabs */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => handleFilterChange('subcategory', '')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                !filters.subcategory
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả trang phục
            </button>
            <button
              onClick={() => handleFilterChange('subcategory', 'topwear')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                filters.subcategory === 'topwear'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👕 Áo
            </button>
            <button
              onClick={() => handleFilterChange('subcategory', 'bottomwear')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                filters.subcategory === 'bottomwear'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👖 Quần 
            </button>
          </div>

          {/* Description for current selection */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              {filters.subcategory === 'topwear' ? 
                '👕 Hiển thị áo sơ mi, áo phông và các loại áo trên' :
               filters.subcategory === 'bottomwear' ? 
                '👖 Hiển thị quần, jeans và quần tây' :
                '👔 Hiển thị tất cả trang phục - cả áo và quần (không bao gồm phụ kiện & giày)'
              }
            </p>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
              <input
                type="text"
                placeholder={filters.subcategory === 'topwear' ? 'Tìm áo...' : 
                           filters.subcategory === 'bottomwear' ? 'Tìm quần...' : 
                           'Tìm trang phục...'}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Clear Filters Button */}
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Xóa tất cả bộ lọc
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
            <div className="text-red-600 text-lg font-medium mb-2">Lỗi tải danh mục</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setPage(1)
                setProducts([])
                setHasMore(true)
                fetchProducts(1, false)
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg font-medium mb-2">Không tìm thấy sản phẩm thời trang</div>
            <p className="text-gray-500 mb-4">
              {filters.subcategory === 'topwear' ? 'Không tìm thấy áo phù hợp' :
               filters.subcategory === 'bottomwear' ? 'Không tìm thấy quần phù hợp' :
               'Không tìm thấy sản phẩm - thử điều chỉnh bộ lọc'}
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Xóa bộ lọc
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
                  <span className="text-sm font-medium">Đang tải thêm trang phục...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}