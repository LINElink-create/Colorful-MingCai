<script setup lang="ts">
import { ANNOTATION_COLORS } from '../../../src/shared/constants/annotationColors'
import type { AnnotationRecord } from '../../../src/shared/types/annotation'

const colorMetaMap = Object.fromEntries(ANNOTATION_COLORS.map((item) => [item.value, item]))

defineProps<{
  annotations: AnnotationRecord[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  jump: [annotation: AnnotationRecord]
  remove: [annotationId: string]
}>()

const getColorMeta = (color: AnnotationRecord['color']) => colorMetaMap[color]
</script>

<!--
  说明：
  - 只负责展示传入的注释列表与加载/空状态占位
  - 不执行任何数据加载或变更操作，交由父组件控制
  - 当前版本点击卡片发出“跳转定位”事件，点击 × 发出“请求删除”事件
-->

<template>
  <section class="list-card">
    <div class="list-header">
      <div>
        <p>当前页高亮</p>
        <h3>把页面里的重点句子和附加笔记收进这里</h3>
      </div>
    </div>

    <p v-if="isLoading" class="empty-state">正在加载标注...</p>
    <p v-else-if="annotations.length === 0" class="empty-state">暂无高亮。请先在页面中选中文本进行高亮，或为高亮添加笔记。</p>

    <ul v-else class="annotation-list">
      <li v-for="annotation in annotations" :key="annotation.id">
        <button class="annotation-card" type="button" @click="emit('jump', annotation)">
          <div class="annotation-topline">
            <span class="color-chip" :style="{ backgroundColor: getColorMeta(annotation.color).swatch }">
              {{ getColorMeta(annotation.color).label }}
            </span>
            <p class="meta">{{ new Date(annotation.createdAt).toLocaleString() }}</p>
          </div>
          <p class="quote">{{ annotation.textQuote }}</p>
          <p v-if="annotation.note" class="note">{{ annotation.note }}</p>
        </button>
        <button class="remove-button" type="button" aria-label="删除当前高亮" @click.stop="emit('remove', annotation.id)">
          ×
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.list-card {
  padding: 14px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.list-header p,
.empty-state,
.quote,
.meta {
  margin: 0;
}

.list-header h3 {
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 600;
}

.list-header p {
  color: var(--mc-accent, #6366f1);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.annotation-list {
  display: grid;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
}

.annotation-list li {
  position: relative;
  border-radius: 8px;
}

.annotation-card {
  width: 100%;
  padding: 12px;
  border: 0;
  border-left: 3px solid transparent;
  border-radius: 8px;
  background: #f8f9fb;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}

.annotation-card:hover {
  background: #f1f5f9;
}

.annotation-card:focus-visible {
  outline: 2px solid var(--mc-accent, #6366f1);
  outline-offset: 2px;
}

.annotation-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-right: 28px;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  color: var(--mc-ink, #1a1a2e);
  font-size: 11px;
  font-weight: 600;
}

.remove-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--mc-muted, #94a3b8);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: background 120ms ease, color 120ms ease;
}

.remove-button:hover {
  background: var(--mc-danger-bg, #fef2f2);
  color: var(--mc-danger-text, #dc2626);
}

.quote {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--mc-ink, #1a1a2e);
}

.note {
  margin: 6px 0 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fff;
  color: var(--mc-muted-strong, #475569);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.meta {
  font-size: 11px;
  color: var(--mc-muted, #94a3b8);
}

.empty-state {
  color: var(--mc-muted, #64748b);
  font-size: 13px;
  line-height: 1.6;
}
</style>