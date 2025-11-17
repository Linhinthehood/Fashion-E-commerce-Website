import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react'
import { variantApi, } from '../../utils/apiService'

type Variant = {
  _id: string
  productId: {
    _id: string
    name: string
    brand: string
    gender: string
    images?: string[]
    primaryImage?: string
  }
  size: string
  stock: number
  status: 'Active' | 'Inactive'
  price?: number
  sku?: string
  createdAt: string
  updatedAt: string
}

type VariantPagination = {
  currentPage: number
  totalPages: number
  totalVariants: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const INITIAL_VARIANT_PAGINATION: VariantPagination = {
  currentPage: 1,
  totalPages: 1,
  totalVariants: 0,
  hasNextPage: false,
  hasPrevPage: false
}

function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}

export default function StockClerkManagement() {
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantLoading, setVariantLoading] = useState(true)
  const [variantError, setVariantError] = useState<string | null>(null)
  const [variantPagination, setVariantPagination] = useState<VariantPagination>({ ...INITIAL_VARIANT_PAGINATION })
  const [variantFilters, setVariantFilters] = useState({
    productId: '',
    status: 'Active',
    size: '',
    sku: '',
    hasStock: false,
    page: 1
  })
  const [variantViewMode, setVariantViewMode] = useState<'all' | 'lowStock' | 'outOfStock'>('all')
  const [lowStockThreshold, setLowStockThreshold] = useState(10)

  const [editingVariant, setEditingVariant] = useState<Variant | null>(null)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [variantEditMode, setVariantEditMode] = useState<'add' | 'subtract' | 'set'>('add')
  const [variantEditQuantity, setVariantEditQuantity] = useState('')
  const [variantEditLoading, setVariantEditLoading] = useState(false)
  const [variantEditError, setVariantEditError] = useState<string | null>(null)

  // Load variants
  const loadVariants = useCallback(async (page: number = 1) => {
    try {
      if (variantViewMode === 'all') {
        setVariantLoading(true)
        setVariantError(null)

        const params = {
          page,
          limit: 12,
          ...(variantFilters.productId && { productId: variantFilters.productId }),
          status: variantFilters.status,
          ...(variantFilters.size && { size: variantFilters.size }),
          ...(variantFilters.sku && { sku: variantFilters.sku }),
          hasStock: variantFilters.hasStock
        }

        const response = await variantApi.getVariants(params)
        
        if (response.success && response.data) {
          const data = response.data as {
            variants?: Variant[]
            pagination?: VariantPagination
          }
          const incomingVariants: Variant[] = data.variants || []

          setVariants(incomingVariants)

          if (data.pagination) {
            setVariantPagination(data.pagination)
          } else {
            setVariantPagination({
              currentPage: page,
              totalPages: 1,
              totalVariants: incomingVariants.length,
              hasNextPage: false,
              hasPrevPage: page > 1
            })
          }
        } else {
          throw new Error(response.message || 'Failed to load variants')
        }
      } else if (variantViewMode === 'lowStock') {
        setVariantLoading(true)
        setVariantError(null)

        const response = await variantApi.getLowStockVariants(lowStockThreshold)

        if (response.success && response.data) {
          const data = response.data as { variants?: Variant[] }
          const incomingVariants: Variant[] = data.variants || []
          setVariants(incomingVariants)
          setVariantPagination({
            ...INITIAL_VARIANT_PAGINATION,
            totalVariants: incomingVariants.length,
            hasNextPage: false
          })
        } else {
          throw new Error(response.message || 'Failed to load low stock variants')
        }
      } else {
        setVariantLoading(true)
        setVariantError(null)

        const response = await variantApi.getOutOfStockVariants()

        if (response.success && response.data) {
          const data = response.data as { variants?: Variant[] }
          const incomingVariants: Variant[] = data.variants || []
          setVariants(incomingVariants)
          setVariantPagination({
            ...INITIAL_VARIANT_PAGINATION,
            totalVariants: incomingVariants.length,
            hasNextPage: false
          })
        } else {
          throw new Error(response.message || 'Failed to load out of stock variants')
        }
      }
    } catch (error: any) {
      console.error('Error loading variants:', error)
      setVariantError(error.message || 'Có lỗi xảy ra khi tải variants')
    } finally {
      setVariantLoading(false)
    }
  }, [variantFilters.productId, variantFilters.status, variantFilters.size, variantFilters.sku, variantFilters.hasStock, variantViewMode, lowStockThreshold])

  useEffect(() => {
    loadVariants(1)
  }, [loadVariants])

  const resetVariantEditState = () => {
    setEditingVariant(null)
    setVariantEditMode('add')
    setVariantEditQuantity('')
    setVariantEditError(null)
    setVariantEditLoading(false)
  }

  const closeVariantModal = () => {
    setShowVariantModal(false)
    resetVariantEditState()
  }

  const handleVariantEditClick = (variant: Variant) => {
    setEditingVariant(variant)
    setVariantEditMode('add')
    setVariantEditQuantity('')
    setVariantEditError(null)
    setShowVariantModal(true)
  }

  const handleVariantViewModeChange = (mode: 'all' | 'lowStock' | 'outOfStock') => {
    setVariantViewMode(mode)
    setVariants([])
    setVariantPagination({ ...INITIAL_VARIANT_PAGINATION })
    setVariantFilters(prev => ({ ...prev, page: 1 }))
  }

  const handleLowStockThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    if (!Number.isNaN(value) && value > 0) {
      setLowStockThreshold(value)
    } else if (event.target.value === '') {
      setLowStockThreshold(1)
    }
  }

  const handleVariantEditModeToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'add' | 'subtract' | 'set'
    setVariantEditMode(value)
  }

  const handleVariantQuantityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVariantEditQuantity(event.target.value)
  }

  const handleVariantEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingVariant) return

    const quantityValue = Number(variantEditQuantity)
    if (variantEditMode !== 'set' && (Number.isNaN(quantityValue) || quantityValue <= 0)) {
      setVariantEditError('Vui lòng nhập số lượng lớn hơn 0')
      return
    }

    let delta = 0
    if (variantEditMode === 'set') {
      if (Number.isNaN(quantityValue) || quantityValue < 0) {
        setVariantEditError('Tồn kho phải là số không âm')
        return
      }
      delta = quantityValue - editingVariant.stock
      if (delta === 0) {
        setVariantEditError('Tồn kho không thay đổi')
        return
      }
    } else if (variantEditMode === 'add') {
      delta = quantityValue
    } else {
      if (quantityValue > editingVariant.stock) {
        setVariantEditError('Số lượng cần trừ vượt quá tồn kho hiện tại')
        return
      }
      delta = -quantityValue
    }

    try {
      setVariantEditLoading(true)
      setVariantEditError(null)

      const response = await variantApi.updateStock(editingVariant._id, delta)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to update stock')
      }

      const data = response.data as { variant?: { _id: string; stock: number } }
      const updatedStock = data.variant?.stock ?? editingVariant.stock + delta

      if (variantViewMode === 'all') {
        setVariants(prev => prev.map(variant => variant._id === editingVariant._id ? { ...variant, stock: updatedStock } : variant))
      } else {
        await loadVariants(1)
      }

      setEditingVariant(prev => prev ? { ...prev, stock: updatedStock } : prev)
      setVariantEditQuantity('')
      closeVariantModal()
    } catch (error) {
      console.error('Error updating variant stock:', error)
      setVariantEditError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật tồn kho')
    } finally {
      setVariantEditLoading(false)
    }
  }

  // Get product image
  const getProductImage = (variant: Variant): string => {
    if (variant.productId?.images && variant.productId.images.length > 0) {
      return variant.productId.images[0]
    }
    if (variant.productId?.primaryImage) {
      return variant.productId.primaryImage
    }
    return ''
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-sm text-gray-600 mt-1">Quản lý tồn kho sản phẩm</p>
        </div>
        <button
          onClick={() => {
            setVariants([])
            setVariantPagination({ ...INITIAL_VARIANT_PAGINATION })
            setVariantFilters(prev => ({ ...prev, page: 1 }))
            loadVariants(1)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm font-medium text-gray-600">
          <button
            type="button"
            onClick={() => handleVariantViewModeChange('all')}
            className={`px-3 py-1.5 rounded-md transition ${variantViewMode === 'all' ? 'bg-white text-blue-600 shadow' : 'hover:text-gray-900'}`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => handleVariantViewModeChange('lowStock')}
            className={`px-3 py-1.5 rounded-md transition ${variantViewMode === 'lowStock' ? 'bg-white text-blue-600 shadow' : 'hover:text-gray-900'}`}
          >
            Sắp hết hàng
          </button>
          <button
            type="button"
            onClick={() => handleVariantViewModeChange('outOfStock')}
            className={`px-3 py-1.5 rounded-md transition ${variantViewMode === 'outOfStock' ? 'bg-white text-blue-600 shadow' : 'hover:text-gray-900'}`}
          >
            Hết hàng
          </button>
        </div>

        {variantViewMode === 'lowStock' && (
          <div className="flex items-center gap-2">
            <label htmlFor="lowStockThreshold" className="text-sm font-medium text-gray-700">
              Ngưỡng tồn kho ≤
            </label>
            <input
              id="lowStockThreshold"
              type="number"
              min={1}
              value={lowStockThreshold}
              onChange={handleLowStockThresholdChange}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {variantViewMode !== 'all' && (
          <p className="text-sm text-gray-500">
            Hiển thị {variantViewMode === 'lowStock' ? 'các biến thể sắp hết hàng' : 'các biến thể đã hết hàng'} (tổng {variants.length})
          </p>
        )}
      </div>

      {/* Variants Filters */}
      {variantViewMode === 'all' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={variantFilters.status}
                onChange={(e) => setVariantFilters(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive', page: 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <input
                type="text"
                value={variantFilters.size}
                onChange={(e) => setVariantFilters(prev => ({ ...prev, size: e.target.value, page: 1 }))}
                placeholder="Enter size..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={variantFilters.sku}
                onChange={(e) => setVariantFilters(prev => ({ ...prev, sku: e.target.value, page: 1 }))}
                placeholder="Enter SKU..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasStock"
                checked={variantFilters.hasStock}
                onChange={(e) => setVariantFilters(prev => ({ ...prev, hasStock: e.target.checked, page: 1 }))}
                className="mr-2"
              />
              <label htmlFor="hasStock" className="text-sm font-medium text-gray-700">
                Has Stock Only
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Variants List */}
      {variantLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {variantError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {variantError}
        </div>
      )}

      {!variantLoading && !variantError && variants.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có variants nào</h3>
          <p className="text-gray-600">Thử thay đổi bộ lọc để xem thêm variants</p>
        </div>
      )}

      {!variantLoading && !variantError && variants.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {variants.map((variant) => {
              const productImage = getProductImage(variant)
              return (
                <div key={variant._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Product Image */}
                  {productImage ? (
                    <div className="w-full h-48 bg-gray-100 overflow-hidden">
                      <img 
                        src={productImage} 
                        alt={variant.productId?.name || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="p-4">
                    {/* Product Info */}
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {variant.productId?.name || 'Unknown Product'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-1">{variant.productId?.brand}</p>
                      <p className="text-xs text-gray-500">{variant.productId?.gender}</p>
                    </div>

                    {/* Variant Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Size:</span>
                        <span className="text-sm font-semibold text-gray-900">{variant.size}</span>
                      </div>
                      {variant.sku && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">SKU:</span>
                          <span className="text-xs font-mono text-gray-700">{variant.sku}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Stock:</span>
                        <span className={`text-lg font-bold ${variant.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variant.stock}
                        </span>
                      </div>
                      {variant.price && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Price:</span>
                          <span className="text-sm font-semibold text-red-600">{formatCurrencyVND(variant.price)}</span>
                        </div>
                      )}
                    </div>

                    {/* Status and Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        variant.status === 'Active' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                      }`}>
                        {variant.status}
                      </span>
                      <button
                        onClick={() => handleVariantEditClick(variant)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Cập nhật Stock
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Pagination - Only show for 'all' view mode */}
          {variantViewMode === 'all' && variantPagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Trang {variantPagination.currentPage} / {variantPagination.totalPages} (Tổng {variantPagination.totalVariants} variants)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setVariantFilters(prev => ({ ...prev, page: 1 }))
                    loadVariants(1)
                  }}
                  disabled={variantPagination.currentPage === 1}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors text-sm"
                >
                  Đầu
                </button>
                <button
                  onClick={() => {
                    const prevPage = variantPagination.currentPage - 1
                    setVariantFilters(prev => ({ ...prev, page: prevPage }))
                    loadVariants(prevPage)
                  }}
                  disabled={!variantPagination.hasPrevPage}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors text-sm"
                >
                  Trước
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, variantPagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    const current = variantPagination.currentPage
                    const total = variantPagination.totalPages
                    
                    if (total <= 5) {
                      pageNum = i + 1
                    } else if (current <= 3) {
                      pageNum = i + 1
                    } else if (current >= total - 2) {
                      pageNum = total - 4 + i
                    } else {
                      pageNum = current - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setVariantFilters(prev => ({ ...prev, page: pageNum }))
                          loadVariants(pageNum)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          variantPagination.currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => {
                    const nextPage = variantPagination.currentPage + 1
                    setVariantFilters(prev => ({ ...prev, page: nextPage }))
                    loadVariants(nextPage)
                  }}
                  disabled={!variantPagination.hasNextPage}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors text-sm"
                >
                  Sau
                </button>
                <button
                  onClick={() => {
                    const lastPage = variantPagination.totalPages
                    setVariantFilters(prev => ({ ...prev, page: lastPage }))
                    loadVariants(lastPage)
                  }}
                  disabled={variantPagination.currentPage === variantPagination.totalPages}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors text-sm"
                >
                  Cuối
                </button>
                
                {/* Jump to page input */}
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-600">Đến trang:</span>
                  <input
                    type="number"
                    min="1"
                    max={variantPagination.totalPages}
                    defaultValue={variantPagination.currentPage}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement
                        const pageNum = parseInt(target.value, 10)
                        if (pageNum >= 1 && pageNum <= variantPagination.totalPages) {
                          setVariantFilters(prev => ({ ...prev, page: pageNum }))
                          loadVariants(pageNum)
                          target.value = ''
                        }
                      }
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={String(variantPagination.currentPage)}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Variant Edit Modal */}
      {showVariantModal && editingVariant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeVariantModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Điều chỉnh tồn kho</h3>
                <p className="text-sm text-gray-500">{editingVariant.productId?.name} · Size {editingVariant.size}</p>
              </div>
              <button
                type="button"
                onClick={closeVariantModal}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {variantEditError && (
              <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {variantEditError}
              </div>
            )}

            <form onSubmit={handleVariantEditSubmit} className="px-5 py-5 space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-600">Tồn kho hiện tại</span>
                <span className="text-lg font-semibold text-gray-900">{editingVariant.stock}</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Kiểu cập nhật</p>
                <div className="flex flex-col gap-2 text-sm text-gray-600">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="variantEditMode"
                      value="add"
                      checked={variantEditMode === 'add'}
                      onChange={handleVariantEditModeToggle}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tăng thêm số lượng</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="variantEditMode"
                      value="subtract"
                      checked={variantEditMode === 'subtract'}
                      onChange={handleVariantEditModeToggle}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Giảm bớt số lượng</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="variantEditMode"
                      value="set"
                      checked={variantEditMode === 'set'}
                      onChange={handleVariantEditModeToggle}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Đặt tồn kho chính xác</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {variantEditMode === 'set' ? 'Tồn kho mới' : 'Số lượng'}
                </label>
                <input
                  type="number"
                  min={variantEditMode === 'set' ? 0 : 1}
                  value={variantEditQuantity}
                  onChange={handleVariantQuantityChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
                {variantEditMode === 'set' && (
                  <p className="mt-1 text-xs text-gray-500">Nhập giá trị tồn kho mong muốn (≥ 0)</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeVariantModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  disabled={variantEditLoading}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={variantEditLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {variantEditLoading ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

