import { create } from 'zustand';
import { currentCart } from '@wix/ecom';

/**
 * Default currency code to use when the site currency is not available.
 */
export const DEFAULT_CURRENCY = 'USD';

/**
 * Formats a numeric amount as a currency string.
 * Uses the browser's locale for proper formatting (symbol placement, decimals).
 *
 * @param amount - The numeric price value
 * @param currencyCode - ISO 4217 currency code (e.g., "USD", "EUR", "ILS")
 * @returns Formatted currency string (e.g., "$99.99", "€99,99", "₪99.99")
 *
 * @example
 * ```typescript
 * import { useCurrency, formatPrice, DEFAULT_CURRENCY } from '@/integrations';
 *
 * const { currency } = useCurrency();
 * formatPrice(99.99, currency ?? DEFAULT_CURRENCY) // "$99.99" (or site currency)
 * formatPrice(99.99, 'EUR') // "€99.99" or "99,99 €" depending on locale
 * formatPrice(99.99, 'ILS') // "₪99.99"
 * ```
 */
export function formatPrice(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch {
    // Fallback for invalid currency codes
    console.warn(`Invalid currency code: ${currencyCode}, falling back to ${DEFAULT_CURRENCY}`);
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
    }).format(amount);
  }
}

interface CurrencyState {
  currency: string | null;
  isLoading: boolean;
  error: string | null;
  _initialized: boolean;
}

interface CurrencyActions {
  _fetchCurrency: () => Promise<void>;
}

type CurrencyStore = CurrencyState & { actions: CurrencyActions };

/**
 * Zustand store for site currency state.
 * Fetches currency from the cart API (which reflects Business Manager config).
 */
const useCurrencyStore = create<CurrencyStore>((set, get) => ({
  currency: null,
  isLoading: false,
  error: null,
  _initialized: false,

  actions: {
    _fetchCurrency: async () => {
      if (get()._initialized) return;

      set({ isLoading: true, error: null });
      try {
        const cart = await currentCart.getCurrentCart();
        set({
          currency: cart.currency || null,
          isLoading: false,
          _initialized: true,
        });
      } catch (error: unknown) {
        // Cart not found is fine - we just don't have currency yet
        const isNotFound =
          error &&
          typeof error === 'object' &&
          ((error as { details?: { applicationError?: { code?: string } } }).details?.applicationError
            ?.code === 'CART_NOT_FOUND' ||
            (error as { details?: { applicationError?: { code?: string } } }).details?.applicationError
              ?.code === 'OWNED_CART_NOT_FOUND');

        if (isNotFound) {
          set({ currency: null, isLoading: false, _initialized: true });
        } else {
          console.warn('Failed to fetch currency:', error);
          set({
            currency: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch currency',
            _initialized: true,
          });
        }
      }
    },
  },
}));

/**
 * Hook to access site currency for price formatting.
 * No provider needed - works anywhere in the app.
 *
 * Currency is fetched from the ecommerce API and represents the site's
 * configured currency from Business Manager.
 *
 * @example
 * ```tsx
 * import { useCurrency, formatPrice, DEFAULT_CURRENCY } from '@/integrations';
 *
 * const { currency } = useCurrency();
 *
 * // Format price with site currency
 * <span>{formatPrice(item.price, currency ?? DEFAULT_CURRENCY)}</span>
 * ```
 */
export const useCurrency = () => {
  const store = useCurrencyStore();

  // Auto-fetch currency on first use
  if (!store._initialized && !store.isLoading) {
    store.actions._fetchCurrency();
  }

  return {
    /** Site currency code (e.g., "USD", "EUR"), null while loading */
    currency: store.currency,
    /** True while fetching currency */
    isLoading: store.isLoading,
    /** Error message if fetch failed */
    error: store.error,
  };
};
