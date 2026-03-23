import type { TranslationResult, TranslationSettings } from '../../shared/types/translation'

type YoudaoTranslationResponse = {
  errorCode?: string
  translation?: string[]
  query?: string
  l?: string
}

const YOUDAO_TRANSLATE_API = 'https://openapi.youdao.com/api'

const YOUDAO_ERROR_MESSAGES: Record<string, string> = {
  '101': '有道翻译缺少必填参数',
  '102': '有道翻译不支持当前语言类型',
  '108': '有道翻译应用 ID 无效',
  '111': '有道翻译开发者账号无效',
  '113': '选中文本不能为空',
  '202': '有道翻译签名校验失败，请检查应用 ID 与应用密钥',
  '203': '当前 IP 不在有道翻译的允许列表中',
  '206': '有道翻译时间戳无效',
  '207': '有道翻译请求被判定为重复请求，请稍后重试',
  '302': '有道翻译查询失败',
  '401': '有道翻译账户余额不足',
  '411': '有道翻译访问频率受限，请稍后重试'
}

export const buildYoudaoSignInput = (text: string) => {
  if (text.length <= 20) {
    return text
  }

  return `${text.slice(0, 10)}${text.length}${text.slice(-10)}`
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')

const sha256Hex = async (text: string) => {
  const encoded = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return toHex(new Uint8Array(digest))
}

const ensureSettingsReady = (settings: TranslationSettings) => {
  if (!settings.appKey || !settings.appSecret) {
    throw new Error('请先在插件弹窗中填写有道翻译的应用 ID 和应用密钥')
  }
}

const getYoudaoErrorMessage = (errorCode: string) => {
  return YOUDAO_ERROR_MESSAGES[errorCode] ?? `有道翻译请求失败，错误码 ${errorCode}`
}

export const translateWithYoudao = async (text: string, settings: TranslationSettings): Promise<TranslationResult> => {
  const query = text.trim()

  if (!query) {
    throw new Error('请先选择要翻译的文本')
  }

  ensureSettingsReady(settings)

  const salt = crypto.randomUUID().replace(/-/g, '')
  const curtime = Math.floor(Date.now() / 1000).toString()
  const sign = await sha256Hex(`${settings.appKey}${buildYoudaoSignInput(query)}${salt}${curtime}${settings.appSecret}`)

  const body = new URLSearchParams({
    q: query,
    from: settings.sourceLanguage,
    to: settings.targetLanguage,
    appKey: settings.appKey,
    salt,
    sign,
    signType: 'v3',
    curtime
  })

  const response = await fetch(YOUDAO_TRANSLATE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body
  })

  if (!response.ok) {
    throw new Error(`有道翻译网络请求失败（${response.status}）`)
  }

  const data = (await response.json()) as YoudaoTranslationResponse
  const errorCode = data.errorCode ?? '303'

  if (errorCode !== '0') {
    throw new Error(getYoudaoErrorMessage(errorCode))
  }

  const translatedText = data.translation?.join('\n').trim()

  if (!translatedText) {
    throw new Error('有道翻译未返回有效结果')
  }

  const languagePair = data.l ?? ''
  const separatorIndex = languagePair.indexOf('2')
  const detectedSourceLanguage = separatorIndex >= 0 ? languagePair.slice(0, separatorIndex) : settings.sourceLanguage
  const targetLanguage = separatorIndex >= 0 ? languagePair.slice(separatorIndex + 1) : settings.targetLanguage

  return {
    query,
    translation: translatedText,
    detectedSourceLanguage,
    targetLanguage,
    provider: 'youdao'
  }
}