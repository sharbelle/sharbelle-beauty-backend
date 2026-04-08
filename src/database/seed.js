import bcrypt from "bcryptjs";
import slugify from "../utils/slugify.js";
import { AssetModel } from "../models/asset.model.js";
import { CategoryModel } from "../models/category.model.js";
import { CouponModel } from "../models/coupon.model.js";
import { OrderModel } from "../models/order.model.js";
import { ProductModel } from "../models/product.model.js";
import { StoreSettingsModel } from "../models/store-settings.model.js";
import { TagModel } from "../models/tag.model.js";
import { UserModel } from "../models/user.model.js";

const now = Date.now();
const hoursAgo = (hours) => new Date(now - hours * 60 * 60 * 1000);
const daysAgo = (days) => hoursAgo(days * 24);
const daysFromNow = (days) => new Date(now + days * 24 * 60 * 60 * 1000);

const DEFAULT_CATEGORIES = [
  {
    name: "Lip Gloss",
    description: "Gloss formulas for high-shine finishes.",
    subcategories: ["High Shine", "Tinted", "Plumping"],
  },
  {
    name: "Lip Pencil",
    description: "Precision liners for shaping and defining.",
    subcategories: ["Nude", "Bold", "Long-Wear"],
  },
  {
    name: "Lip Oil",
    description: "Nourishing oils with glow and hydration.",
    subcategories: ["Hydrating", "Tinted", "Shimmer"],
  },
  {
    name: "Lip Balm",
    description: "Daily care balms for moisture and comfort.",
    subcategories: ["SPF Care", "Night Repair", "Tinted Balm"],
  },
];

const DEFAULT_TAGS = [
  {
    name: "Best Seller",
    description: "Top performing product loved by customers.",
  },
  {
    name: "New",
    description: "Fresh launch in the current collection.",
  },
];

const DEFAULT_PRODUCTS = [
  {
    name: "Ruby Romance",
    categoryName: "Lip Gloss",
    priceInNaira: 6500,
    description: "High-shine, non-sticky formula for the perfect glossy pout.",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600",
    imagePublicId: "seed/ruby-romance",
    tagName: "Best Seller",
    inventoryCount: 50,
  },
  {
    name: "Pink Lemonade",
    categoryName: "Lip Pencil",
    priceInNaira: 6500,
    description: "Creamy, long-lasting liner for a defined and flawless lip.",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600",
    imagePublicId: "seed/pink-lemonade",
    inventoryCount: 40,
  },
  {
    name: "Hydra Glow Lip Oil",
    categoryName: "Lip Oil",
    priceInNaira: 6500,
    description: "Nourishing oil that delivers mirror-like shine and hydration.",
    image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600",
    imagePublicId: "seed/hydra-glow-lip-oil",
    tagName: "New",
    inventoryCount: 35,
  },
  {
    name: "Silk Kiss Lip Balm",
    categoryName: "Lip Balm",
    priceInNaira: 6500,
    description: "Ultra-moisturizing balm for soft, supple lips all day.",
    image: "https://images.unsplash.com/photo-1583241800698-6cf3f6ac43a7?w=600",
    imagePublicId: "seed/silk-kiss-lip-balm",
    inventoryCount: 45,
  },
];

const makeAddress = (recipientName, phone) => ({
  recipientName,
  line1: "14 Admiralty Way",
  line2: "Lekki Phase 1",
  city: "Lagos",
  state: "Lagos",
  postalCode: "106104",
  country: "Nigeria",
  phone,
});

const makeItem = ({ productId, productName, productSlug, image, quantity, price }) => ({
  productId,
  productName,
  productSlug,
  image,
  quantity,
  price,
  total: quantity * price,
});

const makeEvent = (status, label, description, timestamp) => ({
  status,
  label,
  description,
  timestamp,
});

