/**
 * KitchenDisplay page — /kitchen
 *
 * Full-screen Kitchen Display System (KDS) for tablet.
 * - Connects via WebSocket to receive real-time order events.
 * - Displays order cards grouped by status.
 * - Tap a card once → advance to PREPARING.
 * - Tap again → advance to READY.
 * - Audio beep on new order.
 *
 * The 500ms Rule: order cards must appear within 500ms of WS broadcast.
 */

import { useCallback, useRef, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { updateOrderStatus } from '../api/client'

interface OrderCard {
  order_id: string
  order_number: number
  table_label: string
  status: string
  total_amount?: number
  items: { name: string; quantity: number; notes: string | null }[]
  created_at?: string
}

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'border-blue-500 bg-blue-500/10',
  PREPARING: 'border-amber-500 bg-amber-500/10',
  READY: 'border-emerald-500 bg-emerald-500/10',
}

const STATUS_BADGE: Record<string, string> = {
  RECEIVED: 'status-received',
  PREPARING: 'status-preparing',
  READY: 'status-ready',
}

const NEXT_STATUS: Record<string, string> = {
  RECEIVED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
}

const ACTION_LABEL: Record<string, string> = {
  RECEIVED: 'Start Cooking',
  PREPARING: 'Mark Ready',
  READY: 'Mark Served',
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Map<string, OrderCard>>(new Map())
  const [updating, setUpdating] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create a beep sound using Web Audio API
  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch {
      // Audio may fail silently
    }
  }, [])

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
            if (msg.data!.status === 'SERVED') {
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
  const { connected } = useWebSocket(wsUrl, { onMessage: handleMessage })

  const handleTap = async (order: OrderCard) => {
    const next = NEXT_STATUS[order.status]
    if (!next) return

    setUpdating(order.order_id)
    try {
      await updateOrderStatus(order.order_id, next)
    } catch (err) {
      console.error('Status update failed:', err)
    }
    setUpdating(null)
  }

  // Group orders by status
  const received = [...orders.values()].filter((o) => o.status === 'RECEIVED')
  const preparing = [...orders.values()].filter((o) => o.status === 'PREPARING')
  const ready = [...orders.values()].filter((o) => o.status === 'READY')

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="glass-strong px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
            Kitchen Display
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {orders.size} active order{orders.size !== 1 ? 's' : ''}
          </p>
        </div>
        <div className={`flex items-center gap-2 text-sm ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          {connected ? 'Connected' : 'Reconnecting...'}
        </div>
      </header>

      {/* Order Columns */}
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">
        {/* RECEIVED Column */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <h2 className="font-bold text-white">New Orders</h2>
            <span className="text-xs text-gray-500 ml-auto">{received.length}</span>
          </div>
          <div className="space-y-3">
            {received.map((order) => (
              <OrderCardComponent
                key={order.order_id}
                order={order}
                onTap={handleTap}
                loading={updating === order.order_id}
              />
            ))}
          </div>
        </section>

        {/* PREPARING Column */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <h2 className="font-bold text-white">Preparing</h2>
            <span className="text-xs text-gray-500 ml-auto">{preparing.length}</span>
          </div>
          <div className="space-y-3">
            {preparing.map((order) => (
              <OrderCardComponent
                key={order.order_id}
                order={order}
                onTap={handleTap}
                loading={updating === order.order_id}
              />
            ))}
          </div>
        </section>

        {/* READY Column */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <h2 className="font-bold text-white">Ready</h2>
            <span className="text-xs text-gray-500 ml-auto">{ready.length}</span>
          </div>
          <div className="space-y-3">
            {ready.map((order) => (
              <OrderCardComponent
                key={order.order_id}
                order={order}
                onTap={handleTap}
                loading={updating === order.order_id}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

// ── Order Card Component ─────────────────────────────────────
function OrderCardComponent({
  order,
  onTap,
  loading,
}: {
  order: OrderCard
  onTap: (order: OrderCard) => void
  loading: boolean
}) {
  const borderColor = STATUS_COLORS[order.status] || ''
  const badgeClass = STATUS_BADGE[order.status] || ''
  const actionLabel = ACTION_LABEL[order.status]

  const timeSince = order.created_at
    ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
    : null

  return (
    <div
      className={`kds-card rounded-xl border-l-4 p-4 cursor-pointer animate-slide-in ${borderColor}`}
      onClick={() => !loading && onTap(order)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-white font-bold text-lg">#{order.order_number}</span>
          <span className="text-gray-400 text-sm ml-2">{order.table_label}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
          {order.status}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="text-brand-400 font-bold">{item.quantity}×</span>
            <div className="flex-1">
              <span className="text-white">{item.name}</span>
              {item.notes && (
                <p className="text-gray-500 text-xs mt-0.5">📝 {item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        {timeSince !== null && (
          <span className={`text-xs ${timeSince > 10 ? 'text-red-400' : 'text-gray-500'}`}>
            {timeSince}m ago
          </span>
        )}
        {actionLabel && (
          <button
            disabled={loading}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              loading
                ? 'bg-gray-700 text-gray-400 cursor-wait'
                : 'bg-brand-500 hover:bg-brand-600 text-white active:scale-95'
            }`}
          >
            {loading ? '...' : actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
