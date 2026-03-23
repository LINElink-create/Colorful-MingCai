<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { TRANSLATION_LANGUAGE_OPTIONS } from '../../../src/shared/constants/translationLanguages'
import type { TranslationSettings } from '../../../src/shared/types/translation'

const props = defineProps<{
  settings: TranslationSettings
  disabled: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [settings: TranslationSettings]
}>()

const formState = reactive<TranslationSettings>({
  appKey: '',
  appSecret: '',
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CHS'
})

watch(
  () => props.settings,
  (settings) => {
    formState.appKey = settings.appKey
    formState.appSecret = settings.appSecret
    formState.sourceLanguage = settings.sourceLanguage
    formState.targetLanguage = settings.targetLanguage
  },
  { immediate: true, deep: true }
)

const targetLanguageOptions = computed(() => TRANSLATION_LANGUAGE_OPTIONS.filter((item) => item.value !== 'auto'))

const submit = () => {
  emit('save', {
    appKey: formState.appKey.trim(),
    appSecret: formState.appSecret.trim(),
    sourceLanguage: formState.sourceLanguage,
    targetLanguage: formState.targetLanguage
  })
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-header">
      <p>划词翻译</p>
      <span>有道 API</span>
    </div>

    <p class="settings-description">
      页面划词后可直接点击“翻译”。先在这里填写有道翻译应用 ID 与应用密钥。
    </p>

    <label class="field">
      <span>应用 ID</span>
      <input v-model="formState.appKey" :disabled="disabled || isSaving" autocomplete="off" spellcheck="false" type="text">
    </label>

    <label class="field">
      <span>应用密钥</span>
      <input v-model="formState.appSecret" :disabled="disabled || isSaving" autocomplete="off" spellcheck="false" type="password">
    </label>

    <div class="field-grid">
      <label class="field">
        <span>源语言</span>
        <select v-model="formState.sourceLanguage" :disabled="disabled || isSaving">
          <option v-for="option in TRANSLATION_LANGUAGE_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>目标语言</span>
        <select v-model="formState.targetLanguage" :disabled="disabled || isSaving">
          <option v-for="option in targetLanguageOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <button class="save-button" :disabled="disabled || isSaving" type="button" @click="submit">
      {{ isSaving ? '保存中...' : '保存翻译配置' }}
    </button>
  </section>
</template>

<style scoped>
.settings-card {
  margin: 12px 0;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.settings-header p,
.settings-header span,
.settings-description,
.field span {
  margin: 0;
}

.settings-header p {
  font-weight: 700;
}

.settings-header span {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f3e1b0;
  color: #6f4d1d;
  font-size: 12px;
}

.settings-description {
  margin-top: 10px;
  color: #7d6a58;
  font-size: 13px;
  line-height: 1.5;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.field span {
  color: #6a5643;
  font-size: 12px;
  font-weight: 600;
}

.field input,
.field select {
  width: 100%;
  border: 1px solid #e4d5b3;
  border-radius: 12px;
  padding: 10px 12px;
  background: #fffdf8;
  color: #2b2118;
  font: inherit;
  box-sizing: border-box;
}

.save-button {
  width: 100%;
  margin-top: 12px;
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #d7b466 0%, #bb8d32 100%);
  color: #3b2a16;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}
</style>