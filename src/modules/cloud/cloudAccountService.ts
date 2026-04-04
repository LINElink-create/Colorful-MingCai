import browser from 'webextension-polyfill'
import { clearAllAnnotations, exportAnnotationBundle, importAnnotationBundle } from '../annotations/repository/annotationRepository'
import {
  deleteBackendAccount,
  getBackendAccountVerificationStatus,
  getCloudAnnotationBundle,
  getCurrentBackendAccount,
  loginBackendAccount,
  logoutBackendAccount,
  registerBackendAccount,
  replaceCloudAnnotationBundle,
  sendBackendVerificationEmail,
  withBackendRefresh
} from '../translation/backendClient'
import { getBackendConfig, saveBackendConfig } from '../translation/backendConfigRepository'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import type { ExportBundle, PageAnnotationBucket } from '../../shared/types/annotation'
import type { BackendAccount } from '../../shared/types/auth'
import type { DeleteAccountResult, VerificationStatusResult } from '../../shared/types/message'
import type { CloudSyncState, CloudUploadPreview } from '../../shared/types/sync'
import { DEFAULT_BACKEND_CONFIG, type BackendConfig } from '../../shared/types/translation'
import { getPageKey } from '../../shared/utils/pageKey'
import { nowIsoString } from '../../shared/utils/time'

const getBucketMergeKey = (bucket: PageAnnotationBucket) => {
  try {
    return getPageKey(bucket.url)
  } catch {
    return bucket.url
  }
}

