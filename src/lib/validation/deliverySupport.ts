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
  staffNote: z.string().trim().max(2000).optional(),
});

export const reportAssignSchema = z.object({
  assignedToId: z.string().min(1).nullable(),
});
