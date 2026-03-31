import type { TranslationPreferences } from './translation'

export type TranslationPreferencesSnapshot = {
  preferences: TranslationPreferences
  updatedAt: string
}

export type CloudUploadPreview = {
  requiresConfirmation: true
  localBucketCount: number
  localAnnotationCount: number
  remoteBucketCount: number
  remoteAnnotationCount: number
  mergedBucketCount: number
  mergedAnnotationCount: number
  includesPreferences: boolean
  localPreferenceUpdatedAt: string
  remotePreferenceUpdatedAt: string
}

export type CloudSyncState = {
  lastSyncedAt: string
  bucketCount: number
  annotationCount: number
  preferenceUpdatedAt: string
}