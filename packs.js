(function () {
 'use strict';

 var DATASET_VERSION = '15.1.2';
 var DATASET_DATA_URL = 'https://cdn.jsdelivr.net/npm/emoji-datasource@' + DATASET_VERSION + '/emoji.json';
 function dsBase(set) {
 return 'https://cdn.jsdelivr.net/npm/emoji-datasource-' + set + '@' + DATASET_VERSION + '/img/' + set + '/64/';
 }

 var URL_BUILDERS = {
 apple: function (clean, raw, image) { return image ? dsBase('apple') + image : null; },
 google: function (clean, raw, image) { return image ? dsBase('google') + image : null; },
 twitter: function (clean, raw, image) { return image ? dsBase('twitter') + image : null; },
 facebook: function (clean, raw, image) { return image ? dsBase('facebook') + image : null; },

 'fluent-color': function (clean) {
 return 'https://cdn.jsdelivr.net/gh/bignutty/fluent-emoji@latest/static/' + clean.toLowerCase() + '.png';
 },
 'fluent-flat': function (clean) {
 return 'https://cdn.jsdelivr.net/gh/bignutty/fluent-emoji@latest/vector-flat/' + clean.toLowerCase() + '.svg';
 },

 twemoji: function (clean) {
 return 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/' + clean.toLowerCase() + '.png';
 },

 noto: function (clean) {
 var u = clean.toLowerCase().replace(/-/g, '_');
 return 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/png/72/emoji_u' + u + '.png';
 },

 openmoji: function (clean, raw) {
 var isComposite = raw.indexOf('200D') !== -1 || raw.indexOf('20E3') !== -1;
 var u = isComposite ? raw : clean;
 return 'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@latest/color/svg/' + u.toUpperCase() + '.svg';
 },

 system: function () { return null; }
 };

 var PACKS = [
 { id: 'apple', label: 'Apple', shortLabel: 'Apple', bundled: true, preview: ['1f60e','1f600','2764-fe0f','1f44d'] },
 { id: 'google', label: 'Google Noto', shortLabel: 'Google', bundled: true, preview: ['1f60e','1f600','2764-fe0f','1f44d'] },
 { id: 'fluent-color', label: 'Fluent 3D', shortLabel: 'Fluent 3D', bundled: false, preview: ['1f60e','1f600','2764','1f44d'] },
 { id: 'fluent-flat', label: 'Fluent Flat', shortLabel: 'Flat', bundled: false, preview: ['1f60e','1f600','2764','1f44d'] },
 { id: 'twemoji', label: 'Twemoji 15', shortLabel: 'Twemoji', bundled: false, preview: ['1f60e','1f600','2764','1f44d'] },
 { id: 'twitter', label: 'Twitter (old)', shortLabel: 'Twitter', bundled: true, preview: ['1f60e','1f600','2764-fe0f','1f44d'] },
 { id: 'facebook', label: 'Facebook', shortLabel: 'Facebook', bundled: true, preview: ['1f60e','1f600','2764-fe0f','1f44d'] },
 { id: 'noto', label: 'Noto Color', shortLabel: 'Noto', bundled: false, preview: ['1f60e','1f600','2764','1f44d'] },
 { id: 'openmoji', label: 'OpenMoji', shortLabel: 'OpenMoji', bundled: false, preview: ['1f60e','1f600','2764','1f44d'] },
 { id: 'system', label: 'System Default', shortLabel: 'System', bundled: false, preview: [] }
 ];

 var DEPRECATED_PACK_REMAP = {
 'joypixels': 'apple', // JoyPixels CDN became unreliable in 2024; redirect old users.
 'messenger': 'facebook',
 'facebook-old': 'facebook'
 };

 function migratePack(id) {
 if (!id) return 'apple';
 if (DEPRECATED_PACK_REMAP[id]) return DEPRECATED_PACK_REMAP[id];
 if (PACKS.some(function (p) { return p.id === id; })) return id;
 return 'apple';
 }

 function packById(id) {
 id = migratePack(id);
 for (var i = 0; i < PACKS.length; i++) if (PACKS[i].id === id) return PACKS[i];
 return PACKS[0];
 }

 function urlFor(set, unified, image) {
 if (!URL_BUILDERS[set]) return null;
 if (set === 'system') return null;
 var clean = (unified || '').replace(/-FE0F/gi, '');
 return URL_BUILDERS[set](clean, unified || '', image);
 }

 function candidatesFor(selected, entry, strict) {
 selected = migratePack(selected);
 if (strict) return [selected];

 var fallbackOrder = ['apple', 'google', 'twemoji', 'noto', 'fluent-color', 'fluent-flat', 'openmoji', 'twitter', 'facebook'];
 var ordered = [selected].concat(fallbackOrder.filter(function (s) { return s !== selected; }));

 if (entry && entry.avail) {
 ordered = ordered.filter(function (s) {
 var pack = packById(s);
 if (!pack || pack.id === 'system') return false;
 if (pack.bundled) return !!entry.avail[s];
 return true; // universal pack try and rely on onerror
 });
 } else {
 ordered = ordered.filter(function (s) { return s !== 'system'; });
 }
 return ordered;
 }

 function charsFromUnified(unified) {
 if (!unified) return '';
 return unified.split('-').map(function (h) {
 return String.fromCodePoint(parseInt(h, 16));
 }).join('');
 }

 function unifiedFromChars(s) {
 var cps = [];
 for (var i = 0; i < s.length; i++) {
 var cp = s.codePointAt(i);
 var h = cp.toString(16).toUpperCase();
 if (h.length < 4) h = ('0000' + h).slice(-4);
 cps.push(h);
 if (cp > 0xFFFF) i++;
 }
 return cps.join('-');
 }

 window.TrueMojiPacks = {
 DATASET_VERSION: DATASET_VERSION,
 DATA_URL: DATASET_DATA_URL,
 PACKS: PACKS,
 packById: packById,
 migratePack: migratePack,
 urlFor: urlFor,
 candidatesFor: candidatesFor,
 charsFromUnified: charsFromUnified,
 unifiedFromChars: unifiedFromChars
 };
})();
