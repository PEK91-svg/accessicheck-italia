import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { ScanResult, ConformanceLevel } from '../types';

interface ScoreCardProps {
  result: ScanResult;
}

const PRINCIPLE_COLORS: Record<string, string> = {
  perceivable: '#3B82F6',
  operable: '#10B981',
  understandable: '#F59E0B',
  robust: '#8B5CF6',
};

const PRINCIPLE_LABELS: Record<string, string> = {
  perceivable: 'Percepibile',
  operable: 'Operabile',
  understandable: 'Comprensibile',
  robust: 'Robusto',
};

function ConformanceBadge({ level }: { level: ConformanceLevel }) {
  const styles: Record<ConformanceLevel, { bg: string; text: string; border: string; label: string; icon: string }> = {
    conforme: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-500',
      label: 'Conforme',
      icon: '✓',
    },
    parzialmente_conforme: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-500',
      label: 'Parzialmente Conforme',
      icon: '⚠',
    },
    non_conforme: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-500',
      label: 'Non Conforme',
      icon: '✗',
    },
  };

  const s = styles[level];
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-semibold ${s.bg} ${s.text} ${s.border}`}>
      <span aria-hidden="true">{s.icon}</span>
      <span>{s.label}</span>
    </div>
  );
}

function PrincipleBar({
  principle,
  score,
}: {
  principle: string;
  score: number;
}) {
  const color = PRINCIPLE_COLORS[principle] ?? '#6B7280';
  const label = PRINCIPLE_LABELS[principle] ?? principle;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>
          {score}%
        </span>
      </div>
      <div
        className="w-full bg-gray-200 rounded-full h-2"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score ${label}: ${score}%`}
      >
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function ScoreCard({ result }: ScoreCardProps) {
  const { score, conformanceLevel, summary } = result;

  const gaugeData = [{ value: score.overall, fill: score.overall >= 80 ? '#16a34a' : score.overall >= 50 ? '#ca8a04' : '#dc2626' }];

  return (
    <section aria-label="Score di accessibilità" className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Gauge score globale */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center">
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="75%"
              innerRadius="60%"
              outerRadius="100%"
              startAngle={180}
              endAngle={0}
              data={gaugeData}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={6} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center -mt-6">
          <div
            className="text-5xl font-bold font-heading"
            aria-label={`Score accessibilità: ${score.overall} su 100`}
          >
            {score.overall}
          </div>
          <div className="text-gray-500 text-sm">/100</div>
          <div className="mt-2">
            <ConformanceBadge level={conformanceLevel} />
          </div>
        </div>
      </div>

      {/* Score per principio */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-heading font-semibold text-gray-900 mb-4">
          Score per Principio WCAG
        </h3>
        <div className="space-y-4">
          {(['perceivable', 'operable', 'understandable', 'robust'] as const).map(
            (principle) => (
              <PrincipleBar
                key={principle}
                principle={principle}
                score={score[principle]}
              />
            )
          )}
        </div>
      </div>

      {/* Riepilogo conteggi */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-heading font-semibold text-gray-900 mb-4">
          Riepilogo Risultati
        </h3>

        <div className="space-y-3">
          {summary.byCriticality.critical > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-critical flex-shrink-0" aria-hidden="true" />
                <span className="text-sm text-gray-700">Critiche</span>
              </div>
              <span className="font-bold text-critical text-lg">
                {summary.byCriticality.critical}
              </span>
            </div>
          )}
          {summary.byCriticality.serious > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-serious flex-shrink-0" aria-hidden="true" />
                <span className="text-sm text-gray-700">Serie</span>
              </div>
              <span className="font-bold text-serious text-lg">
                {summary.byCriticality.serious}
              </span>
            </div>
          )}
          {summary.byCriticality.moderate > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-moderate flex-shrink-0" aria-hidden="true" />
                <span className="text-sm text-gray-700">Moderate</span>
              </div>
              <span className="font-bold text-moderate text-lg">
                {summary.byCriticality.moderate}
              </span>
            </div>
          )}
          {summary.byCriticality.minor > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-minor flex-shrink-0" aria-hidden="true" />
                <span className="text-sm text-gray-700">Minori</span>
              </div>
              <span className="font-bold text-minor text-lg">
                {summary.byCriticality.minor}
              </span>
            </div>
          )}

          <hr className="border-gray-100" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Criteri superati</span>
            <span className="font-semibold text-green-700">{summary.totalPasses}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Da verificare</span>
            <span className="font-semibold text-purple-700">{summary.totalIncomplete}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Non applicabili</span>
            <span className="font-semibold text-gray-500">{summary.totalInapplicable}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
