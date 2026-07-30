import "dotenv/config";
import { prisma } from "../src/lib/db";

type CatalogProduct = {
  sku: string;
  categorySlug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  compareAtPrice?: number;
  image: number;
  gallery?: number[];
  active?: boolean;
  featured?: boolean;
};

const imageUrl = (number: number) => `/catalog/product-${String(number).padStart(2, "0")}.webp`;

const categories = [
  { slug: "argan-hair-care", nameEn: "Argan Hair Care", nameAr: "العناية بالشعر بالأرغان", image: 5 },
  { slug: "morphosis-professional", nameEn: "Morphosis Professional", nameAr: "مورفوسيس الاحترافي", image: 34 },
  { slug: "plasma-hair-care", nameEn: "Plasma Hair Care", nameAr: "بلازما للعناية بالشعر", image: 52 },
  { slug: "professional-proteins", nameEn: "Professional Hair Proteins", nameAr: "بروتينات الشعر الاحترافية", image: 63 },
  { slug: "beto-lenses", nameEn: "Beto Contact Lenses", nameAr: "عدسات بيتو اللاصقة", image: 8 },
  { slug: "electrical-styling", nameEn: "Electrical Styling Tools", nameAr: "أجهزة تصفيف الشعر", image: 69 },
] as const;

const hairDescriptions = {
  hydro: {
    en: "Argan-oil, keratin and vitamin E care developed to moisturize dry, brittle hair and restore softness, flexibility and shine.",
    ar: "عناية غنية بزيت الأرغان والكيراتين وفيتامين E لترطيب الشعر الجاف والمتقصف واستعادة النعومة والمرونة واللمعان.",
  },
  repair: {
    en: "Argan-oil, shea and keratin care for chemically treated or damaged hair, supporting stronger fibers and a smooth, healthy finish.",
    ar: "عناية بزيت الأرغان والشيا والكيراتين للشعر التالف أو المعالج كيميائياً، تساعد على تقوية الألياف واستعادة النعومة واللمعان.",
  },
  morphosisRepair: {
    en: "Professional Italian repair care with camellia oil and plant micro-keratin to nourish dry, damaged hair, reduce breakage and restore elasticity.",
    ar: "عناية إيطالية احترافية بزيت الكاميليا والمايكرو كيراتين النباتي لتغذية الشعر الجاف والتالف وتقليل التكسر واستعادة المرونة.",
  },
  morphosisRestructure: {
    en: "Intensive restructuring care with fermented rice extract, hyaluronic acid, plant collagen and peptides for severely damaged or chemically treated hair.",
    ar: "عناية مكثفة لإعادة هيكلة الشعر بمستخلص الأرز المخمر وحمض الهيالورونيك والكولاجين والببتيدات النباتية للشعر شديد التلف أو المعالج كيميائياً.",
  },
  sublimis: {
    en: "Nourishing oil care that cleanses gently, protects against dryness and leaves hair soft, luminous and easier to style.",
    ar: "عناية زيتية مغذية تنظف بلطف وتحمي من الجفاف وتترك الشعر ناعماً ولامعاً وأسهل في التصفيف.",
  },
  plasma: {
    en: "A coordinated professional hair-care formula designed to cleanse, condition, nourish and support a smooth, healthy-looking finish.",
    ar: "تركيبة متكاملة للعناية الاحترافية بالشعر، صممت للتنظيف والترطيب والتغذية ومنح الشعر مظهراً صحياً وناعماً.",
  },
};

