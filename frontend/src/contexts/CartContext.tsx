import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

// Cart types
export type CartItem = {
  productId: string
  variantId: string
  productName: string
  brand: string
  color: string
  size: string
  price: number
  quantity: number
  image: string
  sku?: string
}

type CartContextType = {
  cartItems: CartItem[]
  cartItemCount: number
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, variantId: string) => void
  updateCartItemQuantity: (productId: string, variantId: string, quantity: number) => void
  clearCart: () => void
  getTotalPrice: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

type CartProviderProps = {
  children: ReactNode
}

const CART_STORAGE_KEY = 'fashion_cart'

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const items = localStorage.getItem(CART_STORAGE_KEY)
      if (items) {
        setCartItems(JSON.parse(items))
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error)
    }
  }, [])

  // Save cart to localStorage whenever cartItems change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
    } catch (error) {
      console.error('Error saving cart to storage:', error)
    }
  }, [cartItems])

  const addToCart = (item: CartItem) => {
    setCartItems(prevItems => {
      const existingIndex = prevItems.findIndex(
        existing => existing.productId === item.productId && existing.variantId === item.variantId
      )
      
      if (existingIndex >= 0) {
        // Update quantity if item already exists
        const updatedItems = [...prevItems]
        updatedItems[existingIndex].quantity += item.quantity
        return updatedItems
      } else {
        // Add new item
        return [...prevItems, item]
      }
    })
  }

  const removeFromCart = (productId: string, variantId: string) => {
    setCartItems(prevItems =>
      prevItems.filter(item => !(item.productId === productId && item.variantId === variantId))
    )
  }

  const updateCartItemQuantity = (productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId)
      return
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity }
          : item
      )
    )
  }

  const clearCart = () => {
    setCartItems([])
  }

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0)

  const value: CartContextType = {
    cartItems,
    cartItemCount,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    getTotalPrice
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
