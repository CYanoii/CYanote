<script setup>
import { createApp, onMounted, computed, ref, watch } from 'vue'
import ToastContainer from './Toast/ToastContainer.vue'
import ModalContainer from './Modal/ModalContainer.vue'
import LeftSidebar from './LeftSidebar/LeftSidebar.vue'
import TabBar from './TabBar/TabBar.vue'
import Editor from './Pages/NotePage/NotePage.vue'
import HomePage from './Pages/HomePage/HomePage.vue'
import SecondaryPane from './SecondaryPane/SecondaryPane.vue'
import { useLeftSidebar } from './LeftSidebar/useLeftSidebar.js'
import { useNotePage } from './Pages/NotePage/useNotePage.js'
import { useTabBar } from './TabBar/useTabBar.js'
import { useTagFilter } from './TagFilter/useTagFilter.js'
import { useNoteList } from './NoteList/useNoteList.js'
import { useToast } from './Toast/useToast.js'
import { useModal } from './Modal/useModal.js'
import { useSecondaryPane } from './SecondaryPane/useSecondaryPane.js'
import { EventTypes } from '../core/EventTypes.js'

// 立即暴露 composable 实例到 window（早于 UIManager 构造函数调用）
window.leftSidebarApi = useLeftSidebar()
window.editorApi = useNotePage()
window.tabBarApi = useTabBar()
window.tagFilterApi = useTagFilter()
window.noteListApi = useNoteList()
window.toastApi = useToast()
window.modalApi = useModal()
const secondaryPaneApi = useSecondaryPane()
window.secondaryPaneApi = secondaryPaneApi

// 新建页面下拉菜单状态
const showPageTypeDropdown = ref(false)

// 切换下拉菜单
function toggleDropdown() {
  showPageTypeDropdown.value = !showPageTypeDropdown.value
}

// 关闭下拉菜单
function closeDropdown() {
  showPageTypeDropdown.value = false
}

// 创建笔记页
function createNotePage() {
  closeDropdown()
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.CREATE, 'note')
  }
}

// 创建便签页
function createStickyPage() {
  closeDropdown()
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.CREATE, 'sticky')
  }
}

// 计算是否在首页（无激活笔记时）
const isOnHomePage = computed(() => {
  return window.editorApi?.getActiveNoteId() === null
})

// 文件夹名
const folderName = ref('CYanote')

// 窗口最大化状态
const isMaximized = ref(false)

// 初始化获取文件夹名和最大化状态
onMounted(async () => {
  try {
    const name = await window.electronAPI.getFolderName()
    if (name) {
      folderName.value = name
    }
  } catch (e) {
    console.warn('[App] 获取文件夹名失败:', e)
  }
  isMaximized.value = await window.electronAPI.isWindowMaximized()

  // 监听窗口最大化状态变化（双击标题栏等系统操作）
  window.electronAPI.onWindowMaximized((maximized) => {
    isMaximized.value = maximized
  })

  // 点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    if (showPageTypeDropdown.value && !e.target.closest('.fab-container')) {
      closeDropdown()
    }
  })

  // Toast 和 Modal 使用 <Teleport> 到 body，需单独挂载
  const toastRoot = document.getElementById('vue-toast-root')
  if (toastRoot) {
    createApp(ToastContainer).mount(toastRoot)
  }

  const modalRoot = document.getElementById('vue-modal-root')
  if (modalRoot) {
    createApp(ModalContainer).mount(modalRoot)
  }

  // 绑定 UIManager 的 DOM 事件（需在 Vue 组件挂载后调用）
  if (window.uiManager?.bindAll) {
    window.uiManager.bindAll()
  }
})

// 窗口控制函数
const handleMinimize = () => window.electronAPI.minimizeWindow()
const handleMaximize = () => window.electronAPI.maximizeWindow()
const handleClose = () => window.electronAPI.closeWindow()

// 副编辑区折叠状态（用于开关按钮的高亮）
const secondaryPaneCollapsed = ref(true)

