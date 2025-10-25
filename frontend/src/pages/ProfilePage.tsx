import { useEffect, useState } from 'react'
import { authApi, customerApi } from '../utils/apiService'

type User = {
  _id: string
  name: string
  email: string
  phoneNumber?: string
  gender?: string
  dob?: string
  role: string
  status?: string
  avatar?: string
}

type Address = {
  _id: string
  name: string
  addressInfo: string
  isDefault: boolean
}

type Customer = {
  _id: string
  userId: string
  loyaltyPoints: number
  addresses: Address[]
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  
  // Form states
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    phoneNumber: '',
    avatar: ''
  })
  
  // Address form
  const [addressForm, setAddressForm] = useState({
    name: '',
    addressInfo: '',
    isDefault: false
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await authApi.getProfile()
      if (res.success && res.data) {
        const data = res.data as any
        setUser(data.user)
        setCustomer(data.customer)
        
        // Set form data
        setProfileForm({
          name: data.user.name || '',
          phoneNumber: data.user.phoneNumber || '',
          avatar: data.user.avatar || ''
        })
      } else {
        throw new Error(res.message || 'Failed to load profile')
      }
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi tải hồ sơ')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    try {
      setError(null)
      const res = await authApi.updateProfile(profileForm)
      if (res.success) {
        setUser(prev => prev ? { ...prev, ...profileForm } : null)
        setIsEditingProfile(false)
        setSuccess('Cập nhật thông tin thành công!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(res.message || 'Failed to update profile')
      }
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi cập nhật thông tin')
    }
  }

  const handleAddAddress = async () => {
    try {
      setError(null)
      const res = await customerApi.addAddress(addressForm)
      if (res.success) {
        await loadProfile() // Reload to get updated addresses
        setIsAddingAddress(false)
        setAddressForm({ name: '', addressInfo: '', isDefault: false })
        setSuccess('Thêm địa chỉ thành công!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(res.message || 'Failed to add address')
      }
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi thêm địa chỉ')
    }
  }

  const handleUpdateAddress = async () => {
    if (!editingAddressId) return
    
    try {
      setError(null)
      const res = await customerApi.updateAddress(editingAddressId, addressForm)
      if (res.success) {
        await loadProfile() // Reload to get updated addresses
        setEditingAddressId(null)
        setAddressForm({ name: '', addressInfo: '', isDefault: false })
        setSuccess('Cập nhật địa chỉ thành công!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(res.message || 'Failed to update address')
      }
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi cập nhật địa chỉ')
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return
    
    try {
      setError(null)
      const res = await customerApi.deleteAddress(addressId)
      if (res.success) {
        await loadProfile() // Reload to get updated addresses
        setSuccess('Xóa địa chỉ thành công!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error(res.message || 'Failed to delete address')
      }
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi xóa địa chỉ')
    }
  }

  const startEditAddress = (address: Address) => {
    setAddressForm({
      name: address.name,
      addressInfo: address.addressInfo,
      isDefault: address.isDefault
    })
    setEditingAddressId(address._id)
  }

  const cancelEditAddress = () => {
    setEditingAddressId(null)
    setAddressForm({ name: '', addressInfo: '', isDefault: false })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h1 className="text-2xl font-bold text-white">Hồ sơ cá nhân</h1>
                <p className="text-blue-100">Quản lý thông tin và địa chỉ của bạn</p>
              </div>
              
              <div className="p-6">
                {!isEditingProfile ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900">Thông tin cá nhân</h2>
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Chỉnh sửa
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
                          <p className="text-gray-900 font-medium">{user?.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <p className="text-gray-900">{user?.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                          <p className="text-gray-900">{user?.phoneNumber || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                          <p className="text-gray-900">{user?.gender || 'Chưa cập nhật'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                          <p className="text-gray-900">{user?.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {user?.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900">Chỉnh sửa thông tin</h2>
                      <div className="space-x-2">
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleUpdateProfile}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Lưu thay đổi
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Họ tên</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                        <input
                          type="tel"
                          value={profileForm.phoneNumber}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Loyalty Points */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Điểm tích lũy</h2>
              </div>
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-2">
                  {customer?.loyaltyPoints || 0}
                </div>
                <p className="text-gray-600">điểm</p>
                <p className="text-sm text-gray-500 mt-2">
                  Tích lũy điểm khi mua hàng và đổi lấy ưu đãi
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Address Management */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Địa chỉ giao hàng</h2>
                  <p className="text-green-100">Quản lý địa chỉ nhận hàng</p>
                </div>
                <button
                  onClick={() => setIsAddingAddress(true)}
                  className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium"
                >
                  + Thêm địa chỉ
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Add/Edit Address Form */}
              {(isAddingAddress || editingAddressId) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {isAddingAddress ? 'Thêm địa chỉ mới' : 'Chỉnh sửa địa chỉ'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tên địa chỉ</label>
                      <input
                        type="text"
                        value={addressForm.name}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ví dụ: Nhà riêng, Công ty..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Đặt làm địa chỉ mặc định</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ chi tiết</label>
                    <textarea
                      value={addressForm.addressInfo}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, addressInfo: e.target.value }))}
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={isAddingAddress ? handleAddAddress : handleUpdateAddress}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {isAddingAddress ? 'Thêm địa chỉ' : 'Cập nhật'}
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingAddress(false)
                        cancelEditAddress()
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Address List */}
              {customer?.addresses && customer.addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.addresses.map((address) => (
                    <div key={address._id} className="p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{address.name}</h4>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => startEditAddress(address)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(address._id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm mb-2">{address.addressInfo}</p>
                      {address.isDefault && (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-green-700 bg-green-100">
                          Mặc định
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Chưa có địa chỉ nào</p>
                  <p className="text-sm text-gray-400">Thêm địa chỉ để nhận hàng dễ dàng hơn</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
