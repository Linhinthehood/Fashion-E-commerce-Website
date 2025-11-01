import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { customerApi, orderApi } from '../utils/apiService'
import { useToast } from '../contexts/ToastContext'

type Address = {
  _id: string
  name: string
  addressInfo: string
  isDefault: boolean
}

type Customer = {
  _id: string
  userId: string
  addresses: Address[]
  loyaltyPoints: number
}

function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}

export default function CartPage() {
  const navigate = useNavigate()
  const { cartItems, updateCartItemQuantity, removeFromCart, getTotalPrice, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Momo' | 'Bank'>('COD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  // Load customer data if authenticated
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!isAuthenticated || !user) return

      try {
        const response = await customerApi.getProfile()
        if (response.success && response.data) {
          const customerData = response.data as any
          setCustomer(customerData.customer)
          
          // Auto-select default address
          const defaultAddress = customerData.customer.addresses.find((addr: any) => addr.isDefault)
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress._id)
          } else if (customerData.customer.addresses.length > 0) {
            setSelectedAddressId(customerData.customer.addresses[0]._id)
          }
        }
      } catch (error) {
        console.error('Error loading customer data:', error)
      }
    }

    loadCustomerData()
  }, [isAuthenticated, user])

  const handleQuantityChange = (productId: string, variantId: string, newQuantity: number) => {
    updateCartItemQuantity(productId, variantId, newQuantity)
  }

  const handleRemoveItem = (productId: string, variantId: string) => {
    removeFromCart(productId, variantId)
  }

  const handlePlaceOrder = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Vui lòng đăng nhập để đặt hàng')
      navigate('/login')
      return
    }

    if (cartItems.length === 0) {
      toast.info('Giỏ hàng trống')
      return
    }

    if (!selectedAddressId) {
      toast.error('Vui lòng chọn địa chỉ giao hàng')
      return
    }

    if (!customer || customer.addresses.length === 0) {
      toast.error('Vui lòng thêm địa chỉ giao hàng trong tài khoản của bạn')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Step 1: Create order
      const createOrderResponse = await orderApi.createOrder({
        userId: user._id,
        addressId: selectedAddressId,
        paymentMethod
      })

      if (!createOrderResponse.success) {
        throw new Error(createOrderResponse.message || 'Failed to create order')
      }

      const orderData = createOrderResponse.data as any
      const orderId = orderData?.order?._id
      if (!orderId) {
        throw new Error('Order ID not returned')
      }

      // Step 2: Add order items
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity
      }))

      const addItemsResponse = await orderApi.addItems({
        orderId,
        items: orderItems
      })

      if (!addItemsResponse.success) {
        throw new Error(addItemsResponse.message || 'Failed to add items to order')
      }

      // Success - clear cart and show success message
      clearCart()
      toast.success('Đã đặt hàng thành công!')
      navigate('/')

    } catch (error: any) {
      console.error('Error placing order:', error)
      setError(error.message || 'Có lỗi xảy ra khi đặt hàng')
      toast.error(error.message || 'Có lỗi xảy ra khi đặt hàng')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Vui lòng đăng nhập</h1>
          <p className="text-gray-600 mb-6">Bạn cần đăng nhập để xem giỏ hàng</p>
          <Link
            to="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Giỏ hàng trống</h1>
          <p className="text-gray-600 mb-6">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục</p>
          <Link
            to="/products"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Mua sắm ngay
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Giỏ hàng của bạn</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Sản phẩm đã chọn</h2>
              
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    <img 
                      src={item.image} 
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                      <p className="text-sm text-gray-600">{item.brand} - {item.color} - Size {item.size}</p>
                      <p className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</p>
                      <p className="font-semibold text-red-600">{formatCurrencyVND(item.price)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.variantId, item.quantity - 1)}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="px-4 py-2 border-x border-gray-300">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.variantId, item.quantity + 1)}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveItem(item.productId, item.variantId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-lg text-red-600">
                        {formatCurrencyVND(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-6">Tóm tắt đơn hàng</h2>

              {/* Address Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ giao hàng
                </label>
                {customer && customer.addresses.length > 0 ? (
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {customer.addresses.map((address) => (
                      <option key={address._id} value={address._id}>
                        {address.name} - {address.addressInfo}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    Vui lòng thêm địa chỉ giao hàng trong tài khoản của bạn
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phương thức thanh toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'COD' | 'Momo' | 'Bank')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                  <option value="Momo">Ví điện tử Momo</option>
                  <option value="Bank">Chuyển khoản ngân hàng</option>
                </select>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Tạm tính:</span>
                  <span className="font-semibold">{formatCurrencyVND(getTotalPrice())}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Phí vận chuyển:</span>
                  <span className="font-semibold text-green-600">Miễn phí</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Giảm giá:</span>
                  <span className="font-semibold">0₫</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Tổng cộng:</span>
                    <span className="text-xl font-bold text-red-600">{formatCurrencyVND(getTotalPrice())}</span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddressId || cartItems.length === 0}
                className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Đang xử lý...' : 'Đặt hàng ngay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
