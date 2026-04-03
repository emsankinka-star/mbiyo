import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      supplierId: null,
      supplierName: '',

      addItem(product, quantity, variants = [], extras = []) {
        const { items, supplierId } = get();
        // Respect min_quantity for initial add
        const minQty = parseFloat(product.min_quantity) || 1;
        const step = parseFloat(product.step) || 1;
        const qty = quantity != null ? quantity : minQty;

        const cartItem = {
          ...product,
          quantity: qty,
          unit: product.unit || 'piece',
          min_quantity: minQty,
          step,
          selectedVariants: variants,
          selectedExtras: extras,
        };

        // Si panier d'un autre fournisseur, vider
        if (supplierId && supplierId !== product.supplier_id) {
          set({
            items: [cartItem],
            supplierId: product.supplier_id,
            supplierName: product.supplier_name || '',
          });
          return;
        }

        // Vérifier si le produit est déjà dans le panier
        const existingIndex = items.findIndex((i) => i.id === product.id);
        if (existingIndex >= 0) {
          const updated = [...items];
          updated[existingIndex].quantity = parseFloat((updated[existingIndex].quantity + step).toFixed(3));
          set({ items: updated });
        } else {
          set({
            items: [...items, cartItem],
            supplierId: product.supplier_id,
            supplierName: product.supplier_name || '',
          });
        }
      },

      incrementItem(productId) {
        const items = get().items.map((item) => {
          if (item.id !== productId) return item;
          const step = parseFloat(item.step) || 1;
          return { ...item, quantity: parseFloat((item.quantity + step).toFixed(3)) };
        });
        set({ items });
      },

      decrementItem(productId) {
        const item = get().items.find((i) => i.id === productId);
        if (!item) return;
        const step = parseFloat(item.step) || 1;
        const minQty = parseFloat(item.min_quantity) || step;
        const newQty = parseFloat((item.quantity - step).toFixed(3));
        if (newQty < minQty) {
          get().removeItem(productId);
        } else {
          const items = get().items.map((i) =>
            i.id === productId ? { ...i, quantity: newQty } : i
          );
          set({ items });
        }
      },

      updateQuantity(productId, quantity) {
        const item = get().items.find((i) => i.id === productId);
        if (!item) return;
        const minQty = parseFloat(item.min_quantity) || 1;
        if (quantity < minQty) {
          get().removeItem(productId);
          return;
        }
        const items = get().items.map((i) =>
          i.id === productId ? { ...i, quantity: parseFloat(quantity.toFixed(3)) } : i
        );
        set({ items });
      },

      removeItem(productId) {
        const items = get().items.filter((i) => i.id !== productId);
        if (items.length === 0) {
          set({ items: [], supplierId: null, supplierName: '' });
        } else {
          set({ items });
        }
      },

      clearCart() {
        set({ items: [], supplierId: null, supplierName: '' });
      },

      get totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      get subtotal() {
        return get().items.reduce((sum, item) => {
          const price = parseFloat(item.promo_price || item.price) || 0;
          return sum + parseFloat((price * item.quantity).toFixed(2));
        }, 0);
      },
    }),
    {
      name: 'mbiyo-cart',
    }
  )
);