// 副编辑区按钮拖拽高亮（拖动标签经过按钮时变绿背景）
const isSecondaryPaneDragOver = ref(false)
let paneButtonDragCounter = 0
function onPaneButtonDragEnter(event) {
  if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes('text/plain')) return
  event.preventDefault()
  // 只在从按钮外部进入时递增计数（避免子元素切换时计数只增不减导致离开后无法复位）
  if (!event.currentTarget.contains(event.relatedTarget)) {
    paneButtonDragCounter += 1
    isSecondaryPaneDragOver.value = true
  }
}
function onPaneButtonDragOver(event) {
  if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes('text/plain')) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}
function onPaneButtonDragLeave(event) {
  // 只在离开到按钮外部时递减计数
  if (!event.currentTarget.contains(event.relatedTarget)) {
    paneButtonDragCounter = Math.max(0, paneButtonDragCounter - 1)
    if (paneButtonDragCounter === 0) isSecondaryPaneDragOver.value = false
  }
}
function onPaneButtonDrop(event) {
  event.preventDefault()
  isSecondaryPaneDragOver.value = false
  paneButtonDragCounter = 0
  const noteId = event.dataTransfer?.getData('text/plain')
  if (!noteId || !window.eventBus) return
  window.eventBus.emit(EventTypes.SECONDARY_PANE.SET_NOTE, noteId)
}
async function toggleSecondaryPane() {
  // 若当前展开且副区有笔记：折叠前先把笔记转到主编辑区打开
  const isExpanded = !secondaryPaneApi.getIsCollapsed()
  const paneNoteId = secondaryPaneApi.getNoteId()
  if (isExpanded && paneNoteId) {
    try {
      // 直接调用 transferPaneNoteToMain：复用共享引用，避免重新加载
      if (window.app?.noteController?.transferPaneNoteToMain) {
        await window.app.noteController.transferPaneNoteToMain(paneNoteId)
      } else if (window.eventBus) {
        window.eventBus.emit(EventTypes.NOTE.OPEN, { id: paneNoteId })
      }
    } catch (e) {
      console.error('[App] 折叠副区并转移笔记失败:', e)
      secondaryPaneApi.clearNote()
    }
  }
  secondaryPaneApi.toggle()
}
onMounted(() => {
  secondaryPaneCollapsed.value = secondaryPaneApi.getIsCollapsed()
})
// 同步副编辑区折叠状态变化到标题栏开关按钮的高亮
watch(() => secondaryPaneApi.getIsCollapsed(), (collapsed) => {
  secondaryPaneCollapsed.value = collapsed
})
</script>

<template>
  <div class="app-root">
    <div class="app-container">
      <LeftSidebar class="left-sidebar" />

      <div class="resize-handle" id="resizeHandle"></div>

      <div class="main-container">
        <header class="header" @dblclick="handleMaximize">
          <div class="tab-bar-wrapper">
            <TabBar class="tab-bar" />
          </div>
        </header>

        <main class="main-content">
          <HomePage class="home-view" />
          <Editor class="notes-container" />
        </main>

        <!-- 悬浮新建页面按钮（仅首页显示） -->
        <div v-if="isOnHomePage" class="fab-container">
          <div v-if="showPageTypeDropdown" class="fab-dropdown">
            <button class="fab-dropdown-item" @click="createStickyPage">
              <i class="fas fa-sticky-note"></i>
              <span>便签页</span>
            </button>
            <button class="fab-dropdown-item" @click="createNotePage">
              <i class="fas fa-file-alt"></i>
              <span>笔记页</span>
            </button>
          </div>
          <button
            class="fab-new-note"
            id="fabNewNote"
            :class="{ active: showPageTypeDropdown }"
            @click.stop="toggleDropdown"
            title="新建页面"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>

      <!-- 副编辑区左侧的宽度调整把手 -->
      <div class="resize-handle resize-handle-right" id="resizeHandleRight"></div>

      <!-- 右侧副编辑区 -->
      <SecondaryPane class="right-sidebar" />

      <!-- 浮在窗口右上角的菜单栏控制条（始终位于软件右上角） -->
      <div class="window-controls">
        <button
          class="window-btn secondary-pane-toggle"
          :class="{ active: !secondaryPaneCollapsed, 'drag-over': isSecondaryPaneDragOver }"
          title="副编辑区"
          @click="toggleSecondaryPane"
          @dragenter="onPaneButtonDragEnter"
          @dragover="onPaneButtonDragOver"
          @dragleave="onPaneButtonDragLeave"
          @drop="onPaneButtonDrop"
        >
          <i class="fas fa-columns"></i>
        </button>
        <button class="window-btn minimize" @click="handleMinimize">
          <i class="fas fa-minus"></i>
        </button>
        <button class="window-btn maximize" @click="handleMaximize">
          <i :class="isMaximized ? 'far fa-clone' : 'far fa-square'"></i>
        </button>
        <button class="window-btn close" @click="handleClose">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--titlebar-bg);
  color: var(--titlebar-color);
  height: 35px;
  padding: 0;
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.window-controls {
  /* 浮在窗口右上角：当副区展开时落在副区头部右上角；副区折叠时仍可见在 tab bar 之上 */
  position: fixed;
  top: 0;
  right: 0;
  height: 35px;
  display: flex;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
  z-index: 200;
}

