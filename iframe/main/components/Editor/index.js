import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Select, Dropdown } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import './index.less'

const MonacoEditor = (props, ref) => {
  const editorRef = useRef(null)
  const containerRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const visibleTimeout = useRef(null)

  const {
    languageSelectOptions = ['json', 'javascript'],
    examples = [{ egTitle: '', egText: '// Type here' }],
    darkMode = false,
  } = props

  const [editor, setEditor] = useState(null)
  const [language, setLanguage] = useState(props.language || 'javascript')
  const [dropOpen, setDropOpen] = useState(true)

  useImperativeHandle(ref, () => ({
    editorInstance: editor,
  }))

  // 初始化编辑器
  useEffect(() => {
    monaco.languages.register({ id: 'text' })
    const editorInstance = monaco.editor.create(editorRef.current, {
      value: '',
      language: props.language || 'javascript',
      theme: props.darkMode ? 'vs-dark' : 'vs',
      scrollBeyondLastLine: false,
      tabSize: 2,
      minimap: { enabled: false },
      automaticLayout: false, // 手动控制，由 ResizeObserver 触发
    })

    editorInstance.onDidChangeModelContent(() => {
      props.onEditorChange && props.onEditorChange(editorInstance.getValue())
    })

    // ResizeObserver：挂在 ref 上方便 cleanup
    resizeObserverRef.current = new ResizeObserver(() => {
      editorInstance.layout()
    })
    resizeObserverRef.current.observe(containerRef.current)

    setEditor(editorInstance)

    // cleanup：卸载时销毁编辑器和 observer，防止内存泄漏
    return () => {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      editorInstance.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 同步默认值（规则切换时）
  useEffect(() => {
    if (editor) {
      editor.getModel().setValue(props.defaultValue || '')
      setTimeout(() => {
        editor.getAction('editor.action.formatDocument')?.run()
      }, 300)
    }
  }, [editor, props.defaultValue])

  // 同步暗黑模式主题
  useEffect(() => {
    if (editor) {
      monaco.editor.setTheme(props.darkMode ? 'vs-dark' : 'vs')
    }
  }, [editor, props.darkMode])

  const formatDocumentAction = () => {
    if (editor) editor.getAction('editor.action.formatDocument')?.run()
  }

  const onLanguageChange = (_language) => {
    if (editor) {
      setLanguage(_language)
      monaco.editor.setModelLanguage(editor.getModel(), _language)
    }
  }

  const onAddExampleClick = (eg) => {
    if (editor) {
      const { egText, egLanguage = 'javascript' } = eg
      editor.getModel().setValue(egText)
      if (egLanguage !== language) setLanguage(egLanguage)
      monaco.editor.setModelLanguage(editor.getModel(), egLanguage)
    }
  }

  const menuItems = examples.map((eg, index) => ({
    key: index,
    label: <div onClick={() => onAddExampleClick(eg)}>{eg.egTitle}</div>,
  }))

  // Dropdown 自动关闭
  useEffect(() => {
    visibleTimeout.current = setTimeout(() => setDropOpen(false), 800)
    return () => {
      clearTimeout(visibleTimeout.current)
      visibleTimeout.current = null
    }
  }, [])

  const handleVisibleChange = (newVal) => {
    clearTimeout(visibleTimeout.current)
    visibleTimeout.current = null
    setDropOpen(newVal)
  }

  return (
    <div className="monaco-editor-container" ref={containerRef}>
      <div className="monaco-editor-header">
        <Select
          size="small"
          value={language}
          onChange={onLanguageChange}
          className="language-select"
        >
          {languageSelectOptions.map((lang) => (
            <Select.Option key={lang} value={lang}>{lang}</Select.Option>
          ))}
        </Select>
        <div className="editor-actions">
          {examples.length > 1 ? (
            <Dropdown
              menu={{ items: menuItems }}
              open={dropOpen}
              trigger={['click', 'hover']}
              onOpenChange={handleVisibleChange}
            >
              <a onClick={(e) => e.preventDefault()}>
                <div className="border-button">
                  <span>Example</span>
                  <DownOutlined className="down-icon" />
                </div>
              </a>
            </Dropdown>
          ) : (
            <div className="border-button" onClick={() => onAddExampleClick(examples[0])}>
              <span>Example</span>
            </div>
          )}
          <div className="border-button" onClick={formatDocumentAction}>
            <span>Format</span>
          </div>
        </div>
      </div>
      <div
        ref={editorRef}
        style={{ height: 400, minHeight: 100, width: '100%' }}
      />
    </div>
  )
}

export default React.memo(React.forwardRef(MonacoEditor))
