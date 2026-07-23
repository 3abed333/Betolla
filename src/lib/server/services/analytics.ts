import "server-only";
import { prisma } from "@/lib/db";
import { startOfMonth, differenceInCalendarMonths, format } from "date-fns";

export type DateRange = { from?: Date; to?: Date };

function dateRangeWhere(range?: DateRange) {
  if (!range?.from && !range?.to) return undefined;
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {}),
  };
}

/**
 * Top co-purchased product pairs across every order, overall (not per-product) - a dashboard-
 * level "frequently bought together" view. Computed in JS over all order items rather than a
 * SQL self-join: at this app's scale (a few hundred orders) that's simpler to read and plenty
 * fast, and avoids a fragile hand-written pairwise SQL query for a report that only needs to
 * run when an admin opens the analytics page.
 */
export async function getFrequentlyBoughtTogether(limit = 10) {
  const items = await prisma.orderItem.findMany({
    where: { productId: { not: null } },
    select: { orderId: true, productId: true, product: { select: { nameEn: true } } },
  });

  const basketsByOrder = new Map<string, Map<string, string>>();
  for (const item of items) {
    if (!item.productId || !item.product) continue;
    const basket = basketsByOrder.get(item.orderId) ?? new Map<string, string>();
    basket.set(item.productId, item.product.nameEn);
    basketsByOrder.set(item.orderId, basket);
  }

  const pairCounts = new Map<string, { aId: string; aName: string; bId: string; bName: string; count: number }>();
  for (const basket of basketsByOrder.values()) {
    const products = [...basket.entries()];
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const [first, second] = [products[i], products[j]].sort(([idA], [idB]) => (idA < idB ? -1 : 1));
        const key = `${first[0]}|${second[0]}`;
        const existing = pairCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          pairCounts.set(key, { aId: first[0], aName: first[1], bId: second[0], bName: second[1], count: 1 });
        }
      }
    }
  }

  return [...pairCounts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/**
 * "Lifetime value" here means exactly that - realized spend to date (sum of PAID orders), the
 * same number CustomerStats.totalSpent already tracks. Deliberately not a predictive/forecasted
 * CLV: any forward-looking formula needs a retention-period assumption this app has no real
 * basis for, and a fabricated multiplier would read as more rigorous than it is.
 */
export async function getTopCustomersByLifetimeValue(limit = 10) {
  const stats = await prisma.customerStats.findMany({
    where: { totalSpent: { gt: 0 } },
    orderBy: { totalSpent: "desc" },
    take: limit,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  return stats.map((s) => ({
    userId: s.userId,
    name: `${s.user.firstName} ${s.user.lastName}`,
    email: s.user.email,
    totalSpent: Number(s.totalSpent),
    orderCount: s.orderCount,
    segment: s.segment,
  }));
}

// dayIndex matches JS Date.getDay() (0=Sun..6=Sat) - the UI localizes the weekday name from this
// index via Intl.DateTimeFormat rather than baking an English abbreviation in here.
const TIME_BLOCKS = [
  { key: "block0", startHour: 0 },
  { key: "block1", startHour: 4 },
  { key: "block2", startHour: 8 },
  { key: "block3", startHour: 12 },
  { key: "block4", startHour: 16 },
  { key: "block5", startHour: 20 },
];

/** Day-of-week x 4-hour-block grid of paid-order volume/revenue, for a sales heatmap. */
export async function getSalesHeatmap() {
  const orders = await prisma.order.findMany({
    where: { paymentStatus: "PAID" },
    select: { createdAt: true, total: true },
  });

  const grid = Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex,
    blocks: TIME_BLOCKS.map((block) => ({ key: block.key, count: 0, revenue: 0 })),
  }));

  for (const order of orders) {
    const dayIndex = order.createdAt.getDay();
    const hour = order.createdAt.getHours();
    const blockIndex = TIME_BLOCKS.findIndex((b, i) => hour >= b.startHour && (i === TIME_BLOCKS.length - 1 || hour < TIME_BLOCKS[i + 1].startHour));
    const cell = grid[dayIndex].blocks[blockIndex];
    cell.count += 1;
    cell.revenue += Number(order.total);
  }

  return grid;
}

/**
 * `OrderStatusHistory.changedById` is a plain unrelated id (no FK, see the schema comment), only
 * ever populated when an Admin/Staff member manually advances an order via updateOrderStatus() -
 * rows from syncOrderStatusFromDelivery() (driver-driven, system-synced) leave it null and are
 * excluded here, since those aren't attributable to a specific staff member's work.
 */