const products: CatalogProduct[] = [
  {
    sku: "ARG-HYD-PACK-2",
    categorySlug: "argan-hair-care",
    nameEn: "Argan Hydro Shampoo & Conditioner Set",
    nameAr: "بكج أرغان هايدرو شامبو وبلسم",
    descriptionEn: hairDescriptions.hydro.en,
    descriptionAr: hairDescriptions.hydro.ar,
    price: 25,
    compareAtPrice: 35,
    image: 6,
    gallery: [4, 1],
    featured: true,
  },
  {
    sku: "ARG-HYD-SH-500",
    categorySlug: "argan-hair-care",
    nameEn: "Argan Hydro Shampoo 500 ml",
    nameAr: "شامبو أرغان هايدرو 500 مل",
    descriptionEn: hairDescriptions.hydro.en,
    descriptionAr: hairDescriptions.hydro.ar,
    price: 15,
    compareAtPrice: 20,
    image: 4,
  },
  {
    sku: "ARG-HYD-CO-500",
    categorySlug: "argan-hair-care",
    nameEn: "Argan Hydro Conditioner 500 ml",
    nameAr: "بلسم أرغان هايدرو 500 مل",
    descriptionEn: hairDescriptions.hydro.en,
    descriptionAr: hairDescriptions.hydro.ar,
    price: 15,
    compareAtPrice: 20,
    image: 1,
  },
  {
    sku: "ARG-REP-PACK-2",
    categorySlug: "argan-hair-care",
    nameEn: "Argan Repair Shampoo & Conditioner Set",
    nameAr: "بكج أرغان ريبير شامبو وبلسم",
    descriptionEn: hairDescriptions.repair.en,
    descriptionAr: hairDescriptions.repair.ar,
    price: 25,
    compareAtPrice: 35,
    image: 7,
    gallery: [3, 2],
    featured: true,
  },
  {
    sku: "ARG-REP-SH-500",
    categorySlug: "argan-hair-care",
    nameEn: "Argan Repair Shampoo 500 ml",
    nameAr: "شامبو أرغان ريبير 500 مل",
    descriptionEn: hairDescriptions.repair.en,
    descriptionAr: hairDescriptions.repair.ar,
    price: 15,
    compareAtPrice: 20,
    image: 3,
  },
  {
    sku: "ARG-REP-CO-500",
    categorySlug: "argan-hair-care",
    nameEn: "Argan Repair Conditioner 500 ml",
    nameAr: "بلسم أرغان ريبير 500 مل",
    descriptionEn: hairDescriptions.repair.en,
    descriptionAr: hairDescriptions.repair.ar,
    price: 15,
    compareAtPrice: 20,
    image: 2,
  },
  {
    sku: "ARG-COMPLETE-4",
    categorySlug: "argan-hair-care",
    nameEn: "Argan Complete Four-Piece Set",
    nameAr: "مجموعة أرغان الكاملة من أربع قطع",
    descriptionEn: "A complete Argan Hydro and Repair routine. The supplier document did not include a selling price.",
    descriptionAr: "مجموعة متكاملة من أرغان هايدرو وريبير. لم يتضمن ملف المورد سعراً للبيع.",
    price: 0,
    image: 5,
    active: false,
  },

  {
    sku: "MOR-REP-PACK-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Repair Set 1000 ml",
    nameAr: "بكج مورفوسيس ريبير 1000 مل",
    descriptionEn: hairDescriptions.morphosisRepair.en,
    descriptionAr: hairDescriptions.morphosisRepair.ar,
    price: 43,
    compareAtPrice: 55,
    image: 34,
    gallery: [35, 33],
    featured: true,
  },
  {
    sku: "MOR-REP-SH-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Repair Shampoo 1000 ml",
    nameAr: "شامبو مورفوسيس ريبير 1000 مل",
    descriptionEn: hairDescriptions.morphosisRepair.en,
    descriptionAr: hairDescriptions.morphosisRepair.ar,
    price: 30,
    image: 35,
  },
  {
    sku: "MOR-REP-CO-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Repair Conditioner 1000 ml",
    nameAr: "بلسم مورفوسيس ريبير 1000 مل",
    descriptionEn: hairDescriptions.morphosisRepair.en,
    descriptionAr: hairDescriptions.morphosisRepair.ar,
    price: 30,
    image: 33,
  },
  {
    sku: "MOR-RES-PACK-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Restructure Set 1000 ml",
    nameAr: "بكج مورفوسيس ريستركتشر 1000 مل",
    descriptionEn: hairDescriptions.morphosisRestructure.en,
    descriptionAr: hairDescriptions.morphosisRestructure.ar,
    price: 43,
    compareAtPrice: 55,
    image: 37,
    gallery: [38, 36],
    featured: true,
  },
  {
    sku: "MOR-RES-SH-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Restructure Shampoo 1000 ml",
    nameAr: "شامبو مورفوسيس ريستركتشر 1000 مل",
    descriptionEn: hairDescriptions.morphosisRestructure.en,
    descriptionAr: hairDescriptions.morphosisRestructure.ar,
    price: 30,
    image: 38,
  },
  {
    sku: "MOR-RES-CO-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Restructure Conditioner 1000 ml",
    nameAr: "بلسم مورفوسيس ريستركتشر 1000 مل",
    descriptionEn: hairDescriptions.morphosisRestructure.en,
    descriptionAr: hairDescriptions.morphosisRestructure.ar,
    price: 30,
    image: 36,
  },
  {
    sku: "MOR-RES-PACK-250",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Restructure Set 250 ml",
    nameAr: "بكج مورفوسيس ريستركتشر 250 مل",
    descriptionEn: hairDescriptions.morphosisRestructure.en,
    descriptionAr: hairDescriptions.morphosisRestructure.ar,
    price: 18,
    compareAtPrice: 20,
    image: 44,
    gallery: [45, 43],
  },
  {
    sku: "MOR-RES-SH-250",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Restructure Shampoo 250 ml",
    nameAr: "شامبو مورفوسيس ريستركتشر 250 مل",
    descriptionEn: hairDescriptions.morphosisRestructure.en,
    descriptionAr: hairDescriptions.morphosisRestructure.ar,
    price: 0,
    image: 45,
    active: false,
  },
  {
    sku: "MOR-RES-CO-250",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Restructure Conditioner 250 ml",
    nameAr: "بلسم مورفوسيس ريستركتشر 250 مل",
    descriptionEn: hairDescriptions.morphosisRestructure.en,
    descriptionAr: hairDescriptions.morphosisRestructure.ar,
    price: 0,
    image: 43,
    active: false,
  },
  {
    sku: "MOR-SUB-PACK-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Sublimis Oil Set 1000 ml",
    nameAr: "بكج مورفوسيس سوبليميس أويل 1000 مل",
    descriptionEn: hairDescriptions.sublimis.en,
    descriptionAr: hairDescriptions.sublimis.ar,
    price: 43,
    compareAtPrice: 55,
    image: 40,
    gallery: [41, 39],
  },
  {
    sku: "MOR-SUB-SH-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Sublimis Oil Shampoo 1000 ml",
    nameAr: "شامبو مورفوسيس سوبليميس أويل 1000 مل",
    descriptionEn: hairDescriptions.sublimis.en,
    descriptionAr: hairDescriptions.sublimis.ar,
    price: 30,
    image: 41,
  },
  {
    sku: "MOR-SUB-CO-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Sublimis Oil Conditioner 1000 ml",
    nameAr: "بلسم مورفوسيس سوبليميس أويل 1000 مل",
    descriptionEn: hairDescriptions.sublimis.en,
    descriptionAr: hairDescriptions.sublimis.ar,
    price: 30,
    image: 39,
  },
  {
    sku: "MOR-SUB-OIL",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Sublimis Oil Serum",
    nameAr: "سيروم مورفوسيس سوبليميس أويل",
    descriptionEn: "A lightweight, non-greasy serum with passionflower seed oil, argan oil and vitamin C derivative for softness, shine and heat protection.",
    descriptionAr: "سيروم خفيف غير دهني بزيت بذور زهرة العاطفة وزيت الأرغان ومشتق فيتامين C للنعومة واللمعان والحماية من الحرارة.",
    price: 20,
    image: 46,
  },
  {
    sku: "MOR-RES-LEAVEIN-125",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Restructure Leave-In 125 ml",
    nameAr: "مورفوسيس ريستركتشر ليف إن 125 مل",
    descriptionEn: "A lightweight leave-in treatment that detangles, reduces breakage and frizz, and supports shine without rinsing.",
    descriptionAr: "علاج ليف إن خفيف لفك التشابك وتقليل التكسر والهيشان ومنح الشعر لمعاناً دون شطف.",
    price: 18,
    compareAtPrice: 20,
    image: 42,
  },
  {
    sku: "MOR-FILLER-1000",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Restructure Filler Set 1000 ml",
    nameAr: "بكج مورفوسيس ريستركتشر فيلر 1000 مل",
    descriptionEn: "A three-step shampoo, filler and mask system with marine collagen, pearl proteins, hyaluronic acid and wheat protein for intensive reconstruction.",
    descriptionAr: "نظام من ثلاث خطوات: شامبو وفيلر وماسك بالكولاجين البحري وبروتينات اللؤلؤ وحمض الهيالورونيك وبروتين القمح لإعادة البناء المكثف.",
    price: 100,
    compareAtPrice: 125,
    image: 32,
  },
  {
    sku: "MOR-FILLER-100",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Restructure Filler Set 100 ml",
    nameAr: "بكج مورفوسيس ريستركتشر فيلر 100 مل",
    descriptionEn: "A compact three-step shampoo, filler and mask reconstruction system for damaged hair.",
    descriptionAr: "نظام مصغر من ثلاث خطوات: شامبو وفيلر وماسك لإعادة بناء الشعر التالف.",
    price: 35,
    compareAtPrice: 40,
    image: 31,
  },
  {
    sku: "MOR-DENSIFYING",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Densifying Ampoules & Shampoo",
    nameAr: "أمبولات وشامبو مورفوسيس دينسيفاينغ",
    descriptionEn: "A concentrated apple stem-cell program designed to support the scalp, reduce seasonal hair fall and improve the appearance of density.",
    descriptionAr: "برنامج مكثف بتقنية الخلايا الجذعية المستخلصة من التفاح لدعم فروة الرأس وتقليل التساقط الموسمي وتحسين مظهر الكثافة.",
    price: 44,
    compareAtPrice: 54,
    image: 50,
    gallery: [49],
  },
  {
    sku: "MOR-REINFORCING",
    categorySlug: "morphosis-professional",
    nameEn: "Morphosis Reinforcing Ampoules & Shampoo",
    nameAr: "أمبولات وشامبو مورفوسيس رينفورسينغ",
    descriptionEn: "An intensive grape stem-cell program for light hair and oily scalp that supports follicles and stronger-looking growth.",
    descriptionAr: "برنامج مكثف بتقنية الخلايا الجذعية المستخلصة من العنب للشعر الخفيف والفروة الدهنية لدعم البصيلات ومظهر نمو أقوى.",
    price: 44,
    compareAtPrice: 54,
    image: 48,
    gallery: [47],
  },

  ...[
    ["PLS-PACK-2", "Plasma Shampoo & Conditioner Set", "بكج بلازما شامبو وبلسم", 18, 25, 51],
    ["PLS-PACK-4", "Plasma Complete Four-Piece Set", "بكج بلازما الكامل من أربع قطع", 30, 40, 52],
    ["PLS-CON", "Plasma Conditioner", "بلسم بلازما", 10, 15, 53],
    ["PLS-MASK", "Plasma Hair Mask", "ماسك بلازما للشعر", 10, 15, 54],
    ["PLS-SH", "Plasma Shampoo", "شامبو بلازما", 10, 15, 55],
    ["PLS-SERUM", "Plasma Hair Serum", "سيروم بلازما للشعر", 10, 15, 56],
  ].map(([sku, nameEn, nameAr, price, compareAtPrice, image], index) => ({
    sku: String(sku),
    categorySlug: "plasma-hair-care",
    nameEn: String(nameEn),
    nameAr: String(nameAr),
    descriptionEn: hairDescriptions.plasma.en,
    descriptionAr: hairDescriptions.plasma.ar,
    price: Number(price),
    compareAtPrice: Number(compareAtPrice),
    image: Number(image),
    featured: index === 1,
  })),
];

