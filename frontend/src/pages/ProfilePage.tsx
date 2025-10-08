import { useEffect, useState } from 'react'
import { authApi } from '../utils/apiService'

export default function ProfilePage() {
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
          throw new Error(res.message || 'Failed to load profile')
        }
      } catch (e: any) {
        setError(e.message || 'Có lỗi xảy ra khi tải hồ sơ')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Hồ sơ của tôi</h1>

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
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin người dùng</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <p><span className="font-medium">Họ tên:</span> {user.name}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  {user.phoneNumber && <p><span className="font-medium">Số điện thoại:</span> {user.phoneNumber}</p>}
                  {user.gender && <p><span className="font-medium">Giới tính:</span> {user.gender}</p>}
                  {user.dob && <p><span className="font-medium">Ngày sinh:</span> {new Date(user.dob).toLocaleDateString('vi-VN')}</p>}
                  <p><span className="font-medium">Vai trò:</span> {user.role}</p>
                  {user.status && <p><span className="font-medium">Trạng thái:</span> {user.status}</p>}
                </div>
              </div>

              {customer && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Địa chỉ giao hàng</h2>
                  {customer.addresses && customer.addresses.length > 0 ? (
                    <div className="space-y-3">
                      {customer.addresses.map((addr: any) => (
                        <div key={addr._id} className="p-4 border border-gray-200 rounded-lg">
                          <p className="font-medium text-gray-900">{addr.name}</p>
                          <p className="text-gray-700 text-sm">{addr.addressInfo}</p>
                          {addr.isDefault && (
                            <span className="inline-flex mt-2 px-2 py-1 rounded-full text-xs font-medium text-green-700 bg-green-100">Mặc định</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Chưa có địa chỉ nào.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
