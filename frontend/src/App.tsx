import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import ScanLanding from './pages/ScanLanding'
import MenuPage from './pages/MenuPage'
import CartPage from './pages/CartPage'
import OrderStatus from './pages/OrderStatus'
import KitchenDisplay from './pages/KitchenDisplay'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import NotFoundPage from './pages/NotFoundPage'
import CustomerBill from './pages/CustomerBill'
import { Toaster } from 'react-hot-toast'

function AnimatedApp() {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/s/:shortcode" element={<ScanLanding />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/bill" element={<CustomerBill />} />
        <Route path="/order/:orderId" element={<OrderStatus />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/" element={
          <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
            {/* Ambient Background Lights */}
            <div className="ambient-glow bg-brand-500 top-1/4 left-1/4 animate-float-slow" />
            <div className="ambient-glow bg-accent-violet bottom-1/4 right-1/4" style={{ animationDelay: '2s' }} />
            
            <div className="text-center z-10 glass-card p-10 rounded-3xl max-w-sm mx-4">
              <h1 className="text-5xl font-black bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent mb-4 tracking-tight">
                CafeOS
              </h1>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Experience dining, modernized. Scan the QR code at your table to explore the menu.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-brand-400 bg-brand-500/10 px-4 py-2 rounded-full font-medium border border-brand-500/20">
                <span>📱 Scan QR to Start</span>
              </div>
            </div>
          </div>
        } />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { background: '#1f2937', color: '#fff' } }} />
      <AnimatedApp />
    </BrowserRouter>
  )
}

export default App
