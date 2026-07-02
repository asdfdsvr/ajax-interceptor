// 命名空间
// 从 content.js 预写入的 <meta> 标签读取初始配置，避免刷新时的竞态条件（早期请求漏拦截）
const __initMeta = document.querySelector('meta[name="__ajaxInterceptorInit"]')
const __init = __initMeta ? JSON.parse(__initMeta.content) : {}
if (__initMeta) __initMeta.remove()

let ajax_interceptor_qoweifjqon = {
  settings: {
    ajaxInterceptor_switchOn: !!__init.ajaxInterceptor_switchOn,
    ajaxInterceptor_always200On: true,
    ajaxInterceptor_rules: __init.ajaxInterceptor_rules || [],
  },
  // 获取匹配到的规则项
  getMatchedInterface: ({
    thisRequestUrl = '',
    thisMethod = ''
  }) => {
    return ajax_interceptor_qoweifjqon.settings.ajaxInterceptor_rules.find(item => {
      const {
        filterType = 'normal', limitMethod = 'ALL', switchOn = true, match
      } = item
      const matchedMethod = thisMethod === limitMethod || limitMethod === 'ALL'
      const matchedRequest = (filterType === 'normal' && thisRequestUrl.indexOf(match) > -1) ||
        (filterType === 'regex' && thisRequestUrl.match(new RegExp(match, 'i')))
      return switchOn && matchedMethod && matchedRequest
    })
  },
  // 执行用户输入的函数，如果有错误会抛出到控制台
  executeStringFunction: (stringFunction, args, funcName = '') => {
    try {
      stringFunction = (new Function('...args', stringFunction))(args)
    } catch (e) {
      console.error(`[Ajax Modifier] ExecuteFunctionError: Please check the ${funcName} function.\n`, e)
    }
    return stringFunction;
  },
  getRequestParams: (requestUrl) => {
    if (!requestUrl) {
      return null;
    }
    const paramStr = requestUrl.split('?').pop();
    const keyValueArr = paramStr.split('&');
    let keyValueObj = {};
    keyValueArr.forEach((item) => {
      const itemArr = item.replace('=', '〓').split('〓');
      const itemObj = {
        [itemArr[0]]: itemArr[1]
      };
      keyValueObj = Object.assign(keyValueObj, itemObj);
    });
    return keyValueObj;
  },
  getCompleteUrl: (inputUrl) => {
    let url = inputUrl.trim()
    const protocol = window.location.protocol
    const host = window.location.host
    const currentUrl = window.location.href
    try {
      new URL(url)
    } catch (e) {
      if (url.startsWith("./") || url.startsWith("../")) {
        url = new URL(url, currentUrl).href
      } else if (url.startsWith("//")) {
        url = protocol + url
      } else {
        url = protocol + "//" + host + (url.startsWith("/") ? "" : "/") + url
      }
    }
    return url
  },
  // 读取 ReadableStream 为字符串
  readReadableStream: async (readableStream) => {
    const reader = readableStream.getReader();
    let chunks = [];
    let done, value;

    while ({
        done,
        value
      } = await reader.read(), !done) {
      chunks.push(value);
    }

    let combined = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (let chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder();
    return decoder.decode(combined);
  },
  // 从字符串创建 ReadableStream
  createReadableStream: (text) => {
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);

    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encodedText);
        controller.close();
      }
    });

    return readableStream;
  },
  isReadableStream: (obj) => {
    return obj instanceof ReadableStream
  },
  originalXHR: window.XMLHttpRequest,
  myXHR: function () {
    let pageScriptEventDispatched = false
    const modifyResponse = () => {
      const [method, requestUrl] = this._openArgs
      const queryParams = ajax_interceptor_qoweifjqon.getRequestParams(requestUrl)
      const [requestPayload] = this._sendArgs
      const matchedInterface = this._matchedInterface
      if (matchedInterface && (matchedInterface.overrideTxt || matchedInterface.overrideResponseFunc)) {
        const {
          overrideTxt,
          overrideResponseFunc,
          match,
          isExpert = false
        } = matchedInterface
        let overrideResponse = undefined
        let overrideStatus = undefined
        let overrideStatusText = undefined
        if (overrideTxt && !isExpert) {
          overrideResponse = overrideTxt
          if (ajax_interceptor_qoweifjqon.settings.ajaxInterceptor_always200On && this.status !== 200) {
            overrideStatus = 200
            overrideStatusText = 'OK'
          }
        } else if (overrideResponseFunc && isExpert) {
          const funcArgs = {
            method,
            payload: {
              queryParams,
              requestPayload
            },
            orgResponse: this.response,
            orgStatus: this.status,
            orgStatusText: this.statusText
          }
          const res = ajax_interceptor_qoweifjqon.executeStringFunction(overrideResponseFunc, funcArgs, 'response')
          if (typeof res === 'object' && res !== null) {
            const {
              response: newResponse = undefined,
              status: newStatus = undefined,
              statusText: newStatusText = undefined
            } = res
            overrideResponse = newResponse
            overrideStatus = newStatus
            overrideStatusText = newStatusText
          } else {
            console.error(`[Ajax Modifier] ExecuteFunctionError: Please check your return in the response function. See more details in the examples. \n`)
          }
        }
        this.responseText = overrideResponse !== undefined ? overrideResponse : this.responseText
        this.response = overrideResponse !== undefined ? overrideResponse : this.response
        this.status = overrideStatus !== undefined ? overrideStatus : this.status
        this.statusText = overrideStatusText !== undefined ? overrideStatusText : this.statusText
        if (!pageScriptEventDispatched) {
          window.dispatchEvent(new CustomEvent("pageScript", {
            detail: {
              url: this.responseURL,
              match
            }
          }))
          pageScriptEventDispatched = true
        }
      }
    }

    const xhr = new ajax_interceptor_qoweifjqon.originalXHR
    for (let attr in xhr) {
      if (attr === 'onreadystatechange') {
        xhr.onreadystatechange = (...args) => {
          if (this.readyState === 4) {
            modifyResponse()
          }
          this.onreadystatechange && this.onreadystatechange.apply(this, args)
        }
        this.onreadystatechange = null
        continue
      } else if (attr === 'onload') {
        xhr.onload = (...args) => {
          modifyResponse()
          this.onload && this.onload.apply(this, args)
        }
        this.onload = null
        continue
      } else if (attr === 'open') {
        this.open = (...args) => {
          this._openArgs = args
          const [method, requestUrl] = args
          this._matchedInterface = ajax_interceptor_qoweifjqon.getMatchedInterface({
            thisRequestUrl: ajax_interceptor_qoweifjqon.getCompleteUrl(requestUrl),
            thisMethod: method
          })
          const matchedInterface = this._matchedInterface
          if (matchedInterface) {
            const {
              overridePayloadFunc,
              isExpert = false
            } = matchedInterface
            if (overridePayloadFunc && isExpert && args[0] && args[1] && args[0].toUpperCase() === 'GET') {
              const queryParams = ajax_interceptor_qoweifjqon.getRequestParams(args[1])
              const payloadData = {
                requestUrl: args[1],
                queryParams
              }
              args[1] = ajax_interceptor_qoweifjqon.executeStringFunction(overridePayloadFunc, payloadData, 'payload')
            }
          }
          xhr.open && xhr.open.apply(xhr, args)
        }
        continue
      } else if (attr === 'setRequestHeader') {
        this.setRequestHeader = (...args) => {
          this._headerArgs = this._headerArgs ? Object.assign(this._headerArgs, {
            [args[0]]: args[1]
          }) : {
            [args[0]]: args[1]
          };
          const matchedInterface = this._matchedInterface;
          if (!(matchedInterface && matchedInterface.overrideHeadersFunc && matchedInterface.isExpert)) {
            xhr.setRequestHeader && xhr.setRequestHeader.apply(xhr, args);
          }
        }
        continue;
      } else if (attr === 'send') {
        this.send = (...args) => {
          const matchedInterface = this._matchedInterface
          if (matchedInterface) {
            const {
              overrideHeadersFunc,
              overridePayloadFunc,
              isExpert = false
            } = matchedInterface
            if (overrideHeadersFunc && isExpert) {
              const headers = ajax_interceptor_qoweifjqon.executeStringFunction(overrideHeadersFunc, this._headerArgs, 'headers')
              Object.keys(headers).forEach((key) => {
                xhr.setRequestHeader && xhr.setRequestHeader.apply(xhr, [key, headers[key]]);
              })
            }
            const [method] = this._openArgs
            if (overridePayloadFunc && isExpert && method !== 'GET') {
              args[0] = ajax_interceptor_qoweifjqon.executeStringFunction(overridePayloadFunc, args[0], 'payload');
            }
          }
          this._sendArgs = args
          xhr.send && xhr.send.apply(xhr, args)
        }
        continue
      }

      if (typeof xhr[attr] === 'function') {
        this[attr] = xhr[attr].bind(xhr)
      } else {
        if (['responseText', 'response', 'status', 'statusText'].includes(attr)) {
          Object.defineProperty(this, attr, {
            get: () => this[`_${attr}`] == undefined ? xhr[attr] : this[`_${attr}`],
            set: (val) => this[`_${attr}`] = val,
            enumerable: true
          })
        } else {
          Object.defineProperty(this, attr, {
            get: () => xhr[attr],
            set: (val) => xhr[attr] = val,
            enumerable: true
          })
        }
      }
    }
  },
  originalFetch: window.fetch.bind(window),
  myFetch: async function (...args) {
    let [requestUrl, data] = args;

    let inputUrl = ''

    if (typeof requestUrl === 'string') {
      inputUrl = requestUrl
    } else if (typeof requestUrl === 'object') {
      inputUrl = requestUrl.url || ''
      if (!data) {
        data = requestUrl
      }
    }

    let bodyData = data?.body

    const matchedInterface = ajax_interceptor_qoweifjqon.getMatchedInterface({
      thisRequestUrl: ajax_interceptor_qoweifjqon.getCompleteUrl(inputUrl),
      thisMethod: data && data.method
    })
    if (matchedInterface && args) {
      if (bodyData && ajax_interceptor_qoweifjqon.isReadableStream(data.body)) {
        bodyData = await ajax_interceptor_qoweifjqon.readReadableStream(bodyData)
      }
      const {
        overrideHeadersFunc,
        overridePayloadFunc,
        isExpert = false
      } = matchedInterface;
      if (overrideHeadersFunc && isExpert && data) {
        // 从 fetch 的 Request/options 中提取 headers
        const fetchHeaders = data.headers || (requestUrl instanceof Request ? Object.fromEntries(requestUrl.headers.entries()) : {})
        const headers = ajax_interceptor_qoweifjqon.executeStringFunction(overrideHeadersFunc, fetchHeaders, 'headers')
        args[1] = args[1] || {}
        args[1].headers = headers
      }
      if (overridePayloadFunc && isExpert && requestUrl && data) {
        const {
          method
        } = data
        if (['GET', 'HEAD'].includes(method.toUpperCase())) {
          const queryParams = ajax_interceptor_qoweifjqon.getRequestParams(inputUrl);
          const payloadData = {
            requestUrl: inputUrl,
            queryParams
          }
          args[0] = ajax_interceptor_qoweifjqon.executeStringFunction(overridePayloadFunc, payloadData, 'payload');
        } else {
          const modifiedBody = await ajax_interceptor_qoweifjqon.executeStringFunction(overridePayloadFunc, bodyData, 'payload');
          if (ajax_interceptor_qoweifjqon.isReadableStream(data.body)) {
            const body = ajax_interceptor_qoweifjqon.createReadableStream(modifiedBody)
            args[0] = new Request(args[0], {
              body,
              duplex: 'half'
            });
          } else {
            data.body = modifiedBody
          }
        }
      }
    }
    return ajax_interceptor_qoweifjqon.originalFetch(...args).then(async (response) => {
      if (matchedInterface && (matchedInterface.overrideTxt || matchedInterface.overrideResponseFunc)) {
        window.dispatchEvent(new CustomEvent("pageScript", {
          detail: {
            url: response.url,
            match: matchedInterface.match
          }
        }))
        const {
          overrideTxt,
          overrideResponseFunc,
          isExpert = false
        } = matchedInterface
        let overrideResponse = undefined
        let overrideStatus = undefined
        let overrideStatusText = undefined

        if (overrideTxt && !isExpert) {
          overrideResponse = overrideTxt
          if (ajax_interceptor_qoweifjqon.settings.ajaxInterceptor_always200On && response.status !== 200) {
            overrideStatus = 200
            overrideStatusText = 'OK'
          }
        } else if (overrideResponseFunc && isExpert) {
          const queryParams = ajax_interceptor_qoweifjqon.getRequestParams(inputUrl)
          const orgResponse = await ajax_interceptor_qoweifjqon.readReadableStream(response.body);
          const funcArgs = {
            method: data?.method,
            payload: {
              queryParams,
              requestPayload: data?.body
            },
            orgResponse,
            orgStatus: response.status,
            orgStatusText: response.statusText
          }
          const res = ajax_interceptor_qoweifjqon.executeStringFunction(overrideResponseFunc, funcArgs, 'response')
          if (typeof res === 'object' && res !== null) {
            const {
              response: newResponse = undefined,
              status: newStatus = undefined,
              statusText: newStatusText = undefined
            } = res
            overrideResponse = newResponse
            overrideStatus = newStatus
            overrideStatusText = newStatusText
          } else {
            console.error(`[Ajax Modifier] ExecuteFunctionError: Please check your return in the response function. See more details in the examples. \n`)
          }
        }
        const txt = overrideResponse !== undefined ? overrideResponse : await response.text()
        const stream = ajax_interceptor_qoweifjqon.createReadableStream(txt)
        const params = {
          status: overrideStatus !== undefined ? overrideStatus : response.status,
          statusText: overrideStatusText !== undefined ? overrideStatusText : response.statusText,
        }
        const newResponse = new Response(stream, {
          headers: response.headers,
          ...params
        })
        const proxy = new Proxy(newResponse, {
          get: function (target, name) {
            switch (name) {
              case 'redirected':
              case 'type':
              case 'url':
              case 'useFinalURL':
              case 'body':
              case 'bodyUsed':
                return response[name]
            }
            return target[name]
          }
        })
        for (let key in proxy) {
          if (typeof proxy[key] === 'function') {
            proxy[key] = proxy[key].bind(newResponse)
          }
        }
        return proxy
      } else {
        return response
      }
    })
  },
}

window.addEventListener("message", function (event) {
  const data = event.data

  if (data.type === 'ajaxInterceptor' && data.to === 'pageScript') {
    ajax_interceptor_qoweifjqon.settings[data.key] = data.value
  }

  applyInterceptor()
}, false)

// 脚本加载时根据初始状态立即挂钩，无需等待消息
applyInterceptor()

function applyInterceptor() {
  if (ajax_interceptor_qoweifjqon.settings.ajaxInterceptor_switchOn) {
    // https://github.com/YGYOOO/ajax-interceptor/issues/78
    // https://github.com/YGYOOO/ajax-interceptor/issues/93
    for (const k in ajax_interceptor_qoweifjqon.originalXHR) {
      ajax_interceptor_qoweifjqon.myXHR[k] = ajax_interceptor_qoweifjqon.originalXHR[k]
    }
    window.XMLHttpRequest = ajax_interceptor_qoweifjqon.myXHR
    window.fetch = ajax_interceptor_qoweifjqon.myFetch
  } else {
    window.XMLHttpRequest = ajax_interceptor_qoweifjqon.originalXHR
    window.fetch = ajax_interceptor_qoweifjqon.originalFetch
  }
}
