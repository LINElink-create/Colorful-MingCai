<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { TRANSLATION_LANGUAGE_OPTIONS } from '../../../src/shared/constants/translationLanguages'
import type { TranslationPreferences } from '../../../src/shared/types/translation'

const props = defineProps<{
  preferences: TranslationPreferences
  disabled: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [preferences: TranslationPreferences]
}>()

const formState = reactive<Pick<TranslationPreferences, 'sourceLanguage' | 'targetLanguage'>>({
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CHS'
})

// 同步外部 preferences 到表单
watch(
  () => props.preferences,
  (p) => {
    formState.sourceLanguage = p.sourceLanguage
    formState.targetLanguage = p.targetLanguage
  },
  { immediate: true, deep: true }
)

const targetLanguageOptions = computed(() =>
  TRANSLATION_LANGUAGE_OPTIONS.filter((item) => item.value !== 'auto')
)

// 选择变化时自动保存（防抖 300ms）
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => ({ ...formState }),
  () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      emit('save', {
        ...props.preferences,
        sourceLanguage: formState.sourceLanguage,
        targetLanguage: formState.targetLanguage
      })
    }, 300)
  }
)
</script>

<template>
  <div class="lang-bar">
    <select
      v-model="formState.sourceLanguage"
      :disabled="disabled || isSaving"
      class="lang-select"
    >
      <option v-for="opt in TRANSLATION_LANGUAGE_OPTIONS" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <span class="lang-arrow">→</span>
    <select
      v-model="formState.targetLanguage"
      :disabled="disabled || isSaving"
      class="lang-select"
    >
      <option v-for="opt in targetLanguageOptions" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <span v-if="isSaving" class="lang-saving">保存中</span>
  </div>
</template>

<style scoped>
.lang-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.lang-select {
  flex: 1;
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 8px;
  background: #fff;
  color: var(--mc-ink, #1a1a2e);
  font: inherit;
  font-size: 12px;
  box-sizing: border-box;
  transition: border-color 160ms ease;
}

.lang-select:focus {
  outline: none;
  border-color: var(--mc-accent, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.lang-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lang-arrow {
  font-size: 14px;
  color: var(--mc-muted, #64748b);
  flex-shrink: 0;
}

.lang-saving {
  font-size: 10px;
  color: var(--mc-accent, #6366f1);
  font-weight: 600;
  flex-shrink: 0;
  animation: pulse 1s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
