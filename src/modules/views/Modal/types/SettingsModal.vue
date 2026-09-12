<script>
// ===== 作者吧台（模块作用域：应用运行期间持续出品，跨设置面板开关保持）=====
import { ref, computed, watch } from 'vue'

const BAR_INTERVAL = 10 * 60 * 1000 // 十分钟
const BAR_MAX = 6 // 吧台最多摆放的饮品数

const drinkMenu = [
  {
    name: '奶茶',
    emoji: '🧋',
    lines: [
      '咕嘟咕嘟——珍珠 Q 弹，好评！',
      '奶茶到手，bug 退散！',
      '半糖去冰，懂我！',
      '这杯下肚，需求再改十遍也不怕',
      '珍珠要多，烦恼要少',
      '吸到最后一颗珍珠，满足感拉满'
    ]
  },
  {
    name: '咖啡',
    emoji: '☕',
    lines: [
      '一口闷，灵感来了！',
      '这杯美式够苦，像极了我改 bug 时的心情',
      '咖啡因注入，编译速度 +50%',
      '今天的第三杯了，但不碍事',
      '浓缩才是精华，代码也是',
      '拉花不错，可惜我一口就没了'
    ]
  },
  {
    name: '果汁',
    emoji: '🧃',
    lines: [
      '今日份维 C 达标！',
      '酸酸甜甜，像写代码的日子',
      '鲜榨的就是不一样',
      '喝果汁的程序员，头发都多两根',
      '清爽！感觉还能再码三小时',
      '这杯敬所有没写文档的函数'
    ]
  },
  {
    name: '快乐水',
    emoji: '🥤',
    lines: [
      '快乐水入喉，快乐 +100',
      '嗝——这才是人生',
      '肥宅快乐水，越喝越快乐',
      '气泡在舌尖开 party！',
      '代码跑通了？值得来一杯庆祝',
      '冰的！必须是冰的！'
    ]
  },
  {
    name: '特调',
    emoji: '🍹',
    lines: [
      '这味道……有点上头',
      '调酒师是谁？出来挨夸！',
      '层次感丰富，像一个设计良好的架构',
      '微醺状态，写出来的代码都带着诗意',
      '今天的特调有夏天的味道',
      '干杯！敬每一个深夜跑通的测试'
    ]
  },
  {
    name: '冰块',
    emoji: '🧊',
    lines: [
      '……谢谢？我嚼冰块的样子很狼狈',
      '嘎嘣嘎嘣，解压是解压，就是牙有点累',
      '零卡路里，健康生活从我做起',
      '这是让我冷静冷静的意思吗',
      '冰块也算饮料？行吧，吧台出品必属精品',
      '含在嘴里等它化，感觉像在等编译完成'
    ]
  },
  {
    name: '柠檬水',
    emoji: '🍋',
    lines: [
      '酸到眯眼，但很上头',
      '维 C 加倍，bug 消退',
      '这酸爽，堪比三连报错',
      '夏日限定，清新一整天',
      '柠檬水里泡着的，是程序员的坚强',
      '多喝柠檬水，少写烂代码'
    ]
  },
  {
    name: '热可可',
    emoji: '🧉',
    lines: [
      '暖手又暖心，冬天标配',
      '巧克力的快乐，简单又直接',
      '棉花糖沉底了，可惜',
      '一口下去，寒意全消',
      '可可香浓，代码芬芳',
      '热可可配毛毯，写代码的最高礼仪'
    ]
  },
  {
    name: '椰奶',
    emoji: '🥥',
    lines: [
      '仿佛瞬间到了海边度假',
      '椰香浓郁，想给电脑也闻闻',
      '这杯让我忘了还有三个 deadline',
      '天然椰香，无添加的快乐',
      '喝完这杯，我就是岛上最靓的程序员',
      '椰奶配代码，热带风情开发法'
    ]
  },
  {
    name: '清茶',
    emoji: '🍵',
    lines: [
      '苦尽甘来，如同调试人生',
      '清茶一杯，杂念全消',
      '喝最淡的茶，写最稳的码',
      '茶香袅袅，思路清晰',
      '程序员到了一定年纪就会懂茶',
      '回甘悠长，好代码也是'
    ]
  },
  {
    name: '西瓜汁',
    emoji: '🍉',
    lines: [
      '夏天的快乐就是这么简单',
      '没有籽！这杯必须满分',
      '红彤彤的一杯，看着就喜庆',
      '一口下去，暑气全消',
      '西瓜自由，从这杯开始',
      '甜到心里，写码都有劲了'
    ]
  }
]

// 固定槽位：吧台上始终绘制 6 个深色槽位块，饮品占据其一
const barSlots = ref(Array(BAR_MAX).fill(null))
const barProgress = ref(0)
const barRemainingText = ref('下一杯 10:00')
const bubbleText = ref('')
const avatarCheering = ref(false)
let cycleStart = Date.now() // 当前制作周期的起点
let bubbleTimer = null

function pickRandomDrink() {
  return drinkMenu[Math.floor(Math.random() * drinkMenu.length)]
}

// 当前正在制作的饮品（周期开始时就确定，可供下拉预览）
const nextDrink = ref(pickRandomDrink())

function produceDrink() {
  const idx = barSlots.value.indexOf(null)
  if (idx === -1) return
  barSlots.value[idx] = { ...nextDrink.value, flying: false, flyX: '0px', flyY: '-100px' }
  nextDrink.value = pickRandomDrink()
}

