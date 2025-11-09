/**
 * Strategy Tracker Utility
 * 
 * Tracks which products were shown/recommended with which A/B test strategy.
 * This allows us to attribute add_to_cart and purchase events back to the
 * recommendation strategy that led to the conversion.
 */

const STRATEGY_MAP_KEY = 'fe_strategy_map'
const STRATEGY_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

type StrategyContext = {
  source: string // 'recommendation', 'search', 'browse', etc.
  strategy?: string // A/B test strategy identifier
  position?: string // Position on page
  timestamp: number // When this mapping was created
}

type StrategyMap = {
  [itemId: string]: StrategyContext
}

/**
 * Load strategy map from sessionStorage
 */
const loadStrategyMap = (): StrategyMap => {
  try {
    const stored = sessionStorage.getItem(STRATEGY_MAP_KEY)
    if (!stored) return {}
    
    const map = JSON.parse(stored) as StrategyMap
    const now = Date.now()
    
    // Clean up expired entries (older than TTL)
    const cleaned: StrategyMap = {}
    for (const [itemId, context] of Object.entries(map)) {
      if (now - context.timestamp < STRATEGY_TTL) {
        cleaned[itemId] = context
      }
    }
    
    // Update storage if we cleaned anything
    if (Object.keys(cleaned).length !== Object.keys(map).length) {
      sessionStorage.setItem(STRATEGY_MAP_KEY, JSON.stringify(cleaned))
    }
    
    return cleaned
  } catch {
    return {}
  }
}

/**
 * Save strategy map to sessionStorage
 */
const saveStrategyMap = (map: StrategyMap): void => {
  try {
    sessionStorage.setItem(STRATEGY_MAP_KEY, JSON.stringify(map))
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

/**
 * Track strategy for a single item
 */
export const trackItemStrategy = (
  itemId: string,
  context: Omit<StrategyContext, 'timestamp'>
): void => {
  if (!itemId) return
  
  const map = loadStrategyMap()
  map[itemId] = {
    ...context,
    timestamp: Date.now()
  }
  saveStrategyMap(map)
}

/**
 * Track strategy for multiple items (e.g., from impression event)
 */
export const trackItemsStrategy = (
  itemIds: string[],
  context: Omit<StrategyContext, 'timestamp'>
): void => {
  if (!itemIds || itemIds.length === 0) return
  
  const map = loadStrategyMap()
  const timestamp = Date.now()
  
  for (const itemId of itemIds) {
    if (itemId) {
      map[itemId] = {
        ...context,
        timestamp
      }
    }
  }
  
  saveStrategyMap(map)
}

/**
 * Get strategy context for an item
 */
export const getItemStrategy = (itemId: string | null | undefined): StrategyContext | null => {
  if (!itemId) return null
  
  const map = loadStrategyMap()
  return map[itemId] || null
}

/**
 * Get strategy context for multiple items
 * Returns the most recent strategy context if items have different strategies
 */
export const getItemsStrategy = (itemIds: string[]): StrategyContext | null => {
  if (!itemIds || itemIds.length === 0) return null
  
  const map = loadStrategyMap()
  let mostRecent: StrategyContext | null = null
  let mostRecentTimestamp = 0
  
  for (const itemId of itemIds) {
    const context = map[itemId]
    if (context && context.timestamp > mostRecentTimestamp) {
      mostRecent = context
      mostRecentTimestamp = context.timestamp
    }
  }
  
  return mostRecent
}

/**
 * Clear strategy map (useful for testing or logout)
 */
export const clearStrategyMap = (): void => {
  try {
    sessionStorage.removeItem(STRATEGY_MAP_KEY)
  } catch {
    // Ignore errors
  }
}

