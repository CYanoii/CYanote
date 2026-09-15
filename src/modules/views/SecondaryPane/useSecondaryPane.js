/**
 * useSecondaryPane - 右侧副编辑区的组合式函数
 *
 * 职责：
 * - 持有独立的编辑器仓库（复用 createNotePageStore），与主区完全隔离
 * - 持有面板 UI 状态：折叠、宽度、当前笔记
 * - 提供 noteId 写入、销毁、折叠切换、宽度调整等方法
 *
 * 持久化通过 eventBus 上的 SECONDARY_PANE.* 事件，由 PageStateController 监听落盘。
 */
import { reactive, computed } from 'vue'
import { createNotePageStore } from '../Pages/NotePage/useNotePage.js'
import { EventTypes } from '../../core/EventTypes.js'

const MIN_WIDTH = 400
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 400

// 模块级单例：副区全局唯一
let _instance = null

function create() {
  // 独立的编辑器仓库，与主区 useNotePage 单例完全隔离
  const editor = createNotePageStore()

  // 面板 UI 状态
  const pane = reactive({
    isCollapsed: true,
    width: DEFAULT_WIDTH,
    // 当前副区笔记 ID（与 editor.state.activeNoteId 同步，但更便于持久化/外部查询）
    noteId: null
  })

  function getNoteId() {
    return pane.noteId
  }

  function getIsCollapsed() {
    return pane.isCollapsed
  }

  function getWidth() {
    return pane.width
  }

  /**
   * 设置副区显示的笔记（创建编辑器 + 激活 + 持久化）
   * 覆盖语义：调用前若有旧笔记，应先调用 clearNote
   */
  function setNote(noteData) {
    if (!noteData || !noteData.id) return
    editor.createNoteEditor(noteData)
    editor.switchToNoteEditor(noteData.id)
    pane.noteId = noteData.id
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.SECONDARY_PANE.NOTE_CHANGE, noteData.id)
    }
  }

  /**
   * 清空副区笔记（仅关闭：销毁编辑器，笔记留在磁盘）
   */
  function clearNote() {
    if (pane.noteId) {
      editor.closeNoteEditor(pane.noteId)
      pane.noteId = null
      if (window.eventBus) {
        window.eventBus.emit(EventTypes.SECONDARY_PANE.NOTE_CHANGE, null)
      }
    }
  }

  function collapse() {
    if (pane.isCollapsed) return
    pane.isCollapsed = true
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.SECONDARY_PANE.COLLAPSE_CHANGE, true)
    }
  }

  function expand() {
    if (!pane.isCollapsed) return
    pane.isCollapsed = false
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.SECONDARY_PANE.COLLAPSE_CHANGE, false)
    }
  }

  function toggle() {
    pane.isCollapsed ? expand() : collapse()
  }

  function setWidth(width) {
    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(width)))
    if (clamped === pane.width) return
    pane.width = clamped
    if (window.eventBus) {
      window.eventBus.emit(EventTypes.SECONDARY_PANE.WIDTH_CHANGE, clamped)
    }
  }

  // 初始化时应用折叠/宽度（不发送事件，仅用于恢复阶段静默设置）
  function _applyState({ isCollapsed, width }) {
    if (typeof isCollapsed === 'boolean') pane.isCollapsed = isCollapsed
    if (typeof width === 'number') {
      pane.width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
    }
  }

  return {
    editor,
    pane,
    getNoteId,
    getIsCollapsed,
    getWidth,
    setNote,
    clearNote,
    collapse,
    expand,
    toggle,
    setWidth,
    _applyState
  }
}

export function useSecondaryPane() {
  if (!_instance) {
    _instance = create()
  }
  return _instance
}

export const SECONDARY_PANE_MIN_WIDTH = MIN_WIDTH
export const SECONDARY_PANE_MAX_WIDTH = MAX_WIDTH
export const SECONDARY_PANE_DEFAULT_WIDTH = DEFAULT_WIDTH
