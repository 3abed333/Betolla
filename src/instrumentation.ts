import type { Instrumentation } from "next";
import { logError, logInfo } from "@/lib/server/logger";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    logInfo("application_started", { runtime: "nodejs", environment: process.env.NODE_ENV });
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
