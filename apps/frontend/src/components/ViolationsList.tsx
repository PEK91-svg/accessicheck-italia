import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { ViolationDetail, ImpactLevel } from '../types';

interface ViolationsListProps {
  violations: ViolationDetail[];
}

type FilterLevel = 'all' | ImpactLevel;

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; color: string; bgColor: string; borderColor: string }> = {
  critical:  { label: 'Critico',  color: 'text-red-700',    bgColor: 'bg-red-100',    borderColor: 'border-red-400' },
  serious:   { label: 'Serio',    color: 'text-orange-700', bgColor: 'bg-orange-100', borderColor: 'border-orange-400' },
  moderate:  { label: 'Moderato', color: 'text-yellow-700', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400' },
  minor:     { label: 'Minore',   color: 'text-blue-700',   bgColor: 'bg-blue-100',   borderColor: 'border-blue-400' },
};

function ViolationItem({ violation }: { violation: ViolationDetail }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = IMPACT_CONFIG[violation.impact];

  return (
    <div className={`border rounded-lg overflow-hidden ${cfg.borderColor} border`}>
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`violation-detail-${violation.ruleId}`}
      >
        <span
          className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded uppercase mt-0.5 ${cfg.bgColor} ${cfg.color}`}
          aria-label={`Severità: ${cfg.label}`}
        >
          {cfg.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">
            {violation.descriptionIt || violation.description}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {violation.wcagCriteria.length > 0 && (
              <span>
                WCAG {violation.wcagCriteria.join(', ')} (Livello {violation.wcagLevel})
              </span>
            )}
            {violation.normative.en_301_549 !== '—' && (
              <span> — EN 301 549: {violation.normative.en_301_549}</span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {violation.nodes.length} elemento{violation.nodes.length !== 1 ? 'i' : ''} coinvolto{violation.nodes.length !== 1 ? 'i' : ''}
          </div>
        </div>
        <span aria-hidden="true" className="flex-shrink-0 text-gray-400 mt-1">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        <div
          id={`violation-detail-${violation.ruleId}`}
          className="px-4 pb-4 border-t border-gray-100 bg-gray-50"
        >
          {/* Mappatura normativa */}
          {violation.normative.legge_stanca_ref !== '—' && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white border border-gray-200 rounded p-2">
                <div className="font-semibold text-gray-500 mb-1">EN 301 549</div>
                <div>{violation.normative.en_301_549}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-2">
                <div className="font-semibold text-gray-500 mb-1">Legge Stanca</div>
                <div>{violation.normative.legge_stanca_ref}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-2">
                <div className="font-semibold text-gray-500 mb-1">EAA</div>
                <div>{violation.normative.eaa_ref}</div>
              </div>
            </div>
          )}

          {/* Remediation */}
          {violation.remediationIt && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <span className="font-semibold text-blue-800">✏️ Correzione suggerita: </span>
              <span className="text-blue-700">{violation.remediationIt}</span>
            </div>
          )}

          {/* Utenti coinvolti */}
          {violation.affectedUsers.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Utenti coinvolti: </span>
              {violation.affectedUsers.join(', ')}
            </div>
          )}

          {/* Link Deque */}
          {violation.helpUrl && (
            <div className="mt-2">
              <a
                href={violation.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                Documentazione Deque
              </a>
            </div>
          )}

          {/* Elementi coinvolti */}
          {violation.nodes.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-gray-600 mb-2">
                Elementi coinvolti ({violation.nodes.length}):
              </div>
              <div className="space-y-2">
                {violation.nodes.slice(0, 3).map((node, i) => (
                  <div key={i} className="text-xs">
                    <div className="text-gray-500 mb-1">
                      Selettore: <code className="bg-gray-200 px-1 rounded">{node.target.join(' ')}</code>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto text-xs whitespace-pre-wrap break-all">
                      {node.html.slice(0, 300)}{node.html.length > 300 ? '...' : ''}
                    </pre>
                  </div>
                ))}
                {violation.nodes.length > 3 && (
                  <div className="text-xs text-gray-400">
                    ... e altri {violation.nodes.length - 3} elementi
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ViolationsList({ violations }: ViolationsListProps) {
  const [filter, setFilter] = useState<FilterLevel>('all');

  const filtered =
    filter === 'all' ? violations : violations.filter((v) => v.impact === filter);

  const counts: Record<FilterLevel, number> = {
    all: violations.length,
    critical: violations.filter((v) => v.impact === 'critical').length,
    serious: violations.filter((v) => v.impact === 'serious').length,
    moderate: violations.filter((v) => v.impact === 'moderate').length,
    minor: violations.filter((v) => v.impact === 'minor').length,
  };

  const filterButtons: { key: FilterLevel; label: string }[] = [
    { key: 'all', label: 'Tutte' },
    { key: 'critical', label: 'Critiche' },
    { key: 'serious', label: 'Serie' },
    { key: 'moderate', label: 'Moderate' },
    { key: 'minor', label: 'Minori' },
  ];

  if (violations.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-green-700 font-semibold text-lg mb-1">
          ✓ Nessuna violazione rilevata automaticamente
        </div>
        <div className="text-green-600 text-sm">
          Score 100/100 sui criteri testabili. Verificare comunque la checklist manuale.
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Lista violazioni accessibilità">
      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filtra per severità">
        {filterButtons.map(({ key, label }) => (
          counts[key] > 0 || key === 'all' ? (
            <button
              key={key}
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`px-3 py-1.5 text-sm rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                filter === key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-75">({counts[key]})</span>
            </button>
          ) : null
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2" aria-live="polite" aria-label={`${filtered.length} violazioni visualizzate`}>
        {filtered.map((v) => (
          <ViolationItem key={v.ruleId} violation={v} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nessuna violazione con severità selezionata.
        </div>
      )}
    </section>
  );
}
