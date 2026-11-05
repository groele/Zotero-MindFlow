/** Workspace close snapshots and stable draining of every persistence queue. */
(function (global: any) {
  function createWorkspaceLifecycle({ Zotero, storage, injectedElements }: { Zotero: any; storage: any; injectedElements: Map<any, any> }): any {
    return {
    captureWorkspaceOnClose(source: any) {
      // Capture synchronously while the editor still exists. The Promise and
      // disk I/O then belong to Zotero, so destroying the iframe cannot cancel it.
      const editor = source?.wrappedJSObject || source;
      let snapshot;
      try { snapshot = editor?._mindflowCaptureState?.(); }
      catch (error) { Zotero.logError?.('[MindFlow] Close capture failed: ' + error); return; }
      if (!snapshot?.doc) return;
      snapshot = JSON.parse(JSON.stringify(snapshot));
      const fingerprint = JSON.stringify(snapshot);
      if (editor._mindflowClosingFingerprint === fingerprint) return;
      editor._mindflowClosingFingerprint = fingerprint;
      const operation = (async () => {
        let saved;
        try {
          saved = await this.workspaceStorage('commitDocument', { doc: snapshot.doc, expectedRevision: snapshot.doc.revision || 0 });
        } catch (error) {
          if (!String(error).includes('MINDFLOW_REVISION_CONFLICT:')) throw error;
          const raw = await this.workspaceStorage('get', { key: `mindflow_doc_${snapshot.doc.id}` });
          const comparable = (doc: any) => JSON.stringify({ ...doc, revision: 0, updatedAt: 0 });
          if (raw && comparable(JSON.parse(raw)) === comparable(snapshot.doc)) return;
          const metadata = { ...snapshot.doc.metadata, autoSyncToZotero: false };
          for (const key of ['zoteroItemKey','zoteroUri','zoteroLibraryID','zoteroItemTitle','zoteroAttachmentKey','zoteroAttachmentLibraryID','mindflowUnlinkedContainer']) delete metadata[key];
          const copyId = `doc_close_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          const retarget = (node: any) => ({ ...node,
            internalLink: node.internalLink?.documentId === snapshot.doc.id
              ? { ...node.internalLink, documentId: copyId } : node.internalLink,
            children: node.children.map(retarget) });
          saved = await this.workspaceStorage('commitDocument', { doc: { ...snapshot.doc,
            id: copyId, root: retarget(snapshot.doc.root),
            title: `${snapshot.doc.title}（关闭恢复副本）`, metadata, revision: 0 }, expectedRevision: 0 });
        }
        if (saved.metadata?.zoteroItemKey && saved.metadata.autoSyncToZotero !== false) {
          await this.saveMindMapToItem({ doc: saved, parentItemKey: saved.metadata.zoteroItemKey, silent: true });
        }
      })();
      const tracked = operation.catch(error => {
        // Failed I/O is retryable even if the editor contents have not changed.
        if (editor._mindflowClosingFingerprint === fingerprint) delete editor._mindflowClosingFingerprint;
        Zotero.logError?.('[MindFlow] Closing document was not saved: ' + error);
      });
      this._closeSaveQueue = Promise.all([this._closeSaveQueue || Promise.resolve(), tracked]);
      return tracked;
    },

    captureAllWorkspaces() {
      for (const win of injectedElements.keys()) {
        for (const frame of win.document?.querySelectorAll?.('.mindflow-workspace-iframe') || []) this.captureWorkspaceOnClose(frame.contentWindow);
      }
      for (const win of this._standaloneWindows?.values() || []) if (!win.closed) this.captureWorkspaceOnClose(win);
    },

    async drainPendingWrites() {
      let previous: any[] = [], current: any[] = [];
      do {
        previous = [storage.pendingWrites, this._closeSaveQueue, this._archiveWriteQueue];
        await Promise.all(previous);
        current = [storage.pendingWrites, this._closeSaveQueue, this._archiveWriteQueue];
      } while (previous.some((queue: any, index: number) => queue !== current[index]));
    },
    };
  }
  global.MindFlowWorkspaceLifecycle = { createWorkspaceLifecycle };
})(typeof globalThis !== 'undefined' ? globalThis : this);