// 以制作周期驱动：进度走满才出品；吧台满则不开启倒计时，直到腾出空位
function updateBar() {
  const now = Date.now()
  if (!barSlots.value.includes(null)) {
    cycleStart = now
    barProgress.value = 0
    barRemainingText.value = '正在等待空位'
    return
  }
  let cycleElapsed = now - cycleStart
  if (cycleElapsed >= BAR_INTERVAL) {
    produceDrink()
    cycleStart = now
    cycleElapsed = 0
  }
  barProgress.value = (cycleElapsed / BAR_INTERVAL) * 100
  const totalSec = Math.ceil((BAR_INTERVAL - cycleElapsed) / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  barRemainingText.value = `下一杯 ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 100ms 一跳，让进度条能真正走到满格再出品
setInterval(updateBar, 100)
updateBar()

// 特别饮品：打赏时上的心意特调
const specialDrink = {
  name: '心意特调',
  emoji: '🥂',
  lines: [
    '哇，这杯闪着光！味道一定不一般',
    '心意特调？我先干为敬！',
    '这杯里喝出了心意的味道，甜！',
    '特调中的特调，今天运气不错'
  ]
}

// 吧台是否有空位（打赏按钮据此切换形态）
const barFull = computed(() => !barSlots.value.includes(null))

// 打赏上饮料：把心意特调放到空位，附闪亮特效
function serveSpecialDrink() {
  const idx = barSlots.value.indexOf(null)
  if (idx === -1) return false
  barSlots.value[idx] = { ...specialDrink, flying: false, sparkling: true, flyX: '0px', flyY: '-100px' }
  return true
}

// 暂存在打赏按钮上的心意特调（收起二维码时吧台无空位）
const pendingSpecial = ref(false)

// 吧台腾出空位的第一时间，把暂存的特调摆上去
watch(barFull, (full) => {
  if (!full && pendingSpecial.value) {
    serveSpecialDrink()
    pendingSpecial.value = false
  }
})

// 点击吧台饮品：从所在槽位投掷向作者头像，附带一句吐槽
function throwDrink(item, index) {
  if (!item || item.flying) return
  // 计算槽位中心到头像中心的位移，让任意位置的饮品都飞向头像
  const slotEl = document.querySelectorAll('.bar-slot')[index]
  const avatarEl = document.querySelector('.about-avatar')
  if (slotEl && avatarEl) {
    const s = slotEl.getBoundingClientRect()
    const a = avatarEl.getBoundingClientRect()
    item.flyX = `${a.left + a.width / 2 - (s.left + s.width / 2)}px`
    item.flyY = `${a.top + a.height / 2 - (s.top + s.height / 2)}px`
  }
  item.flying = true
  setTimeout(() => {
    barSlots.value[index] = null
    bubbleText.value = item.lines[Math.floor(Math.random() * item.lines.length)]
    avatarCheering.value = true
    clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => {
      bubbleText.value = ''
      avatarCheering.value = false
    }, 3000)
  }, 600)
}
</script>

<script setup>
import { reactive, watch, ref, onMounted, onUnmounted } from 'vue'
import { getAllPanels, getVisibilitySettings, isPanelVisible, getDefaultPanelOrder, getDefaultVisibilitySettings } from '../../LeftSidebar/panelRegistry.js'
import { version as appVersion } from '../../../../../package.json'

const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'updatePath', 'selectFolder', 'clearPath'])

// 大纲导航
const outlineItems = [
  { id: 'theme', label: '主题' },
  { id: 'data-path', label: '数据目录' },
  { id: 'panels', label: '侧边栏面板' },
  { id: 'editor-style', label: '编辑器样式' },
  { id: 'quicknote', label: '速记' },
  { id: 'about', label: '关于作者' }
]
const activeOutlineId = ref('theme')

function scrollToSection(sectionId) {
  const el = document.getElementById(`settings-${sectionId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeOutlineId.value = sectionId
  }
}

// 面板可见性临时设置 - 仅在点击应用后生效
const availablePanels = ref(getAllPanels())
const tempPanelVisibility = reactive({ ...getVisibilitySettings() })

// 面板拖拽排序状态
const dragIndex = ref(null)
const dragOverIndex = ref(null)

function handleDragStart(index, event) {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

function handleDragOver(index, event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

function handleDrop(index) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const list = [...availablePanels.value]
  const [moved] = list.splice(dragIndex.value, 1)
  list.splice(index, 0, moved)
  availablePanels.value = list
}

function handleDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

// 恢复面板默认顺序与默认可见性
function handleRestorePanelDefaults() {
  const panelMap = new Map(availablePanels.value.map(p => [p.id, p]))
  availablePanels.value = getDefaultPanelOrder()
    .map(id => panelMap.get(id))
    .filter(Boolean)
  Object.assign(tempPanelVisibility, getDefaultVisibilitySettings())
}

// 字体样式设置
const fontOptions = [
  { value: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', label: '系统默认' },
  { value: '"Source Han Sans SC", "Noto Sans SC", sans-serif', label: '思源黑体' },
  { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '微软雅黑' },
  { value: 'KaiTi, "楷体", serif', label: '楷体' },
  { value: '"Courier New", Consolas, monospace', label: '等宽字体' },
  { value: '"Noto Serif SC", Songti SC, serif', label: '思源宋体' }
]

const defaultEditorStyle = {
  fontFamily: fontOptions[0].value,
  fontSize: 16,
  lineHeight: 1.8,
  paragraphSpacing: 16
}

const tempEditorStyle = reactive({ ...defaultEditorStyle })

// 主题设置
const defaultTheme = 'light'
const tempTheme = ref(defaultTheme)

// 监听 config 加载完成，更新主题值
watch(() => props.modal.config, (config) => {
  if (config) {
    tempTheme.value = config.theme || defaultTheme
  }
}, { immediate: true })

// 监听 config 加载完成，更新编辑器样式值
watch(() => props.modal.config, (config) => {
  if (config) {
    const savedStyle = config.editorStyle || {}
    tempEditorStyle.fontFamily = savedStyle.fontFamily || defaultEditorStyle.fontFamily
    tempEditorStyle.fontSize = savedStyle.fontSize || defaultEditorStyle.fontSize
    tempEditorStyle.lineHeight = savedStyle.lineHeight || defaultEditorStyle.lineHeight
    tempEditorStyle.paragraphSpacing = savedStyle.paragraphSpacing || defaultEditorStyle.paragraphSpacing
  }
}, { immediate: true })

function handlePanelVisibilityChange(panelId, event, cannotHide) {
  if (cannotHide) {
    // 强制保持开启状态
    event.target.checked = true
    return
  }
  tempPanelVisibility[panelId] = event.target.checked
}

function handleCancel() {
  emit('close', props.modal.id)
}

async function handleApply() {
  // 依次保存所有设置，确保每个都完成后再执行下一个
  await window.electronAPI.setConfig('sidebarPanels', { ...tempPanelVisibility })
  await window.electronAPI.setConfig('sidebarPanelsOrder', availablePanels.value.map(p => p.id))
  await window.electronAPI.setConfig('editorStyle', { ...tempEditorStyle })
  await window.electronAPI.setConfig('theme', tempTheme.value)
  await window.electronAPI.applyConfigAndReload('dataRootPath', props.modal.tempDataRootPath)
  emit('close', props.modal.id)
  // 数据目录变更后需要重新加载以使用新路径
  window.location.reload()
}

function handleRestoreDefaults() {
  Object.assign(tempEditorStyle, defaultEditorStyle)
}

async function handleSelectFolder() {
  const folderPath = await window.electronAPI.selectFolder()
  if (folderPath) {
    emit('updatePath', props.modal.id, folderPath)
  }
}

function handleClearPath() {
  emit('updatePath', props.modal.id, '')
}

// 关于作者 - 打赏二维码展开状态
const showDonate = ref(false)
// 自动出品按钮的下拉：查看正在制作的饮品
const showBrewing = ref(false)
const pendingShaking = ref(false)

// 速记快捷键
const defaultHotkey = 'Alt+Shift+Q'
const tempHotkey = ref(defaultHotkey)
const hotkeyRecording = ref(false)
const hotkeyError = ref('')

// 监听 config 加载完成，更新速记快捷键
watch(() => props.modal.config, (config) => {
  if (config) {
    tempHotkey.value = config.quickNoteHotkey || defaultHotkey
  }
}, { immediate: true })

const hotkeyParts = computed(() => tempHotkey.value.split('+'))

function startHotkeyRecording() {
  if (hotkeyRecording.value) return
  hotkeyRecording.value = true
  hotkeyError.value = ''
  window.addEventListener('keydown', captureHotkey, true)
}

function stopHotkeyRecording() {
  hotkeyRecording.value = false
  window.removeEventListener('keydown', captureHotkey, true)
}

// 录入新快捷键：Esc 取消，必须包含修饰键
async function captureHotkey(e) {
  e.preventDefault()
  e.stopPropagation()
  if (e.key === 'Escape') {
    stopHotkeyRecording()
    return
  }
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return

  const parts = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (parts.length === 0) {
    hotkeyError.value = '需包含 Ctrl / Alt / Shift 修饰键'
    return
  }
  const main = e.key === ' ' ? 'Space' : (e.key.length === 1 ? e.key.toUpperCase() : e.key)
  const accelerator = [...parts, main].join('+')

  const ok = await window.electronAPI.setQuickNoteHotkey(accelerator)
  if (ok) {
    tempHotkey.value = accelerator
  } else {
    hotkeyError.value = '该快捷键被占用，换一个试试'
  }
  stopHotkeyRecording()
}

// 恢复默认快捷键
async function handleRestoreHotkey() {
  stopHotkeyRecording()
  const ok = await window.electronAPI.setQuickNoteHotkey(defaultHotkey)
  if (ok) {
    tempHotkey.value = defaultHotkey
    hotkeyError.value = ''
  } else {
    hotkeyError.value = '默认快捷键被占用，恢复失败'
  }
}

// 个人资料资源：作者头像与打赏二维码（dataURL，空字符串表示未放置）
const avatarUrl = ref('')
const qrUrl = ref('')

async function loadProfileAssets() {
  try {
    const assets = await window.electronAPI.getProfileAssets()
    avatarUrl.value = assets.avatar || ''
    qrUrl.value = assets.donateQr || ''
  } catch {
    // 读取失败时保持默认占位
  }
}

// 打赏按钮：收起二维码时上心意特调；无空位则暂存到按钮上
function handleDonateClick() {
  if (showDonate.value && !serveSpecialDrink()) {
    pendingSpecial.value = true
  }
  showDonate.value = !showDonate.value
}

// 吧台满时按钮变为待上的饮品：点击摇晃示意这杯还没上
function handlePendingClick() {
  bubbleText.value = '吧台满啦！等腾出空位，这杯心意特调再上～'
  avatarCheering.value = true
  clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => {
    bubbleText.value = ''
    avatarCheering.value = false
  }, 2500)
  pendingShaking.value = false
  requestAnimationFrame(() => {
    pendingShaking.value = true
  })
}

// 监听滚动更新激活的大纲项
function handleScroll() {
  const content = document.querySelector('.settings-content')
  if (!content) return

  const scrollTop = content.scrollTop
  const sections = ['theme', 'data-path', 'panels', 'editor-style', 'quicknote', 'about']

  for (let i = sections.length - 1; i >= 0; i--) {
    const el = document.getElementById(`settings-${sections[i]}`)
    if (el && el.offsetTop <= scrollTop + 60) {
      activeOutlineId.value = sections[i]
      return
    }
  }
  activeOutlineId.value = sections[0]
}

onMounted(() => {
  const content = document.querySelector('.settings-content')
  if (content) {
    content.addEventListener('scroll', handleScroll)
  }
  loadProfileAssets()
})

onUnmounted(() => {
  const content = document.querySelector('.settings-content')
  if (content) {
    content.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('keydown', captureHotkey, true)
})
</script>

<template>
  <div class="settings-popover">
    <div class="settings-popover-header">
      <h3 class="settings-popover-title">设置</h3>
      <button class="settings-popover-close" @click="handleCancel">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="settings-popover-body">
      <!-- 左侧大纲导航 -->
      <nav class="settings-outline">
        <a
          v-for="item in outlineItems"
          :key="item.id"
          class="outline-item"
          :class="{ active: activeOutlineId === item.id }"
          :href="`#settings-${item.id}`"
          @click.prevent="scrollToSection(item.id)"
        >
          {{ item.label }}
        </a>
      </nav>

      <!-- 右侧设置内容 -->
      <div class="settings-content">
        <!-- 主题设置 -->
        <div id="settings-theme" class="settings-item settings-theme-item">
          <label class="settings-label">主题</label>
          <div class="theme-options">
            <label class="theme-option" :class="{ active: tempTheme === 'light' }">
              <input type="radio" v-model="tempTheme" value="light" />
              <div class="theme-preview theme-preview-light">
                <div class="preview-titlebar"></div>
                <div class="preview-sidebar"></div>
                <div class="preview-editor"></div>
              </div>
              <span class="theme-name">浅色主题</span>
            </label>
            <label class="theme-option" :class="{ active: tempTheme === 'dark' }">
              <input type="radio" v-model="tempTheme" value="dark" />
              <div class="theme-preview theme-preview-dark">
                <div class="preview-titlebar"></div>
                <div class="preview-sidebar"></div>
                <div class="preview-editor"></div>
              </div>
              <span class="theme-name">深色主题</span>
            </label>
          </div>
        </div>

        <!-- 数据目录设置 -->
        <div id="settings-data-path" class="settings-item" v-if="modal.config">
          <label class="settings-label">数据目录</label>
          <div class="settings-path-row">
            <input
              type="text"
              class="settings-path-input"
              :value="modal.tempDataRootPath"
              placeholder="留空使用默认路径"
              readonly
            >
            <button class="settings-select-btn" @click="handleSelectFolder">选择</button>
            <button class="settings-clear-btn" title="清除并使用默认路径" @click="handleClearPath">×</button>
          </div>
        </div>
        <div v-else class="settings-loading">加载中...</div>

        <!-- 侧边栏面板可见性与顺序设置 -->
        <div id="settings-panels" class="settings-item settings-panels-item">
          <div class="panels-header">
            <label class="settings-label">侧边栏面板</label>
            <button class="btn btn-restore-small" title="恢复默认" @click="handleRestorePanelDefaults">
              <i class="fas fa-undo"></i> 恢复默认
            </button>
          </div>
          <div class="settings-toggles">
                      <div
              v-for="(panel, index) in availablePanels"
              :key="panel.id"
              class="settings-toggle-row draggable-row"
              :class="{
                'cannot-hide-row': panel.cannotHide,
                'dragging': dragIndex === index,
                'drag-over': dragOverIndex === index && dragIndex !== index && dragIndex !== null
              }"
              draggable="true"
              @dragstart="handleDragStart(index, $event)"
              @dragover="handleDragOver(index, $event)"
              @drop="handleDrop(index)"
              @dragenter.prevent
              @dragend="handleDragEnd"
            >
              <span class="toggle-label">
                <i :class="panel.icon"></i>
                {{ panel.label }}
                <i v-if="panel.cannotHide" class="fas fa-lock lock-icon" title="无法隐藏"></i>
              </span>
              <label class="toggle-switch" :class="{ 'cannot-hide': panel.cannotHide }">
                <input
                  type="checkbox"
                  :checked="tempPanelVisibility[panel.id] !== false"
                  :disabled="panel.cannotHide"
                  @change="handlePanelVisibilityChange(panel.id, $event, panel.cannotHide)"
                >
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- 编辑器样式设置 -->
        <div id="settings-editor-style" class="settings-item settings-editor-style-item">
           <div class="style-settings">
            <div class="style-header">
              <span class="style-section-title">编辑器样式</span>
              <button class="btn btn-restore-small" @click="handleRestoreDefaults" title="恢复默认">
                <i class="fas fa-undo"></i> 恢复默认
              </button>
            </div>
            <!-- 字体选择 -->
            <div class="style-row">
              <span class="style-label">字体</span>
              <select v-model="tempEditorStyle.fontFamily" class="style-select" @click.stop>
                <option v-for="font in fontOptions" :key="font.value" :value="font.value">
                  {{ font.label }}
                </option>
              </select>
            </div>
            <!-- 字号 -->
            <div class="style-row">
              <span class="style-label">字号</span>
              <div class="style-range-group">
                <input
                  type="range"
                  v-model.number="tempEditorStyle.fontSize"
                  min="10"
                  max="30"
                  step="4"
                  class="style-range"
                >
                <span class="style-value">{{ tempEditorStyle.fontSize }}px</span>
              </div>
            </div>
            <!-- 行高 -->
            <div class="style-row">
              <span class="style-label">行高</span>
              <div class="style-range-group">
                <input
                  type="range"
                  v-model.number="tempEditorStyle.lineHeight"
                  min="1"
                  max="3"
                  step="0.4"
                  class="style-range"
                >
                <span class="style-value">{{ tempEditorStyle.lineHeight }}</span>
              </div>
            </div>
            <!-- 段落间距 -->
            <div class="style-row">
              <span class="style-label">段落间距</span>
              <div class="style-range-group">
                <input
                  type="range"
                  v-model.number="tempEditorStyle.paragraphSpacing"
                  min="10"
                  max="30"
                  step="4"
                  class="style-range"
                >
                 <span class="style-value">{{ tempEditorStyle.paragraphSpacing }}px</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 速记设置 -->
        <div id="settings-quicknote" class="settings-item settings-quicknote-item">
          <div class="style-settings">
            <div class="style-header">
              <span class="style-section-title">速记</span>
              <button class="btn btn-restore-small" title="恢复默认 Alt+Shift+Q" @click="handleRestoreHotkey">
                <i class="fas fa-undo"></i> 恢复默认
              </button>
            </div>
            <div class="style-row">
              <span class="style-label">快捷键</span>
              <div class="hotkey-group">
                <div class="hotkey-keys">
                  <kbd v-for="part in hotkeyParts" :key="part">{{ part }}</kbd>
                </div>
                <button
                  class="settings-select-btn hotkey-edit-btn"
                  :class="{ recording: hotkeyRecording }"
                  @click="startHotkeyRecording"
                >
                  {{ hotkeyRecording ? '按下新快捷键…' : '修改' }}
                </button>
              </div>
            </div>
            <div class="hotkey-hint" :class="{ error: hotkeyError }">
              {{ hotkeyError || '在任意界面按下快捷键唤起速记小窗，录入时按 Esc 取消' }}
            </div>
          </div>
        </div>

        <!-- 关于作者 -->
        <div id="settings-about" class="settings-item settings-about-item">
          <label class="settings-label">关于作者</label>
          <div class="about-card">
            <div class="about-hero">
              <div class="about-avatar" :class="{ cheering: avatarCheering }">
                <img v-if="avatarUrl" :src="avatarUrl" alt="CYanoii" class="about-avatar-img">
                <i v-else class="fas fa-user-astronaut"></i>
              </div>
              <transition name="bubble">
                <div v-if="bubbleText" class="author-bubble">{{ bubbleText }}</div>
              </transition>
            </div>
            <div class="about-name">CYanoii</div>
            <div class="about-tagline">热爱饮料的开发者</div>
            <span class="about-email">
              <i class="fas fa-envelope"></i> CYHei_mu@163.com
            </span>

            <!-- 作者的吧台：每 10 分钟随机出品一杯，点击投掷给作者 -->
            <div class="drink-shelf">
              <div class="bar-counter">
                <div class="bar-slots">
                  <span v-for="(slot, i) in barSlots" :key="i" class="bar-slot">
                    <span
                      v-if="slot"
                      class="bar-drink"
                      :class="{ flying: slot.flying, sparkling: slot.sparkling }"
                      :style="slot.flying ? { '--fly-x': slot.flyX, '--fly-y': slot.flyY } : null"
                      :title="`把这杯${slot.name}丢给作者`"
                      @click="throwDrink(slot, i)"
                    >{{ slot.emoji }}</span>
                  </span>
                </div>
                <div class="bar-top"></div>
                <div class="bar-wall"></div>
              </div>
            </div>

            <!-- 两种上饮料方式：自动出品（饼图进度） / 打赏特调 -->
            <div class="serve-row">
              <div class="serve-chip" title="查看正在制作的饮品" @click="showBrewing = !showBrewing">
                <span class="pie" :style="{ '--progress': barProgress }"></span>
                <span class="serve-chip-text">{{ barRemainingText }}</span>
                <i class="fas fa-chevron-down donate-arrow" :class="{ open: showBrewing }"></i>
              </div>
              <button
                v-if="!pendingSpecial"
                class="donate-btn"
                @click="handleDonateClick"
              >
                <i class="fas fa-glass-martini-alt"></i>
                <span class="donate-text">{{ showDonate ? '感谢投喂：D' : '请作者喝一杯' }}</span>
                <i class="fas fa-chevron-down donate-arrow" :class="{ open: showDonate }"></i>
              </button>
              <button
                v-else
                class="donate-btn donate-pending"
                :class="{ shaking: pendingShaking }"
                title="吧台已满，暂时无法上这杯"
                @click="handlePendingClick"
              >
                <span class="pending-drink">{{ specialDrink.emoji }}</span>
                <span class="donate-text">这杯还没上哦</span>
                <i class="fas fa-chevron-down donate-arrow"></i>
              </button>
            </div>

            <!-- 下拉查看正在制作的饮品 -->
            <div v-show="showBrewing" class="brewing-area">
              <span class="brewing-drink">{{ nextDrink.emoji }}</span>
              <span>{{ barFull ? '排队等位：' : '正在制作：' }}{{ nextDrink.name }}</span>
            </div>

            <div v-show="showDonate" class="donate-area">
              <div class="qr-placeholder" :class="{ 'has-image': qrUrl }">
                <img v-if="qrUrl" :src="qrUrl" alt="打赏二维码">
                <template v-else>
                  <i class="fas fa-qrcode"></i>
                  <span>二维码预留位</span>
                </template>
              </div>
            </div>

            <div class="about-footer">
              <span>CYanote v{{ appVersion }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="settings-popover-footer">
      <button class="btn btn-primary settings-apply-btn" @click="handleApply">应用</button>
    </div>
  </div>
</template>

<style scoped>
.settings-popover {
  position: relative;
  width: 800px;
  height: 600px;
  background: var(--modal-bg);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 10001;
  overflow: hidden;
  animation: popoverFadeIn 0.2s ease;
  display: flex;
  flex-direction: column;
}

@keyframes popoverFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.settings-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--modal-header-bg);
  border-bottom: 1px solid var(--modal-border);
}

.settings-popover-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--modal-text);
}

