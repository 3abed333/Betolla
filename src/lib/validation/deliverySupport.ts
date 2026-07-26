import { z } from "zod";
import { PROBLEM_TYPE_OPTIONS } from "@/lib/deliverySupport";

export const createReportSchema = z
  .object({
    problemType: z.enum(PROBLEM_TYPE_OPTIONS),
    description: z.string().trim().max(2000).optional(),
    photoUrl: z.string().trim().optional(),
    urgency: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
    deliveryAssignmentId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.problemType === "OTHER" && !data.description?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["description"],
        message: "Description is required when problem type is Other",
      });
    }
  });

export const reportStatusSchema = z.object({
  status: z.enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  // nullable (not just optional): the client sends `null` to explicitly clear a previously-set
  // note. Prisma treats `undefined` as "don't touch this field" but `null` as "set it to NULL" -
  // without `.nullable()` here, a genuine clear-the-note request would fail validation instead of
  // persisting.
  staffNote: z.string().trim().max(2000).nullable().optional(),
});

export const reportAssignSchema = z.object({
  assignedToId: z.string().min(1).nullable(),
});
