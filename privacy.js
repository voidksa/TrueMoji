/* TrueMoji v2 — Privacy page controller.
 * Same pattern as options.js: read lang from chrome.storage.sync, apply via
 * the shared applyLanguage() helper from i18n.js, listen for live changes,
 * write back when the toggle is clicked.
 */
(function () {
  'use strict';

  var DEFAULT_LANG = 'en';
  var currentLang = DEFAULT_LANG;
  var langToggle = document.getElementById('langToggle');

  function setLang(lang) {
    currentLang = lang === 'ar' ? 'ar' : 'en';
    applyLanguage(currentLang);
    langToggle.textContent = currentLang === 'en' ? 'العربية' : 'English';
  }

  chrome.storage.sync.get({ lang: DEFAULT_LANG }, function (v) {
    setLang(v.lang || DEFAULT_LANG);
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'sync' && changes.lang) setLang(changes.lang.newValue || DEFAULT_LANG);
  });

  langToggle.addEventListener('click', function () {
    var next = currentLang === 'ar' ? 'en' : 'ar';
    setLang(next);
    chrome.storage.sync.set({ lang: next });
  });
})();
