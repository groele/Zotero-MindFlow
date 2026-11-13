/**
 * MindFlow for Zotero - Runtime Script
 * Injects UI elements into Zotero 10 (Tools menu, context menus, toolbar)
 * and bridges communication with the MindFlow Mind Map workspace.
 */

(function () {
  if (typeof Zotero === 'undefined') {
    return;
  }

  const _globalScope = (typeof globalThis !== 'undefined' ? globalThis : this);
  const loadHostModule = (name) => {
    // chrome resources are registered before this script runs. A missing domain
    // module must abort startup, never select a second, divergent implementation.
    Services.scriptloader.loadSubScript('chrome://mindflow/content/scripts/modules/' + name, _globalScope);
  };

  loadHostModule('constants.js');
  loadHostModule('storage.js');
  loadHostModule('item-pane.js');
  loadHostModule('note-sync.js');
  loadHostModule('bridge.js');
  loadHostModule('workspace-lifecycle.js');
  loadHostModule('item-pane-visibility.js');

  const mfConstants = _globalScope.MindFlowConstants || null;
  const mfStorage = _globalScope.MindFlowStorage
    ? _globalScope.MindFlowStorage.createStorageModule({ Zotero, PathUtils, IOUtils, constants: mfConstants, get host() { return Zotero.MindFlow; } })
    : null;
  const mfItemPane = _globalScope.MindFlowItemPane
    ? _globalScope.MindFlowItemPane.createItemPaneModule({ Zotero, constants: mfConstants, get host() { return Zotero.MindFlow; } })
    : null;
  const mfNoteSync = _globalScope.MindFlowNoteSync
    ? _globalScope.MindFlowNoteSync.createNoteSyncModule({ Zotero, PathUtils, IOUtils, constants: mfConstants, get host() { return Zotero.MindFlow; } })
    : null;
  const mfBridge = _globalScope.MindFlowBridge
    ? _globalScope.MindFlowBridge.createBridgeModule({ Zotero, constants: mfConstants, get host() { return Zotero.MindFlow; } })
    : null;

  const ADDON_ID = 'mindflow@groele.org';
  const CHROME_ROOT = 'chrome://mindflow/content/';
  const T = (zh, en) => /^en/i.test(String(Zotero.locale || '')) ? en : zh;
  const ALLOWED_PREF_MESSAGES = {
    windowMode: (value) => value === 'tab' || value === 'window',
    includeAbstract: (value) => typeof value === 'boolean',
    includeAnnotations: (value) => typeof value === 'boolean',
    includeTags: (value) => typeof value === 'boolean',
    aiMaxPdfPages: (value) => typeof value === 'number' || typeof value === 'string',
  };

  const isMindFlowAttachment = (item) => {
    if (!item || typeof item.isAttachment !== 'function' || !item.isAttachment()) return false;
    const filename = String(item.attachmentFilename || '');
    const title = String((item.getField ? item.getField('title') : item.title) || '');
    return filename ? /\.mindflow$/i.test(filename) : /\.mindflow(?:\s|$)/i.test(title);
  };
  const sameWindow = (a, b) => {
    if (!a || !b) return false;
    try { return (a.wrappedJSObject || a) === (b.wrappedJSObject || b); }
    catch (_) { return a === b; }
  };
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const isCalendarDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const validateHostDocument = mfConstants.validateHostDocument;

  const AI_SECTION_KEYS = ['background', 'gap', 'question', 'system', 'conditions', 'method', 'mechanism', 'findings',
    'resolution', 'significance', 'limitations', 'nextSteps', 'assumptions', 'predictions', 'validation', 'alternatives', 'taxonomy', 'conflicts'];
  let researchTemplateDefinitions;
  const getAIResearchTemplate = async (id) => {
    if (!researchTemplateDefinitions) {
      researchTemplateDefinitions = JSON.parse(await Zotero.File.getContentsFromURL(CHROME_ROOT + 'research-templates.json'));
    }
    const template = researchTemplateDefinitions.templates.find((entry) => entry.id === (id || researchTemplateDefinitions.defaultId));
    if (!template) throw new Error('研究模板无效，请重新选择。');
    return { ...template, version: researchTemplateDefinitions.version,
      instructions: template.keys.map((key) => `${key}（${researchTemplateDefinitions.sections[key].label}）：${researchTemplateDefinitions.sections[key].instruction}`).join('\n') };
  };
  const AI_PREPARED_TTL = 15 * 60 * 1000;
  const AI_CANCELLED = 'AI 分析已取消；未创建或归档导图。';
  const AI_OMISSION_MARKER = '[原文区间采样，区间之间有省略]';
  const AI_READING_MODES = ['abstract', 'introduction', 'conclusion', 'key-sections', 'full'];
  const {
    extractPaperSections,
    isPrivateOrLocalHost,
    reasoningProvider,
    publicLLMConfig,
    reasoningChoices,
    modelPreview,
    extractJsonFromLlmOutput,
    normalizeEvidence,
    sampleAcrossText,
    samplePreparedPDF,
    splitTextForAI,
    pdfSegmentsForAI,
    normalizeAIClaimEntry,
    compactSegmentDrafts,
    normalizeDOI,
  } = mfConstants;
  // Conservative local heading detection. Missing sections never fall back to
  // sending the full paper; the user must explicitly choose another scope.
  const LLM_PREF_PREFIX = 'extensions.zotero.llmforzotero.';
  const getLLMAddon = () => {
    const addon = Zotero.LLMForZotero;
    if (!addon || addon.data?.alive === false) {
      throw new Error('请先安装并启用 llm-for-zotero，再在其设置中配置大模型。');
    }
    if (!addon.api?.agent?.runTurn || addon.data?.initialized === false) {
      throw new Error('llm-for-zotero 尚未就绪或版本不支持调用接口，请等待启动完成或升级到 3.9.11 及以上版本。');
    }
    return addon;
  };
  // Read the upstream selection only. Credentials never enter previews, maps,
  // MindFlow preferences or the iframe; they are passed to upstream at call time.
  const readLLMModel = (requestedId) => {
    getLLMAddon();
    const pref = (key) => Zotero.Prefs.get(LLM_PREF_PREFIX + key, true);
    if (pref('conversationSystem') === 'claude_code' && pref('enableClaudeCodeMode')) {
      throw new Error('请在 llm-for-zotero 切换到 API 对话系统后生成导图；当前集成暂不支持 Claude Code 对话系统。');
    }
    let groups;
    try { groups = JSON.parse(String(pref('modelProviderGroups') || '[]')); }
    catch (_) { throw new Error('llm-for-zotero 模型配置无法读取，请在其设置中重新保存模型。'); }
    if (!Array.isArray(groups)) throw new Error('llm-for-zotero 模型配置格式无效。');
    const entries = groups.flatMap((group) => (Array.isArray(group?.models) ? group.models : [])
      .filter((entry) => typeof entry?.model === 'string' && entry.model.trim())
      .map((entry) => ({ group, entry })));
    const selectedId = requestedId || String(pref('lastUsedModelEntryId') || '');
    const selected = entries.find(({ entry }) => entry.id === selectedId) || entries[0];
    if (requestedId && !(requestedId === 'legacy-primary' && !entries.length) && !entries.some(({ entry }) => entry.id === requestedId)) {
      throw new Error('所选 llm-for-zotero 模型已移除，请刷新资料预览。');
    }
    const group = selected?.group || { apiBase: pref('apiBase'), apiKey: pref('apiKey'), authMode: 'api_key' };
    const entry = selected?.entry || { id: 'legacy-primary', model: pref('model') };
    const authMode = group.authMode || 'api_key';
    if (['webchat', 'codex_app_server'].includes(authMode)) {
      throw new Error('当前 llm-for-zotero 选中的是 WebChat 或 Codex App Server；导图集成暂支持 API 模型，请在 llm-for-zotero 选择 API 模型。');
    }
    if (!['api_key', 'copilot_auth', 'codex_auth'].includes(authMode)) {
      throw new Error('当前 llm-for-zotero 模型认证方式尚不支持导图调用，请选择 API 模型。');
    }
    const model = String(entry.model || '').trim();
    const apiBase = String(group.apiBase || '').trim();
    const apiKey = String(group.apiKey || '').trim();
    if (!model || !apiBase) throw new Error('请先在 llm-for-zotero 中配置接口和模型。');
    let url;
    try { url = new URL(apiBase); } catch (_) { throw new Error('llm-for-zotero 接口地址无效，请在其设置中检查。'); }
    const local = isPrivateOrLocalHost(url.hostname);
    if (!apiKey && !local && authMode === 'api_key') {
      throw new Error('请先在 llm-for-zotero 中配置 API 密钥。');
    }
    const advanced = Object.fromEntries(['temperature', 'outputTokenLimit', 'inputTokenCap', 'inputMode', 'profileOverride']
      .filter((key) => entry[key] !== undefined).map((key) => [key, entry[key]]));
    return { entryId: entry.id, groupId: group.id || 'legacy', model, apiBase,
      apiKey, authMode, providerProtocol: entry.providerProtocol || group.providerProtocol,
      advanced, host: url.host, local };
  };
  const getAbortControllerClass = () => Zotero.getMainWindow?.()?.AbortController || globalThis.AbortController;

  let llmConversationSequence = 0;
  const callLLMForZotero = async ({ config, systemPrompt, payload, reasoningLevel = 'default', signal, timeout = 120000 }) => {
    if (signal?.aborted) throw new Error(AI_CANCELLED);
    const addon = getLLMAddon();
    const live = readLLMModel(config.entryId);
    if (publicLLMConfig(live).fingerprint !== config.fingerprint) {
      throw new Error('llm-for-zotero 模型配置已变化，请重新读取并确认分析范围。');
    }
    const Controller = getAbortControllerClass();
    if (!Controller) throw new Error('当前 Zotero 缺少模型调用取消能力，请更新 Zotero。');
    const controller = new Controller();
    let timer;
    let forbiddenTool = false;
    let stopError;
    let rejectStop;
    const stopped = new Promise((_, reject) => { rejectStop = reject; });
    const stop = (error) => { stopError = error; controller.abort(); rejectStop(error); };
    const onAbort = () => stop(new Error(AI_CANCELLED));
    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => stop(new Error('llm-for-zotero 模型调用超时，请检查其连接设置或改用快速模式。')), timeout);
    try {
      // Each segment has its own conversation. No selected item, paper contexts,
      // library scope or chat history are supplied: only the confirmed payload.
      const request = {
        conversationKey: -(Date.now() * 1000 + (++llmConversationSequence % 1000)),
        mode: 'agent', conversationKind: 'global', item: null, history: [],
        userText: JSON.stringify(payload), systemPrompt: systemPrompt +
          '\n直接返回 JSON。不要调用任何工具、读取其他文献或资料、联网检索、创建笔记或修改 Zotero。',
        model: live.model, apiBase: live.apiBase, apiKey: live.apiKey,
        authMode: live.authMode, providerProtocol: live.providerProtocol, advanced: live.advanced,
        ...(reasoningLevel !== 'default' ? { reasoning: { provider: reasoningProvider(live), level: reasoningLevel } } : {}),
        metadata: { source: 'mindflow', workflow: 'paper-mindmap' },
      };
      const result = await Promise.race([Promise.resolve().then(() => {
        if (controller.signal.aborted) throw stopError || new Error(AI_CANCELLED);
        return addon.api.agent.runTurn(request, (event) => {
        if (event?.type === 'tool_call' || event?.type === 'confirmation_required') {
          forbiddenTool = true;
          const error = new Error('llm-for-zotero 尝试调用额外工具，本次分析已停止。请使用可直接输出 JSON 的 API 模型。');
          stop(error);
          // Upstream awaits this callback before executing a tool. Throw as well
          // as abort so no unselected material can be read on this path.
          throw error;
        }
        }, { signal: controller.signal });
      }), stopped]);
      if (stopError) throw stopError;
      if (forbiddenTool || result?.kind !== 'completed' || result?.runStatus === 'failed') {
        throw new Error('llm-for-zotero 未完成论文总结，请检查该插件中的模型连接与响应。');
      }
      if (typeof result.text !== 'string' || !result.text.trim() || result.text.length > 120000) {
        throw new Error('llm-for-zotero 未返回可用的论文总结内容。');
      }
      return { text: result.text, runId: typeof result.runId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(result.runId) ? result.runId : undefined };
    } catch (error) {
      if (stopError) throw stopError;
      // Upstream errors may contain request headers. Do not copy raw errors
      // into MindFlow previews or documents (or expose API credentials).
      Zotero.log?.('[MindFlow] llm-for-zotero paper analysis failed.');
      throw new Error('llm-for-zotero 模型调用失败，请在其设置中测试连接，或减少本次资料范围后重试。');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  };

