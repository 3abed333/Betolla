import "server-only";
import type { NextRequest } from "next/server";

export function isFormSubmission(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  return (
    contentType.startsWith("application/x-www-form-urlencoded") ||
    contentType.startsWith("multipart/form-data")
  );
}

export async function readJsonOrFormBody(request: NextRequest): Promise<unknown> {
  if (isFormSubmission(request)) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }
  return request.json().catch(() => null);
}
