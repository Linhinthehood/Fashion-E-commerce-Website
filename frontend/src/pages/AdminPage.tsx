import { useState, useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import UserManagement from '../components/admin/UserManagement'
import ProductManagement from '../components/admin/ProductManagement'
import OrderManagement from '../components/admin/OrderManagement'
import AddProduct from '../components/admin/AddProduct'

type TabType = 'users' | 'products' | 'create-product' | 'orders'

const resolveTabParam = (value: string | null): TabType => {
  if (value === 'products' || value === 'orders' || value === 'create-product') {
    return value
  }
  return 'users'
}

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<TabType>(() => resolveTabParam(searchParams.get('tab')))

  useEffect(() => {
    const nextTab = resolveTabParam(searchParams.get('tab'))
    if (nextTab !== activeTab) {
      setActiveTab(nextTab)
    }
  }, [searchParams, activeTab])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'users') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab }, { replace: true })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Đang tải thông tin quản trị...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'Manager') {
    return <Navigate to="/" replace />
  }

  const tabs = [
    { id: 'users' as TabType, label: 'User Management', icon: '👥' },
    { id: 'products' as TabType, label: 'Product Management', icon: '🛍️' },
    { id: 'create-product' as TabType, label: 'Add New Product', icon: '➕' },
    { id: 'orders' as TabType, label: 'Order Management', icon: '📦' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />
      case 'products':
        return <ProductManagement />
      case 'create-product':
        return <AddProduct />
      case 'orders':
        return <OrderManagement />
      default:
        return <UserManagement />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bảng quản trị</h1>
                <p className="mt-2 text-gray-600">Quản lý hệ thống và dữ liệu</p>
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

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  )
}