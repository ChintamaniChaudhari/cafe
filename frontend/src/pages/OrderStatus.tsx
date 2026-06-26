/**
 * OrderStatus page — /order/:orderId
 *
 * Shows live order status updates via WebSocket.
 * Customer sees: Received → Preparing → Ready for Pickup
 * Updates are pushed in real-time from the kitchen.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'

interface OrderInfo {
  order_id: string
  order_number: number
  table_label: string
  status: string
  items?: { name: string; quantity: number; notes: string | null }[]
}

const STATUS_DISPLAY: Record<string, { label: string; emoji: string; class: string }> = {
  RECEIVED: { label: 'Order Received', emoji: '📋', class: 'status-received' },
  PREPARING: { label: 'Preparing', emoji: '👨‍🍳', class: 'status-preparing' },
  READY: { label: 'Ready for Pickup', emoji: '✅', class: 'status-ready' },
  SERVED: { label: 'Served', emoji: '🍽️', class: 'status-served' },
}

const STATUS_ORDER = ['RECEIVED', 'PREPARING', 'READY', 'SERVED']

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderInfo | null>(null)

  // Try to get initial order info from navigation state or localStorage
  useEffect(() => {
    // Set initial from any cached data
    const cached = localStorage.getItem(`cafeos_order_${orderId}`)
    if (cached) {
      setOrder(JSON.parse(cached))
    }
  }, [orderId])

  const handleMessage = useCallback(
    (data: unknown) => {
      const msg = data as { event?: string; data?: OrderInfo; orders?: { data: OrderInfo }[] }

      // Handle status change for this order
      if (
        msg.event === 'ORDER_STATUS_CHANGED' &&
        msg.data?.order_id === orderId
      ) {
        setOrder((prev) => (prev ? { ...prev, status: msg.data!.status } : prev))
      }

      // Handle initial orders (if we reconnect)
      if (msg.event === 'INITIAL_ORDERS' && msg.orders) {
        const ours = msg.orders.find((o) => o.data.order_id === orderId)
        if (ours) {
          setOrder(ours.data)
        }
      }

      // Handle our newly created order
      if (msg.event === 'ORDER_CREATED' && msg.data?.order_id === orderId) {
        setOrder(msg.data)
        localStorage.setItem(`cafeos_order_${orderId}`, JSON.stringify(msg.data))
      }
    },
    [orderId]
  )

  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/ws/kitchen`
  const { connected } = useWebSocket(wsUrl, { onMessage: handleMessage })

  const currentStatus = order?.status || 'RECEIVED'
  const statusInfo = STATUS_DISPLAY[currentStatus] || STATUS_DISPLAY.RECEIVED
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-strong px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Order Status</h1>
          <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {connected ? 'Live' : 'Reconnecting...'}
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center animate-fade-in">
          {/* Status Emoji */}
          <div className="text-7xl mb-6 animate-pulse">{statusInfo.emoji}</div>

          {/* Status Badge */}
          <div className={`inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold mb-6 ${statusInfo.class}`}>
            {statusInfo.label}
          </div>

          {/* Order Info */}
          {order && (
            <div className="glass rounded-2xl p-6 text-left space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Order #</span>
                <span className="text-white font-bold">{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Table</span>
                <span className="text-white font-medium">{order.table_label}</span>
              </div>
              {order.items && (
                <div className="border-t border-white/10 pt-3 mt-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-gray-300">
                        {item.quantity}× {item.name}
                      </span>
                      {item.notes && (
                        <span className="text-gray-500 text-xs">{item.notes}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress Steps */}
          <div className="flex justify-center gap-2 mb-8">
            {STATUS_ORDER.slice(0, 3).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full flex-1 max-w-16 transition-all duration-500 ${
                  i <= currentIdx ? 'bg-brand-500' : 'bg-dark-600'
                }`}
              />
            ))}
          </div>

          {/* New Order Button */}
          <button
            onClick={() => navigate('/menu')}
            className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
          >
            Order more items →
          </button>
        </div>
      </main>
    </div>
  )
}
