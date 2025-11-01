import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { categoryApi, productApi, variantApi } from '../../utils/apiService'
import { useToast } from '../../contexts/ToastContext'

type Category = {
  _id: string
  masterCategory: string
  subCategory: string
  articleType: string
}

type ProductFormState = {
  name: string
  description: string
  brand: string
  gender: 'Male' | 'Female' | 'Unisex'
  usage: string
  color: string
  defaultPrice: string
  categoryId: string
}

type VariantDraft = {
  id: string
  size: string
  stock: number
  price?: number
  status: 'Active' | 'Inactive'
}

type VariantFormState = {
  size: string
  stock: string
  price: string
  status: 'Active' | 'Inactive'
}

const INITIAL_PRODUCT_FORM: ProductFormState = {
  name: '',
  description: '',
  brand: '',
  gender: 'Unisex',
  usage: '',
  color: '',
  defaultPrice: '',
  categoryId: ''
}

const INITIAL_VARIANT_FORM: VariantFormState = {
  size: '',
  stock: '',
  price: '',
  status: 'Active'
}

export default function AddProduct() {
  const toast = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const [form, setForm] = useState<ProductFormState>({ ...INITIAL_PRODUCT_FORM })
  const [images, setImages] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [variants, setVariants] = useState<VariantDraft[]>([])
  const [variantForm, setVariantForm] = useState<VariantFormState>({ ...INITIAL_VARIANT_FORM })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setCategoryLoading(true)
        setCategoryError(null)
        const response = await categoryApi.getCategories()
        if (mounted) {
          if (response.success && response.data) {
            const data = response.data as { categories?: Category[] }
            setCategories(data.categories ?? [])
          } else {
            throw new Error(response.message || 'Failed to load categories')
          }
        }
      } catch (error: any) {
        console.error('Failed to load categories:', error)
        if (mounted) setCategoryError(error.message || 'Không thể tải danh mục, vui lòng thử lại sau.')
      } finally {
        if (mounted) setCategoryLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const categoryOptions = useMemo(() => {
    return categories.map(category => ({
      value: category._id,
      label: `${category.masterCategory} / ${category.subCategory} / ${category.articleType}`
    }))
  }, [categories])

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) {
      setImages([])
      return
    }

    const fileArray = Array.from(files)
    setImages(fileArray)
  }

  const handleVariantFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setVariantForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const resetVariantForm = () => {
    setVariantForm({ ...INITIAL_VARIANT_FORM })
  }

  const handleAddVariant = () => {
    const size = variantForm.size.trim().toUpperCase()
    if (!size) {
      toast.error('Vui lòng nhập size cho variant')
      return
    }

    if (variants.some(variant => variant.size.toUpperCase() === size)) {
      toast.error('Variant với size này đã tồn tại')
      return
    }

    const stockValue = parseInt(variantForm.stock, 10)
    if (Number.isNaN(stockValue) || stockValue < 0) {
      toast.error('Tồn kho phải là số nguyên không âm')
      return
    }

    let priceValue: number | undefined
    if (variantForm.price.trim() !== '') {
      const parsed = Number(variantForm.price)
      if (Number.isNaN(parsed) || parsed < 0) {
        toast.error('Giá variant phải là số không âm')
        return
      }
      priceValue = parsed
    }

    const newVariant: VariantDraft = {
      id: `${Date.now()}-${size}`,
      size,
      stock: stockValue,
      status: variantForm.status,
      ...(priceValue !== undefined ? { price: priceValue } : {})
    }

    setVariants(prev => [...prev, newVariant])
    resetVariantForm()
  }

  const handleRemoveVariant = (id: string) => {
    setVariants(prev => prev.filter(variant => variant.id !== id))
  }

  const resetForm = () => {
    setForm({ ...INITIAL_PRODUCT_FORM })
    setImages([])
    setVariants([])
    resetVariantForm()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error('Tên sản phẩm là bắt buộc')
      return false
    }
    if (!form.description.trim()) {
      toast.error('Mô tả sản phẩm là bắt buộc')
      return false
    }
    if (!form.brand.trim()) {
      toast.error('Thương hiệu là bắt buộc')
      return false
    }
    if (!form.usage.trim()) {
      toast.error('Công dụng / mục đích sử dụng là bắt buộc')
      return false
    }
    if (!form.color.trim()) {
      toast.error('Màu sắc là bắt buộc')
      return false
    }
    if (!form.categoryId) {
      toast.error('Vui lòng chọn danh mục')
      return false
    }
    if (variants.length === 0) {
      toast.error('Vui lòng thêm ít nhất một variant')
      return false
    }
    if (form.defaultPrice.trim() !== '') {
      const parsedDefaultPrice = Number(form.defaultPrice)
      if (Number.isNaN(parsedDefaultPrice) || parsedDefaultPrice < 0) {
        toast.error('Giá mặc định phải là số không âm')
        return false
      }
    }
    return true
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) {
      return
    }

    const formData = new FormData()
    formData.append('name', form.name.trim())
    formData.append('description', form.description.trim())
    formData.append('brand', form.brand.trim())
    formData.append('gender', form.gender)
    formData.append('usage', form.usage.trim())
    formData.append('color', form.color.trim())
    formData.append('categoryId', form.categoryId)

    if (form.defaultPrice.trim() !== '') {
      formData.append('defaultPrice', form.defaultPrice.trim())
    }

    images.forEach(file => {
      formData.append('images', file)
    })

    try {
      setSubmitting(true)
      const productResponse = await productApi.createProduct(formData)

      if (!productResponse.success || !productResponse.data) {
        throw new Error(productResponse.message || 'Tạo sản phẩm thất bại')
      }

      const data = productResponse.data as { product?: { _id: string; name: string } }
      const productId = data.product?._id

      if (!productId) {
        throw new Error('Không nhận được ID sản phẩm sau khi tạo')
      }

      for (const variant of variants) {
        await variantApi.createVariant({
          productId,
          size: variant.size,
          stock: variant.stock,
          status: variant.status,
          price: variant.price
        })
      }

      toast.success('Đã tạo sản phẩm và variants thành công!')
      resetForm()
    } catch (error: any) {
      console.error('Failed to create product:', error)
      toast.error(error.message || 'Không thể tạo sản phẩm, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thêm sản phẩm mới</h2>
        <p className="text-gray-600 mb-8">Điền thông tin sản phẩm và cấu hình các variants trước khi xuất bản.</p>

        {categoryError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {categoryError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Thông tin cơ bản</h3>
              <p className="text-sm text-gray-500">Các trường bắt buộc được đánh dấu *</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">Tên sản phẩm *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Áo khoác bomber nam"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="brand">Thương hiệu *</label>
                <input
                  id="brand"
                  name="brand"
                  type="text"
                  value={form.brand}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Tên thương hiệu"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="gender">Giới tính *</label>
                <select
                  id="gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Unisex">Unisex</option>
                  <option value="Male">Nam</option>
                  <option value="Female">Nữ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="usage">Mục đích sử dụng *</label>
                <input
                  id="usage"
                  name="usage"
                  type="text"
                  value={form.usage}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Đi chơi, đi làm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="color">Màu sắc *</label>
                <input
                  id="color"
                  name="color"
                  type="text"
                  value={form.color}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Đen"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="categoryId">Danh mục *</label>
              <select
                id="categoryId"
                name="categoryId"
                value={form.categoryId}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                disabled={categoryLoading}
                required
              >
                <option value="">
                  {categoryLoading ? 'Đang tải danh mục...' : 'Chọn danh mục'}
                </option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="defaultPrice">Giá niêm yết (VND)</label>
              <input
                id="defaultPrice"
                name="defaultPrice"
                type="number"
                min="0"
                value={form.defaultPrice}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: 350000"
              />
              <p className="mt-1 text-xs text-gray-500">Có thể để trống nếu giá lấy theo từng variant.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Mô tả sản phẩm *</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleFormChange}
                className="h-32 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả chi tiết sản phẩm, chất liệu, hướng dẫn bảo quản..."
                required
              />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Hình ảnh sản phẩm</h3>
              <p className="text-sm text-gray-500">Có thể tải lên nhiều hình ảnh (tối đa 10). Bạn cũng có thể thêm sau khi tạo sản phẩm.</p>
            </div>

            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center">
              <input
                ref={fileInputRef}
                id="images"
                name="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <label htmlFor="images" className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-50">
                <span>Chọn hình ảnh</span>
              </label>

              {images.length > 0 ? (
                <ul className="mt-4 space-y-1 text-sm text-gray-600">
                  {images.map(file => (
                    <li key={file.name}>{file.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500">Chưa có hình ảnh nào được chọn.</p>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Variants</h3>
              <p className="text-sm text-gray-500">Thêm các lựa chọn size/stock/giá của sản phẩm.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="variant-size">Size *</label>
                <input
                  id="variant-size"
                  name="size"
                  type="text"
                  value={variantForm.size}
                  onChange={handleVariantFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: S, M, L"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="variant-stock">Tồn kho *</label>
                <input
                  id="variant-stock"
                  name="stock"
                  type="number"
                  min="0"
                  value={variantForm.stock}
                  onChange={handleVariantFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 50"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="variant-price">Giá (VND)</label>
                <input
                  id="variant-price"
                  name="price"
                  type="number"
                  min="0"
                  value={variantForm.price}
                  onChange={handleVariantFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Nếu khác giá niêm yết"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="variant-status">Trạng thái</label>
                <select
                  id="variant-status"
                  name="status"
                  value={variantForm.status}
                  onChange={handleVariantFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Inactive">Ngưng bán</option>
                </select>
              </div>
              <div className="flex items-end md:col-span-1">
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Thêm variant
                </button>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tồn kho</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Giá</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Trạng thái</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {variants.map(variant => (
                      <tr key={variant.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{variant.size}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{variant.stock}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{variant.price !== undefined ? variant.price.toLocaleString('vi-VN') : 'Theo giá chung'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variant.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                            {variant.status === 'Active' ? 'Hoạt động' : 'Ngưng bán'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(variant.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              disabled={submitting}
            >
              Làm mới
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Đang lưu...' : 'Tạo sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

