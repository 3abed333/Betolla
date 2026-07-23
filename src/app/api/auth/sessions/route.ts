import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentSession, listActiveSessions, revokeSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sessions = await listActiveSessions(session.userId);
  return NextResponse.json({
    currentSessionId: session.sessionId,
    sessions: sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.id === session.sessionId,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { sessionId } = await request.json().catch(() => ({ sessionId: null }));
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  await revokeSession(session.userId, sessionId);
  return NextResponse.json({ ok: true });
}
