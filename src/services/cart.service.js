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

async function resolveProductLine(product_id, variant_key) {
  console.log("resolveProductLine received:", {
    product_id,
    variant_key,
    type: typeof variant_key,
  });

  const product = await Product.findById(product_id)
    .select("name slug mainImage basePrice variants status")
    .lean()
    .exec();

  if (!product) throw new Error("Product not found");
  if (product.status !== "active") throw new Error("Product is not available");

  const hasVariants = product.variants.length > 0;

  if (!hasVariants) {
    if (variant_key) throw new Error("This product has no variants");
    return {
      snapshot: {
        name: product.name,
        slug: product.slug,
        mainImage: product.mainImage,
      },
      variant: null,
      unitPrice: product.basePrice,
    };
  }

  if (!variant_key) {
    throw new Error(
      `This product requires a variant. Available: ${product.variants
        .map((v) => `${v.key} (${v.label})`)
        .join(", ")}`,
    );
  }

  const matched = product.variants.find((v) => v.key === variant_key);

  if (!matched) {
    throw new Error(
      `Variant "${variant_key}" not found. Available: ${product.variants
        .map((v) => v.key)
        .join(", ")}`,
    );
  }

  return {
    snapshot: {
      name: product.name,
      slug: product.slug,
      mainImage: product.mainImage,
    },
    variant: {
      key: matched.key,
      label: matched.label,
      price: matched.price,
      image: matched.image ?? null,
    },
    unitPrice: matched.price,
  };
}

// ─── Public service methods ───────────────────────────────────────────────────
export const CartService = {
  addToCart: async (
    { user_id, guestId },
    { product_id, variant_key, quantity = 1 },
  ) => {
    if (!product_id) throw new Error("product_id is required");

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error("quantity must be a positive integer");
    }

    const { snapshot, variant, unitPrice } = await resolveProductLine(
      product_id,
      variant_key,
    );

    const cart = await getOrCreateCart({ user_id, guestId });

    const variantKeyMatch = variant?.key ?? null;
    const existingLine = cart.items.find(
      (i) =>
        i.product_id.toString() === product_id.toString() &&
        (i.variant?.key ?? null) === variantKeyMatch,
    );

    let affectedLine;

    if (existingLine) {
      existingLine.quantity += qty;
      affectedLine = existingLine;
    } else {
      cart.items.push({
        product_id,
        snapshot,
        variant,
        unitPrice,
        quantity: qty,
        lineTotal: 0,
      });
      affectedLine = cart.items[cart.items.length - 1];
    }

    cart.recalculate();
    await cart.save();

    return {
      addedItem: {
        item_id: affectedLine._id,
        product_id: affectedLine.product_id,
        variant: affectedLine.variant,
        unitPrice: affectedLine.unitPrice,
        quantity: affectedLine.quantity,
        lineTotal: affectedLine.lineTotal,
      },
      cartSummary: {
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      },
    };
  },

  getCart: async ({ user_id, guestId }) => {
    const filter = user_id ? { user_id } : { guestId };

    if (!user_id && !guestId) {
      throw new Error("No cart identity found");
    }

    const cart = await Cart.findOne(filter).exec();

    if (!cart) {
      // No cart yet — return an empty cart shape instead of 404,
      // since "no cart" is a normal state, not an error.
      return {
        guestId: guestId ?? undefined,
        totalItems: 0,
        totalPrice: 0,
        items: [],
      };
    }

    return formatCart(cart, { guestId: guestId ?? undefined });
  },

  removeItem: async ({ user_id, guestId }, { item_id }) => {
    if (!item_id) throw new Error("item_id is required");

    const filter = user_id ? { user_id } : { guestId };
    if (!user_id && !guestId) throw new Error("No cart identity found");

    const cart = await Cart.findOne(filter).exec();
    if (!cart) throw new Error("Cart not found");

    const line = cart.items.id(item_id);
    if (!line) throw new Error("Cart item not found");

    cart.items.pull({ _id: item_id });
    cart.recalculate();
    await cart.save();

    return {
      removedItemId: item_id,
      itemRemoved: true,
      cartSummary: {
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      },
    };
  },

  decrementItem: async ({ user_id, guestId }, { item_id, quantity = 1 }) => {
    if (!item_id) throw new Error("item_id is required");

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error("quantity must be a positive integer");
    }

    const filter = user_id ? { user_id } : { guestId };
    if (!user_id && !guestId) throw new Error("No cart identity found");

    const cart = await Cart.findOne(filter).exec();
    if (!cart) throw new Error("Cart not found");

    const line = cart.items.id(item_id);
    if (!line) throw new Error("Cart item not found");

    let itemRemoved = false;

    if (line.quantity - qty <= 0) {
      cart.items.pull({ _id: item_id });
      itemRemoved = true;
    } else {
      line.quantity -= qty;
    }

    cart.recalculate();
    await cart.save();

    return {
      itemId: item_id,
      itemRemoved,
      quantity: itemRemoved ? 0 : line.quantity,
      lineTotal: itemRemoved ? 0 : line.lineTotal,
      cartSummary: {
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      },
    };
  },

  mergeGuestCartIntoUser: async ({ user_id, guestId }) => {
    if (!guestId) return;

    const guestCart = await Cart.findOne({ guestId }).exec();
    if (!guestCart || guestCart.items.length === 0) {
      if (guestCart) await guestCart.deleteOne();
      return;
    }

    let userCart = await Cart.findOne({ user_id }).exec();
    if (!userCart) {
      userCart = new Cart({ user_id });
    }

    for (const guestItem of guestCart.items) {
      const variantKeyMatch = guestItem.variant?.key ?? null;

      const existingLine = userCart.items.find(
        (i) =>
          i.product_id.toString() === guestItem.product_id.toString() &&
          (i.variant?.key ?? null) === variantKeyMatch,
      );

      if (existingLine) {
        existingLine.quantity += guestItem.quantity;
      } else {
        userCart.items.push({
          product_id: guestItem.product_id,
          snapshot: guestItem.snapshot,
          variant: guestItem.variant,
          unitPrice: guestItem.unitPrice,
          quantity: guestItem.quantity,
          lineTotal: 0,
        });
      }
    }

    userCart.recalculate();
    await userCart.save();

    await guestCart.deleteOne();
  },
};
