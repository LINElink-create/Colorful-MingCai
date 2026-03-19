<script setup lang="ts">
import { EXPORT_FORMATS, type ExportFormat } from '../../../src/shared/constants/exportFormats'

defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  export: [format: ExportFormat]
}>()
</script>

<!--
  说明：
  - 该组件只负责触发导出动作（通过 emit 向父组件报告所选格式）
  - 不处理导出实现细节（由父组件或状态钩子执行具体导出流程）
  - JSON 更适合备份与导入，Markdown 更适合阅读和整理
-->

<template>
  <section class="action-card">
    <p class="action-title">导出</p>
    <div class="button-row">
      <button :disabled="disabled" @click="emit('export', EXPORT_FORMATS.JSON)">
        导出 JSON
      </button>
      <button :disabled="disabled" @click="emit('export', EXPORT_FORMATS.MARKDOWN)">
        导出 Markdown
      </button>
    </div>
  </section>
</template>

<style scoped>
.action-card {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 248, 232, 0.8);
}

.action-title {
  margin: 0 0 10px;
  font-weight: 700;
}

.button-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

button {
  border: 0;
  border-radius: 12px;
  padding: 10px 12px;
  background: #e8c36c;
  color: #2b2118;
  font: inherit;
  cursor: pointer;
}
</style>