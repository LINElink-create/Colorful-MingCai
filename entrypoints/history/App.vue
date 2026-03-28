<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHistoryOverview } from '../../src/features/history/useHistoryOverview'

const {
  isLoading,
  errorMessage,
  buckets,
  totalAnnotations,
  refresh,
  openOriginalPage,
  openSettingsPage,
  removeAnnotation,
  getColorMeta
} = useHistoryOverview()

const keyword = ref('')
const activeColor = ref<'all' | 'yellow' | 'green' | 'blue' | 'pink'>('all')

const filteredBuckets = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()

  return buckets.value
    .map((bucket) => {
      const filteredAnnotations = bucket.annotations.filter((annotation) => {
        const matchesKeyword = !normalizedKeyword
          || annotation.textQuote.toLowerCase().includes(normalizedKeyword)
          || annotation.note?.toLowerCase().includes(normalizedKeyword)
          || bucket.pageTitle.toLowerCase().includes(normalizedKeyword)
          || bucket.url.toLowerCase().includes(normalizedKeyword)

        const matchesColor = activeColor.value === 'all' || annotation.color === activeColor.value

        return matchesKeyword && matchesColor
      })

      return { ...bucket, annotations: filteredAnnotations }
    })
    .filter((bucket) => bucket.annotations.length > 0)
})
</script>

<template>
  <main class="history-shell mc-page-shell">
    <!-- 紧凑顶栏 -->
    <header class="history-header">
      <div class="header-left">
        <h1>历史总览</h1>
        <div class="header-stats">
          <span><strong>{{ buckets.length }}</strong> 个站点</span>
          <span><strong>{{ totalAnnotations }}</strong> 条高亮</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-ghost" :disabled="isLoading" @click="refresh">刷新</button>
        <button class="btn-ghost" :disabled="isLoading" @click="openSettingsPage">设置</button>
      </div>
    </header>

    <!-- 筛选栏 -->
    <section class="filter-bar">
      <label class="filter-field">
        <span>关键词筛选</span>
        <input v-model="keyword" type="text" placeholder="搜索标题、链接、摘录或备注">
      </label>
      <label class="filter-field filter-field-color">
        <span>颜色</span>
        <select v-model="activeColor">
          <option value="all">全部颜色</option>
          <option value="yellow">金黄</option>
          <option value="green">青柠</option>
          <option value="blue">雾蓝</option>
          <option value="pink">珊瑚粉</option>
        </select>
      </label>
    </section>

    <p v-if="errorMessage" class="error-message mc-error-message">{{ errorMessage }}</p>

    <!-- 空态 -->
    <section v-if="!isLoading && filteredBuckets.length === 0" class="empty-panel">
      <h2>还没有历史标记</h2>
      <p>{{ buckets.length === 0
        ? '先去网页中划词高亮，之后这里会按站点归档显示你保存过的内容。'
        : '当前筛选条件下没有匹配结果，试试清空关键词或切换颜色。' }}</p>
    </section>

    <!-- 分桶列表 -->
    <section v-else class="bucket-list">
      <article v-for="bucket in filteredBuckets" :key="bucket.url" class="bucket-card">
        <header class="bucket-header">
          <div>
            <h2>{{ bucket.pageTitle || bucket.url }}</h2>
            <a class="bucket-link" :href="bucket.url" target="_blank" rel="noreferrer">{{ bucket.url }}</a>
          </div>
          <div class="bucket-actions">
            <span class="bucket-count">{{ bucket.annotations.length }} 条标记</span>
            <button class="btn-open" type="button" @click="openOriginalPage(bucket.url)">打开网页</button>
          </div>
        </header>

        <ul class="annotation-list">
          <li v-for="annotation in bucket.annotations" :key="annotation.id" class="annotation-item">
            <div class="annotation-topline">
              <span class="color-chip" :style="{ backgroundColor: getColorMeta(annotation.color).swatch }">
                {{ getColorMeta(annotation.color).label }}
              </span>
              <time class="annotation-time">{{ new Date(annotation.createdAt).toLocaleString() }}</time>
            </div>
            <p class="annotation-quote">{{ annotation.textQuote }}</p>
            <p v-if="annotation.note" class="annotation-note">{{ annotation.note }}</p>
            <div class="annotation-actions">
              <button class="btn-delete" type="button" :disabled="isLoading" @click="removeAnnotation(bucket, annotation)">
                删除标记
              </button>
            </div>
          </li>
        </ul>
      </article>
    </section>
  </main>
