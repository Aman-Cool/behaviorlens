import { checkout } from '@wix/ecom';
import { redirects } from '@wix/redirects';

/** CMS App ID for catalog references */
const CMS_APP_ID = 'e593b0bd-b783-45b8-97c2-873d42aacaf4';

/**
 * Buy now - skips the cart and goes directly to checkout.
 * Creates a checkout with the specified items and redirects to payment.
 *
 * NOTE: Always show a loading state - this redirects and takes time!
 *
 * @param items - Array of items with collectionId, itemId, and optional quantity
 *
 * @example
 * ```tsx
 * const [isLoading, setIsLoading] = useState(false);
 *
 * const handleBuyNow = async () => {
 *   setIsLoading(true);
 *   await buyNow([{
 *     collectionId: 'products',
 *     itemId: 'product-123',
 *     quantity: 1
 *   }]);
 *   // Note: Page will redirect, loading state won't reset
 * };
 * ```
 */
export async function buyNow(
  items: Array<{ collectionId: string; itemId: string; quantity?: number }>
): Promise<void> {
  if (items.length === 0) {
    throw new Error('At least one item is required for checkout');
  }

  const lineItems = items.map((item) => ({
    catalogReference: {
      catalogItemId: item.itemId,
      appId: CMS_APP_ID,
      options: { collectionId: item.collectionId },
    },
    quantity: item.quantity ?? 1,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkoutResult = await (checkout.createCheckout as any)({
    lineItems,
    channelType: checkout.ChannelType.WEB,
  });

  if (!checkoutResult._id) {
    throw new Error('Failed to create checkout: missing checkout ID');
  }

  const { redirectSession } = await redirects.createRedirectSession({
    ecomCheckout: { checkoutId: checkoutResult._id },
    callbacks: {
      postFlowUrl: typeof window !== 'undefined' ? window.location.href : '',
    },
  });

  if (!redirectSession?.fullUrl) {
    throw new Error('Failed to create redirect session: missing redirect URL');
  }

  if (typeof window !== 'undefined') {
    window.location.href = redirectSession.fullUrl;
  }
}
