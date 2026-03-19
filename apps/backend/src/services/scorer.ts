import {
  ViolationDetail,
  CriteriaResult,
  Score,
  ConformanceLevel,
  WcagPrinciple,
  ImpactLevel,
} from '../types';

/**
 * Calcola lo score di accessibilità (0-100) overall e per principio WCAG.
 *
 * Formula: (pass / (pass + violations + incomplete)) × 100
 * I criteri inapplicabili non contano.
 */
export function calculateScore(
  violations: ViolationDetail[],
  passes: CriteriaResult[],
  incomplete: CriteriaResult[]
): Score {
  const principles: WcagPrinciple[] = [
    'perceivable',
    'operable',
    'understandable',
    'robust',
  ];

  const scoreForPrinciple = (principle: WcagPrinciple | null): number => {
    const filterByPrinciple = (items: { wcagCriteria: string[] }[]) =>
      principle
        ? items.filter((item) =>
            item.wcagCriteria.some((id) => getPrincipleFromId(id) === principle)
          )
        : items;

    const filteredPasses = filterByPrinciple(passes).length;
    const filteredViolations = filterByPrinciple(violations).length;
    const filteredIncomplete = filterByPrinciple(incomplete).length;

    const total = filteredPasses + filteredViolations + filteredIncomplete;
    if (total === 0) return 100; // Nessun criterio testato = consideriamo 100

    return Math.round((filteredPasses / total) * 100);
  };

  return {
    overall: scoreForPrinciple(null),
    perceivable: scoreForPrinciple('perceivable'),
    operable: scoreForPrinciple('operable'),
    understandable: scoreForPrinciple('understandable'),
    robust: scoreForPrinciple('robust'),
  };
}

/**
 * Determina il livello di conformità in base alle violazioni.
 *
 * - "conforme": 0 violazioni
 * - "parzialmente_conforme": violazioni presenti ma nessuna critical
 * - "non_conforme": ≥1 critical o > 10 violazioni totali
 */
export function determineConformanceLevel(violations: ViolationDetail[]): ConformanceLevel {
  if (violations.length === 0) {
    return 'conforme';
  }

  const hasCritical = violations.some((v) => v.impact === 'critical');
  if (hasCritical || violations.length > 10) {
    return 'non_conforme';
  }

  return 'parzialmente_conforme';
}

/**
 * Calcola il peso ponderato di una violazione (per uso futuro v2).
 */
export function getImpactWeight(impact: ImpactLevel): number {
  switch (impact) {
    case 'critical': return 4;
    case 'serious':  return 3;
    case 'moderate': return 2;
    case 'minor':    return 1;
  }
}

/**
 * Ottieni il principio WCAG dall'ID criterio.
 */
function getPrincipleFromId(criterionId: string): WcagPrinciple {
  const prefix = parseInt(criterionId.charAt(0), 10);
  switch (prefix) {
    case 1: return 'perceivable';
    case 2: return 'operable';
    case 3: return 'understandable';
    case 4: return 'robust';
    default: return 'perceivable';
  }
}
