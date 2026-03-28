<script setup lang="ts">
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
  refresh,
  saveTranslationConfig
} = useSettingsState()

const dataError = ref('')
const isDataBusy = ref(false)

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
