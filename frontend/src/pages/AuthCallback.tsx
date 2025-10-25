import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../utils/api'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const { updateUser } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')
        const success = urlParams.get('success')
        const error = urlParams.get('error')

        if (success === 'true' && token) {
          // Store token in localStorage
          localStorage.setItem('token', token)
          
          // Fetch user profile to get user data
          try {
            const profileResponse = await authAPI.getProfile()
            if (profileResponse.success && profileResponse.data) {
              // Store user data
              localStorage.setItem('user', JSON.stringify(profileResponse.data))
              updateUser(profileResponse.data)
              
              setStatus('success')
              setMessage('Đăng nhập thành công! Đang chuyển hướng...')
              
              // Redirect to products page after 2 seconds
              setTimeout(() => {
                navigate('/products')
              }, 2000)
            } else {
              throw new Error('Failed to fetch user profile')
            }
          } catch (profileError) {
            console.error('Profile fetch error:', profileError)
            setStatus('error')
            setMessage('Không thể tải thông tin người dùng.')
            
            setTimeout(() => {
              navigate('/login')
            }, 3000)
          }
        } else if (success === 'false') {
          setStatus('error')
          
          switch (error) {
            case 'google_auth_failed':
              setMessage('Đăng nhập Google thất bại. Vui lòng thử lại.')
              break
            case 'authentication_failed':
              setMessage('Xác thực thất bại. Vui lòng thử lại.')
              break
            default:
              setMessage('Có lỗi xảy ra. Vui lòng thử lại.')
          }
          
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            navigate('/login')
          }, 3000)
        } else {
          setStatus('error')
          setMessage('Tham số không hợp lệ.')
          
          setTimeout(() => {
            navigate('/login')
          }, 3000)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setStatus('error')
        setMessage('Có lỗi xảy ra. Vui lòng thử lại.')
        
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    }

    handleCallback()
  }, [navigate, updateUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          
          {status === 'loading' && (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Đang xử lý...
              </h2>
              <p className="text-gray-600">
                Vui lòng chờ trong giây lát
              </p>
              <div className="mt-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <h2 className="text-3xl font-bold text-green-600 mb-2">
                Thành công!
              </h2>
              <p className="text-gray-600">
                {message}
              </p>
              <div className="mt-6">
                <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <h2 className="text-3xl font-bold text-red-600 mb-2">
                Lỗi!
              </h2>
              <p className="text-gray-600">
                {message}
              </p>
              <div className="mt-6">
                <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
