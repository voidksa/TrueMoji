const REPO_URL = 'https://github.com/voidksa/TrueMoji'
const MANIFEST_URL = 'https://raw.githubusercontent.com/voidksa/TrueMoji/main/manifest.json'
const ALARM_NAME = 'check_update'
const CHECK_INTERVAL = 60 // minutes

function compareVersions(v1, v2) {
  const p1 = v1.split('.').map(Number)
  const p2 = v2.split('.').map(Number)
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0
    const n2 = p2[i] || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

async function checkForUpdate(manual = false) {
  try {
    const res = await fetch(MANIFEST_URL)
    if (!res.ok) throw new Error('Failed to fetch manifest')
    const remote = await res.json()
    const local = chrome.runtime.getManifest()

    if (compareVersions(remote.version, local.version) > 0) {
      chrome.action.setBadgeText({ text: 'NEW' })
      chrome.action.setBadgeBackgroundColor({ color: '#F00' })

      if (!manual) {
        chrome.notifications.create('update_avail', {
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'TrueMoji Update Available',
          message: `Version ${remote.version} is available. Click to download.`,
          priority: 2
        })
      }
      return { available: true, version: remote.version }
    } else {
      return { available: false, version: local.version }
    }
  } catch (err) {
    console.warn('TrueMoji update check failed:', err)
    return { available: false, error: err.message }
  }
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'check_update') {
    checkForUpdate(true).then(res => sendResponse(res))
    return true
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL })
  checkForUpdate()
})

chrome.runtime.onStartup.addListener(() => {
  checkForUpdate()
})

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) checkForUpdate()
})

chrome.notifications.onClicked.addListener(id => {
  if (id === 'update_avail') {
    chrome.tabs.create({ url: REPO_URL })
    chrome.notifications.clear(id)
  }
})

chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: '' })
})
