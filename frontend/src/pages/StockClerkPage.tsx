import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import StockClerkManagement from '../components/admin/StockClerkManagement'

export default function StockClerkPage() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Đang tải thông tin...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'Stock Clerk') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stock Clerk Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quản lý tồn kho</h1>
                <p className="mt-2 text-gray-600">Cập nhật và theo dõi tồn kho sản phẩm</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Chào mừng</p>
                <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mt-1">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Management Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StockClerkManagement />
      </div>
    </div>
  )
}
