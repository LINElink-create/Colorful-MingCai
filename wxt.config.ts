import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: '.',
  outDir: '.output',
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '明彩',
    description: '网页划词高亮与导出插件 MVP',
    permissions: ['storage', 'contextMenus', 'downloads', 'activeTab', 'tabs'],
    host_permissions: ['<all_urls>']
  }
})