const lensDescriptionEn =
  "Korean-made Beto cosmetic contact lenses in breathable silicone hydrogel, designed for oxygen flow, hydration, comfortable daily wear and a natural look. Diameter: 14.2 mm.";
const lensDescriptionAr =
  "عدسات بيتو التجميلية الكورية عالية الجودة مصنوعة من السيليكون هيدروجيل بقنوات دقيقة لمرور الأكسجين وترطيب وراحة عالية ومظهر طبيعي. قطر العدسة 14.2 ملم.";

const lensColors: Array<[string, string, string, number]> = [
  ["MER-BLUE", "Meral Blue", "ميرال بلو", 9],
  ["MER-YELLOW", "Meral Yellow", "ميرال يلو", 10],
  ["MER-GREEN", "Meral Green", "ميرال جرين", 11],
  ["MER-TALENT", "Meral Talent", "ميرال تالنت", 12],
  ["MER-GRAY", "Meral Gray", "ميرال غراي", 13],
  ["MER-HONEY", "Meral Honey", "ميرال هاني", 14],
  ["NAT-GREEN", "Green Natural", "جرين ناتشورال", 15],
  ["NAT-NUTELLA", "Nutella", "نوتيلا", 16],
  ["NAT-HONEY", "Honey Natural", "هاني ناتشورال", 17],
  ["NAT-GRAY", "Gray Natural", "غراي ناتشورال", 18],
  ["NAT-COFFEE", "Black Coffee", "بلاك كوفي", 19],
  ["SHE-GREEN", "Sheraz Green", "شيراز جرين", 20],
  ["SHE-BLUE", "Sheraz Blue", "شيراز بلو", 21],
  ["SHE-HONEY", "Sheraz Honey", "شيراز هاني", 22],
  ["SHE-YELLOW", "Sheraz Yellow", "شيراز يلو", 23],
  ["VEN-TALENT", "Gray Talent", "غراي تالنت", 24],
  ["VEN-GRAY", "Gray Venus", "غراي فينوس", 25],
];

