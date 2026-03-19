import { chromium, Browser, Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { runCustomChecks } from './custom-checks';
import { CustomCheckResult } from '../types';

// URL non consentite per ragioni di sicurezza
const BLOCKED_PATTERNS = [
  /^file:\/\//,
  /^ftp:\/\//,
  /localhost/i,
  /127\.0\.0\.1/,
  /192\.168\.\d+\.\d+/,
  /10\.\d+\.\d+\.\d+/,
  /172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/,
  /\[::1\]/,
];

const SCAN_TIMEOUT_MS = 30_000;

export interface RawScanData {
  violations: AxeRawResult[];
  passes: AxeRawResult[];
  incomplete: AxeRawResult[];
  inapplicable: AxeRawResult[];
  customChecks: CustomCheckResult[];
  screenshotBase64?: string;
  duration: number;
}

export interface AxeRawResult {
  id: string;
  impact: string | null;
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: {
    target: string[];
    html: string;
    failureSummary: string;
  }[];
}

/**
 * Valida l'URL prima della scansione.
 * Lancia un errore se l'URL non è consentita.
 */
export function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`URL non valida: ${url}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Protocollo non consentito: ${parsed.protocol}. Usare http:// o https://`);
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(parsed.hostname) || pattern.test(url)) {
      throw new Error(`URL non consentita: non è possibile analizzare indirizzi locali o privati`);
    }
  }
}

/**
 * Esegue la scansione di accessibilità tramite Playwright + axe-core.
 * Restituisce i dati grezzi prima del post-processing.
 */
export async function scanPage(url: string, includeScreenshot = false): Promise<RawScanData> {
  validateUrl(url);

  const startTime = Date.now();
  let browser: Browser | null = null;

  try {
    console.info(`[scanner] Avvio scansione: ${url}`);

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'AccessiCheck-Italia/1.0 (+https://accessicheck.it/bot)',
      locale: 'it-IT',
    });

    const page: Page = await context.newPage();

    // Timeout globale sulla navigazione
    page.setDefaultTimeout(SCAN_TIMEOUT_MS);

    console.info(`[scanner] Navigazione verso: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: SCAN_TIMEOUT_MS,
    });

    // Attesa aggiuntiva per contenuti caricati in JS
    await page.waitForTimeout(1000);

    console.info(`[scanner] Pagina caricata, avvio axe-core`);

    // Esecuzione axe-core con tag WCAG 2.1 A+AA
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .options({
        resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable'],
      })
      .analyze();

    console.info(`[scanner] axe-core completato: ${axeResults.violations.length} violazioni`);

    // Check custom aggiuntivi
    const customChecks = await runCustomChecks(page);

    // Screenshot opzionale
    let screenshotBase64: string | undefined;
    if (includeScreenshot) {
      const screenshotBuffer = await page.screenshot({ fullPage: false });
      screenshotBase64 = screenshotBuffer.toString('base64');
    }

    await browser.close();
    browser = null;

    const duration = Date.now() - startTime;
    console.info(`[scanner] Scansione completata in ${duration}ms`);

    // Normalizza i nodi di ogni risultato axe
    const normalizeNodes = (results: typeof axeResults.violations) =>
      results.map((r) => ({
        id: r.id,
        impact: r.impact ?? null,
        tags: r.tags,
        description: r.description,
        help: r.help,
        helpUrl: r.helpUrl,
        nodes: r.nodes.map((n) => ({
          target: n.target.map(String),
          html: n.html,
          failureSummary: n.failureSummary ?? '',
        })),
      }));

    return {
      violations: normalizeNodes(axeResults.violations),
      passes: normalizeNodes(axeResults.passes),
      incomplete: normalizeNodes(axeResults.incomplete),
      inapplicable: normalizeNodes(axeResults.inapplicable),
      customChecks,
      screenshotBase64,
      duration,
    };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => undefined);
    }

    const duration = Date.now() - startTime;
    console.error(`[scanner] Errore durante la scansione dopo ${duration}ms:`, error);

    throw error;
  }
}
