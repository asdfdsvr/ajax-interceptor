import { useState, Suspense, lazy } from 'react'
import { Switch, Radio, Spin } from 'antd'
// React.lazy 懒加载 Monaco：用户展开规则卡片前不下载编辑器代码
const MonacoEditor = lazy(() => import('../Editor'))
import {
  REQUEST_PAYLOAD_EXAMPLES,
  HEADERS_EXAMPLES,
  RESPONSE_EXAMPLES,
  RESPONSE_SIMPLE_EXAMPLES
} from '../Editor/examples'
import { setChromeStorage } from '../../utils'

import './index.less'

export default function Replacer({ index, set, updateAddBtnTop_interval, darkMode }) {
  const [editorValue, setEditorValue] = useState(
    window.setting.ajaxInterceptor_rules[index].editorValue || 3
  )
  const [isExpert, setIsExpert] = useState(
    window.setting.ajaxInterceptor_rules[index].isExpert || false
  )

  const handleOverrideTxtChange = (txt) => {
    window.setting.ajaxInterceptor_rules[index].overrideTxt = txt
    set('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
  }

  const handleExpertSwitch = () => {
    const newIsExpert = !isExpert
    setIsExpert(newIsExpert)
    window.setting.ajaxInterceptor_rules[index].isExpert = newIsExpert
    setChromeStorage('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
    updateAddBtnTop_interval()
  }

  const handleEditorRatioChange = e => {
    setEditorValue(e.target.value)
    window.setting.ajaxInterceptor_rules[index].editorValue = e.target.value
    setChromeStorage('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
  }

  const onPayloadEditorChange = (newValue) => {
    window.setting.ajaxInterceptor_rules[index].overridePayloadFunc = newValue
    setChromeStorage('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
  }

  const onHeadersEditorChange = (newValue) => {
    window.setting.ajaxInterceptor_rules[index].overrideHeadersFunc = newValue
    setChromeStorage('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
  }

  const onResponseEditorChange = (newValue) => {
    window.setting.ajaxInterceptor_rules[index].overrideResponseFunc = newValue
    setChromeStorage('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
  }

  return (
    <>
      <Switch onChange={handleExpertSwitch} size="small" checked={isExpert}
              checkedChildren=" Advanced Mode" unCheckedChildren="Advanced Mode " />
      {
        !isExpert && (
          <div>
            <div className="replace-with">
              Replace Response With:
            </div>
            <Suspense fallback={<div style={{ textAlign: 'center', padding: '20px 0' }}><Spin size="small" /></div>}>
              <MonacoEditor
                index={index}
                language="json"
                defaultValue={window.setting.ajaxInterceptor_rules[index].overrideTxt}
                examples={RESPONSE_SIMPLE_EXAMPLES}
                onEditorChange={handleOverrideTxtChange}
                languageSelectOptions={["json", "text"]}
                darkMode={darkMode}
              />
            </Suspense>
          </div>
        )
      }
      {
        isExpert && (
          <div>
            <Radio.Group value={editorValue} onChange={handleEditorRatioChange} className="replace-radio">
              <Radio.Button value={1}>Payload</Radio.Button>
              <Radio.Button value={2}>Headers</Radio.Button>
              <Radio.Button value={3}>Response</Radio.Button>
            </Radio.Group>
            <Suspense fallback={<div style={{ textAlign: 'center', padding: '20px 0' }}><Spin size="small" /></div>}>
              {
                editorValue === 1 && (
                  <MonacoEditor
                    index={index}
                    language="javascript"
                    defaultValue={window.setting.ajaxInterceptor_rules[index].overridePayloadFunc}
                    examples={REQUEST_PAYLOAD_EXAMPLES}
                    onEditorChange={onPayloadEditorChange}
                    languageSelectOptions={["javascript"]}
                    darkMode={darkMode}
                  />
                )
              }
              {
                editorValue === 2 && (
                  <MonacoEditor
                    index={index}
                    language="javascript"
                    defaultValue={window.setting.ajaxInterceptor_rules[index].overrideHeadersFunc}
                    examples={HEADERS_EXAMPLES}
                    onEditorChange={onHeadersEditorChange}
                    languageSelectOptions={["javascript"]}
                    darkMode={darkMode}
                  />
                )
              }
              {
                editorValue === 3 && (
                  <MonacoEditor
                    index={index}
                    language="javascript"
                    defaultValue={window.setting.ajaxInterceptor_rules[index].overrideResponseFunc}
                    examples={RESPONSE_EXAMPLES}
                    onEditorChange={onResponseEditorChange}
                    languageSelectOptions={["javascript"]}
                    darkMode={darkMode}
                  />
                )
              }
            </Suspense>
          </div>
        )
      }
    </>
  )
}
