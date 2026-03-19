import puppeteer from 'puppeteer';
import { ScanResult, ViolationDetail, ConformanceLevel } from '../types';

/**
 * Genera il report PDF della scansione tramite Puppeteer (HTML→PDF).
 */
export async function generatePdfReport(result: ScanResult): Promise<Buffer> {
  const html = buildReportHtml(result);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: 20, left: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size:9px; font-family:Arial,sans-serif; color:#6b7280; width:100%; padding:0 15mm; box-sizing:border-box; display:flex; justify-content:space-between;">
          <span>AccessiCheck Italia — Audit Accessibilità WCAG 2.1 AA</span>
          <span>Pagina <span class="pageNumber"></span> di <span class="totalPages"></span></span>
        </div>
      `,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getConformanceBadge(level: ConformanceLevel): string {
  switch (level) {
    case 'conforme':
      return '<span style="background:#dcfce7;color:#166534;padding:4px 12px;border-radius:4px;font-weight:700;border:1px solid #16a34a;">✓ Conforme</span>';
    case 'parzialmente_conforme':
      return '<span style="background:#fef9c3;color:#854d0e;padding:4px 12px;border-radius:4px;font-weight:700;border:1px solid #ca8a04;">⚠ Parzialmente Conforme</span>';
    case 'non_conforme':
      return '<span style="background:#fee2e2;color:#991b1b;padding:4px 12px;border-radius:4px;font-weight:700;border:1px solid #dc2626;">✗ Non Conforme</span>';
  }
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case 'critical':  return '#DC2626';
    case 'serious':   return '#EA580C';
    case 'moderate':  return '#CA8A04';
    case 'minor':     return '#2563EB';
    default:          return '#6B7280';
  }
}

function getImpactLabel(impact: string): string {
  switch (impact) {
    case 'critical':  return 'Critico';
    case 'serious':   return 'Serio';
    case 'moderate':  return 'Moderato';
    case 'minor':     return 'Minore';
    default:          return impact;
  }
}

function renderViolations(violations: ViolationDetail[]): string {
  if (violations.length === 0) {
    return '<p style="color:#16a34a;font-weight:600;">✓ Nessuna violazione rilevata automaticamente.</p>';
  }

  return violations
    .map(
      (v) => `
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:16px;page-break-inside:avoid;">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px;">
          <span style="background:${getImpactColor(v.impact)};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;white-space:nowrap;text-transform:uppercase;">${getImpactLabel(v.impact)}</span>
          <div>
            <strong style="font-size:14px;">${v.descriptionIt || v.description}</strong>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">
              Regola: <code>${v.ruleId}</code>
            </div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;">
          <tr>
            <td style="padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;width:35%;">Criterio WCAG</td>
            <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.wcagCriteria.join(', ')} (Livello ${v.wcagLevel})</td>
          </tr>
          <tr>
            <td style="padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Principio</td>
            <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.principleIt}</td>
          </tr>
          ${v.normative.en_301_549 !== '—' ? `
          <tr>
            <td style="padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">EN 301 549</td>
            <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.normative.en_301_549}</td>
          </tr>
          <tr>
            <td style="padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Legge Stanca</td>
            <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.normative.legge_stanca_ref}</td>
          </tr>
          <tr>
            <td style="padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">EAA</td>
            <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.normative.eaa_ref}</td>
          </tr>
          ` : ''}
          ${v.affectedUsers.length > 0 ? `
          <tr>
            <td style="padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Utenti coinvolti</td>
            <td style="padding:4px 8px;border:1px solid #e5e7eb;">${v.affectedUsers.join(', ')}</td>
          </tr>
          ` : ''}
        </table>

        ${v.remediationIt ? `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:8px 12px;font-size:12px;">
          <strong>✏️ Correzione suggerita:</strong> ${v.remediationIt}
        </div>
        ` : ''}

        ${v.nodes.length > 0 ? `
        <details style="margin-top:8px;">
          <summary style="font-size:12px;color:#4b5563;cursor:pointer;">
            ${v.nodes.length} elemento${v.nodes.length > 1 ? 'i' : ''} coinvolto${v.nodes.length > 1 ? 'i' : ''}
          </summary>
          ${v.nodes.slice(0, 3).map((n) => `
          <div style="margin-top:6px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:8px;font-size:11px;">
            <div style="color:#6b7280;margin-bottom:4px;">Selettore: <code>${n.target.join(' ')}</code></div>
            <pre style="background:#1f2937;color:#f9fafb;padding:6px 8px;border-radius:4px;overflow-x:auto;font-size:10px;white-space:pre-wrap;word-break:break-all;">${escapeHtml(n.html.slice(0, 200))}${n.html.length > 200 ? '...' : ''}</pre>
          </div>
          `).join('')}
          ${v.nodes.length > 3 ? `<p style="font-size:11px;color:#6b7280;">... e altri ${v.nodes.length - 3} elementi</p>` : ''}
        </details>
        ` : ''}
      </div>
    `
    )
    .join('');
}

function renderManualChecklist(criteria: ScanResult['manualCheckRequired']): string {
  return criteria
    .map(
      (c) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;white-space:nowrap;">
          <span style="font-weight:600;">${c.id}</span>
          <span style="background:${c.level === 'AA' ? '#dbeafe' : '#dcfce7'};color:${c.level === 'AA' ? '#1e40af' : '#166534'};padding:1px 5px;border-radius:3px;font-size:10px;margin-left:4px;">${c.level}</span>
        </td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;">${c.name_it}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:11px;color:#6b7280;">${c.manual_check_needed}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;">☐</td>
      </tr>
    `
    )
    .join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderScoreBar(score: number, color: string): string {
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="flex:1;background:#e5e7eb;border-radius:4px;height:8px;">
        <div style="width:${score}%;background:${color};border-radius:4px;height:8px;"></div>
      </div>
      <span style="font-size:12px;font-weight:600;min-width:36px;text-align:right;">${score}%</span>
    </div>
  `;
}

// ─── Template HTML principale ─────────────────────────────────────────────

function buildReportHtml(result: ScanResult): string {
  const { score, summary, violations, conformanceLevel, manualCheckRequired } = result;

  const criticalAndSerious = violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  const otherViolations = violations.filter(
    (v) => v.impact !== 'critical' && v.impact !== 'serious'
  );

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Accessibilità — ${result.url}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 14px; line-height: 1.5; }
    h1 { font-size: 28px; font-weight: 700; }
    h2 { font-size: 20px; font-weight: 700; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    h3 { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
    .page-break { page-break-before: always; }
    .section { margin-bottom: 32px; }
    code { font-family: "Courier New", monospace; font-size: 12px; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }
    table { border-collapse: collapse; width: 100%; }
    .disclaimer { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px 16px; font-size: 12px; color: #92400e; }
  </style>
</head>
<body>

<!-- ═══════════════════ COPERTINA ═══════════════════ -->
<div style="min-height:297mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:40mm 20mm;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:white;">
  <div style="font-size:14px;font-weight:600;letter-spacing:3px;text-transform:uppercase;opacity:0.8;margin-bottom:16px;">REPORT DI ACCESSIBILITÀ WEB</div>
  <h1 style="color:white;font-size:36px;margin-bottom:8px;">AccessiCheck Italia</h1>
  <div style="width:60px;height:3px;background:rgba(255,255,255,0.5);margin:16px auto;"></div>

  <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:24px 40px;margin:24px 0;max-width:500px;">
    <div style="font-size:13px;opacity:0.8;margin-bottom:4px;">URL analizzata</div>
    <div style="font-size:16px;font-weight:600;word-break:break-all;">${escapeHtml(result.url)}</div>
  </div>

  <div style="display:flex;gap:40px;margin:16px 0;">
    <div style="text-align:center;">
      <div style="font-size:48px;font-weight:700;line-height:1;">${score.overall}</div>
      <div style="font-size:13px;opacity:0.8;">/100</div>
      <div style="font-size:12px;opacity:0.7;margin-top:4px;">Score globale</div>
    </div>
    <div style="width:1px;background:rgba(255,255,255,0.3);"></div>
    <div style="text-align:center;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:16px;font-weight:600;">${
        conformanceLevel === 'conforme' ? '✓ Conforme' :
        conformanceLevel === 'parzialmente_conforme' ? '⚠ Parzialmente Conforme' :
        '✗ Non Conforme'
      }</div>
      <div style="font-size:12px;opacity:0.7;margin-top:4px;">${summary.totalViolations} violazioni rilevate</div>
    </div>
  </div>

  <div style="margin-top:32px;font-size:12px;opacity:0.7;">
    <div>Standard: WCAG 2.1 Livello AA — EN 301 549</div>
    <div>Data: ${formatDate(result.timestamp)}</div>
    <div>Durata scansione: ${(result.duration / 1000).toFixed(1)}s</div>
  </div>

  <div style="margin-top:40px;font-size:11px;opacity:0.6;border-top:1px solid rgba(255,255,255,0.3);padding-top:16px;">
    ⚠ Audit automatico — copertura ~57% dei criteri WCAG. Non sostituisce la verifica manuale completa.
  </div>
</div>

<!-- ═══════════════════ EXECUTIVE SUMMARY ═══════════════════ -->
<div class="page-break" style="padding:20mm 15mm;">
  <div class="section">
    <h2>1. Riepilogo Esecutivo</h2>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">

      <!-- Score per principio -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;">
        <h3>Score per Principio WCAG</h3>
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:13px;">Percepibile</span>
          </div>
          ${renderScoreBar(score.perceivable, '#3B82F6')}
        </div>
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:13px;">Operabile</span>
          </div>
          ${renderScoreBar(score.operable, '#10B981')}
        </div>
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:13px;">Comprensibile</span>
          </div>
          ${renderScoreBar(score.understandable, '#F59E0B')}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:13px;">Robusto</span>
          </div>
          ${renderScoreBar(score.robust, '#8B5CF6')}
        </div>
      </div>

      <!-- Conteggi -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;">
        <h3>Risultati per Severità</h3>
        <table>
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="display:inline-block;width:12px;height:12px;background:#DC2626;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>
              Critiche
            </td>
            <td style="padding:6px 0;font-weight:700;text-align:right;font-size:16px;color:#DC2626;">${summary.byCriticality.critical}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="display:inline-block;width:12px;height:12px;background:#EA580C;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>
              Serie
            </td>
            <td style="padding:6px 0;font-weight:700;text-align:right;font-size:16px;color:#EA580C;">${summary.byCriticality.serious}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="display:inline-block;width:12px;height:12px;background:#CA8A04;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>
              Moderate
            </td>
            <td style="padding:6px 0;font-weight:700;text-align:right;font-size:16px;color:#CA8A04;">${summary.byCriticality.moderate}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;">
              <span style="display:inline-block;width:12px;height:12px;background:#2563EB;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>
              Minori
            </td>
            <td style="padding:6px 0;font-weight:700;text-align:right;font-size:16px;color:#2563EB;">${summary.byCriticality.minor}</td>
          </tr>
          <tr style="border-top:2px solid #e5e7eb;">
            <td style="padding:8px 0;font-size:13px;font-weight:600;">Totale violazioni</td>
            <td style="padding:8px 0;font-weight:700;text-align:right;font-size:18px;">${summary.totalViolations}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:12px;color:#6b7280;">Criteri superati</td>
            <td style="padding:4px 0;text-align:right;font-size:13px;color:#16a34a;font-weight:600;">${summary.totalPasses}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:12px;color:#6b7280;">Da verificare manualmente</td>
            <td style="padding:4px 0;text-align:right;font-size:13px;color:#8B5CF6;font-weight:600;">${summary.totalIncomplete}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Riferimenti normativi -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;">
      <h3 style="color:#1e40af;">Riferimenti Normativi Applicabili</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:12px;">
        <div>
          <div style="font-weight:700;color:#1e40af;margin-bottom:4px;">WCAG 2.1 AA</div>
          <div>Standard tecnico W3C — 50 criteri di successo (Livello A + AA)</div>
        </div>
        <div>
          <div style="font-weight:700;color:#1e40af;margin-bottom:4px;">Legge Stanca (L. 4/2004)</div>
          <div>PA + soggetti privati >500M€. Dichiarazione accessibilità annuale (scadenza: 23 settembre)</div>
        </div>
        <div>
          <div style="font-weight:700;color:#1e40af;margin-bottom:4px;">EAA — D.Lgs. 82/2022</div>
          <div>Obbligatorio dal 28 giugno 2025 per aziende >10 dipendenti o >2M€ fatturato</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ VIOLAZIONI CRITICHE/SERIE ═══ -->
  ${criticalAndSerious.length > 0 ? `
  <div class="section">
    <h2>2. Violazioni Prioritarie (${criticalAndSerious.length})</h2>
    <p style="color:#6b7280;font-size:13px;margin-bottom:16px;">
      Queste violazioni critiche e serie richiedono intervento immediato. Hanno il maggiore impatto sull'accessibilità per gli utenti con disabilità.
    </p>
    ${renderViolations(criticalAndSerious)}
  </div>
  ` : `
  <div class="section">
    <h2>2. Violazioni Prioritarie</h2>
    <p style="color:#16a34a;font-weight:600;">✓ Nessuna violazione critica o seria rilevata automaticamente.</p>
  </div>
  `}
</div>

<!-- ═══════════════════ TUTTE LE VIOLAZIONI ═══════════════════ -->
${otherViolations.length > 0 ? `
<div class="page-break" style="padding:20mm 15mm;">
  <div class="section">
    <h2>3. Altre Violazioni (${otherViolations.length})</h2>
    ${renderViolations(otherViolations)}
  </div>
</div>
` : ''}

<!-- ═══════════════════ CHECKLIST MANUALE ═══════════════════ -->
<div class="page-break" style="padding:20mm 15mm;">
  <div class="section">
    <h2>${otherViolations.length > 0 ? '4' : '3'}. Criteri da Verificare Manualmente (${manualCheckRequired.length})</h2>
    <p style="color:#6b7280;font-size:13px;margin-bottom:16px;">
      I seguenti ${manualCheckRequired.length} criteri WCAG non sono testabili automaticamente e richiedono verifica da parte di un esperto di accessibilità, possibilmente con tecnologie assistive reali (NVDA, JAWS, VoiceOver).
    </p>
    <table>
      <thead>
        <tr style="background:#f3f4f6;font-size:12px;">
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;white-space:nowrap;">Criterio</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Nome</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Come verificare</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:center;width:40px;">✓</th>
        </tr>
      </thead>
      <tbody>
        ${renderManualChecklist(manualCheckRequired)}
      </tbody>
    </table>
  </div>

  <!-- Disclaimer finale -->
  <div class="disclaimer">
    <strong>⚠ Disclaimer — Limiti dell'Audit Automatico</strong><br>
    Questo report è generato da uno strumento di audit automatico che analizza il ${((result.summary.totalPasses / Math.max(1, result.summary.totalPasses + result.summary.totalViolations)) * 100).toFixed(0)}% dei criteri WCAG testabili automaticamente, corrispondente a circa il 30-57% del totale dei criteri WCAG 2.1 AA.
    Un audit automatico <strong>non sostituisce</strong> una valutazione completa di conformità che richiede:
    test con tecnologie assistive reali (NVDA, JAWS, VoiceOver, Dragon NaturallySpeaking),
    verifica manuale da esperti di accessibilità, e test con utenti con disabilità reali.
    AccessiCheck Italia fornisce un punto di partenza per identificare problemi evidenti e pianificare l'adeguamento.
    Non costituisce certificazione di conformità alla Legge Stanca o all'EAA.
  </div>
</div>

</body>
</html>`;
}
