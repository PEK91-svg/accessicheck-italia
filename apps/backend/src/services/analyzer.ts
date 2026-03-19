import { RawScanData, AxeRawResult } from './scanner';
import {
  ScanResult,
  ViolationDetail,
  CriteriaResult,
  ManualCheckCriterion,
  ImpactLevel,
  WcagLevel,
  WcagPrinciple,
  NormativeMapping,
  LeggeStancaEntry,
  WcagCriterion,
} from '../types';
import { calculateScore, determineConformanceLevel } from './scorer';
import { v4 as uuidv4 } from 'uuid';

// Caricamento dati di mapping
import wcagCriteriaData from '../data/wcag21-criteria.json';
import leggeStancaData from '../data/legge-stanca-mapping.json';
import axeToWcagData from '../data/axe-rule-to-wcag.json';

const wcagCriteria = wcagCriteriaData as WcagCriterion[];
const leggeStancaMap = leggeStancaData as Record<string, LeggeStancaEntry>;
const axeToWcag = axeToWcagData as Record<string, string[]>;

// Mappa principi WCAG → italiano
const PRINCIPLE_IT: Record<WcagPrinciple, string> = {
  perceivable: 'Percepibile',
  operable: 'Operabile',
  understandable: 'Comprensibile',
  robust: 'Robusto',
};

// Testi descrittivi in italiano per le regole axe-core più comuni
const AXE_DESCRIPTIONS_IT: Record<string, string> = {
  'image-alt': 'Immagini senza testo alternativo',
  'color-contrast': 'Contrasto colore insufficiente tra testo e sfondo',
  'html-has-lang': 'Elemento HTML senza attributo lang',
  'html-lang-valid': 'Attributo lang non valido sull\'elemento HTML',
  'document-title': 'Pagina senza titolo (<title>)',
  'link-name': 'Link senza testo accessibile',
  'bypass': 'Mancanza di meccanismo per saltare la navigazione ripetitiva',
  'label': 'Campo form senza etichetta associata',
  'aria-roles': 'Ruolo ARIA non valido',
  'aria-valid-attr': 'Attributo ARIA non valido',
  'aria-required-attr': 'Attributo ARIA obbligatorio mancante',
  'button-name': 'Pulsante senza nome accessibile',
  'heading-order': 'Gerarchia degli heading non sequenziale',
  'empty-heading': 'Heading vuoto',
  'tabindex': 'Valore tabindex troppo alto che altera l\'ordine del focus',
  'duplicate-id': 'ID duplicato nella pagina',
  'duplicate-id-active': 'ID duplicato su elemento interattivo',
  'duplicate-id-aria': 'ID referenziato da ARIA è duplicato',
  'frame-title': 'Frame o iframe senza titolo',
  'select-name': 'Select senza etichetta accessibile',
  'input-image-alt': 'Input immagine senza testo alternativo',
  'area-alt': 'Area della mappa senza testo alternativo',
  'meta-refresh': 'Redirect o refresh automatico della pagina',
  'blink': 'Uso dell\'elemento obsoleto <blink>',
  'marquee': 'Uso dell\'elemento obsoleto <marquee>',
  'meta-viewport': 'Meta viewport blocca lo zoom dell\'utente',
  'autocomplete-valid': 'Valore autocomplete non valido sul campo form',
  'css-orientation-lock': 'CSS blocca l\'orientamento dello schermo',
  'scrollable-region-focusable': 'Regione scorrevole non raggiungibile da tastiera',
  'landmark-one-main': 'Mancanza del landmark main nella pagina',
  'region': 'Contenuto principale non incluso in un landmark',
  'aria-hidden-focus': 'Elemento con aria-hidden contiene elementi focusabili',
  'valid-lang': 'Attributo lang con valore non valido',
  'label-content-name-mismatch': 'Nome accessibile non contiene il testo visibile dell\'etichetta',
  'aria-status': 'Messaggio di stato non determinabile programmaticamente',
};

