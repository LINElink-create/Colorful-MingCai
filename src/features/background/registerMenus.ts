import { ensureContextMenu } from '../../modules/browser/contextMenus'

export const registerContextMenus = async () => {
  await ensureContextMenu()
}