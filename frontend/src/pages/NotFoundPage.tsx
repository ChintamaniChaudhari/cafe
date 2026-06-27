import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MapPinOff, Home, Utensils } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden px-4"
    >
      {/* Ambient background */}
      <div className="ambient-glow bg-accent-rose/10 top-1/4 left-1/4 w-[350px] h-[350px]" />
      <div className="ambient-glow bg-accent-violet/10 bottom-1/4 right-1/4 w-[350px] h-[350px]" />

      <div className="text-center z-10 glass-card p-10 rounded-3xl max-w-sm w-full">
        <div className="w-20 h-20 bg-accent-rose/10 text-accent-rose border border-accent-rose/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MapPinOff size={36} />
        </div>

        <h1 className="text-6xl font-black text-white mb-2 tracking-tight">404</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          This page doesn't exist. You might have followed an old link or typed the URL incorrectly.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold py-3 px-4 rounded-xl transition-all active:scale-95 shadow-md shadow-brand-500/20 text-sm"
          >
            <Home size={16} />
            Go Home
          </button>
          <button
            onClick={() => navigate('/menu')}
            className="w-full flex items-center justify-center gap-2 bg-dark-800 hover:bg-dark-700 border border-white/10 text-white font-extrabold py-3 px-4 rounded-xl transition-all active:scale-95 text-sm"
          >
            <Utensils size={16} />
            Browse Menu
          </button>
        </div>
      </div>
    </motion.div>
  )
}
