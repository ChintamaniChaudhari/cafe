/**
 * CafeOS API client layer.
 *
 * All API calls go through these typed functions.
 * Credentials are included for cookie-based session auth.
 */

const BASE = '/api/v1'

// ── Types ────────────────────────────────────────────────────
export interface SessionData {
  status: string
  data: {
    tenant: { id: string; name: string; currency: string }
    table: { id: string; label: string }
    session: { id: string; opened_at: string }
  }
}

export interface MenuItemData {
  id: string
  name: string
  description: string | null
  price: number
  is_available: boolean
  image_url: string | null
}

export interface CategoryData {
  id: string
  name: string
  items: MenuItemData[]
}

export interface MenuData {
  categories: CategoryData[]
}

export interface OrderItemRequest {
  item_id: string
  quantity: number
  notes?: string
}

export interface OrderEventData {
  event: string
  data: {
    order_id: string
    order_number: number
    table_label: string
    status: string
    total_amount?: number
    items?: { name: string; quantity: number; notes: string | null }[]
    created_at?: string
    previous_status?: string
  }
}

// ── API Functions ────────────────────────────────────────────

export async function scanQR(shortcode: string): Promise<SessionData> {
  const res = await fetch(`${BASE}/s/${shortcode}`, { credentials: 'include' })
  if (!res.ok) throw new Error(`QR scan failed: ${res.status}`)
  return res.json()
}

export async function fetchMenu(): Promise<MenuData> {
  const res = await fetch(`${BASE}/menu`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Menu fetch failed: ${res.status}`)
  return res.json()
}

export async function placeOrder(items: OrderItemRequest[]): Promise<OrderEventData> {
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error(`Order failed: ${res.status}`)
  return res.json()
}

export async function updateOrderStatus(orderId: string, status: string): Promise<OrderEventData> {
  const res = await fetch(`${BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`Status update failed: ${res.status}`)
  return res.json()
}
