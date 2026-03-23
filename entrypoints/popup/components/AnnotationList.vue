<script setup lang="ts">
import type { AnnotationRecord } from '../../../src/shared/types/annotation'

defineProps<{
  annotations: AnnotationRecord[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  remove: [annotationId: string]
}>()
</script>

<!--
  说明：
  - 只负责展示传入的注释列表与加载/空状态占位
  - 不执行任何数据加载或变更操作，交由父组件控制
  - 当前版本点击 × 只发出“请求删除”事件，确认与真正删除逻辑仍由父组件处理
-->

<template>
  <section class="list-card">
    <div class="list-header">
      <p>当前页摘录</p>
    </div>

    <p v-if="isLoading" class="empty-state">正在加载标注...</p>
    <p v-else-if="annotations.length === 0" class="empty-state">暂无标注。请在页面中先选中文本，再使用右键菜单高亮。</p>

    <ul v-else class="annotation-list">
      <li v-for="annotation in annotations" :key="annotation.id">
        <button class="remove-button" type="button" aria-label="删除当前高亮" @click="emit('remove', annotation.id)">
          ×
        </button>
        <p class="quote">{{ annotation.textQuote }}</p>
        <p v-if="annotation.note" class="note">{{ annotation.note }}</p>
        <p class="meta">{{ new Date(annotation.createdAt).toLocaleString() }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.list-card {
  margin: 12px 0;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76);
}

.list-header p,
.empty-state,
.quote,
.meta {
  margin: 0;
}

.annotation-list {
  display: grid;
  gap: 10px;
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
}

.annotation-list li {
  position: relative;
  padding: 10px;
  border-radius: 12px;
  background: #fff8e8;
}

.remove-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: #f3dccd;
  color: #8b2c12;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: background 160ms ease, transform 160ms ease;
}

.remove-button:hover {
  background: #efc4b1;
  transform: scale(1.04);
}

.quote {
  padding-right: 28px;
  font-weight: 600;
}

.note {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  color: #5d4a39;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.meta {
  margin-top: 6px;
  font-size: 12px;
  color: #7d6a58;
}

.empty-state {
  color: #7d6a58;
  font-size: 13px;
}
</style>