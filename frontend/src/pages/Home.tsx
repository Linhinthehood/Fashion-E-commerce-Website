import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import BannerCarousel from '../components/BannerCarousel'
import ProductCard from '../components/ProductCard'
import { fashionApi } from '../utils/apiService'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    loadRecommendations()
  }, [user])

  const loadRecommendations = async () => {
    if (user?._id) {
      try {
        const response = await fashionApi.getPersonalizedRecommendations(user._id, 8)
        if (response.success && Array.isArray(response.data)) {
          setRecommendations(response.data)
        } else {
          setRecommendations([])
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error)
      }
    }
    setLoading(false)
  }

  return (
    <div className="space-y-10">
      <BannerCarousel />
      
      {/* AI-Powered Recommendations Section */}
      {user && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">
              Gợi ý cho bạn
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-300 h-64 rounded-lg"></div>
                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {recommendations.map((product) => (
                  <ProductCard
                    key={product._id}
                    id={product._id}
                    name={product.displayName || product.name || 'Product'}
                    imageUrl={
                      product.imageUrl ||
                      product.imageUrls?.[0] ||
                      product.images?.[0]?.url ||
                      product.images?.[0]
                    }
                    price={product.defaultPrice ?? product.price}
                    brand={product.brand}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
      
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Chào mừng đến với Cửa hàng Thời trang
        </h1>
        <p className="text-xl text-gray-600 mb-8 mx-auto max-w-2xl">
          Discover our premium collection of fashion items for men and women. 
          Quality, style, and comfort in every piece.
        </p>
        <Link 
          to="/products" 
          className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Xem tất cả sản phẩm
        </Link>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Tại sao chọn chúng tôi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Chất lượng hàng đầu</h3>
              <p className="text-gray-600">Nguyên liệu chọn lọc và tay nghề tinh xảo, đảm bảo độ bền và thẩm mỹ.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Giao hàng nhanh</h3>
              <p className="text-gray-600">Giao hàng nhanh chóng và tin cậy đến tận nơi trên toàn quốc.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-8.364-3.182L12 7.682l1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Chăm sóc khách hàng</h3>
              <p className="text-gray-600">Đội ngũ chăm sóc tận tâm hỗ trợ bạn tìm sản phẩm phù hợp.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 text-center bg-blue-600 text-white">
        <h2 className="text-3xl font-bold mb-4">Sẵn sàng mua sắm?</h2>
        <p className="text-xl mb-8 opacity-90">
          Khám phá toàn bộ danh mục với hàng trăm sản phẩm được tuyển chọn kỹ lưỡng.
        </p>
        <Link 
          to="/products" 
          className="inline-block px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Mua ngay
        </Link>
      </section>
    </div>
  )
}