const mergeBuckets = (localBundle: ExportBundle, remoteBundle: ExportBundle): ExportBundle => {
  const bucketMap = new Map<string, PageAnnotationBucket>()

  for (const bucket of [...remoteBundle.buckets, ...localBundle.buckets]) {
    const mergeKey = getBucketMergeKey(bucket)
    const current = bucketMap.get(mergeKey)

    if (!current || current.updatedAt.localeCompare(bucket.updatedAt) < 0) {
      bucketMap.set(mergeKey, bucket)
    }
  }

  return {
    schemaVersion: Math.max(localBundle.schemaVersion, remoteBundle.schemaVersion, 1),
    exportedAt: nowIsoString(),
    buckets: Array.from(bucketMap.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }
}

const countAnnotations = (bundle: ExportBundle) => {
  return bundle.buckets.reduce((total, bucket) => total + bucket.annotations.length, 0)
}

const persistCloudSyncState = async (syncState: CloudSyncState) => {
  await browser.storage.local.set({
    [STORAGE_KEYS.cloudSyncState]: syncState
  })
}

const fetchSyncMaterials = async (activeConfig: BackendConfig) => {
  const [localBundle, remoteBundle] = await Promise.all([
    exportAnnotationBundle(),
    getCloudAnnotationBundle(activeConfig)
  ])

  const mergedBundle = mergeBuckets(localBundle, remoteBundle)

  return {
    localBundle,
    remoteBundle,
    mergedBundle
  }
}

const buildCloudSyncState = (bundle: ExportBundle): CloudSyncState => ({
  lastSyncedAt: nowIsoString(),
  bucketCount: bundle.buckets.length,
  annotationCount: countAnnotations(bundle)
})

const buildAuthenticatedConfig = (config: BackendConfig, accessToken: string, refreshToken: string): BackendConfig => ({
  ...config,
  authState: 'authenticated',
  accessToken,
  refreshToken
})

export const registerCloudAccount = async (payload: { email: string; password: string; displayName: string }) => {
  const currentConfig = await getBackendConfig()
  const session = await registerBackendAccount(currentConfig, payload)
  const nextConfig = buildAuthenticatedConfig(currentConfig, session.accessToken, session.refreshToken)
  await saveBackendConfig(nextConfig)
  return { account: session.user, config: nextConfig, message: session.message }
}

export const loginCloudAccount = async (payload: { email: string; password: string }) => {
  const currentConfig = await getBackendConfig()
  const session = await loginBackendAccount(currentConfig, payload)
  const nextConfig = buildAuthenticatedConfig(currentConfig, session.accessToken, session.refreshToken)
  await saveBackendConfig(nextConfig)
  return { account: session.user, config: nextConfig }
}

const clearDeletedAccountLocalState = async (deleteLocalData: boolean) => {
  await browser.storage.local.remove(STORAGE_KEYS.cloudSyncState)

  if (deleteLocalData) {
    await clearAllAnnotations()
  }
}

export const loadCloudAccount = async (): Promise<BackendAccount | null> => {
  const currentConfig = await getBackendConfig()
  if (currentConfig.authState !== 'authenticated' || !currentConfig.accessToken) {
    return null
  }

  try {
    const result = await withBackendRefresh(currentConfig, saveBackendConfig, getCurrentBackendAccount)
    return result.data
  } catch {
    await saveBackendConfig({ ...currentConfig, authState: 'anonymous', accessToken: '', refreshToken: '' })
    return null
  }
}

export const logoutCloudAccount = async () => {
  const currentConfig = await getBackendConfig()

  if (currentConfig.authState === 'authenticated' && currentConfig.accessToken) {
    try {
      await withBackendRefresh(currentConfig, saveBackendConfig, logoutBackendAccount)
    } catch {
      // 登出时以清理本地状态为优先。
    }
  }

  const nextConfig: BackendConfig = {
    ...currentConfig,
    ...DEFAULT_BACKEND_CONFIG,
    baseUrl: currentConfig.baseUrl || DEFAULT_BACKEND_CONFIG.baseUrl
  }
  await saveBackendConfig(nextConfig)
}

export const deleteCloudAccount = async (payload: { confirmEmail: string; deleteLocalData: boolean }) => {
  const currentConfig = await getBackendConfig()

  if (currentConfig.authState !== 'authenticated' || !currentConfig.accessToken) {
    throw new Error('请先登录后再注销账号')
  }

  const result = await withBackendRefresh(currentConfig, saveBackendConfig, async (activeConfig) => {
    return deleteBackendAccount(activeConfig, { confirmEmail: payload.confirmEmail })
  })

  await clearDeletedAccountLocalState(payload.deleteLocalData)

  const nextConfig: BackendConfig = {
    ...currentConfig,
    ...DEFAULT_BACKEND_CONFIG,
    baseUrl: currentConfig.baseUrl || DEFAULT_BACKEND_CONFIG.baseUrl
  }
  await saveBackendConfig(nextConfig)

  return result.data satisfies DeleteAccountResult
}

export const getCloudVerificationStatus = async (): Promise<VerificationStatusResult> => {
  const currentConfig = await getBackendConfig()

  if (currentConfig.authState !== 'authenticated' || !currentConfig.accessToken) {
    throw new Error('请先登录后再查看邮箱验证状态')
  }

  const result = await withBackendRefresh(currentConfig, saveBackendConfig, async (activeConfig) => {
    return getBackendAccountVerificationStatus(activeConfig)
  })

  return result.data
}

export const sendCloudVerificationEmail = async (email: string): Promise<string> => {
  const currentConfig = await getBackendConfig()

  if (currentConfig.authState !== 'authenticated' || !currentConfig.accessToken) {
    throw new Error('请先登录后再发送验证邮件')
  }

  const result = await withBackendRefresh(currentConfig, saveBackendConfig, async (activeConfig) => {
    return sendBackendVerificationEmail(activeConfig, { email })
  })

  return result.data.message
}

export const pullCloudState = async (): Promise<CloudSyncState> => {
  const currentConfig = await getBackendConfig()
  if (currentConfig.authState !== 'authenticated' || !currentConfig.accessToken) {
    throw new Error('请先登录后再拉取云端数据')
  }

  const result = await withBackendRefresh(currentConfig, saveBackendConfig, async (activeConfig) => {
    const materials = await fetchSyncMaterials(activeConfig)

    await importAnnotationBundle(materials.mergedBundle, 'replace')

    const syncState = buildCloudSyncState(materials.mergedBundle)
    await persistCloudSyncState(syncState)
    return syncState
  })

  return result.data
}

export const previewCloudUpload = async (): Promise<CloudUploadPreview> => {
  const currentConfig = await getBackendConfig()
  if (currentConfig.authState !== 'authenticated' || !currentConfig.accessToken) {
    throw new Error('请先登录后再上传到云端')
  }

  const result = await withBackendRefresh(currentConfig, saveBackendConfig, async (activeConfig) => {
    const materials = await fetchSyncMaterials(activeConfig)
    return {
      requiresConfirmation: true as const,
      localBucketCount: materials.localBundle.buckets.length,
      localAnnotationCount: countAnnotations(materials.localBundle),
      remoteBucketCount: materials.remoteBundle.buckets.length,
      remoteAnnotationCount: countAnnotations(materials.remoteBundle),
      mergedBucketCount: materials.mergedBundle.buckets.length,
      mergedAnnotationCount: countAnnotations(materials.mergedBundle)
    }
  })

  return result.data
}

export const confirmCloudUpload = async (): Promise<CloudSyncState> => {
  return syncCloudState()
}

export const syncCloudState = async (): Promise<CloudSyncState> => {
  const currentConfig = await getBackendConfig()
  if (currentConfig.authState !== 'authenticated' || !currentConfig.accessToken) {
    throw new Error('请先登录后再使用云同步')
  }

  const result = await withBackendRefresh(currentConfig, saveBackendConfig, async (activeConfig) => {
    const materials = await fetchSyncMaterials(activeConfig)

    await importAnnotationBundle(materials.mergedBundle, 'replace')

    const savedBundle = await replaceCloudAnnotationBundle(activeConfig, materials.mergedBundle)

    const syncState = buildCloudSyncState(savedBundle)
    await persistCloudSyncState(syncState)

    return syncState
  })

  return result.data
}