.settings-popover-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--modal-text-secondary);
}

.settings-popover-close:hover {
  color: var(--modal-text);
}

.settings-popover-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.settings-outline {
  width: 140px;
  flex-shrink: 0;
  padding: 16px 12px;
  border-right: 1px solid var(--modal-border);
  overflow-y: auto;
}

.outline-item {
  display: block;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--modal-text-muted);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.outline-item:hover {
  background: var(--tag-filter-item-hover-bg);
  color: var(--modal-text);
}

.outline-item.active {
  background: var(--tag-filter-selected-bg);
  color: var(--accent);
  font-weight: 500;
}

.settings-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.settings-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--modal-text-secondary);
  margin-bottom: 8px;
  display: block;
}

.settings-path-row {
  display: flex;
  gap: 8px;
}

.settings-path-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--modal-border);
  border-radius: 4px;
  font-size: 14px;
  color: var(--modal-text-secondary);
  background: var(--tag-filter-item-bg);
}

.settings-select-btn {
  padding: 8px 16px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--tag-filter-selected-bg);
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
}

.settings-select-btn:hover {
  background: var(--tag-filter-item-hover-bg);
}

.settings-clear-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--tag-filter-blocked-color);
  border-radius: 4px;
  background: var(--tag-filter-blocked-bg);
  color: var(--tag-filter-blocked-color);
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
}

