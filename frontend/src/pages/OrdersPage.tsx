import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { orderApi } from '../utils/apiService'

type OrderItem = {
  _id: string
  productId: string
  variantId: string
  productName: string
  brand: string
  color: string
  size: string
  price: number
  quantity: number
  subPrice: number
  image: string
  sku?: string
  categoryInfo: {
    masterCategory: string
    subCategory: string
    articleType: string
  }
}

type PaymentHistory = {
  status: 'Pending' | 'Paid' | 'Failed' | 'Refunded'
  updateAt: string
}

type ShipmentHistory = {
  status: 'Pending' | 'Packed' | 'Delivered' | 'Returned'
  updateAt: string
}

type Order = {
  _id: string
  userId: string
  addressId: string
  totalPrice: number
  discount: number
  finalPrice: number
  paymentMethod: 'COD' | 'Momo' | 'Bank'
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded'
  shipmentStatus: 'Pending' | 'Packed' | 'Delivered' | 'Returned'
  paymentHistory: PaymentHistory[]
  shipmentHistory: ShipmentHistory[]
  itemCount: number
  orderNumber: string
  createdAt: string
  updatedAt: string
}


function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

function getStatusColor(status: string, type: 'payment' | 'shipment'): string {
  if (type === 'payment') {
    switch (status) {
      case 'Paid': return 'text-green-600 bg-green-100'
      case 'Pending': return 'text-yellow-600 bg-yellow-100'
      case 'Failed': return 'text-red-600 bg-red-100'
      case 'Refunded': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  } else {
    switch (status) {
      case 'Delivered': return 'text-green-600 bg-green-100'
      case 'Packed': return 'text-blue-600 bg-blue-100'
      case 'Pending': return 'text-yellow-600 bg-yellow-100'
      case 'Returned': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }
}

function getStatusText(status: string, type: 'payment' | 'shipment'): string {
  if (type === 'payment') {
    switch (status) {
      case 'Paid': return 'Đã thanh toán'
      case 'Pending': return 'Chờ thanh toán'
      case 'Failed': return 'Thanh toán thất bại'
      case 'Refunded': return 'Đã hoàn tiền'
      default: return status
    }
  } else {
    switch (status) {
      case 'Delivered': return 'Đã giao hàng'
      case 'Packed': return 'Đã đóng gói'
      case 'Pending': return 'Chờ xử lý'
      case 'Returned': return 'Đã trả hàng'
      default: return status
    }
  }
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [showOrderDetail, setShowOrderDetail] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    hasNextPage: false,
    hasPrevPage: false
  })

  // Load orders
  useEffect(() => {
    const loadOrders = async () => {
      if (!isAuthenticated || !user) {
        navigate('/login')
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await orderApi.getMyOrders({ userId: user._id })
        
        if (response.success && response.data) {
          const data = response.data as any
          setOrders(data.orders || [])
          setPagination(data.pagination || pagination)
        } else {
          throw new Error(response.message || 'Failed to load orders')
        }
      } catch (error: any) {
        console.error('Error loading orders:', error)
        setError(error.message || 'Có lỗi xảy ra khi tải đơn hàng')
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [isAuthenticated, user, navigate])

  // Load order details
  const handleViewOrderDetail = async (order: Order) => {
    try {
      setLoading(true)
      
      const response = await orderApi.getById(order._id)
      
      if (response.success && response.data) {
        const data = response.data as any
        setSelectedOrder(data.order)
        setOrderItems(data.orderItems || [])
        setIsClosing(false)
        setShowOrderDetail(true)
      } else {
        throw new Error(response.message || 'Failed to load order details')
      }
    } catch (error: any) {
      console.error('Error loading order details:', error)
      setError(error.message || 'Có lỗi xảy ra khi tải chi tiết đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  // Close modal with animation
  const handleCloseModal = () => {
    setIsClosing(true)
    setTimeout(() => {
      setShowOrderDetail(false)
      setIsClosing(false)
      setSelectedOrder(null)
      setOrderItems([])
    }, 300)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Vui lòng đăng nhập</h1>
          <p className="text-gray-600 mb-6">Bạn cần đăng nhập để xem đơn hàng</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Đơn hàng của tôi</h1>
          <Link
            to="/products"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tiếp tục mua sắm
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Chưa có đơn hàng nào</h2>
            <p className="text-gray-600 mb-6">Hãy bắt đầu mua sắm để tạo đơn hàng đầu tiên</p>
            <Link
              to="/products"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Mua sắm ngay
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Đơn hàng #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Ngày đặt: {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrencyVND(order.finalPrice)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.itemCount} sản phẩm
                      </p>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trạng thái thanh toán
                      </label>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.paymentStatus, 'payment')}`}>
                        {getStatusText(order.paymentStatus, 'payment')}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trạng thái giao hàng
                      </label>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.shipmentStatus, 'shipment')}`}>
                        {getStatusText(order.shipmentStatus, 'shipment')}
                      </span>
                    </div>
                  </div>

                  {/* Payment and Shipment History - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Payment History */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Lịch sử thanh toán</h4>
                      <div className="space-y-3">
                        {order.paymentHistory.map((payment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status, 'payment')}`}>
                              {getStatusText(payment.status, 'payment')}
                            </span>
                            <span className="text-gray-500 text-xs">{formatDateTime(payment.updateAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipment History */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Lịch sử giao hàng</h4>
                      <div className="space-y-3">
                        {order.shipmentHistory.map((shipment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(shipment.status, 'shipment')}`}>
                              {getStatusText(shipment.status, 'shipment')}
                            </span>
                            <span className="text-gray-500 text-xs">{formatDateTime(shipment.updateAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <p>Phương thức: {order.paymentMethod}</p>
                      {order.discount > 0 && (
                        <p>Giảm giá: -{formatCurrencyVND(order.discount)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleViewOrderDetail(order)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <button
                  disabled={!pagination.hasPrevPage}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                  Trước
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Trang {pagination.currentPage} / {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasNextPage}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}

        {/* Order Detail Modal */}
        {showOrderDetail && selectedOrder && (
          <div 
            className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300 ${
              isClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'
            }`}
            onClick={handleCloseModal}
          >
            <div 
              className={`bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden transition-all duration-300 ${
                isClosing 
                  ? 'animate-out zoom-out-95 slide-out-to-bottom-4 duration-300' 
                  : 'animate-in zoom-in-95 slide-in-from-bottom-4 duration-300'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Chi tiết đơn hàng #{selectedOrder.orderNumber}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
                <div className="p-6">

                {/* Order Items */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-6 text-gray-900">Sản phẩm đã đặt</h3>
                  <div className="space-y-4">
                    {orderItems.map((item) => (
                      <div key={item._id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <img 
                          src={item.image} 
                          alt={item.productName}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg">{item.productName}</h4>
                          <p className="text-sm text-gray-600">{item.brand} - {item.color} - Size {item.size}</p>
                          <p className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</p>
                          <p className="text-sm text-gray-500">
                            Danh mục: {item.categoryInfo.masterCategory} &gt; {item.categoryInfo.subCategory} &gt; {item.categoryInfo.articleType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600 text-lg">{formatCurrencyVND(item.price)}</p>
                          <p className="text-sm text-gray-500">SL: {item.quantity}</p>
                          <p className="font-bold text-red-600 text-lg">{formatCurrencyVND(item.subPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Status and History */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-6 text-gray-900">Trạng thái đơn hàng</h3>
                  
                  {/* Current Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Trạng thái thanh toán hiện tại</h4>
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.paymentStatus, 'payment')}`}>
                        {getStatusText(selectedOrder.paymentStatus, 'payment')}
                      </span>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Trạng thái giao hàng hiện tại</h4>
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.shipmentStatus, 'shipment')}`}>
                        {getStatusText(selectedOrder.shipmentStatus, 'shipment')}
                      </span>
                    </div>
                  </div>

                  {/* Payment and Shipment History */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Payment History */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-4">Lịch sử thanh toán</h4>
                      <div className="space-y-3">
                        {selectedOrder.paymentHistory.map((payment, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                            <div>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status, 'payment')}`}>
                                {getStatusText(payment.status, 'payment')}
                              </span>
                            </div>
                            <span className="text-gray-500 text-sm">{formatDateTime(payment.updateAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipment History */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-4">Lịch sử giao hàng</h4>
                      <div className="space-y-3">
                        {selectedOrder.shipmentHistory.map((shipment, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
                            <div>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(shipment.status, 'shipment')}`}>
                                {getStatusText(shipment.status, 'shipment')}
                              </span>
                            </div>
                            <span className="text-gray-500 text-sm">{formatDateTime(shipment.updateAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Tóm tắt đơn hàng</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Tạm tính:</span>
                          <span>{formatCurrencyVND(selectedOrder.totalPrice)}</span>
                        </div>
                        {selectedOrder.discount > 0 && (
                          <div className="flex justify-between">
                            <span>Giảm giá:</span>
                            <span className="text-green-600">-{formatCurrencyVND(selectedOrder.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg">
                          <span>Tổng cộng:</span>
                          <span className="text-red-600">{formatCurrencyVND(selectedOrder.finalPrice)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Thông tin đơn hàng</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Số đơn hàng:</span> {selectedOrder.orderNumber}</p>
                        <p><span className="font-medium">Ngày đặt:</span> {formatDateTime(selectedOrder.createdAt)}</p>
                        <p><span className="font-medium">Phương thức:</span> {selectedOrder.paymentMethod}</p>
                        <p><span className="font-medium">Số sản phẩm:</span> {selectedOrder.itemCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
