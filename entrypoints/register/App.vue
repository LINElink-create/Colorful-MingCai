<script setup lang="ts">
import browser from 'webextension-polyfill'
import { computed, ref } from 'vue'
import { useSettingsState } from '../../src/features/settings/useSettingsState'

const {
  isLoading,
  isSaving,
  errorMessage,
  backendConfig,
  currentAccount,
  registerAccount
} = useSettingsState({ autoSync: false })

const email = ref('')
const password = ref('')
const displayName = ref('')
const successMessage = ref('')

const submitRegister = async () => {
  successMessage.value = ''

  await registerAccount({
    email: email.value,
    password: password.value,
    displayName: displayName.value || undefined
  })

  if (!errorMessage.value) {
    successMessage.value = '注册成功，正在返回设置页…'
    window.setTimeout(() => {
      window.location.href = browser.runtime.getURL('/settings.html')
    }, 500)
  }
}

const goBackToSettings = () => {
  window.location.href = browser.runtime.getURL('/settings.html')
}

const pageTitle = computed(() => {
  return currentAccount.value ? '账号已登录' : '创建明彩账号'
})
</script>

<template>
  <main class="register-shell mc-page-shell">
    <section class="register-card">
      <button class="back-link" type="button" @click="goBackToSettings">返回设置</button>
      <p class="mc-eyebrow">账号注册</p>
      <h1>{{ pageTitle }}</h1>
      <p class="lead">
        {{ currentAccount
          ? '当前浏览器已经登录，可直接返回设置页继续同步。'
          : '创建账号后，你的高亮、笔记和翻译偏好就能同步到云端。' }}
      </p>

      <p class="backend-meta">当前后端：{{ backendConfig.baseUrl }}</p>
      <p v-if="errorMessage" class="error-message mc-error-message">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

      <div v-if="currentAccount" class="account-panel">
        <div class="account-row">
          <span>邮箱</span>
          <strong>{{ currentAccount.email || '未填写' }}</strong>
        </div>
        <div class="account-row">
          <span>显示名</span>
          <strong>{{ currentAccount.displayName || '未设置' }}</strong>
        </div>
        <button class="primary-btn" type="button" @click="goBackToSettings">返回设置页</button>
      </div>

      <form v-else class="register-form" @submit.prevent="submitRegister">
        <label class="field-block">
          <span>邮箱</span>
          <input v-model="email" type="email" autocomplete="username" placeholder="you@example.com" required>
        </label>
        <label class="field-block">
          <span>密码</span>
          <input v-model="password" type="password" autocomplete="new-password" placeholder="至少 8 位密码" minlength="8" required>
        </label>
        <label class="field-block">
          <span>显示名（可选）</span>
          <input v-model="displayName" type="text" autocomplete="nickname" placeholder="明彩用户">
        </label>
        <div class="register-actions">
          <button class="primary-btn" type="submit" :disabled="isLoading || isSaving">
            {{ isSaving ? '注册中…' : '注册并登录' }}
          </button>
          <button class="secondary-btn" type="button" :disabled="isLoading || isSaving" @click="goBackToSettings">
            取消
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.register-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 20px;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.16), transparent 32%),
    radial-gradient(circle at bottom right, rgba(15, 118, 110, 0.14), transparent 28%),
    #f8fafc;
}

.register-card {
  width: min(100%, 520px);
  padding: 28px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.back-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #2563eb;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.register-card h1,
.lead,
.backend-meta,
.success-message {
  margin: 0;
}

.register-card h1 {
  margin-top: 10px;
  font-size: clamp(28px, 4vw, 36px);
  line-height: 1.1;
  color: #0f172a;
}

.lead {
  margin-top: 10px;
  color: #475569;
  font-size: 14px;
  line-height: 1.7;
}

.backend-meta {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.success-message {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #047857;
  font-size: 13px;
}

.register-form,
.account-panel {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.field-block {
  display: grid;
  gap: 8px;
  color: #475569;
  font-size: 13px;
}

.field-block input {
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
  font-size: 14px;
  color: #0f172a;
  background: #fff;
}

.field-block input:focus {
  outline: 2px solid rgba(37, 99, 235, 0.18);
  border-color: #2563eb;
}

.register-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.primary-btn,
.secondary-btn {
  border: 0;
  border-radius: 12px;
  padding: 12px 16px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn {
  background: linear-gradient(135deg, #2563eb, #0f766e);
  color: #fff;
}

.secondary-btn {
  background: #e2e8f0;
  color: #334155;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.account-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
}

.account-row strong {
  color: #0f172a;
}

@media (max-width: 640px) {
  .register-card {
    padding: 22px;
  }

  .register-actions {
    flex-direction: column;
  }
}
</style>