.settings-clear-btn:hover {
  background: var(--tag-filter-blocked-bg);
}

/* 速记快捷键 */
.hotkey-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hotkey-keys {
  display: flex;
  gap: 6px;
}

.hotkey-keys kbd {
  padding: 4px 10px;
  border: 1px solid var(--modal-border);
  border-bottom-width: 2px;
  border-radius: 6px;
  background: var(--tag-filter-item-bg);
  color: var(--modal-text-secondary);
  font-size: 12px;
  font-family: inherit;
}

.hotkey-edit-btn {
  padding: 6px 14px;
  font-size: 13px;
  font-family: inherit;
}

.hotkey-edit-btn.recording {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  animation: hotkeyPulse 1.2s ease-in-out infinite;
}

@keyframes hotkeyPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.65; }
}

.hotkey-hint {
  font-size: 12px;
  color: var(--modal-text-muted);
}

.hotkey-hint.error {
  color: var(--toast-error-color);
}

.settings-popover-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--modal-border);
}

.settings-loading {
  text-align: center;
  padding: 20px;
  color: var(--modal-text-muted);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

/* 面板可见性设置样式 */
.settings-panels-item {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--modal-border);
}

.panels-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.panels-header .settings-label {
  margin-bottom: 0;
}

/* 整行可拖拽 */
.settings-toggle-row.draggable-row {
  cursor: grab;
}

