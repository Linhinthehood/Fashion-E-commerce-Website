import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../utils/api'
import { productApi } from '../utils/apiService'

type TopViewedItem = { itemId: string; views: number }

export default function TopViewedSidebar() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTopViewed = async () => {
      try {
        setLoading(true)
        setError(null)
        const resp = await fetch(`${API_ENDPOINTS.events.topViewed()}?limit=5`)
        const data = await resp.json()
        if (!resp.ok || !data?.success) {
          throw new Error(data?.message || 'Failed to load top viewed')
        }
        const list: TopViewedItem[] = Array.isArray(data.data) ? data.data : []
        const products: any[] = []
        for (const tv of list) {
          if (!tv.itemId) continue
          const p = await productApi.getProduct(tv.itemId)
          if (p.success && p.data) {
            const pd = (p.data as any).product
            products.push({ ...pd, _views: tv.views })
          }
        }
        setItems(products)
      } catch (e: any) {
        setError(e?.message || 'Failed to load top viewed')
      } finally {
        setLoading(false)
      }
    }
    loadTopViewed()
  }, [])

  return (
    <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:sticky lg:top-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🔥 Top Viewed</h3>
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
        <div className="text-sm text-gray-500">Chưa có dữ liệu</div>
      ) : (
        <div className="space-y-4">
          {items.map((p) => (
            <div key={p._id} className="flex gap-3">
              <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                {p.images?.[0] && (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900 line-clamp-2">{p.name}</div>
                <div className="text-xs text-gray-500">{p.brand}</div>
                <div className="text-xs text-orange-600 mt-1">{p._views} lượt xem</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}


