<script setup lang="ts">
import { useHistoryOverview } from '../../src/features/history/useHistoryOverview'

const { isLoading, errorMessage, buckets, totalAnnotations, refresh, openOriginalPage, removeAnnotation, getColorMeta } =
  useHistoryOverview()
</script>

<template>
  <main class="history-shell">
    <header class="hero-card">
      <div>
        <p class="eyebrow">历史总览</p>
        <h1>你标记过的网页与摘录</h1>
        <p class="hero-description">集中查看所有已经保存的高亮内容，并直接打开原网页或删除某条标记。</p>
      </div>

      <div class="hero-metrics">
        <article>
          <span>站点页面</span>
          <strong>{{ buckets.length }}</strong>
        </article>
        <article>
          <span>高亮总数</span>
          <strong>{{ totalAnnotations }}</strong>
        </article>
        <button class="ghost-button" :disabled="isLoading" @click="refresh">
          刷新总览
        </button>
      </div>
    </header>

    <p v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>

    <section v-if="!isLoading && buckets.length === 0" class="empty-panel">
      <h2>还没有历史标记</h2>
      <p>先去网页中划词高亮，之后这里会按站点归档显示你保存过的内容。</p>
    </section>

    <section v-else class="bucket-list">
      <article v-for="bucket in buckets" :key="bucket.url" class="bucket-card">
        <header class="bucket-header">
          <div>
            <h2>{{ bucket.pageTitle || bucket.url }}</h2>
            <a class="bucket-link" :href="bucket.url" target="_blank" rel="noreferrer">{{ bucket.url }}</a>
          </div>

          <div class="bucket-actions">
            <span class="bucket-count">{{ bucket.annotations.length }} 条标记</span>
            <button class="open-button" type="button" @click="openOriginalPage(bucket.url)">
              打开网页
            </button>
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

            <div class="annotation-actions">
              <button class="delete-button" type="button" :disabled="isLoading" @click="removeAnnotation(bucket, annotation)">
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
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(255, 220, 175, 0.72), transparent 28%),
    linear-gradient(180deg, #fffdf8 0%, #f6efe3 100%);
  color: #2e241b;
  font-family: "Segoe UI", "PingFang SC", sans-serif;
}

.hero-card,
.bucket-card,
.empty-panel {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 20px 40px rgba(93, 64, 37, 0.08);
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(260px, 1fr);
  gap: 20px;
  padding: 24px;
}

.eyebrow,
.hero-description,
.bucket-link,
.annotation-time,
.error-message,
.empty-panel p,
.bucket-count {
  margin: 0;
}

.eyebrow {
  color: #9c6b2f;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero-card h1,
.empty-panel h2,
.bucket-card h2,
.annotation-quote {
  margin: 0;
}

.hero-card h1 {
  margin-top: 8px;
  font-size: 34px;
  line-height: 1.15;
}

.hero-description {
  margin-top: 12px;
  max-width: 720px;
  color: #6c5847;
  line-height: 1.6;
}

.hero-metrics {
  display: grid;
  gap: 12px;
}

.hero-metrics article {
  padding: 14px 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fff8ec 0%, #fff2dc 100%);
}

.hero-metrics span {
  display: block;
  color: #8d6f58;
  font-size: 13px;
}

.hero-metrics strong {
  display: block;
  margin-top: 6px;
  font-size: 28px;
}

.ghost-button,
.open-button,
.delete-button {
  border: 0;
  border-radius: 14px;
  padding: 11px 14px;
  cursor: pointer;
  font: inherit;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.ghost-button,
.open-button {
  background: #f0e4c6;
  color: #47362b;
}

.delete-button {
  background: #f7ddd3;
  color: #8b2c12;
}

.ghost-button:hover,
.open-button:hover,
.delete-button:hover {
  transform: translateY(-1px);
}

.error-message {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #ffe3d7;
  color: #8b2c12;
}

.empty-panel {
  margin-top: 20px;
  padding: 24px;
}

.empty-panel p {
  margin-top: 8px;
  color: #6c5847;
}

.bucket-list {
  display: grid;
  gap: 18px;
  margin-top: 20px;
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
  font-size: 22px;
}

.bucket-link {
  display: inline-block;
  margin-top: 8px;
  color: #8d6f58;
  text-decoration: none;
  word-break: break-all;
}

.bucket-actions {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.bucket-count {
  color: #8d6f58;
  font-size: 13px;
}

.annotation-list {
  display: grid;
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 18px 0 0;
}

.annotation-item {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fffaf1 0%, #fff6ea 100%);
}

.annotation-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  color: #433428;
  font-size: 12px;
  font-weight: 700;
}

.annotation-time {
  color: #8d6f58;
  font-size: 12px;
}

.annotation-quote {
  margin-top: 12px;
  color: #2e241b;
  font-size: 16px;
  line-height: 1.6;
}

.annotation-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

@media (max-width: 880px) {
  .history-shell {
    padding: 16px;
  }

  .hero-card {
    grid-template-columns: 1fr;
  }

  .bucket-header,
  .annotation-topline {
    flex-direction: column;
    align-items: flex-start;
  }

  .bucket-actions {
    justify-items: start;
  }
}
</style>