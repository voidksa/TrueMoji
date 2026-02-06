const TRANSLATIONS = {
  en: {
    title: "TrueMoji",
    generalSettings: "General Settings",
    emojiStyle: "Emoji Style",
    interactionSettings: "Interaction & Shortcuts",
    websiteControl: "Website Control",
    enableLabel: "Enable TrueMoji",
    statusOn: "On",
    statusOff: "Off",
    setLabel: "Image set",
    strictLabel: "Strict set only",
    strictHint: "When enabled, TrueMoji uses only the selected image set. If an emoji is missing in that set, it remains as native text. Disable to allow fallback to other sets when an image is unavailable.",
    reloadTab: "Reload tab",
    preview: "Preview Emojis",
    hidePreview: "Hide Preview",
    optionsLink: "Options",
    settingsTitle: "TrueMoji Settings",
    apple: "Apple",
    google: "Google",
    fluent: "Fluent (3D)",
    joypixels: "JoyPixels",
    openmoji: "OpenMoji",
    twitter: "Twitter",
    facebook: "Facebook",
    rateExtension: "Rate Extension",
    quickActions: "Quick Actions",
    quickActionsHint: "Change language or rate the extension.",
    reloadTabBtn: "Reload Tab",
    previewEmojisBtn: "Preview Emojis",
    autoReloadLabel: "Auto reload pages",
    autoReloadHint: "Automatically reload open pages when you change the image set or settings.",
    loadMore: "Load more",
    emojiSizeLabel: "Emoji Size",
    emojiSizeHint: "Adjust the size of the emoji images relative to the text.",
    excludeListLabel: "Excluded Domains",
    excludeListHint: "Enter domains where TrueMoji should be disabled (one per line). Example: docs.google.com",
    excludePlaceholder: "example.com\ndocs.google.com",
    excludeSite: "Disable on this site",
    showOriginalLabel: "Show original on hover",
    showOriginalHint: "Show the original native emoji when you hover over the replaced image.",
    shortcutLabel: "Keyboard Shortcut",
    shortcutHint: "Click the input and press your desired key combination to toggle TrueMoji.",
    shortcutPlaceholder: "Click to record shortcut",
    customSiteLabel: "Per-Site Customization",
    customSiteHint: "Choose a specific emoji set for certain websites.",
    domainPlaceholder: "example.com",
    addRule: "Add Rule",
    removeRule: "Remove",
    clearShortcut: "Clear Shortcut",
    supportProject: "Support Project",
    contextMenuToggle: "Toggle TrueMoji for this site"
  },
  ar: {
    title: "TrueMoji",
    generalSettings: "الإعدادات العامة",
    emojiStyle: "نمط الإيموجي",
    interactionSettings: "التفاعل والاختصارات",
    websiteControl: "التحكم في المواقع",
    enableLabel: "تفعيل TrueMoji",
    statusOn: "مفعل",
    statusOff: "معطل",
    setLabel: "مجموعة الصور",
    strictLabel: "المجموعة المختارة فقط",
    strictHint: "عند التفعيل، تستخدم TrueMoji مجموعة الصور المختارة فقط. إذا كان الإيموجي غير متوفر في تلك المجموعة، سيظهر كنص أصلي. عطل الخيار للسماح باستخدام مجموعات أخرى عند عدم توفر الصورة.",
    reloadTab: "إعادة تحميل التبويب",
    preview: "معاينة الإيموجيات",
    hidePreview: "إخفاء المعاينة",
    optionsLink: "الإعدادات",
    settingsTitle: "إعدادات TrueMoji",
    apple: "Apple",
    google: "Google",
    fluent: "Fluent (3D)",
    joypixels: "JoyPixels",
    openmoji: "OpenMoji",
    twitter: "Twitter",
    facebook: "Facebook",
    system: "System",
    rateExtension: "تقييم الإضافة",
    quickActions: "إجراءات سريعة",
    quickActionsHint: "تغيير اللغة أو تقييم الإضافة.",
    reloadTabBtn: "إعادة تحميل التبويب",
    previewEmojisBtn: "معاينة الإيموجيات",
    autoReloadLabel: "إعادة التحميل التلقائي",
    autoReloadHint: "إعادة تحميل الصفحات المفتوحة تلقائياً عند تغيير مجموعة الصور أو الإعدادات.",
    loadMore: "عرض المزيد",
    emojiSizeLabel: "حجم الإيموجي",
    emojiSizeHint: "تعديل حجم صور الإيموجي بالنسبة للنص.",
    excludeListLabel: "المواقع المستثناة",
    excludeListHint: "أدخل النطاقات التي تريد تعطيل TrueMoji فيها (نطاق واحد في كل سطر). مثال: docs.google.com",
    excludePlaceholder: "example.com\ndocs.google.com",
    excludeSite: "تعطيل في هذا الموقع",
    showOriginalLabel: "إظهار الأصلي عند التحويم",
    showOriginalHint: "عرض الإيموجي الأصلي عند تمرير مؤشر الفأرة فوق الصورة المستبدلة.",
    shortcutLabel: "اختصار لوحة المفاتيح",
    shortcutHint: "انقر داخل الحقل واضغط على مفاتيح الاختصار لتسجيلها لتبديل تفعيل الإضافة.",
    shortcutPlaceholder: "انقر لتسجيل الاختصار",
    customSiteLabel: "تخصيص لكل موقع",
    customSiteHint: "اختر مجموعة إيموجي محددة لمواقع معينة.",
    domainPlaceholder: "example.com",
    addRule: "إضافة قاعدة",
    removeRule: "حذف",
    clearShortcut: "مسح الاختصار",
    supportProject: "دعم المشروع",
    contextMenuToggle: "تفعيل/تعطيل TrueMoji لهذا الموقع"
  }
};

const DEFAULT_LANG = 'en';

function applyLanguage(lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Apply text content by data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });

  // Apply title attribute by data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    if (t[key]) el.title = t[key];
  });

  // Apply placeholder attribute by data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (t[key]) el.placeholder = t[key];
  });

  // Update status text dynamically if needed
  const updateStatus = (id, checked) => {
    const el = document.getElementById(id);
    if (el) el.textContent = checked ? t.statusOn : t.statusOff;
  };

  const enabledEl = document.getElementById('enabled');
  if (enabledEl) updateStatus('enabledStatus', enabledEl.checked);

  const strictEl = document.getElementById('strict');
  if (strictEl) updateStatus('strictStatus', strictEl.checked);

  const autoReloadEl = document.getElementById('autoReload');
  if (autoReloadEl) updateStatus('autoReloadStatus', autoReloadEl.checked);

  const setStatusEl = document.getElementById('setStatus');
  if (setStatusEl) {
    const segEl = document.getElementById('setSeg');
    const selected = segEl?.querySelector('.seg-btn.selected')?.dataset.set;
    if (selected) {
      const map = {
        'apple': 'apple', 'google': 'google', 'system': 'system',
        'fluent-color': 'fluent', 'joypixels': 'joypixels',
        'openmoji': 'openmoji', 'twitter': 'twitter', 'facebook': 'facebook'
      };
      setStatusEl.textContent = t[map[selected]] || selected;
    }
  }

  // Update button text for set segments
  document.querySelectorAll('.seg-btn').forEach(btn => {
    const setKey = btn.getAttribute('data-i18n-set');
    if (setKey && t[setKey]) {
      btn.textContent = t[setKey];
    }
  });

  // Update specific elements if they exist
  const openOptionsEl = document.getElementById('openOptions');
  if (openOptionsEl) openOptionsEl.textContent = t.optionsLink;
}
