<script setup lang="ts">
defineProps<{
  pageTitle: string
  pageUrl: string
  annotationCount: number
  isLoading: boolean
}>()
</script>

<!--
  说明：
  - 展示当前活跃页面的摘要信息
  - 不关心数据来自哪里，只消费父组件传入的标题、URL 和统计数量
-->

<template>
  <section class="summary-card">
    <p class="summary-label">当前页面</p>
    <h2>{{ pageTitle || '未识别标题' }}</h2>
    <p class="summary-url">{{ pageUrl || '当前标签页不可用' }}</p>
    <p class="summary-count">
      {{ isLoading ? '加载中...' : `高亮数量：${annotationCount}` }}
    </p>
  </section>
</template>

<style scoped>
.summary-card {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 8px 24px rgba(107, 77, 38, 0.08);
}

.summary-label,
.summary-url,
.summary-count {
  margin: 0;
}

.summary-label {
  font-size: 12px;
  color: #9c6b2f;
}

.summary-card h2 {
  margin: 8px 0;
  font-size: 18px;
}

.summary-url {
  color: #66513f;
  font-size: 12px;
  word-break: break-all;
}

.summary-count {
  margin-top: 10px;
  font-weight: 600;
}
</style>