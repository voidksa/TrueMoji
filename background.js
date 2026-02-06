const MENU_TITLES = {
  en: "Toggle TrueMoji for this site",
  ar: "تفعيل/تعطيل TrueMoji لهذا الموقع"
}

function updateContextMenu(lang) {
  const title = MENU_TITLES[lang] || MENU_TITLES['en']
  chrome.contextMenus.update('toggle_site', { title })
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({ lang: 'en' }, (data) => {
    const title = MENU_TITLES[data.lang] || MENU_TITLES['en']
    chrome.contextMenus.create({
      id: 'toggle_site',
      title: title,
      contexts: ['page', 'frame', 'selection', 'link', 'image']
    })
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'toggle_site' && tab && tab.url) {
    try {
      const url = new URL(tab.url)
      const hostname = url.hostname
      chrome.storage.sync.get({ excludedDomains: '' }, data => {
        let list = (data.excludedDomains || '').split('\n').map(x => x.trim()).filter(x => x)
        if (list.includes(hostname)) {
          list = list.filter(x => x !== hostname)
        } else {
          list.push(hostname)
        }
        chrome.storage.sync.set({ excludedDomains: list.join('\n') }, () => {
          chrome.tabs.reload(tab.id)
        })
      })
    } catch (e) {
      console.error('Invalid URL:', e)
    }
  }
})

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get({ lang: 'en' }, (data) => {
    updateContextMenu(data.lang)
  })
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.lang) {
    updateContextMenu(changes.lang.newValue)
  }
})

chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: '' })
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetch_image_blob') {
    fetch(request.url)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onloadend = () => sendResponse({ dataUri: reader.result })
        reader.readAsDataURL(blob)
      })
      .catch(error => sendResponse({ error: error.message }))
    return true // Will respond asynchronously
  }
})
