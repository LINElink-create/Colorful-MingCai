<script setup lang="ts">
import browser from 'webextension-polyfill'
import { ref } from 'vue'
import TranslationSettingsCard from '../popup/components/TranslationSettingsCard.vue'
import ExportActions from '../popup/components/ExportActions.vue'
import ImportActions from '../popup/components/ImportActions.vue'
import { useSettingsState } from '../../src/features/settings/useSettingsState'
import { sendMessageToBackground } from '../../src/modules/messaging/sendToBackground'
import { MESSAGE_TYPES } from '../../src/shared/constants/messageTypes'
import { EXPORT_FORMATS } from '../../src/shared/constants/exportFormats'
import type { ExportFormat } from '../../src/shared/constants/exportFormats'

const {
  isLoading,
  isSaving,
  errorMessage,
  translationPreferences,
  backendConfig,
  providerStatuses,
  currentAccount,
  cloudSyncState,
  isSyncing,
  refresh,
  saveTranslationConfig,
  loginAccount,
  logoutAccount,
  syncCloud
} = useSettingsState()

const dataError = ref('')
const isDataBusy = ref(false)
const authEmail = ref('')
const authPassword = ref('')

const exportAnnotations = async (format: ExportFormat) => {
  isDataBusy.value = true
  dataError.value = ''
  try {
    const result = await sendMessageToBackground({
      type: MESSAGE_TYPES.EXPORT_ANNOTATIONS,
      payload: { format }
    })
    if (!result.ok) throw new Error(result.error)
  } catch (e) {
    dataError.value = e instanceof Error ? e.message : `导出 ${format || EXPORT_FORMATS.JSON} 失败`
  } finally {
    isDataBusy.value = false
  }
}

const importAnnotations = async (rawText: string) => {
  isDataBusy.value = true
  dataError.value = ''
  try {
    const result = await sendMessageToBackground({
      type: MESSAGE_TYPES.IMPORT_ANNOTATIONS,
      payload: { rawText, mode: 'merge' }
    })
    if (!result.ok) throw new Error(result.error)
  } catch (e) {
    dataError.value = e instanceof Error ? e.message : '导入失败'
  } finally {
    isDataBusy.value = false
  }
}

const submitLogin = async () => {
  await loginAccount({
    email: authEmail.value,
    password: authPassword.value
  })
}

const openRegisterPage = () => {
  window.location.href = browser.runtime.getURL('/register.html')
}
</script>

