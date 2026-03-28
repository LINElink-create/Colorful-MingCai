import { createApp } from 'vue'
import '../../src/shared/styles/entrypointTheme.css'
import App from './App.vue'

// Popup 入口文件：只负责启动 Vue 应用。
// 真正的业务状态和页面结构分别放在 App.vue 与对应 composable 中。
createApp(App).mount('#app')