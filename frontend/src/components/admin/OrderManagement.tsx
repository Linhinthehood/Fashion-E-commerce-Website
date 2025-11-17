
import { useState, useEffect } from 'react'
import { orderApi } from '../../utils/apiService'
import { useToast } from '../../contexts/ToastContext'

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
  paymentHistory: Array<{ status: string; updateAt: string }>
  shipmentHistory: Array<{ status: string; updateAt: string }>
  itemCount: number
  orderNumber: string
  createdAt: string
  updatedAt: string
  user?: {
    name: string
    email: string
  }
}

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

// Helper function to format validation error messages to Vietnamese
function formatValidationError(message: string, type: 'payment' | 'shipment'): string {
  const statusType = type === 'payment' ? 'thanh toán' : 'giao hàng'
  
  // Check if it's a transition error
  if (message.includes('Cannot transition')) {
    // Extract the current and new status from the error message
    const match = message.match(/from (\w+) to (\w+)/)
    if (match) {
      const [, currentStatus, newStatus] = match
      const currentStatusText = getStatusText(currentStatus, type)
      const newStatusText = getStatusText(newStatus, type)
      
      // Extract valid transitions
      const validTransitionsMatch = message.match(/Valid transitions from \w+: (.+)/)
      if (validTransitionsMatch) {
        const validTransitions = validTransitionsMatch[1]
        if (validTransitions.includes('none')) {
          return `Không thể chuyển trạng thái ${statusType} từ "${currentStatusText}" sang "${newStatusText}". Trạng thái "${currentStatusText}" là trạng thái cuối cùng và không thể thay đổi.`
        } else {
          const validStatuses = validTransitions
            .split(',')
            .map(s => s.trim())
            .map(s => getStatusText(s, type))
            .join(', ')
          return `Không thể chuyển trạng thái ${statusType} từ "${currentStatusText}" sang "${newStatusText}". Chỉ có thể chuyển sang: ${validStatuses}.`
        }
      }
      return `Không thể chuyển trạng thái ${statusType} từ "${currentStatusText}" sang "${newStatusText}".`
    }
  }
  
  // Check if status is already set
  if (message.includes('already')) {
    const match = message.match(/already (\w+)/)
    if (match) {
      const status = match[1]
      const statusText = getStatusText(status, type)
      return `Trạng thái ${statusType} đã là "${statusText}".`
    }
  }
  
  // Return original message if no pattern matches
  return message
}

