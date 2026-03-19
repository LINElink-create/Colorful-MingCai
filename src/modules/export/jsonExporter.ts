import type { ExportBundle } from '../../shared/types/annotation'

export const buildJsonExport = (bundle: ExportBundle) => JSON.stringify(bundle, null, 2)