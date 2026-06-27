import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CategoryData, MenuItemData } from '../api/client';

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  categories: CategoryData[];
  initialData?: MenuItemData | null;
  defaultCategoryId?: string;
}

export default function MenuItemModal({ isOpen, onClose, onSave, onDelete, categories, initialData, defaultCategoryId }: MenuItemModalProps) {
  const isEditing = !!initialData;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [modifiers, setModifiers] = useState<{name: string, price: number}[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description || '');
        setPrice(initialData.price.toString());
        setImageUrl(initialData.image_url || '');
        setIsAvailable(initialData.is_available);
        setModifiers(initialData.modifiers || []);
        
        // Find category id for this item
        const cat = categories.find(c => c.items.some(i => i.id === initialData.id));
        setCategoryId(cat ? cat.id : (categories[0]?.id || ''));
      } else {
        setName('');
        setDescription('');
        setPrice('');
        setImageUrl('');
        setIsAvailable(true);
        setModifiers([]);
        setCategoryId(defaultCategoryId || (categories.length > 0 ? categories[0].id : ''));
      }
      setError('');
    }
  }, [isOpen, initialData, categories, defaultCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || (!isEditing && !categoryId)) {
      setError('Name, Price, and Category are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSave({
        name,
        description: description || undefined,
        base_price: parseFloat(price),
        category_id: categoryId,
        image_url: imageUrl || null,
        is_available: isAvailable,
        modifiers: modifiers
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl border border-white/10"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-6">
              {isEditing ? 'Edit Menu Item' : 'Add New Item'}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-dark-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                  placeholder="e.g. Avocado Toast"
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-dark-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                    placeholder="250.00"
                  />
                </div>

                <div className="space-y-1 flex-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-dark-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                    disabled={isEditing}
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-dark-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500/50 transition-colors resize-none h-20"
                  placeholder="A delicious..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Image URL (Optional)</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-dark-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500/50 transition-colors"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Modifiers / Add-ons</label>
                <div className="space-y-2">
                  {modifiers.map((mod, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={mod.name}
                        onChange={(e) => {
                          const newMods = [...modifiers];
                          newMods[idx].name = e.target.value;
                          setModifiers(newMods);
                        }}
                        className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500/50 text-sm"
                        placeholder="Modifier Name"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={mod.price}
                        onChange={(e) => {
                          const newMods = [...modifiers];
                          newMods[idx].price = parseFloat(e.target.value) || 0;
                          setModifiers(newMods);
                        }}
                        className="w-24 bg-dark-900 border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500/50 text-sm"
                        placeholder="Price"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newMods = [...modifiers];
                          newMods.splice(idx, 1);
                          setModifiers(newMods);
                        }}
                        className="p-2 text-gray-500 hover:text-accent-rose transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setModifiers([...modifiers, { name: '', price: 0 }])}
                    className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    + Add Modifier
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="is_available" 
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 bg-dark-900"
                  />
                  <label htmlFor="is_available" className="text-sm font-medium text-white">Item is available for ordering</label>
                </div>
              )}

              <div className="pt-4 flex justify-between gap-3 border-t border-white/5 mt-4">
                <div>
                  {isEditing && onDelete && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-5 py-2.5 text-sm font-bold text-accent-rose hover:bg-accent-rose/10 rounded-xl transition-colors border border-accent-rose/20 disabled:opacity-50"
                    >
                      Delete Item
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-bold text-gray-300 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Item'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