const ensureCategories = async () => {
  await Promise.all(
    DEFAULT_CATEGORIES.map(async (category) => {
      await CategoryModel.findOneAndUpdate(
        { name: category.name },
        {
          $set: {
            name: category.name,
            slug: slugify(category.name),
            description: category.description,
            subcategories: category.subcategories,
            isActive: true,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
    }),
  );

  const categories = await CategoryModel.find().lean();

  return new Map(
    categories.map((category) => [category.name.trim().toLowerCase(), category]),
  );
};

const ensureTags = async () => {
  await Promise.all(
    DEFAULT_TAGS.map(async (tag) => {
      await TagModel.findOneAndUpdate(
        { name: tag.name },
        {
          $set: {
            name: tag.name,
            slug: slugify(tag.name),
            description: tag.description,
            isActive: true,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
    }),
  );

  const tags = await TagModel.find().lean();

  return new Map(tags.map((tag) => [tag.name.trim().toLowerCase(), tag]));
};

const ensureProducts = async (categoriesByName, tagsByName) => {
  const productsCount = await ProductModel.estimatedDocumentCount();
  const fallbackCategory = categoriesByName.values().next().value;

  if (!fallbackCategory) {
    return;
  }

  if (productsCount === 0) {
    await ProductModel.insertMany(
      DEFAULT_PRODUCTS.map((product) => {
        const category = categoriesByName.get(product.categoryName.toLowerCase()) || fallbackCategory;
        const tag = product.tagName
          ? tagsByName.get(product.tagName.toLowerCase()) || null
          : null;

        return {
          name: product.name,
          slug: slugify(product.name),
          categoryId: category._id,
          categoryName: category.name,
          categorySlug: category.slug,
          tagId: tag?._id || null,
          tagName: tag?.name || null,
          tagSlug: tag?.slug || null,
          priceInNaira: product.priceInNaira,
          description: product.description,
          image: product.image,
          imagePublicId: product.imagePublicId,
          inStock: product.inventoryCount > 0,
          inventoryCount: product.inventoryCount,
        };
      }),
    );

    return;
  }

  const legacyProducts = await ProductModel.find().lean();
  const updates = [];

  for (const product of legacyProducts) {
    const update = {};
    const productId = product._id.toString();

    const normalizedCategoryName = (product.categoryName || product.category || "").trim();
    const category =
      categoriesByName.get(normalizedCategoryName.toLowerCase()) ||
      categoriesByName.get("lip gloss") ||
      fallbackCategory;

    if (!product.categoryId || product.categoryId.toString() !== category._id.toString()) {
      update.categoryId = category._id;
    }

    if (!product.categoryName || product.categoryName !== category.name) {
      update.categoryName = category.name;
    }

    if (!product.categorySlug || product.categorySlug !== category.slug) {
      update.categorySlug = category.slug;
    }

    const normalizedTagName = (product.tagName || product.tag || "").trim();
    const tag = normalizedTagName ? tagsByName.get(normalizedTagName.toLowerCase()) || null : null;

    if (tag) {
      if (!product.tagId || product.tagId.toString() !== tag._id.toString()) {
        update.tagId = tag._id;
      }
      if (!product.tagName || product.tagName !== tag.name) {
        update.tagName = tag.name;
      }
      if (!product.tagSlug || product.tagSlug !== tag.slug) {
        update.tagSlug = tag.slug;
      }
    } else if (product.tagId || product.tagName || product.tagSlug) {
      update.tagId = null;
      update.tagName = null;
      update.tagSlug = null;
    }

    if (!product.slug) {
      update.slug = slugify(product.name) || `product-${productId.slice(-6)}`;
    }

    if (!product.imagePublicId) {
      update.imagePublicId = `seed/${update.slug || product.slug || productId}`;
    }

    if (typeof product.inventoryCount !== "number") {
      update.inventoryCount = 0;
    }

    if ((update.inventoryCount ?? product.inventoryCount ?? 0) <= 0) {
      update.inStock = false;
    }

    if (Object.keys(update).length > 0) {
      updates.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: update },
        },
      });
    }
  }

  if (updates.length > 0) {
    await ProductModel.bulkWrite(updates, { ordered: false });
  }
};

const syncAssetRegistry = async () => {
  const products = await ProductModel.find({
    imagePublicId: { $exists: true, $ne: "" },
    image: { $exists: true, $ne: "" },
  })
    .select("imagePublicId image")
    .lean();

  if (products.length === 0) {
    return;
  }

  await AssetModel.bulkWrite(
    products.map((product) => ({
      updateOne: {
        filter: { publicId: product.imagePublicId },
        update: {
          $set: {
            publicId: product.imagePublicId,
            secureUrl: product.image,
            bytes: 0,
            format: "",
            resourceType: "image",
            folder: "seed",
          },
          $setOnInsert: {
            createdBy: null,
            assetId: "",
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
};

const ensureStoreSettings = async () => {
  await StoreSettingsModel.findOneAndUpdate(
    { singletonKey: "store_settings" },
    {
      $setOnInsert: {
        singletonKey: "store_settings",
        playlistUrl: "https://open.spotify.com",
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
};

export const ensureSeedData = async () => {
  await ensureStoreSettings();

  const [usersCount, ordersCount, couponsCount] = await Promise.all([
    UserModel.estimatedDocumentCount(),
    OrderModel.estimatedDocumentCount(),
    CouponModel.estimatedDocumentCount(),
  ]);

  const [categoriesByName, tagsByName] = await Promise.all([
    ensureCategories(),
    ensureTags(),
  ]);

  await ensureProducts(categoriesByName, tagsByName);
  await syncAssetRegistry();

  if (couponsCount === 0) {
    await CouponModel.insertMany([
      {
        code: "WELCOME10",
        type: "percent",
        value: 10,
        active: true,
        minOrderTotal: 10000,
        usageLimit: 1000,
      },
      {
        code: "SHIPFREE",
        type: "fixed",
        value: 1500,
        active: true,
        minOrderTotal: 15000,
        usageLimit: 500,
      },
    ]);
  }

  if (usersCount > 0 || ordersCount > 0) {
    return;
  }

  const userPasswordHash = await bcrypt.hash("Password123!", 10);

  const users = await UserModel.insertMany([
    {
      fullName: "Amara Johnson",
      email: "amara@example.com",
      passwordHash: userPasswordHash,
      role: "user",
      phone: "+2348011111111",
      createdAt: daysAgo(70),
      updatedAt: daysAgo(2),
    },
    {
      fullName: "Nadia Okafor",
      email: "nadia@example.com",
      passwordHash: userPasswordHash,
      role: "user",
      phone: "+2348022222222",
      createdAt: daysAgo(65),
      updatedAt: daysAgo(3),
    },
    {
      fullName: "Sharbelle Admin",
      email: "admin@sharbelle.com",
      passwordHash: userPasswordHash,
      role: "admin",
      phone: "+2348033333333",
      createdAt: daysAgo(90),
      updatedAt: daysAgo(1),
    },
  ]);

  const usersByEmail = users.reduce((acc, user) => {
    acc[user.email] = user;
    return acc;
  }, {});

  await OrderModel.insertMany([
    {
      userId: usersByEmail["amara@example.com"]._id,
      orderNumber: "SHR-1001",
      items: [
        makeItem({
          productId: "ruby-romance",
          productName: "Ruby Romance",
          productSlug: "ruby-romance",
          image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600",
          quantity: 1,
          price: 6500,
        }),
        makeItem({
          productId: "silk-kiss-lip-balm",
          productName: "Silk Kiss Lip Balm",
          productSlug: "silk-kiss-lip-balm",
          image: "https://images.unsplash.com/photo-1583241800698-6cf3f6ac43a7?w=600",
          quantity: 1,
          price: 6500,
        }),
      ],
      subtotal: 13000,
      shippingFee: 1500,
      discount: 500,
      total: 14000,
      currency: "NGN",
      paymentStatus: "paid",
      orderStatus: "delivered",
      trackingCode: "TRK-SHR-DEL-1001",
      shippingAddress: makeAddress("Amara Johnson", "+2348011111111"),
      billingAddress: makeAddress("Amara Johnson", "+2348011111111"),
      statusHistory: [
        makeEvent("pending", "Order placed", "Your order has been placed successfully.", daysAgo(10)),
        makeEvent("confirmed", "Order confirmed", "We confirmed your payment.", daysAgo(10)),
        makeEvent("processing", "Processing", "Your order is being prepared.", daysAgo(9)),
        makeEvent("packed", "Packed", "Items packed and awaiting courier pickup.", daysAgo(8)),
        makeEvent("shipped", "Shipped", "Order handed over to courier.", daysAgo(8)),
        makeEvent("in_transit", "In transit", "Package is on the way.", daysAgo(7)),
        makeEvent("out_for_delivery", "Out for delivery", "Courier is delivering today.", daysAgo(6)),
        makeEvent("delivered", "Delivered", "Order delivered successfully.", daysAgo(6)),
      ],
      createdAt: daysAgo(10),
      updatedAt: daysAgo(6),
      estimatedDeliveryDate: daysAgo(6),
    },
    {
      userId: usersByEmail["amara@example.com"]._id,
      orderNumber: "SHR-1012",
      items: [
        makeItem({
          productId: "hydra-glow-lip-oil",
          productName: "Hydra Glow Lip Oil",
          productSlug: "hydra-glow-lip-oil",
          image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600",
          quantity: 2,
          price: 6500,
        }),
      ],
      subtotal: 13000,
      shippingFee: 1500,
      discount: 0,
      total: 14500,
      currency: "NGN",
      paymentStatus: "paid",
      orderStatus: "in_transit",
      trackingCode: "TRK-SHR-TRANSIT-1012",
      shippingAddress: makeAddress("Amara Johnson", "+2348011111111"),
      billingAddress: makeAddress("Amara Johnson", "+2348011111111"),
      statusHistory: [
        makeEvent("pending", "Order placed", "Your order has been placed successfully.", daysAgo(2)),
        makeEvent("confirmed", "Order confirmed", "Payment received and confirmed.", daysAgo(2)),
        makeEvent("processing", "Processing", "We are preparing your products.", hoursAgo(42)),
        makeEvent("packed", "Packed", "Order packed and sealed.", hoursAgo(38)),
        makeEvent("shipped", "Shipped", "Courier has picked up your package.", hoursAgo(32)),
        makeEvent("in_transit", "In transit", "Package is moving between sorting centers.", hoursAgo(18)),
      ],
      createdAt: daysAgo(2),
      updatedAt: hoursAgo(18),
      estimatedDeliveryDate: daysFromNow(2),
    },
    {
      userId: usersByEmail["amara@example.com"]._id,
      orderNumber: "SHR-1026",
      items: [
        makeItem({
          productId: "pink-lemonade",
          productName: "Pink Lemonade",
          productSlug: "pink-lemonade",
          image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600",
          quantity: 1,
          price: 6500,
        }),
      ],
      subtotal: 6500,
      shippingFee: 1500,
      discount: 0,
      total: 8000,
      currency: "NGN",
      paymentStatus: "pending",
      orderStatus: "processing",
      trackingCode: "TRK-SHR-PROC-1026",
      shippingAddress: makeAddress("Amara Johnson", "+2348011111111"),
      billingAddress: makeAddress("Amara Johnson", "+2348011111111"),
      statusHistory: [
        makeEvent("pending", "Order placed", "Your order has been created.", hoursAgo(16)),
        makeEvent("confirmed", "Order confirmed", "Order details have been confirmed.", hoursAgo(12)),
        makeEvent("processing", "Processing", "Production team is preparing items.", hoursAgo(8)),
      ],
      createdAt: hoursAgo(16),
      updatedAt: hoursAgo(8),
      estimatedDeliveryDate: daysFromNow(4),
    },
    {
      userId: usersByEmail["nadia@example.com"]._id,
      orderNumber: "SHR-1035",
      items: [
        makeItem({
          productId: "ruby-romance",
          productName: "Ruby Romance",
          productSlug: "ruby-romance",
          image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600",
          quantity: 1,
          price: 6500,
        }),
      ],
      subtotal: 6500,
      shippingFee: 1500,
      discount: 0,
      total: 8000,
      currency: "NGN",
      paymentStatus: "failed",
      orderStatus: "cancelled",
      trackingCode: "TRK-SHR-CAN-1035",
      shippingAddress: makeAddress("Nadia Okafor", "+2348022222222"),
      billingAddress: makeAddress("Nadia Okafor", "+2348022222222"),
      statusHistory: [
        makeEvent("pending", "Order placed", "Order was initiated.", daysAgo(5)),
        makeEvent("confirmed", "Order confirmed", "Order was temporarily confirmed.", daysAgo(5)),
        makeEvent("cancelled", "Cancelled", "Payment failed and order was cancelled.", daysAgo(4)),
      ],
      createdAt: daysAgo(5),
      updatedAt: daysAgo(4),
      estimatedDeliveryDate: daysAgo(2),
    },
    {
      userId: usersByEmail["nadia@example.com"]._id,
      orderNumber: "SHR-1048",
      items: [
        makeItem({
          productId: "hydra-glow-lip-oil",
          productName: "Hydra Glow Lip Oil",
          productSlug: "hydra-glow-lip-oil",
          image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600",
          quantity: 1,
          price: 6500,
        }),
        makeItem({
          productId: "silk-kiss-lip-balm",
          productName: "Silk Kiss Lip Balm",
          productSlug: "silk-kiss-lip-balm",
          image: "https://images.unsplash.com/photo-1583241800698-6cf3f6ac43a7?w=600",
          quantity: 1,
          price: 6500,
        }),
      ],
      subtotal: 13000,
      shippingFee: 1500,
      discount: 1000,
      total: 13500,
      currency: "NGN",
      paymentStatus: "refunded",
      orderStatus: "returned",
      trackingCode: "TRK-SHR-RET-1048",
      shippingAddress: makeAddress("Nadia Okafor", "+2348022222222"),
      billingAddress: makeAddress("Nadia Okafor", "+2348022222222"),
      statusHistory: [
        makeEvent("pending", "Order placed", "Order has been placed.", daysAgo(15)),
        makeEvent("confirmed", "Order confirmed", "Payment was confirmed.", daysAgo(15)),
        makeEvent("processing", "Processing", "Items were prepared.", daysAgo(14)),
        makeEvent("packed", "Packed", "Order packed for shipment.", daysAgo(14)),
        makeEvent("shipped", "Shipped", "Order shipped with courier.", daysAgo(13)),
        makeEvent("in_transit", "In transit", "Order moved through transit hubs.", daysAgo(12)),
        makeEvent("out_for_delivery", "Out for delivery", "Courier heading to destination.", daysAgo(11)),
        makeEvent("delivered", "Delivered", "Order was delivered.", daysAgo(11)),
        makeEvent("returned", "Returned", "Customer initiated a return and refund completed.", daysAgo(8)),
      ],
      createdAt: daysAgo(15),
      updatedAt: daysAgo(8),
      estimatedDeliveryDate: daysAgo(11),
    },
  ]);
};
