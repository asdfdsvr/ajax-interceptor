export function setChromeStorage(key, value) {
  chrome.runtime.sendMessage(chrome.runtime.id, { type: 'ajaxInterceptor', to: 'background', key, value }).catch(() => {})
  chrome.storage && chrome.storage.local.set({ [key]: value })
}