// src/quicknote.js - 速记小窗入口
import { createApp } from 'vue'
import QuickNote from './modules/views/QuickNote/QuickNote.vue'

// 创建应用根容器
const appRoot = document.createElement('div')
appRoot.id = 'app-root'
appRoot.style.height = '100vh'
document.body.appendChild(appRoot)

createApp(QuickNote).mount(appRoot)

console.log('[QuickNote] 速记小窗已加载')
