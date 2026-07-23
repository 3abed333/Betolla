import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createReviewSchema } from "@/lib/validation/review";
import { createReview, ReviewError } from "@/lib/server/services/reviews";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Only customers can leave reviews" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const review = await createReview({ userId: session.userId, ...parsed.data });
    return NextResponse.json({ review });
  } catch (err) {
    if (err instanceof ReviewError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
