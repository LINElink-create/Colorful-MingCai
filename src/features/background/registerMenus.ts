// registerMenus.ts 是一个模块，负责注册浏览器插件的上下文菜单，确保用户右击时出现特定的菜单项
// 调用 ensureContextMenu 函数来获得权限
import { ensureContextMenu } from '../../modules/browser/contextMenus'

// registerContextMenus 函数是一个异步函数，调用 ensureContextMenu 来注册上下文菜单
export const registerContextMenus = async () => {
  await ensureContextMenu()
}