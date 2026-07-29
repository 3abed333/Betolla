import Link from "next/link";
import { notFound } from "next/navigation";
import { subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { presentStaffActivity, STAFF_FOOTPRINT_SOURCE_ACTIONS } from "@/lib/staffFootprint";

function validDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export default async function StaffFootprintDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activity?: string; from?: string; to?: string }>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const member = await prisma.user.findFirst({
    where: { id, role: "STAFF" },
    select: { id: true, firstName: true, lastName: true, email: true, isActive: true },
  });
  if (!member) notFound();

  const now = new Date();
  const from = validDate(filters.from, subDays(now, 30));
  const toBase = validDate(filters.to, now);
  const to = new Date(toBase);
  to.setHours(23, 59, 59, 999);

  const rawLogs = await prisma.activityLog.findMany({
    where: {
      actorId: id,
      createdAt: { gte: from, lte: to },
      action: { in: [...STAFF_FOOTPRINT_SOURCE_ACTIONS] },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const presented = rawLogs
    .map((log) => ({ log, presentation: presentStaffActivity(log) }))
    .filter((entry): entry is typeof entry & { presentation: NonNullable<typeof entry.presentation> } => Boolean(entry.presentation));
  const availableFilters = [...new Map(presented.map(({ presentation }) => [
    presentation.filterKey,
    presentation.label,
  ])).entries()].sort((left, right) => left[1].localeCompare(right[1]));
  const selectedActivity = availableFilters.some(([key]) => key === filters.activity) ? filters.activity : "";
  const logs = presented
    .filter(({ presentation }) => !selectedActivity || presentation.filterKey === selectedActivity)
    .slice(0, 500);

  const dateValue = (date: Date) => date.toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm"><Link href="/admin/staff-footprint">← All staff</Link></Button>
        <h2 className="mt-3 font-heading text-2xl font-semibold text-ink">{member.firstName} {member.lastName}</h2>
        <p className="text-sm text-ink-muted">{member.email} · {member.isActive ? "Active" : "Inactive"}</p>
      </div>
      <Card>
        <CardContent>
          <form className="grid items-end gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-ink" htmlFor="activity">What the staff member did</label>
              <select
                id="activity"
                name="activity"
                defaultValue={selectedActivity}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
              >
                <option value="">All important work</option>
                {availableFilters.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <Input label="From" name="from" type="date" defaultValue={dateValue(from)} />
            <Input label="To" name="to" type="date" defaultValue={dateValue(toBase)} />
            <Button type="submit">Apply filters</Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-sm text-ink-muted">
        {logs.length} important action{logs.length === 1 ? "" : "s"}
        {presented.length > 500 ? " (maximum 500 shown)" : ""}
      </p>
      <div className="flex flex-col gap-3">
        {logs.map(({ log, presentation }) => (
          <Card key={log.id}>
            <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{presentation.label}</p>
                  <p className="mt-1 text-sm text-ink-muted">{presentation.description}</p>
                </div>
                <time className="text-xs text-ink-muted">{log.createdAt.toLocaleString("en-JO")}</time>
              </div>
              {presentation.details.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-ink-muted">
                  {presentation.details.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              )}
              {presentation.href && (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={presentation.href}>Review this record</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {logs.length === 0 && <p className="text-sm text-ink-muted">No important work matches these filters.</p>}
      </div>
    </div>
  );
}
