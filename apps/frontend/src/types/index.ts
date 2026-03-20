// Tipi condivisi frontend

export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';
export type WcagLevel = 'A' | 'AA';
export type WcagPrinciple = 'perceivable' | 'operable' | 'understandable' | 'robust';
export type ConformanceLevel = 'conforme' | 'parzialmente_conforme' | 'non_conforme';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface NormativeMapping {
  en_301_549: string;
  legge_stanca_ref: string;
  agid_ref: string;
  eaa_ref: string;
}

export interface ViolationDetail {
  ruleId: string;
  impact: ImpactLevel;
  wcagCriteria: string[];
  wcagLevel: WcagLevel;
  principle: WcagPrinciple;
  principleIt: string;
  description: string;
  descriptionIt: string;
  help: string;
  helpUrl: string;
  normative: NormativeMapping;
  remediationIt: string;
  affectedUsers: string[];
  nodes: {
    target: string[];
    html: string;
    failureSummary: string;
  }[];
}

export interface Score {
  overall: number;
  perceivable: number;
  operable: number;
  understandable: number;
  robust: number;
}

export interface PageResult {
  url: string;
  score: Score;
  conformanceLevel: ConformanceLevel;
  summary: {
    totalViolations: number;
    totalPasses: number;
    totalIncomplete: number;
    totalInapplicable: number;
    byCriticality: { critical: number; serious: number; moderate: number; minor: number };
  };
  violations: ViolationDetail[];
  duration: number;
  error?: string;
}

export interface ScanProgress {
  currentUrl: string;
  pagesScanned: number;
  pagesTotal: number;
}

export interface ScanResult {
  id: string;
  url: string;
  timestamp: string;
  duration: number;
  status: ScanStatus;
  score: Score;
  conformanceLevel: ConformanceLevel;
  maxPages?: number;
  pages?: PageResult[];
  progress?: ScanProgress;
  summary: {
    totalViolations: number;
    totalPasses: number;
    totalIncomplete: number;
    totalInapplicable: number;
    byCriticality: {
      critical: number;
      serious: number;
      moderate: number;
      minor: number;
    };
  };
  violations: ViolationDetail[];
  passes: { ruleId: string; wcagCriteria: string[]; description: string }[];
  incomplete: { ruleId: string; wcagCriteria: string[]; description: string }[];
  manualCheckRequired: {
    id: string;
    name_it: string;
    description_it: string;
    manual_check_needed: string;
    level: WcagLevel;
    principle_it: string;
    en_301_549: string;
  }[];
  error?: string;
}

export interface ScanPollingResponse {
  scanId: string;
  status: ScanStatus;
  url: string;
  message?: string;
  error?: string;
  progress?: ScanProgress;
}
