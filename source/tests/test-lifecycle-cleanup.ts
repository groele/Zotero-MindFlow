import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { requestWebDAV } from '../src/services/sync/webdavRequest';
import {
  prepareResearchAnalysis,
  requestResearchAnalysis,
} from '../src/services/zotero/researchAnalysis';
import { locateItemInZotero } from '../src/services/zotero/zoteroNavigation';

function makeWindowHarness() {
  const listeners = new Map<string, Set<(ev: any) => void>>();
  const activeTimers = new Map<number, { fn: () => void; ms: number }>();
  const posted: any[] = [];
  let nextTimerId = 1;

  const parentWin: any = {
    postMessage(payload: any) {
      posted.push(payload);
    },
  };

  const win: any = {
    parent: parentWin,
    location: { protocol: 'chrome:', host: 'mindflow' },
    addEventListener(type: string, fn: (ev: any) => void) {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(fn);
    },
    removeEventListener(type: string, fn: (ev: any) => void) {
      listeners.get(type)?.delete(fn);
    },
    setTimeout(fn: () => void, ms: number) {
      const id = nextTimerId++;
      activeTimers.set(id, { fn, ms });
      return id;
    },
    clearTimeout(id: number) {
      activeTimers.delete(id);
    },
    dispatchMessage(data: any, source: any = parentWin) {
      const current = [...(listeners.get('message') || [])];
      for (const fn of current) {
        fn({ data, source });
      }
    },
    flushTimers() {
      for (const [id, entry] of [...activeTimers.entries()]) {
        activeTimers.delete(id);
        entry.fn();
      }
    },
  };

  return { win, parentWin, listeners, activeTimers, posted };
}

const globals = globalThis as any;
const saved = {
  window: globals.window,
  fetch: globals.fetch,
};

