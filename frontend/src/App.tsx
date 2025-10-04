import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import ProductsPage from './pages/ProductsPage'
import ProductDetail from './pages/ProductDetail.tsx'
import Login from './pages/Login.tsx'
import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<div>Not Found. <Link to="/">Go Home</Link></div>} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
