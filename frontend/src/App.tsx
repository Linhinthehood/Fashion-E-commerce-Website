import { Routes, Route, Link } from 'react-router-dom'
import  { lazy } from 'react'
import './App.css'
import Home from './pages/Home'
import ProductDetail from './pages/ProductDetail.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register'
import AdminPage from './pages/AdminPage'
import StockClerkPage from './pages/StockClerkPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'
import Chatbot from './components/Chatbot.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { ToastProvider } from './contexts/ToastContext'
import CategoryPage from './pages/CategoryPage'
import ProfilePage from './pages/ProfilePage'
import AuthCallback from './pages/AuthCallback'
import ForgotPassword from './pages/ForgotPassword'
import ChangePassword from './pages/ChangePassword'
import ContactPage from './pages/ContactPage'

// Only ProductsPage is lazy loaded
const ProductsPage = lazy(() => import('./pages/ProductsPage'))

// Loading fallback for ProductsPage only
// const ProductsLoader = () => (
//   <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//     <div className="text-center">
//       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//       <p className="text-gray-600">Loading products...</p>
//     </div>
//   </div>
// )

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/stock-clerk" element={<StockClerkPage />} />
              <Route path="/c/:masterCategory" element={<CategoryPage />} />
              <Route path="/c/:masterCategory/:subCategory" element={<CategoryPage />} />
              <Route path="*" element={<div>Not Found. <Link to="/">Go Home</Link></div>} />
            </Routes>
            </main>
            <Footer />
            <Chatbot />
          </div>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
