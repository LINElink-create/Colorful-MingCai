<script setup lang="ts">
import AnnotationList from './components/AnnotationList.vue'
import ExportActions from './components/ExportActions.vue'
import ImportActions from './components/ImportActions.vue'
import PageSummaryCard from './components/PageSummaryCard.vue'
import { usePopupState } from '../../src/features/popup/usePopupState'

// Popup 页面只做两件事：
// 1. 从 usePopupState 取状态和动作
// 2. 把这些状态分发给更小的展示组件
const {
  isLoading,
  errorMessage,
  pageInfo,
  annotations,
  refresh,
  clearCurrentPage,
  exportAnnotations,
  importAnnotations
} = usePopupState()
</script>

<!--
  说明：
  - 该组件是整个扩展弹窗的总装层
  - 页面中的“刷新、导出、导入、清空”都不会直接碰浏览器 API，而是交给 composable 处理
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

    <section class="card-grid">
      <ExportActions :disabled="isLoading" @export="exportAnnotations" />
      <ImportActions :disabled="isLoading" @import="importAnnotations" />
    </section>

    <AnnotationList :annotations="annotations" :is-loading="isLoading" />

    <button class="danger-button" :disabled="isLoading || annotations.length === 0" @click="clearCurrentPage">
      清空当前页高亮
    </button>
  </main>
</template>

<style scoped>
.popup-shell {
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
.danger-button {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  font: inherit;
}

.ghost-button {
  background: #f0e4c6;
}

.danger-button {
  width: 100%;
  background: #2b2118;
  color: #fff8e8;
}

.error-message {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #ffe3d7;
  color: #8b2c12;
}
</style>