for (const [code, colorEn, colorAr, image] of lensColors) {
  products.push({
    sku: `BETO-${code}`,
    categorySlug: "beto-lenses",
    nameEn: `Beto ${colorEn} Contact Lenses`,
    nameAr: `عدسات بيتو ${colorAr}`,
    descriptionEn: lensDescriptionEn,
    descriptionAr: lensDescriptionAr,
    price: 20,
    compareAtPrice: 40,
    image,
    gallery: [8, 28],
    featured: code === "MER-GRAY" || code === "VEN-GRAY",
  });
}

for (const item of [
  ["BETO-EYE-DROPS", "Beto Eye Drops", "قطرة عيون بيتو", 26],
  ["BETO-SOLUTION", "Beto Lens Solution", "محلول عدسات بيتو", 27],
  ["BETO-BOX", "Beto Lens Box", "علبة عدسات بيتو", 28],
  ["BETO-KIT", "Beto Lens Care Kit", "بكج العناية بعدسات بيتو", 29],
  ["BETO-CASE", "Beto Lens Case", "حافظة عدسات بيتو", 30],
] as const) {
  products.push({
    sku: item[0],
    categorySlug: "beto-lenses",
    nameEn: item[1],
    nameAr: item[2],
    descriptionEn: "A Beto lens-care accessory. The supplier document did not include a selling price.",
    descriptionAr: "أحد ملحقات العناية بعدسات بيتو. لم يتضمن ملف المورد سعراً للبيع.",
    price: 0,
    image: item[3],
    active: false,
  });
}

