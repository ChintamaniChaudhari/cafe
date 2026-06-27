import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wifi, 
  WifiOff, 
  ClipboardList, 
  ChefHat, 
  CheckCircle2, 
  UtensilsCrossed,
  ArrowRight,
  ShoppingBag,
  Sparkles
} from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'

interface OrderInfo {
  order_id: string
  order_number: number
  table_label: string
  status: string
  items?: { name: string; quantity: number; notes: string | null }[]
}

const STATUS_DISPLAY = {
  RECEIVED: { 
    label: 'Order Placed', 
    desc: 'The kitchen has received your order.',
    icon: ClipboardList, 
    color: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20' 
  },
  PREPARING: { 
    label: 'Cooking In Progress', 
    desc: 'Our chefs are crafting your meal.',
    icon: ChefHat, 
    color: 'text-accent-amber bg-accent-amber/10 border-accent-amber/20' 
  },
  READY: { 
    label: 'Ready for Pickup', 
    desc: 'Pick up your food at the counter!',
    icon: CheckCircle2, 
    color: 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20' 
  },
  SERVED: { 
    label: 'Enjoy Your Meal', 
    desc: 'Order served successfully. Enjoy!',
    icon: UtensilsCrossed, 
    color: 'text-accent-violet bg-accent-violet/10 border-accent-violet/20' 
  },
}

const STATUS_ORDER = ['RECEIVED', 'PREPARING', 'READY', 'SERVED']

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  // Load initial order cache
  useEffect(() => {
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
        setOrder((prev) => {
          const oldStatus = prev?.status || 'RECEIVED'
          const newStatus = msg.data!.status
          
          // Trigger celebration if it just became READY or SERVED
          if (oldStatus !== newStatus && (newStatus === 'READY' || newStatus === 'SERVED')) {
            setCelebrate(true)
            setTimeout(() => setCelebrate(false), 5000)
          }
          
          return prev ? { ...prev, status: newStatus } : prev
        })
      }

      // Handle initial orders hydration
      if (msg.event === 'INITIAL_ORDERS' && msg.orders) {
        const ours = msg.orders.find((o) => o.data.order_id === orderId)
        if (ours) {
          setOrder(ours.data)
        }
      }

      // Handle our newly created order event
      if (msg.event === 'ORDER_CREATED' && msg.data && msg.data.order_id === orderId) {
        setOrder(msg.data)
        localStorage.setItem(`cafeos_order_${orderId}`, JSON.stringify(msg.data))
      }
    },
    [orderId]
  )

  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/ws/kitchen`
  const { connected } = useWebSocket(wsUrl, { onMessage: handleMessage })

  const currentStatus = order?.status || 'RECEIVED'
  const statusInfo = STATUS_DISPLAY[currentStatus as keyof typeof STATUS_DISPLAY] || STATUS_DISPLAY.RECEIVED
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen pb-24 bg-dark-950 text-white relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient bubble */}
      <div className="ambient-glow bg-brand-500/10 top-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px]" />
      
      {/* Celebration Sparkles overlay */}
      <AnimatePresence>
        {celebrate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center bg-brand-500/5 backdrop-blur-[1px]"
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  scale: 0, 
                  opacity: 1 
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 400, 
                  y: (Math.random() - 0.5) * 500 - 100, 
                  scale: Math.random() * 1.5 + 0.5,
                  opacity: 0,
                  rotate: Math.random() * 360
                }}
                transition={{ duration: 2.5, ease: "easeOut" }}
                className="absolute text-brand-400"
              >
                <Sparkles size={24} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong shadow-lg py-4">
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between">
          <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
            Live Order Status
            {celebrate && <Sparkles size={16} className="text-brand-400 animate-bounce" />}
          </h1>
          
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            connected 
              ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20' 
              : 'bg-accent-rose/10 text-accent-rose border-accent-rose/20'
          }`}>
            {connected ? (
              <>
                <Wifi size={10} className="animate-pulse" />
                Live
              </>
            ) : (
              <>
                <WifiOff size={10} />
                Connecting
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Track Details */}
      <main className="max-w-lg mx-auto px-4 flex-1 w-full mt-6 flex flex-col justify-center gap-8 z-10">
        
        {/* Major Status Display Ring/Card */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          {/* Animated pulsing icon container */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.25, 0.1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute inset-0 rounded-full blur-xl ${
                currentStatus === 'READY' ? 'bg-accent-emerald' : 'bg-brand-500'
              }`}
            />
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border shadow-lg ${statusInfo.color}`}>
              <StatusIcon size={36} className="animate-pulse" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">{statusInfo.label}</h2>
            <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto leading-relaxed">{statusInfo.desc}</p>
          </div>
        </motion.div>

        {/* Vertical Timeline Steps */}
        <div className="glass-card rounded-2xl p-5 space-y-6">
          {STATUS_ORDER.map((s, idx) => {
            const stepInfo = STATUS_DISPLAY[s as keyof typeof STATUS_DISPLAY]
            const StepIcon = stepInfo.icon
            const isCompleted = idx < currentIdx
            const isActive = idx === currentIdx
            
            return (
              <div key={s} className="flex gap-4 relative last:pb-0">
                {/* Visual connecting line */}
                {idx < STATUS_ORDER.length - 1 && (
                  <div className={`absolute left-5 top-10 bottom-[-24px] w-0.5 -translate-x-1/2 ${
                    idx < currentIdx ? 'bg-brand-500' : 'bg-dark-700'
                  }`} />
                )}

                {/* Step Circle Pin */}
                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center z-10 border transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-brand-500 border-brand-400 text-white' 
                    : isActive 
                    ? 'bg-dark-800 border-brand-500/40 text-brand-400 shadow-md shadow-brand-500/10' 
                    : 'bg-dark-900 border-white/5 text-gray-600'
                }`}>
                  <StepIcon size={18} />
                </div>

                {/* Step Label Info */}
                <div className="flex-1 pt-1.5 min-w-0">
                  <h4 className={`text-sm font-extrabold transition-colors ${
                    isCompleted ? 'text-gray-300 line-through opacity-60' : isActive ? 'text-white' : 'text-gray-500'
                  }`}>
                    {stepInfo.label}
                  </h4>
                  {isActive && (
                    <motion.p 
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-gray-400 mt-0.5 leading-relaxed"
                    >
                      {stepInfo.desc}
                    </motion.p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Order Items Info Card */}
        {order && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400 pb-3 border-b border-white/5 font-bold uppercase tracking-wider">
              <span>Order Summary</span>
              <span>#{order.order_number}</span>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-xs py-0.5">
                  <span className="text-gray-300 font-medium">
                    {item.quantity}× <span className="text-white font-extrabold">{item.name}</span>
                  </span>
                  {item.notes && (
                    <span className="text-brand-400 italic text-[10px] bg-brand-500/5 px-2 py-0.5 rounded border border-brand-500/10 max-w-[150px] truncate">
                      {item.notes}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-white/5 font-medium">
              <span>Table</span>
              <span className="text-white font-bold">{order.table_label}</span>
            </div>
          </div>
        )}

      </main>

      {/* Footer Navigation Action */}
      <footer className="max-w-lg mx-auto w-full px-4 mt-8">
        <button
          onClick={() => navigate('/menu')}
          className="w-full flex items-center justify-center gap-2 bg-dark-800 hover:bg-dark-700 border border-white/10 text-white font-extrabold py-3.5 px-4 rounded-2xl transition-all active:scale-[0.99] group text-sm"
        >
          <ShoppingBag size={16} />
          Order more items 
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-brand-400" />
        </button>
      </footer>
    </div>
  )
}
