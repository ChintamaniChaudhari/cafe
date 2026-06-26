/**
 * MenuPage — /menu
 *
 * Displays the restaurant menu with categories and items.
 * Items can be added to the localStorage cart.
 * Mobile-first design with dark mode and glassmorphism.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMenu, type CategoryData, type MenuItemData } from '../api/client'
import { addToCart, getCart, type CartItem } from '../store/cart'

export default function MenuPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [cartCount, setCartCount] = useState(0)
  const [addedItemId, setAddedItemId] = useState<string | null>(null)

  // Load session data
  const sessionRaw = localStorage.getItem('cafeos_session_data')
  const session = sessionRaw ? JSON.parse(sessionRaw) : null

  useEffect(() => {
    fetchMenu()
      .then((data) => {
        setCategories(data.categories)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    setCartCount(getCart().length)
  }, [])

  const handleAdd = (item: MenuItemData) => {
    const cartItem: CartItem = {
      item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image_url,
    }
    const updated = addToCart(cartItem)
    setCartCount(updated.reduce((s, i) => s + i.quantity, 0))
    setAddedItemId(item.id)
    setTimeout(() => setAddedItemId(null), 600)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
              {session?.tenant?.name || 'CafeOS'}
            </h1>
            {session?.table?.label && (
              <p className="text-xs text-gray-400">Table {session.table.label}</p>
            )}
          </div>
          <button
            id="cart-button"
            onClick={() => navigate('/cart')}
            className="relative glass rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/10 transition-all"
          >
            🛒 Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-fade-in">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Menu Categories */}
      <main className="max-w-lg mx-auto px-4 mt-6 space-y-8">
        {categories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No menu items available right now</p>
          </div>
        ) : (
          categories.map((cat) => (
            <section key={cat.id} className="animate-fade-in">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-brand-500 rounded-full" />
                {cat.name}
              </h2>
              <div className="space-y-3">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className={`glass rounded-xl p-4 flex items-center justify-between transition-all duration-300 ${
                      addedItemId === item.id ? 'ring-2 ring-brand-500 scale-[1.02]' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-semibold text-white truncate">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                      )}
                      <p className="text-brand-400 font-bold mt-2">
                        {session?.tenant?.currency || '₹'}{item.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      id={`add-item-${item.id}`}
                      onClick={() => handleAdd(item)}
                      className="shrink-0 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all active:scale-95"
                    >
                      Add +
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 animate-slide-in">
          <button
            onClick={() => navigate('/cart')}
            className="w-full max-w-lg mx-auto flex items-center justify-between bg-brand-500 hover:bg-brand-600 text-white rounded-2xl px-6 py-4 font-semibold shadow-lg shadow-brand-500/25 transition-all active:scale-[0.98]"
          >
            <span>{cartCount} item{cartCount > 1 ? 's' : ''} in cart</span>
            <span>View Cart →</span>
          </button>
        </div>
      )}
    </div>
  )
}
