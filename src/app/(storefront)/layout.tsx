import { StorefrontHeader } from "./StorefrontHeader";
import { StorefrontFooter } from "./StorefrontFooter";
import { StorefrontPopup } from "@/components/StorefrontPopup";
import { getEligiblePopupCampaigns } from "@/lib/server/popupEligibility";
import { getSiteSettings } from "@/lib/server/storefrontCache";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [settings, popups] = await Promise.all([
    getSiteSettings(),
    getEligiblePopupCampaigns(),
  ]);
  return (
    <div className="flex flex-1 flex-col">
      <StorefrontHeader whatsapp={settings?.whatsapp ?? null} />
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <StorefrontFooter settings={settings} />
      <StorefrontPopup popups={popups} />
    </div>
  );
}
