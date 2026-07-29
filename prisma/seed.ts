import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { categories } from "./seed-data/categories";
import { products } from "./seed-data/products";
import { bundles } from "./seed-data/bundles";
import { shippingZones } from "./seed-data/shipping-zones";
import { banners } from "./seed-data/banners";
import { staffSeed, deliverySeed, customerSeed } from "./seed-data/people";
import { promoCodes } from "./seed-data/promo-codes";
import { reviewPool } from "./seed-data/reviews";
import { supportTicketTemplates } from "./seed-data/support-tickets";
import { slugify } from "../src/lib/slugify";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Betolla123!";
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date();

// ---------------- image helpers ----------------

const HAIR_CARE_IMAGES = [
  "/seed-images/hair-care/shampoo-03.jpg",
  "/seed-images/hair-care/shampoo-04.jpg",
  "/seed-images/hair-care/shampoo-05.jpg",
  "/seed-images/hair-care/shampoo-06.jpg",
  "/seed-images/hair-care/shampoo-08.jpg",
  "/seed-images/hair-care/shampoo-10.jpg",
  "/seed-images/hair-care/shampoo-11.jpg",
  "/seed-images/hair-care/serum-01.jpg",
  "/seed-images/hair-care/serum-02.jpg",
  "/seed-images/hair-care/serum-03.jpg",
  "/seed-images/hair-care/serum-04.jpg",
  "/seed-images/hair-care/serum-05.jpg",
  "/seed-images/hair-care/serum-06.jpg",
  "/seed-images/hair-care/serum-07.jpg",
];

function hairCareImageUrl(seed: string) {
  const hash = Math.abs(
    [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)
  );
  return HAIR_CARE_IMAGES[hash % HAIR_CARE_IMAGES.length];
}

