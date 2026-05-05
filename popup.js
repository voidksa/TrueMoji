(function () {
 'use strict';

 var DEFAULT_ENABLED = true;
 var DEFAULT_SET = 'apple';
 var DEFAULT_LANG = 'en';
 var DATASET_CACHE_KEY = 'truemoji_data';
 var SUPPORT_LINKS = {
 creators: { en: 'https://creators.sa/en/voidksa', ar: 'https://creators.sa/ar/voidksa' },
 coffee: { en: 'https://buymeacoffee.com/voidksa', ar: 'https://buymeacoffee.com/voidksa' }
 };

 var Packs = window.TrueMojiPacks;
 var els = {
 enabled: document.getElementById('enabled'),
 masterCard: document.getElementById('masterCard'),
 masterSub: document.getElementById('masterSub'),
 previewCard: document.getElementById('previewCard'),
 previewText: document.getElementById('previewText'),
 previewPackPill: document.getElementById('previewPackPill'),
 packGrid: document.getElementById('packGrid'),
 packCount: document.getElementById('packCount'),
 siteRow: document.getElementById('siteRow'),
 siteHost: document.getElementById('siteHost'),
 excludeSite: document.getElementById('excludeSite'),
 langToggle: document.getElementById('langToggle'),
 openOptions: document.getElementById('openOptionsBtn'),
 openPicker: document.getElementById('openPickerBtn'),
 openPicker2: document.getElementById('openPickerBtn2'),
 supportCreatorsBtn: document.getElementById('supportCreatorsBtn'),
 supportCoffeeBtn: document.getElementById('supportCoffeeBtn')
 };

 var state = {
 lang: DEFAULT_LANG,
 enabled: DEFAULT_ENABLED,
 set: DEFAULT_SET,
 dataset: null
 };

 function tr(key) {
 return (TRANSLATIONS[state.lang] || TRANSLATIONS.en)[key] || key;
 }

 function renderPackGrid() {
 els.packGrid.innerHTML = '';
 var visible = Packs.PACKS.filter(function (p) { return p.id !== 'system' || true; });
 visible.forEach(function (pack) {
 var btn = document.createElement('button');
 btn.className = 'pack' + (pack.id === state.set ? ' is-selected' : '');
 btn.dataset.set = pack.id;

 var thumbs = document.createElement('div');
 thumbs.className = 'pack-thumbs';

 if (pack.id === 'system') {
 var span = document.createElement('span');
 span.className = 'thumb-fallback';
 span.textContent = '😀😎';
 thumbs.appendChild(span);
 } else {
 var samples = (pack.preview || []).slice(0, 2);
 samples.forEach(function (uni) {
 var entry = state.dataset ? state.dataset.byUnified[uni.toUpperCase()] : null;
 var image = entry ? entry.image : null;
 var url = Packs.urlFor(pack.id, uni.toUpperCase(), image);
 if (!url) return;
 var img = document.createElement('img');
 img.src = url;
 img.alt = '';
 img.onerror = function () { img.style.visibility = 'hidden'; };
 thumbs.appendChild(img);
 });
 if (!thumbs.children.length) {
 var fb = document.createElement('span');
 fb.className = 'thumb-fallback';
 fb.textContent = '✨';
 thumbs.appendChild(fb);
 }
 }

 var name = document.createElement('span');
 name.className = 'pack-name';
 name.textContent = (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][pack.id]) || pack.label;

 btn.appendChild(thumbs);
 btn.appendChild(name);
 btn.addEventListener('click', function () { selectPack(pack.id); });
 els.packGrid.appendChild(btn);
 });

 els.packCount.textContent = (Packs.PACKS.length - 1) + ' ' + tr('packCountSuffix');
 }

 function selectPack(id) {
 state.set = Packs.migratePack(id);
 chrome.storage.sync.set({ set: state.set });
 Array.prototype.forEach.call(els.packGrid.querySelectorAll('.pack'), function (b) {
 b.classList.toggle('is-selected', b.dataset.set === state.set);
 });
 updatePreviewPill();
 renderPreview();
 }

 var EMOJI_PATTERN = /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:[\u{1F3FB}-\u{1F3FF}](?:\uFE0F|\uFE0E)?)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:[\u{1F3FB}-\u{1F3FF}](?:\uFE0F|\uFE0E)?)?)*|[\u{1F1E6}-\u{1F1FF}]{2})/gu;

 function renderPreview() {
 var text = tr('sampleSentence');
 els.previewText.innerHTML = '';
 if (!state.enabled || state.set === 'system' || !state.dataset) {
 els.previewText.textContent = text;
 return;
 }
 var lastIndex = 0;
 var m;
 EMOJI_PATTERN.lastIndex = 0;
 while ((m = EMOJI_PATTERN.exec(text))) {
 if (m.index > lastIndex) {
 els.previewText.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
 }
 var token = m[0];
 var uni = Packs.unifiedFromChars(token);
 var entry = state.dataset.byUnified[uni] || state.dataset.byUnified[uni.replace(/-FE0F/g, '')] || null;
 var canonical = entry ? entry.unified : uni;
 var image = entry ? entry.image : null;
 var url = Packs.urlFor(state.set, canonical, image);
 if (url) {
 var img = document.createElement('img');
 img.src = url;
 img.alt = token;
 img.onerror = function () {
 var t = document.createTextNode(this.alt);
 this.replaceWith(t);
 };
 els.previewText.appendChild(img);
 } else {
 els.previewText.appendChild(document.createTextNode(token));
 }
 lastIndex = m.index + token.length;
 }
 if (lastIndex < text.length) {
 els.previewText.appendChild(document.createTextNode(text.slice(lastIndex)));
 }
 }

 function updatePreviewPill() {
 var pack = Packs.packById(state.set);
 var label = (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][pack.id]) || pack.shortLabel || pack.label;
 els.previewPackPill.textContent = label;
 }

 function refreshMasterCard() {
 els.masterCard.classList.toggle('is-on', !!state.enabled);
 }

 function openSupport(kind) {
 var links = SUPPORT_LINKS[kind] || SUPPORT_LINKS.creators;
 chrome.tabs.create({ url: links[state.lang] || links.en });
 }

 function loadDatasetForPreview() {
 chrome.storage.local.get([DATASET_CACHE_KEY], function (res) {
 var arr = res[DATASET_CACHE_KEY];
 if (Array.isArray(arr) && arr.length) {
 state.dataset = indexDataset(arr);
 renderPackGrid();
 renderPreview();
 return;
 }
 fetch(Packs.DATA_URL).then(function (r) { return r.json(); }).then(function (a) {
 state.dataset = indexDataset(a);
 renderPackGrid();
 renderPreview();
 }).catch(function () {
 renderPackGrid();
 renderPreview();
 });
 });
 }

 function indexDataset(arr) {
 var byUnified = {};
 arr.forEach(function (e) {
 if (e.unified) byUnified[e.unified] = { image: e.image, unified: e.unified };
 if (e.non_qualified) byUnified[e.non_qualified] = { image: e.image, unified: e.unified };
 if (e.skin_variations) {
 for (var k in e.skin_variations) {
 var v = e.skin_variations[k];
 if (v.unified) byUnified[v.unified] = { image: v.image, unified: v.unified };
 }
 }
 });
 return { byUnified: byUnified };
 }

 function setupSiteRow() {
 chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
 var tab = tabs && tabs[0];
 if (!tab || !tab.url) return;
 try {
 var u = new URL(tab.url);
 if (!u.protocol.startsWith('http')) return;
 var domain = u.hostname.replace(/^www\./, '');
 els.siteRow.style.display = 'flex';
 els.siteHost.textContent = domain;
 chrome.storage.sync.get({ excludedDomains: '' }, function (v) {
 var list = (v.excludedDomains || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
 els.excludeSite.checked = list.indexOf(domain) !== -1;
 els.excludeSite.addEventListener('change', function () {
 chrome.storage.sync.get({ excludedDomains: '' }, function (cur) {
 var lines = (cur.excludedDomains || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
 if (els.excludeSite.checked) {
 if (lines.indexOf(domain) === -1) lines.push(domain);
 } else {
 lines = lines.filter(function (l) { return l !== domain; });
 }
 chrome.storage.sync.set({ excludedDomains: lines.join('\n') });
 });
 });
 });
 } catch (e) {}
 });
 }

 function applyAllText() {
 applyLanguage(state.lang);
 els.langToggle.textContent = state.lang === 'en' ? 'AR' : 'EN';
 updatePreviewPill();
 if (els.packCount) els.packCount.textContent = (Packs.PACKS.length - 1) + ' ' + tr('packCountSuffix');
 }

 function init() {
 chrome.storage.sync.get({
 enabled: DEFAULT_ENABLED,
 set: DEFAULT_SET,
 lang: DEFAULT_LANG,
 excludedDomains: ''
 }, function (v) {
 state.lang = v.lang || DEFAULT_LANG;
 state.enabled = !!v.enabled;
 state.set = Packs.migratePack(v.set);

 if (state.set !== v.set) chrome.storage.sync.set({ set: state.set });

 els.enabled.checked = state.enabled;
 refreshMasterCard();
 applyAllText();
 loadDatasetForPreview();
 setupSiteRow();
 });

 chrome.action.setBadgeText({ text: '' });

 els.enabled.addEventListener('change', function () {
 state.enabled = els.enabled.checked;
 refreshMasterCard();
 chrome.storage.sync.set({ enabled: state.enabled });
 renderPreview();
 });

 els.langToggle.addEventListener('click', function () {
 state.lang = state.lang === 'en' ? 'ar' : 'en';
 chrome.storage.sync.set({ lang: state.lang });
 applyAllText();
 renderPackGrid();
 renderPreview();
 });

 els.openOptions.addEventListener('click', function () {
 if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
 });
 var openPicker = function () {
 chrome.tabs.create({ url: chrome.runtime.getURL('picker.html') });
 window.close();
 };
 els.openPicker.addEventListener('click', openPicker);
 els.openPicker2.addEventListener('click', openPicker);

 els.supportCreatorsBtn.addEventListener('click', function () { openSupport('creators'); });
 els.supportCoffeeBtn.addEventListener('click', function () { openSupport('coffee'); });

 chrome.storage.onChanged.addListener(function (changes, area) {
 if (area !== 'sync') return;
 if (changes.lang) {
 state.lang = changes.lang.newValue || DEFAULT_LANG;
 applyAllText();
 renderPackGrid();
 renderPreview();
 }
 if (changes.enabled) {
 state.enabled = !!changes.enabled.newValue;
 els.enabled.checked = state.enabled;
 refreshMasterCard();
 renderPreview();
 }
 if (changes.set) {
 state.set = Packs.migratePack(changes.set.newValue);
 Array.prototype.forEach.call(els.packGrid.querySelectorAll('.pack'), function (b) {
 b.classList.toggle('is-selected', b.dataset.set === state.set);
 });
 updatePreviewPill();
 renderPreview();
 }
 });
 }

 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', init);
 } else {
 init();
 }
})();
