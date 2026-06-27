import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit2, Package, Search, BarChart3, ClipboardList, TrendingUp } from 'lucide-react';
import { 
  fetchMenu, CategoryData, MenuItemData, 
  fetchAnalytics, AdminAnalytics,
  fetchAdminOrders, AdminOrderHistory,
  addMenuItem, editMenuItem
} from '../api/client';
import MenuItemModal from '../components/MenuItemModal';

type TabType = 'MENU' | 'ORDERS' | 'ANALYTICS';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('MENU');
  
  // Data States
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [orders, setOrders] = useState<AdminOrderHistory[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [menuRes, analyticsRes, ordersRes] = await Promise.all([
        fetchMenu(),
        fetchAnalytics().catch(() => null),
        fetchAdminOrders().catch(() => null)
      ]);
      
      setCategories(menuRes.categories || []);
      if (analyticsRes) setAnalytics(analyticsRes.data);
      if (ordersRes) setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleSaveItem = async (data: any) => {
    if (editingItem) {
      await editMenuItem(editingItem.id, data);
    } else {
      await addMenuItem(data);
    }
    await loadData();
  };

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      await editMenuItem(itemId, { is_available: !currentStatus });
      setCategories(cats => cats.map(c => ({
        ...c,
        items: c.items.map(i => i.id === itemId ? { ...i, is_available: !currentStatus } : i)
      })));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !categories.length) {
    return <div className="min-h-screen bg-dark-950 flex items-center justify-center text-white font-bold animate-pulse">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white relative">
      <div className="ambient-glow bg-brand-500 top-0 right-0 w-96 h-96 opacity-10" />
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-30 glass-strong shadow-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">CafeOS Admin</h1>
            </div>
          </div>
          
          <div className="flex gap-2 bg-dark-900/50 p-1 rounded-xl border border-white/5">
            {[
              { id: 'MENU', icon: Package, label: 'Menu' },
              { id: 'ORDERS', icon: ClipboardList, label: 'Orders' },
              { id: 'ANALYTICS', icon: BarChart3, label: 'Analytics' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded-xl transition-colors border border-white/5 text-sm font-bold"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 min-h-[80vh]">
        <AnimatePresence mode="wait">
          
          {/* MENU TAB */}
          {activeTab === 'MENU' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search menu items..." 
                    className="w-full bg-dark-900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-500/50"
                  />
                </div>
                <button 
                  onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20"
                >
                  <Plus size={18} />
                  New Item
                </button>
              </div>

              <div className="space-y-8">
                {categories.map((category) => (
                  <div key={category.id}>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      {category.name}
                      <span className="text-xs bg-dark-800 text-gray-400 px-2 py-1 rounded-full">
                        {category.items.length} items
                      </span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {category.items.map((item) => (
                        <div key={item.id} className="glass-card p-4 rounded-2xl border border-white/5 flex flex-col group transition-all hover:border-brand-500/30">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-white text-lg">{item.name}</h3>
                            <button 
                              onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                              className="text-gray-400 hover:text-brand-400 p-1.5 bg-dark-800 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">
                            {item.description || 'No description provided.'}
                          </p>
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                            <span className="font-black text-brand-400">₹{item.price.toFixed(2)}</span>
                            
                            <button 
                              onClick={() => toggleAvailability(item.id, item.is_available)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
                                item.is_available 
                                  ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 hover:bg-accent-emerald/20' 
                                  : 'bg-accent-rose/10 text-accent-rose border border-accent-rose/20 hover:bg-accent-rose/20'
                              }`}
                            >
                              {item.is_available ? 'Available' : 'Out of Stock'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'ORDERS' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-2xl overflow-hidden border border-white/5"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark-900/50 text-xs uppercase font-bold text-gray-400 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4">Order #</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Items</th>
                      <th className="px-6 py-4">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-bold text-white">#{order.order_number}</td>
                        <td className="px-6 py-4 text-gray-400">{new Date(order.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black tracking-wider uppercase rounded-full border ${
                            order.status === 'SERVED' ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' :
                            order.status === 'READY' ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20' :
                            order.status === 'PREPARING' ? 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' :
                            'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </td>
                        <td className="px-6 py-4 font-black text-brand-400">₹{order.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'ANALYTICS' && analytics && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <TrendingUp size={64} className="text-brand-500" />
                  </div>
                  <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Total Revenue</h3>
                  <div className="text-4xl font-black text-white">₹{analytics.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <ClipboardList size={64} className="text-accent-blue" />
                  </div>
                  <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Total Orders</h3>
                  <div className="text-4xl font-black text-white">{analytics.total_orders}</div>
                </div>

                <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Package size={64} className="text-accent-amber" />
                  </div>
                  <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Active Kitchen Orders</h3>
                  <div className="text-4xl font-black text-white">{analytics.active_orders}</div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Popular Items</h3>
                <div className="space-y-4">
                  {analytics.popular_items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-white">{item.name}</span>
                      </div>
                      <div className="text-gray-400 font-medium">
                        <span className="text-white">{item.sold}</span> units sold
                      </div>
                    </div>
                  ))}
                  {analytics.popular_items.length === 0 && (
                    <div className="text-center text-gray-500 py-4">Not enough data to determine popular items.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          
        </AnimatePresence>
      </main>

      <MenuItemModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        categories={categories}
        initialData={editingItem}
      />
    </div>
  );
}
