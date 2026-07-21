import { useState, useEffect, useRef, useCallback } from 'react'
import { ConfigProvider, theme as antdTheme, Switch, Collapse, Input, Select, Button, Badge, Tooltip, Modal, Radio, Space } from 'antd'
import { SettingOutlined, QuestionCircleOutlined, MinusOutlined, PlusOutlined, MoonOutlined, SunOutlined, InfoCircleOutlined } from '@ant-design/icons'
import Replacer from './components/Replacer'
import './Main.less'

const { Panel } = Collapse

const buildUUID = () => {
  var dt = new Date().getTime()
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (dt + Math.random() * 16) % 16 | 0
    dt = Math.floor(dt / 16)
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
  return uuid
}


export default function Main() {
  const [interceptedRequests, setInterceptedRequests] = useState({})
  const [settingModalVisible, setSettingModalVisible] = useState(false)
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const [positionClass, setPositionClass] = useState('suspend')
  const [customFunction, setCustomFunction] = useState({ panelPosition: 0 })
  const [showRefreshTip, setShowRefreshTip] = useState(false)
  const [darkMode, setDarkMode] = useState(window.setting.darkMode || false)
  const [, forceUpdate] = useState(0)

  const addBtnRef = useRef(null)
  const forceUpdateTimeout = useRef(null)

  // 统一清理所有 timer，防止组件卸载后的内存泄漏
  useEffect(() => {
    return () => {
      clearTimeout(forceUpdateTimeout.current)
    }
  }, [])

  // 暗黑模式切换：同步 class 到 document.documentElement
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
    if (chrome.storage) {
      chrome.storage.local.set({ darkMode })
    }
  }, [darkMode])

  const handleDarkModeToggle = () => {
    setDarkMode(prev => !prev)
  }

  const forceUpdateDebounce = useCallback(() => {
    clearTimeout(forceUpdateTimeout.current)
    forceUpdateTimeout.current = setTimeout(() => {
      forceUpdate(v => v + 1)
    }, 1000)
  }, [])

  useEffect(() => {
    const listener = ({ type, to, url, match, contentScriptLoaded = false, showFreshTip = false }) => {
      if (type === 'ajaxInterceptor' && to === 'iframe') {
        if (contentScriptLoaded || showFreshTip) {
          setShowRefreshTip(showFreshTip)
          return
        }
        setInterceptedRequests(prev => {
          const newRequests = { ...prev }
          if (!newRequests[match]) newRequests[match] = []

          const existIndex = newRequests[match].findIndex(obj => obj.url === url)
          if (existIndex >= 0) {
            // 创建新对象而不是直接修改原对象，遇免 state mutation
            const updated = [...newRequests[match]]
            updated[existIndex] = { ...updated[existIndex], num: updated[existIndex].num + 1 }
            newRequests[match] = updated
          } else {
            newRequests[match] = [...newRequests[match], { url, num: 1 }]
          }
          return newRequests
        })
      }
    }
    chrome.runtime.onMessage.addListener(listener)

    chrome.runtime.sendMessage(chrome.runtime.id, {
      type: 'ajaxInterceptor',
      to: 'background',
      iframeScriptLoaded: true
    }).catch(() => {})

    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [])

  const set = useCallback((key, value) => {
    chrome.runtime.sendMessage(chrome.runtime.id, { type: 'ajaxInterceptor', to: 'background', key, value }).catch(() => {})
    chrome.storage && chrome.storage.local.set({ [key]: value })
  }, [])

  const handleSingleSwitchChange = useCallback((switchOn, i) => {
    window.setting.ajaxInterceptor_rules[i].switchOn = switchOn
    set('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
    forceUpdateDebounce()
  }, [set, forceUpdateDebounce])

  const handleLimitMethodChange = useCallback((val, i) => {
    window.setting.ajaxInterceptor_rules[i].limitMethod = val
    set('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
    forceUpdate(v => v + 1)
  }, [set])

  const handleFilterTypeChange = useCallback((val, i) => {
    window.setting.ajaxInterceptor_rules[i].filterType = val
    set('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
    forceUpdate(v => v + 1)
  }, [set])

  const handleMatchChange = useCallback((e, i) => {
    window.setting.ajaxInterceptor_rules[i].match = e.target.value
    set('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
    forceUpdateDebounce()
  }, [set, forceUpdateDebounce])

  const handleBodyFilterChange = useCallback((e, i) => {
    window.setting.ajaxInterceptor_rules[i].bodyFilter = e.target.value
    set('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
    forceUpdateDebounce()
  }, [set, forceUpdateDebounce])

  const handleDirectReturnChange = useCallback((val, i) => {
    window.setting.ajaxInterceptor_rules[i].directReturn = val
    set('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
    forceUpdate(v => v + 1)
  }, [set])

  const handleLabelChange = useCallback((e, i) => {
    window.setting.ajaxInterceptor_rules[i].label = e.target.value
    set('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)
    forceUpdateDebounce()
  }, [set, forceUpdateDebounce])

  const handleClickAdd = useCallback(() => {
    window.setting.ajaxInterceptor_rules.push({
      match: '',
      label: `url${window.setting.ajaxInterceptor_rules.length + 1}`,
      switchOn: true,
      key: buildUUID(),
      bodyFilter: '',
      directReturn: false,
    })
    forceUpdate(v => v + 1)
  }, [])

  const handleClickRemove = useCallback((e, i) => {
    e.stopPropagation()
    const match = window.setting.ajaxInterceptor_rules[i].match
    const label = window.setting.ajaxInterceptor_rules[i].label

    window.setting.ajaxInterceptor_rules = [
      ...window.setting.ajaxInterceptor_rules.slice(0, i),
      ...window.setting.ajaxInterceptor_rules.slice(i + 1),
    ]
    set('ajaxInterceptor_rules', window.setting.ajaxInterceptor_rules)

    setInterceptedRequests(prev => {
      const next = { ...prev }
      delete next[match]
      delete next[label]
      return next
    })
  }, [set])


  const handleSwitchChange = useCallback(() => {
    window.setting.ajaxInterceptor_switchOn = !window.setting.ajaxInterceptor_switchOn
    set('ajaxInterceptor_switchOn', window.setting.ajaxInterceptor_switchOn)
    forceUpdate(v => v + 1)
  }, [set])

  const showSettingModal = () => {
    setSettingModalVisible(true)
    setCustomFunction({ ...window.setting.customFunction })
  }
  const handleSettingModalConfirm = () => {
    setInfoModalVisible(true)
  }
  const handleSettingModalCancel = () => {
    setSettingModalVisible(false)
  }
  const handlePositionChange = e => {
    setCustomFunction(prev => ({
      ...prev,
      panelPosition: e.target.value
    }))
  }
  const showImageModal = (pClass) => {
    setImageModalVisible(true)
    setPositionClass(pClass)
  }
  const handleImageModalClose = () => {
    setImageModalVisible(false)
  }
  const handleInfoModalClose = () => {
    setImageModalVisible(false)
    setInfoModalVisible(false)
    setSettingModalVisible(false)
    window.setting.customFunction = customFunction
    set('customFunction', window.setting.customFunction)
  }

  const antdThemeConfig = {
    algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: darkMode ? '#818cf8' : '#4f46e5',
      borderRadius: 6,
      fontSizeSM: 12,
    },
  }

  const isOn = window.setting.ajaxInterceptor_switchOn

  return (
    <ConfigProvider theme={antdThemeConfig}>
      <div className={`ajax-modifier-main${darkMode ? ' dark-mode' : ''}`}>

        {/* 顶栏 */}
        <div className="toolbar">
          <div className="toolbar-left">
            <Switch
              checked={isOn}
              onChange={handleSwitchChange}
              size="small"
            />
            <span className="toolbar-title">
              Ajax Modifier
            </span>
          </div>
          <div className="toolbar-right">
            <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
              <span className="icon-btn" onClick={handleDarkModeToggle}>
                {darkMode ? <SunOutlined /> : <MoonOutlined />}
              </span>
            </Tooltip>
            <Tooltip title="Settings">
              <span className="icon-btn" onClick={showSettingModal}>
                <SettingOutlined />
              </span>
            </Tooltip>
          </div>
        </div>

        {/* 刷新提示 */}
        {showRefreshTip && (
          <div className="refresh-tip">
            <InfoCircleOutlined />
            Please refresh your page after changing rules.
          </div>
        )}

        {/* 规则列表 */}
        <div className={isOn ? 'setting-body' : 'setting-body setting-body-hidden'}>
          {window.setting.ajaxInterceptor_rules && window.setting.ajaxInterceptor_rules.length > 0 ? (
            <div>
              <Collapse
                className={isOn ? 'collapse' : 'collapse collapse-hidden'}
              >
                {window.setting.ajaxInterceptor_rules.map(({
                  filterType = 'normal',
                  limitMethod = 'ALL',
                  match,
                  label,
                  switchOn = true,
                  key,
                  bodyFilter = '',
                  directReturn = false,
                }, i) => (
                  <Panel
                    key={key}
                    header={
                      <div className="panel-header" onClick={e => e.stopPropagation()}>
                        <div className="panel-header-row">
                          <div style={{ flex: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Input
                              placeholder="name"
                              style={{ width: '1px', maxWidth: '110px', flex: 'auto' }}
                              defaultValue={label}
                              onChange={e => handleLabelChange(e, i)}
                            />
                            <Select
                              defaultValue={limitMethod}
                              style={{ width: '1px', maxWidth: '90px', flex: '1.5 1 auto' }}
                              onChange={e => handleLimitMethodChange(e, i)}
                            >
                              <Select.Option value="ALL">ALL</Select.Option>
                              <Select.Option value="GET">GET</Select.Option>
                              <Select.Option value="POST">POST</Select.Option>
                              <Select.Option value="PUT">PUT</Select.Option>
                              <Select.Option value="HEAD">HEAD</Select.Option>
                              <Select.Option value="DELETE">DELETE</Select.Option>
                              <Select.Option value="OPTIONS">OPTIONS</Select.Option>
                            </Select>
                            <Select
                              defaultValue={filterType}
                              style={{ width: '1px', maxWidth: '90px', flex: '1.5 1 auto' }}
                              onChange={e => handleFilterTypeChange(e, i)}
                            >
                              <Select.Option value="normal">normal</Select.Option>
                              <Select.Option value="regex">regex</Select.Option>
                            </Select>
                            <Input
                              placeholder={filterType === 'normal' ? 'eg: abc/get' : 'eg: abc.*'}
                              style={{ width: '1px', flex: '2 1 auto' }}
                              defaultValue={match}
                              onChange={e => handleMatchChange(e, i)}
                            />
                          </div>
                          <div className="button-group">
                            <Switch
                              size="small"
                              defaultChecked={switchOn}
                              onChange={val => handleSingleSwitchChange(val, i)}
                            />
                            <Tooltip title="Remove rule">
                              <Button
                                type="primary"
                                danger
                                shape="circle"
                                icon={<MinusOutlined />}
                                size="small"
                                onClick={e => handleClickRemove(e, i)}
                                style={{ width: '22px', height: '22px', minWidth: '22px' }}
                              />
                            </Tooltip>
                          </div>
                        </div>
                        <div className="panel-header-row body-filter-row">
                          <span className="body-filter-label">Body:</span>
                          <Input
                            placeholder="Filter by params, eg: id=123 or userId ="
                            style={{ flex: 'auto' }}
                            defaultValue={bodyFilter}
                            onChange={e => handleBodyFilterChange(e, i)}
                          />
                          <div className="mock-toggle">
                            <Switch
                              size="small"
                              defaultChecked={directReturn}
                              onChange={val => handleDirectReturnChange(val, i)}
                            />
                            <span className="mock-toggle-label">Mock</span>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <Replacer
                      index={i}
                      set={set}
                      darkMode={darkMode}
                    />
                    {interceptedRequests[match] && (
                      <>
                        <div className="intercepted-requests">
                          Intercepted Networks
                        </div>
                        <div className="intercepted">
                          {interceptedRequests[match].map(({ url, num }) => (
                            <Tooltip placement="top" title={url} key={url}>
                              <span className="intercepted-item">
                                <Badge
                                  count={num}
                                  style={{
                                    fontSize: '10px',
                                    marginTop: '-2px',
                                  }}
                                />
                                <span className="url">{url}</span>
                              </span>
                            </Tooltip>
                          ))}
                        </div>
                      </>
                    )}
                  </Panel>
                ))}
              </Collapse>
            </div>
          ) : <div/>}
          <div ref={addBtnRef} className="wrapper-btn-add">
            <Tooltip title="Add rule">
              <Button
                className={`btn-add${isOn ? '' : ' btn-add-hidden'}`}
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                onClick={handleClickAdd}
                disabled={!isOn}
              />
            </Tooltip>
          </div>
        </div>

        {/* 设置 Modal */}
        <Modal
          open={settingModalVisible}
          title="Settings"
          width="410px"
          onCancel={handleSettingModalCancel}
          footer={[
            <Button key="Cancel" onClick={handleSettingModalCancel}>
              Cancel
            </Button>,
            <Button key="Submit" type="primary" onClick={handleSettingModalConfirm}>
              Submit
            </Button>,
          ]}
        >
          <div style={{ padding: '4px 0' }}>
            <span style={{ fontWeight: 500 }}>Position:</span>
            <Radio.Group
              onChange={handlePositionChange} value={customFunction.panelPosition}
              style={{ marginLeft: '20px' }}
            >
              <Radio value={0}>
                <span>Suspend (Default)</span>
                <QuestionCircleOutlined className="radio-icon" onClick={() => showImageModal("suspend")}/>
              </Radio>
              <Radio value={1}>
                <span>Devtools</span>
                <QuestionCircleOutlined className="radio-icon" onClick={() => showImageModal("devtools")}/>
              </Radio>
            </Radio.Group>
          </div>
        </Modal>

        {/* 提示刷新 Modal */}
        <Modal
          open={infoModalVisible}
          onCancel={handleInfoModalClose}
          footer={null}
          closable={false}
          width="410px"
          style={{ marginTop: 10 }}
        >
          <div style={{ margin: '16px 0' }}>
            Please refresh the page and reopen the devtools after submitting.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" onClick={handleInfoModalClose}>OK</Button>
          </div>
        </Modal>

        {/* 位置图示 Modal */}
        <Modal
          open={imageModalVisible}
          onCancel={handleImageModalClose}
          footer={null}
          mask={false}
          closable={false}
          width="502px"
          styles={{ body: { padding: '8px' } }}
        >
          <div onClick={handleImageModalClose}>
            <div className="position-title">
              Example of {positionClass === 'suspend' ? 'Suspend (Default)' : 'Devtools'} Position:
            </div>
            <div className={`position-image image-${positionClass}`}></div>
          </div>
        </Modal>

      </div>
    </ConfigProvider>
  )
}
