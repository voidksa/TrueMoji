const DEFAULT_ENABLED = true
const DEFAULT_SET = 'apple'
const DATA_URL = 'https://cdn.jsdelivr.net/npm/emoji-datasource@latest/emoji.json'
function SET_BASE(set) { return `https://cdn.jsdelivr.net/npm/emoji-datasource-${set}@latest/img/${set}/64/` }
const SKIN_RANGE = '[\\u{1F3FB}-\\u{1F3FF}]'
const VS_OPT = '(?:\\uFE0F|\\uFE0E)?'
const PICTO = '\\p{Extended_Pictographic}'
const EMOJI_CORE = `${PICTO}${VS_OPT}(?:${SKIN_RANGE}${VS_OPT})?`
const EMOJI_SEQ = `(?:${EMOJI_CORE}(?:\\u200D${EMOJI_CORE})*)`
const KEYCAP = '(?:[\\u0023\\u002A\\u0030-\\u0039]\\uFE0F?\\u20E3)'
const FLAGS = '(?:[\\u{1F1E6}-\\u{1F1FF}]{2})'
const TAG_FLAGS = '(?:\\u{1F3F4}[\\u{E0061}-\\u{E007A}]{2,7}\\u{E007F})'
const TEXT_SYM = '(?:\\u00A9\\uFE0F?|\\u00AE\\uFE0F?)'
const EMOJI_PATTERN = new RegExp(`(${EMOJI_SEQ}|${KEYCAP}|${FLAGS}|${TAG_FLAGS}|${TEXT_SYM})`, 'gu')
const SKIN_MOD_ONLY = /^[\u{1F3FB}-\u{1F3FF}]$/u

let cfg = {
  enabled: DEFAULT_ENABLED,
  set: DEFAULT_SET,
  strict: false,
  autoReload: false,
  emojiSize: 1.0,
  excludedDomains: '',
  showOriginal: false,
  shortcutKey: '',
  customSiteSets: []
}
let mapUnified = new Map()
let mapNonQualified = new Map()
let mapEntry = new Map()
let ready = false

function getCurrentSet() {
  if (cfg.customSiteSets && Array.isArray(cfg.customSiteSets)) {
    const domain = window.location.hostname
    const rule = cfg.customSiteSets.find(r => domain.includes(r.domain))
    if (rule) return rule.set
  }
  return cfg.set
}

function isExcluded() {
  if (!cfg.excludedDomains) return false
  const domain = window.location.hostname
  const lines = cfg.excludedDomains.split('\n').map(s => s.trim()).filter(Boolean)
  return lines.some(l => domain.includes(l))
}

function hex(cp) {
  const s = cp.toString(16).toUpperCase()
  return s.length < 4 ? s.padStart(4, '0') : s
}

function unifiedFromEmoji(s) {
  const cps = []
  for (const ch of s) cps.push(hex(ch.codePointAt(0)))
  return cps.join('-')
}

// Ensure maps are cleared or reset if needed, though here they are global.
// We should expose mapEntry to replaceImageNode logic.


function imgUrl(imageName) {
  return SET_BASE(cfg.set || DEFAULT_SET) + imageName
}

function guessImageName(unified) {
  return unified.toLowerCase() + '.png'
}

function urlFor(set, image, unified) {
  if (set === 'system') return null;
  const cleanUni = unified.replace(/-FE0F/gi, '');
  if (set === 'fluent-color') {
    return `https://cdn.jsdelivr.net/gh/bignutty/fluent-emoji@latest/static/${cleanUni.toLowerCase()}.png`
  }
  if (set === 'joypixels') {
    return `https://cdn.jsdelivr.net/emojione/assets/png/${cleanUni.toUpperCase()}.png`
  }
  if (set === 'openmoji') {
    if ((unified.includes('20E3') || unified.includes('200D')) && unified.indexOf('-') !== -1) {
      return `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji/color/svg/${unified}.svg`
    }
    const cleaned = unified.replace(/-FE0F/g, '').toUpperCase()
    return `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji/color/svg/${cleaned}.svg`
  }
  return SET_BASE(set) + image + '?v=16'
}

const CACHE_KEY = 'truemoji_data'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

