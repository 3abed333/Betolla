// Mirrors prisma/seed-data/shipping-zones.ts's cityEn/cityAr pairs - kept as a static lookup
// (not a DB read) since Address.city/Order.shippingCity are only ever one of these 7 values
// in practice (constrained client-side by AddressFormDialog.tsx's JORDAN_CITIES select).
export const CITY_AR: Record<string, string> = {
  Amman: "عمّان",
  Zarqa: "الزرقاء",
  Irbid: "إربد",
  Russeifa: "الرصيفة",
  Aqaba: "العقبة",
  "As-Salt": "السلط",
  Mafraq: "المفرق",
};

export function localizedCity(cityEn: string, locale: "en" | "ar"): string {
  return locale === "ar" ? (CITY_AR[cityEn] ?? cityEn) : cityEn;
}
