import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChefHat, 
  Volume2, 
  VolumeX, 
  Clock, 
  Check, 
  Play, 
  Coffee,
  Radio,
  AlertTriangle,
  Wifi,
  LogOut
} from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { updateOrderStatus } from '../api/client'
import toast from 'react-hot-toast'

interface OrderCard {
  order_id: string
  order_number: number
  table_label: string
  status: string
  total_amount?: number
  items: { name: string; quantity: number; notes: string | null; selected_modifiers?: { name: string; price: number }[] }[]
  created_at?: string
}

const NEXT_STATUS: Record<string, string> = {
  RECEIVED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
}

const ACTION_LABEL: Record<string, string> = {
  RECEIVED: 'Cook',
  PREPARING: 'Ready',
  READY: 'Serve',
}

const ACTION_ICON: Record<string, typeof Play> = {
  RECEIVED: Play,
  PREPARING: Check,
  READY: Check,
}

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'border-accent-blue/30 focus-within:ring-accent-blue/40',
  PREPARING: 'border-accent-amber/40 focus-within:ring-accent-amber/50',
  READY: 'border-accent-emerald/40 focus-within:ring-accent-emerald/50',
}

export default function KitchenDisplay() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Map<string, OrderCard>>(new Map())
  const [updating, setUpdating] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [, setTick] = useState(0)

  // Validate session
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) navigate('/admin/login')
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('user_role')
    navigate('/admin/login')
  }

  // Force re-renders every 15 seconds to update urgency timers
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000)
    return () => clearInterval(interval)
  }, [])

  // Create a beep sound using Web Audio API
  const playBeep = useCallback(() => {
    if (!soundEnabled || !hasInteracted) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 660 // Lower frequency for a pleasant KDS beep
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {
      // Audio fails silently if blocked by browser autoplay rules
    }
  }, [soundEnabled, hasInteracted])

  const handleMessage = useCallback(
    (data: unknown) => {
      const msg = data as {
        event?: string
        data?: OrderCard
        orders?: { data: OrderCard }[]
      }

      if (msg.event === 'ORDER_CREATED' && msg.data) {
        setOrders((prev) => {
          const updated = new Map(prev)
          updated.set(msg.data!.order_id, msg.data!)
          return updated
        })
        playBeep()
      }

      if (msg.event === 'ORDER_STATUS_CHANGED' && msg.data) {
        setOrders((prev) => {
          const updated = new Map(prev)
          const existing = updated.get(msg.data!.order_id)
          if (existing) {
            if (msg.data!.status === 'SERVED' || msg.data!.status === 'CANCELED') {
              updated.delete(msg.data!.order_id)
            } else {
              updated.set(msg.data!.order_id, { ...existing, status: msg.data!.status })
            }
          }
          return updated
        })
      }

      // Initial hydration
      if (msg.event === 'INITIAL_ORDERS' && msg.orders) {
        setOrders((prev) => {
          const updated = new Map(prev)
          for (const o of msg.orders!) {
            updated.set(o.data.order_id, o.data)
          }
          return updated
        })
      }
    },
    [playBeep]
  )

  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/ws/kitchen`
  const { connected, hasLongDisconnect } = useWebSocket(wsUrl, { onMessage: handleMessage })

  const handleTap = async (order: OrderCard) => {
    const next = NEXT_STATUS[order.status]
    if (!next) return

    setUpdating(order.order_id)
    try {
      await updateOrderStatus(order.order_id, next)
    } catch (err: any) {
      console.error('Status update failed:', err)
      toast.error(err.message || 'Status update failed')
    }
    setUpdating(null)
  }

  // Group active orders
  const received = [...orders.values()].filter((o) => o.status === 'RECEIVED')
  const preparing = [...orders.values()].filter((o) => o.status === 'PREPARING')
  const ready = [...orders.values()].filter((o) => o.status === 'READY')

  return (
    <div className="min-h-screen bg-dark-950 text-white flex flex-col font-sans select-none overflow-x-hidden p-6">
      {!hasInteracted && (
        <div 
          className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center cursor-pointer"
          onClick={() => setHasInteracted(true)}
        >
          <div className="glass-card p-8 rounded-2xl flex flex-col items-center max-w-sm text-center">
            <Volume2 size={48} className="text-brand-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-white mb-2">Tap to Start</h2>
            <p className="text-gray-400">Interact with the screen to enable order alert sounds.</p>
          </div>
        </div>
      )}
      
      {/* KDS Control Header */}
      <header className="glass-strong px-6 py-4 flex items-center justify-between z-10 mb-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-500 to-brand-600 flex items-center justify-center text-white border border-brand-400/20 shadow-lg shadow-brand-500/10">
            <ChefHat size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
              Kitchen Display
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
              {orders.size} active order{orders.size !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Audio and Network control */}
        <div className="flex items-center gap-3">
          {/* Mute button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
              soundEnabled 
                ? 'bg-dark-800 border-white/5 text-gray-400 hover:text-white hover:bg-dark-700' 
                : 'bg-accent-rose/10 border-accent-rose/20 text-accent-rose'
            }`}
            title={soundEnabled ? 'Mute Alert Sounds' : 'Unmute Alert Sounds'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Connection state */}
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
            connected 
              ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20' 
              : 'bg-accent-rose/10 text-accent-rose border-accent-rose/20'
          }`}>
            <Radio size={10} className={connected ? 'animate-pulse' : ''} />
            <span className="hidden sm:inline">{connected ? 'Connected' : 'Offline'}</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl border border-white/5 bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700 flex items-center justify-center transition-all active:scale-95"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {hasLongDisconnect && (
        <div className="bg-accent-rose/20 border border-accent-rose/30 text-accent-rose p-4 rounded-xl mb-6 flex items-center justify-center gap-3 shadow-lg">
          <Wifi size={20} className="animate-pulse" />
          <span className="font-bold">Connection lost. Attempting to reconnect... Please check your internet connection.</span>
        </div>
      )}

      {/* Grid columns container */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full overflow-hidden">
        
        {/* RECEIVED Column */}
        <section className="flex flex-col h-full min-h-[400px]">
          <div className="flex items-center gap-2 mb-4 bg-accent-blue/5 border border-accent-blue/10 rounded-2xl px-4 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-blue shadow-lg shadow-accent-blue/50" />
            <h2 className="font-extrabold text-sm tracking-tight text-white uppercase">New Orders</h2>
            <span className="text-xs bg-dark-850 px-2 py-0.5 rounded-md border border-white/5 text-gray-400 ml-auto font-bold">
              {received.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-6 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {received.map((order) => (
                <OrderKdsCard
                  key={order.order_id}
                  order={order}
                  onTap={handleTap}
                  loading={updating === order.order_id}
                />
              ))}
            </AnimatePresence>
            {received.length === 0 && <EmptyColumnState />}
          </div>
        </section>

        {/* PREPARING Column */}
        <section className="flex flex-col h-full min-h-[400px]">
          <div className="flex items-center gap-2 mb-4 bg-accent-amber/5 border border-accent-amber/10 rounded-2xl px-4 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-amber shadow-lg shadow-accent-amber/50" />
            <h2 className="font-extrabold text-sm tracking-tight text-white uppercase">Cooking</h2>
            <span className="text-xs bg-dark-850 px-2 py-0.5 rounded-md border border-white/5 text-gray-400 ml-auto font-bold">
              {preparing.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-6 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {preparing.map((order) => (
                <OrderKdsCard
                  key={order.order_id}
                  order={order}
                  onTap={handleTap}
                  loading={updating === order.order_id}
                />
              ))}
            </AnimatePresence>
            {preparing.length === 0 && <EmptyColumnState />}
          </div>
        </section>

        {/* READY Column */}
        <section className="flex flex-col h-full min-h-[400px]">
          <div className="flex items-center gap-2 mb-4 bg-accent-emerald/5 border border-accent-emerald/10 rounded-2xl px-4 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald shadow-lg shadow-accent-emerald/50 animate-pulse" />
            <h2 className="font-extrabold text-sm tracking-tight text-white uppercase">Ready</h2>
            <span className="text-xs bg-dark-850 px-2 py-0.5 rounded-md border border-white/5 text-gray-400 ml-auto font-bold">
              {ready.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-6 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {ready.map((order) => (
                <OrderKdsCard
                  key={order.order_id}
                  order={order}
                  onTap={handleTap}
                  loading={updating === order.order_id}
                />
              ))}
            </AnimatePresence>
            {ready.length === 0 && <EmptyColumnState />}
          </div>
        </section>

      </main>
    </div>
  )
}

// ── KDS Card Component with Urgency Glows ───────────────────────
function OrderKdsCard({
  order,
  onTap,
  loading,
}: {
  order: OrderCard
  onTap: (order: OrderCard) => void
  loading: boolean
}) {
  const [timeDiff, setTimeDiff] = useState(0)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    if (!order.created_at) return
    // Compute initial value immediately
    const calc = () => Math.floor((Date.now() - new Date(order.created_at!).getTime()) / 60000)
    setTimeDiff(calc())
    // Refresh every 30 seconds so the display stays live
    const interval = setInterval(() => setTimeDiff(calc()), 30000)
    return () => clearInterval(interval)
  }, [order.created_at])

  const actionLabel = ACTION_LABEL[order.status]
  const IconComponent = ACTION_ICON[order.status] || Check

  // Determine urgency visual alerts
  let timerColor = 'text-gray-400'
  let cardGlow = 'rgba(255,255,255,0.03)'
  let isDelayed = false

  if (order.status !== 'READY') {
    if (timeDiff >= 10) {
      timerColor = 'text-accent-rose animate-pulse'
      cardGlow = 'rgba(244, 63, 94, 0.08)' // pulsing red glow
      isDelayed = true
    } else if (timeDiff >= 5) {
      timerColor = 'text-accent-amber'
      cardGlow = 'rgba(245, 158, 11, 0.06)' // amber tint
    }
  }

  const borderClass = STATUS_COLORS[order.status] || 'border-white/5'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -30 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{ background: `linear-gradient(135deg, ${cardGlow} 0%, rgba(10,10,15,0.9) 100%)` }}
      className={`rounded-2xl border-t-4 border-l border-r border-b border-white/5 p-4 flex flex-col justify-between gap-4 shadow-lg ${borderClass}`}
    >
      {/* Card Header details */}
      <div className="flex items-start justify-between border-b border-white/5 pb-2">
        <div>
          <span className="text-white text-base font-black tracking-tight">#{order.order_number}</span>
          <span className="text-xs bg-dark-800 border border-white/5 text-gray-300 font-bold px-2 py-0.5 rounded-md ml-2 select-all">
            Table {order.table_label}
          </span>
        </div>
        
        {/* Urgent indicator */}
        {isDelayed && (
          <div className="text-accent-rose flex items-center gap-1 text-[10px] font-black uppercase bg-accent-rose/10 px-2 py-0.5 rounded-md border border-accent-rose/20">
            <AlertTriangle size={10} /> Delayed
          </div>
        )}
      </div>

      {/* Item contents */}
      <div className="space-y-2">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex gap-2 text-sm leading-normal">
            <span className="text-brand-400 font-black shrink-0">{item.quantity}×</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-extrabold truncate">{item.name}</p>
              {item.notes && (
                <p className="text-accent-amber/90 font-medium italic text-[10px] mt-0.5 bg-accent-amber/5 px-2 py-1 rounded border border-accent-amber/10 select-text leading-tight">
                  {item.notes}
                </p>
              )}
              {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                <div className="text-[10px] text-gray-400 mt-1 pl-1">
                  + {item.selected_modifiers.map(m => m.name).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Card Footer Actions */}
      <div className="flex flex-col gap-2 pt-3 border-t border-white/5 mt-1">
        <div className="flex items-center justify-between">
          
          {/* Timer */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Clock size={13} className="text-gray-400" />
            <span className={timerColor}>{timeDiff} min ago</span>
          </div>

          {/* Action Button */}
          {actionLabel && (
            <button
              disabled={loading || canceling}
              onClick={() => onTap(order)}
              className={`flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider py-2 px-4 rounded-xl border shadow-sm transition-all select-none active:scale-[0.93] ${
                loading 
                  ? 'bg-dark-800 border-white/5 text-gray-500 cursor-wait' 
                  : order.status === 'RECEIVED'
                  ? 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue hover:bg-accent-blue hover:text-white'
                  : order.status === 'PREPARING'
                  ? 'bg-accent-amber/15 border-accent-amber/30 text-accent-amber hover:bg-accent-amber hover:text-white'
                  : 'bg-accent-emerald/15 border-accent-emerald/30 text-accent-emerald hover:bg-accent-emerald hover:text-white'
              }`}
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <IconComponent size={12} strokeWidth={3} />
                  <span>{actionLabel}</span>
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Cancel Button */}
        {order.status !== 'READY' && (
          <button
            disabled={canceling || loading}
            onClick={async () => {
              if (!window.confirm(`Are you sure you want to cancel order #${order.order_number}?`)) return
              setCanceling(true)
              try {
                await updateOrderStatus(order.order_id, 'CANCELED')
              } catch (e) {
                console.error(e)
                toast.error('Failed to cancel order.')
              }
              setCanceling(false)
            }}
            className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-gray-500 hover:text-accent-rose transition-colors py-1 disabled:opacity-50"
          >
            {canceling ? 'Canceling...' : 'Cancel Order'}
          </button>
        )}
      </div>

    </motion.div>
  )
}

// ── Empty Column visual fallback ──────────────────────────────
function EmptyColumnState() {
  return (
    <div className="text-center py-10 opacity-30 select-none flex flex-col items-center justify-center">
      <Coffee size={32} className="text-gray-500 mb-2" />
      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">All Clear</span>
    </div>
  )
}
