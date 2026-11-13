import assert from 'node:assert/strict';
import { HistoryManager } from '../src/core/history/historyManager';
import {
  captureNodeDrafts,
  retargetDocumentLinks,
  validRelationships,
} from '../src/core/model/editorState';
import { safeExternalUrl } from '../src/core/model/links';
import { collectTagFacets } from '../src/core/model/tagUtils';
import {
  addChildNode,
  addSiblingNode,
  deleteNode,
  expandAncestors,
  replaceAllNodeText,
  replaceNodeText,
} from '../src/core/model/treeOps';
import type { MindMapDocument, MindMapNode, RelationshipLink } from '../src/core/model/types';
import {
  exportToMarkdown,
  exportToOPML,
  importMarkdownDocument,
  parseOPMLString,
} from '../src/services/io/exporter';

function makeTree(): MindMapNode {
  return {
    id: 'root',
    text: '研究综述 (2025)',
    tags: ['综述', '核心'],
    isExpanded: true,
    children: [
      {
        id: 'n1',
        text: '方法 A++ #行内标签',
        note: '第一行\n第二行 & <细节>',
        link: '10.1000/alpha',
        tags: ['方法', '核心', '方法'],
        task: { status: 'doing' },
        internalLink: { documentId: 'doc_old', nodeId: 'target_1' },
        isExpanded: false,
        children: [
          {
            id: 'n1a',
            text: '实验细节 C++',
            tags: ['   ', '实验'],
            task: { status: 'done' },
            isExpanded: false,
            children: [],
          },
        ],
      },
      {
        id: 'n2',
        text: '讨论节点',
        link: 'zotero://select/library/items/ABCD1234',
        tags: ['讨论'],
        internalLink: { documentId: 'doc_keep', nodeId: 'target_2' },
        isExpanded: true,
        children: [],
      },
    ],
  };
}

// 1. Relationship link integrity & retargetDocumentLinks & captureNodeDrafts
{
  const root = makeTree();
  const intact: RelationshipLink[] = [
    { id: 'r1', fromId: 'n1', toId: 'n1a', label: '支撑', style: 'dashed' },
    { id: 'r2', fromId: 'n1a', toId: 'n2', style: 'solid' },
  ];
  assert.equal(
    validRelationships(root, intact),
    intact,
    'validRelationships must return original array reference when all endpoints exist',
  );

  const deleted = deleteNode(root, 'n1a');
  assert.equal(deleted.nextSelectedId, 'n1', 'deleting only child selects parent');
  const pruned = validRelationships(deleted.newRoot, intact);
  assert.equal(pruned.length, 0, 'deleting descendant removes dangling incoming and outgoing relationships');

  const siblingDelete = deleteNode(root, 'n1');
  assert.equal(siblingDelete.nextSelectedId, 'n2', 'deleting first sibling selects next sibling');
  const rootClear = deleteNode(root, 'root');
  assert.equal(rootClear.nextSelectedId, 'root');
  assert.equal(rootClear.newRoot.children.length, 0, 'deleting root clears children only');

  const retargeted = retargetDocumentLinks(root, 'doc_old', 'doc_new');
  assert.equal(retargeted.children[0].internalLink?.documentId, 'doc_new');
  assert.equal(retargeted.children[0].internalLink?.nodeId, 'target_1');
  assert.equal(retargeted.children[1].internalLink?.documentId, 'doc_keep');
  assert.equal(root.children[0].internalLink?.documentId, 'doc_old', 'retarget must not mutate source tree');

  const doc: MindMapDocument = {
    id: 'doc_1',
    title: '图谱测试',
    root,
    relationships: intact,
    themeId: 'academic-paper',
    layoutType: 'logic-right',
    createdAt: 10,
    updatedAt: 20,
  };
  assert.equal(captureNodeDrafts(null, [{ id: 'n1', text: 'x' }]), null);
  assert.equal(
    captureNodeDrafts(doc, [{ id: 'n1', text: '   ' }, { id: 'missing', text: 'noop' }]),
    doc,
    'whitespace/missing drafts keep document identity',
  );
  const captured = captureNodeDrafts(doc, [{ id: 'n2', text: '  更新后的讨论  ' }])!;
  assert.equal(captured.root.children[1].text, '更新后的讨论');
  assert.equal(doc.root.children[1].text, '讨论节点', 'captureNodeDrafts preserves immutability');
  console.log('PASS: graph relationship pruning, link retargeting, and draft capture integrity');
}

