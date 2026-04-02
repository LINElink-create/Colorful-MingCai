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
  if (isLoading.value) return '同步中…'
  return `${annotations.value.length} 条高亮 / ${noteCount.value} 条笔记`
})

const providerTone = computed(() => {
  const s = providerStatuses.value.find((provider) => provider.provider === translationPreferences.value.defaultProvider)
  if (!s) return 'status-idle'
  if (s.status === 'available') return 'status-ready'
  if (s.status === 'not_configured') return 'status-warn'
  return 'status-error'
})

const providerText = computed(() => {
  const s = providerStatuses.value.find((provider) => provider.provider === translationPreferences.value.defaultProvider)
  if (!s) return '翻译未检测'
  if (s.status === 'available') return s.userConfigured ? '个人翻译可用' : '后端翻译可用'
  if (s.status === 'not_configured') return '翻译未配置'
  return '翻译不可用'
})
</script>

<template>
  <main class="popup-shell mc-page-shell">
    <!-- 顶栏 -->
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

    <!-- 语言条 -->
    <TranslationLanguageCard
      :preferences="translationPreferences"
      :disabled="isLoading"
      :is-saving="isSavingTranslationConfig"
      @save="saveLanguagePreferences"
    />

    <!-- 翻译状态 -->
    <div class="status-row">
      <span :class="['status-dot', providerTone]"></span>
      <span class="status-text">{{ providerText }}</span>
    </div>

    <!-- 错误 -->
    <p v-if="errorMessage" class="error-message mc-error-message">{{ errorMessage }}</p>

    <!-- 标注列表 -->
    <AnnotationList
      :annotations="annotations"
      :is-loading="isLoading"
      @jump="jumpToAnnotation"
      @remove="requestRemoveAnnotation"
    />

    <!-- 清空确认弹窗 -->
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

    <!-- 删除确认弹窗 -->
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
  padding: 0;
  background: var(--mc-page-bg, #f8f9fb);
}

/* 顶栏 */
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  background: linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6);
}

.toolbar-brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.toolbar-brand h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.toolbar-page {
  font-size: 12px;
  color: var(--mc-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--mc-accent, #6366f1);
  margin-right: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--mc-accent-soft, #eef2ff);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 15px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms ease;
}

.icon-btn:hover { background: #f1f5f9; }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.icon-btn-danger:hover:not(:disabled) { background: var(--mc-danger-bg, #fef2f2); }

/* 翻译状态行 */
.status-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-ready { background: #22c55e; }
.status-idle  { background: #94a3b8; }
.status-warn  { background: #f59e0b; }
.status-error { background: #ef4444; }

.status-text {
  font-size: 11px;
  color: var(--mc-muted, #64748b);
}

/* 确认弹窗 */
.confirm-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 15, 26, 0.25);
  backdrop-filter: blur(8px);
}

.confirm-dialog {
  width: 100%;
  padding: 18px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12);
}

.confirm-badge {
  display: inline-flex;
  margin: 0 0 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--mc-danger-bg, #fef2f2);
  color: var(--mc-danger-text, #dc2626);
  font-size: 11px;
  font-weight: 600;
}

.confirm-dialog h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.confirm-desc {
  margin: 6px 0 12px;
  color: var(--mc-muted);
  font-size: 12px;
  line-height: 1.5;
}

.confirm-meta {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.confirm-meta p {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8f9fb;
}

.confirm-meta span {
  color: var(--mc-muted);
  font-size: 10px;
  font-weight: 500;
}

.confirm-meta strong {
  color: var(--mc-ink);
  font-size: 12px;
  font-weight: 500;
  word-break: break-word;
}

.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn-secondary,
.btn-danger {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease;
}

.btn-secondary { background: #f1f5f9; color: #475569; }
.btn-secondary:hover { background: #e2e8f0; }
.btn-danger { background: #dc2626; color: #fff; }
.btn-danger:hover { background: #b91c1c; }
.btn-secondary:disabled,
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
