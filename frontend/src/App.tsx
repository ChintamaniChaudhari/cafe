import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ScanLanding from './pages/ScanLanding'
import MenuPage from './pages/MenuPage'
import CartPage from './pages/CartPage'
import OrderStatus from './pages/OrderStatus'
import KitchenDisplay from './pages/KitchenDisplay'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/s/:shortcode" element={<ScanLanding />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order/:orderId" element={<OrderStatus />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent mb-4">
                CafeOS
              </h1>
              <p className="text-gray-400">Scan a QR code at your table to get started</p>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
