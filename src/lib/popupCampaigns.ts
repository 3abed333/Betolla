export const POPUP_TEMPLATE_OPTIONS = [
  {
    value: "SALE",
    label: "Sale",
    description: "A bold red promotion for discounts and clearance.",
    icon: "%",
    previewClass: "border-red-300 bg-red-50 text-red-950",
    defaults: {
      titleEn: "A special offer for you",
      titleAr: "عرض خاص لك",
      announcementEn: "SALE",
      announcementAr: "تخفيضات",
      bodyHtmlEn: "<p>Enjoy a limited discount on selected products.</p>",
      bodyHtmlAr: "<p>استمتعي بخصم لفترة محدودة على منتجات مختارة.</p>",
      ctaLabelEn: "Shop the sale",
      ctaLabelAr: "تسوقي العروض",
    },
  },
  {
    value: "ANNOUNCEMENT",
    label: "Announcement",
    description: "A clear blue notice for important store news.",
    icon: "i",
    previewClass: "border-blue-300 bg-blue-50 text-blue-950",
    defaults: {
      titleEn: "Important announcement",
      titleAr: "إعلان مهم",
      announcementEn: "STORE UPDATE",
      announcementAr: "تحديث المتجر",
      bodyHtmlEn: "<p>Share an important update with your customers here.</p>",
      bodyHtmlAr: "<p>شاركي تحديثاً مهماً مع عملائك هنا.</p>",
      ctaLabelEn: "Learn more",
      ctaLabelAr: "اعرفي المزيد",
    },
  },
  {
    value: "NEW_PRODUCT",
    label: "New product",
    description: "A violet launch card for a new product or collection.",
    icon: "✦",
    previewClass: "border-violet-300 bg-violet-50 text-violet-950",
    defaults: {
      titleEn: "Meet our newest arrival",
      titleAr: "اكتشفي أحدث منتجاتنا",
      announcementEn: "JUST ARRIVED",
      announcementAr: "وصل حديثاً",
      bodyHtmlEn: "<p>A new beauty essential has just joined the collection.</p>",
      bodyHtmlAr: "<p>انضم منتج جمالي جديد إلى مجموعتنا.</p>",
      ctaLabelEn: "Discover it",
      ctaLabelAr: "اكتشفيه",
    },
  },
  {
    value: "WELCOME",
    label: "Welcome",
    description: "A warm green greeting for visitors and new customers.",
    icon: "♡",
    previewClass: "border-emerald-300 bg-emerald-50 text-emerald-950",
    defaults: {
      titleEn: "Welcome to Betolla",
      titleAr: "أهلاً بك في بيتولا",
      announcementEn: "HELLO, BEAUTIFUL",
      announcementAr: "أهلاً بك",
      bodyHtmlEn: "<p>Explore beauty products selected with care.</p>",
      bodyHtmlAr: "<p>اكتشفي منتجات تجميل مختارة بعناية.</p>",
      ctaLabelEn: "Start shopping",
      ctaLabelAr: "ابدئي التسوق",
    },
  },
  {
    value: "LIMITED_TIME",
    label: "Limited time",
    description: "An amber design that creates urgency around an offer.",
    icon: "◷",
    previewClass: "border-amber-300 bg-amber-50 text-amber-950",
    defaults: {
      titleEn: "Only for a limited time",
      titleAr: "لفترة محدودة فقط",
      announcementEn: "DON'T MISS OUT",
      announcementAr: "لا تفوتي الفرصة",
      bodyHtmlEn: "<p>This offer ends soon. Shop before it is gone.</p>",
      bodyHtmlAr: "<p>ينتهي هذا العرض قريباً. تسوقي قبل انتهائه.</p>",
      ctaLabelEn: "Shop now",
      ctaLabelAr: "تسوقي الآن",
    },
  },
  {
    value: "FREE_SHIPPING",
    label: "Free shipping",
    description: "A fresh cyan message for delivery promotions.",
    icon: "→",
    previewClass: "border-cyan-300 bg-cyan-50 text-cyan-950",
    defaults: {
      titleEn: "Delivery is on us",
      titleAr: "التوصيل علينا",
      announcementEn: "FREE SHIPPING",
      announcementAr: "توصيل مجاني",
      bodyHtmlEn: "<p>Receive free delivery when your order meets the offer conditions.</p>",
      bodyHtmlAr: "<p>احصلي على توصيل مجاني عندما يستوفي طلبك شروط العرض.</p>",
      ctaLabelEn: "Shop now",
      ctaLabelAr: "تسوقي الآن",
    },
  },
  {
    value: "LOYALTY",
    label: "Loyalty reward",
    description: "A fuchsia reward card for points and member benefits.",
    icon: "★",
    previewClass: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-950",
    defaults: {
      titleEn: "Your loyalty deserves rewards",
      titleAr: "ولاؤك يستحق المكافآت",
      announcementEn: "BETOLLA REWARDS",
      announcementAr: "مكافآت بيتولا",
      bodyHtmlEn: "<p>Earn points as you shop and redeem them on future orders.</p>",
      bodyHtmlAr: "<p>اجمعي النقاط أثناء التسوق واستخدميها في طلباتك القادمة.</p>",
      ctaLabelEn: "View my rewards",
      ctaLabelAr: "شاهدي مكافآتي",
    },
  },
  {
    value: "BACK_IN_STOCK",
    label: "Back in stock",
    description: "A lime alert for replenished customer favourites.",
    icon: "↻",
    previewClass: "border-lime-300 bg-lime-50 text-lime-950",
    defaults: {
      titleEn: "Your favourite is back",
      titleAr: "منتجك المفضل متوفر مجدداً",
      announcementEn: "BACK IN STOCK",
      announcementAr: "عاد إلى المخزون",
      bodyHtmlEn: "<p>The product you have been waiting for is available again.</p>",
      bodyHtmlAr: "<p>المنتج الذي كنت تنتظرينه أصبح متوفراً من جديد.</p>",
      ctaLabelEn: "Get it now",
      ctaLabelAr: "احصلي عليه الآن",
    },
  },
  {
    value: "EVENT",
    label: "Event",
    description: "An orange invitation for launches and store events.",
    icon: "◇",
    previewClass: "border-orange-300 bg-orange-50 text-orange-950",
    defaults: {
      titleEn: "You are invited",
      titleAr: "أنت مدعوة",
      announcementEn: "SPECIAL EVENT",
      announcementAr: "فعالية خاصة",
      bodyHtmlEn: "<p>Join us for a special Betolla event.</p>",
      bodyHtmlAr: "<p>انضمي إلينا في فعالية خاصة من بيتولا.</p>",
      ctaLabelEn: "View details",
      ctaLabelAr: "شاهدي التفاصيل",
    },
  },
  {
    value: "CUSTOM",
    label: "Custom",
    description: "A neutral canvas for any message you want to create.",
    icon: "＋",
    previewClass: "border-stone-300 bg-stone-50 text-stone-950",
    defaults: {
      titleEn: "Your title",
      titleAr: "عنوانك",
      announcementEn: "",
      announcementAr: "",
      bodyHtmlEn: "<p>Write your message here.</p>",
      bodyHtmlAr: "<p>اكتبي رسالتك هنا.</p>",
      ctaLabelEn: "",
      ctaLabelAr: "",
    },
  },
] as const;