.settings-toggle-row.draggable-row:active {
  cursor: grabbing;
}

/* 开关区域保持指针光标 */
.draggable-row .toggle-switch {
  cursor: pointer;
}

.settings-toggle-row.dragging {
  opacity: 0.4;
}

/* 拖拽悬停时在下方显示插入位置指示线 */
.settings-toggle-row.drag-over {
  box-shadow: 0 2px 0 var(--accent);
}

.settings-toggles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--tag-filter-item-bg);
  border-radius: 6px;
}

.settings-toggle-row:hover {
  background: var(--tag-filter-item-hover-bg);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--modal-text-secondary);
}

.toggle-label i {
  width: 16px;
  color: var(--modal-text-muted);
}

.toggle-label .lock-icon {
  margin-left: 4px;
  color: var(--modal-text-muted);
  font-size: 12px;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--modal-text-muted);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--accent);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* 无法隐藏的面板样式 */
.toggle-switch.cannot-hide .toggle-slider {
  background-color: var(--accent);
  cursor: not-allowed;
}

.toggle-switch.cannot-hide .toggle-slider:before {
  background-color: var(--tag-filter-selected-bg);
}

.settings-toggle-row.cannot-hide-row {
  opacity: 0.7;
  background: var(--tag-filter-selected-bg);
}

