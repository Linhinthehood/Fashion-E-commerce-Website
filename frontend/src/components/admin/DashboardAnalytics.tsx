import { useState, useEffect } from 'react'
import { analyticsApi } from '../../utils/apiService'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

type Period = 'day' | 'month' | 'year' | 'all'

type OverviewData = {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  paidOrders: number
  paidRevenue: number
}

type TopProduct = {
  productId: string
  productName: string
  brand: string
  image: string
  totalQuantity: number
  totalOrders: number
  totalRevenue: number
}

type TopCustomer = {
  userId: string
  name: string
  email: string
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
}

type TimelineData = {
  period: string | number
  orders: number
  revenue: number
}

type ApiResponse = {
  success: boolean
  message?: string
  data: {
    period: Period
    date: string | null
    overview?: OverviewData
    topProducts?: TopProduct[]
    topCustomers?: TopCustomer[]
    timeline?: TimelineData[]
    byPaymentStatus?: Array<{ status: string; count: number }>
    byShipmentStatus?: Array<{ status: string; count: number }>
  }
}

function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num)
}

function getDateInputFormat(period: Period): string {
  const now = new Date()
  if (period === 'day') {
    return now.toISOString().split('T')[0] // YYYY-MM-DD
  } else if (period === 'month') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
  } else if (period === 'year') {
    return String(now.getFullYear()) // YYYY
  }
  return ''
}

export default function DashboardAnalytics() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [period, setPeriod] = useState<Period>('month')
  const [date, setDate] = useState<string>(getDateInputFormat('month'))
  
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [paymentStatusData, setPaymentStatusData] = useState<Array<{ status: string; count: number }>>([])
  const [shipmentStatusData, setShipmentStatusData] = useState<Array<{ status: string; count: number }>>([])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Format date based on period
      let formattedDate: string | undefined = date
      if (period === 'all') {
        formattedDate = undefined
      }

      const response = await analyticsApi.getOverview({
        period,
        date: formattedDate
      }) as ApiResponse

      if (response.success && response.data) {
        setOverview(response.data.overview || null)
        setTopProducts(response.data.topProducts || [])
        setTopCustomers(response.data.topCustomers || [])
        setTimeline(response.data.timeline || [])
        
        // Also load detailed stats for charts
        const statsResponse = await analyticsApi.getOrdersStats({
          period,
          date: formattedDate
        }) as ApiResponse

        if (statsResponse.success && statsResponse.data) {
          setPaymentStatusData(statsResponse.data.byPaymentStatus || [])
          setShipmentStatusData(statsResponse.data.byShipmentStatus || [])
          if (statsResponse.data.timeline) {
            setTimeline(statsResponse.data.timeline)
          }
        }
      } else {
        throw new Error(response.message || 'Failed to load dashboard data')
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err)
      setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, date])

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod)
    if (newPeriod === 'all') {
      setDate('')
    } else {
      setDate(getDateInputFormat(newPeriod))
    }
  }

  const getDateInputType = (): string => {
    if (period === 'day') return 'date'
    if (period === 'month') return 'month'
    if (period === 'year') return 'number'
    return 'text'
  }

  const getDatePlaceholder = (): string => {
    if (period === 'day') return 'YYYY-MM-DD'
    if (period === 'month') return 'YYYY-MM'
    if (period === 'year') return 'YYYY'
    return ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">📊 Dashboard Analytics</h2>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Khoảng thời gian:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePeriodChange('day')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === 'day'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ngày
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('month')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === 'month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tháng
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('year')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === 'year'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Năm
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tất cả
                </button>
              </div>
            </div>

            {period !== 'all' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  {period === 'day' ? 'Ngày' : period === 'month' ? 'Tháng' : 'Năm'}:
                </label>
                {period === 'year' ? (
                  <input
                    type="number"
                    value={date}
                    onChange={(e) => {
                      const year = e.target.value
                      if (year.length <= 4) {
                        setDate(year)
                      }
                    }}
                    onBlur={() => {
                      if (date && date.length === 4) {
                        loadData()
                      }
                    }}
                    placeholder="YYYY"
                    min="2000"
                    max={new Date().getFullYear()}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-24"
                  />
                ) : (
                  <input
                    type={getDateInputType()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder={getDatePlaceholder()}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
            )}

            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrencyVND(overview.totalRevenue)}</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Doanh thu đã thanh toán: {formatCurrencyVND(overview.paidRevenue)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tổng số đơn</p>
                <p className="text-2xl font-bold text-blue-600">{formatNumber(overview.totalOrders)}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Đã thanh toán: {formatNumber(overview.paidOrders)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Giá trị đơn trung bình</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrencyVND(overview.averageOrderValue)}</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Doanh thu đã thanh toán</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrencyVND(overview.paidRevenue)}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {overview.totalOrders > 0 
                ? `${Math.round((overview.paidOrders / overview.totalOrders) * 100)}% đơn đã thanh toán`
                : 'Chưa có đơn hàng'}
            </p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Biểu đồ theo thời gian</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  label={{ value: period === 'day' ? 'Giờ' : period === 'month' ? 'Ngày' : period === 'year' ? 'Tháng' : 'Ngày', position: 'insideBottom', offset: -5 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'orders' ? formatNumber(value) : formatCurrencyVND(value),
                    name === 'orders' ? 'Số đơn hàng' : 'Doanh thu'
                  ]}
                />
                <Legend />
                <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} name="Số đơn hàng" />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Doanh thu" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue Bar Chart */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Doanh thu theo thời gian</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  label={{ value: period === 'day' ? 'Giờ' : period === 'month' ? 'Ngày' : period === 'year' ? 'Tháng' : 'Ngày', position: 'insideBottom', offset: -5 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrencyVND(value)} />
                <Legend />
                <Bar dataKey="revenue" fill="#10B981" name="Doanh thu" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Status Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {paymentStatusData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💳 Phân bố theo trạng thái thanh toán</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: { name?: string; value?: number }) => {
                    // Access data from the entry - recharts passes the data entry as props
                    const status = props.name || ''
                    const count = props.value || 0
                    return `${status}: ${count}`
                  }}
                >
                  {paymentStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {shipmentStatusData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚚 Phân bố theo trạng thái giao hàng</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={shipmentStatusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: { name?: string; value?: number }) => {
                    // Access data from the entry - recharts passes the data entry as props
                    const status = props.name || ''
                    const count = props.value || 0
                    return `${status}: ${count}`
                  }}
                >
                  {shipmentStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Products Table */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Sản Phẩm Bán Chạy</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số đơn</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topProducts.map((product, index) => (
                  <tr key={product.productId} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt={product.productName} className="w-12 h-12 object-cover rounded" />
                        <span className="text-sm font-medium text-gray-900">{product.productName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{product.brand}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(product.totalQuantity || 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(product.totalOrders || 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">{formatCurrencyVND(product.totalRevenue || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Customers Table */}
      {topCustomers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Top Khách Hàng</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số đơn</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng doanh thu</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị TB/đơn</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topCustomers.map((customer, index) => (
                  <tr key={customer.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{customer.email}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(customer.totalOrders || 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">{formatCurrencyVND(customer.totalRevenue || 0)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrencyVND(customer.averageOrderValue || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !overview && topProducts.length === 0 && topCustomers.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có dữ liệu</h3>
          <p className="text-gray-600">Thử thay đổi khoảng thời gian để xem dữ liệu</p>
        </div>
      )}
    </div>
  )
}
