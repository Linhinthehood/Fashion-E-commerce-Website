import { API_ENDPOINTS } from './api'
import { trackItemStrategy, trackItemsStrategy, getItemStrategy, } from './strategyTracker'

type EventType = 'view' | 'add_to_cart' | 'purchase' | 'wishlist' | 'search' | 'impression'

type EventContext = {
  device?: string
  geo?: string
  page?: string
  referrer?: string
  source?: string // 'recommendation', 'search', 'browse', 'category', etc.
  strategy?: string // A/B test strategy identifier
  position?: string // Position on page (e.g., 'home-recommendations', 'sidebar-trending')
}

type EventPayload = {
  type: EventType
  userId?: string | null
  sessionId?: string
  itemId?: string | null
  itemIds?: string[] // Array of item IDs for impression events
  variantId?: string | null
  quantity?: number
  price?: number | null
  searchQuery?: string | null
  context?: EventContext
  occurredAt?: string
}

const QUEUE: EventPayload[] = []
let timer: number | undefined

const BATCH_SIZE = 20
const FLUSH_INTERVAL_MS = 3000

// Export getSessionId for use in other modules
export const getSessionId = (): string => {
  try {
    const key = 'fe_session_id'
    let sid = localStorage.getItem(key)
    if (!sid) {
      // Use browser crypto if available, fallback to simple random
      const uuid = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
        ? (globalThis.crypto as any).randomUUID()
        : `sess-${Math.random().toString(36).slice(2)}-${Date.now()}`
      localStorage.setItem(key, uuid)
      sid = uuid
    }
    return sid || ''
  } catch {
    return `sess-${Math.random().toString(36).slice(2)}-${Date.now()}`
  }
}

const getUserId = (): string | null => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const id = parsed?._id || parsed?.id || null
    return typeof id === 'string' && id.length ? id : null
  } catch {
    return null
  }
}

const flush = async () => {
  if (QUEUE.length === 0) return
  const batch = QUEUE.splice(0, BATCH_SIZE)

  try {
    const eventsToSend = batch.map((e) => ({
      ...e,
      sessionId: e.sessionId || getSessionId(),
      userId: e.userId ?? getUserId(),
      occurredAt: e.occurredAt || new Date().toISOString()
    }))

    // Debug logging for events being sent
    const abTestEvents = eventsToSend.filter(e => 
      e.type === 'impression' || (e.context && (e.context.source === 'recommendation' || e.context.strategy))
    )
    if (abTestEvents.length > 0) {
      console.log('🚀 Sending A/B Testing Events to backend:', abTestEvents.map(e => ({
        type: e.type,
        source: e.context?.source,
        strategy: e.context?.strategy,
        position: e.context?.position,
        itemId: e.itemId,
        itemIds: e.itemIds?.length
      })))
    }

    const response = await fetch(API_ENDPOINTS.events.batch(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsToSend })
    })

    if (!response.ok) {
      console.error('Failed to send events:', response.status, response.statusText)
      // Re-queue on failure (best effort)
      QUEUE.unshift(...batch)
    } else {
      console.log(`✅ Successfully sent ${batch.length} events to backend`)
    }
  } catch (error) {
    console.error('Error sending events:', error)
    // Re-queue on failure (best effort)
    QUEUE.unshift(...batch)
  }
}

const schedule = () => {
  if (timer) return
  timer = window.setTimeout(async () => {
    timer = undefined
    await flush()
    if (QUEUE.length > 0) schedule()
  }, FLUSH_INTERVAL_MS)
}

export const emitEvent = (payload: EventPayload) => {
  try {
    const sessionId = getSessionId()
    const page = typeof window !== 'undefined' ? window.location.pathname : undefined
    const referrer = typeof document !== 'undefined' ? document.referrer : undefined

    // Track strategy for impression events
    if (payload.type === 'impression' && payload.itemIds && payload.context) {
      if (payload.context.source === 'recommendation' && payload.context.strategy) {
        trackItemsStrategy(payload.itemIds, {
          source: payload.context.source,
          strategy: payload.context.strategy,
          position: payload.context.position
        })
      }
    }

    // Track strategy for view events from recommendations
    if (payload.type === 'view' && payload.itemId && payload.context) {
      if (payload.context.source === 'recommendation' && payload.context.strategy) {
        trackItemStrategy(payload.itemId, {
          source: payload.context.source,
          strategy: payload.context.strategy,
          position: payload.context.position
        })
      }
    }

    // Lookup strategy for add_to_cart events if not provided
    let context = payload.context || {}
    if (payload.type === 'add_to_cart' && payload.itemId && !context.strategy) {
      const strategyContext = getItemStrategy(payload.itemId)
      if (strategyContext && strategyContext.source === 'recommendation') {
        context = {
          ...context,
          source: strategyContext.source,
          strategy: strategyContext.strategy,
          position: strategyContext.position
        }
      }
    }

    // Lookup strategy for purchase events if not provided
    // For purchase, we need to check all items in the cart
    // Since purchase event doesn't have itemId, we'll rely on the cart items
    // This will be handled in CartPage.tsx where we have access to cart items

    const eventWithContext = {
      ...payload,
      sessionId,
      context: {
        device: 'web',
        page,
        referrer,
        ...context
      }
    }

    // Debug logging for A/B testing events
    if (payload.type === 'impression' || (eventWithContext.context && (eventWithContext.context.source === 'recommendation' || eventWithContext.context.strategy))) {
      console.log('📊 A/B Testing Event:', {
        type: payload.type,
        itemId: payload.itemId,
        itemIds: payload.itemIds,
        source: eventWithContext.context.source,
        strategy: eventWithContext.context.strategy,
        position: eventWithContext.context.position,
        page: eventWithContext.context.page
      })
    }

    QUEUE.push(eventWithContext)

    if (QUEUE.length >= BATCH_SIZE) {
      void flush()
    } else {
      schedule()
    }
  } catch {
    // ignore client-side errors
  }
}

// Flush on page hide/unload
if (typeof window !== 'undefined') {
  const handler = () => { void flush() }
  window.addEventListener('beforeunload', handler)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') handler()
  })
}

// Expose manual flush for critical flows (e.g., after purchase)
export const flushEvents = async () => {
  await flush()
}


