import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import ProductFilters, { type FilterState } from '../components/ProductFilters'
import { emitEvent } from '../utils/eventEmitter'
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
  const [filters, setFilters] = useState<FilterState>({
    brand: '',
    gender: '',
    color: '',
    search: '',
    categoryId: undefined,
    minPrice: undefined,
    maxPrice: undefined
  })
  const [subcategory, setSubcategory] = useState('') // topwear or bottomwear

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
      
      // If subcategory is selected, use backend sub-category endpoint with proper pagination
      let response
      const apiParams: any = { page: pageNum, limit: 12 }
      if (filters.brand) apiParams.brand = filters.brand
      if (filters.gender) apiParams.gender = filters.gender
      if (filters.color) apiParams.color = filters.color
      if (filters.search) apiParams.search = filters.search
      if (filters.minPrice !== undefined) apiParams.minPrice = filters.minPrice
      if (filters.maxPrice !== undefined) apiParams.maxPrice = filters.maxPrice

      if (subcategory === 'topwear' || subcategory === 'bottomwear') {
        const subName = subcategory === 'topwear' ? 'Topwear' : 'Bottomwear'
        response = await productApi.getProductsBySubCategory('Apparel', subName, apiParams)
      } else {
        // Fallback: general list then filter on FE (no backend master category filter available)
        response = await productApi.getProducts(apiParams)
      }
      
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
      
      // If backend handled subcategory, keep products; else filter FE by Apparel
      let filteredProducts = data.products
      if (!(subcategory === 'topwear' || subcategory === 'bottomwear')) {
        filteredProducts = data.products.filter(product => {
          const category = product.categoryId as any
          return category?.masterCategory === 'Apparel'
        })
      }
      
      if (isLoadMore) {
        setProducts(prev => [...prev, ...filteredProducts])
      } else {
        setProducts(filteredProducts)
      }
      
      if (data.pagination && typeof data.pagination.totalProducts === 'number') {
        setTotalProducts(data.pagination.totalProducts)
        setHasMore(!!data.pagination.hasNextPage)
      } else {
        setTotalProducts(filteredProducts.length)
        setHasMore(false)
      }
      
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
  }, [filters, subcategory]) // Include subcategory in dependencies

  // Initial load and filter changes
  useEffect(() => {
    setPage(1)
    setProducts([])
    setHasMore(true)
    fetchProducts(1, false)
  }, [filters, subcategory])

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
    
    if (subcategoryFromPath !== subcategory) {
      setSubcategory(subcategoryFromPath)
    }
  }, [window.location.pathname, subcategory])

  const handleFilterChange = (key: string, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSubcategoryChange = (value: string) => {
    setSubcategory(value)
    // Navigate to proper URL for subcategory changes
    if (value === 'topwear') {
      navigate('/c/apparel/topwear')
    } else if (value === 'bottomwear') {
      navigate('/c/apparel/bottomwear')
    } else {
      navigate('/c/apparel')
    }
  }

  const clearFilters = () => {
    setFilters({
      brand: '',
      gender: '',
      color: '',
      search: '',
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined
    })
    setSubcategory('')
    navigate('/c/apparel') // Navigate to base apparel page
  }

  // Handle debounced search for event tracking
  const handleSearchDebounced = useCallback((searchQuery: string) => {
    if (searchQuery && searchQuery.trim().length > 0) {
      try {
        const q = [
          `q=${searchQuery.trim()}`,
          filters.brand ? `brand=${filters.brand}` : '',
          filters.gender ? `gender=${filters.gender}` : '',
          filters.color ? `color=${filters.color}` : '',
          subcategory ? `subcategory=${subcategory}` : ''
        ].filter(Boolean).join(';')
        emitEvent({
          type: 'search',
          searchQuery: q,
          context: { page: '/c/apparel' }
        })
      } catch (error) {
        console.error('Failed to emit search event:', error)
      }
    }
  }, [filters.brand, filters.gender, filters.color, subcategory])

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
            {subcategory === 'topwear' ? 'Bộ sưu tập Áo' :
             subcategory === 'bottomwear' ? 'Bộ sưu tập Quần' : 
             'Bộ sưu tập Trang phục'}
          </h1>
          <p className="text-gray-600">
            {subcategory === 'topwear' ? 'Áo sơ mi, áo phông & áo trên' :
             subcategory === 'bottomwear' ? 'Quần, jeans & quần tây' :
             'Bộ sưu tập thời trang cao cấp - áo, quần & hơn thế nữa'} - {totalProducts} mặt hàng có sẵn
          </p>
          
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mt-3">
            <a href="/" className="hover:text-gray-700">Trang chủ</a>
            <span>/</span>
            <span className="text-gray-900">Trang phục</span>
            {subcategory && (
              <>
                <span>/</span>
                <span className="text-gray-900 capitalize">
                  {subcategory === 'topwear' ? 'Topwear' : 'Bottomwear'}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Filters */}
        <ProductFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onSearchDebounced={handleSearchDebounced}
          showSubcategoryFilter={true}
          subcategoryOptions={[
            { value: '', label: 'Tất cả trang phục' },
            { value: 'topwear', label: '👕 Áo' },
            { value: 'bottomwear', label: '👖 Quần' }
          ]}
          onSubcategoryChange={handleSubcategoryChange}
          currentSubcategory={subcategory}
          customPlaceholders={{
            search: subcategory === 'topwear' ? 'Tìm áo...' : 
                   subcategory === 'bottomwear' ? 'Tìm quần...' : 
                   'Tìm trang phục...',
            brand: 'Nhập thương hiệu...',
            color: 'Nhập màu sắc...'
          }}
        />

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
                  source="category"
                  position={`apparel-${subcategory || 'all'}`}
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