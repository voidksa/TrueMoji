/* TrueMoji v2 UI translations.
 * applyLanguage() walks data-i18n / data-i18n-title / data-i18n-placeholder
 * attributes and swaps text/title/placeholder for the active language.
 */
const TRANSLATIONS = {
 en: {
 /* Brand */
 title: "TrueMoji",
 tagline: "Replace native emojis with beautiful image sets",
 versionPill: "v2.0",

 /* Common */
 statusOn: "On",
 statusOff: "Off",
 cancel: "Cancel",
 save: "Save",
 done: "Done",
 next: "Next",
 back: "Back",
 skip: "Skip",
 close: "Close",
 apply: "Apply",
 reset: "Reset",
 optionsLink: "Options",
 settingsTitle: "TrueMoji Settings",
 rateExtension: "Rate on Chrome Web Store",
 supportProject: "Support Project",
 poweredBy: "Built with care",
 privacyLink: "Privacy",

 /* Sections */
 generalSettings: "General",
 emojiStyle: "Emoji Pack",
 interactionSettings: "Interaction",
 websiteControl: "Website Rules",
 advancedSettings: "Advanced",
 backupSection: "Backup & Restore",

 /* Toggles */
 enableLabel: "Enable TrueMoji",
 enableHint: "Master switch for all emoji replacement.",
 autoReloadLabel: "Auto-reload pages",
 autoReloadHint: "Refresh open tabs when settings change.",
 strictLabel: "Strict pack mode",
 strictHint: "Use the selected pack only. No fallback to other packs when an emoji is missing.",
 showOriginalLabel: "Show original on hover",
 showOriginalHint: "Reveal the native emoji when hovering over a replaced image.",
 excludeSite: "Disable on this site",

 /* Pack picker */
 setLabel: "Image set",
 pickPackHint: "Tap a pack to switch instantly.",
 livePreviewLabel: "Live preview",
 previewEmojisBtn: "Preview all emojis",
 hidePreview: "Hide preview",
 loadMore: "Load more",
 packCountSuffix: "packs",

 /* Emoji size */
 emojiSizeLabel: "Emoji size",
 emojiSizeHint: "Scale image emojis from 1.0× to 1.5× the surrounding text.",

 /* Shortcut */
 shortcutLabel: "Toggle shortcut",
 shortcutHint: "Click the field, then press a key combination to toggle TrueMoji on or off.",
 shortcutPlaceholder: "Click and press keys",
 clearShortcut: "Clear shortcut",

 /* Domains */
 excludeListLabel: "Excluded domains",
 excludeListHint: "Domains where TrueMoji should stay disabled (one per line).",
 excludePlaceholder: "example.com\ndocs.google.com",
 customSiteLabel: "Per-site pack rules",
 customSiteHint: "Force a specific pack on certain sites.",
 domainPlaceholder: "twitter.com",
 addRule: "Add rule",
 removeRule: "Remove",
 noCustomRules: "No custom rules yet.",

 /* Backup */
 exportLabel: "Export settings",
 exportHint: "Download a JSON file with all your TrueMoji preferences.",
 exportBtn: "Download backup",
 importLabel: "Import settings",
 importHint: "Restore from a previously exported JSON file.",
 importBtn: "Choose file",
 importSuccess: "Settings imported successfully.",
 importError: "Could not import. Invalid file.",
 resetLabel: "Reset all settings",
 resetHint: "Restore TrueMoji to its first-run state.",
 resetBtn: "Reset",
 resetConfirm: "Reset all settings to defaults? This cannot be undone.",

 /* Picker */
 pickerTitle: "Emoji Picker",
 pickerSearchPlaceholder: "Search emojis…",
 pickerNoResults: "No emojis match that search.",
 pickerCopied: "Copied!",
 pickerRecents: "Recent",
 pickerFavorites: "Favorites",
 pickerOpenBtn: "Open picker",
 pickerHint: "Click any emoji to copy it in your selected pack’s style.",
 catSmileys: "Smileys & People",
 catNature: "Animals & Nature",
 catFood: "Food & Drink",
 catActivity: "Activities",
 catTravel: "Travel & Places",
 catObjects: "Objects",
 catSymbols: "Symbols",
 catFlags: "Flags",

 /* Pack labels */
 apple: "Apple",
 google: "Google",
 fluent: "Fluent 3D",
 "fluent-flat": "Fluent Flat",
 twemoji: "Twemoji 15",
 twitter: "Twitter (legacy)",
 facebook: "Facebook",
 noto: "Noto Color",
 openmoji: "OpenMoji",
 system: "System",

 /* Onboarding */
 welcomeTitle: "Welcome to TrueMoji",
 welcomeBody: "A quick three-step tour and you're set.",
 pickLanguage: "Choose your language",
 pickPack: "Pick your favorite emoji pack",
 pickShortcut: "Optional: bind a toggle shortcut",
 finish: "Get started",

 /* Changelog */
 whatsNew: "What's new",
 whatsNewBody: "TrueMoji 2.0 brings a fresh look, three new emoji packs, an emoji picker, settings backup, and a faster engine.",

 /* Misc */
 reloadTab: "Reload tab",
 reloadTabBtn: "Reload current tab",
 quickActions: "Quick actions",
 quickActionsHint: "Switch language or rate the extension.",
 contextMenuToggle: "Toggle TrueMoji for this site",
 preview: "Live Preview",
 sampleSentence: "Hi 👋 click any pack to see the difference 🔥 ✨ 😎",

 /* Privacy page */
 privacyEyebrow: "Legal",
 privacyTitle: "Privacy Policy",
 privacyVersion: "Version 2.0.0",
 privacyLastUpdated: "Last updated: April 2026",
 privacyKeypoint: "TrueMoji does not collect, store, share, or sell any personal information. No telemetry, no analytics, no tracking. Ever.",
 privacyHData: "Data Collection",
 privacyPData1: "All your settings (selected emoji pack, language, keyboard shortcut, excluded domains, picker recents and favorites) are stored using Chrome's storage.sync and storage.local APIs. They live on your device, or sync through your own Google account if you have Chrome Sync enabled. We don't operate any server. We don't see your data.",
 privacyPDataLi1: "We do not track your browsing history.",
 privacyPDataLi2: "We do not collect analytics, telemetry, or usage data.",
 privacyPDataLi3: "We do not transmit any personal data to anyone.",
 privacyHPerm: "Permissions",
 privacyPPermIntro: "TrueMoji asks for the minimum permissions needed to do its job:",
 privacyPPerm1: "to save your preferences locally.",
 privacyPPerm2: "to reload the current tab when you change settings, and to open the options or picker page.",
 privacyPPerm3: "to add the right-click \"Toggle TrueMoji on this site\" menu item.",
 privacyPPerm4: "to allow emoji images from the public CDN to load on websites with strict Content Security Policies.",
 privacyPPerm5: "required for the content script that scans page text and replaces native emoji characters with images. This processing happens entirely on your device. TrueMoji does not read passwords, emails, or anything beyond what is needed to detect emoji characters.",
 privacyHThird: "Third Parties",
 privacyPThird1: "TrueMoji loads emoji images from jsDelivr, a public open-source CDN. Your browser makes a standard HTTP request to cdn.jsdelivr.net when an emoji renders.",
 privacyPThirdLi1: "jsDelivr may log basic connection info (such as IP address) for security and performance, governed by their privacy policy.",
 privacyPThirdLi2: "TrueMoji does not send any personal user data to jsDelivr or any other party.",
 privacyHKids: "Children's Privacy",
 privacyPKids: "TrueMoji does not knowingly collect any data from children under the age of 13.",
 privacyHChanges: "Changes to This Policy",
 privacyPChanges: "If this policy changes, we update the version and date at the top of this page and bump the extension version. There's no remote sync; the policy ships with the extension.",
 privacyHContact: "Contact",
 privacyPContact: "For privacy questions, contact the developer on the Chrome Web Store listing or via the email registered there.",
 privacyCopyright: "© 2026 voidksa. MIT license.",
 privacyBack: "Back"
 },

 ar: {
 title: "TrueMoji",
 tagline: "استبدل الإيموجي الأصلي بصور عالية الجودة",
 versionPill: "v2.0",

 statusOn: "مفعل",
 statusOff: "معطل",
 cancel: "إلغاء",
 save: "حفظ",
 done: "تم",
 next: "التالي",
 back: "رجوع",
 skip: "تخطي",
 close: "إغلاق",
 apply: "تطبيق",
 reset: "إعادة",
 optionsLink: "الإعدادات",
 settingsTitle: "إعدادات TrueMoji",
 rateExtension: "قيّم الإضافة في سوق كروم",
 supportProject: "ادعم المشروع",
 poweredBy: "صُنع باهتمام",
 privacyLink: "الخصوصية",

 generalSettings: "الإعدادات العامة",
 emojiStyle: "حزمة الإيموجي",
 interactionSettings: "التفاعل والاختصارات",
 websiteControl: "قواعد المواقع",
 advancedSettings: "متقدم",
 backupSection: "النسخ الاحتياطي والاستعادة",

 enableLabel: "تفعيل TrueMoji",
 enableHint: "مفتاح رئيسي لتفعيل أو تعطيل استبدال الإيموجي.",
 autoReloadLabel: "إعادة التحميل التلقائي",
 autoReloadHint: "تحديث التبويبات المفتوحة تلقائياً عند تغيير الإعدادات.",
 strictLabel: "وضع الحزمة الصارم",
 strictHint: "استخدم الحزمة المختارة فقط. بدون رجوع لحزم أخرى عند نقص الإيموجي.",
 showOriginalLabel: "إظهار الأصلي عند التحويم",
 showOriginalHint: "اعرض الإيموجي الأصلي عند تمرير المؤشر فوق الصورة.",
 excludeSite: "تعطيل في هذا الموقع",

 setLabel: "مجموعة الصور",
 pickPackHint: "انقر على أي حزمة لتبديلها مباشرة.",
 livePreviewLabel: "معاينة فورية",
 previewEmojisBtn: "معاينة كل الإيموجيات",
 hidePreview: "إخفاء المعاينة",
 loadMore: "عرض المزيد",
 packCountSuffix: "حزم",

 emojiSizeLabel: "حجم الإيموجي",
 emojiSizeHint: "كبّر صور الإيموجي من 1.0× إلى 1.5× مقارنة بالنص.",

 shortcutLabel: "اختصار التبديل",
 shortcutHint: "انقر داخل الحقل واضغط مفاتيح الاختصار لتبديل TrueMoji.",
 shortcutPlaceholder: "انقر واضغط المفاتيح",
 clearShortcut: "مسح الاختصار",

 excludeListLabel: "المواقع المستثناة",
 excludeListHint: "النطاقات التي تريد تعطيل TrueMoji فيها (نطاق في كل سطر).",
 excludePlaceholder: "example.com\ndocs.google.com",
 customSiteLabel: "قواعد لكل موقع",
 customSiteHint: "اختر حزمة مخصصة لمواقع معينة.",
 domainPlaceholder: "twitter.com",
 addRule: "إضافة قاعدة",
 removeRule: "حذف",
 noCustomRules: "ما في قواعد مخصصة بعد.",

 exportLabel: "تصدير الإعدادات",
 exportHint: "تحميل ملف JSON يحتوي على كل إعداداتك.",
 exportBtn: "تحميل النسخة",
 importLabel: "استيراد الإعدادات",
 importHint: "استعادة من ملف JSON صدّرته سابقاً.",
 importBtn: "اختيار ملف",
 importSuccess: "تم الاستيراد بنجاح.",
 importError: "تعذر الاستيراد. الملف غير صحيح.",
 resetLabel: "إعادة كل الإعدادات",
 resetHint: "ارجع إلى الإعدادات الافتراضية.",
 resetBtn: "إعادة",
 resetConfirm: "متأكد من إعادة كل الإعدادات؟ ما يمكن التراجع.",

 pickerTitle: "متصفح الإيموجي",
 pickerSearchPlaceholder: "ابحث عن إيموجي…",
 pickerNoResults: "ما لقينا إيموجي يطابق بحثك.",
 pickerCopied: "تم النسخ!",
 pickerRecents: "الأخيرة",
 pickerFavorites: "المفضلة",
 pickerOpenBtn: "فتح المتصفح",
 pickerHint: "انقر أي إيموجي لنسخه بنمط الحزمة المختارة.",
 catSmileys: "وجوه وأشخاص",
 catNature: "حيوانات وطبيعة",
 catFood: "طعام وشراب",
 catActivity: "أنشطة",
 catTravel: "سفر وأماكن",
 catObjects: "أغراض",
 catSymbols: "رموز",
 catFlags: "أعلام",

 apple: "Apple",
 google: "Google",
 fluent: "Fluent 3D",
 "fluent-flat": "Fluent Flat",
 twemoji: "Twemoji 15",
 twitter: "Twitter القديم",
 facebook: "Facebook",
 noto: "Noto Color",
 openmoji: "OpenMoji",
 system: "النظام",

 welcomeTitle: "أهلاً بك في TrueMoji",
 welcomeBody: "ثلاث خطوات سريعة وتنطلق.",
 pickLanguage: "اختر اللغة",
 pickPack: "اختر حزمة الإيموجي المفضلة",
 pickShortcut: "اختياري: اربط اختصار للتبديل",
 finish: "ابدأ",

 whatsNew: "الجديد",
 whatsNewBody: "TrueMoji 2.0 يجي بتصميم جديد، ثلاث حزم إيموجي جديدة، متصفح إيموجي، نسخ احتياطي للإعدادات، ومحرك أسرع.",

 reloadTab: "إعادة تحميل",
 reloadTabBtn: "إعادة تحميل التبويب",
 quickActions: "إجراءات سريعة",
 quickActionsHint: "غيّر اللغة أو قيّم الإضافة.",
 contextMenuToggle: "تفعيل/تعطيل TrueMoji لهذا الموقع",
 preview: "معاينة فورية",
 sampleSentence: "هلا 👋 جرب تنقر أي حزمة 😎 وشف الفرق 🔥 ✨",

 /* Privacy page */
 privacyEyebrow: "قانوني",
 privacyTitle: "سياسة الخصوصية",
 privacyVersion: "الإصدار 2.0.0",
 privacyLastUpdated: "آخر تحديث: أبريل 2026",
 privacyKeypoint: "TrueMoji لا يجمع، لا يخزّن، لا يشارك، ولا يبيع أي معلومات شخصية. ما في تتبع، ما في تحليلات، ما في إحصاءات. أبداً.",
 privacyHData: "جمع البيانات",
 privacyPData1: "كل إعداداتك (حزمة الإيموجي المختارة، اللغة، اختصار لوحة المفاتيح، المواقع المستثناة، الإيموجيات الأخيرة والمفضلة) محفوظة بواسطة واجهات Chrome storage.sync و storage.local. تبقى على جهازك أو تتزامن عبر حسابك في جوجل لو فعّلت Chrome Sync. ما عندنا أي سيرفر، وما نرى بياناتك.",
 privacyPDataLi1: "ما نتتبع سجل تصفحك.",
 privacyPDataLi2: "ما نجمع تحليلات أو إحصاءات استخدام.",
 privacyPDataLi3: "ما نرسل أي بيانات شخصية لأي طرف.",
 privacyHPerm: "الأذونات",
 privacyPPermIntro: "TrueMoji يطلب الحد الأدنى من الأذونات اللازمة لعمله:",
 privacyPPerm1: "لحفظ إعداداتك محلياً.",
 privacyPPerm2: "لإعادة تحميل التبويب الحالي عند تغيير الإعدادات، ولفتح صفحة الإعدادات أو متصفح الإيموجي.",
 privacyPPerm3: "لإضافة خيار \"تفعيل/تعطيل TrueMoji لهذا الموقع\" في قائمة النقر بالزر الأيمن.",
 privacyPPerm4: "للسماح بصور الإيموجي من شبكة CDN العامة بالتحميل في المواقع التي تطبّق سياسة CSP صارمة.",
 privacyPPerm5: "مطلوب لمحرّك الـcontent script الذي يفحص نص الصفحة ويستبدل الإيموجي بصور. هذه العملية تتم بالكامل على جهازك. TrueMoji لا يقرأ كلمات المرور أو الإيميلات أو أي شيء غير الإيموجيات.",
 privacyHThird: "الأطراف الخارجية",
 privacyPThird1: "TrueMoji يحمّل صور الإيموجي من jsDelivr، وهي شبكة CDN عامة مفتوحة المصدر. متصفحك يرسل طلب HTTP عادي إلى cdn.jsdelivr.net عند عرض إيموجي.",
 privacyPThirdLi1: "jsDelivr قد تسجّل معلومات اتصال أساسية (مثل عنوان IP) لأغراض الأمان والأداء، حسب سياسة الخصوصية الخاصة بهم.",
 privacyPThirdLi2: "TrueMoji لا يرسل أي بيانات شخصية إلى jsDelivr أو أي طرف آخر.",
 privacyHKids: "خصوصية الأطفال",
 privacyPKids: "TrueMoji لا يجمع عن قصد أي بيانات من الأطفال تحت سن 13 سنة.",
 privacyHChanges: "التغييرات على هذه السياسة",
 privacyPChanges: "لو تغيّرت هذه السياسة، نحدّث الإصدار والتاريخ في أعلى الصفحة، ونرفع رقم إصدار الإضافة. ما في مزامنة عن بُعد، السياسة تأتي مع الإضافة.",
 privacyHContact: "التواصل",
 privacyPContact: "للاستفسارات عن الخصوصية، تواصل مع المطور عبر صفحة الإضافة في سوق كروم أو الإيميل المسجّل هناك.",
 privacyCopyright: "© 2026 voidksa. ترخيص MIT.",
 privacyBack: "رجوع"
 }
};

const DEFAULT_LANG = 'en';

function applyLanguage(lang) {
 const t = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
 document.documentElement.lang = lang;
 document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

 document.querySelectorAll('[data-i18n]').forEach(el => {
 const key = el.dataset.i18n;
 if (t[key] != null) el.textContent = t[key];
 });
 document.querySelectorAll('[data-i18n-title]').forEach(el => {
 const key = el.dataset.i18nTitle;
 if (t[key] != null) el.title = t[key];
 });
 document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
 const key = el.dataset.i18nPlaceholder;
 if (t[key] != null) el.placeholder = t[key];
 });
 document.querySelectorAll('[data-i18n-aria]').forEach(el => {
 const key = el.dataset.i18nAria;
 if (t[key] != null) el.setAttribute('aria-label', t[key]);
 });
 document.querySelectorAll('[data-i18n-set]').forEach(el => {
 const key = el.dataset.i18nSet;
 if (t[key] != null) el.textContent = t[key];
 });
}