export const POPUP_TRIGGER_OPTIONS = [
  {
    value: "ANY_STOREFRONT_PAGE",
    label: "When any customer page loads",
    description: "Can appear on the homepage, catalog, product, cart, checkout, blog or bundle pages.",
  },
  { value: "HOME_PAGE", label: "When the homepage loads", description: "Only on the main storefront homepage." },
  { value: "PRODUCTS", label: "When the product catalog loads", description: "On the main Products page." },
  { value: "PRODUCT_DETAIL", label: "When a product page loads", description: "On individual product detail pages." },
  { value: "CART", label: "When the cart loads", description: "Only when the customer opens the cart." },
  { value: "CHECKOUT", label: "When checkout loads", description: "Only when the customer reaches checkout." },
  { value: "BLOG", label: "When a blog page loads", description: "On the blog list and individual articles." },
  { value: "BUNDLES", label: "When a bundle page loads", description: "On the bundle list and bundle details." },
] as const;

export const POPUP_AUDIENCE_OPTIONS = [
  {
    value: "EVERYONE",
    label: "All visitors and customers",
    description: "Includes visitors who have not signed in.",
  },
  {
    value: "INDIVIDUAL_CUSTOMERS",
    label: "Individual customers only",
    description: "The customer must be signed in with an individual account.",
  },
  {
    value: "PHARMACIES",
    label: "Pharmacies only",
    description: "The customer must be signed in with a pharmacy account.",
  },
] as const;

