import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { toCsv } from "@/lib/csv";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.user.findMany({ where, include: { customerStats: true } });

  const csv = toCsv(
    customers.map((c) => ({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      username: c.username,
      phone: c.phone ?? "",
      orderCount: c.customerStats?.orderCount ?? 0,
      totalSpent: (c.customerStats?.totalSpent ?? 0).toString(),
      storeCreditBalance: c.storeCreditBalance.toString(),
      loyaltyPointsBalance: c.loyaltyPointsBalance,
      segment: c.customerStats?.segment ?? "",
      isActive: c.isActive ? "Active" : "Inactive",
      joinedAt: c.createdAt.toISOString(),
    })),
    [
      { key: "firstName", header: "First Name" },
      { key: "lastName", header: "Last Name" },
      { key: "email", header: "Email" },
      { key: "username", header: "Username" },
      { key: "phone", header: "Phone" },
      { key: "orderCount", header: "Orders" },
      { key: "totalSpent", header: "Total Spent (JD)" },
      { key: "storeCreditBalance", header: "Store Credit (JD)" },
      { key: "loyaltyPointsBalance", header: "Loyalty Points" },
      { key: "segment", header: "RFM Segment" },
      { key: "isActive", header: "Status" },
      { key: "joinedAt", header: "Joined At" },
    ],
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-export.csv"`,
    },
  });
}
