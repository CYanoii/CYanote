/**
 * IPC 处理器 - 注册所有 IPC 通信
 */
const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const NotesManager = require('./NotesManager');
const TagsManager = require('./TagsManager');
const ConfigManager = require('./ConfigManager');
const StickyManager = require('./StickyManager');
const QuickNoteManager = require('./QuickNoteManager');

let notesManager;
let tagsManager;
let configManager;
let stickyManager;
let quickNoteManager;

async function setupIpcHandlers(options = {}) {
  // 初始化配置管理器
  configManager = new ConfigManager();
  await configManager.initialize();

  // 获取数据根目录并初始化数据管理器
  const dataRootPath = configManager.getDataRootPath();

  notesManager = new NotesManager(dataRootPath);
  tagsManager = new TagsManager(dataRootPath);
  stickyManager = new StickyManager(dataRootPath);

  await notesManager.initialize();
  await tagsManager.initialize();

  // 速记小窗管理器（只管窗口与全局快捷键）
  quickNoteManager = new QuickNoteManager({
    isDev: !!options.isDev
  });

  // 业务编排：Manager 发事件，handlers 串接 NotesManager / ConfigManager
  quickNoteManager.on('save', async (text) => {
    const content = (text || '').trim();
    if (!content) return false;
    const metadata = await notesManager.createNote('速记', 'note');
    const excerpt = content.replace(/\s+/g, ' ').slice(0, 50);
    await notesManager.updateNote(metadata.id, { excerpt, content });
    if (options.getMainWindow) {
      const mainWindow = options.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('quicknote:saved', metadata.id);
      }
    }
    return true;
  });

  quickNoteManager.on('hotkey-change', async (accelerator) => {
    await configManager.set('quickNoteHotkey', accelerator);
  });

  quickNoteManager.initialize();

  // ===== 配置操作 =====
  ipcMain.handle('config:get', async () => {
    return configManager.getAll();
  });

  ipcMain.handle('config:set', async (event, key, value) => {
    await configManager.set(key, value);
    return true;
  });

  // 应用配置并重新加载数据管理器
  ipcMain.handle('config:applyAndReload', async (event, key, value) => {
    // 更新配置
    await configManager.set(key, value);

    // 重新初始化数据管理器
    const newDataRootPath = configManager.getDataRootPath();

    // 重新创建管理器实例
    notesManager = new NotesManager(newDataRootPath);
    tagsManager = new TagsManager(newDataRootPath);

    // 等待初始化完成
    await notesManager.initialize();
    await tagsManager.initialize();

    return true;
  });

  // ===== 文件夹选择对话框 =====
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled) {
      return null;
    }
    return result.filePaths[0];
  });

  // ===== 页面状态操作 =====
  ipcMain.handle('pageState:load', async () => {
    const pageStateFile = path.join(configManager.getDataRootPath(), 'page-state.json');
    try {
      const data = await fs.readFile(pageStateFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // 文件不存在，返回默认状态
      return {
        sidebar: { isCollapsed: false, width: 280 },
        secondaryPane: { isCollapsed: true, width: 360, noteId: null },
        openTabs: [],
        activeTabId: 'home'
      };
    }
  });

  ipcMain.handle('pageState:save', async (event, state) => {
    const pageStateFile = path.join(configManager.getDataRootPath(), 'page-state.json');
    await fs.writeFile(pageStateFile, JSON.stringify(state, null, 2), 'utf-8');
    return true;
  });

  // ===== 笔记操作 =====
  // 创建笔记
  ipcMain.handle('notes:create', async (event, pageType = 'note') => {
    return await notesManager.createNote('', pageType);
  });

  // 获取所有笔记
  ipcMain.handle('notes:getAll', async () => {
    return await notesManager.getAllNotes();
  });

  // 获取最近笔记
  ipcMain.handle('notes:getRecent', async (event, limit = 10) => {
    return await notesManager.getRecentNotes(limit);
  });

  // 获取单个笔记
  ipcMain.handle('notes:get', async (event, noteId) => {
    return await notesManager.getNote(noteId);
  });

  // 更新笔记
  ipcMain.handle('notes:update', async (event, noteId, updates) => {
    return await notesManager.updateNote(noteId, updates);
  });

  // 删除笔记
  ipcMain.handle('notes:delete', async (event, noteId) => {
    await notesManager.deleteNote(noteId);
    return true;
  });

  // 搜索笔记
  ipcMain.handle('notes:search', async (event, query) => {
    return await notesManager.searchNotes(query);
  });

  // ===== 回收站操作 =====
  // 获取回收站笔记
  ipcMain.handle('notes:getTrashed', async () => {
    return await notesManager.getTrashedNotes();
  });

  // 移入回收站
  ipcMain.handle('notes:moveToTrash', async (event, noteId) => {
    await notesManager.moveToTrash(noteId);
    return true;
  });

  // 从回收站恢复
  ipcMain.handle('notes:restoreFromTrash', async (event, noteId) => {
    await notesManager.restoreFromTrash(noteId);
    return true;
  });

  // 永久删除
  ipcMain.handle('notes:deletePermanently', async (event, noteId) => {
    await notesManager.deletePermanently(noteId);
    return true;
  });

  // ===== 发布/版本管理 =====
  // 发布笔记
  ipcMain.handle('notes:publish', async (event, noteId, versionNote) => {
    return await notesManager.publishNote(noteId, versionNote);
  });

  // 放弃编辑
  ipcMain.handle('notes:abandonEdits', async (event, noteId) => {
    return await notesManager.abandonEdits(noteId);
  });

  // 恢复编辑
  ipcMain.handle('notes:restoreToEditing', async (event, noteId) => {
    return await notesManager.restoreToEditing(noteId);
  });

  // 获取版本历史
  ipcMain.handle('notes:getVersionHistory', async (event, noteId) => {
    return await notesManager.getVersionHistory(noteId);
  });

  // 获取指定版本内容
  ipcMain.handle('notes:getVersion', async (event, noteId, version) => {
    return await notesManager.getVersion(noteId, version);
  });

  // 回滚到指定版本
  ipcMain.handle('notes:rollback', async (event, noteId, targetVersion) => {
    return await notesManager.rollbackToVersion(noteId, targetVersion);
  });

  // 保存资源文件
  ipcMain.handle('notes:saveAsset', async (event, noteId, fileName, fileData) => {
    return await notesManager.saveAsset(noteId, fileName, fileData);
  });

  // ===== 个人资料资源 =====
  // 存储结构：<项目根目录>/assets/profile/avatar.{png|jpg|jpeg|webp} 作者头像
  //                         <项目根目录>/assets/profile/donate-qr.{png|jpg|jpeg|webp} 打赏二维码
  ipcMain.handle('assets:getProfile', async () => {
    const profileDir = path.join(__dirname, '..', 'assets', 'profile');

    const result = { avatar: null, donateQr: null };
    const exts = ['png', 'jpg', 'jpeg', 'webp'];
    const mimes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

    for (const [key, baseName] of Object.entries({ avatar: 'avatar', donateQr: 'donate-qr' })) {
      for (const ext of exts) {
        try {
          const buf = await fs.readFile(path.join(profileDir, `${baseName}.${ext}`));
          result[key] = `data:${mimes[ext]};base64,${buf.toString('base64')}`;
          break;
        } catch {
          // 该扩展名不存在，尝试下一个
        }
      }
    }
    return result;
  });

  // ===== 标签操作 =====
  // 获取所有标签
  ipcMain.handle('tags:getAll', async () => {
    return await tagsManager.getAllTags();
  });

  // 创建标签
  ipcMain.handle('tags:create', async (event, name, color) => {
    return await tagsManager.createTag(name, color);
  });

  // 更新标签
  ipcMain.handle('tags:update', async (event, tagId, updates) => {
    return await tagsManager.updateTag(tagId, updates);
  });

  // 删除标签
  ipcMain.handle('tags:delete', async (event, tagId) => {
    await tagsManager.deleteTag(tagId);
    return true;
  });

  // ===== 便签操作 =====
  // 获取便签墙的所有便签
  ipcMain.handle('stickies:get', async (event, stickyPageId) => {
    return await stickyManager.getStickies(stickyPageId);
  });

  // 创建便签
  ipcMain.handle('stickies:create', async (event, stickyPageId, data) => {
    return await stickyManager.createSticky(stickyPageId, data);
  });

  // 更新便签
  ipcMain.handle('stickies:update', async (event, stickyPageId, stickyId, updates) => {
    return await stickyManager.updateSticky(stickyPageId, stickyId, updates);
  });

  // 删除便签
  ipcMain.handle('stickies:delete', async (event, stickyPageId, stickyId) => {
    await stickyManager.deleteSticky(stickyPageId, stickyId);
    return true;
  });

  // 将便签置于顶层
  ipcMain.handle('stickies:bringToFront', async (event, stickyPageId, stickyId) => {
    return await stickyManager.bringToFront(stickyPageId, stickyId);
  });

  // 归档便签
  ipcMain.handle('stickies:archive', async (event, stickyPageId, stickyId) => {
    return await stickyManager.archiveSticky(stickyPageId, stickyId);
  });

  // 取消归档便签
  ipcMain.handle('stickies:unarchive', async (event, stickyPageId, stickyId) => {
    return await stickyManager.unarchiveSticky(stickyPageId, stickyId);
  });

  // 获取已归档便签
  ipcMain.handle('stickies:getArchived', async (event, stickyPageId) => {
    return await stickyManager.getArchivedStickies(stickyPageId);
  });

  // ===== 速记小窗 =====
  // 获取草稿（关闭小窗后内容仍保留）
  ipcMain.handle('quicknote:getDraft', () => {
    return quickNoteManager.getDraft();
  });

  // 同步草稿到主进程内存
  ipcMain.handle('quicknote:setDraft', (event, text) => {
    quickNoteManager.setDraft(text);
    return true;
  });

  // 保存速记为笔记（标题「速记」，摘要为内容前 50 字，正文为记录内容）
  ipcMain.handle('quicknote:save', async (event, text) => {
    return await quickNoteManager.requestSave(text);
  });

  // 关闭小窗（实际是隐藏，保留内容）
  ipcMain.handle('quicknote:close', () => {
    quickNoteManager.hide();
    return true;
  });

  // 获取当前速记快捷键
  ipcMain.handle('quicknote:getHotkey', () => {
    return quickNoteManager.getHotkey();
  });

  // 修改速记快捷键，返回是否注册成功（Manager 内部失败回退，配置由 hotkey-change 事件写入）
  ipcMain.handle('quicknote:setHotkey', (_event, accelerator) => {
    return quickNoteManager.setHotkey(accelerator);
  });

// ===== 窗口控制 =====
  ipcMain.handle('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    const win = BrowserWindow.getFocusedWindow();
    return win ? win.isMaximized() : false;
  });

  // 监听窗口最大化/还原事件，通知渲染进程
  ipcMain.on('window:listenState', (event) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    event.sender.send('window:maximized', win.isMaximized());
    win.on('maximize', () => event.sender.send('window:maximized', true));
    win.on('unmaximize', () => event.sender.send('window:maximized', false));
  });

  ipcMain.handle('window:setTitle', (event, title) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.setTitle(title);
  });

  ipcMain.handle('window:getFolderName', () => {
    const dataPath = configManager.getDataRootPath();
    return path.basename(dataPath);
  });

}

module.exports = { setupIpcHandlers };