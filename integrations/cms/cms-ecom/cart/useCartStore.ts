import { create } from 'zustand';
import { currentCart } from '@wix/ecom';
import { redirects } from '@wix/redirects';

/** CMS App ID for catalog references */
const CMS_APP_ID = 'e593b0bd-b783-45b8-97c2-873d42aacaf4';

/** Debounce delay for quantity updates (ms) */
const QUANTITY_DEBOUNCE_MS = 500;

/** Cart item representing a product in the cart */
export interface CartItem {
  /** Server-generated line item ID */
  id: string;
  /** CMS collection ID */
  collectionId: string;
  /** CMS item ID (product ID) */
  itemId: string;
  /** Product name for display */
  name: string;
  /** Item price */
  price: number;
  /** Quantity in cart */
  quantity: number;
  /** Product image URL */
  image?: string;
}

/** Input for adding items to cart */
export interface AddToCartInput {
  collectionId: string;
  itemId: string;
  quantity?: number;
}

interface CartState {
  // State
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  addingItemId: string | null;
  isCheckingOut: boolean;
  error: string | null;

  // Internal
  _quantityTimers: Map<string, NodeJS.Timeout>;
  _initialized: boolean;
}

interface CartActions {
  // Public actions
  addToCart: (input: AddToCartInput) => Promise<void>;
  removeFromCart: (item: CartItem) => void;
  updateQuantity: (item: CartItem, quantity: number) => void;
  clearCart: () => void;
  checkout: () => Promise<void>;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Internal
  _fetchCart: () => Promise<void>;
  _sendQuantityUpdate: (lineItemId: string, quantity: number) => Promise<void>;
}

type CartStore = CartState & { actions: CartActions };

/** Check if error is a Wix "not found" error */
const isCartNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as { details?: { applicationError?: { code?: string } }; message?: string };
  return err.details?.applicationError?.code === 'CART_NOT_FOUND' || err.details?.applicationError?.code === 'OWNED_CART_NOT_FOUND' ||
         err.message?.includes('not found') || false;
};

/** Convert Wix cart line item to our CartItem format */
const mapLineItemToCartItem = (lineItem: currentCart.LineItem): CartItem | null => {
  if (!lineItem._id || !lineItem.catalogReference) return null;

  const { catalogReference, quantity, productName, price, image } = lineItem;
  const collectionId = (catalogReference.options as { collectionId?: string } | null)?.collectionId || '';
  const itemId = catalogReference.catalogItemId || '';

  return {
    id: lineItem._id,
    collectionId,
    itemId,
    name: productName?.translated || productName?.original || 'Unknown Item',
    price: parseFloat(price?.amount || '0') || 0,
    quantity: quantity || 1,
    image,
  };
};

/** Convert Wix cart to our items format */
const mapCartToItems = (cart: currentCart.Cart | null | undefined): CartItem[] => {
  if (!cart?.lineItems) return [];
  return cart.lineItems
    .map(mapLineItemToCartItem)
    .filter((item): item is CartItem => item !== null);
};

/**
 * Zustand store for cart state and actions.
 * No provider needed - just import and use anywhere.
 */
