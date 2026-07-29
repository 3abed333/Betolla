import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(4000),
  orderId: z.string().min(1).optional(),
});

export const createMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  isInternalNote: z.boolean().optional(),
});

export const ticketStatusSchema = z.object({
  status: z.enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export const ticketAssignSchema = z.object({
  assignedToId: z.string().min(1).nullable(),
});