export async function getStaffPerformance(range?: DateRange) {
  const rows = await prisma.orderStatusHistory.findMany({
    where: { changedById: { not: null }, createdAt: dateRangeWhere(range) },
    select: { changedById: true, createdAt: true },
  });

  const staffIds = [...new Set(rows.map((r) => r.changedById as string))];
  const staffUsers = await prisma.user.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameById = new Map(staffUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  const countById = new Map<string, number>();
  const byDateById = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const staffId = r.changedById as string;
    countById.set(staffId, (countById.get(staffId) ?? 0) + 1);
    const dateKey = r.createdAt.toISOString().slice(0, 10);
    const byDate = byDateById.get(staffId) ?? new Map<string, number>();
    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1);
    byDateById.set(staffId, byDate);
  }

  const leaderboard = [...countById.entries()]
    .map(([staffId, count]) => ({ staffId, name: nameById.get(staffId) ?? "Unknown", count }))
    .sort((a, b) => b.count - a.count);

  const timeline = [...byDateById.entries()].map(([staffId, byDate]) => ({
    staffId,
    name: nameById.get(staffId) ?? "Unknown",
    points: [...byDate.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }));

  return { leaderboard, timeline };
}

const ON_TIME_THRESHOLD_HOURS = 24;

/**
 * "On-time" is defined here as delivered within a flat threshold of assignment (not derived from
 * ShippingZone estimates, which would silently drift historically if a zone's estimate is edited
 * later, and not left unbuilt) - labeled explicitly with the threshold, never an unqualified
 * "on-time %". Failed-reason breakdown reads DeliverySupportTicket.problemType (a real controlled
 * vocabulary), not DeliveryAssignment.failedReason (free text with no structure).
 */
export async function getDeliveryPerformance(range?: DateRange) {
  const assignments = await prisma.deliveryAssignment.findMany({
    where: { assignedAt: dateRangeWhere(range) },
    select: {
      driverId: true,
      status: true,
      assignedAt: true,
      deliveredAt: true,
      driver: { select: { firstName: true, lastName: true } },
    },
  });

  const byDriver = new Map<
    string,
    { name: string; total: number; delivered: number; failed: number; onTime: number; deliveryHours: number[] }
  >();
  for (const a of assignments) {
    const entry = byDriver.get(a.driverId) ?? {
      name: `${a.driver.firstName} ${a.driver.lastName}`,
      total: 0,
      delivered: 0,
      failed: 0,
      onTime: 0,
      deliveryHours: [],
    };
    entry.total++;
    if (a.status === "DELIVERED" && a.deliveredAt) {
      entry.delivered++;
      const hours = (a.deliveredAt.getTime() - a.assignedAt.getTime()) / (1000 * 60 * 60);
      entry.deliveryHours.push(hours);
      if (hours <= ON_TIME_THRESHOLD_HOURS) entry.onTime++;
    } else if (a.status === "FAILED") {
      entry.failed++;
    }
    byDriver.set(a.driverId, entry);
  }

  const leaderboard = [...byDriver.entries()]
    .map(([driverId, e]) => ({
      driverId,
      name: e.name,
      total: e.total,
      delivered: e.delivered,
      failed: e.failed,
      failedRate: e.total > 0 ? e.failed / e.total : 0,
      onTimeRate: e.delivered > 0 ? e.onTime / e.delivered : 0,
      avgDeliveryHours: e.deliveryHours.length > 0 ? e.deliveryHours.reduce((s, h) => s + h, 0) / e.deliveryHours.length : null,
    }))
    .sort((a, b) => b.delivered - a.delivered);

  const problemGroups = await prisma.deliverySupportTicket.groupBy({
    by: ["problemType"],
    where: { createdAt: dateRangeWhere(range) },
    _count: { _all: true },
  });

  return {
    leaderboard,
    onTimeThresholdHours: ON_TIME_THRESHOLD_HOURS,
    problemBreakdown: problemGroups.map((p) => ({ problemType: p.problemType, count: p._count._all })),
  };
}

/**
 * Signup-month cohorts x months-since-signup, % of each cohort with >=1 order in that offset
 * month. Uses date-fns (installed, previously unused anywhere in this codebase) for correct
 * calendar-month arithmetic rather than hand-rolled math, which is easy to get subtly wrong.
 */