const proteinDescriptionEn =
  "Professional smoothing protein treatment. Follow the detailed application, strand-testing, ventilation and heat guidance supplied with the product and use only by a trained professional.";
const proteinDescriptionAr =
  "علاج بروتين احترافي لفرد وتنعيم الشعر. يجب اتباع تعليمات التطبيق واختبار الخصلة والتهوية والحرارة المرفقة مع المنتج، ويستخدم بواسطة مختص مدرب.";

for (const item of [
  ["PRO-DEFI-BLUE", "Defi Blue Protein 1000 ml", "بروتين ديفاي بلو 1000 مل", 80, 57, true],
  ["PRO-DEFI-PLEX", "Defi Plex Protein 1000 ml", "بروتين ديفاي بلكس 1000 مل", 75, 58, false],
  ["PRO-SP-GOLD-1000", "SP Sleeker Plus Gold Protein 1000 ml", "بروتين إس بي سليكر بلس جولد 1000 مل", 105, 59, true],
  ["PRO-SP-GOLD-150", "SP Sleeker Plus Gold Protein 150 ml", "بروتين إس بي سليكر بلس جولد 150 مل", 30, 60, false],
  ["PRO-SP-VIOLET-150", "SP Sleeker Plus Violet Protein 150 ml", "بروتين إس بي سليكر بلس فيوليت 150 مل", 30, 61, false],
  ["PRO-SP-VIOLET-1000", "SP Sleeker Plus Violet Protein 1000 ml", "بروتين إس بي سليكر بلس فيوليت 1000 مل", 110, 62, false],
  ["PRO-THERAPY-6IN1", "Therapy 6 in 1 Protein", "بروتين ثيرابي 6 في 1", 70, 63, true],
] as const) {
  products.push({
    sku: item[0],
    categorySlug: "professional-proteins",
    nameEn: item[1],
    nameAr: item[2],
    descriptionEn: proteinDescriptionEn,
    descriptionAr: proteinDescriptionAr,
    price: item[3],
    image: item[4],
    featured: item[5],
  });
}

