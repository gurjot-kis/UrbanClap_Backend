// services/cart.service.js
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { formatCart } from "../helpers/formatCart.js";

const GUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Internal: find or create the cart document for this identity ─────────────
async function getOrCreateCart({ user_id, guestId }) {
  const filter = user_id ? { user_id } : { guestId };

  let cart = await Cart.findOne(filter).exec();

  if (!cart) {
    cart = new Cart(
      user_id
        ? { user_id }
        : { guestId, expiresAt: new Date(Date.now() + GUEST_TTL_MS) },
    );
  } else if (!user_id) {
    // Refresh TTL on every activity for guest carts
    cart.expiresAt = new Date(Date.now() + GUEST_TTL_MS);
  }

  return cart;
}

// ─── Internal: resolve + validate the product and chosen variant ──────────────
async function resolveProductLine(product_id, variant_label) {
  const product = await Product.findById(product_id)
    .select("name slug mainImage basePrice variants status")
    .lean()
    .exec();

  if (!product) throw new Error("Product not found");
  if (product.status !== "active") throw new Error("Product is not available");

  const hasVariants = product.variants.length > 0;

  // ── No variants on product ────────────────────────────────────────────────
  if (!hasVariants) {
    if (variant_label) {
      throw new Error("This product has no variants");
    }
    return {
      snapshot: {
        name:      product.name,
        slug:      product.slug,
        mainImage: product.mainImage,
      },
      variant:   null,
      unitPrice: product.basePrice,
    };
  }

  // ── Product has variants → label is required ──────────────────────────────
  if (!variant_label) {
    throw new Error(
      `This product requires a variant. Available: ${product.variants
        .map((v) => v.label)
        .join(", ")}`,
    );
  }

  const matched = product.variants.find(
    (v) => v.label.toLowerCase() === variant_label.toLowerCase(),
  );

  if (!matched) {
    throw new Error(
      `Variant "${variant_label}" not found. Available: ${product.variants
        .map((v) => v.label)
        .join(", ")}`,
    );
  }

  return {
    snapshot: {
      name:      product.name,
      slug:      product.slug,
      mainImage: product.mainImage,
    },
    variant: {
      label: matched.label,
      price: matched.price,
      image: matched.image ?? null,
    },
    unitPrice: matched.price,
  };
}

// ─── Public service methods ───────────────────────────────────────────────────
export const CartService = {
  /**
   * Add a product (with or without a variant) to the cart.
   *
   * @param {Object} identity  - { user_id } or { guestId }
   * @param {Object} payload   - { product_id, variant_label?, quantity? }
   * @returns formatted cart
   */
  addToCart: async ({ user_id, guestId }, { product_id, variant_label, quantity = 1 }) => {
    if (!product_id) throw new Error("product_id is required");

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error("quantity must be a positive integer");
    }

    // 1. Resolve product data & validate variant choice
    const { snapshot, variant, unitPrice } = await resolveProductLine(
      product_id,
      variant_label,
    );

    // 2. Get or create the cart
    const cart = await getOrCreateCart({ user_id, guestId });

    // 3. Find existing line — match by product + variant label (null-safe)
    const variantKey = variant?.label ?? null;
    const existingLine = cart.items.find(
      (i) =>
        i.product_id.toString() === product_id.toString() &&
        (i.variant?.label ?? null) === variantKey,
    );

    if (existingLine) {
      // Increment quantity on existing line
      existingLine.quantity += qty;
    } else {
      // Push a brand-new line
      cart.items.push({ product_id, snapshot, variant, unitPrice, quantity: qty, lineTotal: 0 });
    }

    // 4. Recompute totals and persist
    cart.recalculate();
    await cart.save();

    return formatCart(cart, { guestId: guestId ?? undefined });
  },
};