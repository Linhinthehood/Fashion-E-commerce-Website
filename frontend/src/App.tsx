import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import ProductsPage from './pages/ProductsPage'
import ProductDetail from './pages/ProductDetail.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register'
import AdminPage from './pages/AdminPage'
import StockClerkPage from './pages/StockClerkPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import ApparelPage from './pages/ApparelPage.tsx'
import AccessoriesPage from './pages/AccessoriesPage'
import FootwearPage from './pages/FootwearPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/stock-clerk" element={<StockClerkPage />} />
            <Route path="/c/apparel" element={<ApparelPage />} />
            <Route path="/c/apparel/topwear" element={<ApparelPage />} />
            <Route path="/c/apparel/bottomwear" element={<ApparelPage />} />
            <Route path="/c/accessories" element={<AccessoriesPage />} />
            <Route path="/c/accessories/hat" element={<AccessoriesPage />} />
            <Route path="/c/accessories/watch" element={<AccessoriesPage />} />
            <Route path="/c/accessories/wallet" element={<AccessoriesPage />} />
            <Route path="/c/footwear" element={<FootwearPage />} />
            <Route path="/c/footwear/shoe" element={<FootwearPage />} />
            <Route path="*" element={<div>Not Found. <Link to="/">Go Home</Link></div>} />
          </Routes>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
