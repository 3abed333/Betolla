"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Checkbox, Input, Textarea } from "@/components/ui";
import { toast } from "@/lib/toast";

type Settings = {
  whatsapp: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
};
type StaticPageData = {
  type: "PRIVACY_POLICY" | "ABOUT_US";
  titleEn: string;
  titleAr: string;
  contentHtmlEn: string;
  contentHtmlAr: string;
  isPublished: boolean;
};
type FaqData = {
  id: string;
  questionEn: string;
  questionAr: string;
  answerHtmlEn: string;
  answerHtmlAr: string;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY_FAQ = {
  questionEn: "",
  questionAr: "",
  answerHtmlEn: "",
  answerHtmlAr: "",
  sortOrder: 0,
  isActive: true,
};

function HtmlNote() {
  return <p className="text-xs text-ink-muted">Safe HTML is supported. Scripts, iframes, forms, event handlers, and unsafe URL schemes are removed on the server.</p>;
}

export function SiteContentManagementClient({
  settings: initialSettings,
  staticPages,
  faqs,
}: {
  settings: Settings;
  staticPages: StaticPageData[];
  faqs: FaqData[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [pages, setPages] = useState<Record<StaticPageData["type"], Omit<StaticPageData, "type">>>({
    PRIVACY_POLICY: staticPages.find((page) => page.type === "PRIVACY_POLICY") ?? {
      titleEn: "Privacy Policy",
      titleAr: "سياسة الخصوصية",
      contentHtmlEn: "<p>Add your privacy policy here.</p>",
      contentHtmlAr: "<p>أضف سياسة الخصوصية هنا.</p>",
      isPublished: true,
    },
    ABOUT_US: staticPages.find((page) => page.type === "ABOUT_US") ?? {
      titleEn: "About Us",
      titleAr: "من نحن",
      contentHtmlEn: "<p>Tell customers about Betolla.</p>",
      contentHtmlAr: "<p>أخبر العملاء عن بيتولا.</p>",
      isPublished: true,
    },
  });
  const [faqId, setFaqId] = useState<string | null>(null);
  const [faq, setFaq] = useState(EMPTY_FAQ);

  async function request(url: string, method: string, body: unknown, success: string) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error("Could not save", data.error);
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  }

  async function saveSettings() {
    await request("/api/content/site-settings", "PATCH", settings, "Contact and social links updated");
  }

  async function savePage(type: StaticPageData["type"]) {
    await request(
      `/api/content/static-pages/${type}`,
      "PUT",
      pages[type],
      `${type === "PRIVACY_POLICY" ? "Privacy policy" : "About page"} updated`,
    );
  }

  function editFaq(item: FaqData) {
    setFaqId(item.id);
    setFaq({
      questionEn: item.questionEn,
      questionAr: item.questionAr,
      answerHtmlEn: item.answerHtmlEn,
      answerHtmlAr: item.answerHtmlAr,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  }

  async function saveFaq() {
    const ok = await request(
      faqId ? `/api/content/faqs/${faqId}` : "/api/content/faqs",
      faqId ? "PATCH" : "POST",
      faq,
      faqId ? "FAQ updated" : "FAQ created",
    );
    if (ok) {
      setFaqId(null);
      setFaq(EMPTY_FAQ);
    }
  }

  async function deleteFaq(item: FaqData) {
    if (!window.confirm(`Permanently delete “${item.questionEn}”?`)) return;
    const response = await fetch(`/api/content/faqs/${item.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error("Could not delete FAQ", data.error);
    toast.success("FAQ deleted");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h3 className="font-heading text-xl font-semibold text-ink">Contact and social links</h3>
            <p className="text-sm text-ink-muted">Leave a field empty to hide that footer icon. WhatsApp accepts the international number, for example +9627...</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="WhatsApp number" value={settings.whatsapp ?? ""} onChange={(event) => setSettings({ ...settings, whatsapp: event.target.value })} />
            <Input label="Instagram URL" value={settings.instagramUrl ?? ""} onChange={(event) => setSettings({ ...settings, instagramUrl: event.target.value })} />
            <Input label="Facebook URL" value={settings.facebookUrl ?? ""} onChange={(event) => setSettings({ ...settings, facebookUrl: event.target.value })} />
            <Input label="LinkedIn URL" value={settings.linkedinUrl ?? ""} onChange={(event) => setSettings({ ...settings, linkedinUrl: event.target.value })} />
          </div>
          <Button type="button" className="w-fit" onClick={saveSettings}>Save links</Button>
        </CardContent>
      </Card>

      {(["PRIVACY_POLICY", "ABOUT_US"] as const).map((type) => {
        const page = pages[type];
        return (
          <Card key={type}>
            <CardContent className="flex flex-col gap-4">
              <div>
                <h3 className="font-heading text-xl font-semibold text-ink">{type === "PRIVACY_POLICY" ? "Privacy policy" : "About us"}</h3>
                <HtmlNote />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="English title" value={page.titleEn} onChange={(event) => setPages({ ...pages, [type]: { ...page, titleEn: event.target.value } })} />
                <Input label="Arabic title" dir="rtl" value={page.titleAr} onChange={(event) => setPages({ ...pages, [type]: { ...page, titleAr: event.target.value } })} />
                <Textarea className="font-mono" rows={12} label="English HTML" value={page.contentHtmlEn} onChange={(event) => setPages({ ...pages, [type]: { ...page, contentHtmlEn: event.target.value } })} />
                <Textarea className="font-mono" rows={12} label="Arabic HTML" dir="rtl" value={page.contentHtmlAr} onChange={(event) => setPages({ ...pages, [type]: { ...page, contentHtmlAr: event.target.value } })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink">
                <Checkbox checked={page.isPublished} onCheckedChange={(checked) => setPages({ ...pages, [type]: { ...page, isPublished: checked === true } })} />
                Published
              </label>
              <Button type="button" className="w-fit" onClick={() => savePage(type)}>Save page</Button>
            </CardContent>
          </Card>
        );
      })}

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-heading text-2xl font-semibold text-ink">Frequently asked questions</h3>
          <p className="text-sm text-ink-muted">Lower sort numbers appear first.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h4 className="font-medium text-ink">{faqId ? "Edit FAQ" : "New FAQ"}</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="English question" value={faq.questionEn} onChange={(event) => setFaq({ ...faq, questionEn: event.target.value })} />
              <Input label="Arabic question" dir="rtl" value={faq.questionAr} onChange={(event) => setFaq({ ...faq, questionAr: event.target.value })} />
              <Textarea className="font-mono" rows={8} label="English answer HTML" value={faq.answerHtmlEn} onChange={(event) => setFaq({ ...faq, answerHtmlEn: event.target.value })} />
              <Textarea className="font-mono" rows={8} label="Arabic answer HTML" dir="rtl" value={faq.answerHtmlAr} onChange={(event) => setFaq({ ...faq, answerHtmlAr: event.target.value })} />
            </div>
            <Input className="max-w-40" label="Sort order" type="number" min={0} value={faq.sortOrder} onChange={(event) => setFaq({ ...faq, sortOrder: Number(event.target.value) })} />
            <label className="flex items-center gap-2 text-sm text-ink">
              <Checkbox checked={faq.isActive} onCheckedChange={(checked) => setFaq({ ...faq, isActive: checked === true })} />
              Visible to customers
            </label>
            <div className="flex gap-2">
              <Button type="button" onClick={saveFaq}>{faqId ? "Save changes" : "Add FAQ"}</Button>
              {faqId && <Button type="button" variant="outline" onClick={() => { setFaqId(null); setFaq(EMPTY_FAQ); }}>Cancel</Button>}
            </div>
          </CardContent>
        </Card>
        {faqs.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">{item.questionEn}</p>
                <p className="text-sm text-ink-muted">Order {item.sortOrder} · {item.isActive ? "Visible" : "Hidden"}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => editFaq(item)}>Edit</Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => deleteFaq(item)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