// 2. safeExternalUrl & tag facets & regex-safe search/replace & ancestor expansion
{
  assert.equal(safeExternalUrl(undefined), null);
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl('data:text/html,<script>1</script>'), null);
  assert.equal(safeExternalUrl('file:///C:/Windows/win.ini'), null);
  assert.equal(safeExternalUrl('zotero://open-pdf/library/items/XYZ?page=3'), 'zotero://open-pdf/library/items/XYZ?page=3');
  assert.equal(safeExternalUrl('doi: 10.1145/3544548.3581'), 'https://doi.org/10.1145/3544548.3581');
  assert.equal(safeExternalUrl('10.1038/s41586-024-00001-1'), 'https://doi.org/10.1038/s41586-024-00001-1');
  assert.equal(safeExternalUrl('www.zotero.org/support'), 'https://www.zotero.org/support');
  assert.equal(safeExternalUrl('mailto:test@example.org'), 'mailto:test@example.org');

  const root = makeTree();
  const facets = collectTagFacets(root);
  assert.equal(facets[0].tag, '核心');
  assert.equal(facets[0].nodes.length, 2, 'duplicate tag on one node counts once, multiple nodes aggregate');
  assert.ok(!facets.some((f) => !f.tag.trim()), 'blank tags must be skipped');

  const singleReplaced = replaceNodeText(root, 'n1', 'A++', 'B**');
  assert.equal(singleReplaced.children[0].text, '方法 B** #行内标签');
  const allReplaced = replaceAllNodeText(root, 'c++', 'Rust');
  assert.equal(allReplaced.count, 1, 'regex metacharacters are matched literally and case-insensitively');
  assert.equal(allReplaced.newRoot.children[0].children[0].text, '实验细节 Rust');

  const expanded = expandAncestors(root, 'n1a');
  assert.equal(expanded.children[0].isExpanded, true, 'ancestor must be expanded to reveal search target');
  assert.equal(expanded.children[0].children[0].isExpanded, false, 'target own fold state stays preserved');
  assert.equal(expandAncestors(expanded, 'n1a'), expanded, 'already-visible path returns same tree reference');

  const { newRoot: withChild, newNodeId } = addChildNode(root, 'n2', '子节点');
  const { newRoot: withBefore, newNodeId: beforeId } = addSiblingNode(withChild, 'n2', '前置兄弟', true);
  assert.equal(withBefore.children[1].id, beforeId);
  assert.equal(withBefore.children[2].children[0].id, newNodeId);
  console.log('PASS: external URL sanitization, tag facets, literal search/replace, and ancestor expansion');
}

// 3. HistoryManager undo / redo / maxSteps / snapshot isolation
{
  const history = new HistoryManager(2);
  const mkState = (text: string, label = 'link') => ({
    root: { ...makeTree(), text },
    relationships: [{ id: 'rel_h', fromId: 'n1', toId: 'n2', label, style: 'solid' as const }],
  });
  const s0 = mkState('版本 0');
  const s1 = mkState('版本 1');
  const s2 = mkState('版本 2');
  const s3 = mkState('版本 3');

  assert.equal(history.undo(s0), null);
  history.push(s0);
  history.push(s1);
  history.push(s2);
  assert.equal(history.canUndo(), true);
  const backTo2 = history.undo(s3)!;
  assert.equal(backTo2.root.text, '版本 2');
  assert.equal(history.canRedo(), true);
  const backTo1 = history.undo(backTo2)!;
  assert.equal(backTo1.root.text, '版本 1');
  assert.equal(history.canUndo(), false, 'oldest s0 evicted when maxSteps=2');

  const redone = history.redo(backTo1)!;
  assert.equal(redone.root.text, '版本 2');
  history.push(redone);
  assert.equal(history.canRedo(), false, 'new edit invalidates redo stack');

  // Mutating caller object after push must not corrupt stored history snapshot
  const mutable = mkState('初始快照', '原始关系');
  history.clear();
  history.push(mutable);
  mutable.root.text = '外部脏修改';
  mutable.relationships[0].label = '脏关系';
  const restored = history.undo(mutable)!;
  assert.equal(restored.root.text, '初始快照');
  assert.equal(restored.relationships[0].label, '原始关系');
  console.log('PASS: HistoryManager maxSteps eviction, redo invalidation, and snapshot isolation');
}

// 4. Markdown & OPML export/import round-trip
{
  const root = makeTree();
  const rels: RelationshipLink[] = [
    { id: 'rel_1', fromId: 'n1', toId: 'n2', label: '对比', style: 'dashed' },
  ];
  let capturedMdBlob: Blob | null = null;
  exportToMarkdown(root, '导图测试', (blob, name) => {
    assert.equal(name, '导图测试.md');
    capturedMdBlob = blob;
  }, { relationships: rels });
  const mdText = await capturedMdBlob!.text();
  const importedMd = importMarkdownDocument(mdText);
  assert.equal(importedMd.root.text, root.text);
  assert.equal(importedMd.root.children[0].task?.status, 'todo', 'Markdown maps non-done task checkbox [ ] to todo');
  assert.equal(importedMd.root.children[0].children[0].task?.status, 'done');
  assert.equal(importedMd.root.children[0].note, root.children[0].note);
  assert.deepEqual(importedMd.root.children[0].internalLink, root.children[0].internalLink);
  assert.deepEqual(importedMd.root.children[0].tags, ['方法', '核心', '方法']);
  assert.equal(importedMd.relationships?.length, 1, 'Markdown export/import preserves relationships across ID rewrites');
  assert.equal(importedMd.relationships?.[0].fromId, importedMd.root.children[0].id);
  assert.equal(importedMd.relationships?.[0].toId, importedMd.root.children[1].id);

  let capturedOpmlBlob: Blob | null = null;
  exportToOPML(root, '导图 & <OPML>', (blob, name) => {
    assert.equal(name, '导图 & <OPML>.opml');
    capturedOpmlBlob = blob;
  });
  const opmlXml = await capturedOpmlBlob!.text();
  const parsedOpml = parseOPMLString(opmlXml);
  assert.equal(parsedOpml.text, root.text);
  assert.equal(parsedOpml.children[0].task?.status, 'doing');
  assert.equal(parsedOpml.children[0].note, root.children[0].note);
  assert.equal(parsedOpml.children[0].children[0].task?.status, 'done');
  assert.throws(() => parseOPMLString('<opml><body><outline text="broken"></body></opml>'), /OPML/);
  console.log('PASS: Markdown and OPML export/import round-trips and malformed XML rejection');
}
