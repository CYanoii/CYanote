/**
 * 页面状态控制器
 * 管理页面状态的加载、保存和恢复
 */
import { EventTypes } from '../core/EventTypes.js';
import { debounce } from '../utils/helpers.js';

export class PageStateController {
    constructor(pageStateService, uiManager, eventBus) {
        this.pageStateService = pageStateService;
        this.uiManager = uiManager;
        this.eventBus = eventBus;

        // 当前页面状态缓存
        this.currentState = {
            sidebar: {
                isCollapsed: false,
                width: 280
            },
            secondaryPane: {
                isCollapsed: true,
                width: 360,
                noteId: null
            },
            openTabs: [],
            activeTabId: 'home'
        };

        // 是否正在恢复状态
        this.isRestoring = false;

        // 防抖保存函数
        this.debouncedSave = debounce(() => {
            if (!this.isRestoring) {
                this.saveState();
            }
        }, 500);

        this.initEventListeners();
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 侧边栏折叠状态变化
        this.eventBus.on(EventTypes.SIDEBAR.COLLAPSE_CHANGE, (isCollapsed) => {
            this.currentState.sidebar.isCollapsed = isCollapsed;
            this.debouncedSave();
        });

        // 侧边栏宽度变化
        this.eventBus.on(EventTypes.SIDEBAR.WIDTH_CHANGE, (width) => {
            this.currentState.sidebar.width = width;
            this.debouncedSave();
        });

        // 打开笔记
        this.eventBus.on(EventTypes.NOTE.OPEN, (note) => {
            if (!this.currentState.openTabs.includes(note.id)) {
                this.currentState.openTabs.push(note.id);
            }
            // 恢复时不更新 activeTabId
            if (!this.isRestoring) {
                this.currentState.activeTabId = note.id;
                this.debouncedSave();
            }
        });

        // 关闭笔记
        this.eventBus.on(EventTypes.NOTE.CLOSE, (noteId) => {
            this.currentState.openTabs = this.currentState.openTabs.filter(id => id !== noteId);
            // 如果关闭的是当前激活的标签，切换到首页
            if (this.currentState.activeTabId === noteId) {
                this.currentState.activeTabId = 'home';
            }
            this.debouncedSave();
        });

        // 标签页切换
        this.eventBus.on(EventTypes.EDITOR.TAB_SWITCH, (tabId) => {
            this.currentState.activeTabId = tabId;
            this.debouncedSave();
        });

        // 标签页顺序变化
        this.eventBus.on(EventTypes.TAB_BAR.ORDER_CHANGE, (order) => {
            this.currentState.openTabs = order;
            this.debouncedSave();
        });

        // 右侧副编辑区：折叠状态
        this.eventBus.on(EventTypes.SECONDARY_PANE.COLLAPSE_CHANGE, (isCollapsed) => {
            this.currentState.secondaryPane.isCollapsed = isCollapsed;
            this.debouncedSave();
        });

        // 右侧副编辑区：宽度
        this.eventBus.on(EventTypes.SECONDARY_PANE.WIDTH_CHANGE, (width) => {
            this.currentState.secondaryPane.width = width;
            this.debouncedSave();
        });

        // 右侧副编辑区：当前笔记
        this.eventBus.on(EventTypes.SECONDARY_PANE.NOTE_CHANGE, (noteId) => {
            this.currentState.secondaryPane.noteId = noteId || null;
            this.debouncedSave();
        });
    }

    /**
     * 加载页面状态
     */
    async loadState() {
        const state = await this.pageStateService.load();
        // 兼容：老版本保存的状态可能缺少新增字段（如 secondaryPane），
        // 补齐缺失的键，避免后续 COLLAPSE_CHANGE 等监听器写入 undefined 子对象
        if (!state.secondaryPane) {
            state.secondaryPane = { isCollapsed: true, width: 360, noteId: null };
        }
        this.currentState = state;
        return state;
    }

    /**
     * 保存页面状态
     */
    async saveState() {
        await this.pageStateService.save(this.currentState);
    }

    /**
     * 获取当前状态
     */
    getState() {
        return this.currentState;
    }

    /**
     * 恢复页面状态
     * @returns {Promise<{validNotes: Array, validNoteIds: Array, activeTabId: string, secondaryNoteId: string|null}>}
     */
    async restorePageState() {
        const state = await this.loadState();

        // 开始恢复，禁用保存
        this.isRestoring = true;

        // 恢复侧边栏状态
        if (state.sidebar) {
            if (state.sidebar.isCollapsed) {
                this.uiManager.leftSidebar_collapse();
            } else {
                this.uiManager.leftSidebar_expand();
            }
            if (state.sidebar.width) {
                this.uiManager.leftSidebar_setWidth(state.sidebar.width);
            }
        }

        // 恢复右侧副编辑区折叠/宽度（静默设置，不触发事件）
        let secondaryNoteId = null;
        if (state.secondaryPane) {
            const pane = state.secondaryPane;
            this.uiManager.secondaryPane._applyState({
                isCollapsed: typeof pane.isCollapsed === 'boolean' ? pane.isCollapsed : true,
                width: typeof pane.width === 'number' ? pane.width : 360
            });

            // 校验副区笔记有效性（若与主区标签重复则视为异常数据，去重处理）
            if (pane.noteId) {
                const note = await window.electronAPI.getNote(pane.noteId);
                if (note) {
                    // 若副区笔记 ID 同时出现在主区 openTabs 中（异常状态），过滤掉主区的重复
                    if (Array.isArray(state.openTabs) && state.openTabs.includes(pane.noteId)) {
                        state.openTabs = state.openTabs.filter(id => id !== pane.noteId);
                    }
                    secondaryNoteId = pane.noteId;
                }
            }
        }

        // 收集所有有效笔记
        const validNotes = [];
        const validNoteIds = [];
        if (state.openTabs && state.openTabs.length > 0) {
            for (const noteId of state.openTabs) {
                const note = await window.electronAPI.getNote(noteId);
                if (note) {
                    validNotes.push(note);
                    validNoteIds.push(noteId);
                }
            }
        }

        // 确定要切换到的标签页
        let activeTabId = state.activeTabId;
        if (!activeTabId || !validNoteIds.includes(activeTabId)) {
            activeTabId = 'home';
        }

        this.isRestoring = false;

        return { validNotes, validNoteIds, activeTabId, secondaryNoteId };
    }

    /**
     * 按照指定顺序重新排列标签页
     */
    reorderTabs(order) {
        // 如果 tabBar 还没挂载，等待一下再重试
        const tryReorder = (retries = 3) => {
            const tabBar = document.getElementById('tabBar');
            if (!tabBar) {
                if (retries > 0) {
                    setTimeout(() => tryReorder(retries - 1), 100);
                }
                return;
            }
            const homeTab = tabBar.querySelector('.tab[data-tab-id="home"]');

            // 从后往前插入，确保位置正确
            for (let i = order.length - 1; i >= 0; i--) {
                const noteId = order[i];
                const tab = tabBar.querySelector(`.tab[data-tab-id="${noteId}"]`);
                if (tab) {
                    tabBar.insertBefore(tab, homeTab.nextSibling);
                }
            }
        };

        tryReorder();
    }
}