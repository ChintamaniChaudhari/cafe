/**
 * CartPage — /cart
 *
 * Shows localStorage cart contents, allows quantity changes,
 * and places an order via POST /api/v1/orders.
 * Cart state lives in localStorage (Cookie Rule: no POST /cart).
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { placeOrder } from '../api/client'
import {
  getCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  getCartTotal,
  type CartItem,
} from '../store/cart'

export default function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>([])
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionRaw = localStorage.getItem('cafeos_session_data')
  const session = sessionRaw ? JSON.parse(sessionRaw) : null
  const currency = session?.tenant?.currency || '₹'

  useEffect(() => {
    setCart(getCart())
  }, [])

  const handleQuantity = (itemId: string, qty: number) => {
    const updated = updateQuantity(itemId, qty)
    setCart([...updated])
  }

  const handleRemove = (itemId: string) => {
    const updated = removeFromCart(itemId)
    setCart([...updated])
  }

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return
    setPlacing(true)
    setError(null)

    try {
      const items = cart.map((i) => ({
        item_id: i.item_id,
        quantity: i.quantity,
        notes: i.notes,
      }))

      const result = await placeOrder(items)
      clearCart()
      // Navigate to order status page
      navigate(`/order/${result.data.order_id}`, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order'
      setError(msg)
      setPlacing(false)
    }
  }

  const total = getCartTotal(cart)

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/menu')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-white">Your Cart</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 mt-6">
        {cart.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-gray-400 mb-4">Your cart is empty</p>
            <button
              onClick={() => navigate('/menu')}
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Browse Menu →
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {cart.map((item) => (
              <div key={item.item_id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <p className="text-brand-400 font-bold text-sm mt-1">
                      {currency}{item.price.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.item_id)}
                    className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => handleQuantity(item.item_id, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-dark-600 hover:bg-dark-500 flex items-center justify-center text-white font-bold transition-colors"
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span className="text-white font-medium w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantity(item.item_id, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-dark-600 hover:bg-dark-500 flex items-center justify-center text-white font-bold transition-colors"
                  >
                    +
                  </button>
                  <span className="ml-auto text-white font-semibold">
                    {currency}{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="glass rounded-xl p-4 mt-6">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-white">Total</span>
                <span className="text-brand-400">{currency}{total.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Place Order Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4">
          <button
            id="place-order-button"
            onClick={handlePlaceOrder}
            disabled={placing}
            className={`w-full max-w-lg mx-auto flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white shadow-lg transition-all active:scale-[0.98] ${
              placing
                ? 'bg-gray-600 cursor-wait'
                : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/25'
            }`}
          >
            {placing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Placing Order...
              </>
            ) : (
              <>Place Order • {currency}{total.toFixed(2)}</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
