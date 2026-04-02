<script setup lang="ts">
import { computed } from 'vue'
import AnnotationList from './components/AnnotationList.vue'
import TranslationLanguageCard from './components/TranslationLanguageCard.vue'
import { usePopupState } from '../../src/features/popup/usePopupState'

const {
  isLoading,
  errorMessage,
  pageInfo,
  annotations,
  translationPreferences,
  providerStatuses,
  isClearConfirmOpen,
  isDeleteConfirmOpen,
  isSavingTranslationConfig,
  pendingDeleteAnnotation,
  refresh,
  requestClearCurrentPage,
  cancelClearCurrentPage,
  clearCurrentPage,
  openHistoryOverview,
  openSettingsPage,
  jumpToAnnotation,
  requestRemoveAnnotation,
  cancelRemoveAnnotation,
  confirmRemoveAnnotation,
  saveLanguagePreferences
} = usePopupState()

const pageTitle = computed(() => pageInfo.value.title || '未识别页面')

const noteCount = computed(() => {
  return annotations.value.filter((annotation) => annotation.note?.trim()).length
})

const annotationCountText = computed(() => {
  if (isLoading.value) {
    return '同步中…'
  }

  return `${annotations.value.length} 条高亮 / ${noteCount.value} 条笔记`
})

const providerTone = computed(() => {
  const status = providerStatuses.value.find((provider) => provider.provider === translationPreferences.value.defaultProvider)

  if (!status) {
    return 'status-idle'
  }

  if (status.status === 'available') {
    return 'status-ready'
  }

  if (status.status === 'not_configured') {
    return 'status-warn'
  }

  return 'status-error'
})

const providerText = computed(() => {
  const status = providerStatuses.value.find((provider) => provider.provider === translationPreferences.value.defaultProvider)

  if (!status) {
    return '翻译未检测'
  }

  if (status.status === 'available') {
    return status.userConfigured ? '个人翻译可用' : '后端翻译可用'
  }

  if (status.status === 'not_configured') {
    return '翻译未配置'
  }

  return '翻译不可用'
})
</script>

<template>
  <main class="popup-shell mc-page-shell">
    <header class="toolbar">
      <div class="toolbar-brand">
        <h1>明彩</h1>
        <span class="toolbar-page" :title="pageInfo.url">{{ pageTitle }}</span>
      </div>
      <div class="toolbar-actions">
        <span class="toolbar-count">{{ annotationCountText }}</span>
        <button class="icon-btn" :disabled="isLoading" title="刷新" @click="refresh">⟳</button>
        <button class="icon-btn" :disabled="isLoading" title="历史总览" @click="openHistoryOverview">📋</button>
        <button class="icon-btn" :disabled="isLoading" title="设置" @click="openSettingsPage">⚙</button>
        <button
          class="icon-btn icon-btn-danger"
          :disabled="isLoading || annotations.length === 0"
          title="清空当前页高亮与笔记"
          @click="requestClearCurrentPage"
        >🗑</button>
      </div>
    </header>

    <TranslationLanguageCard
      :preferences="translationPreferences"
      :disabled="isLoading"
      :is-saving="isSavingTranslationConfig"
      @save="saveLanguagePreferences"
    />

    <div class="status-row">
      <span :class="['status-dot', providerTone]"></span>
      <span class="status-text">{{ providerText }}</span>
    </div>

    <p v-if="errorMessage" class="mc-error-message popup-error">{{ errorMessage }}</p>

    <AnnotationList
      :annotations="annotations"
      :is-loading="isLoading"
      @jump="jumpToAnnotation"
      @remove="requestRemoveAnnotation"
    />

    <div v-if="isClearConfirmOpen" class="confirm-overlay" @click="cancelClearCurrentPage">
      <section class="confirm-dialog" @click.stop>
        <p class="confirm-badge">需要确认</p>
        <h2>清空当前页全部高亮与笔记？</h2>
        <p class="confirm-desc">这会移除该页面所有高亮及其附加笔记，并自动刷新页面。</p>
        <div class="confirm-meta">
          <p><span>页面</span><strong>{{ pageInfo.title || pageInfo.url || '未识别' }}</strong></p>
          <p><span>数量</span><strong>{{ annotations.length }}</strong></p>
        </div>
        <div class="confirm-actions">
          <button class="btn-secondary" :disabled="isLoading" @click="cancelClearCurrentPage">取消</button>
          <button class="btn-danger" :disabled="isLoading" @click="clearCurrentPage">
            {{ isLoading ? '清空中…' : '确认清空' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="isDeleteConfirmOpen" class="confirm-overlay" @click="cancelRemoveAnnotation">
      <section class="confirm-dialog" @click.stop>
        <p class="confirm-badge">删除确认</p>
        <h2>删除这条高亮？</h2>
        <p class="confirm-desc">将从本地记录中移除该高亮及其附加笔记。</p>
        <div class="confirm-meta">
          <p><span>内容</span><strong>{{ pendingDeleteAnnotation?.textQuote || '未找到' }}</strong></p>
        </div>
        <div class="confirm-actions">
          <button class="btn-secondary" :disabled="isLoading" @click="cancelRemoveAnnotation">取消</button>
          <button class="btn-danger" :disabled="isLoading" @click="confirmRemoveAnnotation">
            {{ isLoading ? '删除中…' : '确认删除' }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.popup-shell {
  position: relative;
  width: 360px;
  min-height: 480px;
  background: var(--mc-page-bg);
}

.toolbar {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 10px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.toolbar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--mc-brand-gradient);
}

.toolbar-brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.toolbar-brand h1 {
  margin: 0;
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--mc-ink-strong);
}

.toolbar-page {
  min-width: 0;
  overflow: hidden;
  color: var(--mc-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-count {
  min-width: 0;
  flex: 1;
  color: var(--mc-muted);
  font-size: 12px;
}

.icon-btn {
  border: 0;
  border-radius: 8px;
  width: 30px;
  height: 30px;
  background: var(--mc-surface-soft);
  cursor: pointer;
}

.icon-btn:hover {
  background: #e2e8f0;
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn-danger:hover {
  background: #fee2e2;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #cbd5e1;
}

.status-ready {
  background: #22c55e;
}

.status-idle {
  background: #94a3b8;
}

.status-warn {
  background: #f59e0b;
}

.status-error {
  background: #ef4444;
}

.status-text {
  color: var(--mc-muted-strong);
  font-size: 12px;
}

.popup-error {
  margin: 12px 14px 0;
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.3);
}

.confirm-dialog {
  width: 100%;
  max-width: 320px;
  border-radius: 14px;
  background: #fff;
  padding: 18px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.2);
}

.confirm-badge {
  margin: 0;
  color: var(--mc-accent);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.confirm-dialog h2 {
  margin: 8px 0 0;
  font-size: 17px;
}

.confirm-desc {
  margin: 8px 0 0;
  color: var(--mc-muted);
  font-size: 13px;
  line-height: 1.6;
}

.confirm-meta {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  border-radius: 10px;
  background: var(--mc-surface-soft);
}

.confirm-meta p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  font-size: 12px;
}

.confirm-meta span {
  color: var(--mc-muted);
}

.confirm-meta strong {
  min-width: 0;
  text-align: right;
  word-break: break-word;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.btn-secondary,
.btn-danger {
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  background: var(--mc-surface-soft);
  color: var(--mc-muted-strong);
}

.btn-danger {
  background: var(--mc-danger-bg);
  color: var(--mc-danger-text);
}

.btn-secondary:disabled,
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>