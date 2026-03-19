import type { ExportBundle, ImportMode } from '../../shared/types/annotation'
import { importAnnotationBundle } from '../annotations/repository/annotationRepository'

export const parseImportBundle = (rawText: string): ExportBundle => {
  return JSON.parse(rawText) as ExportBundle
}

export const importAnnotations = async (rawText: string, mode: ImportMode = 'merge') => {
  const bundle = parseImportBundle(rawText)
  await importAnnotationBundle(bundle, mode)
  return bundle
}