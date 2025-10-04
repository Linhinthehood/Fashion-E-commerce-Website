import { Link } from 'react-router-dom'

type ProductCardProps = {
  id: string
  name: string
  imageUrl?: string | null
  price?: number
  brand?: string
}

function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}

export default function ProductCard({ 
  id, 
  name, 
  imageUrl, 
  price, 
  brand
}: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <Link to={`/product/${id}`} className="block">
        {/* Image Container */}
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={name} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Brand */}
          {brand && (
            <div className="text-xs text-gray-600 mb-1 font-medium">
              {brand.toUpperCase()}
            </div>
          )}

          {/* Product Name */}
          <h3 className="font-bold text-gray-900 text-sm leading-tight mb-2 truncate">
            {name}
          </h3>

          {/* Price */}
          <div className="text-lg font-bold text-red-600">
            {typeof price === 'number' ? formatCurrencyVND(price) : 'Contact for price'}
          </div>
        </div>
      </Link>
    </div>
  )
}