/**
 * Zotero MindFlow - Typed Pure Helpers for AI Paper Analysis, Evidence Sampling & DOI Normalization
 */

export const ALL_AI_SECTION_KEYS: readonly string[] = [
  'background', 'gap', 'question', 'system', 'conditions', 'method',
  'mechanism', 'findings', 'resolution', 'significance', 'limitations',
  'nextSteps', 'assumptions', 'predictions', 'validation', 'alternatives',
  'taxonomy', 'conflicts',
];

export const DEFAULT_OMISSION_MARKER = '[原文区间采样，区间之间有省略]';

export interface ExtractedSectionsResult {
  text: string;
  found: string[];
  missing: string[];
}

export interface LLMReasoningOption {
  id: string;
  label: string;
  enabled?: boolean;
}

export interface LLMConfigLike {
  entryId?: string;
  groupId?: string;
  model: string;
  apiBase: string;
  apiKey?: string;
  authMode?: string;
  providerProtocol?: string;
  advanced?: {
    temperature?: number;
    outputTokenLimit?: number;
    inputTokenCap?: number;
    inputMode?: string;
    profileOverride?: {
      forModel?: string;
      reasoning?: {
        kind?: string;
        options?: LLMReasoningOption[];
      };
    };
  };
  host?: string;
  local?: boolean;
}

export interface AIClaimEntry {
  text: string;
  detail: string;
  topic?: string;
  subtopic?: string;
  basis: string;
  source: string;
  sourceId?: string;
  quote: string;
}

/**
 * Extract abstract, introduction, and conclusion blocks using conservative heading boundaries.
 * Missing sections never fall back to sending the full manuscript.
 */
export function extractPaperSections(text: string, readingMode: string): ExtractedSectionsResult {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/^(\s*(?:abstract|摘要))\s*[:：]\s*(\S.*)$/gim, '$1\n$2')
    .split('\n');
  const intro = /^(?:introduction(?:\s+and\s+background)?|background|引言|绪论|前言)$/i;
  const abstractHeading = /^(?:abstract|摘要)$/i;
  const conclusion = /^(?:conclusions?(?:\s+(?:and|&)\s+(?:outlook|perspectives?|discussion))?|concluding remarks|summary(?:\s+(?:and|&)\s+(?:conclusions?|outlook|perspectives?))?|结论(?:与展望)?|总结(?:与展望)?|结语)$/i;
  const heading = /^(?:abstract|results?(?:\s+(?:and|&)\s+discussion)?|discussion|methods?|materials(?:\s+(?:and|&)\s+methods)?|experimental(?: section| methods| setup| procedure)?|sample preparation|characterization|theory|theoretical(?: model| framework)?|computational(?: methods| details)?|references|bibliography|acknowledg(?:e)?ments?|supporting information|supplementary(?: material| information)?|摘要|实验(?:部分|方法|条件)?|材料与方法|样品制备|理论模型|结果(?:与讨论)?|讨论|参考文献|致谢)$/i;

  const parseHeading = (line: string): { title: string; major: boolean } => {
    const value = line.trim().replace(/[:：]$/, '').trim();
    if (/^(?:key\s*words?|关键词)(?:\s*[:：].*|\s*)$/i.test(value)) return { title: 'Keywords', major: true };
    if (/^\d{1,2}\.\d/.test(value)) return { title: value, major: false };
    const numbered = value.match(/^(?:\d{1,2}|[IVX]+)(?:[.、．:]\s*|\s+)([A-Za-z\u4e00-\u9fff].{0,90})$/i);
    const title = numbered ? numbered[1].trim() : value;
    const measurement = /^(?:m?K|nm|[µμu]?m|m?W|eV|meV|[mµμu]?A|m?V|T|Hz|kHz|MHz|GHz|s|ms|ps|fs)\b/.test(title);
    return {
      title,
      major: intro.test(title) || conclusion.test(title) || heading.test(title) ||
        Boolean(numbered && !measurement && !/[.!?。！？]$/.test(title)),
    };
  };

  const locate = (pattern: RegExp, minimum: number): string => {
    const candidates: string[] = [];
    for (let start = 0; start < lines.length; start++) {
      if (!pattern.test(parseHeading(lines[start]).title)) continue;
      let end = start + 1;
      for (; end < lines.length; end++) {
        if (parseHeading(lines[end]).major) break;
      }
      const content = lines.slice(start, end).join('\n').trim();
      if (content.length >= minimum && (![intro, abstractHeading].includes(pattern) || end < lines.length)) {
        candidates.push(content);
      }
    }
    return candidates.length === 1 ? candidates[0] : '';
  };

  const locateInlineAbstract = (): string => {
    const raw = lines.join('\n');
    const markers = Array.from(raw.matchAll(/(?:^|\s)(?:Abstract|ABSTRACT|摘要)\s*[:：]?\s+(?=\S)/g));
    if (markers.length !== 1) return '';
    const marker = markers[0];
    const startIdx = (marker.index ?? 0) + marker[0].length;
    const tail = raw.slice(startIdx);
    const end = tail.search(/(?:^|\s)(?:(?:[Kk][Ee][Yy]\s*[Ww][Oo][Rr][Dd][Ss]?|关键词)\s*[:：]|(?:1|I)[.．、]?\s+Introduction\b|Introduction\s*(?:\n|[A-Z]))/);
    if (end < 0) return '';
    const content = tail.slice(0, end).trim();
    return content.length >= 100 && content.length <= 12000 ? `Abstract\n${content}` : '';
  };

  const sections: Record<string, string> = {};
  if (readingMode === 'abstract') sections.abstract = locate(abstractHeading, 100) || locateInlineAbstract();
  if (readingMode === 'introduction' || readingMode === 'key-sections') sections.introduction = locate(intro, 200);
  if (readingMode === 'conclusion' || readingMode === 'key-sections') sections.conclusion = locate(conclusion, 40);
  const missing = Object.keys(sections).filter((key) => !sections[key]);
  const blocks = Object.entries(sections).filter(([, content]) => Boolean(content));
  return {
    text: blocks.map(([key, content]) => `[所选部分：${key}]\n${content}`).join('\n\n'),
    found: blocks.map(([key]) => key),
    missing,
  };
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  if (!hostname) return false;
  if (['localhost', '127.0.0.1', '[::1]', '::1', '0.0.0.0', 'host.docker.internal'].includes(hostname)) return true;
  if (hostname.endsWith('.local') || hostname.endsWith('.lan') || hostname.endsWith('.home.arpa')) return true;
  return /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(hostname);
}

