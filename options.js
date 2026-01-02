const DEFAULT_ENABLED = true
const DEFAULT_SET = 'apple'
const DEFAULT_FORMS = false
const DEFAULT_STRICT = false
const DEFAULT_LANG_KEY = 'en'
const enabledEl = document.getElementById('enabled')
const segEl = document.getElementById('setSeg')
const enabledStatusEl = document.getElementById('enabledStatus')
const setStatusEl = document.getElementById('setStatus')
const strictStatusEl = document.getElementById('strictStatus')
const autoReloadStatusEl = document.getElementById('autoReloadStatus')
const strictEl = document.getElementById('strict')
const autoReloadEl = document.getElementById('autoReload')
const reloadEl = document.getElementById('reloadTab')
const toggleTestEl = document.getElementById('toggleTest')
const testAreaEl = document.getElementById('testArea')
const previewEl = document.querySelector('.preview')
const langToggleEl = document.getElementById('langToggle')
const checkUpdateBtn = document.getElementById('checkUpdateBtn')
const emojiSizeEl = document.getElementById('emojiSize')
const emojiSizeValueEl = document.getElementById('emojiSizeValue')
const excludeListEl = document.getElementById('excludeList')
const showOriginalEl = document.getElementById('showOriginal')
const shortcutInputEl = document.getElementById('shortcutInput')
const clearShortcutBtn = document.getElementById('clearShortcutBtn')
const customDomainInputEl = document.getElementById('customDomainInput')
const customSetSelectEl = document.getElementById('customSetSelect')
const addRuleBtnEl = document.getElementById('addRuleBtn')
const customRulesListEl = document.getElementById('customRulesList')
let currentLang = DEFAULT_LANG_KEY
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
let mapUnified = new Map()
let mapNonQualified = new Map()
let mapEntry = new Map()
let emojiData = []
let basePreviewText = previewEl ? previewEl.textContent : ''