export default function OrderManagement() {
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [showOrderDetail, setShowOrderDetail] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  
  // Get current month start date (YYYY-MM-DD)
  const getCurrentMonthStart = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }

  // Get current month end date (YYYY-MM-DD)
  const getCurrentMonthEnd = () => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Get maximum date (today) for date inputs
  const getMaxDate = () => {
    return getTodayDate()
  }

  // Get current year start date
  const getCurrentYearStart = () => {
    const now = new Date()
    return `${now.getFullYear()}-01-01`
  }

  // Get current year end date
  const getCurrentYearEnd = () => {
    const now = new Date()
    return `${now.getFullYear()}-12-31`
  }

  // Date filter type
  const [dateFilterType, setDateFilterType] = useState<'day' | 'month' | 'year'>('month')

  // Filters - default to current month
  const [filters, setFilters] = useState({
    paymentStatus: '',
    shipmentStatus: '',
    startDate: getCurrentMonthStart(),
    endDate: getCurrentMonthEnd(),
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  })
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    hasNextPage: false,
    hasPrevPage: false
  })

  // Load orders
  const loadOrders = async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      const params = {
        page,
        limit: 10,
        ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus as 'Pending' | 'Paid' | 'Failed' | 'Refunded' }),
        ...(filters.shipmentStatus && { shipmentStatus: filters.shipmentStatus as 'Pending' | 'Packed' | 'Delivered' | 'Returned' }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        sortBy: filters.sortBy as 'createdAt' | 'finalPrice' | 'paymentStatus' | 'shipmentStatus',
        sortOrder: filters.sortOrder
      }

      const response = await orderApi.adminGetAll(params)
      
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

  useEffect(() => {
    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

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

  // Update payment status
  const handleUpdatePaymentStatus = async (orderId: string, status: string) => {
    try {
      const response = await orderApi.updatePaymentStatus(orderId, { status: status as any })
      
      if (response.success) {
        const statusText = getStatusText(status, 'payment')
        toast.success(`Đã cập nhật trạng thái thanh toán thành "${statusText}"`)
        // Reload orders
        loadOrders(pagination.currentPage)
        setError(null)
      } else {
        // Handle API error response - only show toast, don't set error state
        const errorMessage = response.message || 'Có lỗi xảy ra khi cập nhật trạng thái thanh toán'
        const formattedMessage = formatValidationError(errorMessage, 'payment')
        
        toast.error(formattedMessage, { duration: 5000 })
        // Don't set error state - keep orders visible
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error)
      
      // Handle network or unexpected errors - only show toast
      const errorMessage = error.message || 'Có lỗi xảy ra khi cập nhật trạng thái thanh toán'
      const formattedMessage = formatValidationError(errorMessage, 'payment')
      
      toast.error(formattedMessage, { duration: 5000 })
      // Don't set error state - keep orders visible
    }
  }

  // Update shipment status
  const handleUpdateShipmentStatus = async (orderId: string, status: string) => {
    try {
      const response = await orderApi.updateShipmentStatus(orderId, { status: status as any })
      
      if (response.success) {
        const statusText = getStatusText(status, 'shipment')
        toast.success(`Đã cập nhật trạng thái giao hàng thành "${statusText}"`)
        // Reload orders
        loadOrders(pagination.currentPage)
        setError(null)
      } else {
        // Handle API error response - only show toast, don't set error state
        const errorMessage = response.message || 'Có lỗi xảy ra khi cập nhật trạng thái giao hàng'
        const formattedMessage = formatValidationError(errorMessage, 'shipment')
        
        toast.error(formattedMessage, { duration: 5000 })
        // Don't set error state - keep orders visible
      }
    } catch (error: any) {
      console.error('Error updating shipment status:', error)
      
      // Handle network or unexpected errors - only show toast
      const errorMessage = error.message || 'Có lỗi xảy ra khi cập nhật trạng thái giao hàng'
      const formattedMessage = formatValidationError(errorMessage, 'shipment')
      
      toast.error(formattedMessage, { duration: 5000 })
      // Don't set error state - keep orders visible
    }
  }


  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <button
          onClick={() => loadOrders(pagination.currentPage)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        
        {/* Date Filter Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Khoảng thời gian:</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDateFilterType('day')
                const today = getTodayDate()
                setFilters(prev => ({ ...prev, startDate: today, endDate: today }))
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilterType === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ngày
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilterType('month')
                setFilters(prev => ({ ...prev, startDate: getCurrentMonthStart(), endDate: getCurrentMonthEnd() }))
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilterType === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tháng
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilterType('year')
                setFilters(prev => ({ ...prev, startDate: getCurrentYearStart(), endDate: getCurrentYearEnd() }))
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilterType === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Năm
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shipment Status</label>
            <select
              value={filters.shipmentStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, shipmentStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Packed">Packed</option>
              <option value="Delivered">Delivered</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dateFilterType === 'day' ? 'Ngày' : dateFilterType === 'month' ? 'Tháng' : 'Năm bắt đầu'}
            </label>
            <input
              type={dateFilterType === 'day' ? 'date' : dateFilterType === 'month' ? 'month' : 'number'}
              value={
                dateFilterType === 'year' 
                  ? filters.startDate.split('-')[0] 
                  : dateFilterType === 'month'
                  ? filters.startDate.substring(0, 7) // YYYY-MM from YYYY-MM-DD
                  : filters.startDate
              }
              max={dateFilterType === 'day' ? getMaxDate() : undefined}
              min={dateFilterType === 'year' ? '2020' : undefined}
              onChange={(e) => {
                let newStartDate: string
                if (dateFilterType === 'year') {
                  const year = e.target.value
                  newStartDate = `${year}-01-01`
                } else if (dateFilterType === 'month') {
                  newStartDate = `${e.target.value}-01`
                } else {
                  const selectedDate = e.target.value
                  if (selectedDate <= getMaxDate()) {
                    newStartDate = selectedDate
                  } else {
                    return
                  }
                }
                setFilters(prev => ({ ...prev, startDate: newStartDate }))
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dateFilterType === 'day' ? 'Ngày' : dateFilterType === 'month' ? 'Tháng' : 'Năm kết thúc'}
            </label>
            <input
              type={dateFilterType === 'day' ? 'date' : dateFilterType === 'month' ? 'month' : 'number'}
              value={
                dateFilterType === 'year' 
                  ? filters.endDate.split('-')[0] 
                  : dateFilterType === 'month'
                  ? filters.endDate.substring(0, 7) // YYYY-MM from YYYY-MM-DD
                  : filters.endDate
              }
              max={dateFilterType === 'day' ? getMaxDate() : undefined}
              min={dateFilterType === 'year' ? '2020' : undefined}
              onChange={(e) => {
                let newEndDate: string
                if (dateFilterType === 'year') {
                  const year = e.target.value
                  newEndDate = `${year}-12-31`
                } else if (dateFilterType === 'month') {
                  const monthValue = e.target.value
                  const [year, month] = monthValue.split('-')
                  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
                  newEndDate = `${monthValue}-${String(lastDay).padStart(2, '0')}`
                } else {
                  const selectedDate = e.target.value
                  if (selectedDate <= getMaxDate()) {
                    newEndDate = selectedDate
                  } else {
                    return
                  }
                }
                setFilters(prev => ({ ...prev, endDate: newEndDate }))
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="createdAt">Created Date</option>
              <option value="finalPrice">Final Price</option>
              <option value="paymentStatus">Payment Status</option>
              <option value="shipmentStatus">Shipment Status</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có đơn hàng nào</h3>
          <p className="text-gray-600">Thử thay đổi bộ lọc để xem thêm đơn hàng</p>
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
                    {order.user && (
                      <p className="text-sm text-gray-600 mt-1">
                        👤 Khách hàng: <span className="font-medium">{order.user.name}</span> ({order.user.email})
                      </p>
                    )}
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
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.paymentStatus, 'payment')}`}>
                        {getStatusText(order.paymentStatus, 'payment')}
                      </span>
                      <select
                        value={order.paymentStatus}
                        onChange={(e) => handleUpdatePaymentStatus(order._id, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Failed">Failed</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái giao hàng
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.shipmentStatus, 'shipment')}`}>
                        {getStatusText(order.shipmentStatus, 'shipment')}
                      </span>
                      <select
                        value={order.shipmentStatus}
                        onChange={(e) => handleUpdateShipmentStatus(order._id, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Packed">Packed</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Returned">Returned</option>
                      </select>
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Trang {pagination.currentPage} / {pagination.totalPages} (Tổng {pagination.totalOrders} đơn hàng)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadOrders(1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 text-sm"
                >
                  Đầu
                </button>
                <button
                  disabled={!pagination.hasPrevPage}
                  onClick={() => loadOrders(pagination.currentPage - 1)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 text-sm"
                >
                  Trước
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    const current = pagination.currentPage
                    const total = pagination.totalPages
                    
                    if (total <= 5) {
                      pageNum = i + 1
                    } else if (current <= 3) {
                      pageNum = i + 1
                    } else if (current >= total - 2) {
                      pageNum = total - 4 + i
                    } else {
                      pageNum = current - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => loadOrders(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          pagination.currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => loadOrders(pagination.currentPage + 1)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 text-sm"
                >
                  Sau
                </button>
                <button
                  onClick={() => loadOrders(pagination.totalPages)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 text-sm"
                >
                  Cuối
                </button>
                
                {/* Jump to page input */}
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-600">Đến trang:</span>
                  <input
                    type="number"
                    min="1"
                    max={pagination.totalPages}
                    defaultValue={pagination.currentPage}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement
                        const pageNum = parseInt(target.value, 10)
                        if (pageNum >= 1 && pageNum <= pagination.totalPages) {
                          loadOrders(pageNum)
                          target.value = ''
                        }
                      }
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={String(pagination.currentPage)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div 
          className={`fixed inset-0 flex items-center justify-center p-4 z-50 transition-all duration-300 ${
            isClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'
          }`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
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
  )
}
