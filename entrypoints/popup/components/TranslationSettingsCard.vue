<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { TRANSLATION_LANGUAGE_OPTIONS } from '../../../src/shared/constants/translationLanguages'
import type {
  BackendConfig,
  TranslationPreferences,
  TranslationProviderStatus
} from '../../../src/shared/types/translation'

const props = defineProps<{
  preferences: TranslationPreferences
  backendConfig: BackendConfig
  providerStatuses: TranslationProviderStatus[]
  disabled: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [payload: { preferences: TranslationPreferences; backendConfig: BackendConfig }]
}>()

const formState = reactive<TranslationPreferences & Pick<BackendConfig, 'baseUrl'>>({
  baseUrl: '',
  defaultProvider: 'youdao',
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CHS',
  autoTranslateEnabled: false
})

watch(
  () => [props.preferences, props.backendConfig] as const,
  ([preferences, backendConfig]) => {
    formState.baseUrl = backendConfig.baseUrl
    formState.defaultProvider = preferences.defaultProvider
    formState.sourceLanguage = preferences.sourceLanguage
    formState.targetLanguage = preferences.targetLanguage
    formState.autoTranslateEnabled = preferences.autoTranslateEnabled
  },
  { immediate: true, deep: true }
)

const targetLanguageOptions = computed(() => TRANSLATION_LANGUAGE_OPTIONS.filter((item) => item.value !== 'auto'))
const primaryProviderStatus = computed(() => props.providerStatuses[0] ?? null)
const providerStatusText = computed(() => {
  if (!primaryProviderStatus.value) {
    return '未检测'
  }

  if (primaryProviderStatus.value.status === 'available') {
    return primaryProviderStatus.value.userConfigured ? '个人配置可用' : '平台服务可用'
  }

  if (primaryProviderStatus.value.status === 'not_configured') {
    return '后端未配置服务'
  }

  return '服务暂不可用'
})

const submit = () => {
  emit('save', {
    preferences: {
      defaultProvider: formState.defaultProvider,
      sourceLanguage: formState.sourceLanguage,
      targetLanguage: formState.targetLanguage,
      autoTranslateEnabled: formState.autoTranslateEnabled
    },
    backendConfig: {
      ...props.backendConfig,
      baseUrl: formState.baseUrl.trim()
    }
  })
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-header">
      <p>划词翻译</p>
      <span>{{ providerStatusText }}</span>
    </div>

    <p class="settings-description">
      页面划词后会通过后端服务调用翻译接口。这里配置后端地址和默认翻译方向，不再把供应商密钥保存在扩展本地。
    </p>

    <label class="field">
      <span>后端地址</span>
      <input v-model="formState.baseUrl" :disabled="disabled || isSaving" autocomplete="off" spellcheck="false" type="text">
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

    <p v-if="primaryProviderStatus?.lastErrorCode" class="provider-status-note">
      最近错误码：{{ primaryProviderStatus.lastErrorCode }}
    </p>

    <button class="save-button" :disabled="disabled || isSaving" type="button" @click="submit">
      {{ isSaving ? '保存中...' : '保存后端翻译配置' }}
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

.provider-status-note {
  margin: 10px 0 0;
  color: #8a5b24;
  font-size: 12px;
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