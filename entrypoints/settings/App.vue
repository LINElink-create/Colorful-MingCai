<script setup lang="ts">
import browser from 'webextension-polyfill'
import { computed, ref } from 'vue'
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
  providerStatuses,
  currentAccount,
  cloudSyncState,
  isSyncing,
  isAuthenticated,
  refresh,
  saveTranslationPreferences,
  saveProviderConfig,
  deleteProviderConfig,
  loginAccount,
  logoutAccount,
  deleteAccount,
  sendVerificationEmail,
  syncCloud
} = useSettingsState()

const dataError = ref('')
const isDataBusy = ref(false)
const authEmail = ref('')
const authPassword = ref('')
const isDeleteAccountConfirmOpen = ref(false)
const deleteAccountConfirmEmail = ref('')
const deleteAccountError = ref('')
const shouldDeleteLocalData = ref(false)
const verificationNotice = ref('')

const verificationStatusText = computed(() => {
  if (currentAccount.value?.emailVerified || currentAccount.value?.verificationStatus === 'verified') {
    return '已验证'
  }

  if (currentAccount.value?.verificationStatus === 'pending') {
    return '待验证'
  }

  return '未验证'
})

const verificationHint = computed(() => {
  if (currentAccount.value?.emailVerified || currentAccount.value?.verificationStatus === 'verified') {
    return '该邮箱已经完成验证，可以正常接收账号相关通知。'
  }

  if (currentAccount.value?.verificationStatus === 'pending') {
    return '注册后系统会自动发送验证邮件；如果暂时没收到，可以在这里重新发送。'
  }

  return '当前邮箱还未完成验证，你可以立即重新发送验证邮件。'
})

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

const resendVerificationEmail = async () => {
  verificationNotice.value = ''

  try {
    verificationNotice.value = await sendVerificationEmail(currentAccount.value?.email)
  } catch {
    // 统一使用 settings state 内的错误提示。
  }
}

const openDeleteAccountConfirm = () => {
  deleteAccountError.value = ''
  deleteAccountConfirmEmail.value = ''
  shouldDeleteLocalData.value = false
  isDeleteAccountConfirmOpen.value = true
}

const closeDeleteAccountConfirm = () => {
  deleteAccountError.value = ''
  deleteAccountConfirmEmail.value = ''
  shouldDeleteLocalData.value = false
  isDeleteAccountConfirmOpen.value = false
}