const AXE_REMEDIATION_IT: Record<string, string> = {
  'image-alt': 'Aggiungere attributo alt descrittivo alle immagini informative. Usare alt="" per immagini decorative.',
  'color-contrast': 'Aumentare il contrasto tra colore del testo e sfondo. Il rapporto minimo richiesto è 4,5:1 per testo normale e 3:1 per testo grande (18pt o 14pt grassetto).',
  'html-has-lang': 'Aggiungere l\'attributo lang all\'elemento <html>, es: <html lang="it">.',
  'document-title': 'Aggiungere un tag <title> descrittivo nell\'elemento <head> della pagina.',
  'link-name': 'Aggiungere testo descrittivo al link. Per link con icona usare aria-label o aria-labelledby.',
  'bypass': 'Aggiungere uno skip link prima della navigazione: <a href="#main-content">Vai al contenuto principale</a>. Assicurarsi che i landmark HTML5 siano presenti.',
  'label': 'Associare ogni campo form a una <label> tramite attributo for corrispondente all\'id del campo. In alternativa usare aria-label o aria-labelledby.',
  'button-name': 'Aggiungere testo visibile al pulsante o attributo aria-label descrittivo.',
  'heading-order': 'Correggere l\'ordine degli heading seguendo la gerarchia sequenziale H1→H2→H3 senza saltare livelli.',
  'empty-heading': 'Aggiungere testo descrittivo all\'heading oppure rimuoverlo se non necessario.',
  'duplicate-id': 'Assicurarsi che ogni attributo id nella pagina sia unico.',
  'frame-title': 'Aggiungere attributo title descrittivo agli elementi <iframe> e <frame>.',
  'meta-viewport': 'Rimuovere user-scalable=no dal meta viewport. Impostare maximum-scale ad almeno 5.',
  'aria-roles': 'Verificare che i valori dell\'attributo role corrispondano ai ruoli ARIA validi definiti nella specifica WAI-ARIA.',
  'landmark-one-main': 'Aggiungere un elemento <main> che racchiuda il contenuto principale della pagina.',
};

/**
 * Determina il principio WCAG dal criterio ID.
 */
function getPrincipleFromCriterionId(criterionId: string): WcagPrinciple {
  const prefix = parseInt(criterionId.charAt(0), 10);
  switch (prefix) {
    case 1: return 'perceivable';
    case 2: return 'operable';
    case 3: return 'understandable';
    case 4: return 'robust';
    default: return 'perceivable';
  }
}

/**
 * Determina il livello WCAG prevalente per un array di criteri.
 */
function getWcagLevel(criteriaIds: string[]): WcagLevel {
  for (const id of criteriaIds) {
    const criterion = wcagCriteria.find((c) => c.id === id);
    if (criterion?.level === 'AA') return 'AA';
  }
  return 'A';
}

/**
 * Ottiene il mapping normativo italiano per un criterio WCAG.
 */
function getNormativeMapping(criterionId: string): NormativeMapping {
  const entry = leggeStancaMap[criterionId];
  if (entry) {
    return {
      en_301_549: entry.en_301_549,
      legge_stanca_ref: entry.legge_stanca_ref,
      agid_ref: entry.agid_ref,
      eaa_ref: entry.eaa_ref,
    };
  }
  return {
    en_301_549: '—',
    legge_stanca_ref: '—',
    agid_ref: '—',
    eaa_ref: '—',
  };
}

/**
 * Arricchisce una violazione axe-core con i dati normativi italiani.
 */
function enrichViolation(raw: AxeRawResult): ViolationDetail {
  const wcagCriteriaIds = axeToWcag[raw.id] ?? [];
  const primaryCriterion = wcagCriteriaIds[0];
  const principle = primaryCriterion
    ? getPrincipleFromCriterionId(primaryCriterion)
    : 'robust';

  const lsEntry = primaryCriterion ? leggeStancaMap[primaryCriterion] : undefined;

  const normative = getNormativeMapping(primaryCriterion ?? '');

  return {
    ruleId: raw.id,
    impact: (raw.impact ?? 'minor') as ImpactLevel,
    wcagCriteria: wcagCriteriaIds,
    wcagLevel: getWcagLevel(wcagCriteriaIds),
    principle,
    principleIt: PRINCIPLE_IT[principle],
    description: raw.description,
    descriptionIt: AXE_DESCRIPTIONS_IT[raw.id] ?? raw.description,
    help: raw.help,
    helpUrl: raw.helpUrl,
    normative,
    remediationIt: lsEntry?.remediation_it ?? AXE_REMEDIATION_IT[raw.id] ?? raw.help,
    affectedUsers: lsEntry?.affected_users ?? [],
    nodes: raw.nodes.map((n) => ({
      target: n.target,
      html: n.html,
      failureSummary: n.failureSummary,
    })),
  };
}

