import { z } from "zod";
import { jordanianPhoneSchema } from "./phone";

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(1).max(80),
  phone: jordanianPhoneSchema,
  city: z.string().trim().min(1).max(80),
  deliveryNotes: z.string().trim().max(300).optional(),
  isDefaultShipping: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "No address changes supplied",
);
