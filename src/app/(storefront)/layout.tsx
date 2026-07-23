import { StorefrontHeader } from "./StorefrontHeader";
import { StorefrontFooter } from "./StorefrontFooter";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <StorefrontHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      <StorefrontFooter />
    </div>
  );
}
