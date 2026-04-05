// wxt.config.ts 是 WXT 的配置文件，定义了项目的构建和打包设置
// 通过 defineConfig 函数导出配置对象，指定源代码目录、输出目录、使用的模块和扩展的 manifest 信息
import { defineConfig } from 'wxt'

export default defineConfig({
  // 指定源代码目录和构建输出目录
  srcDir: '.',
  // 输出目录为 .output，构建后的文件将放在这里
  outDir: '.output',
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '明彩',
    description: '网页划词高亮与导出插件',
    version: '0.1.3',
    icons: {
      16: '/icon/mingcai_icon_16.png',
      32: '/icon/mingcai_icon_32.png',
      48: '/icon/mingcai_icon_48.png',
      128: '/icon/mingcai_icon_128.png'
    },
    action: {
      default_icon: {
        16: '/icon/mingcai_icon_16.png',
        32: '/icon/mingcai_icon_32.png',
        48: '/icon/mingcai_icon_48.png'
      }
    },
    // 需要的权限列表，声明插件需要访问的浏览器功能和数据
    permissions: ['storage', 'contextMenus', 'downloads', 'activeTab', 'tabs'],
    // 声明插件需要访问的主机权限，这里允许访问所有 HTTP 和 HTTPS 网站
    host_permissions: ['https://*/*']
  }
})