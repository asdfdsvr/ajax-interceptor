// 先从 storage 读取设置，再注入拦截脚本
// 这样 pageScripts/main.js 加载时可以立即读到正确的初始状态，不会漏掉页面早期的请求
chrome.storage.local.get(['ajaxInterceptor_switchOn', 'ajaxInterceptor_rules', 'customFunction'], (result) => {

  isDevtoolPosition = !!result.customFunction?.panelPosition

  // 将初始设置写入页面，供 main.js 直接读取（无需等待异步消息）
  // 使用 Unicode 转义 <、>、& 防止 </script> 注入攻击
  const initConfig = {
    ajaxInterceptor_switchOn: !!result.ajaxInterceptor_switchOn,
    ajaxInterceptor_rules: result.ajaxInterceptor_rules || [],
  }
  const safeJson = JSON.stringify(initConfig)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
  const initScript = document.createElement('script')
  initScript.textContent = `window.__ajaxInterceptorInit = ${safeJson};`
  document.documentElement.appendChild(initScript)
  initScript.remove()

  // 再注入拦截主脚本
  const script = document.createElement('script')
  script.setAttribute('type', 'text/javascript')
  script.setAttribute('src', chrome.runtime.getURL('pageScripts/main.js'))
  document.documentElement.appendChild(script)

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