const submitDeleteAccount = async () => {
  const currentEmail = currentAccount.value?.email?.trim() ?? ''
  const normalizedConfirmEmail = deleteAccountConfirmEmail.value.trim().toLowerCase()

  if (!currentEmail) {
    deleteAccountError.value = '当前账号未绑定邮箱，暂不支持注销'
    return
  }

  if (normalizedConfirmEmail !== currentEmail.toLowerCase()) {
    deleteAccountError.value = '请输入当前账号邮箱以确认注销'
    return
  }

  deleteAccountError.value = ''
  try {
    const result = await deleteAccount({
      confirmEmail: deleteAccountConfirmEmail.value.trim(),
      deleteLocalData: shouldDeleteLocalData.value
    })

    if (result.success && !currentAccount.value) {
      closeDeleteAccountConfirm()
    }
  } catch (error) {
    deleteAccountError.value = error instanceof Error ? error.message : '注销账号失败'
  }
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
        <p class="header-subtitle">管理翻译、同步与数据</p>
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
          :provider-statuses="providerStatuses"
          :is-authenticated="isAuthenticated"
          :disabled="isLoading"
          :is-saving="isSaving"
          @save-preferences="saveTranslationPreferences"
          @save-provider-config="saveProviderConfig"
          @delete-provider-config="deleteProviderConfig"
        />
      </section>

      <div class="section-sidebar">
        <section class="section-card">
          <h2 class="section-title">账号与云同步</h2>
          <p class="section-desc">登录后可同步高亮和笔记，不上传 API 配置。</p>

          <div v-if="currentAccount" class="account-summary">
            <div class="about-row">
              <span>账号</span><strong>{{ currentAccount.email || '未命名用户' }}</strong>
            </div>
            <div class="about-row">
              <span>显示名</span><strong>{{ currentAccount.displayName || '未设置' }}</strong>
            </div>
            <div class="about-row">
              <span>邮箱状态</span>
              <strong>{{ verificationStatusText }}</strong>
            </div>
            <div class="about-row" v-if="cloudSyncState">
              <span>最近同步</span><strong>{{ new Date(cloudSyncState.lastSyncedAt).toLocaleString() }}</strong>
            </div>
            <div class="about-row" v-if="cloudSyncState">
              <span>同步内容</span>
              <strong>{{ cloudSyncState.bucketCount }} 个站点 / {{ cloudSyncState.annotationCount }} 条高亮</strong>
            </div>
            <p class="section-desc">
              自动只拉取云端数据；上传前会先确认。
            </p>
            <div
              v-if="currentAccount.email"
              class="verification-panel"
              :data-verified="currentAccount.emailVerified ? 'true' : 'false'"
            >
              <div class="verification-panel__content">
                <strong>邮箱验证</strong>
                <p>{{ verificationHint }}</p>
                <p v-if="verificationNotice" class="verification-panel__notice">{{ verificationNotice }}</p>
              </div>
              <button
                v-if="!currentAccount.emailVerified"
                class="btn-ghost"
                :disabled="isLoading || isSaving"
                @click="resendVerificationEmail"
              >
                {{ isSaving ? '发送中…' : '重新发送验证邮件' }}
              </button>
            </div>
            <div class="account-actions">
              <button class="btn-primary" :disabled="isLoading || isSyncing" @click="syncCloud">
                {{ isSyncing ? '处理中…' : '上传到云端' }}
              </button>
              <button class="btn-ghost" :disabled="isLoading || isSaving" @click="logoutAccount">退出登录</button>
            </div>

            <div class="danger-zone">
              <div class="danger-zone__header">
                <strong>注销账号</strong>
                <span>永久删除账号和云端上传内容，操作不可恢复。</span>
              </div>

              <button
                v-if="!isDeleteAccountConfirmOpen"
                class="btn-danger"
                :disabled="isLoading || isSaving"
                @click="openDeleteAccountConfirm"
              >
                注销账号
              </button>

              <div v-else class="danger-zone__panel">
                <p class="danger-zone__hint">
                  请输入当前邮箱 <strong>{{ currentAccount.email }}</strong> 以确认注销。云端高亮、笔记和账号信息会被永久删除。
                </p>
                <label class="field-label">
                  <span>确认邮箱</span>
                  <input
                    v-model="deleteAccountConfirmEmail"
                    class="field-input"
                    type="email"
                    autocomplete="off"
                    :placeholder="currentAccount.email || '请输入当前账号邮箱'"
                  >
                </label>
                <label class="checkbox-row">
                  <input v-model="shouldDeleteLocalData" type="checkbox">
                  <span>同时删除本地高亮、笔记和云同步状态</span>
                </label>
                <p v-if="deleteAccountError" class="danger-zone__error">{{ deleteAccountError }}</p>
                <div class="danger-zone__actions">
                  <button class="btn-danger" :disabled="isLoading || isSaving" @click="submitDeleteAccount">
                    {{ isSaving ? '处理中…' : '确认注销' }}
                  </button>
                  <button class="btn-ghost" :disabled="isLoading || isSaving" @click="closeDeleteAccountConfirm">
                    取消
                  </button>
                </div>
              </div>
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
          <div class="about-row">
            <span>联系方式</span>
            <strong>
              <a class="about-link" href="mailto:ru49203@163.com">ru49203@163.com</a>
            </strong>
          </div>
          <div class="about-row about-row--stacked">
            <span>GitHub 仓库</span>
            <strong>
              <a
                class="about-link"
                href="https://github.com/LINElink-create/Colorful-MingCai"
                target="_blank"
                rel="noreferrer"
              >
                github.com/LINElink-create/Colorful-MingCai
              </a>
            </strong>
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

.verification-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  border-radius: 12px;
  background: #fff7ed;
  border: 1px solid #fdba74;
}

.verification-panel[data-verified='true'] {
  background: #ecfdf5;
  border-color: #86efac;
}

.verification-panel__content {
  display: grid;
  gap: 4px;
}

.verification-panel__content strong {
  font-size: 13px;
  color: #9a3412;
}

.verification-panel[data-verified='true'] .verification-panel__content strong {
  color: #166534;
}

.verification-panel__content p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #7c2d12;
}

.verification-panel[data-verified='true'] .verification-panel__content p {
  color: #166534;
}

.verification-panel__notice {
  font-weight: 600;
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

.danger-zone {
  display: grid;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(220, 38, 38, 0.12);
}

.danger-zone__header {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--mc-muted, #64748b);
}

.danger-zone__header strong {
  color: #b91c1c;
  font-size: 13px;
}

.danger-zone__panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: #fff5f5;
  border: 1px solid rgba(220, 38, 38, 0.15);
}

.danger-zone__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #7f1d1d;
}

.danger-zone__actions {
  display: flex;
  gap: 10px;
}

.danger-zone__error {
  margin: 0;
  color: #dc2626;
  font-size: 12px;
}

.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--mc-muted, #64748b);
}

.checkbox-row input {
  margin-top: 2px;
}

.btn-danger {
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.about-row--stacked {
  align-items: flex-start;
}

.about-row--stacked strong {
  max-width: 62%;
  text-align: right;
  word-break: break-all;
}

.about-row span { color: var(--mc-muted, #64748b); }
.about-row strong { color: var(--mc-ink, #1a1a2e); font-weight: 500; }

.about-link {
  color: #2563eb;
  text-decoration: none;
}

.about-link:hover {
  text-decoration: underline;
}

@media (max-width: 800px) {
  .settings-shell { padding: 16px; }
  .settings-grid { grid-template-columns: 1fr; }
  .settings-header { flex-direction: column; }
  .verification-panel { flex-direction: column; align-items: flex-start; }
<<<<<<< HEAD
  .about-row--stacked { flex-direction: column; gap: 6px; }
  .about-row--stacked strong { max-width: 100%; text-align: left; }
=======
>>>>>>> 2d5a6fe491b7392532dff23008283cabe5271482
}
</style>
