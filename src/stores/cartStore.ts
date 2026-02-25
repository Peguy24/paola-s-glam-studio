import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;

  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  setLoading: (loading: boolean) => void;
  createCheckout: () => Promise<void>;
}

const getItemKey = (productId: string, variantId?: string) => `${productId}-${variantId || 'default'}`;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: (item) => {
        const { items } = get();
        const key = getItemKey(item.productId, item.variantId);
        const existingItem = items.find(i => getItemKey(i.productId, i.variantId) === key);

        if (existingItem) {
          set({
            items: items.map(i =>
              getItemKey(i.productId, i.variantId) === key
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          });
        } else {
          set({ items: [...items, item] });
        }
      },

      updateQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        const key = getItemKey(productId, variantId);
        set({
          items: get().items.map(item =>
            getItemKey(item.productId, item.variantId) === key ? { ...item, quantity } : item
          )
        });
      },

      removeItem: (productId, variantId) => {
        const key = getItemKey(productId, variantId);
        set({
          items: get().items.filter(item => getItemKey(item.productId, item.variantId) !== key)
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      setLoading: (isLoading) => set({ isLoading }),

      createCheckout: async () => {
        const { items, setLoading, clearCart } = get();
        if (items.length === 0) return;

        setLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke('create-product-payment', {
            body: {
              items: items.map(item => ({
                product_id: item.productId,
                variant_id: item.variantId || null,
                quantity: item.quantity,
              })),
            },
          });

          if (error) throw error;
          if (data?.url) {
            window.location.href = data.url;
          }
        } catch (error) {
          console.error('Failed to create checkout:', error);
        } finally {
          setLoading(false);
        }
      }
    }),
    {
      name: 'product-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
