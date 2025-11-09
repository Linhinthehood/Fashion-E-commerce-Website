import { useState, useEffect } from 'react'
import { useDebounce } from '../hooks/useDebounce'

export type FilterState = {
  search: string
  brand: string
  gender: string
  color: string
  categoryId?: string
  minPrice?: number
  maxPrice?: number
  [key: string]: string | number | undefined
}

type ProductFiltersProps = {
  filters: FilterState
  onFilterChange: (key: string, value: string | number | undefined) => void
  onClearFilters: () => void
  onSearchDebounced?: (searchQuery: string) => void // Callback for debounced search (for event tracking)
  showCategoryFilter?: boolean
  showSubcategoryFilter?: boolean
  subcategoryOptions?: Array<{ value: string; label: string }>
  onSubcategoryChange?: (value: string) => void
  currentSubcategory?: string
  customPlaceholders?: {
    search?: string
    brand?: string
    color?: string
  }
}

export default function ProductFilters({
  filters,
  onFilterChange,
  onClearFilters,
  onSearchDebounced,
  showCategoryFilter = false,
  showSubcategoryFilter = false,
  subcategoryOptions = [],
  onSubcategoryChange,
  currentSubcategory = '',
  customPlaceholders = {}
}: ProductFiltersProps) {
  // Debounce search input for event tracking (3 seconds)
  const [searchInput, setSearchInput] = useState(filters.search)
  const debouncedSearch = useDebounce(searchInput, 3000)

  // Update search input when filters.search changes externally
  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  // Handle debounced search for event tracking
  useEffect(() => {
    if (debouncedSearch && onSearchDebounced) {
      onSearchDebounced(debouncedSearch)
    }
  }, [debouncedSearch, onSearchDebounced])

  // Handle search input change (immediate UI update, debounced event tracking)
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    onFilterChange('search', value) // Update filter immediately for UI
  }

  // Handle price change
  const handlePriceChange = (type: 'minPrice' | 'maxPrice', value: string) => {
    const numValue = value === '' ? undefined : Number(value)
    if (numValue !== undefined && (isNaN(numValue) || numValue < 0)) {
      return // Invalid price
    }
    onFilterChange(type, numValue)
  }

  // Handle subcategory change
  const handleSubcategoryChange = (value: string) => {
    if (onSubcategoryChange) {
      onSubcategoryChange(value)
    }
  }

  return (
    <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border border-gray-200">
      {/* Search Bar - Full Width, Prominent */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tìm kiếm sản phẩm
        </label>
        <input
          type="text"
          placeholder={customPlaceholders.search || "Tìm kiếm sản phẩm, thương hiệu..."}
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
        />
        {searchInput && searchInput !== debouncedSearch && (
          <p className="mt-1 text-xs text-gray-500">
            Đang tìm kiếm "{searchInput}"...
          </p>
        )}
      </div>

      {/* Subcategory Quick Filter Tabs (if enabled) */}
      {showSubcategoryFilter && subcategoryOptions.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {subcategoryOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSubcategoryChange(option.value)}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                  currentSubcategory === option.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Other Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Thương hiệu
          </label>
          <input
            type="text"
            placeholder={customPlaceholders.brand || "Nhập thương hiệu..."}
            value={filters.brand}
            onChange={(e) => onFilterChange('brand', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giới tính
          </label>
          <select
            value={filters.gender}
            onChange={(e) => onFilterChange('gender', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả</option>
            <option value="Male">Nam</option>
            <option value="Female">Nữ</option>
            <option value="Unisex">Unisex</option>
          </select>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Màu sắc
          </label>
          <input
            type="text"
            placeholder={customPlaceholders.color || "Nhập màu sắc..."}
            value={filters.color}
            onChange={(e) => onFilterChange('color', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category (if enabled) */}
        {showCategoryFilter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Danh mục
            </label>
            <input
              type="text"
              placeholder="Nhập danh mục..."
              value={filters.categoryId}
              onChange={(e) => onFilterChange('categoryId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Price Range Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giá tối thiểu (VND)
          </label>
          <input
            type="number"
            placeholder="0"
            value={filters.minPrice || ''}
            onChange={(e) => handlePriceChange('minPrice', e.target.value)}
            min="0"
            step="1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giá tối đa (VND)
          </label>
          <input
            type="number"
            placeholder="Không giới hạn"
            value={filters.maxPrice || ''}
            onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
            min="0"
            step="1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Price Range Display */}
      {(filters.minPrice || filters.maxPrice) && (
        <div className="mb-4 p-2 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-800">
            Khoảng giá: {filters.minPrice ? `${filters.minPrice.toLocaleString('vi-VN')}₫` : '0₫'} - {filters.maxPrice ? `${filters.maxPrice.toLocaleString('vi-VN')}₫` : 'Không giới hạn'}
          </p>
        </div>
      )}

      {/* Clear Filters Button */}
      <div className="mt-4">
        <button
          onClick={onClearFilters}
          className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Xóa tất cả bộ lọc
        </button>
      </div>
    </div>
  )
}

