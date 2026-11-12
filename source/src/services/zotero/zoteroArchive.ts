import { MindMapNode, MindMapDocument } from '../../core/model/types';
import { getZoteroInstance, getHostWindow, getZoteroPref } from './zoteroEnvironment';
import { resolveZoteroItem } from './zoteroItemData';

export interface ZoteroArchiveResult {
  attachmentKey?: string;
  attachmentLibraryID?: number;
  success: boolean;
  message: string;
  savedPath?: string;
  parentItemUri?: string;
  parentItemTitle?: string;
  parentLibraryID?: number;
  usedUnlinkedContainer?: boolean;
  noteRequested?: boolean;
  savedNote?: boolean;
  noteError?: string;
}

export interface ZoteroArchiveOptions {
  silent?: boolean;
  archiveToUnlinkedContainer?: boolean;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Save MindMapDocument outline back into Zotero as an HTML note
 */
export async function saveMindMapToZoteroNote(doc: MindMapDocument): Promise<{ success: boolean; message: string }> {
  const Zotero = getZoteroInstance();
  if (!Zotero) {
    return { success: false, message: '未检测到 Zotero 运行环境，无法直接存入 Zotero 笔记' };
  }

  try {
    const parentReference = doc.metadata?.zoteroUri || doc.metadata?.zoteroItemKey;
    const parentItem = parentReference ? resolveZoteroItem(parentReference, Zotero, doc.metadata?.zoteroLibraryID) : null;
    if (parentReference && (!parentItem || !parentItem.isRegularItem?.())) {
      return { success: false, message: '关联的 Zotero 文献已不可用，未创建独立笔记以免丢失文献关联。' };
    }
    if (parentItem && Zotero.Libraries?.get?.(parentItem.libraryID)?.editable === false) {
      return { success: false, message: '目标 Zotero 文献库为只读，无法保存子笔记。' };
    }

    function nodeToHtml(node: MindMapNode, level: number = 1, parentNode: MindMapNode | null = null): string {
      const indent = '  '.repeat(level);

      const isAutoAbstractHeading = (str: unknown) =>
        typeof str === 'string' && /^(?:💡\s*)?(?:核心摘要|文献摘要|摘要|abstract)$/i.test(str.trim());
      const hasAbstractChild = level === 1 && Array.isArray(node.children) && node.children.some(c => c && isAutoAbstractHeading(c.text));
      const isRedundantRootAbstract = hasAbstractChild && (
        (node.note && (node.note.startsWith('【文献摘要】') || node.note.includes('文献摘要'))) ||
        (Array.isArray(node.children) && node.children.some(c => c && c.note && (c.note === node.note || node.note?.includes(c.note))))
      );

      const isDuplicateAbstractChild = Boolean(parentNode && isAutoAbstractHeading(parentNode.text) && (
        (node.note && parentNode.note && (node.note === parentNode.note || parentNode.note.includes(node.note))) ||
        (typeof node.text === 'string' && node.text.trim().length >= 16 && parentNode.note &&
          parentNode.note.startsWith(node.text.replace(/\.\.\.$/, '')))
      ));

      if (isDuplicateAbstractChild && (!node.children || node.children.length === 0)) {
        return '';
      }

      let html = `${indent}<li><strong>${escapeHtml(node.text)}</strong>`;
      if (node.link) {
        html += ` <a href="${escapeHtml(node.link)}" style="color: #0284c7; text-decoration: none;">[链接]</a>`;
      }
      if (node.note && !isRedundantRootAbstract && !isDuplicateAbstractChild) {
        html += `<br/><small style="color: #64748b; line-height: 1.5; display: inline-block; margin-top: 3px;">${escapeHtml(node.note)}</small>`;
      }
      if (node.tags && node.tags.length > 0) {
        html += ` <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${node.tags.map(escapeHtml).join(', ')}</span>`;
      }
      if (node.children && node.children.length > 0) {
        const renderedChildren = node.children
          .map(child => nodeToHtml(child, level + 1, node))
          .filter(Boolean)
          .join('');
        if (renderedChildren) {
          html += `\n${indent}<ul>\n${renderedChildren}${indent}</ul>\n${indent}`;
        }
      }
      html += `</li>\n`;
      return html;
    }

    const noteHtml = `
      <div data-mindflow-document-id="${escapeHtml(doc.id)}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2 style="color: #0284c7;">🧠 MindFlow 导图笔记: ${escapeHtml(doc.title)}</h2>
        <p style="color: #64748b; font-size: 12px;">创建时间: ${new Date(doc.createdAt).toLocaleString()} | 更新时间: ${new Date(doc.updatedAt).toLocaleString()}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
        <ul>
          ${nodeToHtml(doc.root)}
        </ul>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">由 MindFlow for Zotero 自动生成</p>
      </div>
    `.trim();

    let noteItem: any = null;
    if (parentItem && typeof parentItem.getNotes === 'function') {
      for (const noteID of parentItem.getNotes()) {
        const candidate = Zotero.Items.get(noteID);
        if (candidate?.isNote?.() && candidate.getNote?.().includes(`data-mindflow-document-id="${escapeHtml(doc.id)}"`)) {
          noteItem = candidate;
          break;
        }
      }
    }
    if (!noteItem) {
      noteItem = new Zotero.Item('note');
      if (parentItem) {
        noteItem.libraryID = parentItem.libraryID;
        noteItem.parentItemID = parentItem.id;
      }
    }
    noteItem.setNote(noteHtml);
    await noteItem.saveTx();
    if (getZoteroPref('autoOpenAfterExport', false)) {
      try {
        const pane = Zotero.getActiveZoteroPane?.() || (Zotero.getMainWindows ? Zotero.getMainWindows()[0] : null)?.ZoteroPane || Zotero.getMainWindow?.()?.ZoteroPane;
        await pane?.selectItem?.(noteItem.id);
      } catch { /* the note has already been saved */ }
    }

    return { success: true, message: parentItem
      ? `已将导图大纲保存为“${parentItem.getField('title')}”的子笔记`
      : `已将导图大纲保存为 Zotero 独立笔记：“${doc.title}”` };
  } catch (error: any) {
    console.error('Failed to save to Zotero note:', error);
    return { success: false, message: `保存失败: ${error?.message || error}` };
  }
}

/**
 * Save MindMapDocument directly as a Zotero child attachment (.mindflow) and outline note under a literature item
 */
export async function saveMindMapToZoteroAttachment(
  doc: MindMapDocument,
  parentItemKeyOrOptions?: string | ZoteroArchiveOptions,
  options?: ZoteroArchiveOptions
): Promise<ZoteroArchiveResult> {
  let targetKey: string | undefined;
  let opts: ZoteroArchiveOptions | undefined = options;

  if (typeof parentItemKeyOrOptions === 'object' && parentItemKeyOrOptions !== null) {
    opts = parentItemKeyOrOptions;
    targetKey = doc.metadata?.zoteroItemKey;
  } else {
    targetKey = parentItemKeyOrOptions || doc.metadata?.zoteroItemKey;
  }

  const Zotero = getZoteroInstance();
  if (Zotero?.MindFlow?.saveMindMapToItem) {
    try {
      return await Zotero.MindFlow.saveMindMapToItem({
        doc,
        parentItemKey: targetKey,
        silent: opts?.silent,
        archiveToUnlinkedContainer: opts?.archiveToUnlinkedContainer,
      });
    } catch (e: any) {
      console.warn('[MindFlow] saveMindMapToZoteroAttachment direct call error:', e);
      return { success: false, message: `保存失败: ${e?.message || e}` };
    }
  }

  const hostWindow = getHostWindow();
  if (hostWindow) {
    const requestId = `mindflow-save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      const finish = (result: ZoteroArchiveResult) => {
        window.removeEventListener('message', onMessage);
        window.clearTimeout(timeout);
        resolve(result);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== hostWindow) return;
        const data = event.data;
        if (data?.type !== 'MINDFLOW_SAVE_ATTACHMENT_RESULT' || data.requestId !== requestId) return;
        finish(data.result || { success: false, message: 'Zotero 未返回归档结果' });
      };
      const timeout = window.setTimeout(() => {
        finish({ success: false, message: '等待 Zotero 归档结果超时，请检查 Zotero 错误日志后重试' });
      }, 30000);
      window.addEventListener('message', onMessage);
      try {
        hostWindow.postMessage(
          {
            type: 'MINDFLOW_SAVE_ATTACHMENT',
            requestId,
            doc,
            parentItemKey: targetKey,
            silent: opts?.silent,
            archiveToUnlinkedContainer: opts?.archiveToUnlinkedContainer,
          },
          '*'
        );
      } catch {
        finish({ success: false, message: '无法向 Zotero 主窗口发送归档请求' });
      }
    });
  }

  return {
    success: false,
    message: '未检测到可用的 Zotero 插件通信通道，导图尚未归档。',
  };
}