export const useCartStore = create<CartStore>((set, get) => ({
  // Initial state
  items: [],
  isOpen: false,
  isLoading: false,
  addingItemId: null,
  isCheckingOut: false,
  error: null,
  _quantityTimers: new Map(),
  _initialized: false,

  actions: {
    /** Fetch cart from server */
    _fetchCart: async () => {
      // Only fetch once on first use
      if (get()._initialized) return;

      set({ isLoading: true, error: null });
      try {
        const cart = await currentCart.getCurrentCart();
        set({
          items: mapCartToItems(cart),
          isLoading: false,
          _initialized: true,
        });
      } catch (error: unknown) {
        if (isCartNotFoundError(error)) {
          // No cart yet - that's fine
          set({ items: [], isLoading: false, _initialized: true });
        } else {
          console.warn('Failed to fetch cart:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch cart',
            _initialized: true,
          });
        }
      }
    },

    /** Add item to cart - waits for server */
    addToCart: async (input: AddToCartInput) => {
      set({ addingItemId: input.itemId, error: null });

      try {
        const result = await currentCart.addToCurrentCart({
          lineItems: [{
            catalogReference: {
              catalogItemId: input.itemId,
              appId: CMS_APP_ID,
              options: { collectionId: input.collectionId },
            },
            quantity: input.quantity || 1,
          }],
        });

        if (result?.cart) {
          set({ items: mapCartToItems(result.cart) });
        }
      } catch (error: unknown) {
        console.error('Add to cart failed:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to add to cart' });
        // Try to refetch to stay in sync
        get().actions._fetchCart();
      } finally {
        set({ addingItemId: null });
      }
    },

    /** Remove item from cart - optimistic */
    removeFromCart: (item: CartItem) => {
      const { items, _quantityTimers } = get();

      // Clear any pending quantity update for this item
      const timer = _quantityTimers.get(item.id);
      if (timer) {
        clearTimeout(timer);
        _quantityTimers.delete(item.id);
      }

      // Optimistic update
      set({ items: items.filter(i => i.id !== item.id) });

      // Server call (fire and forget, rollback on error)
      currentCart.removeLineItemsFromCurrentCart([item.id]).catch((error) => {
        console.error('Remove from cart failed:', error);
        // Rollback - add item back
        set((state) => ({ items: [...state.items, item] }));
      });
    },

    /** Internal: send quantity update to server */
    _sendQuantityUpdate: async (lineItemId: string, quantity: number) => {
      try {
        if (quantity <= 0) {
          await currentCart.removeLineItemsFromCurrentCart([lineItemId]);
        } else {
          await currentCart.updateCurrentCartLineItemQuantity([{ _id: lineItemId, quantity }]);
        }
      } catch (error) {
        console.error('Update quantity failed:', error);
        // Refetch to sync with server
        set({ _initialized: false });
        get().actions._fetchCart();
      }
    },

    /** Update quantity - optimistic + debounced server call */
    updateQuantity: (item: CartItem, quantity: number) => {
      const { items, _quantityTimers, actions } = get();

      // Optimistic update
      if (quantity <= 0) {
        set({ items: items.filter(i => i.id !== item.id) });
      } else {
        set({
          items: items.map(i => i.id === item.id ? { ...i, quantity } : i),
        });
      }

      // Debounce server call
      const existingTimer = _quantityTimers.get(item.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        _quantityTimers.delete(item.id);
        actions._sendQuantityUpdate(item.id, quantity);
      }, QUANTITY_DEBOUNCE_MS);

      _quantityTimers.set(item.id, timer);
    },

    /** Clear all items from cart - optimistic */
    clearCart: () => {
      const { items, _quantityTimers } = get();
      const previousItems = [...items];

      // Clear all pending quantity updates
      _quantityTimers.forEach(timer => clearTimeout(timer));
      _quantityTimers.clear();

      // Optimistic update
      set({ items: [] });

      // Server call
      currentCart.deleteCurrentCart().catch((error) => {
        console.error('Clear cart failed:', error);
        // Rollback
        set({ items: previousItems });
      });
    },

    /** Checkout - redirect to Wix checkout */
    checkout: async () => {
      set({ isCheckingOut: true, error: null });

      try {
        const checkoutResult = await currentCart.createCheckoutFromCurrentCart({
          channelType: currentCart.ChannelType.WEB,
        });

        if (!checkoutResult.checkoutId) {
          throw new Error('Failed to create checkout');
        }

        const { redirectSession } = await redirects.createRedirectSession({
          ecomCheckout: { checkoutId: checkoutResult.checkoutId },
          callbacks: {
            postFlowUrl: typeof window !== 'undefined' ? window.location.href : '',
          },
        });

        if (!redirectSession?.fullUrl) {
          throw new Error('Failed to get checkout URL');
        }

        // Redirect
        if (typeof window !== 'undefined') {
          window.location.href = redirectSession.fullUrl;
        }
      } catch (error: unknown) {
        console.error('Checkout failed:', error);
        set({
          error: error instanceof Error ? error.message : 'Checkout failed',
          isCheckingOut: false,
        });
      }
      // Note: don't set isCheckingOut false on success - we're redirecting
    },

    /** Toggle cart drawer */
    toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

    /** Open cart drawer */
    openCart: () => set({ isOpen: true }),

    /** Close cart drawer */
    closeCart: () => set({ isOpen: false }),
  },
}));

/**
 * Hook to access cart state and actions.
 * No provider needed - works anywhere in the app.
 *
 * For currency formatting, use the separate `useCurrency()` hook.
 *
 * @example
 * ```tsx
 * import { useCurrency, formatPrice, DEFAULT_CURRENCY } from '@/integrations';
 *
 * const { items, addingItemId, actions } = useCart();
 * const { currency } = useCurrency();
 *
 * // Format price with site currency
 * <span>{formatPrice(item.price, currency ?? DEFAULT_CURRENCY)}</span>
 *
 * // Add item (shows loading only on this button)
 * <Button
 *   disabled={addingItemId === item._id}
 *   onClick={() => actions.addToCart({ collectionId: 'x', itemId: item._id })}
 * >
 *   {addingItemId === item._id ? 'Adding...' : 'Add to Cart'}
 * </Button>
 * ```
 */
export const useCart = () => {
  const store = useCartStore();

  // Auto-fetch cart on first use
  if (!store._initialized && !store.isLoading) {
    store.actions._fetchCart();
  }

  // Computed values
  const itemCount = store.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = store.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    // State
    items: store.items,
    itemCount,
    totalPrice,
    isOpen: store.isOpen,
    isLoading: store.isLoading,
    addingItemId: store.addingItemId,
    isCheckingOut: store.isCheckingOut,
    error: store.error,
    // Actions
    actions: store.actions,
  };
};
