<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHistoryOverview } from '../../src/features/history/useHistoryOverview'

const {
  isLoading,
  errorMessage,
  buckets,
  totalAnnotations,
  totalNotes,
  refresh,
  openOriginalPage,
  openSettingsPage,
  removeAnnotation,
  getColorMeta
} = useHistoryOverview()

const keyword = ref('')
const activeColor = ref<'all' | 'yellow' | 'green' | 'blue' | 'pink'>('all')

const normalizeSearchValue = (value?: string) => {
  return (value ?? '').trim().toLowerCase()
}

const filteredBuckets = computed(() => {
  const normalizedKeyword = normalizeSearchValue(keyword.value)

  return buckets.value
    .map((bucket) => {
      const bucketTitle = normalizeSearchValue(bucket.pageTitle)
      const bucketUrl = normalizeSearchValue(bucket.url)

      const filteredAnnotations = bucket.annotations.filter((annotation) => {
        const annotationQuote = normalizeSearchValue(annotation.textQuote)
        const annotationNote = normalizeSearchValue(annotation.note)
        const colorLabel = normalizeSearchValue(getColorMeta(annotation.color).label)

        const matchesKeyword = !normalizedKeyword
          || annotationQuote.includes(normalizedKeyword)
          || annotationNote.includes(normalizedKeyword)
          || bucketTitle.includes(normalizedKeyword)
          || bucketUrl.includes(normalizedKeyword)
          || colorLabel.includes(normalizedKeyword)

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
    <header class="history-header mc-card">
      <div class="header-left">
        <h1>历史总览</h1>
        <div class="header-stats">
          <span><strong>{{ buckets.length }}</strong> 个站点</span>
          <span><strong>{{ totalAnnotations }}</strong> 条高亮</span>
          <span><strong>{{ totalNotes }}</strong> 条笔记</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="mc-ghost-button" :disabled="isLoading" @click="refresh">刷新</button>
        <button class="mc-ghost-button" :disabled="isLoading" @click="openSettingsPage">设置</button>
      </div>
    </header>

    <section class="filter-bar mc-card">
      <label class="filter-field">
        <span>关键词</span>
        <input v-model="keyword" type="text" placeholder="搜索标题、链接、摘录、备注或颜色">
      </label>
      <label class="filter-field">
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

    <p v-if="errorMessage" class="mc-error-message">{{ errorMessage }}</p>

    <section v-if="!isLoading && filteredBuckets.length === 0" class="empty-panel mc-card">
      <h2>还没有历史高亮</h2>
      <p>
        {{ buckets.length === 0
          ? '先去网页中划词高亮，或补充笔记，这里会按站点归档显示。'
          : '当前筛选条件下没有匹配结果，试试清空关键词或切换颜色。' }}
      </p>
    </section>

    <section v-else class="bucket-list">
      <article v-for="bucket in filteredBuckets" :key="bucket.url" class="bucket-card mc-card">
        <header class="bucket-header">
          <div>
            <h2>{{ bucket.pageTitle || bucket.url }}</h2>
            <a class="bucket-link" :href="bucket.url" target="_blank" rel="noreferrer">{{ bucket.url }}</a>
          </div>
          <div class="bucket-actions">
            <span class="bucket-count">
              {{ bucket.annotations.length }} 条高亮 / {{ bucket.annotations.filter((annotation) => annotation.note?.trim()).length }} 条笔记
            </span>
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
                删除高亮
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
}

.history-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--mc-brand-gradient);
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--mc-ink-strong);
}

.header-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--mc-muted);
}

.header-stats strong {
  color: var(--mc-accent);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(160px, 0.8fr);
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
}

.filter-field {
  display: grid;
  gap: 6px;
}

.filter-field span {
  color: var(--mc-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.filter-field input,
.filter-field select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 9px 12px;
  background: #fff;
  color: var(--mc-ink);
  font-size: 13px;
}

.filter-field input:focus,
.filter-field select:focus {
  outline: none;
  border-color: var(--mc-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.empty-panel {
  margin-top: 16px;
  padding: 24px;
}

.empty-panel h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.empty-panel p {
  margin: 8px 0 0;
  color: var(--mc-muted);
  font-size: 13px;
  line-height: 1.6;
}

.bucket-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.bucket-card {
  padding: 20px;
}

.bucket-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.bucket-card h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.bucket-link {
  display: inline-block;
  margin-top: 6px;
  color: var(--mc-muted);
  font-size: 13px;
  text-decoration: none;
  word-break: break-all;
}

.bucket-link:hover {
  color: var(--mc-accent);
}

.bucket-actions {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.bucket-count {
  color: var(--mc-muted);
  font-size: 12px;
  font-weight: 500;
}

.btn-open {
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  background: var(--mc-accent-soft);
  color: var(--mc-accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn-open:hover {
  background: #e0e7ff;
}

.annotation-list {
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
}

.annotation-item {
  padding: 14px;
  border-radius: 10px;
  background: var(--mc-surface-soft);
}

.annotation-item:hover {
  background: #f1f5f9;
}

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
  color: var(--mc-ink);
  font-size: 11px;
  font-weight: 600;
}

.annotation-time {
  color: #94a3b8;
  font-size: 12px;
}

.annotation-quote {
  margin: 10px 0 0;
  color: var(--mc-ink);
  font-size: 14px;
  line-height: 1.6;
}

.annotation-note {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  color: var(--mc-muted-strong);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.annotation-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.btn-delete {
  border: 0;
  border-radius: 8px;
  padding: 6px 12px;
  background: var(--mc-danger-bg);
  color: var(--mc-danger-text);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.btn-delete:hover {
  background: #fee2e2;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 880px) {
  .history-shell {
    padding: 16px;
  }

  .history-header,
  .bucket-header,
  .annotation-topline {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-bar {
    grid-template-columns: 1fr;
  }

  .bucket-actions {
    justify-items: start;
  }
}
</style>