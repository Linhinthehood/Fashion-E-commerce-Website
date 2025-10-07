import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const menus = [
  {
    label: 'Apparel',
    path: '/c/apparel',
    children: [
      { label: 'Topwear', path: '/c/apparel/topwear' },
      { label: 'Bottomwear', path: '/c/apparel/bottomwear' }
    ]
  },
  {
    label: 'Accessories',
    path: '/c/accessories',
    children: [
      { label: 'Hat', path: '/c/accessories/hat' },
      { label: 'Watch', path: '/c/accessories/watch' },
      { label: 'Wallet', path: '/c/accessories/wallet' } // Add this
    ]
  },
  {
    label: 'Footwear',
    path: '/c/footwear',
    children: [
      { label: 'Shoe', path: '/c/footwear/shoe' }
    ]
  }
]

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()

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
                <NavLink
                  to={menu.path}
                  className={({ isActive }) => `
                    relative flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50
                    ${isActive 
                      ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-purple-50' 
                      : 'text-gray-700 hover:text-gray-900'
                    }
                  `}
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
                </NavLink>
                
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
                        <span className="group-hover/item:translate-x-1 transition-transform duration-200 inline-block">
                          {child.label}
                        </span>
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
                    <Link
                      to="/profile"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/orders"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                      Orders
                    </Link>
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
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
            <NavLink
              to="/products"
              className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Sản phẩm
            </NavLink>
            {menus.map((menu) => (
              <div key={menu.label}>
                <Link
                  to={menu.path}
                  className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-gray-900 transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {menu.label}
                </Link>
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
            {isAuthenticated ? (
              <div className="px-4 py-3 border-t border-gray-200">
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="space-y-2">
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/orders"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Orders
                  </Link>
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