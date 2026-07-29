import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) });

export async function PATCH(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid banner order" }, { status: 400 });
  await prisma.$transaction(parsed.data.ids.map((id, sortOrder) => prisma.banner.update({ where: { id }, data: { sortOrder } })));
  return NextResponse.json({ ok: true });
}
