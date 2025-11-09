import { useEffect, useState } from 'react'
import { eventsApi, productApi } from '../utils/apiService'
import { emitEvent } from '../utils/eventEmitter'
import ProductCard from './ProductCard'

type PopularityItem = {
  itemId: string
  score: number
  counts?: {
    view?: number
    add_to_cart?: number
    purchase?: number
    wishlist?: number
  }
}

export default function TrendingProductsSidebar() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Get popularity scores (trending products)
        const resp = await eventsApi.getPopularity({ limit: 5 })
        
        if (!resp.success || !Array.isArray(resp.data)) {
          throw new Error(resp.message || 'Failed to load trending products')
        }
        
        const popularityList: PopularityItem[] = resp.data
        const products: any[] = []
        
        // Fetch product details for each trending item
        for (const item of popularityList) {
          if (!item.itemId) continue
          try {
            const p = await productApi.getProduct(item.itemId)
            if (p.success && p.data) {
              const pd = (p.data as any).product
              products.push({
                ...pd,
                _popularityScore: item.score,
                _counts: item.counts
              })
            }
          } catch (err) {
            console.warn(`Failed to load product ${item.itemId}:`, err)
          }
        }
        
        setItems(products)
        
        // Emit impression event for trending products
        if (products.length > 0) {
          emitEvent({
            type: 'impression',
            itemIds: products.map((p: any) => p._id),
            context: {
              source: 'recommendation',
              position: 'sidebar-trending',
              page: window.location.pathname
            }
          })
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load trending products')
      } finally {
        setLoading(false)
      }
    }
    
    loadTrending()
  }, [])

  const getProductImage = (product: any) => {
    return product.images?.[0]?.url || 
           product.images?.[0] || 
           product.primaryImage || 
           product.imageUrl
  }

  return (
    <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-xl">🔥</span>
        <span>Trending Products</span>
      </h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
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
        <div className="text-sm text-gray-500">Chưa có dữ liệu trending</div>
      ) : (
        <div className="space-y-4">
          {items.map((p) => (
            <div key={p._id} className="space-y-2">
              <ProductCard
                id={p._id}
                name={p.name || p.displayName || 'Product'}
                brand={p.brand}
                imageUrl={getProductImage(p)}
                price={p.defaultPrice}
                source="recommendation"
                position="sidebar-trending"
              />
              <div className="text-xs text-orange-600 flex items-center gap-1 px-2">
                <span>⭐</span>
                <span>Hot: {p._popularityScore?.toFixed(0) || 0} points</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}

