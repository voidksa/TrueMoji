(function () {
  'use strict';

  const currentVersion = chrome.runtime.getManifest().version;
  const supportLinks = {
    creators: { en: 'https://creators.sa/en/voidksa', ar: 'https://creators.sa/ar/voidksa' },
    coffee: { en: 'https://buymeacoffee.com/voidksa', ar: 'https://buymeacoffee.com/voidksa' }
  };
  var activeLang = 'en';

  function openSupport(kind) {
    const links = supportLinks[kind] || supportLinks.creators;
    chrome.tabs.create({ url: links[activeLang] || links.en });
  }

  chrome.storage.sync.get({ lang: 'en' }, function (v) {
    activeLang = v.lang || 'en';
    applyLanguage(activeLang);
    chrome.storage.sync.set({ lastSeenVersion: currentVersion });
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'sync' && changes.lang) {
      activeLang = changes.lang.newValue || 'en';
      applyLanguage(activeLang);
    }
  });

  var closeBtn = document.getElementById('closeBtn');
  if (closeBtn) closeBtn.addEventListener('click', function () { window.close(); });
  var supportCreatorsBtn = document.getElementById('supportCreatorsBtn');
  var supportCoffeeBtn = document.getElementById('supportCoffeeBtn');
  if (supportCreatorsBtn) supportCreatorsBtn.addEventListener('click', function () { openSupport('creators'); });
  if (supportCoffeeBtn) supportCoffeeBtn.addEventListener('click', function () { openSupport('coffee'); });
})();
