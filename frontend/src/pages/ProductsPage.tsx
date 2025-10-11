import { useEffect, useState, useRef, useCallback } from 'react'
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  
  // Filter states
  const [filters, setFilters] = useState({
    brand: '',
    gender: '',
    color: '',
    categoryId: '',
    search: ''
  })

  // Intersection Observer refs
  const observerRef = useRef<HTMLDivElement>(null)
  const intersectionObserver = useRef<IntersectionObserver | null>(null)

  // Increased limit for better lazy loading performance
  const ITEMS_PER_PAGE = 24

  // Updated fetchProducts function with fixed hasMore logic
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
        limit: ITEMS_PER_PAGE
      }
      
      // Add filters
      if (filters.brand) apiParams.brand = filters.brand
      if (filters.gender) apiParams.gender = filters.gender
      if (filters.color) apiParams.color = filters.color
      if (filters.categoryId) apiParams.categoryId = filters.categoryId
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
      
      if (isLoadMore) {
        // Prevent duplicate products
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p._id))
          const newProducts = data.products.filter(p => !existingIds.has(p._id))
          return [...prev, ...newProducts]
        })
      } else {
        setProducts(data.products)
      }
      
      setTotalProducts(data.total)
      
      // Fixed hasMore calculation - check if current page has reached the last page
      // OR if we've loaded all available products
      const totalLoadedAfterThis = isLoadMore ? 
        products.length + data.products.length : 
        data.products.length
      
      // hasMore is true if:
      // 1. We haven't reached the total count AND
      // 2. The current response returned at least 1 product AND  
      // 3. We haven't reached the last page
      setHasMore(
        totalLoadedAfterThis < data.total && 
        data.products.length > 0 && 
        pageNum < data.totalPages
      )
      
      console.log(`Page ${pageNum}: Loaded ${data.products.length} products, Total: ${totalLoadedAfterThis}/${data.total}, HasMore: ${totalLoadedAfterThis < data.total && data.products.length > 0 && pageNum < data.totalPages}`)
      
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
  }, [filters, products.length])

  // Reset and fetch when filters change
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
  }, [page, fetchProducts])

  // Enhanced Intersection Observer with better performance
  useEffect(() => {
    const currentObserver = observerRef.current

    if (currentObserver && hasMore && !loading && !loadingMore) {
      intersectionObserver.current = new IntersectionObserver(
        (entries) => {
          const target = entries[0]
          if (target.isIntersecting && hasMore && !loading && !loadingMore) {
            console.log('Loading next page:', page + 1)
            setPage(prev => prev + 1)
          }
        },
        {
          threshold: 0.1,
          rootMargin: '200px'
        }
      )

      intersectionObserver.current.observe(currentObserver)
    }

    return () => {
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect()
      }
    }
  }, [hasMore, loading, loadingMore, page])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      brand: '',
      gender: '',
      color: '',
      categoryId: '',
      search: ''
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-600">
            {loading ? 'Loading products...' : 
             `Showing ${products.length} of ${totalProducts} premium fashion items`}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search products..."
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
                <option value="">All</option>
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
          
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* Products Grid with improved loading states */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg font-medium mb-2">No Products Found</div>
            <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

            {/* Enhanced loading indicator and completion message */}
            <div ref={observerRef} className="h-16 flex items-center justify-center">
              {loadingMore && (
                <div className="flex flex-col items-center space-y-2 text-gray-600">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium">Loading more products...</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {products.length} of {totalProducts} products loaded
                  </p>
                </div>
              )}
              
              {!hasMore && products.length > 0 && (
                <div className="text-center py-8 border-t border-gray-200 w-full">
                  <div className="flex items-center justify-center space-x-2 text-gray-500 mb-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">All products loaded!</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Showing all {products.length} products matching your criteria
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
