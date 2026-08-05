import type { Instrumentation } from "next";
import { logError, logInfo } from "@/lib/server/logger";
import { sweepAbandonedCarts } from "@/lib/server/services/abandonedCarts";

const ABANDONED_CART_SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function scheduleAbandonedCartSweep() {
  sweepAbandonedCarts()
    .then((count) => {
      if (count > 0) logInfo("abandoned_carts_swept", { count });
    })
    .catch((error) => logError("abandoned_carts_sweep_failed", error))
    .finally(() => {
      setTimeout(scheduleAbandonedCartSweep, ABANDONED_CART_SWEEP_INTERVAL_MS).unref();
    });
}

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    logInfo("application_started", { runtime: "nodejs", environment: process.env.NODE_ENV });
    // Every PM2 worker runs its own copy of this timer - the underlying UPDATE is a single cheap,
    // idempotent, indexed WHERE clause, so redundant runs across workers are harmless. Not worth a
    // distributed (e.g. Redis) lock for a maintenance job this low-stakes.
    scheduleAbandonedCartSweep();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  logError("unhandled_request_error", error, {
    method: request.method,
    path: request.path.split("?")[0],
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
};
