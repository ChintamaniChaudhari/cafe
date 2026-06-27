import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit2, Package, Search, BarChart3, ClipboardList, TrendingUp } from 'lucide-react';
import { 
  fetchMenu, CategoryData, MenuItemData, 
  fetchAdminOrders, AdminOrderHistory,
  fetchAdminSessions, AdminSession, closeSession,
  fetchTables, createTable, deleteTable, DiningTable,
  addMenuItem, editMenuItem, deleteMenuItem, apiFetch
} from '../api/client';
import { QRCodeCanvas } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import MenuItemModal from '../components/MenuItemModal';

type TabType = 'MENU' | 'ORDERS' | 'SESSIONS' | 'TABLES' | 'ANALYTICS' | 'STAFF' | 'FEEDBACK';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('MENU');
  
  // Data States
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'ADMIN'|'KITCHEN'>('KITCHEN');
  const [orders, setOrders] = useState<AdminOrderHistory[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [ordersPage, setOrdersPage] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const ORDERS_PER_PAGE = 20;
  
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const role = localStorage.getItem('user_role');
    
    if (!token) {
      navigate('/admin/login');
      return;
    }
    
    if (role === 'KITCHEN') {
      navigate('/kitchen');
      return;
    }

    loadData();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'ORDERS') {
      loadOrders();
    } else if (activeTab === 'SESSIONS') {
      loadSessions();
    } else if (activeTab === 'TABLES') {
      loadTables();
    } else if (activeTab === 'ANALYTICS') {
      loadAnalytics();
    } else if (activeTab === 'STAFF') {
      loadStaff();
    } else if (activeTab === 'FEEDBACK') {
      loadFeedback();
    }
  }, [activeTab, ordersPage]);

  const loadTables = async () => {
    try {
      const res = await fetchTables();
      setTables(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await fetchAdminSessions();
      setSessions(res.data);
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const ordersRes = await fetchAdminOrders(ordersPage * ORDERS_PER_PAGE, ORDERS_PER_PAGE);
      setOrders(ordersRes.data);
      setTotalOrders(ordersRes.total);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await apiFetch('/api/v1/admin/analytics');
      setAnalytics(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadFeedback = async () => {
    try {
      const data = await apiFetch('/api/v1/admin/feedback');
      setFeedbackList(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadStaff = async () => {
    try {
      const data = await apiFetch('/api/v1/admin/staff');
      setStaff(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const menuRes = await fetchMenu();
      setCategories(menuRes.categories || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffUsername || !newStaffPassword) return;
    try {
      await apiFetch('/api/v1/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          username: newStaffUsername,
          password: newStaffPassword,
          role: newStaffRole
        })
      });
      setNewStaffUsername('');
      setNewStaffPassword('');
      loadStaff();
    } catch (e) {
      console.error(e);
      alert('Failed to create staff account.');
    }
  };

  const handleDeleteStaff = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    try {
      await apiFetch(`/api/v1/admin/staff/${userId}`, { method: 'DELETE' });
      loadStaff();
    } catch (e) {
      console.error(e);
      alert('Failed to delete staff account. You cannot delete your own account.');
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

  const handleDeleteItem = async (itemId: string) => {
    await deleteMenuItem(itemId);
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

  const handleCloseSession = async (sessionId: string) => {
    if (!window.confirm("Mark this session as PAID and close it?")) return;
    try {
      await closeSession(sessionId);
      await loadSessions();
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableLabel.trim()) return;
    try {
      await createTable(newTableLabel.trim());
      setNewTableLabel('');
      await loadTables();
    } catch (e) {
      console.error(e);
      alert('Failed to create table. Label might not be unique.');
    }
  };

  const downloadQR = (shortcode: string, label: string) => {
    const canvas = document.getElementById(`qr-${shortcode}`) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `table-${label}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  if (loading && !categories.length) {
    return <div className="min-h-screen bg-dark-950 flex items-center justify-center text-white font-bold animate-pulse">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white relative">
      <div className="ambient-glow bg-brand-500 top-0 right-0 w-96 h-96 opacity-10" />
      
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
          
          <div className="flex gap-2 bg-dark-900/50 p-1 rounded-xl border border-white/5 overflow-x-auto">
            {(['MENU', 'ORDERS', 'SESSIONS', 'TABLES', 'STAFF', 'FEEDBACK', 'ANALYTICS'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'MENU' && <Package size={16} />}
                {tab === 'ORDERS' && <ClipboardList size={16} />}
                {tab === 'SESSIONS' && <TrendingUp size={16} />}
                {tab === 'TABLES' && <Package size={16} />}
                {tab === 'STAFF' && <Package size={16} />}
                {tab === 'FEEDBACK' && <TrendingUp size={16} />}
                {tab === 'ANALYTICS' && <BarChart3 size={16} />}
                {tab}
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
                            order.status === 'CANCELED' ? 'bg-accent-rose/10 text-accent-rose border-accent-rose/20' :
                            order.status === 'SERVED' ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' :
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
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'SESSIONS' && (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-2xl overflow-hidden border border-white/5"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark-900/50 text-xs uppercase font-bold text-gray-400 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4">Session ID</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-6 py-4">{session.id}</td>
                        <td className="px-6 py-4">{session.status}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleCloseSession(session.id)} className="text-brand-400 font-bold">Mark Paid</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TABLES TAB */}
          {activeTab === 'TABLES' && (
            <motion.div
              key="tables"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-2xl overflow-hidden border border-white/5 p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="text-brand-400" /> Table Management
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Manage dining tables and generate QR codes.</p>
                </div>
                <form onSubmit={handleCreateTable} className="flex gap-2">
                  <input
                    type="text"
                    value={newTableLabel}
                    onChange={e => setNewTableLabel(e.target.value)}
                    placeholder="e.g. Table 1"
                    className="bg-dark-900 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                  />
                  <button
                    type="submit"
                    disabled={!newTableLabel.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
                  >
                    <Plus size={16} />
                    Add Table
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tables.map(table => {
                  const qrUrl = `${window.location.protocol}//${window.location.host}/s/${table.qr_shortcode}`;
                  return (
                    <div key={table.id} className="bg-dark-900 border border-white/5 rounded-xl p-4 flex flex-col items-center text-center space-y-4">
                      <h3 className="font-bold text-lg text-white">{table.label}</h3>
                      
                      <div className="bg-white p-2 rounded-lg">
                        <QRCodeCanvas
                          id={`qr-${table.qr_shortcode}`}
                          value={qrUrl}
                          size={120}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      
                      <div className="text-xs text-gray-500 break-all w-full">{qrUrl}</div>

                      <div className="flex w-full gap-2 pt-2">
                        <button
                          onClick={() => downloadQR(table.qr_shortcode, table.label)}
                          className="flex-1 bg-dark-800 hover:bg-dark-700 text-white py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                          Download QR
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('Delete this table?')) {
                              try {
                                await deleteTable(table.id);
                                loadTables();
                              } catch (e) {
                                alert('Failed to delete table.');
                              }
                            }
                          }}
                          className="bg-accent-rose/10 hover:bg-accent-rose/20 text-accent-rose px-3 py-2 rounded-lg transition-colors"
                        >
                          <LogOut size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4">Revenue (Last 7 Days)</h3>
                  <div className="h-64">
                    {analytics?.daily_revenue?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.daily_revenue}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="#6b7280" 
                            fontSize={12} 
                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })}
                          />
                          <YAxis 
                            stroke="#6b7280" 
                            fontSize={12} 
                            tickFormatter={(val) => `₹${val}`}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff', borderRadius: '0.75rem' }}
                            itemStyle={{ color: '#0ea5e9' }}
                            formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Revenue']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <Bar dataKey="revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        No revenue data available
                      </div>
                    )}
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
              </div>
            </motion.div>
          )}

          {/* STAFF TAB */}
          {activeTab === 'STAFF' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="glass-card rounded-2xl overflow-hidden border border-white/5 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Add Staff Member</h2>
                <form onSubmit={handleCreateStaff} className="flex flex-col md:flex-row gap-4">
                  <input
                    type="email"
                    placeholder="Staff Email (Username)"
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500/50"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500/50"
                    required
                  />
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as 'ADMIN' | 'KITCHEN')}
                    className="bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-500/50"
                  >
                    <option value="KITCHEN">KITCHEN</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl px-6 py-2 transition-all shadow-lg shadow-brand-500/20"
                  >
                    Add
                  </button>
                </form>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark-900/50 text-xs uppercase font-bold text-gray-400 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {staff.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-gray-300">{s.username}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${s.role === 'ADMIN' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-brand-500/20 text-brand-400'}`}>
                            {s.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {staff.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-gray-500">No staff accounts found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
          
          {/* FEEDBACK TAB */}
          {activeTab === 'FEEDBACK' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="text-brand-400" /> Customer Feedback
                </h2>
                <p className="text-sm text-gray-400 mt-1">Review ratings and comments left by customers.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark-900/50 text-xs uppercase font-bold text-gray-400 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Session ID</th>
                      <th className="px-6 py-4">Rating</th>
                      <th className="px-6 py-4">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {feedbackList.map((f) => (
                      <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-gray-400">{new Date(f.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono text-gray-400 text-xs">{f.session_id ? f.session_id.slice(0, 8) + '...' : '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 text-accent-amber">
                            {[1, 2, 3, 4, 5].map(star => (
                              <svg key={star} className={`w-4 h-4 ${star <= f.rating ? 'fill-current' : 'text-gray-600'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 max-w-sm truncate">{f.comment || '-'}</td>
                      </tr>
                    ))}
                    {feedbackList.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No feedback received yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <MenuItemModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        onDelete={editingItem ? () => handleDeleteItem(editingItem.id) : undefined}
        categories={categories}
        initialData={editingItem}
      />
    </div>
  );
}
