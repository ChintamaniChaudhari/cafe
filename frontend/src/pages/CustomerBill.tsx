import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, ChefHat, CheckCircle2, Utensils, Receipt, AlertCircle, ShoppingBag } from 'lucide-react'
import { fetchSessionOrders, requestCheckout } from '../api/client'
import toast from 'react-hot-toast'

interface OrderItemInfo {
  id: string
  name: string
  quantity: number
  unit_price: number
  notes: string | null
  selected_modifiers?: { name: string; price: number }[]
}

interface OrderInfo {
  id: string
  order_number: number
  status: string
  subtotal: number
  tax_amount: number
  total_amount: number
  created_at: string
  items: OrderItemInfo[]
}

const STATUS_DISPLAY = {
  RECEIVED: { icon: Clock, color: 'text-accent-blue' },
  PREPARING: { icon: ChefHat, color: 'text-accent-amber' },
  READY: { icon: CheckCircle2, color: 'text-accent-emerald' },
  SERVED: { icon: Utensils, color: 'text-accent-violet' },
  CANCELED: { icon: AlertCircle, color: 'text-accent-rose' }
}

export default function CustomerBill() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutRequested, setCheckoutRequested] = useState(false)

  const sessionRaw = localStorage.getItem('cafeos_session_data')
  const session = sessionRaw ? JSON.parse(sessionRaw) : null
  const currency = session?.tenant?.currency || '₹'


  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const res = await fetchSessionOrders()
      setOrders(res.data)
    } catch (e) {
      toast.error('Failed to load your bill.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    try {
      await requestCheckout()
      setCheckoutRequested(true)
      toast.success('Waitstaff has been notified!')
      // Optionally redirect to a feedback page or a checkout success page.
      // For now we'll just show the state.
    } catch (e) {
      toast.error('Checkout failed. Session might be already closed.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const grandTotal = orders.reduce((sum, o) => sum + (o.status !== 'CANCELED' ? o.total_amount : 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-card border-b border-white/5 px-4 py-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/menu')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-900 border border-white/5 
hover:bg-dark-800 text-white transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="text-brand-400" /> My Bill
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-dark-900 flex items-center justify-center mx-auto mb-4 border 
border-white/5">
              <ShoppingBag size={24} className="text-gray-500" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">No Orders Yet</h2>
            <p className="text-gray-400 text-sm">You haven't placed any orders in this session.</p>
          </div>
        ) : (
          orders.map((order) => {
            const StatusIcon = STATUS_DISPLAY[order.status as keyof typeof STATUS_DISPLAY]?.icon || Clock
            const statusColor = STATUS_DISPLAY[order.status as keyof typeof STATUS_DISPLAY]?.color || 'text-gray-400'
            const isCanceled = order.status === 'CANCELED'
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-2xl p-5 border border-white/5 space-y-4 ${isCanceled ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div>
                    <div className="text-xs text-gray-500">Order #{order.order_number}</div>
                    <div className="text-[10px] text-gray-600">{new Date(order.created_at).toLocaleTimeString()}</div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-dark-900 
border border-white/5 ${statusColor}`}>
                    <StatusIcon size={14} />
                    {order.status}
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map((item, idx) => {
                    const modsTotal = item.selected_modifiers?.reduce((sum, m) => sum + m.price, 0) || 0
                    const itemTotal = (item.unit_price + modsTotal) * item.quantity

                    return (
                      <div key={idx} className="flex justify-between text-sm">
                        <div className="flex-1 pr-4">
                          <div className="text-gray-300 font-medium">
                            {item.quantity}x {item.name}
                          </div>
                          {item.selected_modifiers?.map((m, mIdx) => (
                            <div key={mIdx} className="text-[10px] text-gray-500 pl-4">+ {m.name}</div>
                          ))}
                        </div>
                        <div className="font-mono text-gray-400">
                          {currency}{itemTotal.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total</div>
                  <div className={`font-bold font-mono ${isCanceled ? 'line-through text-gray-600' : 'text-white'}`}>
                    {currency}{order.total_amount.toFixed(2)}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Floating Checkout Bar */}
      {orders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-dark-950/80 backdrop-blur-md border-t border-white/5 z-40">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="flex justify-between items-end px-2">
              <div className="text-gray-400 text-sm font-bold">Grand Total</div>
              <div className="text-3xl font-black text-brand-400 font-mono">
                {currency}{grandTotal.toFixed(2)}
              </div>
            </div>
            
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || checkoutRequested}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 
disabled:bg-dark-800 disabled:text-gray-500 text-white rounded-2xl px-6 py-4 font-bold transition-all active:scale-[0.98]"
            >
              {checkoutLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : checkoutRequested ? (
                <>
                  <CheckCircle2 size={18} /> Waiter Notified
                </>
              ) : (
                <>
                  <Receipt size={18} /> Request Checkout
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