<template>
  <main class="settings-shell mc-page-shell">
    <!-- 顶栏 -->
    <header class="settings-header">
      <div>
        <h1>设置</h1>
        <p class="header-subtitle">管理翻译配置、数据以及扩展偏好</p>
      </div>
      <button class="btn-ghost" :disabled="isLoading || isSaving" @click="refresh">
        {{ isLoading ? '同步中…' : '刷新' }}
      </button>
    </header>

    <p v-if="errorMessage" class="error-message mc-error-message">{{ errorMessage }}</p>

    <div class="settings-grid">
      <!-- 1. 翻译设置 -->
      <section class="section-card section-main">
        <h2 class="section-title">翻译设置</h2>
        <TranslationSettingsCard
          :preferences="translationPreferences"
          :backend-config="backendConfig"
          :provider-statuses="providerStatuses"
          :disabled="isLoading"
          :is-saving="isSaving"
          @save="saveTranslationConfig"
        />
      </section>

      <div class="section-sidebar">
        <section class="section-card">
          <h2 class="section-title">账号与云同步</h2>
          <p class="section-desc">登录后即可把高亮、笔记和翻译偏好同步到云端。</p>

          <div v-if="currentAccount" class="account-summary">
            <div class="about-row">
              <span>账号</span><strong>{{ currentAccount.email || '未命名用户' }}</strong>
            </div>
            <div class="about-row">
              <span>显示名</span><strong>{{ currentAccount.displayName || '未设置' }}</strong>
            </div>
            <div class="about-row">
              <span>邮箱状态</span>
              <strong>{{ currentAccount.emailVerified ? '已验证' : '待验证' }}</strong>
            </div>
            <div class="about-row" v-if="cloudSyncState">
              <span>最近同步</span><strong>{{ new Date(cloudSyncState.lastSyncedAt).toLocaleString() }}</strong>
            </div>
            <div class="about-row" v-if="cloudSyncState">
              <span>同步内容</span>
              <strong>{{ cloudSyncState.bucketCount }} 个站点 / {{ cloudSyncState.annotationCount }} 条高亮</strong>
            </div>
            <p class="section-desc">
              自动流程仅会拉取云端数据；上传到云端前会先请求你的确认。
            </p>
            <div class="account-actions">
              <button class="btn-primary" :disabled="isLoading || isSyncing" @click="syncCloud">
                {{ isSyncing ? '处理中…' : '上传到云端' }}
              </button>
              <button class="btn-ghost" :disabled="isLoading || isSaving" @click="logoutAccount">退出登录</button>
            </div>
          </div>

          <div v-else class="auth-form">
            <label class="field-label">
              <span>邮箱</span>
              <input v-model="authEmail" class="field-input" type="email" autocomplete="username" placeholder="you@example.com">
            </label>
            <label class="field-label">
              <span>密码</span>
              <input v-model="authPassword" class="field-input" type="password" autocomplete="current-password" placeholder="至少 8 位密码">
            </label>
            <div class="account-actions">
              <button class="btn-primary" :disabled="isLoading || isSaving" @click="submitLogin">
                {{ isSaving ? '提交中…' : '登录' }}
              </button>
              <button class="btn-ghost" :disabled="isLoading || isSaving" @click="openRegisterPage">前往注册</button>
            </div>
          </div>
        </section>

        <!-- 2. 数据管理 -->
        <section class="section-card">
          <h2 class="section-title">数据管理</h2>
          <p class="section-desc">导入或导出你的所有高亮标注数据。</p>
          <p v-if="dataError" class="data-error">{{ dataError }}</p>
          <div class="data-grid">
            <ExportActions :disabled="isDataBusy" @export="exportAnnotations" />
            <ImportActions :disabled="isDataBusy" @import="importAnnotations" />
          </div>
        </section>

        <!-- 3. 外观设置 -->
        <section class="section-card">
          <h2 class="section-title">外观设置</h2>
          <p class="section-desc">即将推出</p>
          <ul class="upcoming-list">
            <li>高亮颜色自定义</li>
            <li>深色模式</li>
          </ul>
        </section>

        <!-- 4. 关于 -->
        <section class="section-card">
          <h2 class="section-title">关于</h2>
          <div class="about-row">
            <span>版本</span><strong>0.1.2</strong>
          </div>
          <div class="about-row">
            <span>项目</span><strong>明彩 · Colorful Reader</strong>
          </div>
          <p class="section-desc" style="margin-top:10px">
            有问题或建议？欢迎到 GitHub 提交 Issue。
          </p>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.settings-shell {
  min-height: 100vh;
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

/* 顶栏 */
.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  position: relative;
  overflow: hidden;
}

.settings-header::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6);
}

.settings-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--mc-muted, #64748b);
}

.btn-ghost {
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  background: #f1f5f9;
  color: #475569;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease;
}

.btn-ghost:hover { background: #e2e8f0; }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #2563eb, #0f766e);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 主布局 */
.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.section-sidebar {
  display: grid;
  gap: 16px;
  align-content: start;
}

.section-card {
  padding: 20px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.section-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.section-desc {
  margin: 0;
  color: var(--mc-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

.auth-form {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.field-label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--mc-muted, #64748b);
}

.field-input {
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  font-size: 13px;
  color: var(--mc-ink, #1a1a2e);
  background: #fff;
}

.account-summary {
  display: grid;
  gap: 4px;
  margin-top: 12px;
}

.account-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

/* 数据管理 */
.data-error {
  margin: 8px 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--mc-danger-bg, #fef2f2);
  color: var(--mc-danger-text, #dc2626);
  font-size: 12px;
}

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

/* 外观 */
.upcoming-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--mc-muted, #64748b);
  font-size: 13px;
  line-height: 1.8;
}

/* 关于 */
.about-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  font-size: 13px;
}

.about-row span { color: var(--mc-muted, #64748b); }
.about-row strong { color: var(--mc-ink, #1a1a2e); font-weight: 500; }

@media (max-width: 800px) {
  .settings-shell { padding: 16px; }
  .settings-grid { grid-template-columns: 1fr; }
  .settings-header { flex-direction: column; }
}
</style>
