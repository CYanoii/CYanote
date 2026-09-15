<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import NotePage from '../Pages/NotePage/NotePage.vue'
import {
  useSecondaryPane,
  SECONDARY_PANE_MIN_WIDTH,
  SECONDARY_PANE_MAX_WIDTH
} from './useSecondaryPane.js'
import { EventTypes } from '../../core/EventTypes.js'

const {
  editor,
  pane,
  setNote,
  expand,
  collapse,
  setWidth
} = useSecondaryPane()

// 拖拽调整宽度
let startX = 0
let startWidth = 0

// 拖拽高亮态
const isDragOver = ref(false)
let dragCounter = 0

function onDragEnter(event) {
  // 仅响应来自 TabBar 标签页的拖拽（text/plain 即 noteId）
  if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes('text/plain')) return
  event.preventDefault()
  dragCounter += 1
  isDragOver.value = true
}

function onDragOver(event) {
  if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes('text/plain')) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function onDragLeave(event) {
  // 子元素冒泡导致计数错误，按 relatedTarget 防御
  if (!event.currentTarget.contains(event.relatedTarget)) {
    dragCounter = Math.max(0, dragCounter - 1)
    if (dragCounter === 0) isDragOver.value = false
  }
}

function onDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  dragCounter = 0
  const noteId = event.dataTransfer?.getData('text/plain')
  if (!noteId || !window.eventBus) return
  window.eventBus.emit(EventTypes.SECONDARY_PANE.SET_NOTE, noteId)
}

// 折叠/宽度直接通过模板上的 :class / :style 响应式绑定应用，
// 不再手动 querySelector 操作 DOM（immediate watch 在挂载前执行，元素尚不存在）

// 拖拽调整宽度（把手在左侧边缘，向左拖 = 变窄，向右拖 = 变宽）
function handleResizeStart(event) {
  if (pane.isCollapsed) return
  event.preventDefault()
  startX = event.clientX
  startWidth = pane.width
  // 拖拽期间禁用宽度过渡，否则会出现平滑延迟
  const el = document.querySelector('.right-sidebar')
  if (el) el.style.transition = 'none'
  document.body.classList.add('resizing')
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
}

// 把手在副区左缘，副区右缘固定贴窗口右缘：
// 向左拖 = 变宽，向右拖 = 变窄，因此 dx 取反
function handleResizeMove(event) {
  const dx = event.clientX - startX
  const newWidth = startWidth - dx
  setWidth(newWidth)
}

function handleResizeEnd() {
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
  document.body.classList.remove('resizing')
  // 恢复宽度过渡（开关折叠动画依赖它）
  const el = document.querySelector('.right-sidebar')
  if (el) el.style.transition = ''
}

// 计算当前是否显示编辑器
const hasNote = computed(() => !!pane.noteId)

onMounted(() => {
  const handle = document.getElementById('resizeHandleRight')
  if (handle) {
    handle.addEventListener('mousedown', handleResizeStart)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
})
</script>

<template>
  <aside
    class="right-sidebar"
    :class="{ collapsed: pane.isCollapsed }"
    :style="{ width: pane.width + 'px' }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- 副区头部：菜单栏按键已统一移至右上角控制条，不再需要笔记关闭按钮 -->
    <header class="sp-header"></header>

    <!-- 主体：空态提示 或 编辑器。
         折叠/展开时，内容与折叠状态同步即时翻转（收起时先清空内容，
         再让 width 过渡到 0；展开时立即渲染内容，再让 width 从 0 过渡到目标值），
         与左侧边栏"先清空内容再收起"的行为一致。 -->
    <div class="sp-body">
      <div v-if="!hasNote && !pane.isCollapsed" class="sp-empty">
        <i class="fas fa-columns sp-empty-icon"></i>
        <p class="sp-empty-text">从标签栏拖入页面</p>
      </div>
      <div v-else-if="hasNote && !pane.isCollapsed" class="sp-editor">
        <NotePage :store="editor" />
      </div>

      <!-- 拖拽高亮遮罩（仅在副区展开且无内容时显示，仅保留蓝色描边/底色提示） -->
      <div v-if="isDragOver && !hasNote && !pane.isCollapsed" class="sp-drop-overlay"></div>
    </div>
  </aside>
</template>

<style scoped>
.right-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sidebar-content-bg);
  border-left: 1px solid var(--sidebar-content-border);
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  transition: width 0.3s ease;
}

.right-sidebar.collapsed {
  width: 0 !important;
  border-left: none;
}

/* 副区头部：保持与主标题栏同高（35px），作为顶部背景延续；
   启用 -webkit-app-region: drag 使该区域可拖动软件窗口（与主标题栏一致） */
.sp-header {
  height: 35px;
  background: var(--titlebar-bg);
  border-bottom: 1px solid var(--sidebar-content-border);
  flex-shrink: 0;
  -webkit-app-region: drag;
  user-select: none;
}

/* 主体 */
.sp-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

/* 空态：与左侧边栏 .panel-empty 风格一致（panels-shared.css） */
.sp-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--sidebar-content-text-muted);
  padding: 20px 16px;
  text-align: center;
  pointer-events: none;
  user-select: none;
}

.sp-empty-icon {
  font-size: 28px;
  opacity: 0.6;
}

.sp-empty-text {
  font-size: 13px;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.sp-editor {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

/* 拖入高亮遮罩（仅空态时显示，仅保留蓝色描边与底色） */
.sp-drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(66, 153, 225, 0.1);
  border: 2px dashed var(--accent);
  pointer-events: none;
  z-index: 10;
}
</style>
