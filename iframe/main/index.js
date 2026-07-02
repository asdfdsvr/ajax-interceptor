import { createRoot } from 'react-dom/client'
import Main from './Main'

const DEFAULT_SETTING = {
  ajaxInterceptor_switchOn: false,
  ajaxInterceptor_rules: [],
  customFunction: {
    panelPosition: 0,  // 0:页面悬浮面板, 1:devTools
  }
}

const root = createRoot(document.getElementById('main'))

if (chrome.storage) {
  chrome.storage.local.get(['ajaxInterceptor_switchOn', 'ajaxInterceptor_rules', 'customFunction', 'darkMode'], (result) => {
    window.setting = {
      ...DEFAULT_SETTING,
      ...result,
    }
    // 初始化暗黑模式：优先读 storage，否则跟随系统
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    window.setting.darkMode = result.darkMode !== undefined ? result.darkMode : prefersDark

    root.render(<Main/>)
  })
} else {
  window.setting = DEFAULT_SETTING
  root.render(<Main/>)
}
