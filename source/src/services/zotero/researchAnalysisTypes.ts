/**
 * Zotero MindFlow - AI research analysis data contracts.
 * Pure types: no runtime imports, no host calls.
 */
import type { MindMapDocument } from '../../core/model/types';

export type SectionKey = string;

export interface ResearchClaim {
  text: string;
  topic?: string;
  subtopic?: string;
  detail: string;
  basis: 'paper' | 'inference' | 'unresolved';
  source: 'abstract' | 'pdf' | 'note' | 'annotation' | 'comment' | 'none';
  sourceId?: string;
  requestedSource?: ResearchClaim['source'];
  requestedSourceId?: string;
  verification?: 'matched' | 'no_quote' | 'no_source' | 'unknown_source' | 'ambiguous' | 'unmatched' | 'not_in_draft';
  quote: string;
  attemptedQuote?: string;
  sourceRecovery?: boolean;
  evidenceContext?: string;
  link?: string;
  pageLabel?: string;
}

export interface ResearchInputPreview {
  abstractText?: string;
  /** Local recovery text; never part of an analysis request. */
  abstractExcerpt?: string;
  readingMode: ResearchReadingMode;
  preparedId: string;
  title: string;
  zoteroUri: string;
  model: string;
  endpointHost: string;
  localModel: boolean;
  defaultModelEntryId: string;
  models: ResearchModelOption[];
  archiveState: string;
  quickCalls: number;
  standardCalls?: number;
  deepCalls: number;
  estimatedCharacters: number;
  sourceCharacters: ResearchSourceCharacters;
  sourceScope: ResearchAnalysis['sourceScope'] & {
    omittedNotes: number;
    omittedAnnotations: number;
    pdfCharacters: number;
    maxPages: number;
    highlightCount: number;
    commentCount: number;
    abstractTruncated: boolean;
    trimmedNotes: number;
    trimmedHighlights: number;
    trimmedComments: number;
    noteReadErrors: number;
    annotationReadErrors: number;
    pdfAttachmentTitle: string;
    paperHasAbstract: boolean;
    pdfAttachmentCount: number;
  };
}

export interface ResearchSourceSelection {
  abstract: boolean;
  pdf: boolean;
  notes: boolean;
  highlights: boolean;
  comments: boolean;
}

export interface ResearchModelOption {
  entryId: string;
  model: string;
  host?: string;
  local?: boolean;
  available: boolean;
  message?: string;
  reasoningSupported: boolean;
  reasoningOptions: Array<{ id: ResearchReasoningLevel; label: string }>;
  reasoningOptionsSource?: 'llm-for-zotero-profile' | 'upstream-mapping' | 'unsupported';
}
export type ResearchReasoningLevel = string;
export type ResearchReadingMode = 'abstract' | 'introduction' | 'conclusion' | 'key-sections' | 'full';
export interface ResearchModelSelection {
  modelEntryId: string;
  reasoningLevel: ResearchReasoningLevel;
  templateId?: string;
  customPrompt?: string;
  presentation?: ResearchAppearance | null;
}

export type ResearchSourceCharacters = Record<keyof ResearchSourceSelection, number>;

export interface ResearchProgress {
  phase: string;
  completed: number;
  total: number;
}

export type ResearchAnalysisIntensity = 'quick' | 'standard' | 'deep';

export interface ResearchRequestOptions {
  abstractSelection?: { preparedId: string; text: string };
  readingMode?: ResearchReadingMode;
  preparedId?: string;
  mode?: ResearchAnalysisIntensity;
  modelEntryId?: string;
  reasoningLevel?: ResearchReasoningLevel;
  templateId?: string;
  customPrompt?: string;
  sources?: ResearchSourceSelection;
  expectedCalls?: number;
  signal?: AbortSignal;
  onProgress?: (progress: ResearchProgress) => void;
}

export interface ResearchAnalysis {
  title: string;
  zoteroUri: string;
  libraryID?: number;
  sourceScope: {
    pdfState: string;
    pdfTruncated: boolean;
    hasAbstract: boolean;
    noteCount: number;
    annotationCount: number;
    analysisMode?: ResearchAnalysisIntensity;
    quickSampled?: boolean;
    standardMode?: boolean;
    deepCondensed?: boolean;
    synthesisCandidateLimit?: number;
    model?: string;
    modelEntryId?: string;
    reasoningLevel?: ResearchReasoningLevel;
    endpointHost?: string;
    llmIntegration?: { service: 'llm-for-zotero'; api: 'agent.runTurn'; completedCalls: number; runIds: string[] };
    templateId?: string;
    templateVersion?: number;
    customPrompt?: string;
    readingMode?: ResearchReadingMode;
    abstractSource?: 'zotero' | 'pdf' | 'pdf-selected' | 'manual' | 'none';
    sectionStatus?: { found: string[]; missing: string[] };
    selectedSources?: ResearchSourceSelection;
    sourceWarnings?: {
      abstractTruncated: boolean;
      trimmedNotes: number;
      trimmedHighlights: number;
      trimmedComments: number;
      noteReadErrors: number;
      annotationReadErrors: number;
      omittedNotes: number;
      omittedAnnotations: number;
    };
  };
  sections: Record<SectionKey, ResearchClaim[]>;
}

export type ResearchAppearance = Pick<MindMapDocument, 'themeId' | 'layoutType'>;
