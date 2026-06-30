import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, 
  Search, 
  Sparkles, 
  ChevronRight, 
  Flame, 
  Leaf, 
  Utensils, 
  Plus, 
  Minus,
  Receipt
} from 'lucide-react'
import { fetchMenu, type CategoryData, type MenuItemData } from '../api/client'
import { addToCart, getCart, updateQuantity, removeFromCart, type CartItem } from '../store/cart'
import ItemModifierModal from '../components/ItemModifierModal'

export default function MenuPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVeg, setFilterVeg] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [addedItemId, setAddedItemId] = useState<string | null>(null)
  
  const [selectedModifierItem, setSelectedModifierItem] = useState<MenuItemData | null>(null)
  
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})

  // Load session data
  const sessionRaw = localStorage.getItem('cafeos_session_data')
  const session = sessionRaw ? JSON.parse(sessionRaw) : null
  const currency = session?.tenant?.currency || '₹'

  useEffect(() => {
    fetchMenu()
      .then((data) => {
        setCategories(data.categories)
        if (data.categories.length > 0) {
          setActiveCategory(data.categories[0].id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    setCart(getCart())
  }, [])

  // Sync cart item counts and additions
  const getCartItemQty = (itemId: string) => {
    const found = cart.find((i) => i.item_id === itemId)
    return found ? found.quantity : 0
  }

  const handleAddOne = (item: MenuItemData) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setSelectedModifierItem(item)
      return
    }

    const cartItem: CartItem = {
      cart_id: crypto.randomUUID(),
      item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      item,
      quantity: 1
    }
    const updated = addToCart(cartItem)
    setCart([...updated])
    setAddedItemId(item.id)
    setTimeout(() => setAddedItemId(null), 600)
  }

  const handleModalAddToCart = (cartItem: CartItem) => {
    const updated = addToCart(cartItem)
    setCart([...updated])
    setAddedItemId(cartItem.item.id)
    setTimeout(() => setAddedItemId(null), 600)
  }

  const handleRemoveOne = (itemId: string) => {
    const currentQty = getCartItemQty(itemId)
    let updated: CartItem[]
    if (currentQty <= 1) {
      updated = removeFromCart(itemId)
    } else {
      updated = updateQuantity(itemId, currentQty - 1)
    }
    setCart([...updated])
  }

  const handleUpdateQty = (itemId: string, newQty: number) => {
    const updated = updateQuantity(itemId, newQty)
    setCart([...updated])
  }

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId)
    const element = categoryRefs.current[catId]
    if (element) {
      const headerOffset = 130 // height of sticky header + category bar
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  // Detect food characteristics dynamically for badges
  const getItemBadges = (item: MenuItemData) => {
    const name = item.name.toLowerCase()
    const desc = (item.description || '').toLowerCase()
    const badges = []
    
    if (name.includes('spicy') || name.includes('chilli') || desc.includes('spicy') || desc.includes('hot')) {
      badges.push({ type: 'spicy', label: 'Spicy', icon: Flame, color: 'text-accent-rose bg-accent-rose/10 border-accent-rose/20' })
    }
    if (name.includes('veg') || name.includes('paneer') || name.includes('salad') || desc.includes('vegan') || desc.includes('vegetarian')) {
      badges.push({ type: 'veg', label: 'Veg', icon: Leaf, color: 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20' })
    }
    
    return badges
  }

  // Filter Categories and Items
  const filteredCategories = categories.map(cat => {
    const filteredItems = cat.items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      
      const isVeg = item.name.toLowerCase().includes('veg') || 
                    item.name.toLowerCase().includes('paneer') || 
                    item.name.toLowerCase().includes('salad') ||
                    (item.description || '').toLowerCase().includes('vegan') ||
                    (item.description || '').toLowerCase().includes('vegetarian')
                    
      const matchesVeg = !filterVeg || isVeg

      return matchesSearch && matchesVeg
    })
    
    return { ...cat, items: filteredItems }
  }).filter(cat => cat.items.length > 0)

  const cartTotalCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotalPrice = cart.reduce((s, i) => s + (i.price || 0) * i.quantity, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Curating menu items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32 bg-dark-950 relative overflow-hidden">
      {/* Background decoration glows */}
      <div className="ambient-glow bg-brand-500/10 top-0 left-0 w-[400px] h-[400px] animate-float-slow" />
      <div className="ambient-glow bg-accent-violet/10 bottom-0 right-0 w-[400px] h-[400px]" style={{ animationDelay: '4s' }} />

      {/* Sticky Header & Navigation */}
      <header className="sticky top-0 z-30 glass-strong shadow-lg backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          
          {/* Top Brand Panel */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 border border-brand-400/20">
                <Utensils size={20} />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-1">
                  {session?.tenant?.name || 'CafeOS'}
                  <Sparkles size={14} className="text-brand-400 animate-pulse" />
                </h1>
                {session?.table?.label && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20 font-medium mt-0.5">
                    Table {session.table.label}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/bill')}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-dark-800 border border-white/10 hover:bg-dark-700 text-white transition-all active:scale-95"
              >
                <Receipt size={20} />
              </button>
              <button
                id="cart-button"
                onClick={() => navigate('/cart')}
                className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-dark-800 border border-white/10 hover:bg-dark-700 hover:border-brand-500/30 text-white transition-all active:scale-95"
              >
                <ShoppingBag size={20} />
                <AnimatePresence>
                  {cartTotalCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-dark-900 animate-pulse"
                    >
                      {cartTotalCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900 border border-white/5 focus:border-brand-500/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
              />
            </div>
            
            <button
              onClick={() => setFilterVeg(!filterVeg)}
              className={`px-3 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-all ${
                filterVeg 
                  ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald' 
                  : 'bg-dark-900 border-white/5 text-gray-400 hover:bg-dark-800'
              }`}
            >
              <Leaf size={14} />
              <span className="hidden xs:inline">Veg</span>
            </button>
          </div>

          {/* Sticky Horizontal Categories Nav */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
                    isActive 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-white bg-dark-900/50 border border-white/5'
                  }`}
                >
                  {cat.name}
                  {isActive && (
                    <motion.div 
                      layoutId="activeCategoryIndicator"
                      className="absolute inset-0 bg-brand-500 rounded-lg -z-10 shadow-lg shadow-brand-500/25"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

        </div>
      </header>

      {/* Menu Categories list */}
      <main className="max-w-lg mx-auto px-4 mt-6 space-y-10 relative z-10">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 bg-dark-900/40 border border-white/5 rounded-3xl p-8">
            <div className="text-4xl mb-3">🍽️</div>
            <p className="text-gray-400 text-sm">No delicious items match your search.</p>
            <button 
              onClick={() => { setSearchQuery(''); setFilterVeg(false); }}
              className="text-brand-400 hover:text-brand-300 font-semibold text-xs mt-3 bg-brand-500/10 px-4 py-2 rounded-full border border-brand-500/20"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <section 
              key={cat.id} 
              ref={(el) => { categoryRefs.current[cat.id] = el; }}
              className="space-y-4"
            >
              <h2 className="text-base font-extrabold text-white flex items-center gap-2 sticky top-[136px] bg-dark-950/80 py-2 backdrop-blur-sm z-20">
                <span className="w-1.5 h-5 bg-gradient-to-b from-brand-400 to-brand-600 rounded-full" />
                {cat.name}
                <span className="text-xs text-gray-500 font-normal">({cat.items.length})</span>
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {cat.items.map((item) => {
                  const badges = getItemBadges(item)
                  const cartQty = getCartItemQty(item.id)
                  
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      className={`glass-card rounded-2xl p-4 flex gap-4 items-start ${
                        addedItemId === item.id ? 'ring-2 ring-brand-500 scale-[1.01]' : ''
                      }`}
                    >
                      {/* Item Image with Premium Fallback */}
                      <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden relative bg-dark-900 border border-white/5">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-dark-800 to-dark-900 flex items-center justify-center text-brand-500/30">
                            <Utensils size={24} />
                          </div>
                        )}
                        
                        {/* Veg Badge on Image */}
                        {badges.find(b => b.type === 'veg') && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded flex items-center justify-center border border-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          </div>
                        )}
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[80px]">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-extrabold text-white text-sm truncate">{item.name}</h3>
                            <span className="text-brand-400 font-black text-sm shrink-0">
                              {currency}{item.price.toFixed(2)}
                            </span>
                          </div>
                          
                          {item.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Footer details: Badges & Buy CTA */}
                        <div className="flex items-center justify-between gap-2 mt-3">
                          {/* Badges */}
                          <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {badges.map((badge, idx) => {
                              const Icon = badge.icon
                              return (
                                <span 
                                  key={idx} 
                                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}
                                >
                                  <Icon size={8} />
                                  {badge.label}
                                </span>
                              )
                            })}
                          </div>

                          {/* Buy Button & Quantity Controls */}
                          <div className="shrink-0">
                            {cartQty > 0 ? (
                                <div className="flex items-center bg-brand-500 rounded-xl p-0.5 text-white shadow-md shadow-brand-500/25">
                                  <button
                                    onClick={() => handleRemoveOne(item.id)}
                                    className="w-8 h-8 flex items-center justify-center text-white hover:bg-brand-600 rounded-lg active:scale-90 transition-transform"
                                  >
                                    <Minus size={14} strokeWidth={3} />
                                  </button>
                                  <span className="w-6 text-center text-xs font-black select-none">
                                    {cartQty}
                                  </span>
                                  <button
                                    onClick={() => {
                                      if (item.modifiers && item.modifiers.length > 0) {
                                        handleAddOne(item)
                                      } else {
                                        handleUpdateQty(item.id, cartQty + 1)
                                      }
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-white hover:bg-brand-600 rounded-lg active:scale-90 transition-transform"
                                  >
                                    <Plus size={14} strokeWidth={3} />
                                  </button>
                                </div>
                            ) : (
                              <button
                                id={`add-item-${item.id}`}
                                onClick={() => handleAddOne(item)}
                                className="bg-dark-800 hover:bg-brand-500 hover:text-white text-brand-400 text-xs font-extrabold px-4 py-2 rounded-xl transition-all border border-brand-500/20 hover:border-brand-500 shadow-sm active:scale-95"
                              >
                                Add +
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      <AnimatePresence>
        {cartTotalCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-0 inset-x-0 z-40 p-4"
          >
            <button
              onClick={() => navigate('/cart')}
              className="w-full max-w-lg mx-auto flex items-center justify-between bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-2xl px-6 py-4 font-bold shadow-xl shadow-brand-500/20 transition-all border border-brand-400/20 active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <ShoppingBag size={16} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-brand-200 uppercase font-black tracking-wider leading-none">View Cart</p>
                  <p className="text-xs text-white mt-0.5">{cartTotalCount} items • {currency}{cartTotalPrice.toFixed(2)}</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs">
                Review & Order <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ItemModifierModal
        item={selectedModifierItem}
        isOpen={!!selectedModifierItem}
        onClose={() => setSelectedModifierItem(null)}
        onAddToCart={handleModalAddToCart}
        currency={currency}
      />
    </div>
  )
}
