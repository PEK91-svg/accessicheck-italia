import { useState } from 'react';
import { ScanResult } from '../types';

interface ManualChecklistProps {
  criteria: ScanResult['manualCheckRequired'];
}

export function ManualChecklist({ criteria }: ManualChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const checkedCount = checked.size;
  const progress = Math.round((checkedCount / criteria.length) * 100);

  return (
    <section aria-label="Checklist verifiche manuali">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-amber-800">
          <strong>Questi {criteria.length} criteri WCAG 2.1 non sono testabili automaticamente</strong> e richiedono
          verifica manuale con tecnologie assistive reali (NVDA, JAWS, VoiceOver, Dragon NaturallySpeaking).
          Usa questa checklist per tracciare le verifiche effettuate.
        </p>
        {checkedCount > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-amber-700 mb-1">
              <span>Progresso verifica</span>
              <span>{checkedCount}/{criteria.length}</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-1.5">
              <div
                className="bg-amber-600 h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Verifiche completate: ${checkedCount} su ${criteria.length}`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {criteria.map((criterion) => {
          const isChecked = checked.has(criterion.id);
          return (
            <div
              key={criterion.id}
              className={`border rounded-lg p-3 transition-colors ${
                isChecked ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(criterion.id)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0"
                  aria-describedby={`check-desc-${criterion.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">
                      {criterion.id}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        criterion.level === 'AA'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {criterion.level}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {criterion.name_it}
                    </span>
                  </div>
                  {criterion.manual_check_needed && (
                    <div
                      id={`check-desc-${criterion.id}`}
                      className="mt-1 text-xs text-gray-500"
                    >
                      {criterion.manual_check_needed}
                    </div>
                  )}
                  {criterion.en_301_549 !== '—' && (
                    <div className="mt-0.5 text-xs text-gray-400">
                      EN 301 549: {criterion.en_301_549} — {criterion.principle_it}
                    </div>
                  )}
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
