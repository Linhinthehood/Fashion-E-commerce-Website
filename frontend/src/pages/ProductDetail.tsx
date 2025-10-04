import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { buildUrl } from '../utils/api'

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

type ProductDetailResponse = {
  success: boolean
  data: {
    product: Product
  }
  message?: string
}

type VariantsResponse = {
  success: boolean
  data: {
    variants: Variant[]
  }
  message?: string
}

function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
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

        // Fetch product details
        const productUrl = buildUrl(`/products/${id}`)
        const productResponse = await fetch(productUrl)
        const productData: ProductDetailResponse = await productResponse.json()
        
        if (!productData.success) {
          throw new Error(productData.message || 'Failed to load product')
        }

        setProduct(productData.data.product)

        // Fetch variants for this product
        const variantsUrl = buildUrl(`/variants/product/${id}`)
        const variantsResponse = await fetch(variantsUrl)
        const variantsData: VariantsResponse = await variantsResponse.json()
        
        if (variantsData.success && variantsData.data.variants.length > 0) {
          const activeVariants = variantsData.data.variants.filter(v => v.status === 'Active')
          setVariants(activeVariants)
          
          // Auto-select first variant if none selected
          if (activeVariants.length > 0 && !selectedVariant) {
            setSelectedVariant(activeVariants[0])
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
    if (!selectedVariant) {
      alert('Vui lòng chọn size')
      return
    }
    
    console.log('Adding to cart:', {   
      productId: product?._id,
      variantId: selectedVariant._id,
      size: selectedVariant.size,
      quantity,
      price: selectedVariant.price || product?.defaultPrice
    })
    
    alert(`Đã thêm ${quantity} ${selectedVariant.size} vào giỏ hàng!`)
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Product</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="grid grid-cols-12 gap-8">
            
            {/* Left: Main Image + Thumbnails (6 cols) */}
            <div className="col-span-6">
              {product.images && product.images.length > 0 ? (
                <div className="space-y-4">
                  {/* Main Image - Larger height */}
                  <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/5' }}>
                    <img 
                      src={product.images[currentImageIndex]} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Image Thumbnails */}
                  {product.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-3">
                      {product.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            currentImageIndex === index 
                              ? 'border-blue-500 ring-2 ring-blue-200' 
                              : 'border-gray-200 hover:border-gray-400'
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
            <div className="col-span-6 space-y-6">
              
              {/* Product Name */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h1>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Brand:</span> {product.brand}
                </div>
              </div>

              {/* Price */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="text-4xl font-bold text-red-600 mb-4">
                  {displayPrice ? formatCurrencyVND(displayPrice) : 'Contact for price'}
                </div>
                {selectedVariant && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">SKU:</span> {selectedVariant.sku || `${product.brand}${selectedVariant.size}`}
                  </div>
                )}
              </div>

              {/* Variant Selection */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg font-semibold">Size:</span>
                  {selectedVariant && !variants.length && (
                    <span className="text-sm text-red-600">No variants available</span>
                  )}
                </div>
                
                {variants.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {variants.map((variant) => (
                      <button
                        key={variant._id}
                        onClick={() => handleVariantClick(variant)}
                        disabled={variant.stock === 0}
                        className={`px-6 py-3 border-2 rounded-lg font-medium transition-all relative ${
                          selectedVariant?._id === variant._id
                            ? 'bg-gray-900 text-white border-gray-900'
                            : variant.stock > 0
                            ? 'border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-100'
                        }`}
                      >
                        {variant.size}
                        {variant.stock === 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
                            Hết
                          </div>
                        )}
                        <div className="text-xs opacity-75 mt-1">
                          Stock: {variant.stock}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity and Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold">Số lượng:</span>
                  <div className="flex items-center border-2 border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(false)}
                      disabled={quantity <= 1}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={selectedVariant?.stock || 1}
                      value={quantity}
                      className="w-20 px-4 py-2 text-center border-0 focus:outline-none"
                      readOnly
                    />
                    <button
                      onClick={() => handleQuantityChange(true)}
                      disabled={!selectedVariant || quantity >= selectedVariant.stock}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || selectedVariant.stock === 0}
                  className="w-full py-4 bg-red-600 text-white font-bold text-lg rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {selectedVariant 
                    ? 'THÊM VÀO GIỎ' 
                    : 'CHỌN SIZE ĐỂ MUA'
                  }
                </button>
              </div>

              {/* Product Information */}
              <div className="border-t pt-6">
                <h3 className="text-xl font-bold mb-4">Thông tin sản phẩm</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-600">Brand:</span>
                    <span className="text-gray-900 font-bold uppercase">{product.brand}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-600">Gender:</span>
                    <span className="text-gray-900">{product.gender}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-600">Usage:</span>
                    <span className="text-gray-900">{product.usage}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-600">Color:</span>
                    <span className="text-gray-900">{product.color}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Mô tả:</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}