export async function getCohortRetention(maxMonthsBack = 6) {
  const [users, orders] = await Promise.all([
    prisma.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true, createdAt: true } }),
    prisma.order.findMany({ select: { userId: true, createdAt: true } }),
  ]);

  const ordersByUser = new Map<string, Date[]>();
  for (const o of orders) {
    const arr = ordersByUser.get(o.userId) ?? [];
    arr.push(o.createdAt);
    ordersByUser.set(o.userId, arr);
  }

  const cohortUserIds = new Map<string, string[]>();
  const cohortStartByKey = new Map<string, Date>();
  for (const u of users) {
    const start = startOfMonth(u.createdAt);
    const key = format(start, "yyyy-MM");
    cohortStartByKey.set(key, start);
    const ids = cohortUserIds.get(key) ?? [];
    ids.push(u.id);
    cohortUserIds.set(key, ids);
  }

  const sortedKeys = [...cohortUserIds.keys()].sort();
  return sortedKeys.map((cohortKey) => {
    const userIds = cohortUserIds.get(cohortKey)!;
    const cohortStart = cohortStartByKey.get(cohortKey)!;
    const size = userIds.length;
    const points = [];
    for (let offset = 0; offset <= maxMonthsBack; offset++) {
      let active = 0;
      for (const userId of userIds) {
        const userOrders = ordersByUser.get(userId) ?? [];
        if (userOrders.some((d) => differenceInCalendarMonths(d, cohortStart) === offset)) active++;
      }
      points.push({ offset, percent: size > 0 ? active / size : 0 });
    }
    return { cohort: cohortKey, size, points };
  });
}

/**
 * Scoped to what's actually trackable today: Cart created -> Order placed -> Order paid. "Visits"
 * and "checkout started" are explicitly not built - no page-view or checkout-start instrumentation
 * exists anywhere in this codebase (checkout.ts's only Cart.status write is the CONVERTED
 * transition at completion). Recoverable-revenue total reuses /admin/abandoned-carts's exact data
 * source (Cart.status === "ABANDONED" joined to CartItem).
 *
 * Stages are counted as DISTINCT USERS, not raw rows - `Cart` is a one-row-per-user singleton
 * (`userId @unique`), while a single user can place many `Order` rows over time, so comparing raw
 * row counts produces a nonsensical >100% "conversion" between stages. Counting distinct users at
 * each stage is the only way the three numbers are actually comparable as a funnel.
 */
export async function getCartAbandonmentFunnel(range?: DateRange) {
  const createdAtWhere = dateRangeWhere(range);

  const [cartsCreated, orderUsers, paidOrderUsers, abandonedCarts] = await Promise.all([
    prisma.cart.count({ where: { createdAt: createdAtWhere } }),
    prisma.order.findMany({ where: { createdAt: createdAtWhere }, select: { userId: true }, distinct: ["userId"] }),
    prisma.order.findMany({
      where: { createdAt: createdAtWhere, paymentStatus: "PAID" },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.cart.findMany({ where: { createdAt: createdAtWhere, status: "ABANDONED" }, include: { items: true } }),
  ]);
  const ordersPlaced = orderUsers.length;
  const ordersPaid = paidOrderUsers.length;

  const recoverableRevenue = abandonedCarts.reduce(
    (sum, cart) => sum + cart.items.reduce((s, item) => s + Number(item.priceAtAdd) * item.quantity, 0),
    0,
  );

  return {
    // key drives the translated stage label in CartFunnelChart - kept as a stable identifier
    // rather than English text, since this return value is rendered directly in the admin UI.
    stages: [
      { key: "cartsCreated", count: cartsCreated },
      { key: "ordersPlaced", count: ordersPlaced },
      { key: "ordersPaid", count: ordersPaid },
    ],
    recoverableRevenue,
    abandonedCartCount: abandonedCarts.length,
  };
}

/** Orders grouped by the 7 fixed shipping cities (Order.shippingCity, already indexed). */
export async function getGeographicOrderDistribution(range?: DateRange) {
  const groups = await prisma.order.groupBy({
    by: ["shippingCity"],
    where: { createdAt: dateRangeWhere(range) },
    _count: { _all: true },
    _sum: { total: true },
  });

  return groups
    .map((g) => ({ city: g.shippingCity, count: g._count._all, revenue: Number(g._sum.total ?? 0) }))
    .sort((a, b) => b.revenue - a.revenue);
}
