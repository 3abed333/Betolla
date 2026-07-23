import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { toCsv } from "@/lib/csv";
import type { Prisma, OrderStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status as OrderStatus;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { user: { firstName: { contains: q, mode: "insensitive" } } },
      { user: { lastName: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true, email: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    orders.map((o) => ({
      orderNumber: o.orderNumber,
      customerName: `${o.user.firstName} ${o.user.lastName}`,
      email: o.user.email,
      status: o.status,
      paymentStatus: o.paymentStatus,
      itemCount: o.items.length,
      subtotal: o.subtotal.toString(),
      discountTotal: o.discountTotal.toString(),
      shippingFee: o.shippingFee.toString(),
      total: o.total.toString(),
      createdAt: o.createdAt.toISOString(),
    })),
    [
      { key: "orderNumber", header: "Order Number" },
      { key: "customerName", header: "Customer" },
      { key: "email", header: "Email" },
      { key: "status", header: "Status" },
      { key: "paymentStatus", header: "Payment Status" },
      { key: "itemCount", header: "Items" },
      { key: "subtotal", header: "Subtotal (JD)" },
      { key: "discountTotal", header: "Discount (JD)" },
      { key: "shippingFee", header: "Shipping (JD)" },
      { key: "total", header: "Total (JD)" },
      { key: "createdAt", header: "Placed At" },
    ],
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-export.csv"`,
    },
  });
}