try {
  // 1. requestWebDAV: pre-aborted signal, mid-flight caller abort cleanup, timeout abort, maxBytes guard
  {
    const preAborted = new AbortController();
    preAborted.abort(new Error('caller cancelled'));
    let fetchCalls = 0;
    globals.fetch = async () => {
      fetchCalls++;
      return new Response('ok');
    };
    await assert.rejects(
      () => requestWebDAV('https://dav.example.com/item.json', { method: 'GET', signal: preAborted.signal }),
      /abort|cancel/i,
    );
    assert.equal(fetchCalls, 0, 'pre-aborted signal must skip fetch');
  }

  {
    // Track caller signal listener registration/removal
    let signalListenerCount = 0;
    const controller = new AbortController();
    const origAdd = controller.signal.addEventListener.bind(controller.signal);
    const origRemove = controller.signal.removeEventListener.bind(controller.signal);
    controller.signal.addEventListener = ((type: any, fn: any, opts: any) => {
      signalListenerCount++;
      return origAdd(type, fn, opts);
    }) as any;
    controller.signal.removeEventListener = ((type: any, fn: any, opts: any) => {
      signalListenerCount = Math.max(0, signalListenerCount - 1);
      return origRemove(type, fn, opts);
    }) as any;

    let observedInnerSignal: AbortSignal | undefined;
    globals.fetch = (_url: string, init: RequestInit) => {
      observedInnerSignal = init.signal ?? undefined;
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
      });
    };

    const reqPromise = requestWebDAV(
      'https://dav.example.com/item.json',
      { method: 'PUT', signal: controller.signal },
      { timeoutMs: 5000 },
    );
    assert.equal(signalListenerCount, 1, 'caller AbortSignal listener attached while pending');
    controller.abort(new Error('user aborted'));
    await assert.rejects(() => reqPromise);
    assert.equal(observedInnerSignal?.aborted, true, 'inner fetch AbortSignal must abort with caller');
    assert.equal(signalListenerCount, 0, 'caller AbortSignal listener cleaned up after settlement');
  }

  {
    // Timeout aborts in-flight fetch cleanly
    let innerSignal: AbortSignal | undefined;
    globals.fetch = (_url: string, init: RequestInit) => {
      innerSignal = init.signal ?? undefined;
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('Request timed out')), { once: true });
      });
    };
    await assert.rejects(
      () => requestWebDAV('https://dav.example.com/slow.json', { method: 'GET' }, { timeoutMs: 15 }),
    );
    assert.equal(innerSignal?.aborted, true, 'timeout must abort inner fetch signal');
  }

  {
    // Content-Length header exceeding maxBytes aborts inner signal before reading body
    let innerSignal: AbortSignal | undefined;
    globals.fetch = async (_url: string, init: RequestInit) => {
      innerSignal = init.signal ?? undefined;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '2048' }),
        body: null,
      } as any;
    };

    await assert.rejects(
      () => requestWebDAV('https://dav.example.com/huge.json', { method: 'GET' }, { maxBytes: 512 }),
      /安全读取上限/,
    );
    assert.equal(innerSignal?.aborted, true, 'oversized content-length must abort request signal');
  }

  {
    // Streamed chunk exceeding maxBytes when content-length header is absent
    let innerSignal: AbortSignal | undefined;
    let canceled = false;
    let reads = 0;
    globals.fetch = async (_url: string, init: RequestInit) => {
      innerSignal = init.signal ?? undefined;
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: async () => {
              reads++;
              if (reads === 1) return { done: false, value: new Uint8Array(600) };
              return { done: true, value: undefined };
            },
            cancel: async () => { canceled = true; },
            releaseLock: () => {},
          }),
        },
      } as any;
    };

    await assert.rejects(
      () => requestWebDAV('https://dav.example.com/stream.json', { method: 'GET' }, { maxBytes: 400 }),
      /安全读取上限/,
    );
    assert.equal(innerSignal?.aborted, true, 'oversized stream must abort request signal');
    assert.equal(canceled, true, 'oversized chunked stream must cancel reader');
  }
  console.log('PASS: requestWebDAV abort listener cleanup, timeout abort, and maxBytes stream cancellation');

  // 2. researchAnalysis postMessage channel cleanup (resolve, progress, foreign source, abort)
  {
    const harness = makeWindowHarness();
    globals.window = harness.win;

    const progressUpdates: Array<{ phase: string; completed: number; total: number }> = [];
    const controller = new AbortController();
    const pending = requestResearchAnalysis('ITEMKEY1', {
      signal: controller.signal,
      expectedCalls: 1,
      onProgress: (p) => progressUpdates.push(p),
    });

    assert.equal(harness.posted.length, 1);
    const req = harness.posted[0];
    assert.equal(req.type, 'MINDFLOW_ANALYZE_PAPER');
    assert.equal(harness.listeners.get('message')?.size, 1);
    assert.equal(harness.activeTimers.size, 1);

    // Ignore foreign source and wrong requestId
    harness.win.dispatchMessage({ type: 'MINDFLOW_ANALYZE_PAPER_RESULT', requestId: req.requestId, result: { bad: true } }, {});
    harness.win.dispatchMessage({ type: 'MINDFLOW_ANALYZE_PAPER_RESULT', requestId: 'other-id', result: { bad: true } });
    assert.equal(harness.listeners.get('message')?.size, 1, 'foreign/mismatched messages keep channel open');

    harness.win.dispatchMessage({
      type: 'MINDFLOW_ANALYZE_PAPER_PROGRESS',
      requestId: req.requestId,
      phase: 'segment',
      completed: 1,
      total: 2,
    });
    assert.deepEqual(progressUpdates, [{ phase: 'segment', completed: 1, total: 2 }]);

    harness.win.dispatchMessage({
      type: 'MINDFLOW_ANALYZE_PAPER_RESULT',
      requestId: req.requestId,
      result: { title: 'Test Paper', summary: 'Done' },
    });

    const result: any = await pending;
    assert.equal(result.title, 'Test Paper');
    assert.equal(harness.listeners.get('message')?.size, 0, 'message listener removed on completion');
    assert.equal(harness.activeTimers.size, 0, 'timeout timer cleared on completion');
  }

  {
    // Aborting mid-flight posts MINDFLOW_CANCEL_PAPER and detaches message listener + timer
    const harness = makeWindowHarness();
    globals.window = harness.win;
    const controller = new AbortController();
    const prepPromise = prepareResearchAnalysis('ITEMKEY2', controller.signal, 'fulltext');
    assert.equal(harness.posted.length, 1);
    const reqId = harness.posted[0].requestId;

    controller.abort();
    await assert.rejects(() => prepPromise, /取消/);
    assert.equal(harness.posted[1]?.type, 'MINDFLOW_CANCEL_PAPER');
    assert.equal(harness.posted[1]?.requestId, reqId);
    assert.equal(harness.listeners.get('message')?.size, 0, 'message listener removed on abort');
    assert.equal(harness.activeTimers.size, 0, 'timer cleared on abort');
  }

  {
    // Pre-aborted prepareResearchAnalysis clears any temporary timer/listener immediately
    const harness = makeWindowHarness();
    globals.window = harness.win;
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(() => prepareResearchAnalysis('ITEMKEY3', controller.signal), /取消/);
    assert.equal(harness.listeners.get('message')?.size || 0, 0);
    assert.equal(harness.activeTimers.size, 0);
  }
  console.log('PASS: researchAnalysis postMessage listener, abort signal, and timer cleanup');

  // 3. locateItemInZotero postMessage cleanup on response and timeout
  {
    const harness = makeWindowHarness();
    globals.window = harness.win;

    const locateOk = locateItemInZotero('ABC12345', 'Title');
    assert.equal(harness.posted[0]?.type, 'MINDFLOW_LOCATE_ITEM');
    assert.equal(harness.listeners.get('message')?.size, 1);
    assert.equal(harness.activeTimers.size, 1);

    harness.win.dispatchMessage({
      type: 'MINDFLOW_LOCATE_ITEM_RESULT',
      requestId: harness.posted[0].requestId,
      success: true,
    });
    assert.equal(await locateOk, true);
    assert.equal(harness.listeners.get('message')?.size, 0, 'locate listener cleared after reply');
    assert.equal(harness.activeTimers.size, 0, 'locate timer cleared after reply');

    const locateTimeout = locateItemInZotero('TIMEOUT1');
    assert.equal(harness.listeners.get('message')?.size, 1);
    harness.win.flushTimers();
    assert.equal(await locateTimeout, false);
    assert.equal(harness.listeners.get('message')?.size, 0, 'locate listener cleared after timeout');
  }
  console.log('PASS: locateItemInZotero postMessage and timer cleanup');

  // 4. Component & hook unmount cleanup invariant verification across hardened frontend modules
  {
    const frontendRoot = path.resolve(import.meta.dirname, '..', 'src');
    const guardedComponents = [
      'pages/app/useAppAiResearch.ts',
      'components/modal/WelcomeModal.tsx',
      'components/command/CommandPalette.tsx',
      'components/search/CanvasSearch.tsx',
      'components/sidebar/LeftWorkbench.tsx',
      'components/sidebar/PropertySidebarRelationshipFields.tsx',
      'components/node/NodeCardContent.tsx',
    ];
    for (const rel of guardedComponents) {
      const src = fs.readFileSync(path.join(frontendRoot, rel), 'utf8');
      assert.match(src, /useEffect\s*\(/, `${rel} must register lifecycle effect`);
      assert.match(
        src,
        /useEffect\s*\(\s*\(\)\s*=>\s*(?:\(\)\s*=>|[\s\S]*?return\s*\(\s*\)\s*=>)/,
        `${rel} must return an unmount/re-run cleanup handler`,
      );
      assert.match(src, /clearTimeout\s*\(|abort\s*\(/, `${rel} must clear timers or abort requests in cleanup`);
    }
    const aiHook = fs.readFileSync(path.join(frontendRoot, 'pages/app/useAppAiResearch.ts'), 'utf8');
    assert.match(aiHook, /aiAbortRef\.current\?\.abort\(\)/, 'useAppAiResearch must abort active AI request on unmount');
    console.log('PASS: all 7 hardened frontend modules declare explicit useEffect timer/abort cleanup');
  }
} finally {
  globals.window = saved.window;
  globals.fetch = saved.fetch;
}
