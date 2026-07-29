import "server-only";
import type { NextRequest } from "next/server";

/**
 * Forwarding headers are attacker-controlled unless the deployment is explicitly behind a
 * trusted reverse proxy that overwrites them. With no trusted proxy configured, all direct
 * traffic shares a conservative key and account/email keys provide the finer-grained limit.
 */
export function getClientIp(request: NextRequest) {
  if (process.env.TRUST_PROXY !== "true") return "direct";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || real;
  return candidate && /^[0-9a-fA-F:.]{3,45}$/.test(candidate) ? candidate : "proxy-unknown";
}