// ---------------- small random helpers ----------------

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2) {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function pickMany<T>(arr: readonly T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = randInt(0, copy.length - 1);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

// Evenings and Thu/Fri (the Jordanian weekend) get more weight, so the sales
// heatmap and day-of-week charts show a believable pattern rather than noise.
const WEIGHTED_HOURS = [
  ...Array(2).fill([9, 10, 11]),
  ...Array(3).fill([12, 13, 14, 15, 16, 17]),
  ...Array(6).fill([18, 19, 20, 21, 22]),
].flat();

function randomOrderDate(daysAgoMax: number, daysAgoMin = 0) {
  const daysAgo = randInt(daysAgoMin, daysAgoMax);
  const date = new Date(NOW.getTime() - daysAgo * DAY_MS);
  const isWeekend = date.getDay() === 4 || date.getDay() === 5; // Thu/Fri
  const hour = isWeekend && Math.random() < 0.6 ? pick(WEIGHTED_HOURS) : pick(WEIGHTED_HOURS);
  date.setHours(hour, randInt(0, 59), randInt(0, 59), 0);
  return date;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

// Some timestamps are derived as "order date + N hours/days" - for orders placed recently,
// that offset can land after today. Clamp anything derived this way to NOW.
function clampToNow(date: Date) {
  return date.getTime() > NOW.getTime() ? NOW : date;
}

let orderSeq = 1000;
function nextOrderNumber() {
  orderSeq += 1;
  return `BT-${orderSeq}`;
}

async function main() {
  console.log("Seeding Betolla Cosmetics demo data...\n");

  // ---------------- identity ----------------

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env before seeding.");
  }

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      username: "admin",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
      firstName: "Betolla",
      lastName: "Admin",
      locale: "EN",
    },
  });
  console.log(`Created admin: ${admin.email}`);

  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const staff = [];
  for (const s of staffSeed) {
    const created = await prisma.user.create({
      data: {
        ...s,
        passwordHash: demoPasswordHash,
        role: "STAFF",
        createdById: admin.id,
      },
    });
    staff.push(created);
    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        actorRole: "ADMIN",
        action: "STAFF_CREATE",
        entityType: "User",
        entityId: created.id,
        afterData: { email: created.email, role: "STAFF" },
      },
    });
  }
  console.log(`Created ${staff.length} staff accounts`);

  const drivers = [];
  for (const [i, d] of deliverySeed.entries()) {
    const creator = staff[i % staff.length];
    const created = await prisma.user.create({
      data: {
        ...d,
        passwordHash: demoPasswordHash,
        role: "DELIVERY",
        createdById: creator.id,
      },
    });
    drivers.push(created);
    await prisma.activityLog.create({
      data: {
        actorId: creator.id,
        actorRole: "STAFF",
        action: "DELIVERY_ACCOUNT_CREATE",
        entityType: "User",
        entityId: created.id,
        afterData: { email: created.email, role: "DELIVERY" },
      },
    });
  }
  console.log(`Created ${drivers.length} delivery accounts`);

  // Customer "spend tiers" drive order volume so RFM/promo segments have real variance.
  const tierBySlice = (i: number) => (i < 4 ? "whale" : i < 16 ? "regular" : "occasional");

  const customers = [];
  for (const [i, c] of customerSeed.entries()) {
    const created = await prisma.user.create({
      data: {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        username: c.username,
        passwordHash: demoPasswordHash,
        role: "CUSTOMER",
        locale: Math.random() < 0.5 ? "AR" : "EN",
      },
    });
    customers.push({ ...created, city: c.city, tier: tierBySlice(i) });
  }
  console.log(`Created ${customers.length} customers`);

  // ---------------- catalog ----------------

  const categoryBySlug = new Map<string, { id: string }>();
  for (const c of categories) {
    const created = await prisma.category.create({
      data: {
        slug: c.slug,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        imageUrl: c.imageUrl,
      },
    });
    categoryBySlug.set(c.slug, created);
  }
  console.log(`Created ${categoryBySlug.size} categories`);

  const productBySku = new Map<string, { id: string; price: number }>();
  for (const p of products) {
    const category = categoryBySlug.get(p.categorySlug)!;
    const mainImageUrl = hairCareImageUrl(p.imageSeed);
    const created = await prisma.product.create({
      data: {
        sku: p.sku,
        slug: slugify(p.nameEn),
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        descriptionEn: p.descriptionEn,
        descriptionAr: p.descriptionAr,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold ?? null,
        categoryId: category.id,
        mainImageUrl,
        images: {
          create: [2, 3, 4].map((n) => ({
            url: hairCareImageUrl(`${p.imageSeed}-${n}`),
            sortOrder: n - 1,
          })),
        },
      },
    });
    productBySku.set(p.sku, { id: created.id, price: p.price });
  }
  console.log(`Created ${productBySku.size} products with gallery images`);

  for (const b of bundles) {
    await prisma.productBundle.create({
      data: {
        slug: slugify(b.nameEn),
        nameEn: b.nameEn,
        nameAr: b.nameAr,
        descriptionEn: b.descriptionEn,
        descriptionAr: b.descriptionAr,
        bundlePrice: b.bundlePrice,
        mainImageUrl: hairCareImageUrl(b.imageSeed),
        items: {
          create: b.itemSkus.map((sku) => ({
            productId: productBySku.get(sku)!.id,
            quantity: 1,
          })),
        },
      },
    });
  }
  console.log(`Created ${bundles.length} product bundles`);

  for (const b of banners) {
    await prisma.banner.create({ data: b });
  }
  console.log(`Created ${banners.length} homepage banners`);

  for (const z of shippingZones) {
    await prisma.shippingZone.create({ data: z });
  }
  console.log(`Created ${shippingZones.length} shipping zones`);

  await prisma.loyaltyConfig.create({
    data: { pointsPerJdSpent: 1, redemptionValuePerPoint: 0.01 },
  });
  const tiers = [
    { nameEn: "Bronze", nameAr: "برونزي", minPoints: 0, sortOrder: 0 },
    { nameEn: "Silver", nameAr: "فضي", minPoints: 500, sortOrder: 1 },
    { nameEn: "Gold", nameAr: "ذهبي", minPoints: 1500, sortOrder: 2 },
    { nameEn: "Platinum", nameAr: "بلاتيني", minPoints: 4000, sortOrder: 3 },
  ];
  for (const t of tiers) {
    await prisma.loyaltyTier.create({ data: t });
  }
  console.log("Created loyalty config and tiers");

  const promoCodeRecords = [];
  for (const p of promoCodes) {
    const created = await prisma.promoCode.create({
      data: {
        code: p.code,
        discountType: p.discountType,
        discountValue: p.discountValue,
        minOrderTotal: p.minOrderTotal,
        targetSegment: p.targetSegment,
        isActive: p.isActive,
        expiresAt: new Date(NOW.getTime() + p.daysUntilExpiry * DAY_MS),
        usageLimitTotal: p.usageLimitTotal,
        usageLimitPerUser: p.usageLimitPerUser,
      },
    });
    promoCodeRecords.push(created);
  }
  console.log(`Created ${promoCodeRecords.length} promo codes`);

  // ---------------- addresses & payment methods ----------------

  const addressByCustomer = new Map<string, { id: string; snapshot: string; city: string }>();
  const paymentMethodByCustomer = new Map<string, { id: string; label: string }>();

  for (const c of customers) {
    const street = `Street ${randInt(1, 90)}, Building ${randInt(1, 40)}`;
    const area = pick(["Abdoun", "Sweifieh", "Jabal Amman", "Khalda", "Tla' Al-Ali", "Downtown"] as const);
    const address = await prisma.address.create({
      data: {
        userId: c.id,
        label: "Home",
        recipientName: `${c.firstName} ${c.lastName}`,
        phone: `+9627${randInt(70000000, 99999999)}`,
        city: c.city,
        area,
        street,
        isDefaultShipping: true,
      },
    });
    const snapshot = `${c.firstName} ${c.lastName}, ${street}, ${area}, ${c.city}, Jordan`;
    addressByCustomer.set(c.id, { id: address.id, snapshot, city: c.city });

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: c.id,
        type: "CASH_ON_DELIVERY",
        label: "Cash on Delivery",
        maskedDisplay: null,
        isDefault: true,
      },
    });
    paymentMethodByCustomer.set(c.id, { id: paymentMethod.id, label: paymentMethod.label });
  }
  console.log("Created addresses and payment methods for every customer");

  // ---------------- orders ----------------

  const skuList = [...productBySku.keys()];
  const commonCombos: string[][] = [
    ["LIP-001", "FND-001"],
    ["SER-001", "CLN-001"],
    ["LIP-003", "EYE-002"],
    ["PRF-001", "PRF-008"],
    ["FND-002", "EYE-001"],
    ["SER-005", "CLN-002"],
  ];

  function randomOrderItems() {
    const useCombo = Math.random() < 0.45;
    const skus = useCombo ? [...pick(commonCombos)] : pickMany(skuList, randInt(1, 3));
    if (!useCombo && Math.random() < 0.3) skus.push(pick(skuList));
    return [...new Set(skus)].map((sku) => ({
      sku,
      quantity: randInt(1, 2),
    }));
  }

  type SeededOrder = {
    id: string;
    userId: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: Date;
    items: { orderItemId: string; productId: string }[];
  };
  const allOrders: SeededOrder[] = [];

  const orderCountByTier: Record<string, [number, number]> = {
    whale: [15, 22],
    regular: [5, 11],
    occasional: [1, 3],
  };
  // Minimum of 4 days so the longest status-history chain (DELIVERED, +72h) always fits
  // before "now" without needing to clamp timestamps into an unrealistic pile-up.
  const daysAgoRangeByTier: Record<string, [number, number]> = {
    whale: [4, 150],
    regular: [4, 150],
    occasional: [30, 150],
  };

  for (const customer of customers) {
    const [minOrders, maxOrders] = orderCountByTier[customer.tier];
    const orderCount = randInt(minOrders, maxOrders);
    const [daysMin, daysMax] = daysAgoRangeByTier[customer.tier];
    const address = addressByCustomer.get(customer.id)!;
    const paymentMethod = paymentMethodByCustomer.get(customer.id)!;
    const zone = shippingZones.find((z) => z.cityEn === address.city);
    const shippingFee = address.city === "Amman" ? 0 : (zone?.fee ?? 3);

    for (let i = 0; i < orderCount; i++) {
      const createdAt = randomOrderDate(daysMax, daysMin);
      const items = randomOrderItems();

      const roll = Math.random();
      let status: "PENDING" | "CONFIRMED" | "ON_DELIVERY" | "DELIVERED" | "CANCELLED";
      let paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
      let cancellationReason: string | null = null;

      if (roll < 0.68) {
        status = "DELIVERED";
        paymentStatus = "PAID";
      } else if (roll < 0.78) {
        status = "PENDING";
        paymentStatus = "UNPAID";
      } else if (roll < 0.86) {
        status = "CONFIRMED";
        paymentStatus = Math.random() < 0.5 ? "PAID" : "UNPAID";
      } else if (roll < 0.94) {
        status = "ON_DELIVERY";
        paymentStatus = Math.random() < 0.5 ? "PAID" : "UNPAID";
      } else {
        status = "CANCELLED";
        paymentStatus = Math.random() < 0.2 ? "PAID" : "UNPAID";
        cancellationReason = pick([
          "Customer changed their mind",
          "Item out of stock",
          "Duplicate order placed by mistake",
          "Customer requested a different shade",
        ] as const);
      }

      let subtotal = 0;
      const orderItemsData = items.map(({ sku, quantity }) => {
        const product = products.find((p) => p.sku === sku)!;
        const price = product.price;
        subtotal += price * quantity;
        return {
          productId: productBySku.get(sku)!.id,
          nameSnapshot: product.nameEn,
          imageSnapshot: hairCareImageUrl(product.imageSeed),
          priceSnapshot: price,
          quantity,
        };
      });
      subtotal = Number(subtotal.toFixed(2));

      const usePromo = Math.random() < 0.15;
      const promo = usePromo
        ? pick(promoCodeRecords.filter((p) => p.isActive && !!p.expiresAt && p.expiresAt > NOW))
        : undefined;
      let discountTotal = 0;
      if (promo && subtotal >= Number(promo.minOrderTotal)) {
        discountTotal =
          promo.discountType === "PERCENTAGE"
            ? Number(((subtotal * Number(promo.discountValue)) / 100).toFixed(2))
            : Number(promo.discountValue);
      }

      const useStoreCredit = status === "DELIVERED" && Math.random() < 0.08;
      const storeCreditUsed = useStoreCredit ? Math.min(5, subtotal) : 0;

      const total = Number((subtotal - discountTotal - storeCreditUsed + shippingFee).toFixed(2));
      const loyaltyPointsEarned = paymentStatus === "PAID" ? Math.floor(total) : 0;

      const order = await prisma.order.create({
        data: {
          orderNumber: nextOrderNumber(),
          userId: customer.id,
          status,
          paymentStatus,
          cancellationReason,
          subtotal,
          discountTotal,
          shippingFee,
          total,
          storeCreditUsed,
          loyaltyPointsEarned,
          promoCodeId: discountTotal > 0 ? promo!.id : null,
          shippingAddressId: address.id,
          shippingAddressSnapshot: address.snapshot,
          shippingCity: address.city,
          paymentMethodId: paymentMethod.id,
          paymentMethodLabel: paymentMethod.label,
          createdAt,
          updatedAt: createdAt,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      if (discountTotal > 0 && promo) {
        await prisma.promoCodeUsage.create({
          data: {
            promoCodeId: promo.id,
            userId: customer.id,
            orderId: order.id,
            discountAmount: discountTotal,
          },
        });
      }

      // status history timeline
      const history: { status: string; at: Date; note?: string }[] = [{ status: "PENDING", at: createdAt }];
      if (status !== "PENDING") {
        history.push({ status: "CONFIRMED", at: clampToNow(addHours(createdAt, randInt(1, 6))) });
      }
      if (status === "ON_DELIVERY" || status === "DELIVERED") {
        history.push({ status: "ON_DELIVERY", at: clampToNow(addHours(createdAt, randInt(8, 24))) });
      }
      if (status === "DELIVERED") {
        history.push({ status: "DELIVERED", at: clampToNow(addHours(createdAt, randInt(30, 72))) });
      }
      if (status === "CANCELLED") {
        history.push({
          status: "CANCELLED",
          at: clampToNow(addHours(createdAt, randInt(1, 20))),
          note: cancellationReason ?? undefined,
        });
      }
      for (const h of history) {
        await prisma.orderStatusHistory.create({
          data: { orderId: order.id, status: h.status as never, note: h.note, createdAt: h.at },
        });
      }

      // delivery assignment for anything dispatched
      if (status === "ON_DELIVERY" || status === "DELIVERED") {
        const driver = pick(drivers);
        const assignedAt = clampToNow(addHours(createdAt, randInt(8, 24)));
        await prisma.deliveryAssignment.create({
          data: {
            orderId: order.id,
            driverId: driver.id,
            status: status === "DELIVERED" ? "DELIVERED" : pick(["PICKED_UP", "EN_ROUTE"] as const),
            earningsAmount: randFloat(1.5, 3.5),
            assignedAt,
            pickedUpAt: clampToNow(addHours(assignedAt, 1)),
            deliveredAt: status === "DELIVERED" ? clampToNow(addHours(createdAt, randInt(30, 72))) : null,
          },
        });
      }

      allOrders.push({
        id: order.id,
        userId: customer.id,
        status,
        paymentStatus,
        total,
        createdAt,
        items: order.items.map((it) => ({ orderItemId: it.id, productId: it.productId! })),
      });
    }
  }
  console.log(`Created ${allOrders.length} orders with status history and delivery assignments`);

  // ---------------- reviews ----------------

  let reviewCount = 0;
  const deliveredOrders = allOrders.filter((o) => o.status === "DELIVERED");
  for (const order of deliveredOrders) {
    for (const item of order.items) {
      if (Math.random() < 0.35) {
        const r = pick(reviewPool);
        await prisma.review.create({
          data: {
            productId: item.productId,
            userId: order.userId,
            orderItemId: item.orderItemId,
            rating: r.rating,
            comment: Math.random() < 0.5 ? r.textEn : r.textAr,
            isVerifiedPurchase: true,
            createdAt: clampToNow(addHours(order.createdAt, randInt(72, 240))),
          },
        });
        reviewCount++;
      }
    }
  }
  // recompute avgRating/reviewCount per product
  for (const [sku, product] of productBySku) {
    const agg = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    });
    if (agg._count > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { avgRating: Number((agg._avg.rating ?? 0).toFixed(1)), reviewCount: agg._count },
      });
    }
    void sku;
  }
  console.log(`Created ${reviewCount} verified-purchase reviews`);

  // ---------------- returns ----------------

  const returnCandidates = pickMany(deliveredOrders, Math.min(7, deliveredOrders.length));
  const returnReasons = ["Wrong shade", "Changed my mind", "Arrived damaged", "Doesn't suit my skin"] as const;
  let returnCount = 0;
  for (const order of returnCandidates) {
    const item = pick(order.items);
    const status = pick(["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED"] as const);
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        status,
        refundAmount: status === "REFUNDED" ? randFloat(8, 20) : null,
        createdAt: clampToNow(addHours(order.createdAt, randInt(96, 200))),
        resolvedAt: status === "REFUNDED" ? clampToNow(addHours(order.createdAt, randInt(210, 260))) : null,
        items: {
          create: [{ orderItemId: item.orderItemId, quantity: 1, reason: pick(returnReasons) }],
        },
      },
    });
    if (status === "REFUNDED" && returnRequest.refundAmount) {
      await prisma.storeCreditTransaction.create({
        data: {
          userId: order.userId,
          amount: returnRequest.refundAmount,
          reason: `Refund for return on order ${order.id}`,
          orderId: order.id,
        },
      });
      await prisma.user.update({
        where: { id: order.userId },
        data: { storeCreditBalance: { increment: returnRequest.refundAmount } },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { refundedAmount: returnRequest.refundAmount, paymentStatus: "REFUNDED" },
      });
    }
    returnCount++;
  }
  console.log(`Created ${returnCount} return requests`);

  // ---------------- loyalty transactions ----------------

  for (const customer of customers) {
    const custOrders = allOrders.filter((o) => o.userId === customer.id && o.paymentStatus === "PAID");
    let balance = 0;
    for (const o of custOrders) {
      const points = Math.floor(o.total);
      if (points <= 0) continue;
      await prisma.loyaltyTransaction.create({
        data: { userId: customer.id, type: "EARN", points, orderId: o.id, createdAt: o.createdAt },
      });
      balance += points;
    }
    if (balance > 200 && Math.random() < 0.3) {
      const redeemed = randInt(50, Math.min(150, balance));
      await prisma.loyaltyTransaction.create({
        data: { userId: customer.id, type: "REDEEM", points: -redeemed, note: "Redeemed at checkout" },
      });
      balance -= redeemed;
    }
    await prisma.user.update({ where: { id: customer.id }, data: { loyaltyPointsBalance: balance } });
  }
  console.log("Recorded loyalty transactions and balances");

  // ---------------- wishlists ----------------

  let wishlistCount = 0;
  for (const customer of pickMany(customers, 12)) {
    const wishlist = await prisma.wishlist.create({
      data: { userId: customer.id, name: "My Wishlist" },
    });
    const items = pickMany(skuList, randInt(2, 5));
    for (const sku of items) {
      const product = products.find((p) => p.sku === sku)!;
      const current = productBySku.get(sku)!;
      const priceAtAdd = Math.random() < 0.25 ? Number((current.price * 1.15).toFixed(2)) : current.price;
      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId: current.id,
          priceAtAdd,
          notifyOnPriceDrop: true,
          notifyOnRestock: product.stock === 0,
        },
      });
    }
    wishlistCount++;
  }
  console.log(`Created wishlists for ${wishlistCount} customers`);

  // ---------------- support tickets ----------------

  for (const [i, t] of supportTicketTemplates.entries()) {
    const customer = customers[i % customers.length];
    const relatedOrder = allOrders.find((o) => o.userId === customer.id);
    const createdAt = randomOrderDate(60, 2);
    const assignee = t.status === "OPEN" ? null : pick(staff);
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: customer.id,
        orderId: relatedOrder?.id,
        subject: Math.random() < 0.5 ? t.subjectEn : t.subjectAr,
        category: t.category,
        status: t.status,
        assignedToId: assignee?.id,
        createdAt,
        updatedAt: createdAt,
      },
    });
    await prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: customer.id,
        message: Math.random() < 0.5 ? t.messageEn : t.messageAr,
        createdAt,
      },
    });
    if (t.replyEn && assignee) {
      await prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: assignee.id,
          message: Math.random() < 0.5 ? t.replyEn : t.replyAr!,
          createdAt: clampToNow(addHours(createdAt, randInt(2, 30))),
        },
      });
    }
  }
  console.log(`Created ${supportTicketTemplates.length} support tickets`);

  // ---------------- notification preferences ----------------

  const categoriesList = ["ORDER_UPDATES", "PROMOTIONS", "BACK_IN_STOCK", "LOYALTY_AND_WALLET", "SUPPORT"] as const;
  const optedOutOfPromos = new Set(pickMany(customers, 4).map((c) => c.id));
  for (const customer of customers) {
    for (const category of categoriesList) {
      const promoOptOut = category === "PROMOTIONS" && optedOutOfPromos.has(customer.id);
      await prisma.notificationPreference.createMany({
        data: [
          { userId: customer.id, category, channel: "EMAIL", enabled: !promoOptOut },
          { userId: customer.id, category, channel: "IN_APP", enabled: true },
          { userId: customer.id, category, channel: "SMS", enabled: category === "ORDER_UPDATES" && !promoOptOut },
          { userId: customer.id, category, channel: "PUSH", enabled: false },
        ],
      });
    }
  }
  console.log("Seeded notification preferences for all customers");

  const roleNotificationTargets = [
    { user: admin, categories: ["SUPPORT", "OPERATIONS"] as const },
    ...staff.map((s) => ({ user: s, categories: ["SUPPORT", "OPERATIONS"] as const })),
    ...drivers.map((d) => ({ user: d, categories: ["DELIVERY_ASSIGNMENTS"] as const })),
  ];
  for (const { user, categories } of roleNotificationTargets) {
    for (const category of categories) {
      await prisma.notificationPreference.createMany({
        data: [
          { userId: user.id, category, channel: "EMAIL", enabled: true },
          { userId: user.id, category, channel: "IN_APP", enabled: true },
          { userId: user.id, category, channel: "SMS", enabled: false },
          { userId: user.id, category, channel: "PUSH", enabled: false },
        ],
      });
    }
  }
  console.log("Seeded notification preferences for admin/staff/delivery accounts");

  // ---------------- abandoned carts ----------------

  const abandonedCandidates = pickMany(
    customers.filter((c) => !allOrders.some((o) => o.userId === c.id && o.createdAt > new Date(NOW.getTime() - 3 * DAY_MS))),
    3,
  );
  for (const customer of abandonedCandidates) {
    const cart = await prisma.cart.create({
      data: {
        userId: customer.id,
        status: "ABANDONED",
        lastActivityAt: randomOrderDate(20, 3),
      },
    });
    const items = pickMany(skuList, randInt(1, 3));
    for (const sku of items) {
      const product = productBySku.get(sku)!;
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: product.id, quantity: 1, priceAtAdd: product.price },
      });
    }
  }
  console.log(`Created ${abandonedCandidates.length} abandoned carts`);

  // ---------------- customer stats / RFM ----------------

  const statsRows = [];
  for (const customer of customers) {
    const paidOrders = allOrders.filter((o) => o.userId === customer.id && o.paymentStatus === "PAID");
    const totalSpent = Number(paidOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2));
    const orderCount = paidOrders.length;
    const lastOrderAt = paidOrders.length
      ? paidOrders.reduce((latest, o) => (o.createdAt > latest ? o.createdAt : latest), paidOrders[0].createdAt)
      : null;
    statsRows.push({ customer, totalSpent, orderCount, lastOrderAt });
  }

  function quintileScore(values: number[], value: number, higherIsBetter: boolean) {
    const sorted = [...values].sort((a, b) => a - b);
    const rank = sorted.findIndex((v) => v >= value);
    const percentile = rank / Math.max(1, sorted.length - 1);
    const score = Math.min(5, Math.max(1, Math.ceil(percentile * 5)));
    return higherIsBetter ? score : 6 - score;
  }

  const monetaryValues = statsRows.map((r) => r.totalSpent);
  const frequencyValues = statsRows.map((r) => r.orderCount);
  const recencyValues = statsRows.map((r) => (r.lastOrderAt ? NOW.getTime() - r.lastOrderAt.getTime() : Infinity));

  function segmentFor(r: number, f: number, m: number) {
    if (r >= 4 && f >= 4 && m >= 4) return "CHAMPIONS";
    if (f >= 4 && m >= 3) return "LOYAL";
    if (r >= 4 && f <= 2) return "NEW_CUSTOMER";
    if (r <= 2 && f >= 3) return "AT_RISK";
    if (r <= 2 && f <= 2 && m <= 2) return "LOST";
    if (r >= 3 && f <= 3) return "POTENTIAL_LOYALIST";
    return "NEEDS_ATTENTION";
  }

  for (const row of statsRows) {
    const recencyMs = row.lastOrderAt ? NOW.getTime() - row.lastOrderAt.getTime() : Infinity;
    const recencyScore = quintileScore(recencyValues, recencyMs, false);
    const frequencyScore = quintileScore(frequencyValues, row.orderCount, true);
    const monetaryScore = quintileScore(monetaryValues, row.totalSpent, true);
    await prisma.customerStats.create({
      data: {
        userId: row.customer.id,
        totalSpent: row.totalSpent,
        orderCount: row.orderCount,
        lastOrderAt: row.lastOrderAt,
        recencyScore,
        frequencyScore,
        monetaryScore,
        segment: segmentFor(recencyScore, frequencyScore, monetaryScore),
      },
    });
  }
  console.log("Computed CustomerStats + RFM segments for every customer");

  // ---------------- summary ----------------

  console.log("\nSeed complete. Demo login credentials (all use the same password):");
  console.log(`  Password for every non-admin account: ${DEMO_PASSWORD}`);
  console.log(`  Admin:     ${admin.email}`);
  console.log(`  Staff:     ${staff.map((s) => s.email).join(", ")}`);
  console.log(`  Delivery:  ${drivers.map((d) => d.email).join(", ")}`);
  console.log(`  Customer:  ${customers[0].email} (and ${customers.length - 1} more)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
