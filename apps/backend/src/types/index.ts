// Tipi principali per AccessiCheck Italia

export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';
export type WcagLevel = 'A' | 'AA';
export type WcagPrinciple = 'perceivable' | 'operable' | 'understandable' | 'robust';
export type ConformanceLevel = 'conforme' | 'parzialmente_conforme' | 'non_conforme';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TestType = 'yes' | 'partial' | 'manual';

// ─── Dati normativi italiani ───────────────────────────────────────────────

export interface NormativeMapping {
  en_301_549: string;
  legge_stanca_ref: string;
  agid_ref: string;
  eaa_ref: string;
}

// ─── Risultati axe-core grezzi (semplificati) ─────────────────────────────

export interface AxeNodeResult {
  target: string[];
  html: string;
  failureSummary: string;
}

// ─── Violazioni elaborate ──────────────────────────────────────────────────

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
  nodes: AxeNodeResult[];
}

// ─── Criteri superati/incompleti ──────────────────────────────────────────

export interface CriteriaResult {
  ruleId: string;
  wcagCriteria: string[];
  description: string;
  impact: ImpactLevel | null;
  nodes: AxeNodeResult[];
}

// ─── Check custom aggiuntivi ──────────────────────────────────────────────

export interface HeadingInfo {
  tag: string;
  text: string;
  level: number;
}

export interface LandmarkInfo {
  tag: string;
  role: string;
}

export interface CustomCheckResult {
  checkId: string;
  passed: boolean;
  impact: ImpactLevel;
  wcagCriteria: string[];
  description: string;
  details: string;
  remediationIt: string;
}

// ─── Score ────────────────────────────────────────────────────────────────

export interface Score {
  overall: number;
  perceivable: number;
  operable: number;
  understandable: number;
  robust: number;
}

export interface ScanSummary {
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
}

// ─── Criterio WCAG per checklist manuale ──────────────────────────────────

export interface ManualCheckCriterion {
  id: string;
  name_it: string;
  description_it: string;
  manual_check_needed: string;
  level: WcagLevel;
  principle_it: string;
  en_301_549: string;
}

// ─── Risultato scansione unificato ────────────────────────────────────────

export interface ScanResult {
  id: string;
  url: string;
  timestamp: string;
  duration: number;
  status: ScanStatus;
  score: Score;
  conformanceLevel: ConformanceLevel;
  summary: ScanSummary;
  violations: ViolationDetail[];
  passes: CriteriaResult[];
  incomplete: CriteriaResult[];
  customChecks: CustomCheckResult[];
  manualCheckRequired: ManualCheckCriterion[];
  screenshotBase64?: string;
  error?: string;
}

// ─── Input API ────────────────────────────────────────────────────────────

export interface ScanOptions {
  level: WcagLevel;
  standard: 'wcag21' | 'wcag22';
  locale: 'it' | 'en';
  includeScreenshot: boolean;
}

export interface ScanRequest {
  url: string;
  options?: Partial<ScanOptions>;
}

// ─── Dati JSON di mapping (per caricamento file) ──────────────────────────

export interface WcagCriterion {
  id: string;
  name_en: string;
  name_it: string;
  level: WcagLevel;
  principle: WcagPrinciple;
  principle_it: string;
  guideline: string;
  guideline_name_it: string;
  new_in_21: boolean;
  description_it: string;
  understanding_url: string;
  test_type: TestType;
}

export interface LeggeStancaEntry {
  wcag_id: string;
  wcag_name_it: string;
  wcag_name_en: string;
  level: WcagLevel;
  principle: WcagPrinciple;
  principle_it: string;
  guideline: string;
  guideline_name_it: string;
  en_301_549: string;
  legge_stanca_ref: string;
  agid_ref: string;
  eaa_ref: string;
  description_it: string;
  test_type: TestType;
  automated_coverage: string;
  manual_check_needed: string;
  remediation_it: string;
  severity_if_missing: ImpactLevel;
  affected_users: string[];
}
