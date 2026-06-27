import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import { MenuItemData } from '../api/client';
import { CartItem } from '../store/cart';

interface ItemModifierModalProps {
  item: MenuItemData | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
  currency: string;
}

export default function ItemModifierModal({ item, isOpen, onClose, onAddToCart, currency }: ItemModifierModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedModifiers(new Set());
    }
  }, [isOpen]);

  if (!item) return null;

  const handleToggleModifier = (modName: string) => {
    const newSet = new Set(selectedModifiers);
    if (newSet.has(modName)) {
      newSet.delete(modName);
    } else {
      newSet.add(modName);
    }
    setSelectedModifiers(newSet);
  };

  const handleAdd = () => {
    const mods = (item.modifiers || []).filter(m => selectedModifiers.has(m.name));
    onAddToCart({
      cart_id: crypto.randomUUID(),
      item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      item,
      quantity,
      selected_modifiers: mods
    });
    onClose();
  };

  let totalItemPrice = item.price;
  selectedModifiers.forEach(mName => {
    const mod = item.modifiers?.find(m => m.name === mName);
    if (mod) totalItemPrice += mod.price;
  });

  const finalTotal = totalItemPrice * quantity;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-dark-900 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]"
          >
            {item.image_url ? (
              <div className="w-full h-48 relative">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent" />
              </div>
            ) : (
              <div className="w-full h-24 bg-gradient-to-br from-dark-800 to-dark-900" />
            )}

            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-dark-950/50 backdrop-blur text-white p-2 rounded-full hover:bg-dark-800 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-6 overflow-y-auto flex-1 pb-24">
              <h2 className="text-2xl font-black text-white">{item.name}</h2>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">{item.description}</p>
              <div className="mt-2 text-brand-400 font-bold">{currency}{item.price.toFixed(2)}</div>

              {item.modifiers && item.modifiers.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add-ons</h3>
                  <div className="space-y-2">
                    {item.modifiers.map((mod, idx) => (
                      <label key={idx} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl border border-white/5 cursor-pointer hover:border-brand-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedModifiers.has(mod.name) ? 'bg-brand-500 border-brand-500' : 'border-gray-500 bg-dark-900'}`}>
                            {selectedModifiers.has(mod.name) && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </div>
                          <span className="text-white text-sm font-medium">{mod.name}</span>
                        </div>
                        <span className="text-brand-400 text-sm font-bold">+{currency}{mod.price.toFixed(2)}</span>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selectedModifiers.has(mod.name)}
                          onChange={() => handleToggleModifier(mod.name)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-dark-900/90 backdrop-blur-md border-t border-white/5 flex gap-4">
              <div className="flex items-center bg-dark-800 rounded-xl p-1 text-white flex-shrink-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-dark-700 rounded-lg"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-dark-700 rounded-lg"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                onClick={handleAdd}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center justify-between px-4 transition-colors"
              >
                <span>Add to Cart</span>
                <span>{currency}{finalTotal.toFixed(2)}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
