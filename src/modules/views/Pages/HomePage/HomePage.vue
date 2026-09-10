<script setup>
import { ref, computed } from 'vue'
import { EventTypes } from '../../../core/EventTypes.js'
import NoteList from '../../NoteList/NoteList.vue'
import TagFilter from '../../TagFilter/TagFilter.vue'
import ReferenceGraph from '../../ReferenceGraph/ReferenceGraph.vue'
import { useNoteList } from '../../NoteList/useNoteList.js'

const { notes } = useNoteList()

// 搜索输入
const searchQuery = ref('')
const isSearchDisabled = computed(() => !searchQuery.value.trim())

function handleSearchInput(e) {
  searchQuery.value = e.target.value
}

function handleSearchKeypress(e) {
  if (e.key === 'Enter' && searchQuery.value.trim()) {
    window.eventBus.emit(EventTypes.SEARCH.HOME_SEARCH, searchQuery.value.trim())
  }
}

function handleSearchClick() {
  if (!isSearchDisabled.value) {
    window.eventBus.emit(EventTypes.SEARCH.HOME_SEARCH, searchQuery.value.trim())
  }
}

function handleNewNote() {
  window.eventBus.emit(EventTypes.NOTE.CREATE)
}

// 视图切换：notes = 所有页面卡片，graph = 引用图谱
const activeView = ref('notes')
const VIEW_CONFIG = {
  notes: { title: '页面卡片', icon: 'fas fa-columns' },
  graph: { title: '引用图谱', icon: 'fas fa-project-diagram' }
}
const activeViewTitle = computed(() => VIEW_CONFIG[activeView.value].title)

function switchView(view) {
  activeView.value = view
}
</script>

<template>
  <div class="home-container">
    <!-- 搜索框 -->
    <div class="search-box">
      <i class="fas fa-search"></i>
      <input
        type="text"
        id="searchInput"
        v-model="searchQuery"
        placeholder="搜索笔记内容或标题..."
        @input="handleSearchInput"
        @keypress="handleSearchKeypress"
      >
      <button
        class="btn-search"
        :class="{ disabled: isSearchDisabled }"
        :disabled="isSearchDisabled"
        @click="handleSearchClick"
      >
        <i class="fas fa-paper-plane"></i>
      </button>
    </div>

    <!-- 标签筛选栏 -->
    <TagFilter class="tag-filter-wrapper" />

    <!-- 内容区：所有页面卡片 / 引用图谱 切换 -->
    <div class="all-notes">
      <div class="view-header">
        <h2>
          <i :class="VIEW_CONFIG[activeView].icon"></i> {{ activeViewTitle }}
        </h2>
        <div class="view-switcher">
          <button
            class="view-switch-btn"
            :class="{ active: activeView === 'notes' }"
            title="页面卡片"
            @click="switchView('notes')"
          >
            <i class="fas fa-columns"></i>
          </button>
          <button
            class="view-switch-btn"
            :class="{ active: activeView === 'graph' }"
            title="引用图谱"
            @click="switchView('graph')"
          >
            <i class="fas fa-project-diagram"></i>
          </button>
        </div>
      </div>
      <NoteList v-show="activeView === 'notes'" class="notes-grid-wrapper" />
      <!-- 引用图谱：v-if 保证切到图谱时才挂载渲染，避免隐藏时 svg 尺寸为 0 -->
      <ReferenceGraph v-if="activeView === 'graph'" :notes="notes" />
    </div>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--search-box-bg);
  border: 1px solid var(--search-box-border);
  border-radius: 12px;
  padding: 0 20px;
  height: 60px;
  margin-bottom: 40px;
}

.search-box i {
  color: var(--text-muted);
  margin-right: 15px;
  font-size: 18px;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--text-primary);
  background: transparent;
}

.search-box input::placeholder {
  color: var(--text-muted);
}

.btn-search {
  background: var(--accent);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-search i {
  margin: 0;
  color: white;
}

.btn-search.disabled {
  background: var(--panel-border);
  cursor: not-allowed;
}

.btn-search:not(.disabled):hover {
  background: var(--accent-hover);
}

.btn-search:not(.disabled):active {
  transform: scale(0.95);
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.all-notes h2 {
  margin: 0;
  color: var(--home-title-color);
  font-weight: 600;
}

.all-notes h2 i {
  margin-right: 10px;
  color: var(--accent);
}

/* 视图切换按钮组 */
.view-switcher {
  display: flex;
  gap: 4px;
  background: var(--sidebar-content-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 3px;
}

.view-switch-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.view-switch-btn:hover:not(.active) {
  color: var(--text-primary);
  background: var(--sidebar-card-hover-bg);
}

.view-switch-btn.active {
  background: var(--accent);
  color: #fff;
}
</style>
