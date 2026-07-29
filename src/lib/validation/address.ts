import { z } from "zod";
import { jordanianPhoneSchema } from "./phone";

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(1).max(80),
  phone: jordanianPhoneSchema,
  city: z.string().trim().min(1).max(80),
  area: z.string().trim().min(1).max(80),
  street: z.string().trim().min(1).max(120),
  buildingInfo: z.string().trim().max(120).optional(),
  floor: z.string().trim().max(20).optional(),
  apartmentNo: z.string().trim().max(20).optional(),
  landmark: z.string().trim().max(120).optional(),
  deliveryNotes: z.string().trim().max(300).optional(),
  isDefaultShipping: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "No address changes supplied",
);
