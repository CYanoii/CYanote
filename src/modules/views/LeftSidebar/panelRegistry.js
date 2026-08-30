/**
 * Panel Registry - Dynamic Panel Registration System
 *
 * Panels register themselves via registerPanel() with their metadata.
 * The sidebar discovers and renders registered panels dynamically.
 * Visibility settings are synced with config/settings.json.
 */
import { reactive, ref } from 'vue'

// Default panel definitions
const DEFAULT_PANELS = {
  search: {
    id: 'search',
    label: '搜索',
    icon: 'fas fa-search',
    component: () => import('./panels/SearchPanel.vue'),
    defaultVisible: true,
    cannotHide: true
  },
  tags: {
    id: 'tags',
    label: '所有标签',
    icon: 'fas fa-tags',
    component: () => import('./panels/TagsPanel.vue'),
    defaultVisible: true,
    cannotHide: true
  },
  archive: {
    id: 'archive',
    label: '归档',
    icon: 'fas fa-archive',
    component: () => import('./panels/ArchivePanel.vue'),
    defaultVisible: true
  },
  pages: {
    id: 'pages',
    label: '所有页面',
    icon: 'fas fa-layer-group',
    component: () => import('./panels/AllPagesPanel.vue'),
    defaultVisible: true
  },
  recent: {
    id: 'recent',
    label: '最近文件',
    icon: 'fas fa-history',
    component: () => import('./panels/RecentPanel.vue'),
    defaultVisible: true
  },
  outline: {
    id: 'outline',
    label: '大纲',
    icon: 'fas fa-list',
    component: () => import('./panels/OutlinePanel.vue'),
    defaultVisible: true
  },
  versions: {
    id: 'versions',
    label: '版本历史',
    icon: 'fas fa-code-branch',
    component: () => import('./panels/VersionsPanel.vue'),
    defaultVisible: true
  },
  trash: {
    id: 'trash',
    label: '回收站',
    icon: 'fas fa-trash-alt',
    component: () => import('./panels/TrashPanel.vue'),
    defaultVisible: true,
    cannotHide: true
  }
}

// Module-level registry (singleton)
const panelRegistry = new Map()

// Visibility state (synced with settings) - 使用 Vue reactive 以支持响应式更新
const panelVisibility = reactive({})

// 面板显示顺序（synced with settings）- 默认与注册顺序一致
const panelOrder = ref(Object.keys(DEFAULT_PANELS))

/**
 * 应用保存的面板顺序
 * 过滤无效 ID，并将在保存顺序之后新增注册的面板追加到末尾
 * @param {Array<string>} order 面板 ID 数组
 */
function applyPanelOrder(order) {
  if (!Array.isArray(order)) return
  const valid = order.filter(id => panelRegistry.has(id))
  const missing = Array.from(panelRegistry.keys()).filter(id => !valid.includes(id))
  panelOrder.value = [...valid, ...missing]
}

/**
 * 获取默认面板顺序
 * @returns {Array<string>} 面板 ID 数组
 */
function getDefaultPanelOrder() {
  return Object.keys(DEFAULT_PANELS)
}

/**
 * 获取默认面板可见性设置
 * @returns {Object} 面板ID到默认可见性的映射
 */
function getDefaultVisibilitySettings() {
  const settings = {}
  for (const [id, definition] of Object.entries(DEFAULT_PANELS)) {
    settings[id] = definition.defaultVisible
  }
  return settings
}

// Initialize registry with default panels
function initializeRegistry() {
  for (const [id, definition] of Object.entries(DEFAULT_PANELS)) {
    panelRegistry.set(id, {
      ...definition,
      isRegistered: true
    })
  }
  // Set default visibility
  for (const id of Object.keys(DEFAULT_PANELS)) {
    panelVisibility[id] = DEFAULT_PANELS[id].defaultVisible
  }
}

/**
 * Register a panel
 * @param {Object} panelDefinition - Panel definition object
 */
function registerPanel(panelDefinition) {
  const { id } = panelDefinition
  if (!id) {
    console.warn('[PanelRegistry] Panel registration requires an id')
    return
  }

  panelRegistry.set(id, {
    ...panelDefinition,
    isRegistered: true
  })
}

/**
 * Unregister a panel
 * @param {string} panelId - Panel ID to unregister
 */
function unregisterPanel(panelId) {
  panelRegistry.delete(panelId)
  delete panelVisibility[panelId]
}

/**
 * Get all registered panels (按当前显示顺序)
 * @returns {Array} Array of panel definitions
 */
function getAllPanels() {
  return panelOrder.value
    .map(id => panelRegistry.get(id))
    .filter(Boolean)
}

/**
 * Get visible panels (for nav menu)
 * @returns {Array} Array of visible panel definitions
 */
function getVisiblePanels() {
  return getAllPanels().filter(panel => panelVisibility[panel.id] !== false)
}

/**
 * Get panel definition by ID
 * @param {string} panelId - Panel ID
 * @returns {Object|undefined} Panel definition
 */
function getPanel(panelId) {
  return panelRegistry.get(panelId)
}

/**
 * Check if panel is visible
 * @param {string} panelId - Panel ID
 * @returns {boolean} Visibility state
 */
function isPanelVisible(panelId) {
  return panelVisibility[panelId] !== false
}

/**
 * Set panel visibility
 * @param {string} panelId - Panel ID
 * @param {boolean} visible - Visibility state
 */
function setPanelVisibility(panelId, visible) {
  panelVisibility[panelId] = visible
}

/**
 * Get all visibility settings (for saving to config)
 * @returns {Object} Visibility settings object
 */
function getVisibilitySettings() {
  return { ...panelVisibility }
}

/**
 * Set visibility and order from config/settings
 * @param {Object} config - Settings object from ConfigManager
 */
function setVisibilityFromConfig(config) {
  if (config && config.sidebarPanels) {
    for (const [id, visible] of Object.entries(config.sidebarPanels)) {
      panelVisibility[id] = visible
    }
  }
  if (config && config.sidebarPanelsOrder) {
    applyPanelOrder(config.sidebarPanelsOrder)
  }
}

/**
 * Check if a panel ID is registered
 * @param {string} panelId - Panel ID to check
 * @returns {boolean}
 */
function isPanelRegistered(panelId) {
  return panelRegistry.has(panelId)
}

// Initialize on module load
initializeRegistry()

export {
  panelRegistry,
  registerPanel,
  unregisterPanel,
  getAllPanels,
  getVisiblePanels,
  getPanel,
  isPanelVisible,
  isPanelRegistered,
  setPanelVisibility,
  getVisibilitySettings,
  setVisibilityFromConfig,
  applyPanelOrder,
  getDefaultPanelOrder,
  getDefaultVisibilitySettings,
  DEFAULT_PANELS
}