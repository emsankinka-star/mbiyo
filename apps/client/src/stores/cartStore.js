import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      supplierId: null,
      supplierName: '',

      addItem(product, quantity = 1, variants = [], extras = []) {
        const { items, supplierId } = get();

        // Si panier d'un autre fournisseur, vider
        if (supplierId && supplierId !== product.supplier_id) {
          set({
            items: [{
              ...product,
              quantity,
              selectedVariants: variants,
              selectedExtras: extras,
            }],
            supplierId: product.supplier_id,
            supplierName: product.supplier_name || '',
          });
          return;
        }

        // Vérifier si le produit est déjà dans le panier
        const existingIndex = items.findIndex((i) => i.id === product.id);
        if (existingIndex >= 0) {
          const updated = [...items];
          updated[existingIndex].quantity += quantity;
          set({ items: updated });
        } else {
          set({
            items: [...items, {
              ...product,
              quantity,
              selectedVariants: variants,
              selectedExtras: extras,
            }],
            supplierId: product.supplier_id,
            supplierName: product.supplier_name || '',
          });
        }
      },

      updateQuantity(productId, quantity) {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const items = get().items.map((item) =>
          item.id === productId ? { ...item, quantity } : item
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
          const price = item.promo_price || item.price;
          return sum + (parseFloat(price) * item.quantity);
        }, 0);
      },
    }),
    {
      name: 'mbiyo-cart',
    }
  )
);
