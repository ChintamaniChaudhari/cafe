/**
 * Cart store using localStorage.
 *
 * Client Cart Hydration Rule: cart persists in localStorage
 * to survive accidental browser refreshes.
 * No POST /cart endpoint exists (Cookie Rule).
 */

export interface CartItem {
  item_id: string
  name: string
  price: number
  quantity: number
  notes?: string
  image_url?: string | null
}

const CART_KEY = 'cafeos_cart'

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function addToCart(item: CartItem): CartItem[] {
  const cart = getCart()
  const existing = cart.find((i) => i.item_id === item.item_id)
  if (existing) {
    existing.quantity += item.quantity
  } else {
    cart.push({ ...item })
  }
  saveCart(cart)
  return cart
}

export function removeFromCart(itemId: string): CartItem[] {
  const cart = getCart().filter((i) => i.item_id !== itemId)
  saveCart(cart)
  return cart
}

export function updateQuantity(itemId: string, quantity: number): CartItem[] {
  const cart = getCart()
  const item = cart.find((i) => i.item_id === itemId)
  if (item) {
    item.quantity = Math.max(1, quantity)
  }
  saveCart(cart)
  return cart
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY)
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
