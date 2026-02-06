const DEFAULT_ENABLED = true
const DEFAULT_SET = 'apple'
const DEFAULT_LANG_KEY = 'en'
const enabledEl = document.getElementById('enabled')
const segEl = document.getElementById('setSeg')
const enabledStatusEl = document.getElementById('enabledStatus')
const setStatusEl = document.getElementById('setStatus')
const excludeSiteEl = document.getElementById('excludeSite')
const excludeSiteRow = document.getElementById('excludeSiteRow')
const excludeSiteStatusEl = document.getElementById('excludeSiteStatus')
const openOptionsEl = document.getElementById('openOptions')
const langToggleEl = document.getElementById('langToggle')
const checkUpdateBtn = document.getElementById('checkUpdateBtn')
const supportBtn = document.getElementById('supportBtn')
let currentLang = DEFAULT_LANG_KEY

function updateEnabledStatus() {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
  enabledStatusEl.textContent = enabledEl.checked ? t.statusOn : t.statusOff
}
function updateSetStatus(selected) {
  const s = selected || (segEl.querySelector('.seg-btn.selected')?.dataset.set || DEFAULT_SET)
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']

  // Try to find translation for the set name first (e.g. apple, google)
  // We can map dataset.set values to keys in TRANSLATIONS
  let setName = s.charAt(0).toUpperCase() + s.slice(1)

  // Mapping logic
  const map = {
    'apple': 'apple',
    'google': 'google',
    'system': 'system',
    'fluent-color': 'fluent',
    'joypixels': 'joypixels',
    'openmoji': 'openmoji',
    'twitter': 'twitter',
    'facebook': 'facebook'
  }

  if (map[s] && t[map[s]]) {
    setName = t[map[s]]
  }

  setStatusEl.textContent = setName
}

function updateExcludeSiteStatus() {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
  if (excludeSiteStatusEl && excludeSiteEl) {
    // When checked, it means "Disabled on this site", so status is On (feature is active)
    // Or users might interpret it as "Site is Excluded: Yes/No"
    // Let's stick to On/Off for the toggle state itself.
    // If toggle is ON -> Exclude is ON -> "On"
    excludeSiteStatusEl.textContent = excludeSiteEl.checked ? t.statusOn : t.statusOff
  }
}

function updateLangToggle() {
  langToggleEl.textContent = currentLang === 'en' ? 'AR' : 'EN'
}

chrome.storage.sync.get({ enabled: DEFAULT_ENABLED, set: DEFAULT_SET, lang: DEFAULT_LANG_KEY, excludedDomains: '' }, v => {
  currentLang = v.lang || DEFAULT_LANG_KEY
  applyLanguage(currentLang)
  updateLangToggle()

  enabledEl.checked = !!v.enabled
  updateEnabledStatus()
  const current = String(v.set || DEFAULT_SET)
  for (const b of segEl.querySelectorAll('.seg-btn')) {
    b.classList.toggle('selected', b.dataset.set === current)
  }
  updateSetStatus(current)

  if (supportBtn) {
    supportBtn.addEventListener('click', () => {
      const url = currentLang === 'ar' ? 'https://creators.sa/ar/voidksa' : 'https://creators.sa/en/voidksa'
      chrome.tabs.create({ url })
    })
  }

  // Set initial text for support button if not covered by updateUI
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
  if (supportBtn) {
    const span = supportBtn.querySelector('span')
    if (span) span.textContent = t.supportProject
  }
})

// Clear update badge when popup is opened
chrome.action.setBadgeText({ text: '' })

enabledEl.addEventListener('change', () => {
  updateEnabledStatus()
  chrome.storage.sync.set({ enabled: enabledEl.checked })
})

langToggleEl.addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'ar' : 'en'
  chrome.storage.sync.set({ lang: currentLang })
  applyLanguage(currentLang)
  updateLangToggle()
  updateEnabledStatus()
  updateSetStatus()
  updateExcludeSiteStatus()
})

segEl.addEventListener('click', e => {
  const b = e.target.closest('.seg-btn')
  if (!b) return
  for (const c of segEl.querySelectorAll('.seg-btn')) c.classList.remove('selected')
  b.classList.add('selected')
  const selected = String(b.dataset.set || DEFAULT_SET)
  updateSetStatus(selected)
  chrome.storage.sync.set({ set: selected })
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.lang) {
      currentLang = changes.lang.newValue
      applyLanguage(currentLang)
      updateLangToggle()
      updateEnabledStatus()
      updateSetStatus()
      updateExcludeSiteStatus()
    }
    if (changes.enabled) {
      enabledEl.checked = !!changes.enabled.newValue
      updateEnabledStatus()
    }
    if (changes.set) {
      const newSet = changes.set.newValue || DEFAULT_SET
      const buttons = segEl.querySelectorAll('.seg-btn')
      buttons.forEach(b => {
        b.classList.toggle('selected', b.dataset.set === newSet)
      })
      updateSetStatus(newSet)
    }
  }
})

openOptionsEl.addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage()
})

// Exclude site logic
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs[0]
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return

  let domain
  try {
    const url = new URL(tab.url)
    if (!url.protocol.startsWith('http')) return
    domain = url.hostname.replace(/^www\./, '')
  } catch (e) {
    return
  }

  const row = document.getElementById('excludeSiteRow')
  const cb = document.getElementById('excludeSite')
  if (!row || !cb) return

  row.style.display = 'flex'

  chrome.storage.sync.get({ excludedDomains: '' }, v => {
    const lines = v.excludedDomains.split('\n').map(s => s.trim()).filter(Boolean)
    cb.checked = lines.includes(domain)
    updateExcludeSiteStatus()

    cb.addEventListener('change', () => {
      updateExcludeSiteStatus()
      chrome.storage.sync.get({ excludedDomains: '' }, current => {
        let curLines = current.excludedDomains.split('\n').map(s => s.trim()).filter(Boolean)
        if (cb.checked) {
          if (!curLines.includes(domain)) curLines.push(domain)
        } else {
          curLines = curLines.filter(l => l !== domain)
        }
        chrome.storage.sync.set({ excludedDomains: curLines.join('\n') })
      })
    })
  })
})
