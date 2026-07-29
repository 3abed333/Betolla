import Link from "next/link";
import { subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui";
import { presentStaffActivity, STAFF_FOOTPRINT_SOURCE_ACTIONS } from "@/lib/staffFootprint";

export const metadata = { title: "Staff Footprint - Betolla Admin" };

export default async function StaffFootprintPage() {
  const since = subDays(new Date(), 30);
  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
    },
  });

  const logs = staff.length
    ? await prisma.activityLog.findMany({
        where: {
          actorId: { in: staff.map((member) => member.id) },
          createdAt: { gte: since },
          action: { in: [...STAFF_FOOTPRINT_SOURCE_ACTIONS] },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const summaries = new Map<string, { count: number; latest: string | null }>();
  for (const log of logs) {
    const presentation = presentStaffActivity(log);
    if (!presentation) continue;
    const current = summaries.get(log.actorId) ?? { count: 0, latest: null };
    summaries.set(log.actorId, {
      count: current.count + 1,
      latest: current.latest ?? presentation.label,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-ink">Staff Footprint</h2>
        <p className="text-sm text-ink-muted">
          Important staff work from the last 30 days. Routine assignments and minor status changes are hidden.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {staff.map((member) => {
          const summary = summaries.get(member.id) ?? { count: 0, latest: null };
          return (
            <Link key={member.id} href={`/admin/staff-footprint/${member.id}`} className="block">
              <Card className="aspect-square transition-transform hover:-translate-y-0.5">
                <CardContent className="flex h-full flex-col justify-between">
                  <div>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cta text-lg font-semibold text-cta-foreground">
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-ink">{member.firstName} {member.lastName}</h3>
                    <p className="mt-1 break-all text-xs text-ink-muted">{member.email}</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-ink">{summary.count}</p>
                    <p className="text-xs text-ink-muted">important actions · {member.isActive ? "Active" : "Inactive"}</p>
                    {summary.latest && <p className="mt-2 truncate text-xs text-ink-muted">Latest: {summary.latest}</p>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {staff.length === 0 && <p className="text-sm text-ink-muted">No staff accounts found.</p>}
    </div>
  );
}
