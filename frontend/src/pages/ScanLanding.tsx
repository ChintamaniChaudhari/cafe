import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Coffee, AlertCircle, RefreshCw, Sparkles } from 'lucide-react'
import { scanQR } from '../api/client'

export default function ScanLanding() {
  const { shortcode } = useParams<{ shortcode: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shortcode) return

    scanQR(shortcode)
      .then((data) => {
        // Store session info for later use
        localStorage.setItem('cafeos_session_data', JSON.stringify(data.data))
        // Redirect to menu after a short sweet delay to feel premium
        setTimeout(() => {
          navigate('/menu', { replace: true })
        }, 1200)
      })
      .catch((err) => {
        setError(err.message || 'Failed to scan QR code')
      })
  }, [shortcode, navigate])

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center min-h-screen px-4 relative overflow-hidden"
      >
        {/* Background ambient bubble */}
        <div className="ambient-glow bg-accent-rose top-1/3 left-1/3 animate-pulse-glow w-[350px] h-[350px]" />
        
        <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center relative z-10 border-accent-rose/20">
          <div className="w-16 h-16 bg-accent-rose/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-accent-rose border border-accent-rose/20">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Scan Failed</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 bg-dark-700 hover:bg-dark-600 border border-white/10 text-white text-sm font-semibold py-3 px-4 rounded-xl transition-all active:scale-95"
          >
            <RefreshCw size={16} /> Try Again
          </button>
          <p className="text-gray-500 text-xs mt-4">
            Please ask our staff if you continue to experience issues.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center min-h-screen relative overflow-hidden"
    >
      {/* Background ambient bubble */}
      <div className="ambient-glow bg-brand-500 top-1/4 left-1/4 animate-float-slow" />
      <div className="ambient-glow bg-accent-violet bottom-1/4 right-1/4" style={{ animationDelay: '3s' }} />

      <div className="text-center z-10">
        {/* Pulsing loading icon container */}
        <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
          <motion.div 
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
              rotate: 360
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 border-2 border-dashed border-brand-400/40 rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.25, 1],
              opacity: [0.1, 0.25, 0.1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="absolute -inset-4 bg-brand-500/10 rounded-full blur-xl"
          />
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-500 to-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 border border-brand-400/30">
            <Coffee size={32} className="animate-bounce" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-extrabold text-white mb-2 tracking-tight flex items-center justify-center gap-2">
            Connecting to Table <Sparkles size={18} className="text-brand-400 animate-pulse" />
          </h1>
          <p className="text-gray-400 text-sm">Preparing your digital menu...</p>
        </motion.div>
      </div>
    </motion.div>
  )
}
