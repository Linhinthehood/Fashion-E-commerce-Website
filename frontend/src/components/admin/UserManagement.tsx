import { useEffect, useState } from 'react'
import { authApi } from '../../utils/apiService'
import { Link } from 'react-router-dom'

export default function UserManagement() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)

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

  return (
    <div className="p-6">
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
    </div>
  )
}
