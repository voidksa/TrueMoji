(function () {
 'use strict';

 var Packs = window.TrueMojiPacks;
 var DATASET_CACHE_KEY = 'truemoji_data';

 var CATEGORY_KEYS = {
 'Smileys & Emotion': { key: 'catSmileys', icon: '😀' },
 'People & Body': { key: 'catSmileys', icon: '👋' },
 'Animals & Nature': { key: 'catNature', icon: '🐶' },
 'Food & Drink': { key: 'catFood', icon: '🍕' },
 'Activities': { key: 'catActivity',icon: '⚽' },
 'Travel & Places': { key: 'catTravel', icon: '🌍' },
 'Objects': { key: 'catObjects', icon: '💡' },
 'Symbols': { key: 'catSymbols', icon: '❤️' },
 'Flags': { key: 'catFlags', icon: '🏳️' }
 };

 var els = {
 searchInput: document.getElementById('searchInput'),
 searchWrap: document.getElementById('searchWrap'),
 catTabs: document.getElementById('catTabs'),
 results: document.getElementById('results'),
 packSelect: document.getElementById('packSelect'),
 closeBtn: document.getElementById('closeBtn'),
 toast: document.getElementById('toast')
 };

 var state = {
 lang: 'en',
 set: 'apple',
 dataset: null,
 grouped: null,
 activeCat: null,
 recents: [],
 favorites: []
 };

 function tr(k) { return (TRANSLATIONS[state.lang] || TRANSLATIONS.en)[k] || k; }

 function toast(msg) {
 els.toast.textContent = msg;
 els.toast.classList.add('is-visible');
 setTimeout(function () { els.toast.classList.remove('is-visible'); }, 1400);
 }

 function buildSelect() {
 els.packSelect.innerHTML = '';
 Packs.PACKS.forEach(function (p) {
 if (p.id === 'system') return;
 var opt = document.createElement('option');
 opt.value = p.id;
 opt.textContent = (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][p.id]) || p.label;
 if (p.id === state.set) opt.selected = true;
 els.packSelect.appendChild(opt);
 });
 }

 function urlForEmoji(unified, image) {
 return Packs.urlFor(state.set, unified, image);
 }

 function renderCell(entry) {
 var btn = document.createElement('button');
 btn.className = 'cell';
 var chars = Packs.charsFromUnified(entry.unified);
 btn.title = entry.short_name || entry.name || chars;
 btn.dataset.unified = entry.unified;

 var url = urlForEmoji(entry.unified, entry.image);
 if (url) {
 var img = document.createElement('img');
 img.src = url; img.alt = chars;
 img.onerror = function () {
 img.replaceWith(document.createTextNode(chars));
 };
 btn.appendChild(img);
 } else {
 btn.textContent = chars;
 }

 var star = document.createElement('span');
 star.className = 'star' + (state.favorites.indexOf(entry.unified) !== -1 ? ' is-on' : '');
 star.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
 star.addEventListener('click', function (e) {
 e.stopPropagation();
 toggleFavorite(entry.unified);
 star.classList.toggle('is-on');
 });
 btn.appendChild(star);

 btn.addEventListener('click', function () { copyEmoji(chars, entry.unified); });
 return btn;
 }

 function copyEmoji(chars, unified) {
 navigator.clipboard.writeText(chars).then(function () {
 toast(tr('pickerCopied') + ' ' + chars);
 addRecent(unified);
 }).catch(function () {
 var ta = document.createElement('textarea');
 ta.value = chars;
 document.body.appendChild(ta);
 ta.select();
 try { document.execCommand('copy'); toast(tr('pickerCopied') + ' ' + chars); addRecent(unified); }
 catch (e) {}
 ta.remove();
 });
 }

 function addRecent(unified) {
 var idx = state.recents.indexOf(unified);
 if (idx !== -1) state.recents.splice(idx, 1);
 state.recents.unshift(unified);
 if (state.recents.length > 30) state.recents.length = 30;
 chrome.storage.sync.set({ pickerRecents: state.recents });
 }

 function toggleFavorite(unified) {
 var idx = state.favorites.indexOf(unified);
 if (idx === -1) state.favorites.push(unified);
 else state.favorites.splice(idx, 1);
 chrome.storage.sync.set({ pickerFavorites: state.favorites });
 }


 function groupDataset(arr) {
 var g = new Map();
 arr.forEach(function (e) {
 if (!e.category || !e.unified) return;
 if (!g.has(e.category)) g.set(e.category, []);
 g.get(e.category).push(e);
 });
 g.forEach(function (list) {
 list.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
 });
 return g;
 }


 function renderTabs() {
 els.catTabs.innerHTML = '';

 function tab(key, labelKey, icon, getter) {
 var b = document.createElement('button');
 b.className = 'cat-tab' + (state.activeCat === key ? ' is-active' : '');
 b.innerHTML = '<span class="icon">' + icon + '</span><span>' + tr(labelKey) + '</span>';
 b.addEventListener('click', function () {
 state.activeCat = key;
 renderTabs();
 renderCategory(key, getter());
 });
 els.catTabs.appendChild(b);
 }

 if (state.recents.length) {
 tab('__recent__', 'pickerRecents', '🕒', function () {
 return entriesByUnifiedList(state.recents);
 });
 }
 if (state.favorites.length) {
 tab('__fav__', 'pickerFavorites', '⭐', function () {
 return entriesByUnifiedList(state.favorites);
 });
 }

 if (state.grouped) {
 state.grouped.forEach(function (list, name) {
 var meta = CATEGORY_KEYS[name] || { key: name, icon: '✨' };
 tab(name, meta.key, meta.icon, function () { return list; });
 });
 }
 }

 function entriesByUnifiedList(uniList) {
 if (!state.dataset) return [];
 return uniList.map(function (u) {
 return state.dataset.byUnified[u]
 || state.dataset.byUnified[u.replace(/-FE0F/g, '')]
 || null;
 }).filter(Boolean);
 }


 function renderCategory(catName, entries) {
 els.results.innerHTML = '';
 if (!entries || !entries.length) {
 var empty = document.createElement('div');
 empty.className = 'empty-state';
 empty.innerHTML = '<span class="em">🤷</span><div>' + tr('pickerNoResults') + '</div>';
 els.results.appendChild(empty);
 return;
 }
 var section = document.createElement('div');
 section.className = 'section';
 var grid = document.createElement('div');
 grid.className = 'grid';
 entries.forEach(function (e) { grid.appendChild(renderCell(e)); });
 section.appendChild(grid);
 els.results.appendChild(section);
 }


 function search(query) {
 if (!state.dataset) return;
 query = query.trim().toLowerCase();
 if (!query) {
 if (state.activeCat === '__recent__') return renderCategory('__recent__', entriesByUnifiedList(state.recents));
 if (state.activeCat === '__fav__') return renderCategory('__fav__', entriesByUnifiedList(state.favorites));
 var list = state.activeCat ? state.grouped.get(state.activeCat) : Array.from(state.grouped.values())[0];
 return renderCategory(state.activeCat, list);
 }

 var matches = state.dataset.flat.filter(function (e) {
 var hay = (e.name + ' ' + (e.short_name || '') + ' ' + (e.short_names || []).join(' ')).toLowerCase();
 return hay.indexOf(query) !== -1;
 }).slice(0, 200);
 renderCategory('__search__', matches);
 }


 function loadDataset(cb) {
 chrome.storage.local.get([DATASET_CACHE_KEY], function (res) {
 var arr = res[DATASET_CACHE_KEY];
 if (Array.isArray(arr) && arr.length) {
 finalize(arr);
 return;
 }
 fetch(Packs.DATA_URL).then(function (r) { return r.json(); }).then(function (a) {
 chrome.storage.local.set({ truemoji_data: a, truemoji_data_ts: Date.now(), truemoji_data_ver: Packs.DATASET_VERSION });
 finalize(a);
 }).catch(function () { cb && cb(); });
 });

 function finalize(arr) {
 var byUnified = {};
 var flat = [];
 arr.forEach(function (e) {
 if (e.unified) byUnified[e.unified] = e;
 if (e.non_qualified) byUnified[e.non_qualified] = e;
 flat.push(e);
 });
 flat.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
 state.dataset = { byUnified: byUnified, flat: flat };
 state.grouped = groupDataset(flat);
 cb && cb();
 }
 }


 function init() {
 chrome.storage.sync.get({
 lang: 'en',
 set: 'apple',
 pickerRecents: [],
 pickerFavorites: []
 }, function (v) {
 state.lang = v.lang;
 state.set = Packs.migratePack(v.set);
 state.recents = v.pickerRecents || [];
 state.favorites = v.pickerFavorites || [];

 applyLanguage(state.lang);
 buildSelect();

 loadDataset(function () {
 state.activeCat = state.recents.length ? '__recent__'
 : state.favorites.length ? '__fav__'
 : (state.grouped.keys().next().value || null);
 renderTabs();
 if (state.activeCat === '__recent__') renderCategory('__recent__', entriesByUnifiedList(state.recents));
 else if (state.activeCat === '__fav__') renderCategory('__fav__', entriesByUnifiedList(state.favorites));
 else if (state.activeCat) renderCategory(state.activeCat, state.grouped.get(state.activeCat));
 });
 });

 els.searchInput.addEventListener('input', function () { search(els.searchInput.value); });
 els.packSelect.addEventListener('change', function () {
 state.set = Packs.migratePack(els.packSelect.value);
 chrome.storage.sync.set({ set: state.set });
 search(els.searchInput.value);
 });
 els.closeBtn.addEventListener('click', function () { window.close(); });

 document.addEventListener('scroll', function () {
 els.searchWrap.classList.toggle('is-stuck', window.scrollY > 4);
 }, { passive: true });

 document.addEventListener('keydown', function (e) {
 if (e.key === '/' && document.activeElement !== els.searchInput) {
 e.preventDefault();
 els.searchInput.focus();
 }
 if (e.key === 'Escape') {
 if (els.searchInput.value) {
 els.searchInput.value = '';
 search('');
 } else {
 window.close();
 }
 }
 });
 }

 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', init);
 } else {
 init();
 }
})();