export function reasoningProvider(config: Pick<LLMConfigLike, 'model' | 'apiBase' | 'local'>): string {
  const name = `${config.model} ${config.apiBase}`.toLowerCase();
  const patterns: ReadonlyArray<readonly [RegExp, string]> = [
    [/deepseek/, 'deepseek'], [/kimi|moonshot/, 'kimi'], [/qwen|dashscope/, 'qwen'],
    [/gemini|generativelanguage/, 'gemini'], [/claude|anthropic/, 'anthropic'],
    [/glm|bigmodel/, 'glm'], [/minimax/, 'minimax'], [/mimo/, 'mimo'], [/grok|x\.ai/, 'grok'],
    [/gpt|openai|^o[134](?:-|\s)/, 'openai'],
  ];
  for (const [pattern, provider] of patterns) {
    if (pattern.test(name)) return provider;
  }
  return config.local ? 'local' : 'customized';
}

export function publicLLMConfig<T extends { apiKey?: unknown }>(entry: T): Omit<T, 'apiKey'> & { fingerprint: string } {
  const { apiKey: _removed, ...config } = entry;
  return { ...config, fingerprint: JSON.stringify(config) };
}

export function reasoningChoices(config: LLMConfigLike, capabilities?: { reasoning?: boolean } | null) {
  const defaults: Array<{ id: string; label: string }> = [{ id: 'default', label: '模型默认' }];
  if (capabilities?.reasoning === false) {
    return { reasoningSupported: false, reasoningOptions: defaults, reasoningOptionsSource: 'unsupported' };
  }
  const profile = config.advanced?.profileOverride;
  const override = (!profile?.forModel || profile.forModel.trim().toLowerCase() === config.model.toLowerCase())
    ? profile?.reasoning
    : null;
  if (override && Array.isArray(override.options)) {
    const seen = new Set(['default']);
    const options = override.options.filter((option) => {
      if (!option || typeof option.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(option.id) || seen.has(option.id)) {
        return false;
      }
      seen.add(option.id);
      return option.enabled !== false;
    });
    if (options.length || override.kind === 'none' || override.options.length) {
      return {
        reasoningSupported: options.length > 0,
        reasoningOptions: [
          ...defaults,
          ...options.map((option) => ({ id: option.id, label: String(option.label || option.id).slice(0, 120) })),
        ],
        reasoningOptionsSource: 'llm-for-zotero-profile',
      };
    }
  }
  return {
    reasoningSupported: true,
    reasoningOptions: [
      ...defaults,
      ...[
        ['minimal', '最低（minimal）'],
        ['low', '低（low）'],
        ['medium', '中（medium）'],
        ['high', '高（high）'],
        ['xhigh', '更高（xhigh）'],
      ].map(([id, label]) => ({ id, label })),
    ],
    reasoningOptionsSource: 'upstream-mapping',
  };
}

export function modelPreview(entry: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    ['entryId', 'model', 'host', 'local', 'available', 'message', 'reasoningSupported', 'reasoningOptions', 'reasoningOptionsSource']
      .filter((key) => entry[key] !== undefined)
      .map((key) => [key, entry[key]]),
  );
}