function processData(arr) {
  console.log('TrueMoji: emoji dataset loaded', Array.isArray(arr) ? arr.length : 0)
  for (const e of arr) {
    const avail = {
      apple: !!e.has_img_apple,
      google: !!e.has_img_google,
      twitter: !!e.has_img_twitter,
      facebook: !!e.has_img_facebook,
      messenger: !!e.has_img_messenger,
      // Assume new sets are available for all emojis unless specified otherwise
      'fluent-color': true,
      'joypixels': true,
      'noto-color': true,
      'samsung': true
    }
    if (e.unified) {
      mapUnified.set(e.unified, e.image)
      mapEntry.set(e.unified, { image: e.image, avail, unified: e.unified })
    }
    if (e.non_qualified) {
      mapNonQualified.set(e.non_qualified, e.image)
      mapEntry.set(e.non_qualified, { image: e.image, avail, unified: e.unified })
    }
    if (e.skin_variations) {
      for (const k in e.skin_variations) {
        const v = e.skin_variations[k]
        if (v.unified && v.image) {
          mapUnified.set(v.unified, v.image)
          mapEntry.set(v.unified, { image: v.image, avail, unified: v.unified })
        }
      }
    }
  }
  ready = true
}

function loadData() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([CACHE_KEY, 'truemoji_data_ts'], (res) => {
      const now = Date.now()
      if (res[CACHE_KEY] && res.truemoji_data_ts && (now - res.truemoji_data_ts < CACHE_TTL)) {
        processData(res[CACHE_KEY])
        resolve()
      } else {
        fetch(DATA_URL)
          .then(r => r.json())
          .then(arr => {
            chrome.storage.local.set({ [CACHE_KEY]: arr, truemoji_data_ts: now })
            processData(arr)
            resolve()
          })
          .catch(err => {
            console.warn('TrueMoji: failed to load emoji dataset', err)
            reject(err)
          })
      }
    })
  })
}

function replaceTextNode(node) {
  const text = node.nodeValue
  EMOJI_PATTERN.lastIndex = 0
  if (!EMOJI_PATTERN.test(text)) return
  EMOJI_PATTERN.lastIndex = 0
  const frag = document.createDocumentFragment()
  let lastIndex = 0
  let m
  while ((m = EMOJI_PATTERN.exec(text))) {
    const i = m.index
    if (i > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, i)))
    const token = m[0]
    const currentSet = getCurrentSet()

    const uni = unifiedFromEmoji(token)
    const clean = uni.replace(/-FE0F/g, '')
    const withVs = uni.includes('-FE0F') ? uni : `${uni}-FE0F`
    const cleanVs = clean.includes('-FE0F') ? clean : `${clean}-FE0F`
    const entry = mapEntry.get(uni) || mapEntry.get(clean)
    let image =
      mapUnified.get(uni) ||
      mapUnified.get(clean) ||
      mapUnified.get(withVs) ||
      mapUnified.get(cleanVs) ||
      mapNonQualified.get(clean) ||
      mapNonQualified.get(uni) ||
      (entry && entry.image) ||
      null
    if (!image) {
      image =
        guessImageName(clean) ||
        guessImageName(uni.toLowerCase()) ||
        guessImageName(cleanVs.toLowerCase())
    }
    if (image) {
      const img = document.createElement('img')
      const sets = ['apple', 'google', 'openmoji', 'twitter', 'facebook', 'messenger']
      const currentSet = getCurrentSet()
      let candidates = cfg.strict ? [currentSet] : [currentSet, ...sets.filter(s => s !== currentSet)]
      if (entry) {
        candidates = candidates.filter(s => s === 'openmoji' || s === 'facebook-old' || entry.avail[s])
      }
      let idx = 0
      const applySrc = () => {
        if (idx >= candidates.length) {
          if (!SKIN_MOD_ONLY.test(token)) {
            img.replaceWith(document.createTextNode(token))
          } else {
            img.remove()
          }
          return
        }
        const set = candidates[idx++]
        img.src = urlFor(set, image, entry ? entry.unified : uni)
        img.setAttribute('data-truemoji-set', set)
      }
      img.onerror = () => applySrc()
      applySrc()
      const size = (cfg.emojiSize || 1.0) + 'em'
      img.alt = token
      if (cfg.showOriginal) img.title = token
      img.decoding = 'async'
      img.loading = 'lazy'
      img.style.setProperty('height', size, 'important')
      img.style.setProperty('width', 'auto', 'important')
      img.style.setProperty('min-width', 'auto', 'important')
      img.style.setProperty('min-height', size, 'important')
      img.style.setProperty('vertical-align', '-0.1em', 'important')
      img.style.setProperty('margin', '0 0.1em', 'important')
      img.style.setProperty('padding', '0', 'important')
      img.style.setProperty('border', 'none', 'important')
      img.style.setProperty('background', 'transparent', 'important')
      img.style.setProperty('object-fit', 'contain', 'important')
      img.style.setProperty('display', 'inline-block', 'important')
      img.style.setProperty('transform', 'none', 'important')
      img.style.setProperty('animation', 'none', 'important')
      img.style.setProperty('box-shadow', 'none', 'important')
      img.style.setProperty('border-radius', '0', 'important')
      frag.appendChild(img)
    } else if (!SKIN_MOD_ONLY.test(token)) {
      frag.appendChild(document.createTextNode(token))
    }
    lastIndex = i + token.length
  }
  if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)))
  const span = document.createElement('span')
  span.setAttribute('data-truemoji', '1')
  span.appendChild(frag)
  node.parentNode.replaceChild(span, node)
}

