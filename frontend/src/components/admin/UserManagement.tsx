import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi, customerApi } from '../../utils/apiService'
import { Link } from 'react-router-dom'

type CustomerUser = {
  _id: string
  name: string
  email: string
  phoneNumber?: string
  gender?: string
  dob?: string
  avatar?: string
  status?: string
}

type CustomerAddress = {
  _id: string
  name: string
  addressInfo: string
  isDefault?: boolean
}

type CustomerItem = {
  _id: string
  userId?: CustomerUser
  loyaltyPoints: number
  isActive: boolean
  addresses?: CustomerAddress[]
  createdAt: string
  updatedAt: string
}

type CustomerPagination = {
  current: number
  pages: number
  total: number
}

export default function UserManagement() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [customers, setCustomers] = useState<CustomerItem[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customersError, setCustomersError] = useState<string | null>(null)
  const [customerPagination, setCustomerPagination] = useState<CustomerPagination>({
    current: 1,
    pages: 1,
    total: 0
  })
  const [customerFilters, setCustomerFilters] = useState({
    status: 'all' as 'all' | 'active' | 'inactive',
    page: 1,
    limit: 10
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await authApi.getProfile()
        if (res.success && res.data) {
          const data = res.data as any
          setUser(data.user)
          setCustomer(data.customer)
        } else {
          throw new Error(res.message || 'Failed to load user')
        }
      } catch (e: any) {
        setError(e.message || 'Có lỗi xảy ra khi tải người dùng')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loadCustomers = useCallback(async (page: number = 1) => {
    try {
      setCustomersLoading(true)
      setCustomersError(null)

      const params: Record<string, string | number> = {
        page,
        limit: customerFilters.limit
      }

      if (customerFilters.status !== 'all') {
        params.status = customerFilters.status
      }

      const response = await customerApi.getAllCustomers(params)
      if (response.success && response.data) {
        const data = response.data as {
          customers: CustomerItem[]
          pagination?: CustomerPagination
        }
        setCustomers(data.customers ?? [])
        setCustomerPagination(data.pagination ?? {
          current: page,
          pages: 1,
          total: data.customers?.length ?? 0
        })
      } else {
        throw new Error(response.message || 'Failed to load customers')
      }
    } catch (e: any) {
      setCustomersError(e.message || 'Có lỗi xảy ra khi tải danh sách khách hàng')
      setCustomers([])
    } finally {
      setCustomersLoading(false)
    }
  }, [customerFilters.limit, customerFilters.status])

  useEffect(() => {
    loadCustomers(customerFilters.page)
  }, [loadCustomers, customerFilters.page])

  const displayedCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers
    const keyword = searchTerm.trim().toLowerCase()
    return customers.filter(item => {
      const name = item.userId?.name?.toLowerCase() ?? ''
      const email = item.userId?.email?.toLowerCase() ?? ''
      const phone = item.userId?.phoneNumber?.toLowerCase() ?? ''
      return name.includes(keyword) || email.includes(keyword) || phone.includes(keyword)
    })
  }, [customers, searchTerm])

  const handleStatusFilterChange = (value: 'all' | 'active' | 'inactive') => {
    setCustomerFilters(prev => ({ ...prev, status: value, page: 1 }))
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > customerPagination.pages) return
    setCustomerFilters(prev => ({ ...prev, page }))
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

        {!loading && !error && user && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Tài khoản hiện tại</h2>
                <p className="text-sm text-gray-600">Xem thông tin hồ sơ và liên kết nhanh</p>
              </div>
              <Link to="/profile" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Xem hồ sơ
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <p><span className="font-medium">Họ tên:</span> {user.name}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              {user.phoneNumber && <p><span className="font-medium">Số điện thoại:</span> {user.phoneNumber}</p>}
              <p><span className="font-medium">Vai trò:</span> {user.role}</p>
              {user.status && <p><span className="font-medium">Trạng thái:</span> {user.status}</p>}
            </div>

            {customer && (
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">Khách hàng</h3>
                <p className="text-sm text-gray-600">Số địa chỉ: {customer.addresses?.length || 0}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Danh sách khách hàng</h2>
            <p className="text-sm text-gray-600">Theo dõi thông tin tài khoản khách hàng và trạng thái hoạt động</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Tìm theo tên, email hoặc số điện thoại"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={customerFilters.status}
              onChange={(e) => handleStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {customersLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {customersError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {customersError}
          </div>
        )}

        {!customersLoading && !customersError && displayedCustomers.length === 0 && (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-600">
            Không tìm thấy khách hàng phù hợp.
          </div>
        )}

        {!customersLoading && !customersError && displayedCustomers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liên hệ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm thưởng</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Địa chỉ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedCustomers.map((item) => {
                  const defaultAddress = item.addresses?.find(address => address.isDefault) ?? item.addresses?.[0]
                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{item.userId?.name ?? 'Không xác định'}</span>
                          <span className="text-xs text-gray-500">ID: {item._id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div className="space-y-1">
                          <p>{item.userId?.email}</p>
                          {item.userId?.phoneNumber && <p className="text-xs text-gray-500">{item.userId.phoneNumber}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <span className="font-semibold text-blue-600">{item.loyaltyPoints.toLocaleString('vi-VN')}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {defaultAddress ? (
                          <div>
                            <p className="font-medium">{defaultAddress.name}</p>
                            <p className="text-xs text-gray-500">{defaultAddress.addressInfo}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Chưa có địa chỉ</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!customersLoading && !customersError && customerPagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              Hiển thị {displayedCustomers.length} / {customerPagination.total} khách hàng (Trang {customerPagination.current}/{customerPagination.pages})
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(customerPagination.current - 1)}
                disabled={customerPagination.current <= 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => goToPage(customerPagination.current + 1)}
                disabled={customerPagination.current >= customerPagination.pages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