for (const item of [
  ["PRO-MARACUJA-ADV", "Maracuja Advanced Protein", "بروتين ماراكوجا المطور", 64, []],
  ["PRO-FIRST-LADY", "First Lady Protein", "بروتين فيرست ليدي", 65, []],
  ["PRO-FIRST-LADY-PURPLE", "First Lady Purple Protein", "بروتين فيرست ليدي البنفسجي", 66, [67]],
  ["PRO-MARACUJA-HONEY", "Maracuja Honey Protein", "بروتين ماراكوجا بالعسل", 68, []],
] as const) {
  products.push({
    sku: item[0],
    categorySlug: "professional-proteins",
    nameEn: item[1],
    nameAr: item[2],
    descriptionEn: `${proteinDescriptionEn} The supplier document did not include a selling price.`,
    descriptionAr: `${proteinDescriptionAr} لم يتضمن ملف المورد سعراً للبيع.`,
    price: 0,
    image: item[3],
    gallery: [...item[4]],
    active: false,
  });
}

for (const item of [
  [
    "ELE-DONNA",
    "Donna Hair Straightener",
    "مكواة الشعر دونا",
    "Ceramic professional straightener for keratin, protein and smoothing treatments, with adjustable heat up to 240°C, digital controls and a rotating cable.",
    "مكواة سيراميك احترافية لمعالجات الكيراتين والبروتين والفرد، بحرارة قابلة للضبط حتى 240 درجة وشاشة رقمية وكابل دوار.",
    69,
    [70],
  ],
  [
    "ELE-MAC",
    "MAC Professional Hair Straightener",
    "مكواة الشعر الاحترافية MAC",
    "Professional titanium-plate straightener with rapid heating, precise digital control, automatic shutoff and universal voltage.",
    "مكواة احترافية بألواح تيتانيوم وتسخين سريع وتحكم رقمي دقيق وإيقاف تلقائي ودعم للجهد العالمي.",
    72,
    [71],
  ],
  [
    "ELE-TURBO-STAR",
    "Gamma Turbo Star Hair Dryer",
    "سشوار جاما تيربو ستار",
    "High-performance professional hair dryer up to 2500 watts, designed for fast drying, comfortable handling and intensive salon or home use.",
    "مجفف شعر احترافي عالي الأداء بقوة تصل إلى 2500 واط للتجفيف السريع والاستخدام المكثف في الصالون أو المنزل.",
    74,
    [73],
  ],
] as const) {
  products.push({
    sku: item[0],
    categorySlug: "electrical-styling",
    nameEn: item[1],
    nameAr: item[2],
    descriptionEn: `${item[3]} The supplier document did not include a selling price.`,
    descriptionAr: `${item[4]} لم يتضمن ملف المورد سعراً للبيع.`,
    price: 0,
    image: item[5],
    gallery: [...item[6]],
    active: false,
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const categoryKnowledgeEn: Record<string, string[]> = {
  "argan-hair-care": [
    "Designed for a coordinated cleansing and conditioning routine.",
    "Use the exact product directions and adjust frequency to the condition of the hair.",
  ],
  "morphosis-professional": [
    "Professional salon care selected for the specific hair concern described above.",
    "For best results, use it as part of the matching Morphosis routine where applicable.",
  ],
  "plasma-hair-care": [
    "Part of the coordinated Plasma cleansing, conditioning, masking and finishing range.",
    "Choose the individual step or complete set that matches the intended routine.",
  ],
  "professional-proteins": [
    "Professional-use smoothing treatment; not intended for unsupervised home application.",
    "A strand test, suitable ventilation and the supplied heat guidance are essential.",
  ],
  "beto-lenses": [
    "Silicone-hydrogel cosmetic contact lens designed for comfortable oxygen flow and hydration.",
    "Diameter: 14.2 mm. Follow an eye-care professional's advice for wear time and suitability.",
  ],
  "electrical-styling": [
    "Professional styling tool. Confirm voltage, heat settings and operating instructions before use.",
    "Keep away from water and allow the appliance to cool before storage.",
  ],
};

const categoryKnowledgeAr: Record<string, string[]> = {
  "argan-hair-care": [
    "مصمم ليكون جزءاً من روتين متكامل لتنظيف الشعر وترطيبه.",
    "اتبع تعليمات المنتج واضبط عدد مرات الاستخدام حسب حالة الشعر.",
  ],
  "morphosis-professional": [
    "عناية صالونات احترافية مخصصة لمشكلة الشعر الموضحة أعلاه.",
    "لأفضل نتيجة استخدمه ضمن روتين مورفوسيس المطابق عند توفره.",
  ],
  "plasma-hair-care": [
    "جزء من مجموعة بلازما المتكاملة للتنظيف والترطيب والماسكات واللمسة النهائية.",
    "اختر الخطوة الفردية أو المجموعة الكاملة التي تناسب الروتين المطلوب.",
  ],
  "professional-proteins": [
    "علاج تنعيم للاستخدام الاحترافي وليس للتطبيق المنزلي دون إشراف.",
    "اختبار الخصلة والتهوية المناسبة واتباع تعليمات الحرارة المرفقة أمور أساسية.",
  ],
  "beto-lenses": [
    "عدسة تجميلية من السيليكون هيدروجيل مصممة لمرور الأكسجين والترطيب والراحة.",
    "القطر 14.2 ملم. اتبع إرشادات مختص العيون لمدة الاستخدام ومدى ملاءمتها.",
  ],
  "electrical-styling": [
    "جهاز تصفيف احترافي. تحقق من الجهد وإعدادات الحرارة وتعليمات التشغيل قبل الاستخدام.",
    "احفظ الجهاز بعيداً عن الماء واتركه يبرد قبل التخزين.",
  ],
};

function knowledgeHtml(name: string, categorySlug: string, description: string, usage: string) {
  const facts = categoryKnowledgeEn[categorySlug] ?? [];
  return `<h2>About ${name}</h2><p>${description}</p><h2>Important facts</h2><ul>${facts.map((fact) => `<li>${fact}</li>`).join("")}</ul><h2>Use and care</h2><p>${usage}</p>`;
}

function knowledgeHtmlAr(name: string, categorySlug: string, description: string, usage: string) {
  const facts = categoryKnowledgeAr[categorySlug] ?? [];
  return `<h2>عن ${name}</h2><p>${description}</p><h2>معلومات مهمة</h2><ul>${facts.map((fact) => `<li>${fact}</li>`).join("")}</ul><h2>الاستخدام والعناية</h2><p>${usage}</p>`;
}

const storefrontBanners = [
  {
    desktopMediaUrl: imageUrl(6),
    titleEn: "Argan Hydro Duo",
    titleAr: "ثنائي أرغان هايدرو",
    subtitleEn: "Hydrating shampoo and conditioner care for dry, brittle hair.",
    subtitleAr: "شامبو وبلسم مرطب للعناية بالشعر الجاف والمتقصف.",
    ctaLabelEn: "Shop the set",
    ctaLabelAr: "تسوق المجموعة",
    linkUrl: "/products/argan-hydro-shampoo-conditioner-set",
  },
  {
    desktopMediaUrl: imageUrl(34),
    titleEn: "Morphosis Repair Set",
    titleAr: "مجموعة مورفوسيس ريبير",
    subtitleEn: "Professional repair care with camellia oil and plant micro-keratin.",
    subtitleAr: "عناية احترافية للإصلاح بزيت الكاميليا والمايكرو كيراتين النباتي.",
    ctaLabelEn: "View Morphosis",
    ctaLabelAr: "اكتشف مورفوسيس",
    linkUrl: "/products/morphosis-repair-set-1000-ml",
  },
  {
    desktopMediaUrl: imageUrl(52),
    titleEn: "Complete Plasma Routine",
    titleAr: "روتين بلازما الكامل",
    subtitleEn: "Four coordinated steps for cleansing, conditioning, nourishment and shine.",
    subtitleAr: "أربع خطوات متكاملة للتنظيف والترطيب والتغذية واللمعان.",
    ctaLabelEn: "Shop Plasma",
    ctaLabelAr: "تسوق بلازما",
    linkUrl: "/products/plasma-complete-four-piece-set",
  },
  {
    desktopMediaUrl: imageUrl(13),
    titleEn: "Beto Meral Gray Lenses",
    titleAr: "عدسات بيتو ميرال غراي",
    subtitleEn: "Korean silicone-hydrogel cosmetic lenses with a natural gray look.",
    subtitleAr: "عدسات تجميلية كورية من السيليكون هيدروجيل بإطلالة رمادية طبيعية.",
    ctaLabelEn: "Explore the color",
    ctaLabelAr: "اكتشف اللون",
    linkUrl: "/products/beto-meral-gray-contact-lenses",
  },
] as const;

async function main() {
  console.log(`Replacing the local catalog with ${products.length} supplied products...`);
  await prisma.$transaction(async (tx) => {
    // The local orders refer to the old test catalog. Removing them avoids orphaned inventory
    // reservations while customer/staff accounts and all site settings remain untouched.
    await tx.order.deleteMany();
    await tx.productBundle.deleteMany();
    await tx.banner.deleteMany();
    await tx.product.deleteMany();
    await tx.category.deleteMany();

    const categoryIds = new Map<string, string>();
    for (const [sortOrder, category] of categories.entries()) {
      const created = await tx.category.create({
        data: {
          slug: category.slug,
          nameEn: category.nameEn,
          nameAr: category.nameAr,
          imageUrl: imageUrl(category.image),
          sortOrder,
          isActive: true,
        },
      });
      categoryIds.set(category.slug, created.id);
    }

    for (const item of products) {
      const active = item.active !== false;
      const usageEn = item.categorySlug === "professional-proteins"
        ? "Professional-use product. Follow the complete supplier instructions and perform a strand test before application."
        : item.categorySlug === "beto-lenses"
          ? "Wash and dry hands before handling. Follow your eye-care professional's guidance and lens hygiene instructions."
          : "Follow the directions supplied with the product. Stop use if irritation occurs.";
      const usageAr = item.categorySlug === "professional-proteins"
        ? "منتج للاستخدام الاحترافي. اتبع تعليمات المورد الكاملة ونفذ اختبار خصلة قبل التطبيق."
        : item.categorySlug === "beto-lenses"
          ? "اغسل وجفف اليدين قبل الاستخدام واتبع إرشادات مختص العيون وتعليمات نظافة العدسات."
          : "اتبع التعليمات المرفقة مع المنتج وتوقف عن الاستخدام عند حدوث تهيج.";
      await tx.product.create({
        data: {
          sku: item.sku,
          slug: slugify(item.nameEn),
          nameEn: item.nameEn,
          nameAr: item.nameAr,
          descriptionEn: item.descriptionEn,
          descriptionAr: item.descriptionAr,
          price: item.price,
          compareAtPrice: item.compareAtPrice,
          stock: active ? 50 : 0,
          lowStockThreshold: active ? 8 : null,
          categoryId: categoryIds.get(item.categorySlug)!,
          mainImageUrl: imageUrl(item.image),
          isActive: active,
          isFeatured: active && item.featured === true,
          images: {
            create: (item.gallery ?? []).map((image, sortOrder) => ({
              url: imageUrl(image),
              altEn: item.nameEn,
              altAr: item.nameAr,
              sortOrder,
            })),
          },
          knowledge: {
            create: {
              contentHtmlEn: knowledgeHtml(item.nameEn, item.categorySlug, item.descriptionEn, usageEn),
              contentHtmlAr: knowledgeHtmlAr(item.nameAr, item.categorySlug, item.descriptionAr, usageAr),
              isActive: true,
            },
          },
        },
      });
    }

    for (const [sortOrder, banner] of storefrontBanners.entries()) {
      await tx.banner.create({
        data: {
          mediaType: "IMAGE",
          desktopMediaUrl: banner.desktopMediaUrl,
          mobileMediaUrl: banner.desktopMediaUrl,
          titleEn: banner.titleEn,
          titleAr: banner.titleAr,
          subtitleEn: banner.subtitleEn,
          subtitleAr: banner.subtitleAr,
          ctaLabelEn: banner.ctaLabelEn,
          ctaLabelAr: banner.ctaLabelAr,
          linkUrl: banner.linkUrl,
          focalPointX: 50,
          focalPointY: 50,
          sortOrder,
          autoAdvanceSeconds: 6,
          isActive: true,
        },
      });
    }
  }, { timeout: 60_000 });

  const [active, inactive, featured] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: false } }),
    prisma.product.count({ where: { isFeatured: true } }),
  ]);
  console.log(`Catalog ready: ${active} active, ${inactive} awaiting prices, ${featured} featured.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
