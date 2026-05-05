const CURRENT_VERSION = '2.0.1';
const MENU_TITLES = {
 en: 'Toggle TrueMoji for this site',
 ar: 'تفعيل/تعطيل TrueMoji لهذا الموقع'
};

function ensureContextMenu(lang) {
 const title = MENU_TITLES[lang] || MENU_TITLES.en;
 chrome.contextMenus.update('toggle_site', { title }, () => {
 if (chrome.runtime.lastError) {
 chrome.contextMenus.create({
 id: 'toggle_site',
 title,
 contexts: ['page', 'frame', 'selection', 'link', 'image']
 });
 }
 });
}

chrome.runtime.onInstalled.addListener((details) => {
 chrome.storage.sync.get({ lang: 'en', onboardingDone: false, lastSeenVersion: '' }, (data) => {
 ensureContextMenu(data.lang);

 if (details.reason === 'install') {
 chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
 } else if (details.reason === 'update' && data.lastSeenVersion !== CURRENT_VERSION) {
 const prev = data.lastSeenVersion || '';
 const isMajorBump = !prev || prev.split('.')[0] !== CURRENT_VERSION.split('.')[0];
 if (isMajorBump) {
 chrome.tabs.create({ url: chrome.runtime.getURL('changelog.html') });
 }
 chrome.storage.sync.set({ lastSeenVersion: CURRENT_VERSION });
 }
 });
});

chrome.runtime.onStartup.addListener(() => {
 chrome.storage.sync.get({ lang: 'en' }, (data) => ensureContextMenu(data.lang));
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
 if (info.menuItemId !== 'toggle_site' || !tab || !tab.url) return;
 try {
 const hostname = new URL(tab.url).hostname;
 chrome.storage.sync.get({ excludedDomains: '' }, (data) => {
 let list = (data.excludedDomains || '')
 .split('\n')
 .map((x) => x.trim())
 .filter(Boolean);
 if (list.includes(hostname)) {
 list = list.filter((x) => x !== hostname);
 } else {
 list.push(hostname);
 }
 chrome.storage.sync.set({ excludedDomains: list.join('\n') }, () => {
 chrome.tabs.reload(tab.id);
 });
 });
 } catch (e) {
 }
});

chrome.storage.onChanged.addListener((changes, area) => {
 if (area === 'sync' && changes.lang) ensureContextMenu(changes.lang.newValue);
});

chrome.action.onClicked.addListener(() => {
 chrome.action.setBadgeText({ text: '' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
 if (request && request.action === 'fetch_image_blob' && request.url) {
 fetch(request.url)
 .then((res) => {
 if (!res.ok) throw new Error('HTTP ' + res.status);
 return res.blob();
 })
 .then((blob) => new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onloadend = () => resolve(reader.result);
 reader.onerror = () => reject(reader.error);
 reader.readAsDataURL(blob);
 }))
 .then((dataUri) => sendResponse({ dataUri }))
 .catch((err) => sendResponse({ error: err.message || String(err) }));
 return true;
 }
});
