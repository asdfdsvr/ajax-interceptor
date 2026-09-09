(function() {
  // 防止 content script 重复执行
  if (window.__ajaxInterceptor_contentLoaded) return;
  window.__ajaxInterceptor_contentLoaded = true;

// 立即注入拦截脚本，不等 storage 回调
// 确保 pageScripts/main.js 在页面脚本执行前就位，不遗漏早期请求
const defaultConfig = {
  ajaxInterceptor_switchOn: true,
  ajaxInterceptor_rules: [],
}
const metaEl = document.createElement('meta')
metaEl.name = '__ajaxInterceptorInit'
metaEl.content = JSON.stringify(defaultConfig)
document.documentElement.appendChild(metaEl)

// 同步加载 main.js 并注入到页面上下文，确保在页面脚本执行前完成拦截挂钩
let script
try {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', chrome.runtime.getURL('pageScripts/main.js'), false)
  xhr.send()
  script = document.createElement('script')
  script.textContent = xhr.responseText
} catch (e) {
  // 同步加载失败，回退到异步 script 标签
  console.warn('[Ajax Modifier] 同步加载 main.js 失败，回退到异步方式:', e)
  script = document.createElement('script')
  script.src = chrome.runtime.getURL('pageScripts/main.js')
  script.async = false
}
document.documentElement.appendChild(script)

// 再从 storage 读取真实设置，通过 postMessage 更新 main.js
chrome.storage.local.get(['ajaxInterceptor_switchOn', 'ajaxInterceptor_rules', 'customFunction'], (result) => {

  isDevtoolPosition = !!result.customFunction?.panelPosition

  // 更新 meta 标签（供可能延迟加载的代码读取）
  const realConfig = {
    ajaxInterceptor_switchOn: !!result.ajaxInterceptor_switchOn,
    ajaxInterceptor_rules: result.ajaxInterceptor_rules || [],
  }
  metaEl.content = JSON.stringify(realConfig)

  // 通过 postMessage 通知 main.js 更新设置
  postMessage({
    type: 'ajaxInterceptor',
    to: 'pageScript',
    key: 'ajaxInterceptor_switchOn',
    value: !!result.ajaxInterceptor_switchOn
  }, '*')
  postMessage({
    type: 'ajaxInterceptor',
    to: 'pageScript',
    key: 'ajaxInterceptor_rules',
    value: result.ajaxInterceptor_rules || []
  }, '*')

  if (!result.customFunction?.panelPosition) {
    if (['complete', 'interactive'].includes(document.readyState)) {
      insertIframe()
    } else {
      document.onreadystatechange = () => {
        if (document.readyState === 'interactive') {
          insertIframe()
        }
      }
    }
  } else {
    // devtools 模式：在确认到 panelPosition 后再通知 iframe/devtools
    // （必须在回调内执行，此时 isDevtoolPosition 才已正确赋値）
    chrome.runtime.sendMessage(chrome.runtime.id, {
      type: 'ajaxInterceptor',
      to: 'iframe',
      contentScriptLoaded: true
    }).catch(() => {})
  }
})

chrome.runtime.sendMessage(chrome.runtime.id, {type: 'ajaxInterceptor', to: 'background', contentScriptLoaded: true}).catch(() => {})

let iframeLoaded = false
let isDevtoolPosition = false

// 等待 iframe 加载完成的 Promise
let iframeReadyResolve
const iframeReady = new Promise((resolve) => {
  iframeReadyResolve = resolve
})

// 只在最顶层页面嵌入iframe
function insertIframe() {
  if (window.self === window.top) {
    const iframe = document.createElement('iframe')
    iframe.className = "api-interceptor"
    iframe.style.setProperty('height', '100%', 'important')
    iframe.style.setProperty('width', '518px', 'important')
    iframe.style.setProperty('min-width', '1px', 'important')
    iframe.style.setProperty('position', 'fixed', 'important')
    iframe.style.setProperty('top', '0', 'important')
    iframe.style.setProperty('right', '0', 'important')
    iframe.style.setProperty('left', 'auto', 'important')
    iframe.style.setProperty('bottom', 'auto', 'important')
    iframe.style.setProperty('z-index', '9999999999999', 'important')
    iframe.style.setProperty('transform', 'translateX(538px)', 'important')
    iframe.style.setProperty('transition', 'all .4s', 'important')
    iframe.style.setProperty('box-shadow', '0 0 15px 2px rgba(0,0,0,0.12)', 'important')
    iframe.frameBorder = "none"
    iframe.allow = "clipboard-write"
    iframe.src = chrome.runtime.getURL("iframe/index.html")
    document.body.appendChild(iframe)
    let show = false
    chrome.runtime.onMessage.addListener((msg, sender) => {
      if (msg == 'toggle') {
        show = !show
        iframe.style.setProperty('transform', show ? 'translateX(0)' : 'translateX(538px)', 'important')
      }
      return Promise.resolve("Dummy response to keep the console quiet")
    })
  }
}


// 接收background.js传来的信息，转发给pageScript
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'ajaxInterceptor' && msg.to === 'content') {
    if (msg.hasOwnProperty('iframeScriptLoaded')) {
      if (msg.iframeScriptLoaded) {
        iframeLoaded = true
        iframeReadyResolve && iframeReadyResolve()
      }
    } else {
      postMessage({...msg, to: 'pageScript'})
    }
  }
})

// 接收pageScript传来的信息，转发给iframe
window.addEventListener("pageScript", function(event) {
  if (iframeLoaded || isDevtoolPosition) {
    chrome.runtime.sendMessage({type: 'ajaxInterceptor', to: 'iframe', ...event.detail}).catch(() => {})
  } else {
    // 等待 iframe 加载完成后再发送，超时 5 秒
    Promise.race([
      iframeReady,
      new Promise((_, reject) => setTimeout(() => reject(new Error('iframe load timeout')), 5000))
    ]).then(() => {
      chrome.runtime.sendMessage({type: 'ajaxInterceptor', to: 'iframe', ...event.detail}).catch(() => {})
    }).catch(() => {
      console.warn('[Ajax Modifier] iframe load timeout, message dropped.')
    })
  }
}, false)

chrome.runtime.sendMessage(chrome.runtime.id, {type: 'ajaxInterceptor', to: 'background', contentScriptLoaded: true}).catch(() => {})
})();