function hex(cp) { const s = cp.toString(16).toUpperCase(); return s.length < 4 ? s.padStart(4, '0') : s }
function unifiedFromEmoji(s) { const cps = []; for (const ch of s) cps.push(hex(ch.codePointAt(0))); return cps.join('-') }
function guessImageName(unified) { return unified.toLowerCase() + '.png' }
function urlFor(set, image, unified) {
    if (set === 'openmoji') {
        if ((unified.includes('20E3') || unified.includes('200D')) && unified.indexOf('-') !== -1) {
            return `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji/color/svg/${unified}.svg`
        }
        const cleaned = unified.replace(/-FE0F/g, '').toUpperCase()
        return `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji/color/svg/${cleaned}.svg`
    }
    if (set === 'facebook-old') {
        return `https://cdn.jsdelivr.net/npm/emoji-datasource-facebook@4.0.0/img/facebook/64/${image}`
    }
    return SET_BASE(set) + image + '?v=16'
}
function loadData() {
    return fetch(DATA_URL).then(r => r.json()).then(arr => {
        emojiData = arr
        for (const e of arr) {
            const avail = { apple: !!e.has_img_apple, google: !!e.has_img_google, twitter: !!e.has_img_twitter, facebook: !!e.has_img_facebook }
            if (e.unified) { mapUnified.set(e.unified, e.image); mapEntry.set(e.unified, { image: e.image, avail, unified: e.unified }) }
            if (e.non_qualified) { mapNonQualified.set(e.non_qualified, e.image); mapEntry.set(e.non_qualified, { image: e.image, avail, unified: e.unified }) }
            if (e.skin_variations) {
                for (const k in e.skin_variations) {
                    const v = e.skin_variations[k]
                    if (v.unified && v.image) { mapUnified.set(v.unified, v.image); mapEntry.set(v.unified, { image: v.image, avail, unified: v.unified }) }
                }
            }
        }
    })
}
function fragmentForText(text, set) {
    EMOJI_PATTERN.lastIndex = 0
    const frag = document.createDocumentFragment()
    let lastIndex = 0, m
    while ((m = EMOJI_PATTERN.exec(text))) {
        const i = m.index
        if (i > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, i)))
        const token = m[0]
        if (set === 'fluent-color') {
            if (!SKIN_MOD_ONLY.test(token)) {
                const sp = document.createElement('span')
                const linkId = 'fluent-emoji-color-css'
                if (!document.getElementById(linkId)) {
                    const link = document.createElement('link')
                    link.rel = 'stylesheet'
                    link.id = linkId
                    link.href = 'https://tetunori.github.io/fluent-emoji-webfont/dist/FluentEmojiColor.css'
                    document.documentElement.appendChild(link)
                }
                sp.textContent = token
                sp.style.fontFamily = 'Fluent Emoji Color'
                sp.style.fontSize = '1em'
                sp.style.lineHeight = '1em'
                sp.style.verticalAlign = '-0.1em'
                frag.appendChild(sp)
            }
            lastIndex = i + token.length
            continue
        }
        const uni = unifiedFromEmoji(token)
        const clean = uni.replace(/-FE0F/g, '')
        const entry = mapEntry.get(uni) || mapEntry.get(clean)
        let image = (mapUnified.get(uni) || mapUnified.get(clean) || mapNonQualified.get(clean) || mapNonQualified.get(uni)) || (entry && entry.image) || null
        if (!image) image = guessImageName(clean)
        if (image) {
            const img = document.createElement('img')
            const sets = ['apple', 'google', 'openmoji', 'twitter', 'facebook']
            let candidates = [set, ...sets.filter(s => s !== set)]
            if (entry) candidates = candidates.filter(s => s === 'openmoji' || s === 'facebook-old' || entry.avail[s])
            let idx = 0
            const applySrc = () => {
                if (idx >= candidates.length) { if (!SKIN_MOD_ONLY.test(token)) img.replaceWith(document.createTextNode(token)); else img.remove(); return }
                const s = candidates[idx++]
                img.src = urlFor(s, image, entry ? entry.unified : uni)
            }
            img.onerror = () => applySrc()
            applySrc()
            img.alt = token
            img.style.width = 'auto'
            img.style.height = '1em'
            img.style.verticalAlign = '-0.1em'
            img.style.objectFit = 'contain'
            img.style.display = 'inline-block'
            frag.appendChild(img)
        } else if (!SKIN_MOD_ONLY.test(token)) {
            frag.appendChild(document.createTextNode(token))
        }
        lastIndex = i + token.length
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)))
    return frag
}
function renderPreview() {
    if (!previewEl) return
    const selected = segEl.querySelector('.seg-btn.selected')?.dataset.set || DEFAULT_SET
    previewEl.innerHTML = ''
    if (enabledEl.checked) {
        previewEl.appendChild(fragmentForText(basePreviewText, selected))
    } else {
        previewEl.textContent = basePreviewText
    }

    if (testAreaEl && testAreaEl.style.display !== 'none') {
        renderTestArea(selected)
    }

    // Update button text when preview is rendered, just to be safe
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
    toggleTestEl.textContent = testAreaEl.style.display !== 'none' ? t.hidePreview : t.preview
}

function renderTestArea(set) {
    if (!emojiData || !emojiData.length) return
    testAreaEl.innerHTML = ''

    // Group logic
    const groups = new Map()
    for (const e of emojiData) {
        if (!e.category) continue
        if (!groups.has(e.category)) groups.set(e.category, [])
        groups.get(e.category).push(e.unified)
    }

    const sections = Array.from(groups.entries())
    let renderedCount = 0
    const CHUNK_SIZE = 2 // Render 2 categories at a time

    const container = document.createElement('div')
    container.className = 'sections'
    testAreaEl.appendChild(container)

    const loadMoreBtn = document.createElement('button')
    loadMoreBtn.className = 'load-more-btn'
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
    loadMoreBtn.textContent = t.loadMore

    const btnContainer = document.createElement('div')
    btnContainer.className = 'load-more-container'
    btnContainer.appendChild(loadMoreBtn)

    const renderChunk = () => {
        const end = Math.min(renderedCount + CHUNK_SIZE, sections.length)
        for (let i = renderedCount; i < end; i++) {
            const [title, unis] = sections[i]
            const secDiv = document.createElement('div')
            secDiv.className = 'section'

            const h2 = document.createElement('h2')
            h2.textContent = title
            secDiv.appendChild(h2)

            const gridDiv = document.createElement('div')
            gridDiv.className = 'test-grid'

            const charFromUnified = (u) => {
                return u.split('-').map(h => String.fromCodePoint(parseInt(h, 16))).join('')
            }

            unis.forEach(uni => {
                const emojiChar = charFromUnified(uni)
                const emojiDiv = document.createElement('div')
                emojiDiv.className = 'emoji'
                if (enabledEl.checked) {
                    emojiDiv.appendChild(fragmentForText(emojiChar, set))
                } else {
                    emojiDiv.textContent = emojiChar
                }
                gridDiv.appendChild(emojiDiv)
            })

            secDiv.appendChild(gridDiv)
            container.appendChild(secDiv)
        }
        renderedCount = end

        if (renderedCount >= sections.length) {
            btnContainer.style.display = 'none'
        } else {
            testAreaEl.appendChild(btnContainer)
            btnContainer.style.display = 'block'
        }
    }

    loadMoreBtn.addEventListener('click', renderChunk)
    renderChunk() // Initial load
}

