<script setup lang="ts">
import type { AnnotationRecord } from '../../../src/shared/types/annotation'

defineProps<{
  annotations: AnnotationRecord[]
  isLoading: boolean
}>()
</script>

<!--
  说明：
  - 只负责展示传入的注释列表与加载/空状态占位
  - 不执行任何数据加载或变更操作，交由父组件控制
  - 当前版本只显示 textQuote 和创建时间，后续可扩展颜色、备注、删除按钮等信息
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
        <p class="quote">{{ annotation.textQuote }}</p>
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
  padding: 10px;
  border-radius: 12px;
  background: #fff8e8;
}

.quote {
  font-weight: 600;
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