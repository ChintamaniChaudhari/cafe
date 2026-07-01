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
  description: string
  price: number
  is_available: boolean
  image_url: string | null
  modifiers?: { name: string, price: number }[]
}

export interface CategoryData {
  id: string
  name: string
  items: MenuItemData[]
}

export interface MenuData {
  categories: CategoryData[]
}

export interface CartItem {
  cart_id: string
  item: MenuItemData
  quantity: number
  notes?: string
  selected_modifiers?: { name: string, price: number }[]
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
  daily_revenue?: { date: string; revenue: number }[]
}

export interface AdminOrderHistory {
  id: string
  order_number: number
  status: string
  total_amount: number
  created_at: string
  items: {
    id: string
    item_id: string
    name: string
    quantity: number
    unit_price: number
    item_notes?: string
    selected_modifiers?: { name: string, price: number }[]
  }[]
}

// ── API Functions ────────────────────────────────────────────

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_token')
  const headers = new Headers(options.headers || {})
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${BASE.replace('/api/v1', '')}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include' // Important for cookie-based session endpoints
  })
  
  if (!res.ok) {
    if (res.status === 401) {
       localStorage.removeItem('admin_token')
       localStorage.removeItem('user_role')
       window.location.href = '/admin/login'
    }
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

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

export async function placeOrder(items: { item_id: string, quantity: number, notes?: string, selected_modifiers?: { name: string, price: number }[] }[]) {
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ items })
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
    body: JSON.stringify({ status })
  })
  if (!res.ok) {
    let msg = `Update failed: ${res.status}`;
    try {
      const errData = await res.json();
      msg = errData.detail || msg;
    } catch (e) {}
    throw new Error(msg)
  }
  return res.json()
}

export async function fetchSessionOrders() {
  const res = await fetch(`${BASE}/orders/session`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Session orders fetch failed: ${res.status}`)
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

export async function uploadImage(file: File) {
  const token = localStorage.getItem('admin_token')
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BASE}/admin/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) throw new Error(`Failed to upload image: ${res.status}`)
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

export async function deleteMenuItem(itemId: string) {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/items/${itemId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to delete menu item: ${res.status}`)
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

export interface AdminSession {
  id: string
  status: 'ACTIVE' | 'PAYMENT_PENDING' | 'CLOSED'
  opened_at: string
  total_bill: number
  table_label: string
}

export async function fetchAdminSessions(): Promise<{ data: AdminSession[] }> {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/sessions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`)
  return res.json()
}

export async function closeSession(sessionId: string) {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/sessions/${sessionId}/close`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to close session: ${res.status}`)
  return res.json()
}

export interface DiningTable {
  id: string
  label: string
  qr_shortcode: string
  is_occupied: boolean
}

export async function fetchTables(): Promise<{ data: DiningTable[] }> {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/tables`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to fetch tables: ${res.status}`)
  return res.json()
}

export async function createTable(label: string): Promise<{ data: DiningTable }> {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/tables`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ label })
  })
  if (!res.ok) throw new Error(`Failed to create table: ${res.status}`)
  return res.json()
}

export async function deleteTable(id: string) {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/tables/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to delete table: ${res.status}`)
  return res.json()
}

export async function requestCheckout() {
  const res = await fetch(`${BASE}/s/checkout`, { method: 'POST', credentials: 'include' })
  if (!res.ok) {
    let msg = `Failed to request checkout: ${res.status}`;
    try {
      const errData = await res.json();
      msg = errData.detail || msg;
    } catch (e) {}
    throw new Error(msg)
  }
  return res.json()
}

export async function fetchAdminOrders(skip = 0, limit = 50): Promise<{ data: AdminOrderHistory[], total: number }> {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}/admin/orders?skip=${skip}&limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`)
  return res.json()
}

export async function fetchAdminSessionOrders(sessionId: string): Promise<{ data: AdminOrderHistory[] }> {
  const token = localStorage.getItem('admin_token')
  // Fetch up to 1000 orders to ensure we get all orders for the session
  const res = await fetch(`${BASE}/admin/orders?session_id=${sessionId}&limit=1000`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Failed to fetch session orders: ${res.status}`)
  return res.json()
}
