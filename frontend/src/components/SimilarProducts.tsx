import { useEffect, useState } from 'react'
import ProductCard from './ProductCard'
import { fashionApi } from '../utils/apiService'

type SimilarProduct = {
  _id: string
  name: string
  brand: string
  images: string[]
  defaultPrice?: number
  similarity?: number
}

type SimilarProductsProps = {
  productId: string
  limit?: number
}

export default function SimilarProducts({ productId, limit = 4 }: SimilarProductsProps) {
  const [products, setProducts] = useState<SimilarProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch only 4 most similar products with higher similarity threshold
        const response = await fashionApi.getSimilarProducts(productId, { 
          limit: 4,
          minSimilarity: 0.7
        })
        
        if (response.success && response.data) {
          const recommendations = response.data.recommendations || []
          setProducts(recommendations.map((item: any) => item.product))
        } else {
          setError(response.message || 'Failed to load similar products')
        }
      } catch (e: any) {
        console.error('Error fetching similar products:', e)
        setError(e?.message || 'Failed to load similar products')
      } finally {
        setLoading(false)
      }
    }

    if (productId) {
      fetchSimilarProducts()
    }
  }, [productId, limit])

  if (loading) {
    return (
      <div className="mt-16 py-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl shadow-inner">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <svg className="w-8 h-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Sản phẩm tương tự
          </h2>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || products.length === 0) {
    return null // Don't show anything if there's an error or no products
  }

  return (
    <div className="mt-16 py-10 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl shadow-lg">
      <div className="px-6">
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"></div>
          </div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 mb-2">
            Sản phẩm tương tự
          </h2>
          <p className="text-gray-600 text-sm">4 sản phẩm tương tự nhất được AI gợi ý (độ tương đồng &gt; 70%)</p>
        </div>

        {/* Products Grid - Fixed 4-column layout for 4 products */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 justify-items-center max-w-6xl mx-auto">
          {products.map((product, index) => (
            <div 
              key={product._id}
              className="transform transition-all duration-300 hover:scale-105"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ProductCard
                id={product._id}
                name={product.name}
                brand={product.brand}
                imageUrl={product.images && product.images.length > 0 ? product.images[0] : null}
                price={product.defaultPrice}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
