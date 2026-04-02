<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { TRANSLATION_LANGUAGE_OPTIONS } from '../../../src/shared/constants/translationLanguages'
import type {
  OpenAICompatibleProviderConfigInput,
  TranslationPreferences,
  TranslationProvider,
  TranslationProviderConfigInput,
  TranslationProviderStatus,
  YoudaoProviderConfigInput,
} from '../../../src/shared/types/translation'

const props = defineProps<{
  preferences: TranslationPreferences
  providerStatuses: TranslationProviderStatus[]
  isAuthenticated: boolean
  disabled: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  savePreferences: [payload: TranslationPreferences]
  saveProviderConfig: [payload: TranslationProviderConfigInput]
  deleteProviderConfig: [provider: TranslationProvider]
}>()

const providerOptions: Array<{ value: TranslationProvider; label: string }> = [
  { value: 'youdao', label: '有道翻译' },
  { value: 'openai_compatible', label: 'OpenAI 兼容接口' },
]

const providerLabelMap: Record<TranslationProvider, string> = {
  youdao: '有道翻译',
  openai_compatible: 'OpenAI 兼容接口',
}

const formState = reactive({
  defaultProvider: 'youdao' as TranslationProvider,
  sourceLanguage: 'auto' as TranslationPreferences['sourceLanguage'],
  targetLanguage: 'zh-CHS' as TranslationPreferences['targetLanguage'],
  autoTranslateEnabled: false,
  youdaoAppKey: '',
  youdaoAppSecret: '',
  openaiBaseUrl: '',
  openaiApiKey: '',
  openaiModel: '',
})

watch(
  () => props.preferences,
  (preferences) => {
    formState.defaultProvider = preferences.defaultProvider
    formState.sourceLanguage = preferences.sourceLanguage
    formState.targetLanguage = preferences.targetLanguage
    formState.autoTranslateEnabled = preferences.autoTranslateEnabled
  },
  { immediate: true, deep: true }
)

watch(
  () => props.providerStatuses,
  (providerStatuses) => {
    const openaiStatus = providerStatuses.find((provider) => provider.provider === 'openai_compatible')

    if (openaiStatus?.configSummary?.endpointUrl) {
      formState.openaiBaseUrl = openaiStatus.configSummary.endpointUrl
    }

    if (openaiStatus?.configSummary?.model) {
      formState.openaiModel = openaiStatus.configSummary.model
    }
  },
  { immediate: true, deep: true }
)

const targetLanguageOptions = computed(() => TRANSLATION_LANGUAGE_OPTIONS.filter((item) => item.value !== 'auto'))

const currentProviderStatus = computed(() => {
  return props.providerStatuses.find((provider) => provider.provider === formState.defaultProvider) ?? null
})

const currentProviderTone = computed(() => {
  const currentProvider = currentProviderStatus.value
  if (!currentProvider) {
    return 'status-chip-idle'
  }

  if (currentProvider.status === 'available') {
    return 'status-chip-ready'
  }

  if (currentProvider.status === 'not_configured') {
    return 'status-chip-warn'
  }

  return 'status-chip-error'
})

const currentProviderText = computed(() => {
  const currentProvider = currentProviderStatus.value
  if (!currentProvider) {
    return '未检测'
  }

  if (currentProvider.status === 'available') {
    return currentProvider.userConfigured ? '个人配置可用' : '平台服务可用'
  }

  if (currentProvider.status === 'not_configured') {
    return '服务未配置'
  }

  return '服务暂不可用'
})

const currentProviderDetail = computed(() => {
  const currentProvider = currentProviderStatus.value
  if (!currentProvider) {
    return '服务地址已固定。'
  }

  if (currentProvider.userConfigured && currentProvider.configSummary?.credentialHint) {
    return `已保存个人配置：${currentProvider.configSummary.credentialHint}`
  }

  if (currentProvider.provider === 'openai_compatible' && currentProvider.configSummary?.model) {
    return `当前模型：${currentProvider.configSummary.model}`
  }

  if (currentProvider.status === 'available') {
    return currentProvider.userConfigured ? '当前使用个人配置。' : '当前使用平台通道。'
  }

  if (currentProvider.status === 'not_configured') {
    return '请先填写 API 配置。'
  }

  return '调用失败，请检查 API 配置。'
})

const savePreferences = () => {
  emit('savePreferences', {
    defaultProvider: formState.defaultProvider,
    sourceLanguage: formState.sourceLanguage,
    targetLanguage: formState.targetLanguage,
    autoTranslateEnabled: formState.autoTranslateEnabled,
  })
}

const saveProviderConfig = () => {
  if (formState.defaultProvider === 'youdao') {
    const payload: YoudaoProviderConfigInput = {
      provider: 'youdao',
      appKey: formState.youdaoAppKey.trim(),
      appSecret: formState.youdaoAppSecret.trim(),
    }
    emit('saveProviderConfig', payload)
    return
  }

  const payload: OpenAICompatibleProviderConfigInput = {
    provider: 'openai_compatible',
    baseUrl: formState.openaiBaseUrl.trim(),
    apiKey: formState.openaiApiKey.trim(),
    model: formState.openaiModel.trim(),
  }
  emit('saveProviderConfig', payload)
}