/* 编辑器样式设置 */
.settings-editor-style-item {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--modal-border);
}

.settings-quicknote-item {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--modal-border);
}

.style-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--tag-filter-bg);
  padding: 16px;
  border-radius: 8px;
}

.style-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.style-section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--modal-text-secondary);
}

.style-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.style-label {
  font-size: 14px;
  color: var(--modal-text-secondary);
  min-width: 80px;
}

.style-select {
  padding: 8px 12px;
  border: 1px solid var(--modal-border);
  border-radius: 4px;
  font-size: 14px;
  color: var(--modal-text);
  background: var(--modal-bg);
  min-width: 160px;
  cursor: pointer;
}

.style-select:focus {
  outline: none;
  border-color: var(--accent);
}

.style-range-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.style-range {
  width: 180px;
  height: 6px;
  border-radius: 3px;
  background: var(--modal-border);
  cursor: pointer;
  -webkit-appearance: none;
}

.style-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.style-value {
  font-size: 13px;
  color: var(--modal-text-muted);
  min-width: 45px;
  text-align: right;
}

.btn-restore-small {
  background: transparent;
  border: 1px solid var(--modal-border);
  color: var(--modal-text-muted);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-restore-small:hover {
  background: var(--tag-filter-item-hover-bg);
  border-color: var(--tag-filter-item-hover-border);
  color: var(--modal-text);
}

.btn-restore-small i {
  font-size: 11px;
}

/* 主题设置样式 */
.settings-theme-item {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--modal-border);
}

