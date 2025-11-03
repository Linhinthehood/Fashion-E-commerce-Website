import { API_ENDPOINTS } from './api'
type EventType = 'view' | 'add_to_cart' | 'purchase' | 'wishlist' | 'search'

type EventContext = {
  device?: string
  geo?: string
  page?: string
  referrer?: string
}

type EventPayload = {
  type: EventType
  userId?: string | null
  sessionId?: string
  itemId?: string | null
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

const getSessionId = (): string => {
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
    await fetch(API_ENDPOINTS.events.batch(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch.map((e) => ({
        ...e,
        sessionId: e.sessionId || getSessionId(),
        userId: e.userId ?? getUserId(),
        occurredAt: e.occurredAt || new Date().toISOString()
      })) })
    })
  } catch {
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

    QUEUE.push({
      ...payload,
      sessionId,
      context: {
        device: 'web',
        page,
        referrer,
        ...(payload.context || {})
      }
    })

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


