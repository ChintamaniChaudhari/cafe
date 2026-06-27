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

export interface AdminAnalytics {
  total_revenue: number
  total_orders: number
  active_orders: number
  popular_items: { name: string; sold: number }[]
}

export interface AdminOrderHistory {
  id: string
  order_number: number
  status: string
  total_amount: number
  created_at: string
  items: { name: string; quantity: number; unit_price: number }[]
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
  const token = localStorage.getItem('admin_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`Status update failed: ${res.status}`)
  return res.json()
}

export async function addMenuItem(data: { name: string; description: string; base_price: number; category_id: string; image_url: string | null }) {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to add menu item: ${res.status}`)
  return res.json()
}

export async function editMenuItem(itemId: string, data: { name?: string; description?: string; base_price?: number; is_available?: boolean; image_url?: string | null }) {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update menu item: ${res.status}`)
  return res.json()
}

export async function fetchAnalytics(): Promise<{ data: AdminAnalytics }> {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/analytics`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.status}`)
  return res.json()
}

export async function fetchAdminOrders(): Promise<{ data: AdminOrderHistory[] }> {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/orders`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`)
  return res.json()
}
