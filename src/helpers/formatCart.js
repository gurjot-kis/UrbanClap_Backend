// helpers/formatCart.js

/**
 * Returns a clean, serialisable cart object safe to send to the client.
 * Strips Mongoose internals; keeps only what the frontend needs.
 */
export function formatCart(cart, { guestId = null } = {}) {
  const doc = cart.toObject ? cart.toObject() : cart;

  return {
    ...(guestId ? { guestId } : {}),
    totalItems: doc.totalItems,
    totalPrice: doc.totalPrice,
    items: doc.items.map((item) => ({
      item_id:   item._id,
      product_id: item.product_id,
      snapshot:  item.snapshot,
      variant:   item.variant,   // null or { label, price, image }
      unitPrice: item.unitPrice,
      quantity:  item.quantity,
      lineTotal: item.lineTotal,
    })),
  };
}