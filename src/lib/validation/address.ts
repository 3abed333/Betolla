import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(20),
  city: z.string().trim().min(1),
  area: z.string().trim().min(1).max(80),
  street: z.string().trim().min(1).max(120),
  buildingInfo: z.string().trim().max(120).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefaultShipping: z.boolean().optional(),
});
