import { useState, useEffect } from 'react'
import { provinces, districts, wards } from 'vietnam-provinces'

export interface LocationData {
  province: string
  district: string
  ward: string
}

interface VietnamLocationSelectorProps {
  value: LocationData
  onChange: (location: LocationData) => void
  className?: string
}

export default function VietnamLocationSelector({ 
  value, 
  onChange, 
  className = '' 
}: VietnamLocationSelectorProps) {
  const [selectedProvince, setSelectedProvince] = useState(value.province || '')
  const [selectedDistrict, setSelectedDistrict] = useState(value.district || '')
  const [selectedWard, setSelectedWard] = useState(value.ward || '')
  
  const [availableDistricts, setAvailableDistricts] = useState<any[]>([])
  const [availableWards, setAvailableWards] = useState<any[]>([])

  // Update available districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      const provinceData = provinces.find(p => p.name === selectedProvince)
      if (provinceData) {
        const districtList = districts.filter(d => d.province_code === provinceData.code)
        setAvailableDistricts(districtList)
        setSelectedDistrict('')
        setSelectedWard('')
        setAvailableWards([])
      }
    } else {
      setAvailableDistricts([])
      setSelectedDistrict('')
      setSelectedWard('')
      setAvailableWards([])
    }
  }, [selectedProvince])

  // Update available wards when district changes
  useEffect(() => {
    if (selectedDistrict && selectedProvince) {
      const districtData = availableDistricts.find(d => d.name === selectedDistrict)
      if (districtData) {
        const wardList = wards.filter(w => w.district_code === districtData.code)
        setAvailableWards(wardList)
        setSelectedWard('')
      }
    } else {
      setAvailableWards([])
      setSelectedWard('')
    }
  }, [selectedDistrict, selectedProvince, availableDistricts])

  // Notify parent component when location changes
  useEffect(() => {
    onChange({
      province: selectedProvince,
      district: selectedDistrict,
      ward: selectedWard
    })
  }, [selectedProvince, selectedDistrict, selectedWard, onChange])

  // Initialize values from props
  useEffect(() => {
    if (value.province && value.province !== selectedProvince) {
      setSelectedProvince(value.province)
    }
    if (value.district && value.district !== selectedDistrict) {
      setSelectedDistrict(value.district)
    }
    if (value.ward && value.ward !== selectedWard) {
      setSelectedWard(value.ward)
    }
  }, [value])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Province Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tỉnh/Thành phố <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="">Chọn tỉnh/thành phố</option>
          {provinces.map((province) => (
            <option key={province.code} value={province.name}>
              {province.name}
            </option>
          ))}
        </select>
      </div>

      {/* District Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quận/Huyện <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          disabled={!selectedProvince}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            !selectedProvince ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        >
          <option value="">Chọn quận/huyện</option>
          {availableDistricts.map((district) => (
            <option key={district.code} value={district.name}>
              {district.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ward Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phường/Xã <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value)}
          disabled={!selectedDistrict}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            !selectedDistrict ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        >
          <option value="">Chọn phường/xã</option>
          {availableWards.map((ward) => (
            <option key={ward.code} value={ward.name}>
              {ward.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