function shouldSkip(node) {
  const p = node.parentElement
  if (!p) return true

  // Check self or any parent for the skip attribute
  if (node.closest && node.closest('[data-truemoji-skip]')) return true
  if (p.closest('[data-truemoji-skip]')) return true

  const tn = p.tagName
  if (p.closest('[data-truemoji]')) return true
  if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'NOSCRIPT') return true
  if (tn === 'TEXTAREA' || tn === 'INPUT') return true
  if (p.isContentEditable) return true
  return false
}

function walkAndReplace(root) {
  const it = document.createNodeIterator(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue) return NodeFilter.FILTER_SKIP
      EMOJI_PATTERN.lastIndex = 0
      if (!EMOJI_PATTERN.test(n.nodeValue)) return NodeFilter.FILTER_SKIP
      return shouldSkip(n) ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT
    }
  })
  let n
  while ((n = it.nextNode())) replaceTextNode(n)

  if (root.querySelectorAll) {
    // Select all images that might be emojis based on alt text or class
    // We check generic 'img' but filter efficiently in the loop
    const images = root.querySelectorAll('img')
    for (const img of images) {
      if (!shouldSkip(img)) replaceImageNode(img)
    }
  }
}

function replaceImageNode(img) {
  const alt = img.getAttribute('alt')
  if (!alt) return

  // Strict check: alt must be exactly one emoji sequence
  EMOJI_PATTERN.lastIndex = 0
  const match = alt.match(EMOJI_PATTERN)
  if (!match || match.length !== 1 || match[0] !== alt) return

  const uni = unifiedFromEmoji(alt)
  const clean = uni.replace(/-FE0F/g, '')
  const withVs = uni.includes('-FE0F') ? uni : `${uni}-FE0F`
  const cleanVs = clean.includes('-FE0F') ? clean : `${clean}-FE0F`

  const currentSet = getCurrentSet()
  if (currentSet === 'fluent-color') {
    if (!SKIN_MOD_ONLY.test(alt)) {
      ensureFluentFontInjected()
      const sp = document.createElement('span')
      sp.textContent = alt
      sp.style.fontFamily = 'Fluent Emoji Color'
      sp.style.setProperty('font-size', '1em', 'important')
      sp.style.setProperty('line-height', '1em', 'important')
      sp.style.verticalAlign = '-0.1em'
      if (cfg.showOriginal) sp.title = alt
      img.replaceWith(sp)
    } else {
      img.remove()
    }
    return
  }

  const entry = mapEntry.get(uni) || mapEntry.get(clean)
  let image =
    mapUnified.get(uni) ||
    mapUnified.get(clean) ||
    mapUnified.get(withVs) ||
    mapUnified.get(cleanVs) ||
    mapNonQualified.get(clean) ||
    mapNonQualified.get(uni) ||
    (entry && entry.image) ||
    null

  if (!image) {
    image =
      guessImageName(clean) ||
      guessImageName(uni.toLowerCase()) ||
      guessImageName(cleanVs.toLowerCase())
  }

  if (image) {
    const sets = ['apple', 'google', 'openmoji', 'twitter', 'facebook', 'messenger']
    let candidates = cfg.strict ? [currentSet] : [currentSet, ...sets.filter(s => s !== currentSet)]
    if (entry) {
      candidates = candidates.filter(s => s === 'openmoji' || s === 'facebook-old' || entry.avail[s])
    }

    let idx = 0
    const newImg = document.createElement('img')

    const fetchThroughBackground = (url) => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'fetch_image_blob', url: url }, response => {
          if (chrome.runtime.lastError || !response || response.error) {
            reject(response ? response.error : chrome.runtime.lastError)
          } else {
            resolve(response.dataUri)
          }
        })
      })
    }

    const applySrc = () => {
      if (idx >= candidates.length) {
        if (!SKIN_MOD_ONLY.test(alt)) {
          newImg.replaceWith(document.createTextNode(alt))
        } else {
          newImg.remove()
        }
        return
      }
      const set = candidates[idx++]
      const url = urlFor(set, image, entry ? entry.unified : uni)

      // Fetch via background script to bypass page CSP
      fetchThroughBackground(url)
        .then(dataUri => {
          newImg.src = dataUri
          newImg.setAttribute('data-truemoji-set', set)
        })
        .catch(() => {
          // If background fetch fails, try direct load (fallback)
          newImg.src = url
          newImg.setAttribute('data-truemoji-set', set)
        })
    }

    newImg.onerror = () => applySrc()

    if (cfg.showOriginal) newImg.title = alt
    newImg.decoding = 'async'
    newImg.loading = 'lazy'
    const size = (cfg.emojiSize || 1.0) + 'em'
    newImg.style.setProperty('height', size, 'important')
    newImg.style.setProperty('width', 'auto', 'important')
    newImg.style.setProperty('min-width', 'auto', 'important')
    newImg.style.setProperty('min-height', size, 'important')
    newImg.style.setProperty('vertical-align', '-0.1em', 'important')
    newImg.style.setProperty('margin', '0 0.1em', 'important')
    newImg.style.setProperty('padding', '0', 'important')
    newImg.style.setProperty('border', 'none', 'important')
    newImg.style.setProperty('background', 'transparent', 'important')
    newImg.style.setProperty('object-fit', 'contain', 'important')
    newImg.style.setProperty('display', 'inline-block', 'important')
    newImg.style.setProperty('transform', 'none', 'important')
    newImg.style.setProperty('animation', 'none', 'important')
    newImg.style.setProperty('box-shadow', 'none', 'important')
    newImg.style.setProperty('border-radius', '0', 'important')

    // Replace the original image with our new one
    img.replaceWith(newImg)

    // Start loading
    applySrc()
  }
}

