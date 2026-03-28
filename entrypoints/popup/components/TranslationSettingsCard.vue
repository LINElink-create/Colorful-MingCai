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
const providerStatusTone = computed(() => {
  if (!primaryProviderStatus.value) {
    return 'status-chip-idle'
  }

  if (primaryProviderStatus.value.status === 'available') {
    return 'status-chip-ready'
  }

  if (primaryProviderStatus.value.status === 'not_configured') {
    return 'status-chip-warn'
  }

  return 'status-chip-error'
})

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

const providerStatusDetail = computed(() => {
  if (!primaryProviderStatus.value) {
    return '先填写后端地址，再保存并检测服务状态。'
  }

  if (primaryProviderStatus.value.status === 'available') {
    return primaryProviderStatus.value.userConfigured
      ? '当前使用个人配置通道，适合定制化翻译配额。'
      : '当前使用平台托管通道，扩展本地不保存供应商密钥。'
  }

  if (primaryProviderStatus.value.status === 'not_configured') {
    return '后端地址可达，但翻译供应商尚未配置或未启用。'
  }

  return '后端可访问，但翻译服务最近返回异常，请检查日志或错误码。'
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
      <div>
        <p>划词翻译</p>
        <h3>连接你的后端翻译服务</h3>
      </div>
      <span :class="['status-chip', providerStatusTone]">{{ providerStatusText }}</span>
    </div>

    <p class="settings-description">
      页面划词后会通过后端服务调用翻译接口。这里配置后端地址和默认翻译方向，不再把供应商密钥保存在扩展本地。
    </p>

    <p class="provider-status-detail">
      {{ providerStatusDetail }}
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

    <label class="toggle-row">
      <div>
        <strong>划词后自动翻译</strong>
        <p>打开后，选中文本时会优先请求后端翻译结果。</p>
      </div>
      <input v-model="formState.autoTranslateEnabled" :disabled="disabled || isSaving" type="checkbox">
    </label>

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
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.settings-header p,
.settings-description,
.field span {
  margin: 0;
}

.settings-header p {
  font-weight: 600;
  color: var(--mc-accent, #6366f1);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 11px;
}

.settings-header h3 {
  margin: 4px 0 0;
  font-size: 16px;
  font-weight: 600;
}

.status-chip {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.status-chip-ready {
  background: var(--mc-success-bg, #f0fdf4);
  color: var(--mc-success-text, #16a34a);
}

.status-chip-idle {
  background: #f1f5f9;
  color: #64748b;
}

.status-chip-warn {
  background: var(--mc-warn-bg, #fffbeb);
  color: var(--mc-warn-text, #d97706);
}

.status-chip-error {
  background: var(--mc-danger-bg, #fef2f2);
  color: var(--mc-danger-text, #dc2626);
}

.settings-description {
  margin-top: 8px;
  color: var(--mc-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

.provider-status-detail {
  margin: 8px 0 0;
  color: var(--mc-muted-strong, #475569);
  font-size: 13px;
  line-height: 1.5;
}

.provider-status-note {
  margin: 8px 0 0;
  color: var(--mc-warn-text, #d97706);
  font-size: 12px;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field {
  display: grid;
  gap: 4px;
  margin-top: 10px;
}

.field span {
  color: var(--mc-muted-strong, #475569);
  font-size: 11px;
  font-weight: 600;
}

.field input,
.field select {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 9px 12px;
  background: #fff;
  color: var(--mc-ink, #1a1a2e);
  font: inherit;
  font-size: 13px;
  box-sizing: border-box;
  transition: border-color 160ms ease;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: var(--mc-accent, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--mc-surface-soft, #f8f9fb);
}

.toggle-row strong,
.toggle-row p {
  margin: 0;
}

.toggle-row strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
}

.toggle-row p {
  margin-top: 2px;
  color: var(--mc-muted, #64748b);
  font-size: 12px;
  line-height: 1.4;
}

.toggle-row input {
  width: 18px;
  height: 18px;
  accent-color: var(--mc-accent, #6366f1);
}

.save-button {
  width: 100%;
  margin-top: 14px;
  border: 0;
  border-radius: 8px;
  padding: 9px 14px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  transition: box-shadow 160ms ease;
}

.save-button:hover {
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>