export const POPUP_SEGMENT_OPTIONS = [
  { value: "ALL", label: "Everyone in the selected audience", description: "No spending or activity filter." },
  { value: "TOP_30", label: "Best 30% of customers", description: "The highest 30% by lifetime spending." },
  { value: "BOTTOM_30", label: "Lowest 30% of customers", description: "The lowest 30% by lifetime spending." },
  { value: "NEW_CUSTOMERS", label: "New customers", description: "Accounts created during the last 30 days." },
  { value: "INACTIVE_CUSTOMERS", label: "Inactive customers", description: "No order during the last 90 days; excludes brand-new accounts." },
] as const;

export type PopupTriggerValue = (typeof POPUP_TRIGGER_OPTIONS)[number]["value"];
export type PopupTemplateValue = (typeof POPUP_TEMPLATE_OPTIONS)[number]["value"];
export type PopupAudienceValue = (typeof POPUP_AUDIENCE_OPTIONS)[number]["value"];
export type PopupSegmentValue = (typeof POPUP_SEGMENT_OPTIONS)[number]["value"];

export function popupMatchesPath(trigger: PopupTriggerValue | string, pathname: string): boolean {
  if (trigger === "ANY_STOREFRONT_PAGE") return true;
  if (trigger === "HOME_PAGE") return pathname === "/";
  if (trigger === "PRODUCTS") return pathname === "/products";
  if (trigger === "PRODUCT_DETAIL") return /^\/products\/[^/]+(?:\/learn)?$/.test(pathname);
  if (trigger === "CART") return pathname === "/cart";
  if (trigger === "CHECKOUT") return pathname === "/checkout";
  if (trigger === "BLOG") return pathname === "/blog" || pathname.startsWith("/blog/");
  if (trigger === "BUNDLES") return pathname === "/bundles" || pathname.startsWith("/bundles/");
  return false;
}

export function getPopupTemplate(value: PopupTemplateValue | string) {
  return POPUP_TEMPLATE_OPTIONS.find((template) => template.value === value) ?? POPUP_TEMPLATE_OPTIONS.at(-1)!;
}

export function getPopupTrigger(value: PopupTriggerValue | string) {
  return POPUP_TRIGGER_OPTIONS.find((trigger) => trigger.value === value) ?? POPUP_TRIGGER_OPTIONS[0];
}

export function getPopupAudience(value: PopupAudienceValue | string) {
  return POPUP_AUDIENCE_OPTIONS.find((audience) => audience.value === value) ?? POPUP_AUDIENCE_OPTIONS[0];
}

export function getPopupSegment(value: PopupSegmentValue | string) {
  return POPUP_SEGMENT_OPTIONS.find((segment) => segment.value === value) ?? POPUP_SEGMENT_OPTIONS[0];
}
