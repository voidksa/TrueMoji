(function () {
 'use strict';

 var DEFAULTS = {
 enabled: true,
 set: 'apple',
 strict: false,
 autoReload: false,
 lang: 'en',
 emojiSize: 1.0,
 excludedDomains: '',
 showOriginal: false,
 shortcutKey: '',
 customSiteSets: []
 };
 var DATASET_CACHE_KEY = 'truemoji_data';

 var Packs = window.TrueMojiPacks;
 var els = {
 enabled: document.getElementById('enabled'),
 enabledStatus: document.getElementById('enabledStatus'),
 autoReload: document.getElementById('autoReload'),
 autoReloadStatus:document.getElementById('autoReloadStatus'),
 strict: document.getElementById('strict'),
 strictStatus: document.getElementById('strictStatus'),
 setStatus: document.getElementById('setStatus'),
 packGrid: document.getElementById('packGrid'),
 emojiSize: document.getElementById('emojiSize'),
 emojiSizeValue: document.getElementById('emojiSizeValue'),
 showOriginal: document.getElementById('showOriginal'),
 shortcutInput: document.getElementById('shortcutInput'),
 clearShortcutBtn:document.getElementById('clearShortcutBtn'),
 excludeList: document.getElementById('excludeList'),
 customDomainInput:document.getElementById('customDomainInput'),
 customSetSelect: document.getElementById('customSetSelect'),
 addRuleBtn: document.getElementById('addRuleBtn'),
 customRulesList: document.getElementById('customRulesList'),
 exportBtn: document.getElementById('exportBtn'),
 importBtn: document.getElementById('importBtn'),
 importFile: document.getElementById('importFile'),
 resetBtn: document.getElementById('resetBtn'),
 supportBtn: document.getElementById('supportBtn'),
 langToggle: document.getElementById('langToggle'),
 reloadTabBtn: document.getElementById('reloadTabBtn'),
 previewBox: document.getElementById('previewBox'),
 toggleAllBtn: document.getElementById('toggleAllBtn'),
 allEmojis: document.getElementById('allEmojis'),
 toast: document.getElementById('toast')
 };

 var state = Object.assign({}, DEFAULTS);
 var dataset = null;

 function tr(key) {
 return (TRANSLATIONS[state.lang] || TRANSLATIONS.en)[key] || key;
 }

 function toast(msg) {
 if (!els.toast) return;
 els.toast.textContent = msg;
 els.toast.classList.add('is-visible');
 setTimeout(function () { els.toast.classList.remove('is-visible'); }, 2200);
 }


 function buildSelectOptions() {
 els.customSetSelect.innerHTML = '';
 Packs.PACKS.forEach(function (p) {
 var opt = document.createElement('option');
 opt.value = p.id;
 opt.textContent = (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][p.id]) || p.label;
 els.customSetSelect.appendChild(opt);
 });
 }

 function renderPackGrid() {
 els.packGrid.innerHTML = '';
 Packs.PACKS.forEach(function (pack) {
 var btn = document.createElement('button');
 btn.className = 'pack-tile' + (pack.id === state.set ? ' is-selected' : '');
 btn.dataset.set = pack.id;

 var thumbs = document.createElement('div');
 thumbs.className = 'pack-tile-thumbs';
 if (pack.id === 'system') {
 var span = document.createElement('span');
 span.className = 'thumb-fallback';
 span.textContent = '😀😎❤️';
 thumbs.appendChild(span);
 } else {
 (pack.preview || []).slice(0, 3).forEach(function (uni) {
 var entry = dataset ? dataset.byUnified[uni.toUpperCase()] : null;
 var image = entry ? entry.image : null;
 var url = Packs.urlFor(pack.id, uni.toUpperCase(), image);
 if (!url) return;
 var img = document.createElement('img');
 img.src = url; img.alt = '';
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

 var name = document.createElement('div');
 name.className = 'pack-tile-name';
 name.textContent = (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][pack.id]) || pack.label;

 var meta = document.createElement('div');
 meta.className = 'pack-tile-meta';
 meta.textContent = pack.id === 'system' ? ' ' : (pack.bundled ? 'curated' : 'open source');

 btn.appendChild(thumbs);
 btn.appendChild(name);
 btn.appendChild(meta);
 btn.addEventListener('click', function () { selectPack(pack.id); });
 els.packGrid.appendChild(btn);
 });
 }

 function selectPack(id) {
 state.set = Packs.migratePack(id);
 chrome.storage.sync.set({ set: state.set });
 Array.prototype.forEach.call(els.packGrid.querySelectorAll('.pack-tile'), function (b) {
 b.classList.toggle('is-selected', b.dataset.set === state.set);
 });
 updateSetStatus();
 renderPreview();
 }

 function updateSetStatus() {
 var p = Packs.packById(state.set);
 var label = (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][p.id]) || p.label;
 els.setStatus.textContent = label;
 }

 function updatePillStatus(pill, on) {
 pill.classList.toggle('is-on', !!on);
 pill.textContent = on ? tr('statusOn') : tr('statusOff');
 }


 var EMOJI_PATTERN = /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:[\u{1F3FB}-\u{1F3FF}](?:\uFE0F|\uFE0E)?)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:[\u{1F3FB}-\u{1F3FF}](?:\uFE0F|\uFE0E)?)?)*|[\u{1F1E6}-\u{1F1FF}]{2})/gu;
 var SAMPLE = '😀 😎 ❤️ 🔥 👍 🎉 🌟 🚀 🎯 🥳';

 function renderPreview() {
 els.previewBox.innerHTML = '';
 if (!state.enabled || state.set === 'system' || !dataset) {
 els.previewBox.textContent = SAMPLE;
 return;
 }
 var lastIndex = 0;
 var m;
 EMOJI_PATTERN.lastIndex = 0;
 while ((m = EMOJI_PATTERN.exec(SAMPLE))) {
 if (m.index > lastIndex) els.previewBox.appendChild(document.createTextNode(SAMPLE.slice(lastIndex, m.index)));
 var token = m[0];
 var uni = Packs.unifiedFromChars(token);
 var entry = dataset.byUnified[uni] || dataset.byUnified[uni.replace(/-FE0F/g, '')] || null;
 var canonical = entry ? entry.unified : uni;
 var image = entry ? entry.image : null;
 var url = Packs.urlFor(state.set, canonical, image);
 if (url) {
 var img = document.createElement('img');
 img.src = url; img.alt = token;
 img.onerror = function () { this.replaceWith(document.createTextNode(this.alt)); };
 els.previewBox.appendChild(img);
 } else {
 els.previewBox.appendChild(document.createTextNode(token));
 }
 lastIndex = m.index + token.length;
 }
 if (lastIndex < SAMPLE.length) els.previewBox.appendChild(document.createTextNode(SAMPLE.slice(lastIndex)));

 if (els.allEmojis.style.display !== 'none') renderAllEmojis();
 }


 var CHUNK_SIZE = 2;
 var renderedSections = 0;
 function renderAllEmojis() {
 if (!dataset) return;
 els.allEmojis.innerHTML = '';
 renderedSections = 0;

 var groups = new Map();
 dataset.flat.forEach(function (e) {
 if (!e.category) return;
 if (!groups.has(e.category)) groups.set(e.category, []);
 groups.get(e.category).push(e);
 });
 var sections = Array.from(groups.entries());

 var container = document.createElement('div');
 els.allEmojis.appendChild(container);

 var moreBtn = document.createElement('button');
 moreBtn.className = 'tm-btn';
 moreBtn.style.width = '100%';
 moreBtn.style.marginTop = '12px';
 moreBtn.textContent = tr('loadMore');

 function chunk() {
 var end = Math.min(renderedSections + CHUNK_SIZE, sections.length);
 for (var i = renderedSections; i < end; i++) {
 var pair = sections[i];
 var title = pair[0];
 var entries = pair[1];
 var h2 = document.createElement('h2');
 h2.textContent = title;
 container.appendChild(h2);
 var grid = document.createElement('div');
 grid.className = 'all-emojis-grid';
 entries.forEach(function (e) {
 var div = document.createElement('div');
 var url = Packs.urlFor(state.set, e.unified, e.image);
 if (url) {
 var img = document.createElement('img');
 img.src = url; img.alt = Packs.charsFromUnified(e.unified); img.title = img.alt;
 img.onerror = function () { div.textContent = this.alt; };
 div.appendChild(img);
 } else {
 div.textContent = Packs.charsFromUnified(e.unified);
 }
 grid.appendChild(div);
 });
 container.appendChild(grid);
 }
 renderedSections = end;
 if (renderedSections >= sections.length) moreBtn.remove();
 }
 chunk();
 moreBtn.addEventListener('click', chunk);
 els.allEmojis.appendChild(moreBtn);
 }


 function renderCustomRules() {
 els.customRulesList.innerHTML = '';
 var rules = state.customSiteSets || [];
 if (!rules.length) {
 var empty = document.createElement('div');
 empty.className = 'rule-empty';
 empty.textContent = tr('noCustomRules');
 els.customRulesList.appendChild(empty);
 return;
 }
 rules.forEach(function (rule, idx) {
 var item = document.createElement('div');
 item.className = 'rule-item';
 var d = document.createElement('span');
 d.className = 'rule-domain';
 d.textContent = rule.domain;
 var s = document.createElement('span');
 s.className = 'rule-set';
 var packLabel = (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][rule.set]) || rule.set;
 s.textContent = packLabel;
 var rm = document.createElement('button');
 rm.className = 'tm-btn';
 rm.textContent = tr('removeRule');
 rm.style.padding = '6px 12px';
 rm.style.fontSize = '12px';
 rm.style.borderColor = 'var(--danger)';
 rm.style.color = 'var(--danger)';
 rm.addEventListener('click', function () {
 state.customSiteSets.splice(idx, 1);
 chrome.storage.sync.set({ customSiteSets: state.customSiteSets });
 renderCustomRules();
 });
 item.appendChild(d); item.appendChild(s); item.appendChild(rm);
 els.customRulesList.appendChild(item);
 });
 }


 function exportSettings() {
 chrome.storage.sync.get(null, function (data) {
 var blob = new Blob([JSON.stringify({
 version: '2.0.1',
 exportedAt: new Date().toISOString(),
 settings: data
 }, null, 2)], { type: 'application/json' });
 var url = URL.createObjectURL(blob);
 var a = document.createElement('a');
 a.href = url;
 a.download = 'truemoji-settings-' + new Date().toISOString().slice(0, 10) + '.json';
 a.click();
 URL.revokeObjectURL(url);
 });
 }

 function importSettings(file) {
 var reader = new FileReader();
 reader.onload = function () {
 try {
 var parsed = JSON.parse(reader.result);
 var settings = parsed.settings || parsed;
 if (typeof settings !== 'object' || !settings) throw new Error('bad payload');
 var keys = Object.keys(DEFAULTS);
 var clean = {};
 keys.forEach(function (k) {
 if (k in settings) clean[k] = settings[k];
 });
 if (clean.set) clean.set = Packs.migratePack(clean.set);
 chrome.storage.sync.set(clean, function () {
 toast(tr('importSuccess'));
 setTimeout(function () { location.reload(); }, 600);
 });
 } catch (e) {
 toast(tr('importError'));
 }
 };
 reader.readAsText(file);
 }

 function resetSettings() {
 if (!window.confirm(tr('resetConfirm'))) return;
 chrome.storage.sync.clear(function () {
 chrome.storage.sync.set(DEFAULTS, function () {
 location.reload();
 });
 });
 }


 function loadDataset(cb) {
 chrome.storage.local.get([DATASET_CACHE_KEY], function (res) {
 var arr = res[DATASET_CACHE_KEY];
 if (Array.isArray(arr) && arr.length) {
 dataset = indexDataset(arr);
 cb();
 return;
 }
 fetch(Packs.DATA_URL).then(function (r) { return r.json(); }).then(function (a) {
 chrome.storage.local.set({ truemoji_data: a, truemoji_data_ts: Date.now(), truemoji_data_ver: Packs.DATASET_VERSION });
 dataset = indexDataset(a);
 cb();
 }).catch(function () { cb(); });
 });
 }

 function indexDataset(arr) {
 var byUnified = {};
 var flat = [];
 arr.forEach(function (e) {
 if (e.unified) byUnified[e.unified] = { image: e.image, unified: e.unified };
 if (e.non_qualified) byUnified[e.non_qualified] = { image: e.image, unified: e.unified };
 if (e.skin_variations) {
 for (var k in e.skin_variations) {
 var v = e.skin_variations[k];
 if (v.unified) byUnified[v.unified] = { image: v.image, unified: v.unified };
 }
 }
 flat.push(e);
 });
 flat.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
 return { byUnified: byUnified, flat: flat };
 }


 function applyAllText() {
 applyLanguage(state.lang);
 els.langToggle.textContent = state.lang === 'en' ? 'AR' : 'EN';
 updateSetStatus();
 updatePillStatus(els.enabledStatus, state.enabled);
 updatePillStatus(els.strictStatus, state.strict);
 updatePillStatus(els.autoReloadStatus, state.autoReload);
 }

 function init() {
 chrome.storage.sync.get(DEFAULTS, function (v) {
 state = Object.assign({}, DEFAULTS, v);
 state.set = Packs.migratePack(state.set);
 if (state.set !== v.set) chrome.storage.sync.set({ set: state.set });

 els.enabled.checked = state.enabled;
 els.autoReload.checked = state.autoReload;
 els.strict.checked = state.strict;
 els.showOriginal.checked = state.showOriginal;
 els.emojiSize.value = state.emojiSize;
 els.emojiSizeValue.textContent = parseFloat(state.emojiSize).toFixed(2).replace(/0$/, '') + '×';
 els.excludeList.value = state.excludedDomains || '';
 els.shortcutInput.value = state.shortcutKey || '';

 buildSelectOptions();
 applyAllText();
 renderCustomRules();
 loadDataset(function () {
 renderPackGrid();
 renderPreview();
 });
 });

 els.enabled.addEventListener('change', function () {
 state.enabled = els.enabled.checked;
 updatePillStatus(els.enabledStatus, state.enabled);
 chrome.storage.sync.set({ enabled: state.enabled });
 renderPreview();
 });
 els.autoReload.addEventListener('change', function () {
 state.autoReload = els.autoReload.checked;
 updatePillStatus(els.autoReloadStatus, state.autoReload);
 chrome.storage.sync.set({ autoReload: state.autoReload });
 });
 els.strict.addEventListener('change', function () {
 state.strict = els.strict.checked;
 updatePillStatus(els.strictStatus, state.strict);
 chrome.storage.sync.set({ strict: state.strict });
 });
 els.showOriginal.addEventListener('change', function () {
 state.showOriginal = els.showOriginal.checked;
 chrome.storage.sync.set({ showOriginal: state.showOriginal });
 });
 els.emojiSize.addEventListener('input', function () {
 state.emojiSize = parseFloat(els.emojiSize.value);
 els.emojiSizeValue.textContent = state.emojiSize.toFixed(2).replace(/0$/, '') + '×';
 chrome.storage.sync.set({ emojiSize: state.emojiSize });
 });

 els.excludeList.addEventListener('change', function () {
 var raw = els.excludeList.value;
 var cleaned = raw.split('\n').map(function (line) {
 var l = line.trim();
 if (!l) return '';
 try {
 var u = new URL(/^https?:\/\//.test(l) ? l : 'http://' + l);
 return u.hostname.replace(/^www\./, '');
 } catch (e) {
 return l.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
 }
 }).filter(Boolean).join('\n');
 if (els.excludeList.value !== cleaned) els.excludeList.value = cleaned;
 state.excludedDomains = cleaned;
 chrome.storage.sync.set({ excludedDomains: cleaned });
 });

 els.shortcutInput.addEventListener('keydown', function (e) {
 e.preventDefault();
 e.stopPropagation();
 if (e.key === 'Backspace' || e.key === 'Delete') {
 els.shortcutInput.value = '';
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
 chrome.storage.sync.set({ shortcutKey: s });
 });
 els.clearShortcutBtn.addEventListener('click', function () {
 els.shortcutInput.value = '';
 chrome.storage.sync.set({ shortcutKey: '' });
 });

 els.addRuleBtn.addEventListener('click', function () {
 var raw = els.customDomainInput.value.trim();
 var domain = '';
 try {
 var u = new URL(/^https?:\/\//.test(raw) ? raw : 'http://' + raw);
 domain = u.hostname.replace(/^www\./, '');
 } catch (e) {
 domain = raw.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
 }
 domain = domain.toLowerCase();
 if (!domain) return;
 var set = els.customSetSelect.value;
 var rules = (state.customSiteSets || []).filter(function (r) { return r.domain !== domain; });
 rules.push({ domain: domain, set: set });
 state.customSiteSets = rules;
 chrome.storage.sync.set({ customSiteSets: rules });
 renderCustomRules();
 els.customDomainInput.value = '';
 });

 els.exportBtn.addEventListener('click', exportSettings);
 els.importBtn.addEventListener('click', function () { els.importFile.click(); });
 els.importFile.addEventListener('change', function () {
 if (els.importFile.files && els.importFile.files[0]) importSettings(els.importFile.files[0]);
 });
 els.resetBtn.addEventListener('click', resetSettings);

 els.langToggle.addEventListener('click', function () {
 state.lang = state.lang === 'en' ? 'ar' : 'en';
 chrome.storage.sync.set({ lang: state.lang });
 applyAllText();
 renderPackGrid();
 buildSelectOptions();
 renderCustomRules();
 renderPreview();
 });
 els.reloadTabBtn.addEventListener('click', function () {
 chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
 if (tabs && tabs[0]) chrome.tabs.reload(tabs[0].id);
 });
 });
 els.toggleAllBtn.addEventListener('click', function () {
 if (els.allEmojis.style.display === 'none') {
 els.allEmojis.style.display = 'block';
 els.toggleAllBtn.textContent = tr('hidePreview');
 renderAllEmojis();
 } else {
 els.allEmojis.style.display = 'none';
 els.toggleAllBtn.textContent = tr('previewEmojisBtn');
 }
 });
 els.supportBtn.addEventListener('click', function () {
 var url = state.lang === 'ar' ? 'https://creators.sa/ar/voidksa' : 'https://creators.sa/en/voidksa';
 chrome.tabs.create({ url: url });
 });

 chrome.storage.onChanged.addListener(function (changes, area) {
 if (area !== 'sync') return;
 Object.keys(changes).forEach(function (k) {
 if (k in DEFAULTS) state[k] = changes[k].newValue;
 });
 if (changes.lang) applyAllText();
 if (changes.set) {
 Array.prototype.forEach.call(els.packGrid.querySelectorAll('.pack-tile'), function (b) {
 b.classList.toggle('is-selected', b.dataset.set === state.set);
 });
 updateSetStatus();
 renderPreview();
 }
 if (changes.enabled || changes.strict || changes.autoReload) {
 if (changes.enabled) { els.enabled.checked = state.enabled; updatePillStatus(els.enabledStatus, state.enabled); renderPreview(); }
 if (changes.strict) { els.strict.checked = state.strict; updatePillStatus(els.strictStatus, state.strict); }
 if (changes.autoReload) { els.autoReload.checked = state.autoReload; updatePillStatus(els.autoReloadStatus, state.autoReload); }
 }
 if (changes.emojiSize) {
 els.emojiSize.value = state.emojiSize;
 els.emojiSizeValue.textContent = parseFloat(state.emojiSize).toFixed(2).replace(/0$/, '') + '×';
 }
 if (changes.excludedDomains) els.excludeList.value = state.excludedDomains || '';
 if (changes.customSiteSets) renderCustomRules();
 });
 }

 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', init);
 } else {
 init();
 }
})();
