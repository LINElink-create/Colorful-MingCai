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
    <p class="action-description">把当前已保存的标注带走，适合备份或整理。</p>
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
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.action-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.action-description {
  margin: 6px 0 10px;
  color: var(--mc-muted, #64748b);
  font-size: 12px;
  line-height: 1.5;
}

.button-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

button {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  color: var(--mc-ink, #1a1a2e);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}

button:hover {
  border-color: var(--mc-accent, #6366f1);
  color: var(--mc-accent, #6366f1);
  background: var(--mc-accent-soft, #eef2ff);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>