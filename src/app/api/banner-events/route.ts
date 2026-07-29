import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  bannerId: z.string().min(1).max(100),
  type: z.enum(["IMPRESSION", "CLICK"]),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const exists = await prisma.banner.findUnique({ where: { id: parsed.data.bannerId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Banner not found" }, { status: 404 });

  const visitorId = request.cookies.get("betolla_visitor")?.value ?? randomUUID();
  const dateKey = new Date().toISOString().slice(0, 10);
  await prisma.bannerEvent.upsert({
    where: { bannerId_type_visitorId_dateKey: { ...parsed.data, visitorId, dateKey } },
    create: { ...parsed.data, visitorId, dateKey },
    update: {},
  });
  const response = NextResponse.json({ ok: true });
  if (!request.cookies.has("betolla_visitor")) {
    response.cookies.set("betolla_visitor", visitorId, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/",
    });
  }
  return response;
}
