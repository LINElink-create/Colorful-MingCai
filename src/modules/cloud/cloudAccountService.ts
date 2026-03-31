import browser from 'webextension-polyfill'
import { exportAnnotationBundle, importAnnotationBundle } from '../annotations/repository/annotationRepository'
import {
  getCloudAnnotationBundle,
  getCloudTranslationPreferences,
  getCurrentBackendAccount,
  loginBackendAccount,
  logoutBackendAccount,
  registerBackendAccount,
  replaceCloudAnnotationBundle,
  replaceCloudTranslationPreferences,
  withBackendRefresh
} from '../translation/backendClient'
import { getBackendConfig, saveBackendConfig } from '../translation/backendConfigRepository'
import {
  getTranslationPreferencesSnapshot,
  saveTranslationPreferencesSnapshot
} from '../translation/preferencesRepository'
import { STORAGE_KEYS } from '../../shared/constants/storageKeys'
import type { ExportBundle, PageAnnotationBucket } from '../../shared/types/annotation'
import type { BackendAccount } from '../../shared/types/auth'
import type { CloudSyncState, CloudUploadPreview, TranslationPreferencesSnapshot } from '../../shared/types/sync'
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

const mergePreferenceSnapshots = (
  localSnapshot: TranslationPreferencesSnapshot,
  remoteSnapshot: TranslationPreferencesSnapshot
) => {
  return localSnapshot.updatedAt.localeCompare(remoteSnapshot.updatedAt) >= 0 ? localSnapshot : remoteSnapshot
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
  const [localBundle, localPreferenceSnapshot, remoteBundle, remotePreferenceSnapshot] = await Promise.all([
    exportAnnotationBundle(),
    getTranslationPreferencesSnapshot(),
    getCloudAnnotationBundle(activeConfig),
    getCloudTranslationPreferences(activeConfig)
  ])

  const mergedBundle = mergeBuckets(localBundle, remoteBundle)
  const mergedPreferenceSnapshot = mergePreferenceSnapshots(localPreferenceSnapshot, remotePreferenceSnapshot)

  return {
    localBundle,
    localPreferenceSnapshot,
    remoteBundle,
    remotePreferenceSnapshot,
    mergedBundle,
    mergedPreferenceSnapshot
  }
}

const buildCloudSyncState = (
  bundle: ExportBundle,
  snapshot: TranslationPreferencesSnapshot,
): CloudSyncState => ({
  lastSyncedAt: nowIsoString(),
  bucketCount: bundle.buckets.length,
  annotationCount: countAnnotations(bundle),
  preferenceUpdatedAt: snapshot.updatedAt
})

const buildAuthenticatedConfig = (config: BackendConfig, accessToken: string, refreshToken: string): BackendConfig => ({
  ...config,
  authState: 'authenticated',
  accessToken,
  refreshToken
})

export const registerCloudAccount = async (payload: { email: string; password: string; displayName?: string }) => {
  const currentConfig = await getBackendConfig()
  const session = await registerBackendAccount(currentConfig, payload)
  const nextConfig = buildAuthenticatedConfig(currentConfig, session.accessToken, session.refreshToken)
  await saveBackendConfig(nextConfig)
  return { account: session.user, config: nextConfig }
}

export const loginCloudAccount = async (payload: { email: string; password: string }) => {
  const currentConfig = await getBackendConfig()
  const session = await loginBackendAccount(currentConfig, payload)
  const nextConfig = buildAuthenticatedConfig(currentConfig, session.accessToken, session.refreshToken)
  await saveBackendConfig(nextConfig)
  return { account: session.user, config: nextConfig }
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

export const pullCloudState = async (): Promise<CloudSyncState> => {
  const currentConfig = await getBackendConfig()
  if (currentConfig.authState !== 'authenticated' || !currentConfig.accessToken) {
    throw new Error('请先登录后再拉取云端数据')
  }

  const result = await withBackendRefresh(currentConfig, saveBackendConfig, async (activeConfig) => {
    const materials = await fetchSyncMaterials(activeConfig)

    await importAnnotationBundle(materials.mergedBundle, 'replace')
    await saveTranslationPreferencesSnapshot(materials.mergedPreferenceSnapshot)

    const syncState = buildCloudSyncState(materials.mergedBundle, materials.mergedPreferenceSnapshot)
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
      mergedAnnotationCount: countAnnotations(materials.mergedBundle),
      includesPreferences: true,
      localPreferenceUpdatedAt: materials.localPreferenceSnapshot.updatedAt,
      remotePreferenceUpdatedAt: materials.remotePreferenceSnapshot.updatedAt,
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
    await saveTranslationPreferencesSnapshot(materials.mergedPreferenceSnapshot)

    const [savedBundle, savedPreferenceSnapshot] = await Promise.all([
      replaceCloudAnnotationBundle(activeConfig, materials.mergedBundle),
      replaceCloudTranslationPreferences(activeConfig, materials.mergedPreferenceSnapshot)
    ])

    const syncState = buildCloudSyncState(savedBundle, savedPreferenceSnapshot)
    await persistCloudSyncState(syncState)

    return syncState
  })

  return result.data
}