(function () {
  'use strict';

  const currentVersion = chrome.runtime.getManifest().version;

  chrome.storage.sync.get({ lang: 'en' }, function (v) {
    applyLanguage(v.lang || 'en');
    chrome.storage.sync.set({ lastSeenVersion: currentVersion });
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'sync' && changes.lang) applyLanguage(changes.lang.newValue || 'en');
  });

  var closeBtn = document.getElementById('closeBtn');
  if (closeBtn) closeBtn.addEventListener('click', function () { window.close(); });
})();
