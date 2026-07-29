INSERT INTO "SiteSettings" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "StaticPage" (
  "id",
  "type",
  "titleEn",
  "titleAr",
  "contentHtmlEn",
  "contentHtmlAr",
  "isPublished",
  "createdAt",
  "updatedAt"
)
VALUES (
  'default-privacy-policy',
  'PRIVACY_POLICY',
  'Privacy Policy',
  'سياسة الخصوصية',
  '<h2>Information we collect</h2><p>We collect account, contact, delivery, order, support, and preference information that you provide while using Betolla.</p><h2>How we use it</h2><p>We use this information to operate your account, fulfil cash-on-delivery orders, provide support, prevent fraud, improve the store, and meet legal obligations.</p><h2>Sharing and retention</h2><p>Access is limited to authorised staff and delivery personnel who need the information to perform their work. We retain records only as long as reasonably necessary for operations, security, accounting, and legal requirements.</p><h2>Your choices</h2><p>You can update your account preferences and contact Betolla to ask about your personal information. Marketing preferences can be changed from your account.</p><h2>Security</h2><p>We use access controls, password hashing, session protections, audit records, and other safeguards. No internet service can guarantee absolute security.</p><h2>Contact</h2><p>Use the Contact Us link on this website for privacy questions.</p>',
  '<h2>المعلومات التي نجمعها</h2><p>نجمع معلومات الحساب والتواصل والتوصيل والطلبات والدعم والتفضيلات التي تقدمها أثناء استخدام بيتولا.</p><h2>كيف نستخدمها</h2><p>نستخدم هذه المعلومات لتشغيل حسابك وتنفيذ طلبات الدفع عند الاستلام وتقديم الدعم ومنع الاحتيال وتحسين المتجر والوفاء بالمتطلبات القانونية.</p><h2>المشاركة والاحتفاظ</h2><p>يقتصر الوصول على الموظفين وموظفي التوصيل المخولين الذين يحتاجون إلى المعلومات لأداء عملهم. نحتفظ بالسجلات للمدة اللازمة بشكل معقول للتشغيل والأمن والمحاسبة والمتطلبات القانونية.</p><h2>خياراتك</h2><p>يمكنك تحديث تفضيلات حسابك والتواصل مع بيتولا للاستفسار عن معلوماتك الشخصية. ويمكن تغيير تفضيلات التسويق من حسابك.</p><h2>الأمان</h2><p>نستخدم ضوابط الوصول وتشفير كلمات المرور وحماية الجلسات وسجلات التدقيق وغيرها من وسائل الحماية، ولا يمكن لأي خدمة عبر الإنترنت ضمان الأمان المطلق.</p><h2>التواصل</h2><p>استخدم رابط تواصل معنا في هذا الموقع لأي أسئلة حول الخصوصية.</p>',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
), (
  'default-about-us',
  'ABOUT_US',
  'About Us',
  'من نحن',
  '<h2>Betolla Cosmetics</h2><p>Betolla brings carefully selected beauty and personal-care products to customers across Jordan through a convenient bilingual shopping experience.</p><p>Add your company story, values, locations, and customer promise here from the Admin Dashboard.</p>',
  '<h2>بيتولا لمستحضرات التجميل</h2><p>تقدم بيتولا مجموعة مختارة بعناية من منتجات الجمال والعناية الشخصية للعملاء في جميع أنحاء الأردن من خلال تجربة تسوق مريحة باللغتين العربية والإنجليزية.</p><p>يمكن إضافة قصة الشركة وقيمها ومواقعها ووعدها للعملاء هنا من لوحة تحكم الإدارة.</p>',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("type") DO NOTHING;
