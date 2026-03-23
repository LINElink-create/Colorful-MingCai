<script setup lang="ts">
import AnnotationList from './components/AnnotationList.vue'
import ExportActions from './components/ExportActions.vue'
import ImportActions from './components/ImportActions.vue'
import PageSummaryCard from './components/PageSummaryCard.vue'
import TranslationSettingsCard from './components/TranslationSettingsCard.vue'
import { usePopupState } from '../../src/features/popup/usePopupState'

// Popup 页面只做两件事：
// 1. 从 usePopupState 取状态和动作
// 2. 把这些状态分发给更小的展示组件
const {
  isLoading,
  errorMessage,
  pageInfo,
  annotations,
  translationSettings,
  isClearConfirmOpen,
  isDeleteConfirmOpen,
  isSavingTranslationSettings,
  pendingDeleteAnnotation,
  refresh,
  requestClearCurrentPage,
  cancelClearCurrentPage,
  clearCurrentPage,
  openHistoryOverview,
  requestRemoveAnnotation,
  cancelRemoveAnnotation,
  confirmRemoveAnnotation,
  exportAnnotations,
  importAnnotations,
  saveTranslationSettings
} = usePopupState()
</script>

<!--
  说明：
  - 该组件是整个扩展弹窗的总装层
  - 页面中的“刷新、导出、导入、历史总览、单条删除、清空”都不会直接碰浏览器 API，而是交给 composable 处理
-->

<template>
  <main class="popup-shell">
    <header class="popup-header">
      <div>
        <p class="eyebrow">MVP</p>
        <h1>明彩</h1>
      </div>
      <button class="ghost-button" :disabled="isLoading" @click="refresh">
        刷新
      </button>
    </header>

    <p v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>

    <PageSummaryCard
      :page-title="pageInfo.title"
      :page-url="pageInfo.url"
      :annotation-count="annotations.length"
      :is-loading="isLoading"
    />

    <TranslationSettingsCard
      :settings="translationSettings"
      :disabled="isLoading"
      :is-saving="isSavingTranslationSettings"
      @save="saveTranslationSettings"
    />

    <section class="card-grid">
      <ExportActions :disabled="isLoading" @export="exportAnnotations" />
      <ImportActions :disabled="isLoading" @import="importAnnotations" />
    </section>

    <button class="history-button" :disabled="isLoading" @click="openHistoryOverview">
      打开历史总览
    </button>

    <AnnotationList :annotations="annotations" :is-loading="isLoading" @remove="requestRemoveAnnotation" />

    <button class="danger-button" :disabled="isLoading || annotations.length === 0" @click="requestClearCurrentPage">
      清空当前页高亮
    </button>

    <div v-if="isClearConfirmOpen" class="confirm-overlay" @click="cancelClearCurrentPage">
      <section class="confirm-dialog" @click.stop>
        <p class="confirm-badge">需要确认的操作</p>
        <h2>确认清空当前页高亮？</h2>
        <p class="confirm-description">
          这会移除当前页面已保存的全部高亮，并自动刷新页面以应用最新状态。
        </p>

        <div class="confirm-meta">
          <p>
            <span>页面</span>
            <strong>{{ pageInfo.title || pageInfo.url || '未识别页面' }}</strong>
          </p>
          <p>
            <span>高亮数量</span>
            <strong>{{ annotations.length }}</strong>
          </p>
        </div>

        <div class="confirm-actions">
          <button class="secondary-button" :disabled="isLoading" @click="cancelClearCurrentPage">
            取消
          </button>
          <button class="confirm-button" :disabled="isLoading" @click="clearCurrentPage">
            {{ isLoading ? '清空中...' : '确认清空' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="isDeleteConfirmOpen" class="confirm-overlay" @click="cancelRemoveAnnotation">
      <section class="confirm-dialog confirm-dialog-delete" @click.stop>
        <p class="confirm-badge confirm-badge-delete">删除单条高亮</p>
        <h2>确认删除这条摘录？</h2>
        <p class="confirm-description">
          这会删除当前页面中的对应高亮，同时从本地保存记录中移除这一项。
        </p>

        <div class="confirm-meta">
          <p>
            <span>摘录内容</span>
            <strong>{{ pendingDeleteAnnotation?.textQuote || '未找到待删除内容' }}</strong>
          </p>
        </div>

        <div class="confirm-actions">
          <button class="secondary-button" :disabled="isLoading" @click="cancelRemoveAnnotation">
            取消
          </button>
          <button class="confirm-button confirm-button-delete" :disabled="isLoading" @click="confirmRemoveAnnotation">
            {{ isLoading ? '删除中...' : '确认删除' }}
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
  min-height: 520px;
  padding: 16px;
  background: linear-gradient(180deg, #fffdf7 0%, #fff6dd 100%);
  color: #2b2118;
  font-family: "Segoe UI", "PingFang SC", sans-serif;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.popup-header h1 {
  margin: 0;
  font-size: 24px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #9c6b2f;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin: 12px 0;
}

.ghost-button,
.history-button,
.danger-button,
.secondary-button,
.confirm-button {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  font: inherit;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.ghost-button {
  background: #f0e4c6;
}

.danger-button {
  width: 100%;
  background: #2b2118;
  color: #fff8e8;
}

.history-button {
  width: 100%;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #efe0b7 0%, #e1c987 100%);
  color: #4d3825;
  box-shadow: 0 10px 20px rgba(171, 133, 55, 0.16);
}

.secondary-button {
  background: #f5ecd8;
  color: #574537;
}

.confirm-button {
  background: linear-gradient(135deg, #b23a1d 0%, #7d1c10 100%);
  color: #fff7f0;
  box-shadow: 0 10px 24px rgba(125, 28, 16, 0.24);
}

.confirm-button-delete {
  background: linear-gradient(135deg, #a12d22 0%, #6f1813 100%);
}

.ghost-button:hover,
.history-button:hover,
.danger-button:hover,
.secondary-button:hover,
.confirm-button:hover {
  transform: translateY(-1px);
}

.confirm-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(43, 33, 24, 0.3);
  backdrop-filter: blur(6px);
}

.confirm-dialog {
  width: 100%;
  padding: 18px;
  border: 1px solid rgba(125, 28, 16, 0.14);
  border-radius: 20px;
  background: linear-gradient(180deg, #fff8ef 0%, #fff2e4 100%);
  box-shadow: 0 22px 44px rgba(79, 44, 18, 0.18);
}

.confirm-badge {
  display: inline-flex;
  margin: 0 0 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fce1d7;
  color: #9a321b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.confirm-badge-delete {
  background: #f6ddd8;
  color: #8d2d1f;
}

.confirm-dialog h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.confirm-dialog-delete {
  border-color: rgba(120, 32, 23, 0.16);
}

.confirm-description {
  margin: 10px 0 14px;
  color: #6d5646;
  font-size: 13px;
  line-height: 1.5;
}

.confirm-meta {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.confirm-meta p {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
}

.confirm-meta span {
  color: #8b6f5d;
  font-size: 12px;
}

.confirm-meta strong {
  color: #2b2118;
  font-size: 13px;
  word-break: break-word;
}

.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.error-message {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #ffe3d7;
  color: #8b2c12;
}
</style>