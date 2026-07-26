import { z } from "zod";

// Shared by Admin editing Staff and Staff editing Delivery accounts - same shape as the
// create-side validation in account-creation.ts, just all fields optional for a partial update.
export const updateManagedAccountSchema = z.object({
  isActive: z.boolean().optional(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(30).optional(),
});