.theme-options {
  display: flex;
  gap: 16px;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.theme-option input {
  display: none;
}

.theme-preview {
  width: 120px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--modal-border);
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.theme-preview-light {
  background: #f7fafc;
}

.theme-preview-light .preview-titlebar {
  height: 10px;
  background: #e8ecf0;
  border-bottom: 1px solid #d0d7de;
}

.theme-preview-light .preview-sidebar {
  width: 30px;
  background: #edf2f7;
  flex: 1;
  border-right: 1px solid #d0d7de;
}

.theme-preview-light .preview-content {
  flex: 2;
  background: #ffffff;
}

.theme-preview-dark {
  background: #1e1e1e;
}

.theme-preview-dark .preview-titlebar {
  height: 10px;
  background: #323232;
  border-bottom: 1px solid #4a5568;
}

.theme-preview-dark .preview-sidebar {
  width: 30px;
  background: #222222;
  flex: 1;
  border-right: 1px solid #4a5568;
}

.theme-preview-dark .preview-content {
  flex: 2;
  background: #1e1e1e;
}

.theme-option.active .theme-preview {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.3);
}

.theme-name {
  font-size: 13px;
  color: var(--modal-text-secondary);
}

.theme-option.active .theme-name {
  color: var(--accent);
  font-weight: 500;
}

/* 关于作者 */
.settings-about-item {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--modal-border);
}

.about-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: var(--tag-filter-bg);
  padding: 24px 20px 10px;
  border-radius: 8px;
}

.about-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover, var(--accent)));
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
  overflow: hidden;
}

.about-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.about-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--modal-text);
}

.about-tagline {
  font-size: 13px;
  color: var(--modal-text-muted);
}

.about-email {
  font-size: 12px;
  color: var(--modal-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 作者头像与对话气泡 */
.about-hero {
  position: relative;
  display: flex;
  align-items: center;
}

.about-avatar.cheering {
  animation: avatarCheer 0.5s ease;
}

@keyframes avatarCheer {
  0%, 100% { transform: rotate(0) scale(1); }
  25% { transform: rotate(-10deg) scale(1.1); }
  75% { transform: rotate(8deg) scale(1.05); }
}

.author-bubble {
  position: absolute;
  left: calc(100% + 14px);
  top: 50%;
  transform: translateY(-50%);
  min-width: 160px;
  max-width: 300px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  white-space: normal;
  z-index: 1;
}

/* 气泡小尾巴指向头像 */
.author-bubble::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-right-color: var(--accent);
  border-left: none;
}

.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(-6px);
}

/* 作者的吧台 */
.drink-shelf {
  width: 100%;
  margin-top: 6px;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* 吧台：上下组合色块，上为浅色台面、下为深色台壁 */
.bar-counter {
  width: 100%;
  padding-top: 6px;
}

/* 槽位排探入台面 10px，饮品底部落在台面之上，不被完全包裹 */
.bar-slots {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: -10px;
  position: relative;
  z-index: 1;
}

.bar-slot {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
}

/* 位置标记（即阴影）：默认很浅，仅标示空位；有饮品后加深 */
.bar-slot::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 7px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  transition: background 0.3s;
}

/* 投掷中的饮品不计入：点击飞出的瞬间阴影即恢复为浅色 */
.bar-slot:has(.bar-drink:not(.flying))::after {
  background: rgba(0, 0, 0, 0.3);
}

/* 上部浅色台面：清透的淡蓝色 */
.bar-top {
  height: 16px;
  background: color-mix(in srgb, var(--accent) 22%, var(--modal-bg));
  border-radius: 4px 4px 0 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

/* 下部深色台壁：偏浅的蓝，仅最下方一小段淡出 */
.bar-wall {
  height: 28px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--accent-hover) 45%, var(--modal-bg)) 0%,
    color-mix(in srgb, var(--accent-hover) 45%, var(--modal-bg)) 78%,
    transparent 100%
  );
  box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.1);
}

