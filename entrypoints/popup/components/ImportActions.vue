<script setup lang="ts">
defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  import: [rawText: string]
}>()

// 选择文件后先在前端读取文本，再把原始字符串上交给父组件。
// 这样组件本身始终保持轻量，不直接依赖导入解析逻辑。
const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  const rawText = await file.text()
  emit('import', rawText)
  input.value = ''
}
</script>

<!--
  说明：
  - 通过文件选择器读取本地 JSON 文件内容并以文本形式通过 `import` 事件上报给父组件
  - 组件不解析文件内容，解析与合并逻辑由上层处理
  - 之所以只接受 .json，是因为当前项目的可导入格式仅支持结构化数据包
-->

<template>
  <section class="action-card">
    <p class="action-title">导入</p>
    <p class="action-description">用已有 JSON 归档恢复本地高亮，适合跨设备迁移。</p>
    <label class="upload-button">
      <span>{{ disabled ? '处理中...' : '选择导入文件' }}</span>
      <input :disabled="disabled" type="file" accept=".json" @change="handleFileChange" />
    </label>
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

.upload-button {
  display: block;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--mc-surface-soft, #f8f9fb);
  color: var(--mc-muted-strong, #475569);
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}

.upload-button:hover {
  border-color: var(--mc-accent, #6366f1);
  color: var(--mc-accent, #6366f1);
  background: var(--mc-accent-soft, #eef2ff);
}

input {
  display: none;
}
</style>