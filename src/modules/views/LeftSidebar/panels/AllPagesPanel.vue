<script setup>
import { computed } from 'vue'
import { EventTypes } from '../../../core/EventTypes.js'
import { getPageIcon } from '../../../utils/helpers.js'
import './panels-shared.css'

const props = defineProps({
  panelId: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: () => ({ groups: [] })
  },
  activeNoteId: {
    type: String,
    default: null
  }
})

// 从 data 中提取字母分组
const groups = computed(() => props.data?.groups || [])

// 处理页面点击
function handlePageClick(noteId) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
  }
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
</script>

<template>
  <div class="sidebar-panel all-pages-panel">
    <h3 class="panel-title">
      <i class="fas fa-layer-group"></i> 所有页面
    </h3>
    <div class="panel-content">
      <ul v-if="groups.length > 0" class="pages-list">
        <li v-for="group in groups" :key="group.letter" class="pages-letter-group">
          <!-- 字母索引：类似归档月份条目，不可点击 -->
          <div class="pages-letter-header">
            <span
              class="pages-letter-text"
              :class="{ 'is-hash': group.letter === '#' }"
            >{{ group.letter }}</span>
            <span class="pages-letter-count">{{ group.notes.length }}</span>
          </div>
          <ul class="pages-notes-list">
            <li
              v-for="note in group.notes"
              :key="note.id"
              class="panel-item pages-note-item"
              :data-note-id="note.id"
              @click="handlePageClick(note.id)"
            >
              <i :class="getPageIcon(note.pageType)"></i>
              <span class="pages-note-title">{{ escapeHtml(note.title || '无标题') }}</span>
            </li>
          </ul>
        </li>
      </ul>
      <p v-else class="panel-empty">暂无页面</p>
    </div>
  </div>
</template>

<style scoped>
.pages-list {
  list-style: none;
  padding: 0;
  padding-left: 8px;
  margin: 0;
}

.pages-letter-group {
  margin-bottom: 0;
}

/* 字母索引头：与归档月份条目样式一致，不可点击 */
.pages-letter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  padding-left: 8px;
  color: var(--sidebar-content-text-secondary);
  font-size: 12px;
  user-select: none;
}

/* “#”字形在多数字体中比大写字母略小，放大一号保持视觉大小一致 */
.pages-letter-text.is-hash {
  font-size: 14px;
  line-height: 12px;
}

.pages-letter-count {
  color: var(--sidebar-content-text-muted);
  font-size: 11px;
}

.pages-notes-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.pages-note-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
