(function () {
 'use strict';

 var Packs = window.TrueMojiPacks;
 var DATASET_CACHE_KEY = 'truemoji_data';

 var state = {
 step: 1,
 lang: 'en',
 set: 'apple',
 shortcut: '',
 dataset: null
 };

 var els = {
 step1: document.getElementById('step1'),
 step2: document.getElementById('step2'),
 step3: document.getElementById('step3'),
 progressBar: document.getElementById('progressBar'),
 nextBtn: document.getElementById('nextBtn'),
 backBtn: document.getElementById('backBtn'),
 packList: document.getElementById('packList'),
 shortcutInput: document.getElementById('shortcutInput')
 };

 function tr(k) { return (TRANSLATIONS[state.lang] || TRANSLATIONS.en)[k] || k; }

 function showStep(n) {
 state.step = n;
 [els.step1, els.step2, els.step3].forEach(function (el, i) {
 el.style.display = (i + 1 === n) ? 'block' : 'none';
 });
 els.progressBar.style.width = (n / 3 * 100) + '%';
 els.backBtn.style.visibility = n > 1 ? 'visible' : 'hidden';
 els.nextBtn.querySelector('span').textContent = n === 3 ? tr('finish') : tr('next');
 }

 function pickLang(lang) {
 state.lang = lang;
 chrome.storage.sync.set({ lang: lang });
 Array.prototype.forEach.call(document.querySelectorAll('.lang-card'), function (b) {
 b.classList.toggle('is-selected', b.dataset.lang === lang);
 });
 applyLanguage(lang);
 if (els.packList.children.length) renderPackList();
 }

 function renderPackList() {
 els.packList.innerHTML = '';
 Packs.PACKS.filter(function (p) { return p.id !== 'system'; }).forEach(function (pack) {
 var btn = document.createElement('button');
 btn.className = 'pack-card' + (pack.id === state.set ? ' is-selected' : '');
 btn.dataset.set = pack.id;

 var thumb = document.createElement('div'); thumb.className = 'thumb';
 (pack.preview || []).slice(0, 2).forEach(function (uni) {
 var entry = state.dataset ? state.dataset.byUnified[uni.toUpperCase()] : null;
 var image = entry ? entry.image : null;
 var url = Packs.urlFor(pack.id, uni.toUpperCase(), image);
 if (!url) return;
 var img = document.createElement('img');
 img.src = url; img.alt = '';
 img.onerror = function () { img.style.visibility = 'hidden'; };
 thumb.appendChild(img);
 });

 var name = document.createElement('span');
 name.className = 'name';
 name.textContent = (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][pack.id]) || pack.label;

 btn.appendChild(thumb);
 btn.appendChild(name);
 btn.addEventListener('click', function () {
 state.set = pack.id;
 chrome.storage.sync.set({ set: pack.id });
 Array.prototype.forEach.call(els.packList.querySelectorAll('.pack-card'), function (b) {
 b.classList.toggle('is-selected', b.dataset.set === pack.id);
 });
 });
 els.packList.appendChild(btn);
 });
 }

 function loadDataset() {
 chrome.storage.local.get([DATASET_CACHE_KEY], function (res) {
 var arr = res[DATASET_CACHE_KEY];
 if (Array.isArray(arr) && arr.length) {
 index(arr);
 return;
 }
 fetch(Packs.DATA_URL).then(function (r) { return r.json(); }).then(function (a) {
 chrome.storage.local.set({ truemoji_data: a, truemoji_data_ts: Date.now(), truemoji_data_ver: Packs.DATASET_VERSION });
 index(a);
 }).catch(function () {});
 });
 function index(arr) {
 var byUnified = {};
 arr.forEach(function (e) { if (e.unified) byUnified[e.unified] = e; });
 state.dataset = { byUnified: byUnified };
 if (els.packList.style.display !== 'none' && state.step === 2) renderPackList();
 }
 }

 function init() {
 chrome.storage.sync.get({ lang: 'en', set: 'apple' }, function (v) {
 state.lang = v.lang || 'en';
 state.set = Packs.migratePack(v.set);
 applyLanguage(state.lang);
 Array.prototype.forEach.call(document.querySelectorAll('.lang-card'), function (b) {
 b.classList.toggle('is-selected', b.dataset.lang === state.lang);
 });
 loadDataset();
 showStep(1);
 });

 Array.prototype.forEach.call(document.querySelectorAll('.lang-card'), function (b) {
 b.addEventListener('click', function () { pickLang(b.dataset.lang); });
 });

 els.nextBtn.addEventListener('click', function () {
 if (state.step === 1) {
 renderPackList();
 showStep(2);
 } else if (state.step === 2) {
 showStep(3);
 } else {
 finish();
 }
 });
 els.backBtn.addEventListener('click', function () {
 if (state.step > 1) showStep(state.step - 1);
 });

 els.shortcutInput.addEventListener('keydown', function (e) {
 e.preventDefault();
 e.stopPropagation();
 if (e.key === 'Backspace' || e.key === 'Delete') {
 els.shortcutInput.value = '';
 state.shortcut = '';
 chrome.storage.sync.set({ shortcutKey: '' });
 return;
 }
 if (['Control', 'Alt', 'Shift', 'Meta'].indexOf(e.key) !== -1) return;
 var parts = [];
 if (e.ctrlKey) parts.push('Ctrl');
 if (e.altKey) parts.push('Alt');
 if (e.shiftKey) parts.push('Shift');
 if (e.metaKey) parts.push('Meta');
 parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
 var s = parts.join('+');
 els.shortcutInput.value = s;
 state.shortcut = s;
 chrome.storage.sync.set({ shortcutKey: s });
 });
 }

 function finish() {
 const currentVersion = chrome.runtime.getManifest().version;
 chrome.storage.sync.set({ onboardingDone: true, lastSeenVersion: currentVersion }, function () {
 window.close();
 });
 }

 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', init);
 } else {
 init();
 }
})();