const clearProviderConfig = () => {
  emit('deleteProviderConfig', formState.defaultProvider)
  if (formState.defaultProvider === 'youdao') {
    formState.youdaoAppKey = ''
    formState.youdaoAppSecret = ''
    return
  }

  formState.openaiApiKey = ''
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-header">
      <div>
        <p>划词翻译</p>
        <h3>设置翻译服务与方向</h3>
      </div>
      <span :class="['status-chip', currentProviderTone]">{{ currentProviderText }}</span>
    </div>

    <p class="settings-description">
      使用明彩后端，无需填写服务地址。可选择默认服务商，并保存个人 API 配置。
    </p>

    <p class="provider-status-detail">
      {{ currentProviderDetail }}
    </p>

    <div class="provider-overview-grid">
      <article
        v-for="providerStatus in providerStatuses"
        :key="providerStatus.provider"
        :class="['provider-overview-card', { 'provider-overview-active': providerStatus.provider === formState.defaultProvider }]"
      >
        <div>
          <strong>{{ providerLabelMap[providerStatus.provider] }}</strong>
          <p>{{ providerStatus.userConfigured ? '个人配置' : '平台通道' }}</p>
        </div>
        <span>{{ providerStatus.status === 'available' ? '可用' : providerStatus.status === 'not_configured' ? '未配置' : '异常' }}</span>
      </article>
    </div>

    <div class="field-grid">
      <label class="field">
        <span>默认服务商</span>
        <select v-model="formState.defaultProvider" :disabled="disabled || isSaving">
          <option v-for="option in providerOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

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
        <p>开启后，选中文本会自动调用默认服务商。</p>
      </div>
      <input v-model="formState.autoTranslateEnabled" :disabled="disabled || isSaving" type="checkbox">
    </label>

    <div class="button-row">
      <button class="save-button" :disabled="disabled || isSaving" type="button" @click="savePreferences">
        {{ isSaving ? '保存中...' : '保存翻译偏好' }}
      </button>
    </div>

    <section class="provider-config-panel">
      <div class="provider-config-header">
        <div>
          <strong>{{ providerLabelMap[formState.defaultProvider] }} API 配置</strong>
          <p>密钥会加密保存，已保存的密钥不会在页面回显。</p>
        </div>
      </div>

      <p v-if="!isAuthenticated" class="provider-status-note">
        登录后可保存个人 API 配置。
      </p>

      <template v-if="formState.defaultProvider === 'youdao'">
        <div class="field-grid field-grid-two">
          <label class="field">
            <span>App Key</span>
            <input v-model="formState.youdaoAppKey" :disabled="disabled || isSaving || !isAuthenticated" autocomplete="off" spellcheck="false" type="password" placeholder="输入有道应用 ID">
          </label>
          <label class="field">
            <span>App Secret</span>
            <input v-model="formState.youdaoAppSecret" :disabled="disabled || isSaving || !isAuthenticated" autocomplete="off" spellcheck="false" type="password" placeholder="输入有道应用密钥">
          </label>
        </div>
      </template>

      <template v-else>
        <div class="field-grid">
          <label class="field field-span-full">
            <span>Base URL</span>
            <input v-model="formState.openaiBaseUrl" :disabled="disabled || isSaving || !isAuthenticated" autocomplete="off" spellcheck="false" type="text" placeholder="例如 https://api.openai.com/v1">
          </label>
          <label class="field field-span-full">
            <span>API Key</span>
            <input v-model="formState.openaiApiKey" :disabled="disabled || isSaving || !isAuthenticated" autocomplete="off" spellcheck="false" type="password" placeholder="输入兼容接口的 API Key">
          </label>
          <label class="field field-span-full">
            <span>Model</span>
            <input v-model="formState.openaiModel" :disabled="disabled || isSaving || !isAuthenticated" autocomplete="off" spellcheck="false" type="text" placeholder="例如 gpt-4o-mini">
          </label>
        </div>
      </template>

      <p v-if="currentProviderStatus?.lastErrorCode" class="provider-status-note">
        最近错误码：{{ currentProviderStatus.lastErrorCode }}
      </p>

      <div class="button-row">
        <button class="save-button" :disabled="disabled || isSaving || !isAuthenticated" type="button" @click="saveProviderConfig">
          {{ isSaving ? '保存中...' : '保存当前服务商配置' }}
        </button>
        <button class="secondary-button" :disabled="disabled || isSaving || !isAuthenticated || !currentProviderStatus?.userConfigured" type="button" @click="clearProviderConfig">
          删除当前服务商配置
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.settings-card {
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.provider-overview-grid,
.field-grid,
.button-row {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.provider-overview-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.provider-overview-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: #f8fafc;
}

.provider-overview-card strong,
.toggle-row strong,
.provider-config-header strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
}

.provider-overview-card p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.provider-overview-card span {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.provider-overview-active {
  border-color: rgba(99, 102, 241, 0.36);
  background: #eef2ff;
}

.field-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field-grid-two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  color: var(--mc-muted-strong, #475569);
  font-size: 12px;
}

.field input,
.field select {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: var(--mc-accent, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.field-span-full {
  grid-column: 1 / -1;
}

.toggle-row {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f8fafc;
}

.toggle-row p,
.provider-config-header p {
  margin: 4px 0 0;
  color: var(--mc-muted, #64748b);
  font-size: 12px;
  line-height: 1.5;
}

.provider-config-panel {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.provider-status-note {
  margin: 10px 0 0;
  color: var(--mc-warn-text, #d97706);
  font-size: 12px;
}

.button-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.save-button,
.secondary-button {
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.save-button {
  background: linear-gradient(135deg, #2563eb, #0f766e);
  color: #fff;
}

.secondary-button {
  background: #e2e8f0;
  color: #334155;
}

.save-button:disabled,
.secondary-button:disabled,
.field input:disabled,
.field select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .provider-overview-grid,
  .field-grid,
  .field-grid-two,
  .button-row {
    grid-template-columns: 1fr;
  }

  .settings-header,
  .toggle-row {
    flex-direction: column;
    align-items: flex-start;
  }
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