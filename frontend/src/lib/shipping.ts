// Mirrors create_checkout in backend/app/services/orders.py; keep the two in sync.
export const FREE_SHIPPING_THRESHOLD = 499;
export const SHIPPING_FEE = 49;

export const shippingFor = (subtotal: number) => (subtotal <= 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE);

export const amountToFreeShipping = (subtotal: number) => Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

export const freeShippingLabel = `Free shipping on orders above ₹${FREE_SHIPPING_THRESHOLD}`;
