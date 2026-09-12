/**
 * 速记小窗管理器 - 只负责窗口与全局快捷键
 *
 * 与业务（笔记保存、配置写入）解耦：
 * - 通过 EventEmitter 对外发 'save'、'hotkey-change' 事件
 * - 持有草稿（关闭小窗后仍保留）
 * - 不直接依赖 NotesManager / ConfigManager
 */
const { app, BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');
const { EventEmitter } = require('events');

const DEFAULT_HOTKEY = 'Alt+Shift+Q';
const WINDOW_WIDTH = 300;
const WINDOW_HEIGHT = 420;

class QuickNoteManager extends EventEmitter {
  /**
   * @param {object} options
   * @param {boolean} options.isDev 是否开发环境
   */
  constructor({ isDev }) {
    super();
    this.isDev = !!isDev;

    this.window = null;
    this.draft = '';
    this.hotkey = DEFAULT_HOTKEY;
  }

  // 初始化：注册默认全局快捷键
  initialize() {
    this._registerHotkey(this.hotkey);
  }

  _registerHotkey(accelerator) {
    const ok = globalShortcut.register(accelerator, () => this.toggle());
    return ok;
  }

  /**
   * 修改全局快捷键。失败则回退到旧快捷键。
   * @returns {boolean} 是否注册成功
   */
  setHotkey(accelerator) {
    globalShortcut.unregister(this.hotkey);
    const ok = this._registerHotkey(accelerator);
    if (ok) {
      this.hotkey = accelerator;
      this.emit('hotkey-change', accelerator);
      return true;
    }
    // 恢复旧快捷键
    this._registerHotkey(this.hotkey);
    return false;
  }

  getHotkey() {
    return this.hotkey;
  }

  // 唤起速记小窗：已存在则显示并聚焦，否则创建
  toggle() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
      this.window.focus();
      return;
    }
    this._createWindow();
  }

  _createWindow() {
    // 默认出现在屏幕右侧偏上的位置
    const workArea = screen.getPrimaryDisplay().workArea;
    const x = workArea.x + workArea.width - WINDOW_WIDTH - 60;
    const y = workArea.y + Math.round(workArea.height * 0.18);

    this.window = new BrowserWindow({
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
      x,
      y,
      frame: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      icon: path.join(__dirname, '..', 'icon.ico'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '..', 'preload.js')
      }
    });

    if (this.isDev) {
      this.window.loadURL('http://localhost:5173/quicknote.html');
    } else {
      this.window.loadFile(path.join(__dirname, '..', 'dist_vue', 'quicknote.html'));
    }

    this.window.once('ready-to-show', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.show();
        this.window.focus();
      }
    });

    // 关闭时只隐藏，程序未退出前保留文本框内容
    this.window.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        this.hide();
      }
    });

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  hide() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  // ===== 草稿 =====
  getDraft() {
    return this.draft;
  }

  setDraft(text) {
    this.draft = text || '';
  }

  /**
   * 由渲染进程请求保存。Manager 不做实际落库，
   * 只发出 'save' 事件，由 orchestrator（handlers.js）处理。
   * @returns {Promise<boolean>} 监听者返回 true 表示保存成功
   */
  async requestSave(text) {
    const result = await this.emitAsync('save', text || '');
    return Boolean(result);
  }

  unregisterAll() {
    globalShortcut.unregisterAll();
  }
}

// EventEmitter 没有原生的 emit-async，这里加一个简单实现
QuickNoteManager.prototype.emitAsync = function (event, ...args) {
  const listeners = this.listeners(event);
  if (listeners.length === 0) return Promise.resolve(false);
  // 取第一个 listener 的返回值（约定只有一个）
  return Promise.resolve(listeners[0].apply(this, args));
};

module.exports = QuickNoteManager;