.bar-drink {
  position: relative;
  z-index: 1;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s;
}

.bar-drink:hover {
  transform: translateY(-3px) scale(1.15);
}

.bar-drink.flying {
  z-index: 3;
  /* 提高优先级，确保投掷动画覆盖闪亮特效动画 */
  animation: drinkFly 0.6s ease-in forwards;
  pointer-events: none;
}

/* 闪亮饮品被投掷时，飞行动画同样生效 */
.bar-drink.sparkling.flying {
  animation: drinkFly 0.6s ease-in forwards;
}

/* 投掷轨迹：沿 --fly-x/--fly-y 飞向作者头像，旋转并缩小没入头像 */
@keyframes drinkFly {
  0% { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
  60% {
    transform: translate(calc(var(--fly-x, 0px) * 0.6), calc(var(--fly-y, -100px) * 0.6 - 20px)) rotate(360deg) scale(0.85);
    opacity: 1;
  }
  100% { transform: translate(var(--fly-x, 0px), var(--fly-y, -100px)) rotate(720deg) scale(0.4); opacity: 0; }
}

/* 两种上饮料方式：自动出品进度 + 打赏特调，并排 */
.serve-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

/* 自动出品：饼图与倒计时合并的按钮，可下拉查看正在制作的饮品 */
.serve-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* 与打赏按钮保持一致的固定尺寸，文字切换不改变大小 */
  width: 140px;
  height: 34px;
  box-sizing: border-box;
  /* 左右图标向中间靠拢 */
  padding: 0 10px;
  border: 1px solid var(--modal-border);
  border-radius: 20px;
  font-size: 12px;
  /* 与"这杯还没上"文字颜色一致 */
  color: var(--modal-text-muted);
  cursor: pointer;
  transition: border-color 0.2s;
}

.serve-chip:hover {
  border-color: var(--accent);
}

/* 饼图位置固定，文字在中间区域居中 */
.serve-chip-text {
  flex: 1;
  text-align: center;
  /* 修正字体行盒造成的视觉下沉 */
  line-height: 1;
}

/* 下拉箭头与饼图等宽，保证文字相对按钮整体居中 */
.serve-chip .donate-arrow {
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.pie {
  position: relative;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  background: conic-gradient(var(--accent) calc(var(--progress) * 1%), var(--modal-border) 0);
}

/* 镂空成环形 */
.pie::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: var(--tag-filter-bg);
}

/* 打赏特调的闪亮特效：金色呼吸光晕 */
.bar-drink.sparkling {
  animation: sparkleGlow 1.2s ease-in-out infinite;
}

@keyframes sparkleGlow {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 200, 60, 0.8)); }
  50% { filter: drop-shadow(0 0 8px rgba(255, 200, 60, 1)); }
}

/* 打赏区域 */
.donate-btn {
  /* 与自动出品按钮保持一致的固定尺寸，文字切换不改变大小 */
  width: 140px;
  height: 34px;
  box-sizing: border-box;
  /* 左右图标向中间靠拢 */
  padding: 0 10px;
  border: 1px solid var(--accent);
  border-radius: 20px;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  /* button 元素默认使用 UA 字体，需继承页面字体才与 serve-chip 一致 */
  font-family: inherit;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background 0.2s, color 0.2s;
}

/* 两侧图标固定在等宽槽位，位置不随文字变化 */
.donate-btn i,
.donate-btn .pending-drink {
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

/* 文字占据中间区域居中 */
.donate-text {
  flex: 1;
  text-align: center;
  /* 修正字体行盒造成的视觉下沉 */
  line-height: 1;
}

.donate-btn:hover {
  background: var(--accent);
  color: #fff;
}

/* 吧台满时：按钮变为待上的饮品 */
.donate-pending,
.donate-pending:hover {
  border-color: var(--modal-border);
  background: transparent;
  color: var(--modal-text-muted);
}

.pending-drink {
  font-size: 15px;
}

.donate-pending.shaking {
  animation: pendingShake 0.4s ease;
}

@keyframes pendingShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  50% { transform: translateX(4px); }
  75% { transform: translateX(-3px); }
}

/* 下拉查看正在制作的饮品 */
.brewing-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 0 2px;
  font-size: 12px;
  color: var(--modal-text-muted);
  animation: donateFadeIn 0.25s ease;
}

/* 饮品左右摇摆，像在摇杯中调制 */
.brewing-drink {
  font-size: 18px;
  animation: brewingWobble 1.2s ease-in-out infinite;
}

@keyframes brewingWobble {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(8deg); }
}

.donate-arrow {
  font-size: 11px;
  transition: transform 0.2s;
}

.donate-arrow.open {
  transform: rotate(180deg);
}

.donate-area {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 8px 0 4px;
  animation: donateFadeIn 0.25s ease;
}

@keyframes donateFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.qr-placeholder {
  width: 120px;
  height: 120px;
  border: 2px dashed var(--modal-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--modal-text-muted);
  overflow: hidden;
}

.qr-placeholder i {
  font-size: 32px;
  opacity: 0.5;
}

.qr-placeholder span {
  font-size: 12px;
}

/* 已放置二维码图片时，去掉虚线占位样式 */
.qr-placeholder.has-image {
  border-style: solid;
  border-width: 1px;
}

.qr-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.about-footer {
  margin-top: 6px;
  font-size: 12px;
  color: var(--modal-text-muted);
}
</style>