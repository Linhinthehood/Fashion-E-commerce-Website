import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { eventsApi, productApi } from '../utils/apiService'

type AffinityItem = {
  itemId: string
  score: number
  counts?: {
    view?: number
    add_to_cart?: number
    purchase?: number
    wishlist?: number
  }
}

export default function YourPreferencesSidebar() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPreferences = async () => {
      // Don't load if user is not logged in
      if (!user?._id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Get user affinity scores
        const resp = await eventsApi.getAffinity(user._id, { limit: 4 })
        
        if (!resp.success || !Array.isArray(resp.data)) {
          throw new Error(resp.message || 'Failed to load preferences')
        }
        
        const affinityList: AffinityItem[] = resp.data
        
        // If no preferences found, don't show error
        if (affinityList.length === 0) {
          setItems([])
          setLoading(false)
          return
        }
        
        const products: any[] = []
        
        // Fetch product details for each preferred item
        for (const item of affinityList) {
          if (!item.itemId) continue
          try {
            const p = await productApi.getProduct(item.itemId)
            if (p.success && p.data) {
              const pd = (p.data as any).product
              products.push({
                ...pd,
                _affinityScore: item.score,
                _counts: item.counts
              })
            }
          } catch (err) {
            console.warn(`Failed to load product ${item.itemId}:`, err)
          }
        }
        
        setItems(products)
      } catch (e: any) {
        setError(e?.message || 'Failed to load preferences')
      } finally {
        setLoading(false)
      }
    }
    
    loadPreferences()
  }, [user?._id])

  const getProductImage = (product: any) => {
    return product.images?.[0]?.url || 
           product.images?.[0] || 
           product.primaryImage || 
           product.imageUrl
  }

  // Don't render if user is not logged in
  if (!user?._id) {
    return null
  }

  // Don't render if no preferences and not loading
  if (!loading && items.length === 0 && !error) {
    return null
  }

  return (
    <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-6 lg:sticky lg:top-24">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-xl">❤️</span>
        <span>Your Preferences</span>
      </h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-16 h-16 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">
          Xem thêm sản phẩm để chúng tôi gợi ý cho bạn
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((p) => (
            <Link
              key={p._id}
              to={`/products/${p._id}`}
              className="flex gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                {getProductImage(p) ? (
                  <img
                    src={getProductImage(p)}
                    alt={p.name || p.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                  {p.name || p.displayName || 'Product'}
                </div>
                <div className="text-xs text-gray-500">{p.brand}</div>
                {p.defaultPrice && (
                  <div className="text-sm font-medium text-blue-600 mt-1">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0
                    }).format(p.defaultPrice)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </aside>
  )
}

