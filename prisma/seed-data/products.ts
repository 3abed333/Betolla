export type SeedProduct = {
  sku: string;
  categorySlug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  lowStockThreshold?: number;
  imageSeed: string;
};

export const products: SeedProduct[] = [
  // ---- Lipstick ----
  {
    sku: "LIP-001",
    categorySlug: "lipstick",
    nameEn: "Velvet Matte Lipstick - Terracotta Rose",
    nameAr: "أحمر شفاه مخملي مطفي - وردي تراكوتا",
    descriptionEn:
      "A long-wearing matte lipstick in a warm terracotta-rose shade that glides on smooth and stays put for up to 8 hours.",
    descriptionAr:
      "أحمر شفاه مطفي طويل الثبات بدرجة وردي تراكوتا دافئة، يمنحكِ لمسة ناعمة وثبات يصل إلى 8 ساعات.",
    price: 13.9,
    stock: 140,
    imageSeed: "betolla-lip-001",
  },
  {
    sku: "LIP-002",
    categorySlug: "lipstick",
    nameEn: "Silk Gloss Lip Tint - Blush Pink",
    nameAr: "ملمع شفاه حريري - وردي فاتح",
    descriptionEn:
      "A weightless, high-shine tint that adds a sheer wash of color while keeping lips hydrated with vitamin E.",
    descriptionAr:
      "ملمع شفاه خفيف الملمس بلمعان حريري يمنح الشفاه لونًا شفافًا مع ترطيب غني بفيتامين E.",
    price: 11.5,
    stock: 95,
    imageSeed: "betolla-lip-002",
  },
  {
    sku: "LIP-003",
    categorySlug: "lipstick",
    nameEn: "Classic Cream Lipstick - Ruby Red",
    nameAr: "أحمر شفاه كريمي كلاسيكي - أحمر ياقوتي",
    descriptionEn:
      "A rich, creamy formula in a timeless ruby red that glides on in one stroke and never feels drying.",
    descriptionAr:
      "تركيبة كريمية غنية بدرجة أحمر ياقوتي كلاسيكي، تُوضع بلمسة واحدة دون أن تُشعر الشفاه بالجفاف.",
    price: 15.0,
    compareAtPrice: 18.0,
    stock: 60,
    imageSeed: "betolla-lip-003",
  },
  {
    sku: "LIP-004",
    categorySlug: "lipstick",
    nameEn: "Satin Finish Lipstick - Nude Blossom",
    nameAr: "أحمر شفاه ساتان - نيود وردي",
    descriptionEn:
      "A soft satin-finish nude that flatters every skin tone, enriched with shea butter for all-day comfort.",
    descriptionAr:
      "درجة نيود وردية بلمسة ساتان ناعمة تناسب جميع درجات البشرة، غنية بزبدة الشيا لراحة تدوم طوال اليوم.",
    price: 13.5,
    stock: 110,
    imageSeed: "betolla-lip-004",
  },
  {
    sku: "LIP-005",
    categorySlug: "lipstick",
    nameEn: "Long-Wear Liquid Lipstick - Deep Plum",
    nameAr: "أحمر شفاه سائل طويل الثبات - بنفسجي غامق",
    descriptionEn:
      "A transfer-proof liquid lipstick in a bold deep plum that sets to a soft matte finish within minutes.",
    descriptionAr:
      "أحمر شفاه سائل مقاوم للانتقال بدرجة بنفسجي غامق جريئة، يجف بلمسة مطفية ناعمة خلال دقائق.",
    price: 16.9,
    stock: 8,
    lowStockThreshold: 10,
    imageSeed: "betolla-lip-005",
  },
  {
    sku: "LIP-006",
    categorySlug: "lipstick",
    nameEn: "Hydrating Lip Balm Tint - Rosewood",
    nameAr: "بلسم شفاه ملون مرطب - خشب الورد",
    descriptionEn:
      "Part balm, part color - this rosewood tint melts onto lips with shea butter and a subtle rosy flush.",
    descriptionAr:
      "بين البلسم واللون، يذوب هذا المرطب بدرجة خشب الورد على الشفاه بزبدة الشيا وحمرة وردية خفيفة.",
    price: 10.9,
    stock: 130,
    imageSeed: "betolla-lip-006",
  },
  {
    sku: "LIP-007",
    categorySlug: "lipstick",
    nameEn: "Matte Lip Crayon - Brick Orange",
    nameAr: "قلم شفاه مطفي - برتقالي طوبي",
    descriptionEn:
      "A precision crayon in a sun-kissed brick orange, delivering full matte coverage with zero sharpening needed.",
    descriptionAr:
      "قلم دقيق بدرجة برتقالي طوبي مشمس، يمنح تغطية مطفية كاملة دون الحاجة للبري.",
    price: 12.5,
    stock: 0,
    imageSeed: "betolla-lip-007",
  },
  {
    sku: "LIP-008",
    categorySlug: "lipstick",
    nameEn: "Berry Stain Lip Oil - Wine Berry",
    nameAr: "زيت شفاه صبغي - عنبي",
    descriptionEn:
      "A nourishing lip oil that stains lips a soft wine-berry hue while softening them with jojoba oil.",
    descriptionAr:
      "زيت شفاه مغذٍّ يترك على الشفاه صبغة عنبية ناعمة، ويعمل على تنعيمها بزيت الجوجوبا.",
    price: 14.9,
    stock: 75,
    imageSeed: "betolla-lip-008",
  },

  // ---- Foundation ----
  {
    sku: "FND-001",
    categorySlug: "foundation",
    nameEn: "Hydra-Glow Foundation SPF 30 - Ivory",
    nameAr: "كريم أساس مرطب بعامل حماية 30 - عاجي",
    descriptionEn:
      "A dewy, medium-coverage foundation with SPF 30 that hydrates while evening out your skin tone.",
    descriptionAr:
      "كريم أساس بتغطية متوسطة ولمعان طبيعي مع عامل حماية 30، يرطب البشرة ويوحد لونها.",
    price: 22.5,
    stock: 85,
    imageSeed: "betolla-fnd-001",
  },
  {
    sku: "FND-002",
    categorySlug: "foundation",
    nameEn: "Velvet Matte Foundation - Sand",
    nameAr: "كريم أساس مطفي مخملي - رملي",
    descriptionEn:
      "A full-coverage, oil-control foundation that blurs pores and lasts up to 12 hours without touch-ups.",
    descriptionAr:
      "كريم أساس بتغطية كاملة يتحكم بإفرازات الزيت ويُخفي المسام، بثبات يصل إلى 12 ساعة دون الحاجة لإعادة اللمسات.",
    price: 24.0,
    stock: 70,
    imageSeed: "betolla-fnd-002",
  },
  {
    sku: "FND-003",
    categorySlug: "foundation",
    nameEn: "Second-Skin Foundation - Warm Beige",
    nameAr: "كريم أساس شبه شفاف - بيج دافئ",
    descriptionEn:
      "A lightweight, breathable formula that feels like nothing on the skin while blurring imperfections.",
    descriptionAr:
      "تركيبة خفيفة تتنفس مع البشرة وتُشعرك وكأنكِ لا ترتدين مكياجًا، مع إخفاء العيوب البسيطة.",
    price: 21.0,
    stock: 55,
    imageSeed: "betolla-fnd-003",
  },
  {
    sku: "FND-004",
    categorySlug: "foundation",
    nameEn: "Cushion Foundation Compact - Porcelain",
    nameAr: "كريم أساس كوشن - بورسلين",
    descriptionEn:
      "A dewy cushion compact that delivers buildable coverage in seconds, perfect for on-the-go touch-ups.",
    descriptionAr:
      "كوشن مضغوط يمنح لمعانًا طبيعيًا وتغطية قابلة للتدرج خلال ثوانٍ، مثالي للمسات السريعة أثناء التنقل.",
    price: 19.9,
    compareAtPrice: 23.9,
    stock: 45,
    imageSeed: "betolla-fnd-004",
  },
  {
    sku: "FND-005",
    categorySlug: "foundation",
    nameEn: "Skin-Perfecting Foundation - Honey",
    nameAr: "كريم أساس مثالي للبشرة - عسلي",
    descriptionEn:
      "A skincare-infused foundation with hyaluronic acid that plumps and perfects in one easy step.",
    descriptionAr:
      "كريم أساس مدعم بحمض الهيالورونيك يمنح البشرة نضارة وامتلاءً مع تغطية مثالية بخطوة واحدة.",
    price: 23.5,
    stock: 65,
    imageSeed: "betolla-fnd-005",
  },
  {
    sku: "FND-006",
    categorySlug: "foundation",
    nameEn: "Matte Stick Foundation - Almond",
    nameAr: "كريم أساس أستيك مطفي - لوزي",
    descriptionEn:
      "A travel-friendly foundation stick that glides on and blends effortlessly for a soft matte finish.",
    descriptionAr:
      "كريم أساس بشكل أستيك عملي للسفر، يوضع بسهولة ويمتزج دون جهد لنتيجة مطفية ناعمة.",
    price: 18.5,
    stock: 6,
    lowStockThreshold: 10,
    imageSeed: "betolla-fnd-006",
  },
  {
    sku: "FND-007",
    categorySlug: "foundation",
    nameEn: "Radiant Tinted Moisturizer - Light Tan",
    nameAr: "مرطب ملون لامع - بني فاتح",
    descriptionEn:
      "A sheer, radiant tinted moisturizer that hydrates for 24 hours while adding a healthy glow.",
    descriptionAr: "مرطب ملون شفاف يمنح إشراقة صحية ويرطب البشرة لمدة 24 ساعة.",
    price: 17.9,
    stock: 90,
    imageSeed: "betolla-fnd-007",
  },
  {
    sku: "FND-008",
    categorySlug: "foundation",
    nameEn: "Full Coverage Foundation - Deep Caramel",
    nameAr: "كريم أساس تغطية كاملة - كراميل غامق",
    descriptionEn:
      "A crease-proof, full-coverage foundation formulated for deeper skin tones with a natural matte finish.",
    descriptionAr:
      "كريم أساس بتغطية كاملة مقاوم للتكسر، مصمم لدرجات البشرة الغامقة بلمسة مطفية طبيعية.",
    price: 24.9,
    stock: 50,
    imageSeed: "betolla-fnd-008",
  },

  // ---- Skincare Serums ----
  {
    sku: "SER-001",
    categorySlug: "skincare-serums",
    nameEn: "Vitamin C Brightening Serum",
    nameAr: "سيروم فيتامين سي المفتح",
    descriptionEn:
      "A potent 15% vitamin C serum that brightens dull skin and fades the look of dark spots over time.",
    descriptionAr:
      "سيروم مركّز بفيتامين سي بتركيز 15% يفتح البشرة الباهتة ويقلل من مظهر البقع الداكنة مع الاستخدام المنتظم.",
    price: 19.5,
    stock: 100,
    imageSeed: "betolla-ser-001",
  },
  {
    sku: "SER-002",
    categorySlug: "skincare-serums",
    nameEn: "Hyaluronic Acid Hydra Serum",
    nameAr: "سيروم حمض الهيالورونيك المرطب",
    descriptionEn:
      "A multi-molecular-weight hyaluronic acid serum that delivers deep, lasting hydration to every skin layer.",
    descriptionAr:
      "سيروم يحتوي على جزيئات متعددة الأوزان من حمض الهيالورونيك لترطيب عميق وطويل الأمد لجميع طبقات البشرة.",
    price: 18.0,
    stock: 120,
    imageSeed: "betolla-ser-002",
  },
  {
    sku: "SER-003",
    categorySlug: "skincare-serums",
    nameEn: "Retinol Renewal Night Serum",
    nameAr: "سيروم الريتينول الليلي المجدد",
    descriptionEn:
      "A gentle-yet-effective retinol serum that smooths fine lines and refines texture while you sleep.",
    descriptionAr:
      "سيروم ريتينول فعال ولطيف على البشرة، يعمل على تنعيم الخطوط الدقيقة وتحسين ملمس البشرة أثناء النوم.",
    price: 23.9,
    compareAtPrice: 27.9,
    stock: 40,
    imageSeed: "betolla-ser-003",
  },
  {
    sku: "SER-004",
    categorySlug: "skincare-serums",
    nameEn: "Niacinamide Pore Refining Serum",
    nameAr: "سيروم النياسيناميد لتنقية المسام",
    descriptionEn:
      "A 10% niacinamide serum that minimizes the look of pores and balances oil production.",
    descriptionAr:
      "سيروم بتركيز 10% من النياسيناميد يقلل من مظهر المسام الواسعة وينظم إفراز الزيوت.",
    price: 16.5,
    stock: 105,
    imageSeed: "betolla-ser-004",
  },
  {
    sku: "SER-005",
    categorySlug: "skincare-serums",
    nameEn: "Rose Glow Hydrating Serum",
    nameAr: "سيروم الورد المرطب واللامع",
    descriptionEn:
      "A rosewater-infused serum that hydrates, soothes, and leaves skin with a soft, dewy glow.",
    descriptionAr:
      "سيروم بخلاصة ماء الورد يرطب ويهدئ البشرة ويمنحها إشراقة ناعمة وطبيعية.",
    price: 17.5,
    stock: 95,
    imageSeed: "betolla-ser-005",
  },
  {
    sku: "SER-006",
    categorySlug: "skincare-serums",
    nameEn: "Peptide Firming Serum",
    nameAr: "سيروم الببتيد الشاد للبشرة",
    descriptionEn:
      "A peptide-rich serum that supports skin elasticity and firmness for a more youthful-looking complexion.",
    descriptionAr:
      "سيروم غني بالببتيدات يدعم مرونة البشرة وشدها لمظهر أكثر شبابًا.",
    price: 25.5,
    stock: 35,
    imageSeed: "betolla-ser-006",
  },
  {
    sku: "SER-007",
    categorySlug: "skincare-serums",
    nameEn: "Green Tea Antioxidant Serum",
    nameAr: "سيروم الشاي الأخضر المضاد للأكسدة",
    descriptionEn:
      "A lightweight antioxidant serum with green tea extract that protects skin from daily environmental stress.",
    descriptionAr:
      "سيروم خفيف غني بمضادات الأكسدة ومستخلص الشاي الأخضر يحمي البشرة من عوامل البيئة اليومية.",
    price: 16.9,
    stock: 88,
    imageSeed: "betolla-ser-007",
  },
  {
    sku: "SER-008",
    categorySlug: "skincare-serums",
    nameEn: "Ceramide Barrier Repair Serum",
    nameAr: "سيروم السيراميد لإصلاح حاجز البشرة",
    descriptionEn:
      "A ceramide-rich serum that strengthens the skin barrier and calms redness and sensitivity.",
    descriptionAr: "سيروم غني بالسيراميد يعزز حاجز البشرة الواقي ويهدئ الاحمرار والتحسس.",
    price: 20.9,
    stock: 60,
    imageSeed: "betolla-ser-008",
  },

  // ---- Perfume ----
  {
    sku: "PRF-001",
    categorySlug: "perfume",
    nameEn: "Oud & Rose Eau de Parfum",
    nameAr: "أوود آند روز - عطر او دو بارفان",
    descriptionEn:
      "A warm, opulent blend of Taif rose and rich oud, wrapped in soft amber for a truly regal signature scent.",
    descriptionAr:
      "مزيج دافئ وفاخر من الورد الطائفي والعود الأصيل، ملفوف بالعنبر الناعم ليمنحكِ توقيعًا عطريًا ملكيًا.",
    price: 38.0,
    stock: 40,
    imageSeed: "betolla-prf-001",
  },
  {
    sku: "PRF-002",
    categorySlug: "perfume",
    nameEn: "Jasmine Bloom Eau de Toilette",
    nameAr: "جاسمين بلوم - عطر او دو تواليت",
    descriptionEn:
      "A fresh floral bouquet of night-blooming jasmine and white musk that feels like a garden at dusk.",
    descriptionAr:
      "باقة زهرية منعشة من الياسمين الليلي والمسك الأبيض، تُشعركِ وكأنكِ في حديقة عند الغروب.",
    price: 26.5,
    stock: 65,
    imageSeed: "betolla-prf-002",
  },
  {
    sku: "PRF-003",
    categorySlug: "perfume",
    nameEn: "Amber Musk Eau de Parfum",
    nameAr: "أمبر ماسك - عطر او دو بارفان",
    descriptionEn:
      "A cozy, skin-like blend of golden amber and warm musk that lingers softly all day long.",
    descriptionAr:
      "مزيج دافئ يشبه رائحة البشرة من العنبر الذهبي والمسك الدافئ، يدوم طوال اليوم بلمسة ناعمة.",
    price: 29.9,
    stock: 50,
    imageSeed: "betolla-prf-003",
  },
  {
    sku: "PRF-004",
    categorySlug: "perfume",
    nameEn: "Citrus Bloom Cologne",
    nameAr: "سيتروس بلوم - عطر كولونيا",
    descriptionEn:
      "A zesty burst of Sicilian bergamot and mandarin, layered over a clean cedarwood base.",
    descriptionAr: "انفجار منعش من البرغموت الصقلي والمندرين، فوق قاعدة نظيفة من خشب الأرز.",
    price: 21.9,
    stock: 72,
    imageSeed: "betolla-prf-004",
  },
  {
    sku: "PRF-005",
    categorySlug: "perfume",
    nameEn: "Velvet Vanilla Eau de Parfum",
    nameAr: "فيلفيت فانيلا - عطر او دو بارفان",
    descriptionEn:
      "A gourmand blend of Madagascar vanilla and warm sandalwood for an irresistibly cozy signature.",
    descriptionAr:
      "مزيج شهي من الفانيليا المدغشقرية وخشب الصندل الدافئ، لتوقيع عطري دافئ لا يُقاوم.",
    price: 27.5,
    compareAtPrice: 32.0,
    stock: 45,
    imageSeed: "betolla-prf-005",
  },
  {
    sku: "PRF-006",
    categorySlug: "perfume",
    nameEn: "Neroli Garden Eau de Toilette",
    nameAr: "نيرولي غاردن - عطر او دو تواليت",
    descriptionEn:
      "A sunny, green-floral scent built around neroli blossom, orange flower, and a hint of mint.",
    descriptionAr:
      "عطر مشمس بطابع زهري أخضر يتمحور حول زهرة النيرولي والزهر مع لمسة من النعناع.",
    price: 24.9,
    stock: 58,
    imageSeed: "betolla-prf-006",
  },
  {
    sku: "PRF-007",
    categorySlug: "perfume",
    nameEn: "Saffron Rose Eau de Parfum",
    nameAr: "زعفران روز - عطر او دو بارفان",
    descriptionEn:
      "A rich Middle Eastern-inspired blend of saffron threads, Damascus rose, and warm woods.",
    descriptionAr:
      "مزيج شرقي غني بخيوط الزعفران والورد الدمشقي وخشب دافئ، مستوحى من عبق الشرق الأصيل.",
    price: 34.5,
    stock: 30,
    imageSeed: "betolla-prf-007",
  },
  {
    sku: "PRF-008",
    categorySlug: "perfume",
    nameEn: "White Musk Body Mist",
    nameAr: "ميست الجسم بالمسك الأبيض",
    descriptionEn:
      "A light, all-over body mist with clean white musk and a whisper of vanilla for everyday freshness.",
    descriptionAr:
      "رذاذ جسم خفيف بالمسك الأبيض النظيف ولمسة من الفانيليا، لانتعاش يومي بسيط.",
    price: 14.5,
    stock: 100,
    imageSeed: "betolla-prf-008",
  },

  // ---- Eyeshadow & Blush ----
  {
    sku: "EYE-001",
    categorySlug: "eyes-and-cheeks",
    nameEn: "Terracotta Dreams Eyeshadow Palette",
    nameAr: "باليت ظلال العيون - أحلام التراكوتا",
    descriptionEn:
      "A 9-shade palette of warm terracottas and soft golds, blending from matte to shimmer with ease.",
    descriptionAr:
      "باليت من 9 درجات دافئة بين التراكوتا والذهبي، تتراوح بين المطفي واللامع وتمتزج بسهولة.",
    price: 22.9,
    stock: 55,
    imageSeed: "betolla-eye-001",
  },
  {
    sku: "EYE-002",
    categorySlug: "eyes-and-cheeks",
    nameEn: "Rose Petal Blush - Soft Pink",
    nameAr: "أحمر خدود - بتلة الورد",
    descriptionEn: "A finely-milled powder blush in a soft pink that mimics a natural, healthy flush.",
    descriptionAr: "أحمر خدود بودرة ناعمة القوام بدرجة وردية فاتحة، يمنح احمرارًا طبيعيًا وصحيًا.",
    price: 13.9,
    stock: 85,
    imageSeed: "betolla-eye-002",
  },
  {
    sku: "EYE-003",
    categorySlug: "eyes-and-cheeks",
    nameEn: "Botanical Chic Eyeshadow Quad",
    nameAr: "ربـاعية ظلال العيون - بوتانيكال شيك",
    descriptionEn:
      "A curated four-shade quad in forest green, blush pink, and champagne for effortless everyday looks.",
    descriptionAr:
      "أربع درجات مختارة بعناية بين الأخضر الغابي والوردي والشمبانيا، لإطلالة يومية سهلة.",
    price: 17.5,
    stock: 70,
    imageSeed: "betolla-eye-003",
  },
  {
    sku: "EYE-004",
    categorySlug: "eyes-and-cheeks",
    nameEn: "Cream Blush Stick - Terracotta Flush",
    nameAr: "أحمر خدود كريمي - توهج التراكوتا",
    descriptionEn: "A blendable cream stick that warms cheeks with a natural terracotta flush in seconds.",
    descriptionAr: "أستيك كريمي سهل المزج يمنح الخدود توهجًا طبيعيًا بدرجة التراكوتا خلال ثوانٍ.",
    price: 15.9,
    stock: 62,
    imageSeed: "betolla-eye-004",
  },
  {
    sku: "EYE-005",
    categorySlug: "eyes-and-cheeks",
    nameEn: "Shimmer Eyeshadow Stick - Bronze Gold",
    nameAr: "أستيك ظلال لامع - ذهبي برونزي",
    descriptionEn:
      "A one-swipe, crease-proof shimmer stick in a rich bronze gold that catches the light beautifully.",
    descriptionAr:
      "أستيك ظلال بلمسة واحدة مقاوم للتكسر، بدرجة ذهبي برونزي غنية تعكس الضوء بجمال.",
    price: 14.5,
    stock: 9,
    lowStockThreshold: 10,
    imageSeed: "betolla-eye-005",
  },
  {
    sku: "EYE-006",
    categorySlug: "eyes-and-cheeks",
    nameEn: "Highlighter Duo - Champagne Glow",
    nameAr: "ثنائية هايلايتر - توهج الشمبانيا",
    descriptionEn: "A two-shade highlighter duo that sculpts and glows with a soft champagne shimmer.",
    descriptionAr: "ثنائية هايلايتر بدرجتين تمنح الوجه توهجًا ناعمًا بلمعان الشمبانيا.",
    price: 18.9,
    stock: 48,
    imageSeed: "betolla-eye-006",
  },
  {
    sku: "EYE-007",
    categorySlug: "eyes-and-cheeks",
    nameEn: "Smoky Eyes Eyeshadow Palette",
    nameAr: "باليت ظلال العيون - سموكي آيز",
    descriptionEn:
      "A moody 12-shade palette of charcoal, plum, and bronze for a classic smoky eye every time.",
    descriptionAr:
      "باليت من 12 درجة بين الفحمي والبنفسجي والبرونزي، لإطلالة سموكي كلاسيكية في كل مرة.",
    price: 26.5,
    compareAtPrice: 31.0,
    stock: 38,
    imageSeed: "betolla-eye-007",
  },
  {
    sku: "EYE-008",
    categorySlug: "eyes-and-cheeks",
    nameEn: "Blush & Bronzer Duo Palette",
    nameAr: "باليت أحمر خدود وبرونزر ثنائية",
    descriptionEn: "A two-in-one duo pairing a warm bronzer with a rosy blush for effortless dimension.",
    descriptionAr: "باليت ثنائية تجمع بين برونزر دافئ وأحمر خدود وردي، لإطلالة متناسقة دون جهد.",
    price: 19.9,
    stock: 52,
    imageSeed: "betolla-eye-008",
  },

  // ---- Cleansers & Toners ----
  {
    sku: "CLN-001",
    categorySlug: "cleansers",
    nameEn: "Gentle Milk Cleanser",
    nameAr: "منظف الحليب اللطيف",
    descriptionEn: "A creamy, soap-free cleanser that lifts away makeup and impurities without stripping the skin.",
    descriptionAr: "منظف كريمي خالٍ من الصابون يزيل المكياج والشوائب دون أن يجرد البشرة من رطوبتها الطبيعية.",
    price: 12.9,
    stock: 110,
    imageSeed: "betolla-cln-001",
  },
  {
    sku: "CLN-002",
    categorySlug: "cleansers",
    nameEn: "Rose Water Balancing Toner",
    nameAr: "تونر ماء الورد المتوازن",
    descriptionEn: "An alcohol-free rosewater toner that refreshes, soothes, and preps skin for the next step.",
    descriptionAr: "تونر بماء الورد خالٍ من الكحول، ينعش البشرة ويهدئها ويجهزها للخطوة التالية من العناية.",
    price: 10.5,
    stock: 125,
    imageSeed: "betolla-cln-002",
  },
  {
    sku: "CLN-003",
    categorySlug: "cleansers",
    nameEn: "Foaming Vitamin C Cleanser",
    nameAr: "غسول رغوي بفيتامين سي",
    descriptionEn: "A light foaming cleanser with vitamin C that brightens while gently clearing away the day.",
    descriptionAr: "غسول رغوي خفيف بفيتامين سي يفتح لون البشرة مع تنظيف لطيف يزيل أثر اليوم.",
    price: 13.5,
    stock: 90,
    imageSeed: "betolla-cln-003",
  },
  {
    sku: "CLN-004",
    categorySlug: "cleansers",
    nameEn: "Micellar Cleansing Water",
    nameAr: "ماء ميسيلار للتنظيف",
    descriptionEn: "A no-rinse micellar water that melts away makeup and grime with a single swipe of cotton.",
    descriptionAr: "ماء ميسيلار لا يحتاج للشطف، يزيل المكياج والأوساخ بمسحة واحدة من القطن.",
    price: 11.9,
    stock: 140,
    imageSeed: "betolla-cln-004",
  },
  {
    sku: "CLN-005",
    categorySlug: "cleansers",
    nameEn: "Exfoliating Glow Toner - AHA/BHA",
    nameAr: "تونر التقشير واللمعان - AHA/BHA",
    descriptionEn: "A gentle exfoliating toner with AHA/BHA that resurfaces skin for a smoother, brighter look.",
    descriptionAr: "تونر تقشير لطيف يحتوي على أحماض AHA/BHA يجدد سطح البشرة لمظهر أنعم وأكثر إشراقًا.",
    price: 16.9,
    stock: 66,
    imageSeed: "betolla-cln-005",
  },
  {
    sku: "CLN-006",
    categorySlug: "cleansers",
    nameEn: "Charcoal Deep Cleanse Gel",
    nameAr: "جل التنظيف العميق بالفحم",
    descriptionEn: "A purifying charcoal gel cleanser that draws out excess oil and impurities from deep within pores.",
    descriptionAr: "جل تنظيف منقٍّ بالفحم النشط يسحب الزيوت الزائدة والشوائب من عمق المسام.",
    price: 12.5,
    stock: 80,
    imageSeed: "betolla-cln-006",
  },
  {
    sku: "CLN-007",
    categorySlug: "cleansers",
    nameEn: "Calming Chamomile Toner",
    nameAr: "تونر البابونج المهدئ",
    descriptionEn: "A soothing chamomile-infused toner formulated for sensitive, easily irritated skin.",
    descriptionAr: "تونر مهدئ بخلاصة البابونج مصمم خصيصًا للبشرة الحساسة والمعرضة للتهيج.",
    price: 11.5,
    stock: 95,
    imageSeed: "betolla-cln-007",
  },
  {
    sku: "CLN-008",
    categorySlug: "cleansers",
    nameEn: "Oil-to-Milk Makeup Remover",
    nameAr: "مزيل مكياج زيتي يتحول لحليب",
    descriptionEn: "A nourishing oil cleanser that transforms into a milky emulsion, removing every trace of makeup.",
    descriptionAr: "زيت منظف مغذٍّ يتحول عند ملامسته للماء إلى مستحلب حليبي يزيل كل أثر للمكياج.",
    price: 14.9,
    compareAtPrice: 17.9,
    stock: 58,
    imageSeed: "betolla-cln-008",
  },
];
