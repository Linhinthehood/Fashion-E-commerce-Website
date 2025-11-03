import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { productApi, variantApi } from '../utils/apiService'
import { useCart, type CartItem } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import SimilarProducts from '../components/SimilarProducts'

type Product = {
  _id: string
  name: string
  brand: string
  description: string
  gender: 'Male' | 'Female' | 'Unisex'
  color: string
  usage: string
  images: string[]
  primaryImage?: string
  defaultPrice?: number
  categoryId?: string
  categoryName?: string
  isActive: boolean
  hasImage?: boolean
  createdAt: string
  updatedAt: string
}

type Variant = {
  _id: string
  productId: string
  size: string
  stock: number
  status: 'Active' | 'Inactive'
  price?: number
  sku?: string
}

// Removed unused types

function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const { addToCart } = useCart()
  const toast = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | string | null>(null)

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    if (product?.images && product.images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % product.images.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [product?.images])

  // Fetch product and variants
  useEffect(() => {
    const fetchProductData = async () => {
      if (!id) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch product details using productApi
        const productResponse = await productApi.getProduct(id)
        
        if (!productResponse.success) {
          throw new Error(productResponse.message || 'Failed to load product')
        }

        // Type assertion for product data
        const productData = productResponse.data as { product: Product }
        setProduct(productData.product)

        // Fetch variants for this product using variantApi
        const variantsResponse = await variantApi.getVariantsByProduct(id)
        
        if (variantsResponse.success && variantsResponse.data) {
          const variantsData = variantsResponse.data as { variants: Variant[] }
          if (variantsData.variants.length > 0) {
            const activeVariants = variantsData.variants.filter((v: Variant) => v.status === 'Active')
            setVariants(activeVariants)
            
            // Auto-select first variant if none selected
            if (activeVariants.length > 0 && !selectedVariant) {
              setSelectedVariant(activeVariants[0])
            }
          } else {
            setVariants([])
          }
        } else {
          setVariants([])
        }
      } catch (e: any) {
        console.error('Error fetching product data:', e)
        setError(e?.message || 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    fetchProductData()
  }, [id])

  const handleVariantClick = (variant: Variant) => {
    setSelectedVariant(variant)
  }

  const handleQuantityChange = (increment: boolean) => {
    const newQuantity = increment ? quantity + 1 : quantity - 1
    if (newQuantity >= 1 && selectedVariant && newQuantity <= selectedVariant.stock) {
      setQuantity(newQuantity)
    }
  }

  const handleAddToCart = () => {
    if (!selectedVariant || !product) {
      toast.error('Vui lòng chọn size')
      return
    }
    
    const cartItem: CartItem = {
      productId: product._id,
      variantId: selectedVariant._id,
      productName: product.name,
      brand: product.brand,
      color: product.color,
      size: selectedVariant.size,
      price: selectedVariant.price || product.defaultPrice || 0,
      quantity,
      image: product.images && product.images.length > 0 ? product.images[0] : '',
      sku: selectedVariant.sku
    }
    
    addToCart(cartItem)
    toast.success(`Đã thêm ${quantity} sản phẩm size ${selectedVariant.size} vào giỏ hàng!`)
  }

  const displayPrice = selectedVariant?.price || product?.defaultPrice

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lỗi khi tải sản phẩm</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8">
            
            {/* Left: Main Image + Thumbnails (6 cols) */}
            <div className="lg:col-span-6 col-span-1">
              {product.images && product.images.length > 0 ? (
                <div className="space-y-4 sticky top-4">
                  {/* Main Image - Larger height */}
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300" style={{ aspectRatio: '4/5' }}>
                    <img 
                      src={product.images[currentImageIndex]} 
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  
                  {/* Image Thumbnails */}
                  {product.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                      {product.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`aspect-square rounded-xl overflow-hidden border-3 transition-all duration-300 transform hover:scale-105 ${
                            currentImageIndex === index 
                              ? 'border-blue-500 ring-4 ring-blue-200 shadow-lg scale-105' 
                              : 'border-gray-300 hover:border-gray-500 hover:shadow-md'
                          }`}
                        >
                          <img 
                            src={image} 
                            alt={`${product.name} view ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ aspectRatio: '4/5' }}>
                    <svg className="w-32 h-32 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Product Details (6 cols) */}
            <div className="lg:col-span-6 col-span-1 space-y-6">
              
              {/* Product Name */}
              <div className="border-b border-gray-200 pb-4">
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-3">
                  {product.brand.toUpperCase()}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">
                  {product.name}
                </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">Còn hàng</span>
                  <span>•</span>
                  <span>{product.gender}</span>
                </div>
              </div>

              {/* Price */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-2xl shadow-inner border border-red-100">
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl sm:text-5xl font-extrabold text-red-600">
                    {displayPrice ? formatCurrencyVND(displayPrice) : 'Liên hệ để biết giá'}
                  </div>
                </div>
                {selectedVariant && (
                  <div className="text-sm text-gray-700 mt-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-semibold">SKU:</span> 
                    <span className="font-mono">{selectedVariant.sku || `${product.brand}${selectedVariant.size}`}</span>
                  </div>
                )}
              </div>

              {/* Variant Selection */}
              <div className="bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Chọn Size:
                  </span>
                  {selectedVariant && (
                    <span className="text-sm text-blue-600 font-semibold">
                      Đã chọn: {selectedVariant.size}
                    </span>
                  )}
                </div>
                
                {variants.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {variants.map((variant) => (
                      <button
                        key={variant._id}
                        onClick={() => handleVariantClick(variant)}
                        disabled={variant.stock === 0}
                        className={`relative px-4 py-4 border-2 rounded-xl font-bold transition-all duration-300 ${
                          selectedVariant?._id === variant._id
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg scale-105'
                            : variant.stock > 0
                            ? 'border-gray-300 text-gray-700 hover:border-blue-500 hover:shadow-md hover:scale-105 bg-white'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50 opacity-50'
                        }`}
                      >
                        <div className="text-lg">{variant.size}</div>
                        {variant.stock === 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
                            Hết
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${selectedVariant?._id === variant._id ? 'text-blue-100' : 'text-gray-500'}`}>
                          {variant.stock > 0 ? `Còn ${variant.stock}` : 'Hết hàng'}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    Không có size nào khả dụng
                  </div>
                )}
              </div>

              {/* Quantity and Add to Cart */}
              <div className="space-y-4 bg-gray-50 p-6 rounded-2xl">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-lg font-bold text-gray-900">Số lượng:</span>
                  <div className="flex items-center border-2 border-gray-300 rounded-xl bg-white shadow-sm overflow-hidden">
                    <button
                      onClick={() => handleQuantityChange(false)}
                      disabled={quantity <= 1}
                      className="px-5 py-3 text-gray-700 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-xl"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={selectedVariant?.stock || 1}
                      value={quantity}
                      className="w-16 px-2 py-3 text-center border-0 focus:outline-none font-bold text-lg"
                      readOnly
                    />
                    <button
                      onClick={() => handleQuantityChange(true)}
                      disabled={!selectedVariant || quantity >= selectedVariant.stock}
                      className="px-5 py-3 text-gray-700 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-xl"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || selectedVariant.stock === 0}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-lg rounded-xl hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {selectedVariant 
                    ? 'THÊM VÀO GIỎ HÀNG' 
                    : 'CHỌN SIZE ĐỂ TIẾP TỤC'
                  }
                </button>
              </div>

              {/* Product Information */}
              <div className="border-t-2 border-gray-200 pt-6">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Thông tin sản phẩm
                </h3>
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 shadow-inner">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 py-3 px-4 bg-white rounded-xl shadow-sm">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 font-medium block">Thương hiệu</span>
                        <span className="text-gray-900 font-bold uppercase text-sm">{product.brand}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-3 px-4 bg-white rounded-xl shadow-sm">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 font-medium block">Giới tính</span>
                        <span className="text-gray-900 font-semibold text-sm">{product.gender}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-3 px-4 bg-white rounded-xl shadow-sm">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 font-medium block">Công dụng</span>
                        <span className="text-gray-900 font-semibold text-sm">{product.usage}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-3 px-4 bg-white rounded-xl shadow-sm">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 font-medium block">Màu sắc</span>
                        <span className="text-gray-900 font-semibold text-sm">{product.color}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-white rounded-xl p-5 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      Mô tả sản phẩm:
                    </h4>
                    <p className="text-gray-700 leading-relaxed text-sm">
                      {product.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Products Section */}
        {product && <SimilarProducts productId={product._id} limit={6} />}
      </div>
    </div>
  )
}