function updateEnabledStatus() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
    enabledStatusEl.textContent = enabledEl.checked ? t.statusOn : t.statusOff
}

function updateStrictStatus() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
    if (strictStatusEl) strictStatusEl.textContent = strictEl.checked ? t.statusOn : t.statusOff
}

function updateAutoReloadStatus() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
    if (autoReloadStatusEl && autoReloadEl) autoReloadStatusEl.textContent = autoReloadEl.checked ? t.statusOn : t.statusOff
}

function updateSetStatus(selected) {
    const s = selected || (segEl.querySelector('.seg-btn.selected')?.dataset.set || DEFAULT_SET)
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']

    // Try to find translation for the set name first
    let setName = s.charAt(0).toUpperCase() + s.slice(1)

    const map = {
        'apple': 'apple',
        'google': 'google',
        'fluent-color': 'fluent',
        'openmoji': 'openmoji',
        'twitter': 'twitter',
        'facebook': 'facebook',
        'facebook-old': 'facebookOld'
    }

    if (map[s] && t[map[s]]) {
        setName = t[map[s]]
    }

    setStatusEl.textContent = setName
}

function updateLangToggle() {
    langToggleEl.textContent = currentLang === 'en' ? 'AR' : 'EN'
}

function renderCustomRules(rules) {
    if (!customRulesListEl) return
    customRulesListEl.innerHTML = ''
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']

    if (!rules || !Array.isArray(rules)) return

    rules.forEach((rule, index) => {
        const row = document.createElement('div')
        row.style.display = 'flex'
        row.style.alignItems = 'center'
        row.style.gap = '8px'
        row.style.padding = '8px'
        row.style.border = '1px solid var(--border)'
        row.style.borderRadius = '8px'
        row.style.background = 'var(--bg)'

        const domain = document.createElement('span')
        domain.textContent = rule.domain
        domain.style.flex = '1'
        domain.style.fontWeight = '500'

        const set = document.createElement('span')
        const setName = (t[rule.set] || rule.set)
        set.textContent = setName
        set.className = 'status'

        const removeBtn = document.createElement('button')
        removeBtn.textContent = t.removeRule
        removeBtn.style.padding = '4px 8px'
        removeBtn.style.fontSize = '12px'
        removeBtn.addEventListener('click', () => {
            rules.splice(index, 1)
            chrome.storage.sync.set({ customSiteSets: rules })
            renderCustomRules(rules)
        })

        row.appendChild(domain)
        row.appendChild(set)
        row.appendChild(removeBtn)
        customRulesListEl.appendChild(row)
    })
}

