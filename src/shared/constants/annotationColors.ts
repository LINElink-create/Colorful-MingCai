import type { AnnotationColor } from '../types/annotation'

export const ANNOTATION_COLORS: Array<{
  value: AnnotationColor
  label: string
  swatch: string
}> = [
  { value: 'yellow', label: '金黄', swatch: '#ffe37a' },
  { value: 'green', label: '青柠', swatch: '#c9ef8b' },
  { value: 'blue', label: '雾蓝', swatch: '#9fd3ff' },
  { value: 'pink', label: '珊瑚粉', swatch: '#ffbfd3' }
]

export const DEFAULT_ANNOTATION_COLOR: AnnotationColor = 'yellow'