/**
 * Crea i criteri per la checklist di verifica manuale.
 * Filtra i criteri che non sono testabili automaticamente.
 */
function buildManualChecklist(): ManualCheckCriterion[] {
  return wcagCriteria
    .filter((c) => c.test_type === 'manual')
    .map((c) => {
      const lsEntry = leggeStancaMap[c.id];
      return {
        id: c.id,
        name_it: c.name_it,
        description_it: lsEntry?.description_it ?? c.description_it,
        manual_check_needed: lsEntry?.manual_check_needed ?? '',
        level: c.level,
        principle_it: c.principle_it,
        en_301_549: lsEntry?.en_301_549 ?? '—',
      };
    });
}

/**
 * Analizza i dati grezzi di scansione e produce il risultato strutturato.
 */
export function analyzeResults(url: string, rawData: RawScanData): ScanResult {
  // Arricchisce le violazioni con dati normativi italiani
  const violations: ViolationDetail[] = rawData.violations.map(enrichViolation);

  // Normalizza passes e incomplete
  const passes: CriteriaResult[] = rawData.passes.map((r) => ({
    ruleId: r.id,
    wcagCriteria: axeToWcag[r.id] ?? [],
    description: r.description,
    impact: (r.impact ?? null) as ImpactLevel | null,
    nodes: r.nodes,
  }));

  const incomplete: CriteriaResult[] = rawData.incomplete.map((r) => ({
    ruleId: r.id,
    wcagCriteria: axeToWcag[r.id] ?? [],
    description: r.description,
    impact: (r.impact ?? null) as ImpactLevel | null,
    nodes: r.nodes,
  }));

  // Aggiunge le violazioni dai check custom
  const customViolations = rawData.customChecks.filter((c) => !c.passed);
  const customPasses = rawData.customChecks.filter((c) => c.passed);

  // Aggiungi check custom falliti come violazioni aggiuntive
  const allViolations: ViolationDetail[] = [
    ...violations,
    ...customViolations.map((c) => {
      const primaryCriterion = c.wcagCriteria[0];
      const principle = primaryCriterion
        ? getPrincipleFromCriterionId(primaryCriterion)
        : 'operable';
      const normative = getNormativeMapping(primaryCriterion ?? '');
      const lsEntry = primaryCriterion ? leggeStancaMap[primaryCriterion] : undefined;

      return {
        ruleId: c.checkId,
        impact: c.impact,
        wcagCriteria: c.wcagCriteria,
        wcagLevel: 'AA' as WcagLevel,
        principle,
        principleIt: PRINCIPLE_IT[principle],
        description: c.description,
        descriptionIt: c.description,
        help: c.details,
        helpUrl: '',
        normative,
        remediationIt: c.remediationIt || lsEntry?.remediation_it || '',
        affectedUsers: lsEntry?.affected_users ?? [],
        nodes: [],
      } as ViolationDetail;
    }),
  ];

  // Calcola il riepilogo
  const summary = {
    totalViolations: allViolations.length,
    totalPasses: passes.length + customPasses.length,
    totalIncomplete: incomplete.length,
    totalInapplicable: rawData.inapplicable.length,
    byCriticality: {
      critical: allViolations.filter((v) => v.impact === 'critical').length,
      serious: allViolations.filter((v) => v.impact === 'serious').length,
      moderate: allViolations.filter((v) => v.impact === 'moderate').length,
      minor: allViolations.filter((v) => v.impact === 'minor').length,
    },
  };

  // Calcola score e livello di conformità
  const score = calculateScore(allViolations, passes, incomplete);
  const conformanceLevel = determineConformanceLevel(allViolations);

  // Checklist criteri non testabili automaticamente
  const manualCheckRequired = buildManualChecklist();

  return {
    id: uuidv4(),
    url,
    timestamp: new Date().toISOString(),
    duration: rawData.duration,
    status: 'completed',
    score,
    conformanceLevel,
    summary,
    violations: allViolations,
    passes,
    incomplete,
    customChecks: rawData.customChecks,
    manualCheckRequired,
    screenshotBase64: rawData.screenshotBase64,
  };
}
