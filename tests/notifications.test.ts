import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";

// Exercises the same Prisma primitives notify() and the notification list/unread-count queries
// use (channel filtering, the [userId, channel, eventKey] unique constraint) against the local
// dev database, without importing the "server-only"-guarded service module directly.

async function createTestUser() {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `notif-test-${suffix}@betolla.test`,
      username: `notif_test_${suffix}`,
      passwordHash: "not-a-real-hash",
      role: "CUSTOMER",
      firstName: "Notif",
      lastName: "Test",
    },
  });
}

test("a single logical event notified across 3 channels shows as one IN_APP row", async () => {
  const user = await createTestUser();
  try {
    await prisma.notification.createMany({
      data: (["IN_APP", "EMAIL", "SMS"] as const).map((channel) => ({
        userId: user.id,
        category: "ORDER_UPDATES",
        channel,
        title: "Order placed",
        body: "We've received your order.",
        eventKey: "order:test-1:placed",
      })),
      skipDuplicates: true,
    });

    const all = await prisma.notification.findMany({ where: { userId: user.id } });
    assert.equal(all.length, 3, "all 3 channel rows are written");

    const inApp = await prisma.notification.findMany({ where: { userId: user.id, channel: "IN_APP" } });
    assert.equal(inApp.length, 1, "the IN_APP-filtered list shows exactly one message");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("unread counts exclude EMAIL/SMS/PUSH delivery records", async () => {
  const user = await createTestUser();
  try {
    await prisma.notification.createMany({
      data: (["IN_APP", "EMAIL", "SMS"] as const).map((channel) => ({
        userId: user.id,
        category: "ORDER_UPDATES",
        channel,
        title: "Order placed",
        body: "We've received your order.",
        eventKey: "order:test-2:placed",
      })),
    });

    const unreadTotal = await prisma.notification.count({ where: { userId: user.id, isRead: false } });
    const unreadInApp = await prisma.notification.count({
      where: { userId: user.id, channel: "IN_APP", isRead: false },
    });
    assert.equal(unreadTotal, 3);
    assert.equal(unreadInApp, 1, "unread badge count must only include IN_APP rows");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("retrying the same logical event does not create a duplicate IN_APP record", async () => {
  const user = await createTestUser();
  try {
    const eventKey = "order:test-3:status:CONFIRMED";
    for (let attempt = 0; attempt < 2; attempt++) {
      await prisma.notification.createMany({
        data: [
          { userId: user.id, category: "ORDER_UPDATES", channel: "IN_APP" as const, title: "Order confirmed", body: "x", eventKey },
        ],
        skipDuplicates: true,
      });
    }
    const rows = await prisma.notification.findMany({ where: { userId: user.id, channel: "IN_APP" } });
    assert.equal(rows.length, 1, "a retried notify() call with the same eventKey is a no-op");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("different events for the same order remain distinct IN_APP records", async () => {
  const user = await createTestUser();
  try {
    await prisma.notification.createMany({
      data: [
        { userId: user.id, category: "ORDER_UPDATES", channel: "IN_APP" as const, title: "Order placed", body: "x", eventKey: "order:test-4:placed" },
        { userId: user.id, category: "ORDER_UPDATES", channel: "IN_APP" as const, title: "Order confirmed", body: "x", eventKey: "order:test-4:status:CONFIRMED" },
        { userId: user.id, category: "ORDER_UPDATES", channel: "IN_APP" as const, title: "Order delivered", body: "x", eventKey: "order:test-4:status:DELIVERED" },
      ],
      skipDuplicates: true,
    });
    const rows = await prisma.notification.findMany({ where: { userId: user.id, channel: "IN_APP" } });
    assert.equal(rows.length, 3, "placed/confirmed/delivered are legitimately separate messages");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});
