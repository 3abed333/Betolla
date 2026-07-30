import type { Metadata } from "next";
import { Playfair_Display, Inter, Cairo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import { dirForLocale, type AppLocale } from "@/i18n/config";
import { THEME_COOKIE } from "@/lib/theme/config";
import { Toaster } from "@/components/Toaster";
import { QueryProvider } from "@/components/QueryProvider";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Betolla Cosmetics",
  description: "Betolla Cosmetics - elegant skincare, makeup and fragrance.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as AppLocale;
  const messages = await getMessages();
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value;
  const themeClass = theme === "dark" ? "dark" : theme === "gold" ? "gold" : "";

  return (
    <html
      lang={locale}
      dir={dirForLocale(locale)}
      className={`${playfair.variable} ${inter.variable} ${cairo.variable} h-full antialiased ${themeClass}`}
      // Theme/locale are rendered from cookies; suppress extension-injected root attributes.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-surface text-ink font-sans">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