export function extractJsonFromLlmOutput(text: unknown): Record<string, any> | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, any>;
  } catch (_) {}

  const blockMatches = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi));
  for (const match of blockMatches) {
    if (match[1]) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed && typeof parsed === 'object') return parsed as Record<string, any>;
      } catch (_) {}
    }
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    try {
      const parsed = JSON.parse(trimmed.slice(first, last + 1));
      if (parsed && typeof parsed === 'object') return parsed as Record<string, any>;
    } catch (_) {}
  }
  return null;
}

export function normalizeEvidence(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function sampleAcrossText(value: string, limit: number, omissionMarker = DEFAULT_OMISSION_MARKER): string {
  if (value.length <= limit) return value;
  const slices = 8;
  const width = Math.floor(limit / slices);
  return Array.from({ length: slices }, (_, index) => {
    const start = Math.floor((value.length - width) * index / (slices - 1));
    return value.slice(start, start + width);
  }).join(`\n${omissionMarker}\n`);
}

export function samplePreparedPDF(value: string, limit: number, omissionMarker = DEFAULT_OMISSION_MARKER): string {
  const passages = value.split(omissionMarker).map((piece) => piece.trim()).filter(Boolean);
  if (passages.length <= 1) return sampleAcrossText(value, limit, omissionMarker);
  const perPassage = Math.floor(limit / passages.length);
  return passages.map((piece) => sampleAcrossText(piece, perPassage, omissionMarker))
    .join(`\n${omissionMarker}\n`);
}

export function splitTextForAI(value: string, maxLength: number): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < value.length;) {
    let end = Math.min(start + maxLength, value.length);
    if (end < value.length) {
      const paragraph = value.lastIndexOf('\n\n', end);
      const line = value.lastIndexOf('\n', end);
      const boundary = paragraph > start + maxLength * 0.65
        ? paragraph + 2
        : line > start + maxLength * 0.8 ? line + 1 : end;
      end = boundary;
    }
    chunks.push(value.slice(start, end));
    start = end;
  }
  return chunks;
}

export function pdfSegmentsForAI(
  value: string,
  maxLength: number,
  omissionMarker = DEFAULT_OMISSION_MARKER,
): Array<{ id: string; text: string }> {
  return value.split(omissionMarker)
    .flatMap((passage) => splitTextForAI(passage.trim(), maxLength))
    .filter((text) => text.trim())
    .map((text, index) => ({ id: `P${index + 1}`, text }));
}

export function normalizeAIClaimEntry<T>(entry: T): T | AIClaimEntry {
  return typeof entry === 'string'
    ? {
      text: entry,
      detail: '模型返回了未带结构化引文的文字；保留内容供阅读，但必须人工核对原文。',
      basis: 'inference',
      source: 'none',
      quote: '',
    }
    : entry;
}

export function compactSegmentDrafts(
  drafts: Array<Record<string, AIClaimEntry[] | undefined>>,
  limit = 5,
  sectionKeys: readonly string[] = ALL_AI_SECTION_KEYS,
): Record<string, AIClaimEntry[]> {
  return Object.fromEntries(sectionKeys.map((key) => {
    const selected: AIClaimEntry[] = [];
    const seen = new Set<string>();
    const maxLength = Math.max(0, ...drafts.map((draft) => draft[key]?.length || 0));
    for (let rank = 0; rank < maxLength && selected.length < limit; rank += 1) {
      for (const draft of drafts) {
        const entry = draft[key]?.[rank];
        if (!entry || selected.length >= limit) continue;
        const identity = `${entry.sourceId}:${normalizeEvidence(entry.text)}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        selected.push(entry);
      }
    }
    return [key, selected.map((entry) => ({
      text: entry.text.slice(0, 600),
      detail: entry.detail.slice(0, 1000),
      topic: entry.topic,
      subtopic: entry.subtopic,
      basis: entry.basis,
      source: entry.source,
      sourceId: entry.sourceId,
      quote: entry.quote.slice(0, 240),
    }))];
  }));
}

export function normalizeDOI(value: unknown): string {
  if (!value || typeof value !== 'string') return '';
  let clean = value
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .trim()
    .toLowerCase();
  const urlMatch = clean.match(/https?:\/\/(?:dx\.)?doi\.org\/[^\s]+/i)?.[0];
  if (urlMatch) {
    clean = urlMatch.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').split(/[?#]/, 1)[0];
  }
  try {
    clean = decodeURIComponent(clean).toLowerCase();
  } catch (_) {}
  clean = clean.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  clean = clean.replace(/^doi:\s*/i, '');
  const match = clean.match(/10\.\d{4,9}\/[^\s"'`\\]+/);
  if (!match) return '';
  let result = match[0].replace(/[.,;:，。；：、]+$/, '');
  for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>']] as const) {
    while (result.endsWith(close) && result.split(close).length > result.split(open).length) {
      result = result.slice(0, -1);
    }
  }
  return /^10\.\d{4,9}\/.+/.test(result) ? result : '';
}
