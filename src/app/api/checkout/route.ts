import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { checkoutSchema } from "@/lib/validation/checkout";
import { placeOrder, CheckoutError } from "@/lib/server/services/checkout";
import { createRequestId } from "@/lib/server/request-id";
import { logError, logInfo, logWarn } from "@/lib/server/logger";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const respond = (body: object, status = 200) =>
    NextResponse.json(body, { status, headers: { "X-Request-Id": requestId } });
  try {
    const session = await getCurrentSession();
    if (!session) {
      logWarn("checkout_unauthenticated", { requestId });
      return respond({ error: "Not authenticated" }, 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      logWarn("checkout_invalid_request", {
        requestId,
        userId: session.userId,
        validationCode: parsed.error.issues[0].code,
      });
      return respond({ error: parsed.error.issues[0].message }, 400);
    }

    const order = await placeOrder(session.userId, parsed.data);
    logInfo("checkout_succeeded", {
      requestId,
      userId: session.userId,
      orderId: order.id,
      paymentMethod: "CASH_ON_DELIVERY",
    });
    return respond({ orderId: order.id, orderNumber: order.orderNumber });
  } catch (error) {
    if (error instanceof CheckoutError) {
      logWarn("checkout_rejected", { requestId, reason: error.message });
      return respond({ error: error.message }, 400);
    }
    logError("checkout_failed", error, { requestId });
    return respond({ error: "Unable to place the order right now. Please try again." }, 500);
  }
}
