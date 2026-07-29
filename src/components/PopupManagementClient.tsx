"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Card, CardContent, Checkbox, Input, Textarea } from "@/components/ui";
import {
  getPopupTemplate,
  getPopupTrigger,
  getPopupAudience,
  getPopupSegment,
  POPUP_AUDIENCE_OPTIONS,
  POPUP_SEGMENT_OPTIONS,
  POPUP_TEMPLATE_OPTIONS,
  POPUP_TRIGGER_OPTIONS,
  type PopupTemplateValue,
  type PopupTriggerValue,
  type PopupAudienceValue,
  type PopupSegmentValue,
} from "@/lib/popupCampaigns";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

type PopupData = {
  id: string;
  name: string;
  template: string;
  trigger: string;
  audienceType: string;
  customerSegment: string;
  imageUrl: string | null;
  titleEn: string;
  titleAr: string;
  announcementEn: string | null;
  announcementAr: string | null;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  ctaLabelEn: string | null;
  ctaLabelAr: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

type PopupDraft = {
  name: string;
  template: PopupTemplateValue;
  trigger: PopupTriggerValue;
  audienceType: PopupAudienceValue;
  customerSegment: PopupSegmentValue;
  imageUrl: string;
  titleEn: string;
  titleAr: string;
  announcementEn: string;
  announcementAr: string;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  ctaLabelEn: string;
  ctaLabelAr: string;
  ctaUrl: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

const EMPTY_POPUP: PopupDraft = {
  name: "",
  template: "ANNOUNCEMENT",
  trigger: "ANY_STOREFRONT_PAGE",
  audienceType: "EVERYONE",
  customerSegment: "ALL",
  imageUrl: "",
  titleEn: "",
  titleAr: "",
  announcementEn: "",
  announcementAr: "",
  bodyHtmlEn: "",
  bodyHtmlAr: "",
  ctaLabelEn: "",
  ctaLabelAr: "",
  ctaUrl: "",
  isActive: false,
  startsAt: "",
  endsAt: "",
};

function hasWrittenContent(popup: PopupDraft) {
  return Boolean(
    popup.titleEn ||
      popup.titleAr ||
      popup.announcementEn ||
      popup.announcementAr ||
      popup.bodyHtmlEn ||
      popup.bodyHtmlAr ||
      popup.ctaLabelEn ||
      popup.ctaLabelAr,
  );
}

export function PopupManagementClient({ popups }: { popups: PopupData[] }) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [popupId, setPopupId] = useState<string | null>(null);
  const [popup, setPopup] = useState<PopupDraft>(EMPTY_POPUP);
  const [uploading, setUploading] = useState(false);
  const selectedTemplate = getPopupTemplate(popup.template);

  function openNewPopup() {
    setPopupId(null);
    setPopup(EMPTY_POPUP);
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function editPopup(item: PopupData) {
    setPopupId(item.id);
    setPopup({
      name: item.name,
      template: item.template as PopupTemplateValue,
      trigger: item.trigger as PopupTriggerValue,
      audienceType: item.audienceType as PopupAudienceValue,
      customerSegment: item.customerSegment as PopupSegmentValue,
      imageUrl: item.imageUrl ?? "",
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      announcementEn: item.announcementEn ?? "",
      announcementAr: item.announcementAr ?? "",
      bodyHtmlEn: item.bodyHtmlEn,
      bodyHtmlAr: item.bodyHtmlAr,
      ctaLabelEn: item.ctaLabelEn ?? "",
      ctaLabelAr: item.ctaLabelAr ?? "",
      ctaUrl: item.ctaUrl ?? "",
      isActive: item.isActive,
      startsAt: item.startsAt?.slice(0, 16) ?? "",
      endsAt: item.endsAt?.slice(0, 16) ?? "",
    });
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function applyTemplate(templateValue: PopupTemplateValue) {
    if (hasWrittenContent(popup) && !window.confirm("Replace the current popup wording with this template's starter wording?")) {
      return;
    }
    const template = getPopupTemplate(templateValue);
    setPopup((current) => ({
      ...current,
      template: templateValue,
      ...template.defaults,
    }));
  }

  async function uploadImage(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Unsupported image", "Choose a JPEG, PNG or WebP image.");
    }
    if (file.size > 8 * 1024 * 1024) {
      return toast.error("Image is too large", "The maximum upload size is 8 MB.");
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subfolder", "popups");
    const response = await fetch("/api/uploads", { method: "POST", body: formData });
    const data = await response.json().catch(() => ({}));
    setUploading(false);
    if (!response.ok) return toast.error("Image upload failed", data.error);
    setPopup((current) => ({ ...current, imageUrl: data.url }));
    toast.success("Popup image uploaded");
  }

  async function savePopup() {
    const payload = {
      ...popup,
      imageUrl: popup.imageUrl || null,
      startsAt: popup.startsAt ? new Date(popup.startsAt).toISOString() : null,
      endsAt: popup.endsAt ? new Date(popup.endsAt).toISOString() : null,
    };
    const response = await fetch(popupId ? `/api/content/popups/${popupId}` : "/api/content/popups", {
      method: popupId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error("Could not save popup", data.error);
    toast.success(popupId ? "Popup updated" : "Popup created");
    setPopupId(null);
    setPopup(EMPTY_POPUP);
    router.refresh();
  }

  async function deletePopup(item: PopupData) {
    if (!window.confirm(`Permanently delete popup “${item.name}”?`)) return;
    const response = await fetch(`/api/content/popups/${item.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error("Could not delete popup", data.error);
    toast.success("Popup deleted");
    if (popupId === item.id) {
      setPopupId(null);
      setPopup(EMPTY_POPUP);
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-3xl font-semibold text-ink">Customer popups</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">
            Create multiple campaigns, choose exactly where each one appears, schedule it and activate it when ready.
            The newest matching active campaign is shown once per browser session.
          </p>
        </div>
        <Button type="button" onClick={openNewPopup}>Create new popup</Button>
      </div>

      <section aria-labelledby="campaign-list-heading">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="campaign-list-heading" className="font-heading text-xl font-semibold text-ink">Campaigns</h3>
          <span className="text-sm text-ink-muted">{popups.length} total</span>
        </div>
        {popups.length === 0 ? (
          <Card><CardContent><p className="text-sm text-ink-muted">No popup campaigns yet. Create your first campaign below.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {popups.map((item) => {
              const template = getPopupTemplate(item.template);
              const trigger = getPopupTrigger(item.trigger);
              return (
                <Card key={item.id}>
                  <CardContent className="flex h-full flex-col gap-4">
                    <div className="flex gap-4">
                      {item.imageUrl ? (
                        <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg border border-border">
                          <Image src={item.imageUrl} alt="" fill sizes="128px" className="object-cover" />
                        </div>
                      ) : (
                        <div className={cn("flex aspect-video w-32 shrink-0 items-center justify-center rounded-lg border text-2xl font-semibold", template.previewClass)}>
                          {template.icon}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate font-semibold text-ink">{item.name}</h4>
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", item.isActive ? "bg-success/15 text-success" : "bg-surface-secondary text-ink-muted")}>
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-muted">{template.label}</p>
                        <p className="mt-1 text-xs text-ink-muted">{trigger.label}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {getPopupAudience(item.audienceType).label} · {getPopupSegment(item.customerSegment).label}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => editPopup(item)}>Edit</Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => deletePopup(item)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Card>
        <CardContent ref={editorRef} className="flex scroll-mt-6 flex-col gap-6">
          <div>
            <h3 className="font-heading text-2xl font-semibold text-ink">{popupId ? "Edit popup" : "Create a popup"}</h3>
            <p className="text-sm text-ink-muted">Start with a design below, then replace the starter wording with your campaign.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Internal campaign name" placeholder="Example: August skincare sale" value={popup.name} onChange={(event) => setPopup({ ...popup, name: event.target.value })} />
            <div>
              <label htmlFor="popup-trigger" className="text-sm font-medium text-ink">When should it appear?</label>
              <select
                id="popup-trigger"
                value={popup.trigger}
                onChange={(event) => setPopup({ ...popup, trigger: event.target.value as PopupTriggerValue })}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cta"
              >
                {POPUP_TRIGGER_OPTIONS.map((trigger) => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-ink-muted">{getPopupTrigger(popup.trigger).description}</p>
            </div>
            <div>
              <label htmlFor="popup-audience" className="text-sm font-medium text-ink">Who should see it?</label>
              <select
                id="popup-audience"
                value={popup.audienceType}
                onChange={(event) => setPopup({ ...popup, audienceType: event.target.value as PopupAudienceValue })}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cta"
              >
                {POPUP_AUDIENCE_OPTIONS.map((audience) => <option key={audience.value} value={audience.value}>{audience.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-ink-muted">{getPopupAudience(popup.audienceType).description}</p>
            </div>
            <div>
              <label htmlFor="popup-segment" className="text-sm font-medium text-ink">Customer filter</label>
              <select
                id="popup-segment"
                value={popup.customerSegment}
                onChange={(event) => setPopup({ ...popup, customerSegment: event.target.value as PopupSegmentValue })}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cta"
              >
                {POPUP_SEGMENT_OPTIONS.map((segment) => <option key={segment.value} value={segment.value}>{segment.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-ink-muted">{getPopupSegment(popup.customerSegment).description}</p>
              {popup.customerSegment !== "ALL" ? (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Customer filters require a signed-in account. Visitors who are not signed in will not see this popup.
                </p>
              ) : null}
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-ink">Choose a template</legend>
            <p className="mb-3 text-xs text-ink-muted">Each design includes editable English and Arabic starter wording.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {POPUP_TEMPLATE_OPTIONS.map((template) => (
                <button
                  key={template.value}
                  type="button"
                  aria-pressed={popup.template === template.value}
                  onClick={() => applyTemplate(template.value)}
                  className={cn(
                    "rounded-xl border p-3 text-start transition focus:outline-none focus:ring-2 focus:ring-cta",
                    template.previewClass,
                    popup.template === template.value ? "ring-2 ring-cta ring-offset-2 ring-offset-background" : "hover:-translate-y-0.5 hover:shadow-md",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-current/20 text-lg font-semibold">{template.icon}</span>
                  <span className="mt-3 block text-sm font-semibold">{template.label}</span>
                  <span className="mt-1 block text-xs opacity-75">{template.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-ink">Popup image (optional)</label>
                <p className="mt-1 text-sm text-ink-muted">
                  Recommended aspect ratio: <strong>16:9</strong>. Best size: <strong>1200 × 675 px</strong>.
                  JPEG, PNG or WebP, maximum 8 MB. The image is automatically resized and converted to WebP.
                </p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                    event.target.value = "";
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => imageInputRef.current?.click()}>
                    {uploading ? "Uploading…" : popup.imageUrl ? "Replace image" : "Upload image"}
                  </Button>
                  {popup.imageUrl && <Button type="button" size="sm" variant="ghost" onClick={() => setPopup({ ...popup, imageUrl: "" })}>Remove image</Button>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input label="English title" value={popup.titleEn} onChange={(event) => setPopup({ ...popup, titleEn: event.target.value })} />
                <Input label="Arabic title" dir="rtl" value={popup.titleAr} onChange={(event) => setPopup({ ...popup, titleAr: event.target.value })} />
                <Input label="English announcement line" value={popup.announcementEn} onChange={(event) => setPopup({ ...popup, announcementEn: event.target.value })} />
                <Input label="Arabic announcement line" dir="rtl" value={popup.announcementAr} onChange={(event) => setPopup({ ...popup, announcementAr: event.target.value })} />
                <Textarea rows={7} label="English message" value={popup.bodyHtmlEn} onChange={(event) => setPopup({ ...popup, bodyHtmlEn: event.target.value })} />
                <Textarea rows={7} label="Arabic message" dir="rtl" value={popup.bodyHtmlAr} onChange={(event) => setPopup({ ...popup, bodyHtmlAr: event.target.value })} />
                <Input label="English button label (optional)" value={popup.ctaLabelEn} onChange={(event) => setPopup({ ...popup, ctaLabelEn: event.target.value })} />
                <Input label="Arabic button label (optional)" dir="rtl" value={popup.ctaLabelAr} onChange={(event) => setPopup({ ...popup, ctaLabelAr: event.target.value })} />
                <Input label="Button URL (optional)" placeholder="/products or https://…" value={popup.ctaUrl} onChange={(event) => setPopup({ ...popup, ctaUrl: event.target.value })} />
              </div>
              <p className="text-xs text-ink-muted">Basic safe HTML is supported in the message. Scripts, forms, iframes and unsafe links are removed automatically.</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">Live English preview</p>
              <div className={cn("overflow-hidden rounded-2xl border shadow-lg", selectedTemplate.previewClass)}>
                {popup.imageUrl && (
                  <div className="relative aspect-video w-full">
                    <Image src={popup.imageUrl} alt="" fill sizes="352px" className="object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs font-semibold tracking-widest opacity-70">{popup.announcementEn || "ANNOUNCEMENT"}</p>
                  <p className="mt-2 font-heading text-2xl font-semibold">{popup.titleEn || "Your popup title"}</p>
                  <p className="mt-3 whitespace-pre-line text-sm opacity-80">
                    {popup.bodyHtmlEn
                      ? popup.bodyHtmlEn.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
                      : "Your message will appear here."}
                  </p>
                  {popup.ctaLabelEn && <span className="mt-4 inline-flex rounded-lg bg-cta px-4 py-2 text-sm font-medium text-cta-foreground">{popup.ctaLabelEn}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Start date/time (optional)" type="datetime-local" value={popup.startsAt} onChange={(event) => setPopup({ ...popup, startsAt: event.target.value })} />
            <Input label="End date/time (optional)" type="datetime-local" value={popup.endsAt} onChange={(event) => setPopup({ ...popup, endsAt: event.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <Checkbox checked={popup.isActive} onCheckedChange={(checked) => setPopup({ ...popup, isActive: checked === true })} />
            Active campaign
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={savePopup}>{popupId ? "Save changes" : "Create popup"}</Button>
            {(popupId || hasWrittenContent(popup)) && (
              <Button type="button" variant="outline" onClick={() => { setPopupId(null); setPopup(EMPTY_POPUP); }}>Cancel</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