function scanForInputs(root) {
  if (!cfg.enabled) return
  const sels = 'input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input:not([type]), textarea'

  if (root.matches && root.matches(sels)) {
    ensureOverlay(root)
  }
  if (root.querySelectorAll) {
    const list = root.querySelectorAll(sels)
    for (const el of list) ensureOverlay(el)
  }
}

function observe() {
  const observeRoot = root => {
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType === Node.TEXT_NODE) {
            if (!shouldSkip(n)) replaceTextNode(n)
          } else if (n.nodeType === Node.ELEMENT_NODE) {
            walkAndReplace(n)
            scanForInputs(n)
            if (n.shadowRoot) {
              walkAndReplace(n.shadowRoot)
              scanForInputs(n.shadowRoot)
              observeRoot(n.shadowRoot)
            }
          }
        }
      }
    })
    mo.observe(root, { childList: true, subtree: true })
  }

  const root = document.documentElement || document.body
  observeRoot(root)

  const all = document.querySelectorAll('*')
  for (const el of all) {
    if (el.shadowRoot) {
      walkAndReplace(el.shadowRoot)
      observeRoot(el.shadowRoot)
    }
  }
}

function initWithConfig() {
  if (!cfg.enabled) return
  if (isExcluded()) return
  if (cfg.set === 'system') return
  if (!ready) {
    loadData().then(() => {
      walkAndReplace(document.body || document.documentElement)
      observe()
      setupFieldOverlays()
    })
  } else {
    walkAndReplace(document.body || document.documentElement)
    observe()
    setupFieldOverlays()
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
}, v => {
  cfg = v
  initWithConfig()
})

