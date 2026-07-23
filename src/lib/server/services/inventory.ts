import "server-only";
import { prisma } from "@/lib/db";

export const DEFAULT_LOW_STOCK_THRESHOLD = 15;

export function isLowStock(product: { stock: number; lowStockThreshold: number | null }) {
  return product.stock <= (product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
}

export async function getLowStockProducts() {
  const products = await prisma.product.findMany({ where: { isActive: true } });
  return products.filter(isLowStock);
}