.tab-bar-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
  background: var(--titlebar-bg);
  padding-right: 10px;
  min-width: 0;
}

.window-btn {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--titlebar-color);
  cursor: pointer;
  transition: background 0.15s;
}

.window-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.window-btn.close:hover {
  background: #e53e3e;
}

.window-btn i {
  font-size: 12px;
}

.window-btn.maximize i {
  font-size: 11px;
}

.window-btn.secondary-pane-toggle i {
  font-size: 12px;
}

.window-btn.secondary-pane-toggle.active {
  background: var(--accent);
  color: #ffffff;
}

.window-btn.secondary-pane-toggle.active:hover {
  background: var(--accent-hover);
}

/* 拖动标签经过按钮时：绿色高亮，提示可放入 */
.window-btn.secondary-pane-toggle.drag-over {
  background: #22c55e;
  color: #ffffff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
  height: 100%;
}

.left-sidebar {
  display: flex;
  height: 100%;
  background: var(--sidebar-content-bg);
  border-right: 1px solid var(--sidebar-content-border);
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.3s ease;
  width: 280px;
}

.left-sidebar.collapsed {
  width: 50px !important;
}

.resize-handle {
  width: 8px;
  background: transparent;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  margin-left: -4px;
  margin-right: -4px;
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
  z-index: 10;
}

.resize-handle:hover::after,
.resize-handle.resizing::after {
  width: 4px;
}

.resize-handle::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 8px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
}

/* 右侧副编辑区的把手：调整 ::after 居中位置以与左侧对称 */
.resize-handle.resize-handle-right {
  /* 副区面板在 DOM 中位于把手之后，会盖住把手右半部分，需提升层级 */
  z-index: 5;
}

.resize-handle.resize-handle-right::after {
  left: 50%;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.main-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--body-bg);
}

.home-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
}

.home-view::-webkit-scrollbar {
  display: none;
}

/* 悬浮新建页面按钮容器 */
.fab-container {
  position: fixed;
  bottom: 40px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 悬浮新建页面按钮 (FAB) */
.fab-new-note {
  width: 56px;
  height: 56px;
  margin-left: 22px;
  margin-right: 22px;
  border-radius: 50%;
  background: var(--fab-bg);
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.2s ease;
}

.fab-new-note:hover {
  background: var(--fab-hover-bg);
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(66, 153, 225, 0.6);
}

.fab-new-note:active {
  transform: scale(0.95);
}

.fab-new-note.active {
  background: var(--fab-hover-bg);
  transform: rotate(45deg);
}

/* 下拉菜单 */
.fab-dropdown {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 下拉菜单项 */
.fab-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--modal-bg);
  color: var(--modal-text);
  border: 1px solid var(--modal-border);
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.fab-dropdown-item:hover {
  border-color: var(--accent);
}

.fab-dropdown-item i {
  font-size: 14px;
  color: var(--accent);
  width: 16px;
  text-align: center;
}

.fab-dropdown-item span {
  font-size: 13px;
}

.fab-dropdown-item span {
  font-size: 14px;
}
</style>