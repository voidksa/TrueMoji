const DEFAULT_ENABLED = true
const DEFAULT_SET = 'apple'
const DEFAULT_LANG_KEY = 'en'
const enabledEl = document.getElementById('enabled')
const segEl = document.getElementById('setSeg')
const enabledStatusEl = document.getElementById('enabledStatus')
const setStatusEl = document.getElementById('setStatus')
const openOptionsEl = document.getElementById('openOptions')
const langToggleEl = document.getElementById('langToggle')
const checkUpdateBtn = document.getElementById('checkUpdateBtn')
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

chrome.storage.sync.get({ enabled: DEFAULT_ENABLED, set: DEFAULT_SET, lang: DEFAULT_LANG_KEY }, v => {
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
    }
    if (changes.enabled) {
      enabledEl.checked = changes.enabled.newValue
      updateEnabledStatus()
    }
    if (changes.set) {
      const newSet = changes.set.newValue
      for (const b of segEl.querySelectorAll('.seg-btn')) {
        b.classList.toggle('selected', b.dataset.set === newSet)
      }
      updateSetStatus(newSet)
    }
  }
})

openOptionsEl.addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage()
})

checkUpdateBtn.addEventListener('click', () => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en']
  const span = checkUpdateBtn.querySelector('span')

  // If already showing "Visit Repository", then open it
  if (checkUpdateBtn.dataset.updateAvailable === 'true') {
    chrome.tabs.create({ url: 'https://github.com/voidksa/TrueMoji' })
    return
  }

  span.textContent = t.checking
  checkUpdateBtn.disabled = true

  chrome.runtime.sendMessage({ action: 'check_update' }, response => {
    checkUpdateBtn.disabled = false
    if (chrome.runtime.lastError) {
      span.textContent = t.updateError
      setTimeout(() => {
        span.textContent = t.checkUpdate
      }, 2000)
      return
    }

    if (response && response.available) {
      span.textContent = t.visitRepo + ` (v${response.version})`
      checkUpdateBtn.dataset.updateAvailable = 'true'
      checkUpdateBtn.style.borderColor = 'var(--accent)'
      checkUpdateBtn.style.color = 'var(--accent)'
    } else {
      span.textContent = t.noUpdate
      setTimeout(() => {
        span.textContent = t.checkUpdate
        checkUpdateBtn.dataset.updateAvailable = 'false'
      }, 2000)
    }
  })
})