window.addEventListener('keydown', (e) => {
  if (!cfg.shortcutKey) return
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return

  const parts = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Meta')

  parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
  const pressed = parts.join('+')

  if (pressed === cfg.shortcutKey) {
    e.preventDefault()
    const newEnabled = !cfg.enabled
    chrome.storage.sync.set({ enabled: newEnabled })
  }
})

chrome.storage.onChanged.addListener(changes => {
  let changed = false
  if (changes.enabled) {
    cfg.enabled = changes.enabled.newValue
    changed = true
  }
  if (changes.set) {
    cfg.set = changes.set.newValue
    changed = true
  }
  if (changes.strict) {
    cfg.strict = changes.strict.newValue
    changed = true
  }
  if (changes.emojiSize) {
    cfg.emojiSize = changes.emojiSize.newValue
    changed = true
  }
  if (changes.excludedDomains) {
    cfg.excludedDomains = changes.excludedDomains.newValue
    if (isExcluded() && cfg.autoReload) location.reload()
  }
  if (changes.autoReload) {
    cfg.autoReload = changes.autoReload.newValue
  }
  if (changes.showOriginal) {
    cfg.showOriginal = changes.showOriginal.newValue
    changed = true
  }
  if (changes.shortcutKey) {
    cfg.shortcutKey = changes.shortcutKey.newValue
  }
  if (changes.customSiteSets) {
    cfg.customSiteSets = changes.customSiteSets.newValue
    changed = true
  }

  if (changed && cfg.autoReload) location.reload()
})

let overlayMap = new Map()

function fragmentForPlainText(text) {
  EMOJI_PATTERN.lastIndex = 0
  const frag = document.createDocumentFragment()
  let lastIndex = 0
  let m
  while ((m = EMOJI_PATTERN.exec(text))) {
    const i = m.index
    if (i > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, i)))
    const token = m[0]
    const currentSet = getCurrentSet()

    const uni = unifiedFromEmoji(token)
    const clean = uni.replace(/-FE0F/g, '')
    const withVs = uni.includes('-FE0F') ? uni : `${uni}-FE0F`
    const cleanVs = clean.includes('-FE0F') ? clean : `${clean}-FE0F`
    const entry = mapEntry.get(uni) || mapEntry.get(clean)
    let image =
      mapUnified.get(uni) ||
      mapUnified.get(clean) ||
      mapUnified.get(withVs) ||
      mapUnified.get(cleanVs) ||
      mapNonQualified.get(clean) ||
      mapNonQualified.get(uni) ||
      (entry && entry.image) ||
      null
    if (!image) {
      image =
        guessImageName(clean) ||
        guessImageName(uni.toLowerCase()) ||
        guessImageName(cleanVs.toLowerCase())
    }
    if (image) {
      const img = document.createElement('img')
      const sets = ['apple', 'google', 'openmoji', 'twitter', 'facebook']
      const currentSet = getCurrentSet()
      let candidates = cfg.strict ? [currentSet] : [currentSet, ...sets.filter(s => s !== currentSet)]
      if (entry) {
        candidates = candidates.filter(s => s === 'openmoji' || entry.avail[s])
      }
      let idx = 0
      const applySrc = () => {
        if (idx >= candidates.length) {
          if (!SKIN_MOD_ONLY.test(token)) {
            img.replaceWith(document.createTextNode(token))
          } else {
            img.remove()
          }
          return
        }
        const set = candidates[idx++]
        img.src = urlFor(set, image, entry ? entry.unified : uni)
        img.setAttribute('data-truemoji-set', set)
      }
      img.onerror = () => applySrc()
      applySrc()
      img.alt = token
      if (cfg.showOriginal) img.title = token
      img.decoding = 'async'
      img.loading = 'lazy'
      img.style.setProperty('height', '1em', 'important')
      img.style.setProperty('width', 'auto', 'important')
      img.style.setProperty('min-width', 'auto', 'important')
      img.style.setProperty('min-height', '1em', 'important')
      img.style.setProperty('vertical-align', '-0.1em', 'important')
      img.style.setProperty('margin', '0 0.1em', 'important')
      img.style.setProperty('padding', '0', 'important')
      img.style.setProperty('border', 'none', 'important')
      img.style.setProperty('background', 'transparent', 'important')
      img.style.setProperty('object-fit', 'contain', 'important')
      img.style.setProperty('display', 'inline-block', 'important')
      img.style.setProperty('transform', 'none', 'important')
      img.style.setProperty('animation', 'none', 'important')
      img.style.setProperty('box-shadow', 'none', 'important')
      img.style.setProperty('border-radius', '0', 'important')
      frag.appendChild(img)
    } else if (!SKIN_MOD_ONLY.test(token)) {
      frag.appendChild(document.createTextNode(token))
    }
    lastIndex = i + token.length
  }
  if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)))
  return frag
}

