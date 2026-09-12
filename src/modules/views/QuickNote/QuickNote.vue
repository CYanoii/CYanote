<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 文本框内容（窗口关闭后仍保留，重启程序才清空）
const text = ref('')
const saving = ref(false)

const textareaRef = ref(null)
const canSave = computed(() => text.value.trim().length > 0 && !saving.value)

// 输入时同步草稿到主进程，防止窗口异常导致内容丢失
function persistDraft() {
  window.electronAPI.quickNoteSetDraft(text.value)
}

function focusTextarea() {
  textareaRef.value && textareaRef.value.focus()
}

// Esc 关闭（窗口隐藏，保留草稿）；Alt+Shift+W = 保存并保留；Alt+Shift+E = 保存并关闭
function handleKeydown(e) {
  const k = e.key.toLowerCase()
  if (k === 'escape') {
    e.preventDefault()
    close()
    return
  }
  // 其它快捷键需同时按住 Alt+Shift 才生效
  if (!e.altKey || !e.shiftKey) return
  if (k === 'w') {
    e.preventDefault()
    save(true)
  } else if (k === 'e') {
    e.preventDefault()
    save(false)
  }
}

// 保存速记；keepOpen=true 保留窗口，false 保存后关闭
async function save(keepOpen) {
  if (!canSave.value) return
  saving.value = true
  try {
    const ok = await window.electronAPI.quickNoteSave(text.value)
    if (ok) {
      text.value = ''
      persistDraft()
      if (!keepOpen) {
        await window.electronAPI.quickNoteClose()
      } else {
        focusTextarea()
      }
    }
  } catch (err) {
    console.error('[QuickNote] 保存失败:', err)
  } finally {
    saving.value = false
  }
}

function close() {
  persistDraft()
  window.electronAPI.quickNoteClose()
}

function handleWindowFocus() {
  focusTextarea()
}

onMounted(async () => {
  // 恢复上次未保存的内容
  try {
    text.value = await window.electronAPI.quickNoteGetDraft() || ''
  } catch { /* 草稿读取失败则留空 */ }

  // 跟随主程序主题
  try {
    const config = await window.electronAPI.getConfig()
    if (config && config.theme) {
      document.documentElement.setAttribute('data-theme', config.theme)
    }
  } catch { /* 保持默认浅色 */ }

  focusTextarea()
  window.addEventListener('keydown', handleKeydown)
  // 小窗每次被唤起（重新聚焦）时聚焦文本框
  window.addEventListener('focus', handleWindowFocus)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('focus', handleWindowFocus)
})
</script>

<template>
  <div class="qn-window">
    <!-- 顶部栏：整块可拖动 -->
    <div class="qn-titlebar">
      <span class="qn-title">速记</span>
      <button class="qn-close" title="关闭（内容会保留）" @click="close">✕</button>
    </div>

    <!-- 文本框 -->
    <textarea
      ref="textareaRef"
      v-model="text"
      class="qn-textarea"
      @input="persistDraft"
    ></textarea>

    <!-- 底部：两个保存按钮占满整行 -->
    <div class="qn-footer">
      <button
        class="qn-btn qn-btn-ghost"
        :disabled="!canSave"
        title="Alt+Shift+W"
        @click="save(true)"
      >保存并保留窗口</button>
      <button
        class="qn-btn qn-btn-primary"
        :disabled="!canSave"
        title="Alt+Shift+E"
        @click="save(false)"
      >保存并关闭窗口</button>
    </div>
  </div>
</template>

<style scoped>
.qn-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--modal-bg);
  color: var(--modal-text);
  /* 圆角交给 Electron BrowserWindow 自己绘制，避免内层圆角与外层系统圆角错位 */
  overflow: hidden;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

/* 顶部栏：整块可拖动，右侧关闭按钮与主窗口风格一致 */
.qn-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  padding-left: 12px;
  background: var(--titlebar-bg);
  /* 顶部圆角由 .qn-window 的 overflow:hidden + border-radius 裁出 */
  -webkit-app-region: drag;
  user-select: none;
  flex-shrink: 0;
}

.qn-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--titlebar-color);
}

/* 主窗口风格的关闭按钮：右上圆角由 .qn-window 裁出，hover 红底 */
.qn-close {
  -webkit-app-region: no-drag;
  width: 46px;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--titlebar-color);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.qn-close:hover {
  background: #e53e3e;
  color: #ffffff;
}

.qn-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 14px 16px;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.7;
  font-family: inherit;
}

.qn-textarea::placeholder {
  color: var(--text-muted);
}

.qn-footer {
  display: flex;
  align-items: center;
  gap: 0;
  border-top: 1px solid var(--modal-border);
  flex-shrink: 0;
}

.qn-btn {
  flex: 1;
  height: 38px;
  padding: 0;
  border: none;
  border-left: 1px solid var(--modal-border);
  border-radius: 0;
  background: transparent;
  color: var(--modal-text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.qn-btn:first-child {
  border-left: none;
}

.qn-btn:hover:not(:disabled) {
  background: var(--sidebar-nav-hover-bg);
  color: var(--text-primary);
}

.qn-btn-primary {
  background: var(--accent);
  color: #ffffff;
}

.qn-btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
  color: #ffffff;
}

.qn-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
