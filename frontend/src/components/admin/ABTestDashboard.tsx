import { useState, useEffect, useMemo } from 'react'
import { eventsApi } from '../../utils/apiService'
import { STRATEGIES, type StrategyConfig, getStrategyIdentifier } from '../../utils/abTesting'

type StrategyMetrics = {
  strategy: string
  impressions: number
  uniqueSessions: number
  uniqueUsers: number
  clicks: number
  addToCarts: number
  purchases: number
  revenue: number
  uniqueItemsClicked: number
  uniqueItemsAdded: number
  uniqueItemsPurchased: number
  ctr: number
  atcRate: number
  conversionRate: number
  revenuePerImpression: number
}

type StrategyMetricWithLabel = StrategyMetrics & {
  strategyLabel: string
}

type ABTestMetricsResponse = {
  success: boolean
  data: {
    strategies: StrategyMetrics[]
    summary: {
      totalStrategies: number
      totalImpressions: number
      totalClicks: number
      totalAddToCarts: number
      totalPurchases: number
      totalRevenue: number
    }
  }
}

function formatCurrencyVND(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
  } catch (_) {
    return `${amount.toLocaleString('vi-VN')}₫`
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

const formatDateInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const strategyIdToConfig = (): Array<StrategyConfig & { strategyId: string }> => {
  return Object.values(STRATEGIES).map((config) => ({
    ...config,
    strategyId: getStrategyIdentifier(config)
  }))
}

const parseHybridId = (strategyId: string) => {
  const match = /^hybrid-alpha([0-9.]+)-beta([0-9.]+)-gamma([0-9.]+)$/i.exec(strategyId)
  if (!match) return null
  return {
    alpha: parseFloat(match[1]),
    beta: parseFloat(match[2]),
    gamma: parseFloat(match[3])
  }
}

const areWeightsClose = (a: number, b: number, tolerance = 0.0001): boolean => {
  return Math.abs(a - b) <= tolerance
}

const resolveStrategyLabel = (strategyId: string | null | undefined): string | null => {
  if (!strategyId || strategyId === 'unknown') {
    return null
  }

  const configs = strategyIdToConfig()
  const direct = configs.find((cfg) => cfg.strategyId === strategyId)
  if (direct) {
    return direct.name
  }

  const parsed = parseHybridId(strategyId)
  if (parsed) {
    const matched = configs.find((cfg) =>
      areWeightsClose(cfg.alpha, parsed.alpha) &&
      areWeightsClose(cfg.beta, parsed.beta) &&
      areWeightsClose(cfg.gamma, parsed.gamma)
    )
    if (matched) {
      return matched.name
    }
  }

  return strategyId
}

export default function ABTestDashboard() {
  const [metrics, setMetrics] = useState<StrategyMetrics[]>([])
  const [summary, setSummary] = useState<ABTestMetricsResponse['data']['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>(() => formatDateInput(new Date()))
  const [endDate, setEndDate] = useState<string>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return formatDateInput(tomorrow)
  })
  const [selectedStrategy, setSelectedStrategy] = useState<string>('')

  const loadMetrics = async (overrides?: { start?: string; end?: string; strategy?: string }) => {
    try {
      setLoading(true)
      setError(null)

      const effectiveStart = overrides?.start ?? (startDate ? startDate : undefined)
      const effectiveEnd = overrides?.end ?? (endDate ? endDate : undefined)
      const effectiveStrategy = overrides?.strategy ?? (selectedStrategy ? selectedStrategy : undefined)

      const response = await eventsApi.getABTestMetrics({
        startDate: effectiveStart,
        endDate: effectiveEnd,
        strategy: effectiveStrategy
      }) as ABTestMetricsResponse

      if (response.success && response.data) {
        setMetrics(response.data.strategies || [])
        setSummary(response.data.summary)
      } else {
        setError('Không thể tải dữ liệu A/B test')
      }
    } catch (err) {
      console.error('Failed to load AB test metrics:', err)
      setError('Lỗi khi tải dữ liệu A/B test')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  const handleFilter = () => {
    loadMetrics()
  }

  const handleReset = () => {
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const todayStr = formatDateInput(today)
    const tomorrowStr = formatDateInput(tomorrow)
    setStartDate(todayStr)
    setEndDate(tomorrowStr)
    setSelectedStrategy('')
    loadMetrics({ start: todayStr, end: tomorrowStr, strategy: '' })
  }

  const metricsWithLabel: StrategyMetricWithLabel[] = useMemo(() => {
    return metrics
      .map((metric) => {
        const strategyLabel = resolveStrategyLabel(metric.strategy)
        if (!strategyLabel) return null
        return {
          ...metric,
          strategyLabel
        }
      })
      .filter((metric): metric is StrategyMetricWithLabel => metric !== null)
  }, [metrics])

  if (loading && metrics.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu A/B test...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">A/B Test Dashboard</h2>
        <button
          onClick={() => loadMetrics()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày bắt đầu
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày kết thúc
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chiến lược
            </label>
            <input
              type="text"
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              placeholder="Tất cả"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Lọc
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Tổng chiến lược</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalStrategies}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Tổng impressions</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalImpressions.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Tổng clicks</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalClicks.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Tổng add to cart</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalAddToCarts.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Tổng doanh thu</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrencyVND(summary.totalRevenue)}</div>
          </div>
        </div>
      )}

      {/* Strategy Metrics Table */}
      {metricsWithLabel.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chiến lược
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impressions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Add to Cart Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doanh thu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue/Impression
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metricsWithLabel.map((strategy) => (
                  <tr key={strategy.strategy}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {strategy.strategyLabel}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {strategy.strategy || 'unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {strategy.uniqueUsers} users, {strategy.uniqueSessions} sessions
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {strategy.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${strategy.ctr > 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatPercent(strategy.ctr)}
                      </span>
                      <div className="text-xs text-gray-500">
                        {strategy.clicks.toLocaleString()} clicks
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${strategy.atcRate > 0.02 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatPercent(strategy.atcRate)}
                      </span>
                      <div className="text-xs text-gray-500">
                        {strategy.addToCarts.toLocaleString()} add to carts
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${strategy.conversionRate > 0.01 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatPercent(strategy.conversionRate)}
                      </span>
                      <div className="text-xs text-gray-500">
                        {strategy.purchases.toLocaleString()} purchases
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium text-green-600">
                        {formatCurrencyVND(strategy.revenue)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrencyVND(strategy.revenuePerImpression)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">Không có dữ liệu A/B test trong khoảng thời gian được chọn</p>
        </div>
      )}
    </div>
  )
}

