import { useAuth } from '../contexts/AuthContext'

export default function StockClerkPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              This is the Stock Clerk Page
            </h1>
            <p className="text-gray-600 mb-4">
              Welcome back, {user?.name}! You have stock management privileges.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-blue-700 text-sm">
                <strong>Stock Clerk Dashboard</strong><br />
                Manage inventory, update stock levels, and track product availability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
