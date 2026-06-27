/**
 * Cart store using localStorage.
 *
 * Client Cart Hydration Rule: cart persists in localStorage
 * to survive accidental browser refreshes.
 * No POST /cart endpoint exists (Cookie Rule).
 */

export interface CartItem {
  cart_id?: string
  item_id?: string
  name?: string
  price?: number
  quantity: number
  notes?: string
  image_url?: string | null
  item?: any // Full item reference
  selected_modifiers?: { name: string, price: number }[]
}

const BASE_CART_KEY = 'cafeos_cart'

function getCartKey(): string {
  try {
    const sessionRaw = localStorage.getItem('cafeos_session_data')
    const session = sessionRaw ? JSON.parse(sessionRaw) : null
    const sessionId = session?.session?.id
    return sessionId ? `${BASE_CART_KEY}_${sessionId}` : BASE_CART_KEY
  } catch {
    return BASE_CART_KEY
  }
}

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(getCartKey())
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(getCartKey(), JSON.stringify(items))
}

export function addToCart(item: CartItem): CartItem[] {
  const cart = getCart()
  // if item has modifiers, it gets its own entry. Otherwise, we can group by item_id
  if (!item.selected_modifiers || item.selected_modifiers.length === 0) {
    const existing = cart.find((i) => i.item_id === item.item_id && (!i.selected_modifiers || i.selected_modifiers.length === 0))
    if (existing) {
      existing.quantity += item.quantity
      saveCart(cart)
      return cart
    }
  }
  
  cart.push({ ...item })
  saveCart(cart)
  return cart
}

export function removeFromCart(id: string): CartItem[] {
  const cart = getCart().filter((i) => i.cart_id !== id && i.item_id !== id)
  saveCart(cart)
  return cart
}

export function updateQuantity(id: string, quantity: number): CartItem[] {
  const cart = getCart()
  const item = cart.find((i) => i.cart_id === id || i.item_id === id)
  if (item) {
    item.quantity = Math.max(1, quantity)
  }
  saveCart(cart)
  return cart
}

export function clearCart(): void {
  localStorage.removeItem(getCartKey())
}

export const getCartTotal = (cart: CartItem[]) => {
  return cart.reduce((total, i) => {
    const itemPrice = i.item?.price || i.price || 0;
    const modsPrice = i.selected_modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;
    return total + (itemPrice + modsPrice) * i.quantity;
  }, 0)
}
