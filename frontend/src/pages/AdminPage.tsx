import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import UserManagement from '../components/admin/UserManagement'
import ProductManagement from '../components/admin/ProductManagement'
import OrderManagement from '../components/admin/OrderManagement'

type TabType = 'users' | 'products' | 'orders'

export default function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('users')

  const tabs = [
    { id: 'users' as TabType, label: 'User Management', icon: '👥' },
    { id: 'products' as TabType, label: 'Product Management', icon: '🛍️' },
    { id: 'orders' as TabType, label: 'Order Management', icon: '📦' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />
      case 'products':
        return <ProductManagement />
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
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
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
                onClick={() => setActiveTab(tab.id)}
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