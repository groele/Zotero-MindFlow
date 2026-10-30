export interface SaveStatus {
  state: 'saving' | 'saved' | 'warning' | 'error';
  message: string;
}

export function saveStatusLabel(status: SaveStatus): string {
  if (/准备导出/.test(status.message)) return '准备导出…';
  if (/^已取消导出/.test(status.message)) return '已取消导出';
  if (/^已导出：/.test(status.message)) return '导出完成';
  if (status.state === 'saving') return '保存中…';
  if (status.state === 'saved') return '已保存';
  if (status.state === 'error') return '操作失败';
  if (/云端备份失败|WebDAV.*失败/.test(status.message)) return '云备份失败';
  if (/版本快照失败/.test(status.message)) return '快照失败';
  if (/归档失败|大纲笔记保存失败/.test(status.message)) return '归档待处理';
  if (/冲突副本/.test(status.message)) return '有冲突副本';
  if (/AI.*草稿|核对|核验/.test(status.message)) return '待核对';
  return '需注意';
}
