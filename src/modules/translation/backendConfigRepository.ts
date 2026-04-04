import browser from 'webextension-polyfill'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import { DEFAULT_BACKEND_BASE_URL, DEFAULT_BACKEND_CONFIG, type BackendConfig } from '../../shared/types/translation'

const LOCKED_BACKEND_BASE_URL = DEFAULT_BACKEND_BASE_URL

const sanitizeBackendConfig = (config: Partial<BackendConfig>): BackendConfig => ({
  baseUrl: LOCKED_BACKEND_BASE_URL,
  authState: config.authState ?? DEFAULT_BACKEND_CONFIG.authState,
  accessToken: config.accessToken?.trim() ?? '',
  refreshToken: config.refreshToken?.trim() ?? ''
})

export const getBackendConfig = async (): Promise<BackendConfig> => {
  const stored = await browser.storage.local.get(STORAGE_KEYS.backendConfig)
  return sanitizeBackendConfig(((stored[STORAGE_KEYS.backendConfig] as Partial<BackendConfig> | undefined) ?? {}))
}

export const saveBackendConfig = async (config: BackendConfig) => {
  const nextConfig = sanitizeBackendConfig(config)

  await browser.storage.local.set({
    [STORAGE_KEYS.backendConfig]: nextConfig
  })

  return nextConfig
}