</template>

<style scoped>
.history-shell {
  min-height: 100vh;
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

/* 顶栏 */
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  position: relative;
  overflow: hidden;
}

.history-header::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6);
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-stats {
  display: flex;
  gap: 14px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--mc-muted, #64748b);
}

.header-stats strong {
  color: var(--mc-accent, #6366f1);
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-ghost {
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  background: #f1f5f9;
  color: #475569;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease;
}

.btn-ghost:hover { background: #e2e8f0; }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* 筛选栏 */
.filter-bar {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(160px, 0.8fr);
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.filter-field {
  display: grid;
  gap: 6px;
}

.filter-field span {
  color: var(--mc-muted, #64748b);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.filter-field input,
.filter-field select {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 9px 12px;
  background: #fff;
  color: var(--mc-ink, #1a1a2e);
  font: inherit;
  font-size: 13px;
  box-sizing: border-box;
  transition: border-color 160ms ease;
}

.filter-field input:focus,
.filter-field select:focus {
  outline: none;
  border-color: var(--mc-accent, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* 空态 */
.empty-panel {
  margin-top: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.empty-panel h2 { margin: 0; font-size: 16px; font-weight: 600; }
.empty-panel p { margin: 8px 0 0; color: var(--mc-muted, #64748b); font-size: 13px; }

/* 分桶列表 */
.bucket-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.bucket-card {
  padding: 20px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.bucket-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.bucket-card h2 { margin: 0; font-size: 18px; font-weight: 600; }

.bucket-link {
  display: inline-block;
  margin-top: 6px;
  color: var(--mc-muted, #64748b);
  font-size: 13px;
  text-decoration: none;
  word-break: break-all;
}

.bucket-link:hover { color: var(--mc-accent, #6366f1); }

.bucket-actions {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.bucket-count {
  color: var(--mc-muted, #64748b);
  font-size: 12px;
  font-weight: 500;
}

.btn-open {
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  background: var(--mc-accent-soft, #eef2ff);
  color: var(--mc-accent, #6366f1);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease;
}

.btn-open:hover { background: #e0e7ff; }

.btn-delete {
  border: 0;
  border-radius: 8px;
  padding: 6px 12px;
  background: var(--mc-danger-bg, #fef2f2);
  color: var(--mc-danger-text, #dc2626);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease;
}

.btn-delete:hover { background: #fee2e2; }
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }

/* 标注列表 */
.annotation-list {
  display: grid;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
}

.annotation-item {
  padding: 14px;
  border-radius: 10px;
  background: var(--mc-surface-soft, #f8f9fb);
  border-left: 3px solid transparent;
  transition: background 120ms ease;
}

.annotation-item:hover { background: #f1f5f9; }

.annotation-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--mc-ink, #1a1a2e);
  font-size: 11px;
  font-weight: 600;
}

.annotation-time {
  color: var(--mc-muted, #94a3b8);
  font-size: 12px;
}

.annotation-quote {
  margin: 10px 0 0;
  color: var(--mc-ink, #1a1a2e);
  font-size: 14px;
  line-height: 1.6;
}

.annotation-note {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  color: var(--mc-muted-strong, #475569);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.annotation-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

@media (max-width: 880px) {
  .history-shell { padding: 16px; }
  .history-header { flex-direction: column; align-items: flex-start; }
  .filter-bar { grid-template-columns: 1fr; }
  .bucket-header, .annotation-topline { flex-direction: column; align-items: flex-start; }
  .bucket-actions { justify-items: start; }
}
</style>
