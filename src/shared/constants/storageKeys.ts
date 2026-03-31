export const STORAGE_KEYS = {
  pageBuckets: 'page-annotation-buckets',
  schemaVersion: 'schema-version',
  translationPreferences: 'translation-preferences',
  translationPreferencesUpdatedAt: 'translation-preferences-updated-at',
  backendConfig: 'backend-config',
  cloudSyncState: 'cloud-sync-state'
} as const

export const CURRENT_SCHEMA_VERSION = 1