chrome.storage.sync.get({
    enabled: DEFAULT_ENABLED,
    set: DEFAULT_SET,
    strict: DEFAULT_STRICT,
    autoReload: false,
    lang: DEFAULT_LANG_KEY,
    emojiSize: 1.0,
    excludedDomains: '',
    showOriginal: false,
    shortcutKey: '',
    customSiteSets: []
}, v => {
    currentLang = v.lang || DEFAULT_LANG_KEY
    applyLanguage(currentLang)
    updateLangToggle()

    enabledEl.checked = !!v.enabled
    updateEnabledStatus()
    const current = String(v.set || DEFAULT_SET)
    for (const b of segEl.querySelectorAll('.seg-btn')) {
        b.classList.toggle('selected', b.dataset.set === current)
    }
    strictEl.checked = !!v.strict
    updateStrictStatus()
    if (autoReloadEl) {
        autoReloadEl.checked = !!v.autoReload
        updateAutoReloadStatus()
    }

    if (emojiSizeEl) {
        emojiSizeEl.value = v.emojiSize || 1.0
        emojiSizeValueEl.textContent = (v.emojiSize || 1.0) + 'x'
    }
    if (excludeListEl) {
        excludeListEl.value = v.excludedDomains || ''
    }

    if (showOriginalEl) showOriginalEl.checked = !!v.showOriginal
    if (shortcutInputEl) shortcutInputEl.value = v.shortcutKey || ''
    if (customRulesListEl) renderCustomRules(v.customSiteSets || [])

    updateSetStatus(current)
    loadData().then(renderPreview)
})

segEl.addEventListener('click', e => {
    const b = e.target.closest('.seg-btn')
    if (!b) return
    for (const c of segEl.querySelectorAll('.seg-btn')) c.classList.remove('selected')
    b.classList.add('selected')
    const selected = b.dataset.set || DEFAULT_SET
    updateSetStatus(selected)
    chrome.storage.sync.set({ set: selected })
    renderPreview()
})

enabledEl.addEventListener('change', () => {
    updateEnabledStatus()
    chrome.storage.sync.set({ enabled: enabledEl.checked })
    renderPreview()
})
strictEl.addEventListener('change', () => {
    updateStrictStatus()
    chrome.storage.sync.set({ strict: strictEl.checked })
})
if (autoReloadEl) {
    autoReloadEl.addEventListener('change', () => {
        updateAutoReloadStatus()
        chrome.storage.sync.set({ autoReload: autoReloadEl.checked })
    })
}

if (emojiSizeEl) {
    emojiSizeEl.addEventListener('input', () => {
        emojiSizeValueEl.textContent = emojiSizeEl.value + 'x'
        chrome.storage.sync.set({ emojiSize: parseFloat(emojiSizeEl.value) })
        renderPreview()
    })
}

