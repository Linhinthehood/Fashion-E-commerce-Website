import { Link, NavLink } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { productApi } from '../utils/apiService'

type SubCategory = {
  id: string
  name: string
  productCount: number
  articleTypes: Array<{
    id: string
    articleType: string
    productCount: number
  }>
}

type MasterCategory = {
  name: string
  subCategories: SubCategory[]
}

const masterCategories = ['Apparel', 'Accessories', 'Footwear']

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [masterCategoryData, setMasterCategoryData] = useState<Record<string, MasterCategory>>({})
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({})
  const { user, isAuthenticated, logout } = useAuth()
  const { cartItemCount, cartItems, getTotalPrice } = useCart()

  const isManager = user?.role === 'Manager'
  const isStockClerk = user?.role === 'Stock Clerk'
  const isManagementRole = isManager || isStockClerk
  const canShop = !isManagementRole

  // Load sub-categories for a master category
  const loadSubCategories = useCallback(async (masterCategory: string) => {
    if (masterCategoryData[masterCategory] || loadingCategories[masterCategory]) {
      return
    }

    setLoadingCategories(prev => ({ ...prev, [masterCategory]: true }))
    
    try {
      const response = await productApi.getSubCategoriesByMaster(masterCategory)
      if (response.success && response.data) {
        const data = response.data as {
          masterCategory: string
          subCategories: SubCategory[]
        }
        setMasterCategoryData(prev => ({
          ...prev,
          [masterCategory]: {
            name: masterCategory,
            subCategories: data.subCategories
          }
        }))
      }
    } catch (error) {
      console.error(`Error loading sub-categories for ${masterCategory}:`, error)
    } finally {
      setLoadingCategories(prev => ({ ...prev, [masterCategory]: false }))
    }
  }, [masterCategoryData, loadingCategories])

  // Load sub-categories when needed for shopping navigation
  useEffect(() => {
    if (!canShop) {
      return
    }

    masterCategories.forEach(category => {
      loadSubCategories(category)
    })
  }, [canShop, loadSubCategories])

  // Convert master category data to menu format
  const menus = masterCategories.map(masterCategory => {
    const data = masterCategoryData[masterCategory]
    const isLoading = loadingCategories[masterCategory]
    
    return {
      label: masterCategory,
      path: `/c/${masterCategory.toLowerCase()}`,
      children: data?.subCategories.map(subCategory => ({
        label: subCategory.name,
        path: `/c/${masterCategory}/${subCategory.name}`,
        categoryId: subCategory.id,
        productCount: subCategory.productCount
      })) || (isLoading ? [{ label: 'Loading...', path: '#' }] : [])
    }
  })

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="h-18 flex items-center justify-between">
          
          {/* Logo */}
          <Link 
            to="/" 
            className="group flex items-center gap-3 hover:scale-105 transition-transform duration-200"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Fashion Store
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            
            {/* Home Link */}
            <NavLink
              to="/"
              className={({ isActive }) => `
                relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50
                ${isActive 
                  ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-purple-50' 
                  : 'text-gray-700 hover:text-gray-900'
                }
              `}
            >
              Trang chủ
            </NavLink>

            {isManager && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `
                  relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50
                  ${isActive 
                    ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-purple-50' 
                    : 'text-gray-700 hover:text-gray-900'
                  }
                `}
              >
                Admin Dashboard
              </NavLink>
            )}

            {isStockClerk && (
              <NavLink
                to="/stock-clerk"
                className={({ isActive }) => `
                  relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50
                  ${isActive 
                    ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-purple-50' 
                    : 'text-gray-700 hover:text-gray-900'
                  }
                `}
              >
                Quản lý kho
              </NavLink>
            )}

            {canShop && (
              <>
                {/* Products Link */}
                <NavLink
                  to="/products"
                  className={({ isActive }) => `
                    relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50
                    ${isActive 
                      ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-purple-50' 
                      : 'text-gray-700 hover:text-gray-900'
                    }
                  `}
                >
                  Sản phẩm
                </NavLink>

                {/* Category Menus */}
                {menus.map((menu) => (
                  <div key={menu.label} className="relative group">
                    <div
                      className={`
                        relative flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                        hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50
                        text-gray-700 hover:text-gray-900 cursor-default
                      `}
                      role="button"
                      tabIndex={0}
                    >
                      <span>{menu.label}</span>
                      <svg 
                        className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform duration-200 group-hover:rotate-180" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute left-0 top-full opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                                   group-hover:translate-y-0 translate-y-2 transition-all duration-300 ease-out transform
                                   bg-white rounded-xl shadow-xl border border-gray-100 mt-2 min-w-48 z-50
                                   backdrop-blur-xl backdrop-brightness-110">
                      <div className="py-3">
                        {menu.children.map((child, index) => (
                          <Link
                            key={child.path}
                            className="block px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 
                                       hover:text-gray-900 transition-all duration-200 group/item"
                            to={child.path}
                            style={{ transitionDelay: `${index * 50}ms` }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="group-hover/item:translate-x-1 transition-transform duration-200 inline-block">
                                {child.label}
                              </span>
                              {child.productCount !== undefined && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  {child.productCount}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Contact Link */}
                <NavLink
                  to="/contact"
                  className={({ isActive }) => `
                    relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50
                    ${isActive 
                      ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-purple-50' 
                      : 'text-gray-700 hover:text-gray-900'
                    }
                  `}
                >
                  Liên hệ
                </NavLink>
              </>
            )}

            {canShop && (
              <div className="relative group">
                <Link
                  to="/cart"
                  className="flex items-center justify-center p-3 rounded-lg text-sm font-medium transition-all duration-200
                             hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 text-gray-700 hover:text-gray-900"
                >
                  <div className="relative">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                    </svg>
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {cartItemCount > 99 ? '99+' : cartItemCount}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Cart Dropdown */}
                {cartItems.length > 0 && (
                  <div className="absolute right-0 top-full opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                                 group-hover:translate-y-0 translate-y-2 transition-all duration-300 ease-out transform
                                 bg-white rounded-xl shadow-xl border border-gray-100 mt-2 min-w-80 max-w-96 z-50">
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Giỏ hàng của bạn</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {cartItems.slice(0, 3).map((item) => (
                          <div key={`${item.productId}-${item.variantId}`} className="flex items-center gap-3">
                            <img 
                              src={item.image} 
                              alt={item.productName}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.brand} - {item.size}</p>
                              <p className="text-xs text-gray-500">SL: {item.quantity}</p>
                            </div>
                            <div className="text-sm font-semibold text-red-600">
                              {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                            </div>
                          </div>
                        ))}
                        {cartItems.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">... và {cartItems.length - 3} sản phẩm khác</p>
                        )}
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-semibold text-gray-900">Tổng cộng:</span>
                          <span className="font-bold text-red-600">{getTotalPrice().toLocaleString('vi-VN')}₫</span>
                        </div>
                        <Link
                          to="/cart"
                          className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Xem giỏ hàng
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="ml-4 relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg 
                           hover:from-green-700 hover:to-blue-700 hover:shadow-lg transition-all duration-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium">{user?.name}</span>
                  <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* User Dropdown */}
                <div className="absolute right-0 top-full opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                               group-hover:translate-y-0 translate-y-2 transition-all duration-300 ease-out transform
                               bg-white rounded-xl shadow-xl border border-gray-100 mt-2 min-w-48 z-50">
                  <div className="py-3">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-blue-600 font-medium">{user?.role}</p>
                    </div>
                    {isManager && (
                      <Link
                        to="/admin"
                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    {isStockClerk && (
                      <Link
                        to="/stock-clerk"
                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        Quản lý kho
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                      Profile
                    </Link>
                    {canShop && (
                      <Link
                        to="/orders"
                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        Đơn hàng
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="block w-full text-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="ml-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg 
                           hover:from-blue-700 hover:to-purple-700 hover:shadow-lg transition-all duration-200 
                           flex items-center gap-2 group"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm font-medium">Đăng nhập</span>
              </NavLink>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`
          lg:hidden transition-all duration-300 ease-in-out overflow-hidden
          ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <div className="py-4 space-y-2 border-t border-gray-200 mt-4">
            <NavLink
              to="/"
              className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Trang chủ
            </NavLink>
            {isManager && (
              <NavLink
                to="/admin"
                className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin Dashboard
              </NavLink>
            )}
            {isStockClerk && (
              <NavLink
                to="/stock-clerk"
                className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Quản lý kho
              </NavLink>
            )}
            {canShop && (
              <>
                <NavLink
                  to="/products"
                  className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sản phẩm
                </NavLink>
                {menus.map((menu) => (
                  <div key={menu.label}>
                    <div
                      className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 transition-colors duration-200"
                    >
                      {menu.label}
                    </div>
                    <div className="ml-4 space-y-1">
                      {menu.children.map((child) => (
                        <Link
                          key={child.path}
                          className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                          to={child.path}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <NavLink
                  to="/contact"
                  className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Liên hệ
                </NavLink>
              </>
            )}
            {isAuthenticated ? (
              <div className="px-4 py-3 border-t border-gray-200">
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <p className="text-xs text-blue-600 font-medium">{user?.role}</p>
                </div>
                <div className="space-y-2">
                  {isManager && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  {isStockClerk && (
                    <Link
                      to="/stock-clerk"
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Quản lý kho
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  {canShop && (
                    <Link
                      to="/orders"
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Đơn hàng
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout()
                      setIsMenuOpen(false)
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="block px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Đăng nhập
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}