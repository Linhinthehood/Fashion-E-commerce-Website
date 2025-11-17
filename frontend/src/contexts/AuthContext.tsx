import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { authAPI } from '../utils/api'

type User = {
  _id: string
  name: string
  email: string
  role: 'Manager' | 'Stock Clerk' | 'Customer'
  phoneNumber?: string
  gender?: 'Male' | 'Female' | 'Others'
  avatar?: string
}

type AuthContextType = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; redirectPath?: string; requiresPasswordChange?: boolean }>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
}

type LoginResponse = {
  success: boolean
  data: {
    user: User
    token: string
  }
  message?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (token && userData) {
        try {
          // Verify token by fetching user profile
          const response = await authAPI.getProfile()
          
          if (response.success && response.data) {
            const profile = response.data as { user: User }
            if (profile.user) {
              setUser(profile.user)
              localStorage.setItem('user', JSON.stringify(profile.user))
            } else {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
            }
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token')
            localStorage.removeItem('user')
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          // Clear invalid data
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; redirectPath?: string; requiresPasswordChange?: boolean }> => {
    try {
      // Use the same authAPI.login that works
      const response = await authAPI.login({ email, password }) as LoginResponse & { requiresPasswordChange?: boolean }

      // Handle temporary password case
      if (response.requiresPasswordChange && response.data) {
        // Store token and user data
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        // Update state
        setUser(response.data.user)
        
        // Redirect to change password page
        return { success: true, redirectPath: '/change-password', requiresPasswordChange: true }
      }

      if (response.success && response.data) {
        // Store token and user data
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        // Update state
        setUser(response.data.user)
        
        // Determine redirect path based on user role
        let redirectPath = '/products' // Default for Customer
        
        if (response.data.user.role === 'Manager') {
          redirectPath = '/admin'
        } else if (response.data.user.role === 'Stock Clerk') {
          redirectPath = '/stock-clerk'
        }
        
        return { success: true, redirectPath }
      }
      
      return { success: false }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false }
    }
  }

  const logout = () => {
    // Clear storage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // Clear state
    setUser(null)
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
