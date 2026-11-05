(function () {
 'use strict';

 // TrueMoji (Keep fork) 2.0.1.5, 11-05-2026: speed pass.
 // What changed against 2.0.1.4 (behaviour is the same, the work per change is much smaller):
 //  1. Page changes are collected by the MutationObserver and handled once per animation frame,
 //     in one tree walk per changed subtree that skips editors, scripts and our own nodes whole.
 //     2.0.1.4 ran four full scans (two cleanups, a text walk, an image query and a query of every
 //     element for shadow roots) synchronously on every single added node, our own included.
 //  2. A cheap character test runs before the full emoji pattern, so text without emoji costs almost nothing.
 //  3. Images come from one batched message to the background, which keeps a cache shared by every tab.
 //     A text node is swapped only once its images are ready, so there is never a blank emoji
 //     (the system glyph stays until the Apple image can replace it in one go). No lazy loading of data URIs.
 //  4. Shadow roots are looked for in one idle pass instead of on every added element.
 //  5. Keep overlay: only redraws when an editor changed or moved, reads all positions before writing,
 //     and leaves the page alone when nothing moved (2.0.1.4 forced a layout on every page change and every 400 ms).
 //  6. Google Docs: the document body is a canvas, so it gets an overlay of Apple images over the emoji, placed
 //     from the text Docs exposes for screen readers (see docs-annotate.js). Dark Reader's filter mode turns
 //     page images back to normal, so the emoji keep their real colors in dark mode.

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
 // Cheap gate: every emoji the pattern can match contains one of these code units.
 var QUICK = /[©®‼-㊙\uD83C-\uDBFF⃣]/;
 var SKIN_MOD_ONLY = /^[\u{1F3FB}-\u{1F3FF}]$/u;
 function hasEmoji(s) {
 if (!s || !QUICK.test(s)) return false;
 EMOJI_PATTERN.lastIndex = 0;
 var r = EMOJI_PATTERN.test(s);
 EMOJI_PATTERN.lastIndex = 0;
 return r;
 }

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
 var CE_SELECTOR = '[contenteditable]:not([contenteditable="false"])';
 var observedRoots = new WeakSet();

 var CACHE_KEY = 'truemoji_data';
 var CACHE_TS_KEY = 'truemoji_data_ts';
 var CACHE_VER_KEY = 'truemoji_data_ver';
 var COMPACT_KEY = 'truemoji_compact_v1';
 var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

 var KEEP_MODE = /(^|\.)keep\.google\.com$/.test(location.hostname);
 var DOCS_MODE = location.hostname === 'docs.google.com' && /^\/document\//.test(location.pathname);

 function isNotebookLmHost() {
 var host = window.location.hostname;
 return host === 'notebooklm.google.com'
 || host.slice(-22) === '.notebooklm.google.com'
 || host === 'notebooklm.google'
 || host.slice(-18) === '.notebooklm.google';
 }

 var currentSetMemo = null;
 function getCurrentSet() {
 if (currentSetMemo) return currentSetMemo;
 var s = Packs.migratePack(cfg.set);
 if (cfg.customSiteSets && Array.isArray(cfg.customSiteSets)) {
 var domain = window.location.hostname;
 var rule = cfg.customSiteSets.find(function (r) { return domain.indexOf(r.domain) !== -1; });
 if (rule) s = Packs.migratePack(rule.set);
 }
 currentSetMemo = s;
 return s;
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

 // ---- dataset ----------------------------------------------------------------------
 // The full emoji.json (about 1.5 MB) used to be read from storage in every frame of every page.
 // A compact copy (only what this script needs) is read instead; the full copy stays for the options pages.
 var AV = ['apple', 'google', 'twitter', 'facebook'];
 function compactFrom(arr) {
 var out = [];
 for (var i = 0; i < arr.length; i++) {
 var e = arr[i];
 var bits = (e.has_img_apple ? 1 : 0) | (e.has_img_google ? 2 : 0) | (e.has_img_twitter ? 4 : 0) | (e.has_img_facebook ? 8 : 0);
 var sv = [];
 if (e.skin_variations) {
 for (var k in e.skin_variations) {
 if (!Object.prototype.hasOwnProperty.call(e.skin_variations, k)) continue;
 var v = e.skin_variations[k];
 if (v.unified && v.image) sv.push(v.unified, v.image);
 }
 }
 out.push([e.unified || '', e.non_qualified || '', e.image || '', bits, sv]);
 }
 return out;
 }
 function processCompact(arr) {
 for (var i = 0; i < arr.length; i++) {
 var e = arr[i];
 var bits = e[3];
 var avail = { apple: !!(bits & 1), google: !!(bits & 2), twitter: !!(bits & 4), facebook: !!(bits & 8) };
 var unified = e[0], nq = e[1], image = e[2], sv = e[4];
 if (unified) {
 mapUnified.set(unified, image);
 mapEntry.set(unified, { image: image, avail: avail, unified: unified });
 }
 if (nq) {
 mapNonQualified.set(nq, image);
 mapEntry.set(nq, { image: image, avail: avail, unified: unified });
 }
 for (var j = 0; j + 1 < sv.length; j += 2) {
 mapUnified.set(sv[j], sv[j + 1]);
 mapEntry.set(sv[j], { image: sv[j + 1], avail: avail, unified: sv[j] });
 }
 }
 ready = true;
 }

 var dataPromise = null;
 function loadData() {
 if (dataPromise) return dataPromise;
 dataPromise = new Promise(function (resolve, reject) {
 chrome.storage.local.get([COMPACT_KEY], function (res) {
 var c = res[COMPACT_KEY];
 var now = Date.now();
 if (c && c.ver === Packs.DATASET_VERSION && (now - c.ts < CACHE_TTL) && Array.isArray(c.d)) {
 processCompact(c.d);
 resolve();
 return;
 }
 chrome.storage.local.get([CACHE_KEY, CACHE_TS_KEY, CACHE_VER_KEY], function (full) {
 var fresh = full[CACHE_KEY] && full[CACHE_TS_KEY] && full[CACHE_VER_KEY] === Packs.DATASET_VERSION && (now - full[CACHE_TS_KEY] < CACHE_TTL);
 var got = fresh ? Promise.resolve(full[CACHE_KEY]) : fetch(Packs.DATA_URL).then(function (r) { return r.json(); }).then(function (arr) {
 var stored = {};
 stored[CACHE_KEY] = arr;
 stored[CACHE_TS_KEY] = now;
 stored[CACHE_VER_KEY] = Packs.DATASET_VERSION;
 chrome.storage.local.set(stored);
 return arr;
 });
 got.then(function (arr) {
 var comp = compactFrom(arr);
 var s = {};
 s[COMPACT_KEY] = { ver: Packs.DATASET_VERSION, ts: fresh ? full[CACHE_TS_KEY] : now, d: comp };
 chrome.storage.local.set(s);
 processCompact(comp);
 resolve();
 }).catch(function (err) {
 console.warn('TrueMoji: failed to load emoji dataset', err);
 reject(err);
 });
 });
 });
 });
 return dataPromise;
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

 // ---- images -----------------------------------------------------------------------
 // token -> { urls: [{set, url}], } memo, and url -> data URI cache for this page.
 var TOKEN_INFO = new Map();
 function tokenInfo(token) {
 var t = TOKEN_INFO.get(token);
 if (t) return t;
 var uni = unifiedFromEmoji(token);
 var entry = entryFor(uni);
 var image = entry ? entry.image : imageFor(uni);
 var canonical = entry ? entry.unified : uni;
 var candidates = Packs.candidatesFor(getCurrentSet(), entry, !!cfg.strict);
 var urls = [];
 for (var i = 0; i < candidates.length; i++) {
 var u = Packs.urlFor(candidates[i], canonical, image);
 if (u) urls.push({ set: candidates[i], url: u });
 }
 t = { urls: urls };
 TOKEN_INFO.set(token, t);
 return t;
 }

 var SRC = new Map();       // url -> data URI, or false when the background could not fetch it
 var wantUrls = new Set();  // urls asked for in the next batch
 var inflight = new Set();
 var waiters = [];          // callbacks to run when a batch comes back
 var batchTimer = 0;
 function requestUrl(url) {
 if (SRC.has(url) || inflight.has(url)) return;
 wantUrls.add(url);
 if (!batchTimer) batchTimer = setTimeout(sendBatch, 0);
 }
 function sendBatch() {
 batchTimer = 0;
 if (!wantUrls.size) return;
 // Small batches in page order, so what is on screen first comes back first.
 var urls = [];
 var itr = wantUrls.values();
 for (var v = itr.next(); !v.done && urls.length < 40; v = itr.next()) urls.push(v.value);
 urls.forEach(function (u) { wantUrls.delete(u); });
 if (wantUrls.size) batchTimer = setTimeout(sendBatch, 0);
 urls.forEach(function (u) { inflight.add(u); });
 var done = function (results) {
 urls.forEach(function (u) {
 inflight.delete(u);
 var d = results && results[u];
 SRC.set(u, d || false);
 });
 var w = waiters; waiters = [];
 for (var i = 0; i < w.length; i++) { try { w[i](); } catch (e) {} }
 };
 try {
 chrome.runtime.sendMessage({ action: 'fetch_image_blobs', urls: urls }, function (resp) {
 if (chrome.runtime.lastError || !resp || !resp.results) { done(null); return; }
 done(resp.results);
 });
 } catch (e) { done(null); }
 }
 function onImagesReady(cb) { waiters.push(cb); }
 // True when the first image for this token can be shown right now (data ready, or known failed so
 // the img will try the direct url and fall back through the other sets like 2.0.1.4 did).
 function tokenReady(token) {
 var info = tokenInfo(token);
 if (!info.urls.length) return true;
 var u = info.urls[0].url;
 if (SRC.has(u)) return true;
 requestUrl(u);
 return false;
 }

 function applyImageStyles(img, sizeEm) {
 var size = (sizeEm || 1.0) + 'em';
 img.style.cssText = 'height:' + size + ' !important;width:auto !important;min-width:auto !important;min-height:' + size +
 ' !important;vertical-align:-0.1em !important;margin:0 0.05em !important;padding:0 !important;border:none !important;' +
 'background:transparent !important;object-fit:contain !important;display:inline-block !important;transform:none !important;' +
 'animation:none !important;box-shadow:none !important;border-radius:0 !important;';
 }

 function buildEmojiImg(token) {
 var info = tokenInfo(token);
 if (!info.urls.length) return null;
 var img = document.createElement('img');
 img.alt = token;
 if (cfg.showOriginal) img.title = token;
 applyImageStyles(img, cfg.emojiSize);
 img.setAttribute('data-truemoji', '1');
 var idx = 0;
 function next() {
 if (idx >= info.urls.length) {
 if (!SKIN_MOD_ONLY.test(token)) {
 if (img.parentNode) img.replaceWith(document.createTextNode(token));
 } else if (img.parentNode) {
 img.remove();
 }
 return;
 }
 var c = info.urls[idx++];
 img.setAttribute('data-truemoji-set', c.set);
 var d = SRC.get(c.url);
 if (d) { img.src = d; return; }
 if (d === false) { img.src = c.url; return; } // direct attempt; onerror advances the chain
 requestUrl(c.url);
 onImagesReady(function () { var x = SRC.get(c.url); img.src = x || c.url; });
 }
 img.onerror = function () { next(); };
 next();
 return img;
 }

 // ---- replacing text -----------------------------------------------------------------
 var waitingNodes = new Set();
 function replaceTextNode(node) {
 var text = node.nodeValue;
 if (!hasEmoji(text)) return;
 // Wait until every image in this node is ready, then swap it in one go (no blank frames).
 var allReady = true;
 var m;
 EMOJI_PATTERN.lastIndex = 0;
 while ((m = EMOJI_PATTERN.exec(text))) { if (!tokenReady(m[0])) allReady = false; }
 if (!allReady) {
 if (!waitingNodes.size) onImagesReady(function () { var w = Array.from(waitingNodes); waitingNodes.clear(); w.forEach(queueNode); });
 waitingNodes.add(node);
 return;
 }
 var frag = document.createDocumentFragment();
 var lastIndex = 0;
 EMOJI_PATTERN.lastIndex = 0;
 while ((m = EMOJI_PATTERN.exec(text))) {
 var i = m.index;
 if (i > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, i)));
 var token = m[0];
 var img = buildEmojiImg(token);
 if (img) {
 if (KEEP_MODE) ovPrewarm(token);
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
 if (node.parentNode) node.parentNode.replaceChild(span, node);
 }

 function replaceImageNode(img) {
 var alt = img.getAttribute('alt');
 if (!alt || !QUICK.test(alt)) return;
 EMOJI_PATTERN.lastIndex = 0;
 var match = alt.match(EMOJI_PATTERN);
 if (!match || match.length !== 1 || match[0] !== alt) return;
 if (!tokenReady(alt)) { onImagesReady(function () { if (img.isConnected) queueNode(img); }); return; }
 var newImg = buildEmojiImg(alt);
 if (!newImg) return;
 img.replaceWith(newImg);
 }

 // An element whose whole subtree is left alone.
 function rejectEl(el) {
 var tn = el.tagName;
 if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'NOSCRIPT' || tn === 'TEXTAREA' || tn === 'INPUT' || tn === 'SELECT' || tn === 'TEMPLATE') return true;
 if (el.hasAttribute('data-truemoji') || el.hasAttribute('data-truemoji-skip')) return true;
 var ce = el.getAttribute('contenteditable');
 if (ce !== null && ce !== 'false') return true;
 if (KEEP_MODE) return false; // on Keep only truly editable elements count as editors (2.0.1.3)
 return el.matches(EDITABLE_SURFACE_SELECTOR);
 }
 // Checked once per changed subtree: is it inside something we leave alone?
 function insideRejected(node) {
 var p = node.nodeType === 1 ? node : node.parentElement;
 if (!p) return true;
 if (p.closest('[data-truemoji],[data-truemoji-skip],script,style,noscript,textarea,template,' + CE_SELECTOR)) return true;
 if (!KEEP_MODE && p.closest(EDITABLE_SURFACE_SELECTOR)) return true;
 if (p.isContentEditable) return true; // designMode and inherited editing
 return false;
 }

 var WALK_FILTER = {
 acceptNode: function (n) {
 if (n.nodeType === 3) return hasEmoji(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
 if (rejectEl(n)) return NodeFilter.FILTER_REJECT;
 if (n.tagName === 'IMG') return NodeFilter.FILTER_ACCEPT;
 return NodeFilter.FILTER_SKIP;
 }
 };
 function processRoot(root) {
 if (!root) return;
 if (root.nodeType === 3) {
 if (hasEmoji(root.nodeValue) && !insideRejected(root)) replaceTextNode(root);
 return;
 }
 if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
 if (root.nodeType === 1) {
 if (rejectEl(root) || insideRejected(root)) return;
 // Nothing to do unless the subtree has emoji text or an image.
 if (!hasEmoji(root.textContent) && !(root.tagName === 'IMG' || root.getElementsByTagName('img').length)) return;
 }
 var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, WALK_FILTER);
 var hits = [];
 var n;
 if (root.nodeType === 1 && root.tagName === 'IMG') hits.push(root);
 while ((n = w.nextNode())) hits.push(n);
 for (var i = 0; i < hits.length; i++) {
 var h = hits[i];
 if (!h.isConnected) continue;
 if (h.nodeType === 3) replaceTextNode(h);
 else if (!h.hasAttribute('data-truemoji')) replaceImageNode(h);
 }
 }

 // ---- batching ------------------------------------------------------------------------
 var queue = [];
 var queued = new Set();
 var flushScheduled = false;
 function queueNode(n) {
 if (queued.has(n)) return;
 queued.add(n);
 queue.push(n);
 if (!flushScheduled) {
 flushScheduled = true;
 if (document.hidden) setTimeout(flush, 50); else requestAnimationFrame(flush);
 }
 }
 function flush() {
 flushScheduled = false;
 var q = queue; queue = []; queued.clear();
 if (!ready) return; // start() walks the whole page once the dataset is in
 var t0 = performance.now();
 for (var i = 0; i < q.length; i++) {
 var n = q[i];
 if (!n.isConnected) continue;
 processRoot(n);
 if (performance.now() - t0 > 12 && i + 1 < q.length) {
 // Keep frames smooth on huge pages: carry the rest to the next frame.
 for (var j = i + 1; j < q.length; j++) queueNode(q[j]);
 break;
 }
 }
 }

 // Shadow roots (NotebookLM and other web component pages): one idle pass, never per node.
 var shadowScanTimer = 0;
 function scheduleShadowScan(delay) {
 if (shadowScanTimer) return;
 shadowScanTimer = setTimeout(function () {
 shadowScanTimer = 0;
 var run = function () { discoverOpenShadowRoots(document); };
 if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1500 }); else run();
 }, delay);
 }
 function discoverOpenShadowRoots(root) {
 if (!root || !root.querySelectorAll) return;
 var all = root.querySelectorAll('*');
 for (var i = 0; i < all.length; i++) {
 var sr = all[i].shadowRoot;
 if (sr && !observedRoots.has(sr)) {
 observeRoot(sr);
 queueNode(sr);
 discoverOpenShadowRoots(sr);
 }
 }
 }

 function observeRoot(root) {
 if (!root || observedRoots.has(root)) return;
 observedRoots.add(root);
 var mo = new MutationObserver(function (muts) {
 var sawElement = false;
 var editorTouched = false;
 for (var i = 0; i < muts.length; i++) {
 var mu = muts[i];
 var t = mu.target;
 if (mu.type === 'characterData') {
 if (KEEP_MODE && !editorTouched && t.parentElement && t.parentElement.isContentEditable) editorTouched = true;
 if (hasEmoji(t.nodeValue)) queueNode(t);
 continue;
 }
 var added = mu.addedNodes;
 if (!added.length) {
 if (KEEP_MODE && mu.removedNodes.length && !editorTouched && t.nodeType === 1 && t.isContentEditable) editorTouched = true;
 continue;
 }
 // Our own insertions (span or img we just made, overlay layers) need nothing.
 if (t.nodeType === 1 && (t.hasAttribute('data-truemoji') || t === ovLayer)) continue;
 if (DOCS_MODE && t.nodeType === 1 && (t.tagName === 'g' || t.tagName === 'svg' || t.tagName === 'rect')) { docsSchedule(); }
 for (var j = 0; j < added.length; j++) {
 var n = added[j];
 if (n.nodeType === 1) {
 if (n.hasAttribute('data-truemoji')) continue;
 sawElement = true;
 if (DOCS_MODE && (n.tagName === 'svg' || n.tagName === 'g' || n.tagName === 'rect' || (n.classList && n.classList.contains('kix-canvas-tile-content')))) docsSchedule();
 queueNode(n);
 } else if (n.nodeType === 3) {
 if (hasEmoji(n.nodeValue)) queueNode(n);
 }
 }
 if (KEEP_MODE && !editorTouched) {
 var te = t.nodeType === 1 ? t : t.parentElement;
 if (te && te.isContentEditable) editorTouched = true;
 }
 }
 if (sawElement) {
 if (KEEP_MODE) ovRootsDirty = true;
 scheduleShadowScan(isNotebookLmHost() ? 50 : 1500);
 }
 if (KEEP_MODE && ovStarted && (editorTouched || sawElement)) ovSchedule();
 });
 mo.observe(root, { childList: true, characterData: true, subtree: true });
 }

 // ---- cleanup of older fork leftovers (images inside editors) -----------------------------
 function trueMojiTextContent(node) {
 var out = '';
 (function collect(n) {
 if (n.nodeType === 3) { out += n.nodeValue || ''; return; }
 if (n.nodeType !== 1) return;
 if (n.tagName === 'IMG' && n.hasAttribute('data-truemoji')) { out += n.getAttribute('alt') || ''; return; }
 for (var i = 0; i < n.childNodes.length; i++) collect(n.childNodes[i]);
 })(node);
 return out;
 }
 function restoreEditableTrueMoji(root) {
 if (!root || !root.querySelectorAll) return;
 var nodes = root.querySelectorAll('[data-truemoji]');
 for (var i = 0; i < nodes.length; i++) {
 var node = nodes[i];
 if (!node.isConnected || node.closest('[data-truemoji="overlay"],[data-truemoji="docs-overlay"]')) continue;
 var p = node.parentElement;
 if (!p || !(p.isContentEditable || (!KEEP_MODE && p.closest(EDITABLE_SURFACE_SELECTOR)))) continue;
 var text = node.tagName === 'IMG' ? (node.getAttribute('alt') || '') : trueMojiTextContent(node);
 node.replaceWith(document.createTextNode(text));
 }
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

 // ---- KEEP OVERLAY ---------------------------------------------------------------------
 // Emoji inside contenteditable editors on keep.google.com: the real characters stay in the editor
 // (typing, caret and Keep's saving see plain text). Each glyph is made transparent with the CSS Custom
 // Highlight API and an Apple image is drawn at the same spot in a fixed, click through layer.
 // A glyph is only hidden while its image is loaded and visible, so the worst case is the system emoji.
 var OV_HL = 'truemoji-keep-editable';
 var ovLayer = null;
 var ovHighlight = null;
 var ovPool = new Map();
 var ovQueued = false;
 var ovStarted = false;
 var ovRoots = [];
 var ovRootsDirty = true;
 var ovLastKey = '';
 var ovLastGeom = '';

 function ovEnsure() {
 if (!ovLayer || !ovLayer.isConnected) {
 ovLayer = document.createElement('div');
 ovLayer.setAttribute('data-truemoji', 'overlay');
 ovLayer.setAttribute('aria-hidden', 'true');
 ovLayer.style.cssText = 'position:fixed !important;left:0 !important;top:0 !important;width:0 !important;height:0 !important;' +
 'overflow:visible !important;pointer-events:none !important;z-index:2147483646 !important;margin:0 !important;padding:0 !important;';
 (document.body || document.documentElement).appendChild(ovLayer);
 }
 if (!ovHighlight && window.CSS && CSS.highlights && typeof Highlight === 'function') {
 ovHighlight = new Highlight();
 CSS.highlights.set(OV_HL, ovHighlight);
 var st = document.createElement('style');
 st.setAttribute('data-truemoji', 'overlay-style');
 st.textContent = '::highlight(' + OV_HL + '){color:transparent !important;text-shadow:none !important;}';
 (document.head || document.documentElement).appendChild(st);
 }
 }

 function ovEditableRoots() {
 if (!ovRootsDirty) {
 var ok = true;
 for (var k = 0; k < ovRoots.length; k++) if (!ovRoots[k].isConnected) { ok = false; break; }
 if (ok) return ovRoots;
 }
 ovRootsDirty = false;
 var list = document.querySelectorAll(CE_SELECTOR);
 var roots = [];
 for (var i = 0; i < list.length; i++) {
 var el = list[i];
 if (!el.isContentEditable) continue;
 if (el.closest('[data-truemoji="overlay"]')) continue;
 var p = el.parentElement;
 if (p && p.isContentEditable) continue; // only the outermost editable
 roots.push(el);
 }
 ovRoots = roots;
 return roots;
 }

 function ovMakeImg(token) {
 var img = buildEmojiImg(token);
 if (!img) return null;
 img.addEventListener('load', ovSchedule);
 ovLayer.appendChild(img);
 return img;
 }
 function ovTakeImg(token, used) {
 var arr = ovPool.get(token);
 if (!arr) { arr = []; ovPool.set(token, arr); }
 var n = used.get(token) || 0;
 used.set(token, n + 1);
 if (arr[n] && arr[n].isConnected) return arr[n];
 var img = ovMakeImg(token);
 if (!img) return null;
 arr[n] = img;
 return img;
 }
 // One hidden, decoded overlay image per emoji seen anywhere on Keep, so an opened note shows
 // the Apple image on its first frame (2.0.1.4).
 function ovPrewarm(token) {
 if (!document.body) return;
 ovEnsure();
 var arr = ovPool.get(token);
 if (arr && arr[0] && arr[0].isConnected) return;
 if (!arr) { arr = []; ovPool.set(token, arr); }
 var img = ovMakeImg(token);
 if (!img) return;
 img.style.setProperty('display', 'none', 'important');
 arr[0] = img;
 }

 var fsCache = new WeakMap();
 function ovRefresh() {
 ovQueued = false;
 if (!ready || !cfg.enabled || document.hidden) return;
 var roots = ovEditableRoots();
 if (!roots.length && !ovLayer) return;
 ovEnsure();
 // Cheap check first: same editors, same place, same text = nothing to redraw.
 var geom = '';
 for (var g = 0; g < roots.length; g++) {
 var b = roots[g].getBoundingClientRect();
 geom += (b.left | 0) + ',' + (b.top | 0) + ',' + (b.width | 0) + ',' + (b.height | 0) + ',' + roots[g].textContent.length + ';';
 }
 geom += window.innerWidth + 'x' + window.innerHeight;
 if (geom === ovLastGeom && !ovForce) return;
 ovForce = false;
 ovLastGeom = geom;

 // Pass 1: read every position (no writes in between, so one layout).
 var used = new Map();
 var plan = [];
 var vw = window.innerWidth, vh = window.innerHeight;
 for (var r = 0; r < roots.length; r++) {
 var root = roots[r];
 if (root.querySelector('[data-truemoji]')) restoreEditableTrueMoji(root);
 if (!hasEmoji(root.textContent)) continue;
 var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
 var tn;
 while ((tn = walker.nextNode())) {
 var text = tn.nodeValue;
 if (!hasEmoji(text)) continue;
 var parent = tn.parentElement;
 if (!parent) continue;
 var fs = fsCache.get(parent);
 if (!fs) { fs = parseFloat(getComputedStyle(parent).fontSize) || 16; fsCache.set(parent, fs); }
 EMOJI_PATTERN.lastIndex = 0;
 var m;
 while ((m = EMOJI_PATTERN.exec(text))) {
 var token = m[0];
 if (SKIN_MOD_ONLY.test(token)) continue;
 var range = document.createRange();
 range.setStart(tn, m.index);
 range.setEnd(tn, m.index + token.length);
 var rects = range.getClientRects();
 var rc = rects.length ? rects[0] : null;
 if (!rc || rc.width < 1 || rc.height < 1) continue;
 var cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
 if (cx < 0 || cy < 0 || cx >= vw || cy >= vh) continue;
 var hit = document.elementFromPoint(cx, cy);
 if (!hit || !(hit === root || root.contains(hit))) continue;
 var size = Math.min(fs * (cfg.emojiSize || 1.0), Math.max(rc.width, rc.height * 0.8));
 plan.push({ token: token, range: range, x: cx - size / 2, y: cy - size / 2, size: size });
 }
 }
 }
 // Pass 2: write.
 var key = '';
 for (var q = 0; q < plan.length; q++) key += plan[q].token + Math.round(plan[q].x) + ',' + Math.round(plan[q].y) + ',' + Math.round(plan[q].size) + ';';
 var shownRanges = [];
 for (var p2 = 0; p2 < plan.length; p2++) {
 var it = plan[p2];
 var img = ovTakeImg(it.token, used);
 if (!img) continue;
 var loaded = img.complete && img.naturalWidth > 0;
 var css = 'position:absolute !important;left:' + it.x + 'px !important;top:' + it.y + 'px !important;width:' + it.size +
 'px !important;height:' + it.size + 'px !important;min-width:0 !important;min-height:0 !important;max-width:none !important;' +
 'margin:0 !important;padding:0 !important;border:none !important;background:transparent !important;vertical-align:baseline !important;' +
 'display:' + (loaded ? 'block' : 'none') + ' !important;';
 if (img.__tmCss !== css) { img.style.cssText = css; img.__tmCss = css; }
 if (loaded) shownRanges.push(it.range); else key += '!';
 }
 if (key !== ovLastKey && ovHighlight) {
 ovHighlight.clear();
 for (var s = 0; s < shownRanges.length; s++) ovHighlight.add(shownRanges[s]);
 }
 ovLastKey = key;
 // Hide pooled images that were not used this pass.
 ovPool.forEach(function (arr, token) {
 var n = used.get(token) || 0;
 for (var i = n; i < arr.length; i++) {
 if (arr[i] && arr[i].__tmCss !== 'hidden') { arr[i].style.setProperty('display', 'none', 'important'); arr[i].__tmCss = 'hidden'; }
 }
 if (arr.length > n + 20) {
 for (var j = n + 20; j < arr.length; j++) if (arr[j] && arr[j].parentNode) arr[j].parentNode.removeChild(arr[j]);
 arr.length = n + 20;
 }
 });
 }

 var ovForce = false;
 function ovSchedule(e) {
 if (e && e.type === 'load') ovForce = true;
 if (ovQueued) return;
 ovQueued = true;
 requestAnimationFrame(ovRefresh);
 }
 function ovForceSchedule() { ovForce = true; ovSchedule(); }

 function ovStart() {
 if (!KEEP_MODE || ovStarted) return;
 ovStarted = true;
 ['scroll', 'resize', 'transitionend', 'animationend'].forEach(function (ev) {
 window.addEventListener(ev, ovSchedule, { capture: true, passive: true });
 });
 ['input', 'keyup', 'focusin', 'focusout', 'click', 'compositionend'].forEach(function (ev) {
 window.addEventListener(ev, ovForceSchedule, { capture: true, passive: true });
 });
 document.addEventListener('visibilitychange', ovSchedule);
 // Keep animates its note dialog open and closed; a light check catches movement no event reports.
 // It only measures the editors' boxes and does nothing more unless one moved or changed.
 setInterval(function () { if (ovRoots.length || ovRootsDirty) ovSchedule(); }, 400);
 ovSchedule();
 }

 // ---- GOOGLE DOCS OVERLAY ----------------------------------------------------------------
 // Docs draws the document on a canvas, so its emoji are pixels, and Dark Reader's filter mode inverts them.
 // docs-annotate.js asks Docs for its screen reader layer: an invisible <rect> per run of text with the
 // text itself (aria-label), its font and its place. From that, each emoji's box is measured with the same
 // font, and a small card (page colored) with the Apple image is put over it inside the same tile, so it
 // scrolls and zooms with the page. Under Dark Reader the card turns dark with the page and the image is
 // turned back to normal by Dark Reader's own rule for images.
 var docsQueued = false;
 var docsCtx = null;
 var docsPool = new Map();
 function docsSchedule() {
 if (!DOCS_MODE || docsQueued) return;
 docsQueued = true;
 requestAnimationFrame(docsRefresh);
 }
 function docsMeasure(font, s) {
 if (!docsCtx) docsCtx = document.createElement('canvas').getContext('2d');
 if (docsCtx.font !== font) docsCtx.font = font;
 return docsCtx.measureText(s).width;
 }
 function docsRefresh() {
 docsQueued = false;
 if (!ready || !cfg.enabled) return;
 var tiles = document.querySelectorAll('.kix-canvas-tile-content');
 var pending = false;
 var writes = [];
 for (var t = 0; t < tiles.length; t++) {
 var tile = tiles[t];
 var rectsEl = tile.querySelectorAll('rect[aria-label]');
 var tb = tile.getBoundingClientRect();
 var tscale = tile.offsetWidth ? tb.width / tile.offsetWidth : 1;
 if (!tscale) tscale = 1;
 var items = [];
 for (var i = 0; i < rectsEl.length; i++) {
 var rect = rectsEl[i];
 var label = rect.getAttribute('aria-label');
 if (!hasEmoji(label)) continue;
 var font = rect.getAttribute('data-font-css') || '';
 var attrW = parseFloat(rect.getAttribute('width')) || 0;
 var rb = rect.getBoundingClientRect();
 if (!attrW || !rb.width) continue;
 var full = docsMeasure(font, label);
 var corr = full ? attrW / full : 1;
 var sx = rb.width / attrW;
 var fpx = parseFloat((/([\d.]+)px/.exec(font) || [0, 0])[1]) || 14;
 var m;
 EMOJI_PATTERN.lastIndex = 0;
 while ((m = EMOJI_PATTERN.exec(label))) {
 var token = m[0];
 if (SKIN_MOD_ONLY.test(token)) continue;
 if (!tokenReady(token)) { pending = true; continue; }
 var x0 = docsMeasure(font, label.slice(0, m.index)) * corr;
 var w = docsMeasure(font, token) * corr;
 var left = (rb.left - tb.left + x0 * sx) / tscale;
 var top = (rb.top - tb.top) / tscale;
 var bw = w * sx / tscale, bh = rb.height / tscale;
 var isz = Math.min(bw, fpx * 1.18 * sx / tscale, bh);
 items.push({ token: token, left: left, top: top, bw: bw, bh: bh, isz: isz });
 }
 }
 writes.push({ tile: tile, items: items });
 }
 for (var k = 0; k < writes.length; k++) docsApply(writes[k].tile, writes[k].items);
 if (pending) onImagesReady(docsSchedule);
 }
 function docsApply(tile, items) {
 var layer = tile.__tmLayer;
 if (!layer || !layer.isConnected || layer.parentNode !== tile) {
 if (!items.length) return;
 layer = document.createElement('div');
 layer.setAttribute('data-truemoji', 'docs-overlay');
 layer.setAttribute('aria-hidden', 'true');
 layer.style.cssText = 'position:absolute !important;left:0 !important;top:0 !important;width:0 !important;height:0 !important;' +
 'overflow:visible !important;pointer-events:none !important;z-index:1 !important;margin:0 !important;padding:0 !important;';
 tile.appendChild(layer);
 tile.__tmLayer = layer;
 }
 var key = items.map(function (it) { return it.token + Math.round(it.left * 10) + ',' + Math.round(it.top * 10) + ',' + Math.round(it.isz * 10); }).join(';');
 if (layer.__tmKey === key) return;
 layer.__tmKey = key;
 var cards = layer.children;
 for (var i = 0; i < items.length; i++) {
 var it = items[i];
 var card = cards[i];
 if (!card || card.__tmToken !== it.token) {
 var fresh = document.createElement('span');
 fresh.setAttribute('data-truemoji', 'docs-card');
 var img = buildEmojiImg(it.token);
 if (!img) continue;
 fresh.appendChild(img);
 fresh.__tmToken = it.token;
 if (card) layer.replaceChild(fresh, card); else layer.appendChild(fresh);
 card = fresh;
 }
 card.style.cssText = 'position:absolute !important;display:flex !important;align-items:center !important;justify-content:center !important;' +
 'left:' + it.left + 'px !important;top:' + it.top + 'px !important;width:' + it.bw + 'px !important;height:' + it.bh + 'px !important;' +
 'background:#fff !important;margin:0 !important;padding:0 !important;';
 var im = card.firstChild;
 im.style.cssText = 'width:' + it.isz + 'px !important;height:' + it.isz + 'px !important;min-width:0 !important;min-height:0 !important;' +
 'margin:0 !important;padding:0 !important;border:none !important;background:transparent !important;display:block !important;';
 }
 while (layer.children.length > items.length) layer.removeChild(layer.lastChild);
 }
 function docsStart() {
 if (!DOCS_MODE) return;
 window.addEventListener('resize', docsSchedule, { passive: true });
 // Docs swaps tiles while scrolling; the observer catches it, this catches zoom and layout shifts.
 setInterval(docsSchedule, 1000);
 docsSchedule();
 }

 // ---- start ----------------------------------------------------------------------------
 function observe() {
 var root = document.documentElement || document.body;
 observeRoot(root);
 scheduleShadowScan(isNotebookLmHost() ? 50 : 300);
 if (isNotebookLmHost()) {
 var runs = 0;
 var tmr = setInterval(function () { discoverOpenShadowRoots(document); if (++runs >= 40) clearInterval(tmr); }, 500);
 }
 }

 function initWithConfig() {
 if (!cfg.enabled) return;
 if (isExcluded()) return;
 if (getCurrentSet() === 'system') return;

 var started = false;
 function start() {
 if (started) return;
 started = true;
 removeLegacyFieldOverlays(document);
 restoreEditableTrueMoji(document);
 queueNode(document.body || document.documentElement);
 ovStart();
 docsStart();
 }
 observe();
 // Frames and pages without any emoji never read the dataset; it loads the moment one shows up.
 var body = document.body || document.documentElement;
 var needNow = KEEP_MODE || DOCS_MODE || hasEmoji(body ? body.textContent : '') || !!document.querySelector('img[alt]');
 if (ready) { start(); return; }
 if (needNow) { loadData().then(start).catch(function () {}); return; }
 var origQueue = queueNode;
 queueNode = function (n) {
 queueNode = origQueue;
 loadData().then(start).catch(function () {});
 };
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
 if (changed) { currentSetMemo = null; TOKEN_INFO.clear(); }
 if (changes.excludedDomains) {
 cfg.excludedDomains = changes.excludedDomains.newValue;
 if (isExcluded() && cfg.autoReload) location.reload();
 }
 if (changes.autoReload) cfg.autoReload = changes.autoReload.newValue;
 if (changed && cfg.autoReload) location.reload();
 });
})();
