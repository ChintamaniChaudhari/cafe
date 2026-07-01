import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  MessageSquare, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { placeOrder } from '../api/client'
import {
  getCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  getCartTotal,
  saveCart,
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

  const handleNotesChange = (itemId: string, notes: string) => {
    const updated = cart.map((item) => 
      item.item_id === itemId ? { ...item, notes } : item
    )
    setCart(updated)
    saveCart(updated)
  }

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return
    setPlacing(true)
    setError(null)

    try {
      const items = cart.map((i) => ({
        item_id: i.item?.id || i.item_id || "", // ensure fallback since earlier code used item_id directly
        quantity: i.quantity,
        notes: i.notes,
        selected_modifiers: i.selected_modifiers,
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
  // Dynamic estimated fee / taxes calculations (e.g. 5% GST)
  const gstRate = 0.05
  const gst = total * gstRate
  const finalTotal = total + gst

  return (
    <div className="min-h-screen pb-36 bg-dark-950 text-white relative overflow-hidden">
      {/* Background ambient bubble */}
      <div className="ambient-glow bg-brand-500/10 top-0 left-0 w-[350px] h-[350px]" />
      <div className="ambient-glow bg-accent-violet/10 bottom-0 right-0 w-[350px] h-[350px]" style={{ animationDelay: '3s' }} />

      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong shadow-lg py-4">
        <div className="max-w-lg mx-auto px-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/menu')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-white/5 text-gray-400 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight">Your Cart</h1>
            {session?.table?.label && (
              <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Table {session.table.label}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 mt-6">
        <AnimatePresence mode="popLayout">
          {cart.length === 0 ? (
            <motion.div 
              key="empty-cart"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 bg-dark-900/40 border border-white/5 rounded-3xl p-8 max-w-sm mx-auto mt-10"
            >
              <div className="w-16 h-16 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShoppingBag size={30} />
              </div>
              <h3 className="text-lg font-bold mb-1">Your cart is empty</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Add items from the menu to build your delicious meal.
              </p>
              <button
                onClick={() => navigate('/menu')}
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-extrabold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-md shadow-brand-500/20"
              >
                Browse Menu
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {/* Cart List */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <motion.div 
                    key={item.cart_id || item.item_id} 
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="glass-card rounded-2xl p-4 space-y-4"
                  >
                    {/* Item header details */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-dark-900 border border-white/5">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-dark-800 flex items-center justify-center text-brand-500/30">
                            <ShoppingBag size={20} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-extrabold text-white text-sm truncate">{item.item?.name || item.name}</h3>
                          <button
                            onClick={() => handleRemove((item.cart_id || item.item_id) as string)}
                            className="text-gray-500 hover:text-accent-rose transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {item.selected_modifiers.map(m => `+ ${m.name}`).join(', ')}
                          </div>
                        )}
                        <p className="text-brand-400 font-black text-sm mt-1">
                          {currency}{((item.item?.price || (item as any).price || 0) + (item.selected_modifiers?.reduce((a, b) => a + b.price, 0) || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Quantity controls and kitchen notes input */}
                    <div className="pt-3 border-t border-white/5 flex flex-col gap-3">
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Quantity</span>
                        <div className="flex items-center bg-dark-800 rounded-xl p-0.5 border border-white/5">
                          <button
                            onClick={() => handleQuantity((item.cart_id || item.item_id) as string, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-white hover:bg-dark-700 rounded-lg disabled:opacity-40 transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={14} strokeWidth={2.5} />
                          </button>
                          <span className="w-8 text-center text-xs font-black select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantity((item.cart_id || item.item_id) as string, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-white hover:bg-dark-700 rounded-lg transition-colors"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>

                      {/* Notes Input Section */}
                      <div className="flex items-start gap-2 bg-dark-900/50 rounded-xl p-2.5 border border-white/5">
                        <MessageSquare size={14} className="text-gray-500 mt-1 shrink-0" />
                        <textarea
                          placeholder="Special request? (e.g. Extra spicy, no onions...)"
                          value={item.notes || ''}
                          onChange={(e) => handleNotesChange((item.cart_id || item.item_id) as string, e.target.value)}
                          rows={1}
                          className="w-full bg-transparent outline-none resize-none text-xs text-gray-300 placeholder-gray-500 border-none p-0 focus:ring-0 leading-normal"
                        />
                      </div>

                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Order Bill Summary */}
              <motion.div 
                layout
                className="glass-card rounded-2xl p-5 space-y-3"
              >
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billing Details</h4>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white font-semibold">{currency}{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 pb-2 border-b border-white/5">
                  <span>GST & Service Charge (5%)</span>
                  <span className="text-white font-semibold">{currency}{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>Grand Total</span>
                  <span className="text-brand-400 text-base">{currency}{finalTotal.toFixed(2)}</span>
                </div>
              </motion.div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-accent-rose/10 border border-accent-rose/20 rounded-2xl p-4 text-accent-rose text-xs flex gap-2.5 items-center justify-center shadow-lg"
                >
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Place Order CTA Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-gradient-to-t from-dark-950 via-dark-950/90 to-transparent">
          <button
            id="place-order-button"
            onClick={handlePlaceOrder}
            disabled={placing}
            className={`w-full max-w-lg mx-auto flex items-center justify-center gap-3 rounded-2xl px-6 py-4 font-bold text-white shadow-xl transition-all border border-white/10 active:scale-[0.99] ${
              placing
                ? 'bg-dark-800 text-gray-400 cursor-wait'
                : 'bg-brand-500 hover:bg-brand-600 hover:border-brand-400/30 shadow-brand-500/25'
            }`}
          >
            {placing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending to Kitchen...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>Send Order to Kitchen • {currency}{finalTotal.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
