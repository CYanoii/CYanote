/**
 * useNotePage - 笔记页面渲染的组合式函数
 *
 * 工厂模式：导出 createNotePageStore() 用于创建独立仓库实例，
 * 同时提供 useNotePage() 模块单例（向后兼容，避免修改所有现有调用方）。
 */
import { reactive, computed } from 'vue'

/**
 * 创建笔记编辑器仓库（可创建多个独立实例，供主区与副区分别持有）
 */
export function createNotePageStore() {
  const state = reactive({
    activeNoteId: null,     // 当前激活的笔记ID
    editors: new Map(),     // 存储笔记编辑器实例 {noteId: {noteData, vditor}}
    isFocused: false        // 是否聚焦在编辑器内容区
  })

  /**
   * 创建笔记编辑器
   * @param {Object} noteData 笔记数据
   */
  function createNoteEditor(noteData) {
    if (state.editors.has(noteData.id)) {
      return
    }
    state.editors.set(noteData.id, {
      noteData,
      vditor: null
    })
  }

  /**
   * 切换到指定笔记编辑器
   * @param {string|number} noteId 笔记ID
   */
  function switchToNoteEditor(noteId) {
    state.activeNoteId = noteId
  }

  /**
   * 切换到首页
   */
  function switchToHomePage() {
    state.activeNoteId = null
  }

  /**
   * 关闭笔记编辑器
   * @param {string|number} noteId 笔记ID
   */
  function closeNoteEditor(noteId) {
    const editor = state.editors.get(noteId)
    if (editor && editor.vditor) {
      editor.vditor.destroy()
    }
    state.editors.delete(noteId)
    if (state.activeNoteId === noteId) {
      state.activeNoteId = null
    }
  }

  /**
   * 更新编辑器标题
   */
  function updateEditorTitle(noteId, newTitle) {
    const editor = state.editors.get(noteId)
    if (editor) {
      editor.noteData.title = newTitle
    }
  }

  /**
   * 更新编辑器内容
   */
  function updateEditorContent(noteId, newContent) {
    const editor = state.editors.get(noteId)
    if (editor && editor.vditor && editor.vditor.lute) {
      try {
        const currentValue = editor.vditor.getValue()
        if (currentValue !== newContent) {
          editor.vditor.setValue(newContent)
        }
      } catch (e) {
        console.warn('[useNotePage] Vditor update failed, updating content directly:', e)
        editor.noteData.content = newContent
      }
    } else if (editor) {
      editor.noteData.content = newContent
    }
  }

  function updateNoteTags(noteId, allTags, noteTagIds) {
    const editor = state.editors.get(noteId)
    if (editor) {
      editor.noteData.tags = noteTagIds
      editor.allTags = allTags
    }
  }

  function updateNoteReferences(noteId, references) {
    const editor = state.editors.get(noteId)
    if (editor) {
      editor.references = references
    }
  }

  function updateNoteData(noteId, updates) {
    const editor = state.editors.get(noteId)
    if (editor && editor.noteData) {
      Object.assign(editor.noteData, updates)
    }
  }

  function setVditor(noteId, vditor) {
    const editor = state.editors.get(noteId)
    if (editor) {
      editor.vditor = vditor
    }
  }

  function getVditor(noteId) {
    const editor = state.editors.get(noteId)
    return editor ? editor.vditor : null
  }

  function scrollToPosition(noteId, index) {
    const vditor = getVditor(noteId)
    if (!vditor) return

    try {
      const container = document.getElementById(`vditor-${noteId}`)
      if (!container) return

      if (typeof vditor.focus === 'function') {
        vditor.focus()
      }

      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
      if (headings.length > 0 && index < headings.length) {
        headings[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch (e) {
      console.warn('[useNotePage] Failed to scroll to position:', e)
    }
  }

  function setFocused(focused) {
    state.isFocused = focused
  }

  function getActiveNoteId() {
    return state.activeNoteId
  }

  function hasEditor(noteId) {
    return state.editors.has(noteId)
  }

  function getEditors() {
    return Array.from(state.editors.entries()).map(([id, editor]) => ({
      id,
      noteData: editor.noteData,
      isActive: state.activeNoteId === id
    }))
  }

  // 计算属性
  const activeNoteId = computed(() => state.activeNoteId)
  const editors = computed(() => state.editors)
  const isFocused = computed(() => state.isFocused)

  return {
    state,
    activeNoteId,
    editors,
    isFocused,
    createNoteEditor,
    switchToNoteEditor,
    switchToHomePage,
    closeNoteEditor,
    updateEditorTitle,
    updateEditorContent,
    updateNoteTags,
    updateNoteReferences,
    updateNoteData,
    setVditor,
    getVditor,
    scrollToPosition,
    setFocused,
    getActiveNoteId,
    hasEditor,
    getEditors
  }
}

// 模块级单例：供主区使用（向后兼容，所有现有调用方无需改动）
let _singleton = null
export function useNotePage() {
  if (!_singleton) {
    _singleton = createNotePageStore()
  }
  return _singleton
}

// 向后兼容：旧导入 `notePageState` 的代码仍指向单例 state
export const notePageState = new Proxy({}, {
  get(_t, prop) {
    return _singleton ? _singleton.state[prop] : undefined
  }
})
