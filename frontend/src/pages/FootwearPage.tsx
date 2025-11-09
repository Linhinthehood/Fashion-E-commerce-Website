import { useEffect, useState, useRef, useCallback } from 'react'
// import { useNavigate } from 'react-router-dom' // For future use
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

export default function FootwearPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  // const navigate = useNavigate() // For future use
  
  // Filter states - footwear only has 'shoe' subcategory
  const [filters, setFilters] = useState<FilterState>({
    brand: '',
    gender: '',
    color: '',
    search: '',
    categoryId: undefined,
    minPrice: undefined,
    maxPrice: undefined
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
      
      const apiParams: any = { page: pageNum, limit: 12 }
      
      if (filters.brand) apiParams.brand = filters.brand
      if (filters.gender) apiParams.gender = filters.gender
      if (filters.color) apiParams.color = filters.color
      if (filters.search) apiParams.search = filters.search
      if (filters.minPrice !== undefined) apiParams.minPrice = filters.minPrice
      if (filters.maxPrice !== undefined) apiParams.maxPrice = filters.maxPrice
      
      const response = await productApi.getProducts(apiParams)
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to load footwear')
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
      
      // Filter products for footwear only using category data
      let filteredProducts = data.products.filter(product => {
        // Get category info from the populated categoryId field
        const category = product.categoryId as any
        
        // Only footwear items (masterCategory === "Footwear")
        return category?.masterCategory === 'Footwear'
      })
      
      if (isLoadMore) {
        setProducts(prev => [...prev, ...filteredProducts])
      } else {
        setProducts(filteredProducts)
      }
      
      setTotalProducts(filteredProducts.length)
      setHasMore(false)
      
    } catch (e: any) {
      console.error('Error fetching footwear:', e)
      setError(e?.message || 'Failed to load footwear')
      if (!isLoadMore) {
        setProducts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filters])

  useEffect(() => {
    setPage(1)
    setProducts([])
    setHasMore(true)
    fetchProducts(1, false)
  }, [filters])

  useEffect(() => {
    if (page > 1) {
      fetchProducts(page, true)
    }
  }, [page])

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

  const handleFilterChange = (key: string, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }))
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
  }

  // Handle debounced search for event tracking
  const handleSearchDebounced = useCallback((searchQuery: string) => {
    if (searchQuery && searchQuery.trim().length > 0) {
      try {
        const q = [
          `q=${searchQuery.trim()}`,
          filters.brand ? `brand=${filters.brand}` : '',
          filters.gender ? `gender=${filters.gender}` : '',
          filters.color ? `color=${filters.color}` : ''
        ].filter(Boolean).join(';')
        emitEvent({
          type: 'search',
          searchQuery: q,
          context: { page: '/c/footwear' }
        })
      } catch (error) {
        console.error('Failed to emit search event:', error)
      }
    }
  }, [filters.brand, filters.gender, filters.color])

  // Count different shoe types
  const casualShoeCount = products.filter(p => 
    p.name.toLowerCase().includes('sneaker') || 
    p.usage?.toLowerCase() === 'casual'
  ).length
  
  const formalShoeCount = products.filter(p => 
    p.name.toLowerCase().includes('công sở') || 
    p.usage?.toLowerCase() === 'formal'
  ).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Footwear Collection</h1>
          <p className="text-gray-600">
            Step up your style with our premium footwear collection - {totalProducts} items available
          </p>
          
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mt-3">
            <a href="/" className="hover:text-gray-700">Trang chủ</a>
            <span>/</span>
            <span className="text-gray-900">Footwear</span>
          </nav>
        </div>

        {/* Shoe Type Stats */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">👟 Casual Shoes</h3>
                  <p className="text-green-100 mb-1">Sneakers & Everyday Footwear</p>
                  <p className="text-sm text-green-200">{casualShoeCount} products available</p>
                </div>
                <div className="text-4xl">👟</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">👞 Formal Shoes</h3>
                  <p className="text-gray-300 mb-1">Business & Dress Shoes</p>
                  <p className="text-sm text-gray-400">{formalShoeCount} products available</p>
                </div>
                <div className="text-4xl">👞</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              👟 Showing all footwear - sneakers, dress shoes, casual shoes & more (excludes clothing & accessories)
            </p>
          </div>
        </div>

        {/* Filters */}
        <ProductFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onSearchDebounced={handleSearchDebounced}
          customPlaceholders={{
            search: "Tìm kiếm giày, sneakers...",
            brand: "Nhập thương hiệu...",
            color: "Nhập màu sắc..."
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
            <div className="text-red-600 text-lg font-medium mb-2">Error Loading Footwear</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setPage(1)
                setProducts([])
                setHasMore(true)
                fetchProducts(1, false)
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg font-medium mb-2">No Footwear Found</div>
            <p className="text-gray-500 mb-4">No shoes found with current filters</p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                  source="category"
                  position="footwear"
                />
              ))}
            </div>

            <div ref={observerRef} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">Loading more footwear...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}