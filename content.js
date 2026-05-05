(function () {
 'use strict';

 if (!window.TrueMojiPacks) {
 console.warn('TrueMoji: packs.js not loaded; aborting.');
 return;
 }
 var Packs = window.TrueMojiPacks;

 var DEFAULT_ENABLED = true;
 var DEFAULT_SET = 'apple';

 var SKIN_RANGE = '[\\u{1F3FB}-\\u{1F3FF}]';
 var VS_OPT = '(?:\\uFE0F|\\uFE0E)?';
 var PICTO = '\\p{Extended_Pictographic}';
 var EMOJI_CORE = PICTO + VS_OPT + '(?:' + SKIN_RANGE + VS_OPT + ')?';
 var EMOJI_SEQ = '(?:' + EMOJI_CORE + '(?:\\u200D' + EMOJI_CORE + ')*)';
 var KEYCAP = '(?:[\\u0023\\u002A\\u0030-\\u0039]\\uFE0F?\\u20E3)';
 var FLAGS = '(?:[\\u{1F1E6}-\\u{1F1FF}]{2})';
 var TAG_FLAGS = '(?:\\u{1F3F4}[\\u{E0061}-\\u{E007A}]{2,7}\\u{E007F})';
 var TEXT_SYM = '(?:\\u00A9\\uFE0F?|\\u00AE\\uFE0F?)';
 var EMOJI_PATTERN = new RegExp('(' + EMOJI_SEQ + '|' + KEYCAP + '|' + FLAGS + '|' + TAG_FLAGS + '|' + TEXT_SYM + ')', 'gu');
 var SKIN_MOD_ONLY = /^[\u{1F3FB}-\u{1F3FF}]$/u;

 var cfg = {
 enabled: DEFAULT_ENABLED,
 set: DEFAULT_SET,
 strict: false,
 autoReload: false,
 emojiSize: 1.0,
 excludedDomains: '',
 showOriginal: false,
 shortcutKey: '',
 customSiteSets: []
 };
 var mapUnified = new Map();
 var mapNonQualified = new Map();
 var mapEntry = new Map();
 var ready = false;
 var NOTEBOOKLM_SHADOW_SCAN_INTERVAL_MS = 500;
 var NOTEBOOKLM_SHADOW_SCAN_LIMIT = 40;
 var EDITABLE_SURFACE_SELECTOR = [
 'input',
 'textarea',
 'select',
 '[contenteditable]:not([contenteditable="false"])',
 '[role="textbox"]',
 '[aria-multiline="true"]',
 '[data-lexical-editor="true"]',
 '.ProseMirror',
 '.ql-editor',
 '.cm-content'
 ].join(',');
 var observedRoots = new WeakSet();
 var shadowScanQueued = false;
 var notebookLmShadowScanTimer = null;
 var notebookLmShadowScanRuns = 0;

 var CACHE_KEY = 'truemoji_data';
 var CACHE_TS_KEY = 'truemoji_data_ts';
 var CACHE_VER_KEY = 'truemoji_data_ver';
 var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

 function isNotebookLmHost() {
 var host = window.location.hostname;
 return host === 'notebooklm.google.com'
 || host.slice(-22) === '.notebooklm.google.com'
 || host === 'notebooklm.google'
 || host.slice(-18) === '.notebooklm.google';
 }

 function getCurrentSet() {
 if (cfg.customSiteSets && Array.isArray(cfg.customSiteSets)) {
 var domain = window.location.hostname;
 var rule = cfg.customSiteSets.find(function (r) { return domain.indexOf(r.domain) !== -1; });
 if (rule) return Packs.migratePack(rule.set);
 }
 return Packs.migratePack(cfg.set);
 }

 function isExcluded() {
 if (!cfg.excludedDomains) return false;
 var domain = window.location.hostname;
 var lines = cfg.excludedDomains.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
 return lines.some(function (l) { return domain.indexOf(l) !== -1; });
 }

 function hex(cp) {
 var s = cp.toString(16).toUpperCase();
 return s.length < 4 ? ('0000' + s).slice(-4) : s;
 }
 function unifiedFromEmoji(s) {
 var cps = [];
 for (var i = 0; i < s.length; i++) {
 var cp = s.codePointAt(i);
 cps.push(hex(cp));
 if (cp > 0xFFFF) i++;
 }
 return cps.join('-');
 }

 function processData(arr) {
 if (!Array.isArray(arr)) return;
 for (var i = 0; i < arr.length; i++) {
 var e = arr[i];
 var avail = {
 apple: !!e.has_img_apple,
 google: !!e.has_img_google,
 twitter: !!e.has_img_twitter,
 facebook: !!e.has_img_facebook
 };
 if (e.unified) {
 mapUnified.set(e.unified, e.image);
 mapEntry.set(e.unified, { image: e.image, avail: avail, unified: e.unified });
 }
 if (e.non_qualified) {
 mapNonQualified.set(e.non_qualified, e.image);
 mapEntry.set(e.non_qualified, { image: e.image, avail: avail, unified: e.unified });
 }
 if (e.skin_variations) {
 for (var k in e.skin_variations) {
 if (!Object.prototype.hasOwnProperty.call(e.skin_variations, k)) continue;
 var v = e.skin_variations[k];
 if (v.unified && v.image) {
 mapUnified.set(v.unified, v.image);
 mapEntry.set(v.unified, { image: v.image, avail: avail, unified: v.unified });
 }
 }
 }
 }
 ready = true;
 }

 function loadData() {
 return new Promise(function (resolve, reject) {
 chrome.storage.local.get([CACHE_KEY, CACHE_TS_KEY, CACHE_VER_KEY], function (res) {
 var now = Date.now();
 var fresh = res[CACHE_KEY]
 && res[CACHE_TS_KEY]
 && res[CACHE_VER_KEY] === Packs.DATASET_VERSION
 && (now - res[CACHE_TS_KEY] < CACHE_TTL);
 if (fresh) {
 processData(res[CACHE_KEY]);
 resolve();
 return;
 }
 fetch(Packs.DATA_URL)
 .then(function (r) { return r.json(); })
 .then(function (arr) {
 var stored = {};
 stored[CACHE_KEY] = arr;
 stored[CACHE_TS_KEY] = now;
 stored[CACHE_VER_KEY] = Packs.DATASET_VERSION;
 chrome.storage.local.set(stored);
 processData(arr);
 resolve();
 })
 .catch(function (err) {
 console.warn('TrueMoji: failed to load emoji dataset', err);
 reject(err);
 });
 });
 });
 }

 function entryFor(unified) {
 var clean = unified.replace(/-FE0F/g, '');
 var withVs = unified.indexOf('-FE0F') !== -1 ? unified : unified + '-FE0F';
 return mapEntry.get(unified) || mapEntry.get(clean) || mapEntry.get(withVs);
 }

 function imageFor(unified) {
 var clean = unified.replace(/-FE0F/g, '');
 var withVs = unified.indexOf('-FE0F') !== -1 ? unified : unified + '-FE0F';
 return mapUnified.get(unified)
 || mapUnified.get(clean)
 || mapUnified.get(withVs)
 || mapNonQualified.get(clean)
 || mapNonQualified.get(unified)
 || (clean.toLowerCase() + '.png');
 }

 function applyImageStyles(img, sizeEm) {
 var size = (sizeEm || 1.0) + 'em';
 img.style.setProperty('height', size, 'important');
 img.style.setProperty('width', 'auto', 'important');
 img.style.setProperty('min-width', 'auto', 'important');
 img.style.setProperty('min-height', size, 'important');
 img.style.setProperty('vertical-align', '-0.1em', 'important');
 img.style.setProperty('margin', '0 0.05em', 'important');
 img.style.setProperty('padding', '0', 'important');
 img.style.setProperty('border', 'none', 'important');
 img.style.setProperty('background', 'transparent', 'important');
 img.style.setProperty('object-fit', 'contain', 'important');
 img.style.setProperty('display', 'inline-block', 'important');
 img.style.setProperty('transform', 'none', 'important');
 img.style.setProperty('animation', 'none', 'important');
 img.style.setProperty('box-shadow', 'none', 'important');
 img.style.setProperty('border-radius', '0', 'important');
 }

 function buildEmojiImg(token, useBackgroundFetch) {
 var uni = unifiedFromEmoji(token);
 var entry = entryFor(uni);
 var image = entry ? entry.image : imageFor(uni);
 var canonical = entry ? entry.unified : uni;
 var selected = getCurrentSet();
 var candidates = Packs.candidatesFor(selected, entry, !!cfg.strict);

 if (!candidates.length) return null;

 var img = document.createElement('img');
 img.alt = token;
 if (cfg.showOriginal) img.title = token;
 img.decoding = 'async';
 img.loading = 'lazy';
 applyImageStyles(img, cfg.emojiSize);
 img.setAttribute('data-truemoji', '1');

 var idx = 0;
 function next() {
 if (idx >= candidates.length) {
 if (!SKIN_MOD_ONLY.test(token)) {
 var tn = document.createTextNode(token);
 if (img.parentNode) img.replaceWith(tn);
 } else if (img.parentNode) {
 img.remove();
 }
 return;
 }
 var set = candidates[idx++];
 var url = Packs.urlFor(set, canonical, image);
 if (!url) { next(); return; }
 img.setAttribute('data-truemoji-set', set);
 if (useBackgroundFetch) {
 chrome.runtime.sendMessage({ action: 'fetch_image_blob', url: url }, function (resp) {
 if (chrome.runtime.lastError || !resp || resp.error) {
 img.src = url; // direct attempt; onerror will advance the chain
 } else {
 img.src = resp.dataUri;
 }
 });
 } else {
 img.src = url;
 }
 }
 img.onerror = function () { next(); };
 next();
 return img;
 }

 function replaceTextNode(node) {
 var text = node.nodeValue;
 EMOJI_PATTERN.lastIndex = 0;
 if (!EMOJI_PATTERN.test(text)) return;
 EMOJI_PATTERN.lastIndex = 0;

 var frag = document.createDocumentFragment();
 var lastIndex = 0;
 var m;
 while ((m = EMOJI_PATTERN.exec(text))) {
 var i = m.index;
 if (i > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, i)));
 var token = m[0];
 var img = buildEmojiImg(token, true);
 if (img) {
 frag.appendChild(img);
 } else if (!SKIN_MOD_ONLY.test(token)) {
 frag.appendChild(document.createTextNode(token));
 }
 lastIndex = i + token.length;
 }
 if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
 var span = document.createElement('span');
 span.setAttribute('data-truemoji', '1');
 span.appendChild(frag);
 node.parentNode.replaceChild(span, node);
 }

 function isEditableSurface(el) {
 if (!el) return false;
 if (el.isContentEditable) return true;
 if (el.matches && el.matches(EDITABLE_SURFACE_SELECTOR)) return true;
 return !!(el.closest && el.closest(EDITABLE_SURFACE_SELECTOR));
 }

 function shouldSkip(node) {
 var p = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
 if (!p) return true;
 if (node.closest && node.closest('[data-truemoji-skip]')) return true;
 if (p.closest('[data-truemoji-skip]')) return true;
 if (p.closest('[data-truemoji]')) return true;
 var tn = p.tagName;
 if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'NOSCRIPT') return true;
 if (isEditableSurface(p)) return true;
 return false;
 }

 function removeLegacyFieldOverlays(root) {
 if (!root || !root.querySelectorAll) return;
 var overlays = root.querySelectorAll('[data-truemoji-skip]');
 for (var i = 0; i < overlays.length; i++) {
 var el = overlays[i];
 var looksLikeFieldOverlay = el.style
 && (el.style.position === 'fixed' || el.style.pointerEvents === 'none' || el.style.zIndex === '2147483647')
 && el.querySelector('img[data-truemoji]');
 if (looksLikeFieldOverlay && el.parentNode) el.parentNode.removeChild(el);
 }
 }

 function trueMojiTextContent(node) {
 var out = '';
 function collect(n) {
 if (n.nodeType === Node.TEXT_NODE) {
 out += n.nodeValue || '';
 return;
 }
 if (n.nodeType !== Node.ELEMENT_NODE) return;
 if (n.tagName === 'IMG' && n.hasAttribute('data-truemoji')) {
 out += n.getAttribute('alt') || '';
 return;
 }
 for (var i = 0; i < n.childNodes.length; i++) collect(n.childNodes[i]);
 }
 collect(node);
 return out;
 }

 function restoreEditableTrueMoji(root) {
 if (!root || !root.querySelectorAll) return;
 var nodes = root.querySelectorAll('[data-truemoji]');
 for (var i = 0; i < nodes.length; i++) {
 var node = nodes[i];
 if (!node.isConnected || !isEditableSurface(node)) continue;
 var text = node.tagName === 'IMG' ? (node.getAttribute('alt') || '') : trueMojiTextContent(node);
 node.replaceWith(document.createTextNode(text));
 }
 }

 function cleanupEditableArtifacts(root) {
 removeLegacyFieldOverlays(root);
 restoreEditableTrueMoji(root);
 }

 function replaceImageNode(img) {
 if (img.hasAttribute('data-truemoji')) return;
 var alt = img.getAttribute('alt');
 if (!alt) return;
 EMOJI_PATTERN.lastIndex = 0;
 var match = alt.match(EMOJI_PATTERN);
 if (!match || match.length !== 1 || match[0] !== alt) return;

 var newImg = buildEmojiImg(alt, true);
 if (!newImg) return;
 img.replaceWith(newImg);
 }

 function walkAndReplace(root) {
 if (!root) return;
 var it = document.createNodeIterator(root, NodeFilter.SHOW_TEXT, {
 acceptNode: function (n) {
 if (!n.nodeValue) return NodeFilter.FILTER_SKIP;
 EMOJI_PATTERN.lastIndex = 0;
 if (!EMOJI_PATTERN.test(n.nodeValue)) return NodeFilter.FILTER_SKIP;
 return shouldSkip(n) ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
 }
 });
 var n;
 while ((n = it.nextNode())) replaceTextNode(n);

 if (root.querySelectorAll) {
 var images = root.querySelectorAll('img');
 for (var i = 0; i < images.length; i++) {
 if (!shouldSkip(images[i])) replaceImageNode(images[i]);
 }
 }
 }

 function scheduleShadowRootScan() {
 if (!isNotebookLmHost() || shadowScanQueued) return;
 shadowScanQueued = true;
 setTimeout(function () {
 shadowScanQueued = false;
 discoverOpenShadowRoots(document);
 }, 50);
 }

 function processShadowRoot(root) {
 if (!root) return;
 cleanupEditableArtifacts(root);
 walkAndReplace(root);
 observeRoot(root);
 discoverOpenShadowRoots(root);
 }

 function discoverOpenShadowRoots(root) {
 if (!root || (!root.querySelectorAll && root.nodeType !== Node.ELEMENT_NODE)) return 0;
 var found = 0;

 function inspect(el) {
 if (el.shadowRoot && !observedRoots.has(el.shadowRoot)) {
 found++;
 processShadowRoot(el.shadowRoot);
 }
 }

 if (root.nodeType === Node.ELEMENT_NODE) inspect(root);
 if (root.querySelectorAll) {
 var all = root.querySelectorAll('*');
 for (var i = 0; i < all.length; i++) inspect(all[i]);
 }
 return found;
 }

 function observeRoot(root) {
 if (!root || observedRoots.has(root)) return;
 observedRoots.add(root);

 var mo = new MutationObserver(function (muts) {
 var sawElement = false;
 for (var i = 0; i < muts.length; i++) {
 if (muts[i].type === 'characterData') {
 var target = muts[i].target;
 if (target && target.nodeType === Node.TEXT_NODE && !shouldSkip(target)) {
 replaceTextNode(target);
 }
 continue;
 }
 var added = muts[i].addedNodes;
 for (var j = 0; j < added.length; j++) {
 var n = added[j];
 if (n.nodeType === Node.TEXT_NODE) {
 if (!shouldSkip(n)) replaceTextNode(n);
 } else if (n.nodeType === Node.ELEMENT_NODE) {
 sawElement = true;
 cleanupEditableArtifacts(n);
 walkAndReplace(n);
 if (n.shadowRoot) processShadowRoot(n.shadowRoot);
 discoverOpenShadowRoots(n);
 }
 }
 }
 if (sawElement) scheduleShadowRootScan();
 });
 mo.observe(root, { childList: true, characterData: true, subtree: true });
 }

 function startNotebookLmCompatibilityScan() {
 if (!isNotebookLmHost() || notebookLmShadowScanTimer) return;
 notebookLmShadowScanRuns = 0;
 notebookLmShadowScanTimer = setInterval(function () {
 notebookLmShadowScanRuns++;
 discoverOpenShadowRoots(document);
 if (notebookLmShadowScanRuns >= NOTEBOOKLM_SHADOW_SCAN_LIMIT) {
 clearInterval(notebookLmShadowScanTimer);
 notebookLmShadowScanTimer = null;
 }
 }, NOTEBOOKLM_SHADOW_SCAN_INTERVAL_MS);
 }

 function observe() {
 var root = document.documentElement || document.body;
 observeRoot(root);
 discoverOpenShadowRoots(document);
 startNotebookLmCompatibilityScan();
 }

 function initWithConfig() {
 if (!cfg.enabled) return;
 if (isExcluded()) return;
 if (getCurrentSet() === 'system') return;

 function start() {
 cleanupEditableArtifacts(document);
 walkAndReplace(document.body || document.documentElement);
 observe();
 }
 if (!ready) {
 loadData().then(start).catch(function () {});
 } else {
 start();
 }
 }

 chrome.storage.sync.get({
 enabled: DEFAULT_ENABLED,
 set: DEFAULT_SET,
 strict: false,
 autoReload: false,
 emojiSize: 1.0,
 excludedDomains: '',
 showOriginal: false,
 shortcutKey: '',
 customSiteSets: []
 }, function (v) {
 cfg = v;
 cfg.set = Packs.migratePack(cfg.set);
 initWithConfig();
 });

 window.addEventListener('keydown', function (e) {
 if (!cfg.shortcutKey) return;
 if (['Control', 'Alt', 'Shift', 'Meta'].indexOf(e.key) !== -1) return;
 var parts = [];
 if (e.ctrlKey) parts.push('Ctrl');
 if (e.altKey) parts.push('Alt');
 if (e.shiftKey) parts.push('Shift');
 if (e.metaKey) parts.push('Meta');
 parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
 var pressed = parts.join('+');
 if (pressed === cfg.shortcutKey) {
 e.preventDefault();
 chrome.storage.sync.set({ enabled: !cfg.enabled });
 }
 });

 chrome.storage.onChanged.addListener(function (changes) {
 var changed = false;
 if (changes.enabled) { cfg.enabled = changes.enabled.newValue; changed = true; }
 if (changes.set) { cfg.set = Packs.migratePack(changes.set.newValue); changed = true; }
 if (changes.strict) { cfg.strict = changes.strict.newValue; changed = true; }
 if (changes.emojiSize) { cfg.emojiSize = changes.emojiSize.newValue; changed = true; }
 if (changes.showOriginal) { cfg.showOriginal = changes.showOriginal.newValue; changed = true; }
 if (changes.shortcutKey) { cfg.shortcutKey = changes.shortcutKey.newValue; }
 if (changes.customSiteSets) { cfg.customSiteSets = changes.customSiteSets.newValue; changed = true; }
 if (changes.excludedDomains) {
 cfg.excludedDomains = changes.excludedDomains.newValue;
 if (isExcluded() && cfg.autoReload) location.reload();
 }
 if (changes.autoReload) cfg.autoReload = changes.autoReload.newValue;
 if (changed && cfg.autoReload) location.reload();
 });
})();
