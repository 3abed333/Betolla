import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db";
import { readPrivateUpload } from "@/lib/server/storage";

// Delivery-report photos are internal (a driver's "Report a Problem" attachment) - unlike
// products/avatars/reviews, which are meant to be publicly visible, these files live outside
// public/ entirely (see storage.ts) and are only ever reachable through this route. Admin/Staff
// can view any report's photo; a Delivery session can only view a photo attached to a report they
// themselves filed - same ownership-scoping convention used everywhere else in this app.
export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF", "DELIVERY");
  if (session instanceof NextResponse) return session;
  const { filename } = await params;

  if (session.role === "DELIVERY") {
    const owns = await prisma.deliverySupportTicket.findFirst({
      where: { driverId: session.userId, photoUrl: `/api/uploads/delivery-reports/${filename}` },
      select: { id: true },
    });
    if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await readPrivateUpload("delivery-reports", filename);
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
