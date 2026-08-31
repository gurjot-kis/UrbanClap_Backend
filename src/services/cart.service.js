import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import NativeProduct from "../models/nativeProduct.model.js";
import resolveDisplayCategories from "../helpers/resolveDisplayCategory.helper.js";
import {
  computeCategoryCharges,
  roundToNearest,
} from "../helpers/cartTax.helper.js";

const GUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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
    cart.expiresAt = new Date(Date.now() + GUEST_TTL_MS);
  }

  return cart;
}

async function resolveRegularProduct(product_id, variant_key) {
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
    installationFee: 0,
  };
}

async function resolveNativeProduct(product_id, option_id) {
  const product = await NativeProduct.findById(product_id)
    .select(
      "product_name slug main_image base_price options status installation_fee",
    )
    .lean()
    .exec();

  if (!product) throw new Error("Product not found");
  if (product.status !== "active") throw new Error("Product is not available");

  const hasOptions = product.options.length > 0;

  // Normalize snapshot to the same shape used by regular products
  const snapshot = {
    name: product.product_name,
    slug: product.slug,
    mainImage: product.main_image,
  };

  const installationFee = product.installation_fee ?? 0;

  if (!hasOptions) {
    if (option_id) throw new Error("This product has no options");
    return {
      snapshot,
      variant: null,
      unitPrice: product.base_price,
      installationFee,
    };
  }

  if (!option_id) {
    throw new Error(
      `This product requires an option. Available: ${product.options
        .map((o) => `${o._id} (${o.label})`)
        .join(", ")}`,
    );
  }

  const matched = product.options.find(
    (o) => o._id.toString() === option_id.toString(),
  );

  if (!matched) {
    throw new Error(
      `Option "${option_id}" not found. Available: ${product.options
        .map((o) => o._id.toString())
        .join(", ")}`,
    );
  }

  return {
    snapshot,
    variant: {
      key: matched._id.toString(),
      label: matched.label,
      price: matched.price,
      image: matched.image ?? null,
    },
    unitPrice: matched.price,
    installationFee,
  };
}

async function resolveProductLine(product_id, variant_key, productType) {
  if (productType === "NativeProduct") {
    return resolveNativeProduct(product_id, variant_key);
  }
  return resolveRegularProduct(product_id, variant_key);
}

// ─── Public service methods ───────────────────────────────────────────────────
export const CartService = {
  addToCart: async (
    { user_id, guestId },
    { product_id, variant_key, quantity = 1, productType = "Service" },
  ) => {
    if (!product_id) throw new Error("product_id is required");

    const validTypes = ["Service", "NativeProduct"];
    if (!validTypes.includes(productType)) {
      throw new Error(`productType must be one of: ${validTypes.join(", ")}`);
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error("quantity must be a positive integer");
    }

    const { snapshot, variant, unitPrice, installationFee } =
      await resolveProductLine(product_id, variant_key, productType);

    const cart = await getOrCreateCart({ user_id, guestId });

    const variantKeyMatch = variant?.key ?? null;
    const existingLine = cart.items.find(
      (i) =>
        i.product_id.toString() === product_id.toString() &&
        i.productType === productType &&
        (i.variant?.key ?? null) === variantKeyMatch,
    );

    let affectedLine;

    if (existingLine) {
      existingLine.quantity += qty;
      affectedLine = existingLine;
    } else {
      cart.items.push({
        product_id,
        productType,
        snapshot,
        variant,
        unitPrice,
        installationFee,
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
        productType: affectedLine.productType,
        variant: affectedLine.variant,
        unitPrice: affectedLine.unitPrice,
        installationFee: affectedLine.installationFee,
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

    if (!cart || cart.items.length === 0) {
      return {
        guestId: guestId ?? undefined,
        totalItems: 0,
        itemsSubtotal: 0,
        grandTotal: 0,
        categoryGroups: [],
      };
    }

    const productIds = [
      ...new Set(cart.items.map((i) => i.product_id.toString())),
    ];

    const products = await Product.find({ _id: { $in: productIds } })
      .select("category_id sub_category_id")
      .lean()
      .exec();

    const productCategoryFields = products.map((p) => ({
      _id: p._id,
      category_id: p.category_id,
      sub_category_id: p.sub_category_id,
    }));

    const categoryResolution = await resolveDisplayCategories(
      productCategoryFields,
    );

    const groupsMap = new Map();

    for (const item of cart.items) {
      const productKey = item.product_id.toString();
      const resolvedCategory = categoryResolution.get(productKey) || {
        _id: null,
        name: "Uncategorized",
      };
      const categoryKey = resolvedCategory._id
        ? String(resolvedCategory._id)
        : "uncategorized";

      if (!groupsMap.has(categoryKey)) {
        groupsMap.set(categoryKey, {
          category_id: resolvedCategory._id,
          category_name: resolvedCategory.name,
          items: [],
        });
      }

      groupsMap.get(categoryKey).items.push({
        item_id: item._id,
        product_id: item.product_id,
        snapshot: item.snapshot,
        variant: item.variant,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      });
    }

    let itemsSubtotal = 0;
    let grandTotal = 0;

    const categoryGroups = [...groupsMap.values()].map((group) => {
      const subtotal = group.items.reduce((sum, i) => sum + i.lineTotal, 0);
      const { charges, categoryTotal } = computeCategoryCharges(subtotal);

      itemsSubtotal += subtotal;
      grandTotal += categoryTotal;

      return {
        category_id: group.category_id,
        category_name: group.category_name,
        items: group.items,
        subtotal: roundToNearest(subtotal),
        charges,
        categoryTotal,
      };
    });

    return {
      guestId: guestId ?? undefined,
      totalItems: cart.totalItems,
      itemsSubtotal: roundToNearest(itemsSubtotal),
      grandTotal: roundToNearest(grandTotal),
      categoryGroups,
    };
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