function syncOverlayStyle(el, ov) {
  const cs = getComputedStyle(el)
  ov.style.fontFamily = cs.fontFamily
  ov.style.fontSize = cs.fontSize
  ov.style.lineHeight = cs.lineHeight
  ov.style.letterSpacing = cs.letterSpacing
  ov.style.textAlign = cs.textAlign
  ov.style.whiteSpace = el.tagName === 'TEXTAREA' ? 'pre-wrap' : 'pre'
  ov.style.padding = cs.padding
  ov.style.borderRadius = cs.borderRadius
  ov.style.borderWidth = cs.borderWidth
  ov.style.borderStyle = cs.borderStyle
  ov.style.borderColor = 'transparent'
  ov.style.boxSizing = cs.boxSizing
  ov.style.textIndent = cs.textIndent
  ov.style.wordSpacing = cs.wordSpacing
  ov.style.textTransform = cs.textTransform

  // Fix: Match scrollbar width to prevent text reflow mismatch
  const sbW = el.offsetWidth - el.clientWidth - parseFloat(cs.borderLeftWidth || 0) - parseFloat(cs.borderRightWidth || 0)
  if (sbW > 0) {
    const pr = parseFloat(cs.paddingRight || 0)
    ov.style.paddingRight = (pr + sbW) + 'px'
  }
}

function positionOverlay(el, ov) {
  if (el.offsetParent === null) {
    ov.style.display = 'none'
    return
  }
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) {
    ov.style.display = 'none'
    return
  }
  ov.style.display = 'block'
  ov.style.position = 'fixed'
  ov.style.left = r.left + 'px'
  ov.style.top = r.top + 'px'
  ov.style.width = r.width + 'px'
  ov.style.height = r.height + 'px'
  ov.style.zIndex = '2147483647'
  ov.style.pointerEvents = 'none'
  ov.style.background = 'transparent'
  ov.style.color = 'transparent'
  ov.style.overflow = 'hidden'
}

function renderOverlay(el) {
  const ov = overlayMap.get(el)
  if (!ov) return
  ov.innerHTML = ''
  const v = el.value || ''
  ov.appendChild(fragmentForPlainText(v))
  if (el.tagName === 'TEXTAREA') ov.scrollTop = el.scrollTop
}

function ensureOverlay(el) {
  if (overlayMap.has(el)) return
  if (el.type && el.type.toLowerCase() === 'password') return
  const ov = document.createElement('div')
  document.body.appendChild(ov)
  overlayMap.set(el, ov)
  syncOverlayStyle(el, ov)
  positionOverlay(el, ov)
  renderOverlay(el)
  el.addEventListener('input', () => renderOverlay(el))
  el.addEventListener('change', () => renderOverlay(el))
  el.addEventListener('scroll', () => renderOverlay(el))

  const ro = new ResizeObserver(() => {
    syncOverlayStyle(el, ov)
    positionOverlay(el, ov)
  })
  ro.observe(el)

  let rafId
  const loop = () => {
    positionOverlay(el, ov)
    if (el.tagName === 'TEXTAREA' && ov.scrollTop !== el.scrollTop) {
      ov.scrollTop = el.scrollTop
    }
    rafId = requestAnimationFrame(loop)
  }
  el.addEventListener('focus', () => loop())
  el.addEventListener('blur', () => {
    cancelAnimationFrame(rafId)
    positionOverlay(el, ov)
  })
}

function setupFieldOverlays() {
  if (!cfg.enabled) return
  scanForInputs(document)

  window.addEventListener('scroll', () => {
    for (const [el, ov] of overlayMap) positionOverlay(el, ov)
  }, { capture: true, passive: true })
  window.addEventListener('resize', () => {
    for (const [el, ov] of overlayMap) {
      syncOverlayStyle(el, ov)
      positionOverlay(el, ov)
      renderOverlay(el)
    }
  })
}