if (excludeListEl) {
    excludeListEl.addEventListener('change', () => {
        const raw = excludeListEl.value
        const cleaned = raw.split('\n').map(line => {
            let l = line.trim()
            if (!l) return ''
            try {
                const url = new URL(l.match(/^https?:\/\//) ? l : `http://${l}`)
                return url.hostname.replace(/^www\./, '')
            } catch (e) {
                return l.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
            }
        }).filter(Boolean).join('\n')

        if (excludeListEl.value !== cleaned) {
            excludeListEl.value = cleaned
        }
        chrome.storage.sync.set({ excludedDomains: cleaned })
    })
}

if (showOriginalEl) {
    showOriginalEl.addEventListener('change', () => {
        chrome.storage.sync.set({ showOriginal: showOriginalEl.checked })
    })
}

if (shortcutInputEl) {
    shortcutInputEl.addEventListener('keydown', (e) => {
        e.preventDefault()
        e.stopPropagation()

        // Allow clearing with Backspace/Delete
        if (e.key === 'Backspace' || e.key === 'Delete') {
            shortcutInputEl.value = ''
            chrome.storage.sync.set({ shortcutKey: '' })
            return
        }

        // Ignore standalone modifier keys
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return

        const parts = []
        if (e.ctrlKey) parts.push('Ctrl')
        if (e.altKey) parts.push('Alt')
        if (e.shiftKey) parts.push('Shift')
        if (e.metaKey) parts.push('Meta')

        // Add the main key (uppercase)
        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)

        const shortcut = parts.join('+')
        shortcutInputEl.value = shortcut
        chrome.storage.sync.set({ shortcutKey: shortcut })
    })

    shortcutInputEl.addEventListener('click', () => {
        // Just focus
    })
}

if (clearShortcutBtn && shortcutInputEl) {
    clearShortcutBtn.addEventListener('click', () => {
        shortcutInputEl.value = ''
        chrome.storage.sync.set({ shortcutKey: '' })
    })
}

if (addRuleBtnEl && customDomainInputEl && customSetSelectEl) {
    addRuleBtnEl.addEventListener('click', () => {
        const raw = customDomainInputEl.value.trim()
        let domain = ''
        try {
            const url = new URL(raw.match(/^https?:\/\//) ? raw : `http://${raw}`)
            domain = url.hostname.replace(/^www\./, '')
        } catch (e) {
            domain = raw.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
        }
        domain = domain.toLowerCase()
        const set = customSetSelectEl.value

        if (!domain) return

        chrome.storage.sync.get({ customSiteSets: [] }, v => {
            const rules = v.customSiteSets || []
            // Remove existing rule for this domain if any
            const newRules = rules.filter(r => r.domain !== domain)
            newRules.push({ domain, set })
            chrome.storage.sync.set({ customSiteSets: newRules }, () => {
                renderCustomRules(newRules)
                customDomainInputEl.value = ''
            })
        })
    })
}

langToggleEl.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'ar' : 'en'
    chrome.storage.sync.set({ lang: currentLang })
    applyLanguage(currentLang)
    updateLangToggle()
    updateEnabledStatus()
    updateStrictStatus()
    updateAutoReloadStatus()
    updateSetStatus()
    renderPreview()
})

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        if (changes.lang) {
            currentLang = changes.lang.newValue
            applyLanguage(currentLang)
            updateLangToggle()
            updateEnabledStatus()
            updateStrictStatus()
            updateAutoReloadStatus()
            updateSetStatus()
            renderPreview()
        }
        if (changes.enabled) {
            enabledEl.checked = changes.enabled.newValue
            updateEnabledStatus()
            renderPreview()
        }
        if (changes.set) {
            const current = changes.set.newValue || DEFAULT_SET
            for (const b of segEl.querySelectorAll('.seg-btn')) {
                b.classList.toggle('selected', b.dataset.set === current)
            }
            updateSetStatus(current)
            renderPreview()
        }
        if (changes.strict) {
            strictEl.checked = !!changes.strict.newValue
            updateStrictStatus()
            renderPreview()
        }
        if (changes.autoReload && autoReloadEl) {
            autoReloadEl.checked = !!changes.autoReload.newValue
            updateAutoReloadStatus()
        }
        if (changes.emojiSize && emojiSizeEl) {
            emojiSizeEl.value = changes.emojiSize.newValue
            emojiSizeValueEl.textContent = changes.emojiSize.newValue + 'x'
            renderPreview()
        }
        if (changes.excludedDomains && excludeListEl) {
            excludeListEl.value = changes.excludedDomains.newValue
        }
    }
})

reloadEl.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const t = tabs && tabs[0]
        if (t && t.id) chrome.tabs.reload(t.id)
    })
})

toggleTestEl.addEventListener('click', () => {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
    if (testAreaEl.style.display === 'none') {
        testAreaEl.style.display = 'block'
        toggleTestEl.textContent = t.hidePreview
        const selected = segEl.querySelector('.seg-btn.selected')?.dataset.set || DEFAULT_SET
        renderTestArea(selected)
    } else {
        testAreaEl.style.display = 'none'
        toggleTestEl.textContent = t.preview
    }
})

checkUpdateBtn.addEventListener('click', () => {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']

    // If already showing "Visit Repository", then open it
    if (checkUpdateBtn.dataset.updateAvailable === 'true') {
        chrome.tabs.create({ url: 'https://github.com/voidksa/TrueMoji' })
        return
    }

    checkUpdateBtn.textContent = t.checking
    checkUpdateBtn.disabled = true

    chrome.runtime.sendMessage({ action: 'check_update' }, response => {
        checkUpdateBtn.disabled = false
        if (chrome.runtime.lastError) {
            checkUpdateBtn.textContent = t.updateError
            setTimeout(() => {
                checkUpdateBtn.textContent = t.checkUpdate
            }, 2000)
            return
        }

        if (response && response.available) {
            checkUpdateBtn.textContent = t.visitRepo + ` (v${response.version})`
            checkUpdateBtn.dataset.updateAvailable = 'true'
            checkUpdateBtn.style.borderColor = 'var(--accent)'
            checkUpdateBtn.style.color = 'var(--accent)'
        } else {
            checkUpdateBtn.textContent = t.noUpdate
            setTimeout(() => {
                checkUpdateBtn.textContent = t.checkUpdate
                checkUpdateBtn.dataset.updateAvailable = 'false'
            }, 2000)
        }
    })
})
