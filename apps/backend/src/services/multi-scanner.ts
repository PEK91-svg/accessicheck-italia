import { chromium, Browser, Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { runCustomChecks } from './custom-checks';
import { analyzeResults } from './analyzer';
import { crawlInternalLinks } from './crawler';
import { validateUrl } from './scanner';
import { PageResult, ScanResult, Score, ScanSummary, ViolationDetail } from '../types';
import { calculateScore, determineConformanceLevel } from './scorer';

const SCAN_TIMEOUT_MS = 30_000;
const MAX_PAGES_LIMIT = 50;

export type ProgressCallback = (progress: {
  currentUrl: string;
  pagesScanned: number;
  pagesTotal: number;
}) => void;

/**
 * Scansiona più pagine di un sito a partire dall'URL base.
 * Richiama onProgress dopo ogni pagina completata.
 */
export async function scanMultiplePages(
  baseUrl: string,
  maxPages: number,
  onProgress: ProgressCallback
): Promise<{ pages: PageResult[]; totalDuration: number }> {
  validateUrl(baseUrl);

  const limit = Math.min(maxPages, MAX_PAGES_LIMIT);
  const startTime = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'AccessiCheck-Italia/1.0 (+https://accessicheck.it/bot)',
      locale: 'it-IT',
    });

    // ─── Step 1: carica la pagina base e scopri i link ──────────────────
    console.info(`[multi-scanner] Caricamento pagina base: ${baseUrl}`);
    onProgress({ currentUrl: baseUrl, pagesScanned: 0, pagesTotal: 1 });

    const basePage: Page = await context.newPage();
    basePage.setDefaultTimeout(SCAN_TIMEOUT_MS);

    await basePage.goto(baseUrl, { waitUntil: 'networkidle', timeout: SCAN_TIMEOUT_MS });
    await basePage.waitForTimeout(800);

    // Crawl dei link interni (limit - 1 perché la base conta già come 1)
    const internalLinks = await crawlInternalLinks(basePage, baseUrl, limit - 1);
    const allUrls = [baseUrl, ...internalLinks].slice(0, limit);

    console.info(`[multi-scanner] Trovate ${allUrls.length} pagine da analizzare`);
    onProgress({ currentUrl: baseUrl, pagesScanned: 0, pagesTotal: allUrls.length });

    // ─── Step 2: scansiona ogni pagina ──────────────────────────────────
    const pages: PageResult[] = [];

    for (let i = 0; i < allUrls.length; i++) {
      const url = allUrls[i];
      console.info(`[multi-scanner] Pagina ${i + 1}/${allUrls.length}: ${url}`);
      onProgress({ currentUrl: url, pagesScanned: i, pagesTotal: allUrls.length });

      const pageResult = await scanSinglePage(context, url, i === 0 ? basePage : null);
      pages.push(pageResult);

      onProgress({ currentUrl: url, pagesScanned: i + 1, pagesTotal: allUrls.length });
    }

    await browser.close();
    browser = null;

    return { pages, totalDuration: Date.now() - startTime };
  } catch (error) {
    if (browser) await browser.close().catch(() => undefined);
    throw error;
  }
}

/**
 * Scansiona una singola pagina riutilizzando la page esistente o creandone una nuova.
 */
async function scanSinglePage(
  context: Awaited<ReturnType<Browser['newContext']>>,
  url: string,
  existingPage: Page | null
): Promise<PageResult> {
  const pageStart = Date.now();
  let page: Page | null = existingPage;
  const isNewPage = !existingPage;

  try {
    if (!page) {
      page = await context.newPage();
      page.setDefaultTimeout(SCAN_TIMEOUT_MS);
      await page.goto(url, { waitUntil: 'networkidle', timeout: SCAN_TIMEOUT_MS });
      await page.waitForTimeout(500);
    }

    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .options({ resultTypes: ['violations', 'passes', 'incomplete', 'inapplicable'] })
      .analyze();

    const customChecks = await runCustomChecks(page);

    if (isNewPage) await page.close();

    const normalizeNodes = (items: typeof axeResults.violations) =>
      items.map((r) => ({
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

    const rawData = {
      violations: normalizeNodes(axeResults.violations),
      passes: normalizeNodes(axeResults.passes),
      incomplete: normalizeNodes(axeResults.incomplete),
      inapplicable: normalizeNodes(axeResults.inapplicable),
      customChecks,
      duration: Date.now() - pageStart,
    };

    const analyzed = analyzeResults(url, rawData);

    return {
      url,
      score: analyzed.score,
      conformanceLevel: analyzed.conformanceLevel,
      summary: analyzed.summary,
      violations: analyzed.violations,
      duration: Date.now() - pageStart,
    };
  } catch (error) {
    if (isNewPage && page) await page.close().catch(() => undefined);
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[multi-scanner] Errore su ${url}: ${msg}`);

    return {
      url,
      score: { overall: 0, perceivable: 0, operable: 0, understandable: 0, robust: 0 },
      conformanceLevel: 'non_conforme',
      summary: {
        totalViolations: 0,
        totalPasses: 0,
        totalIncomplete: 0,
        totalInapplicable: 0,
        byCriticality: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      },
      violations: [],
      duration: Date.now() - pageStart,
      error: msg,
    };
  }
}

/**
 * Aggrega i risultati di tutte le pagine in un unico ScanResult.
 */
export function aggregateResults(
  baseUrl: string,
  pages: PageResult[],
  totalDuration: number
): Omit<ScanResult, 'id' | 'status' | 'passes' | 'incomplete' | 'customChecks' | 'manualCheckRequired'> {
  const successPages = pages.filter((p) => !p.error);

  // Score medio tra tutte le pagine riuscite
  const avgScore = (key: keyof Score): number => {
    if (successPages.length === 0) return 0;
    return Math.round(
      successPages.reduce((sum, p) => sum + p.score[key], 0) / successPages.length
    );
  };

  const score: Score = {
    overall: avgScore('overall'),
    perceivable: avgScore('perceivable'),
    operable: avgScore('operable'),
    understandable: avgScore('understandable'),
    robust: avgScore('robust'),
  };

  // Raggruppa tutte le violazioni per ruleId, aggiungendo quale pagina le ha trovate
  const violationMap = new Map<string, ViolationDetail & { pages: string[] }>();

  for (const page of successPages) {
    for (const v of page.violations) {
      const key = v.ruleId;
      if (violationMap.has(key)) {
        violationMap.get(key)!.pages.push(page.url);
        // Aggiungi nodi della pagina corrente
        violationMap.get(key)!.nodes.push(...v.nodes);
      } else {
        violationMap.set(key, { ...v, pages: [page.url] });
      }
    }
  }

  const allViolations = Array.from(violationMap.values());

  // Sommario aggregato
  const summary: ScanSummary = {
    totalViolations: allViolations.length,
    totalPasses: successPages.reduce((s, p) => s + p.summary.totalPasses, 0),
    totalIncomplete: successPages.reduce((s, p) => s + p.summary.totalIncomplete, 0),
    totalInapplicable: successPages.reduce((s, p) => s + p.summary.totalInapplicable, 0),
    byCriticality: {
      critical: allViolations.filter((v) => v.impact === 'critical').length,
      serious: allViolations.filter((v) => v.impact === 'serious').length,
      moderate: allViolations.filter((v) => v.impact === 'moderate').length,
      minor: allViolations.filter((v) => v.impact === 'minor').length,
    },
  };

  const conformanceLevel = determineConformanceLevel(allViolations);

  return {
    url: baseUrl,
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    score,
    conformanceLevel,
    summary,
    violations: allViolations,
    pages,
    maxPages: pages.length,
  };
}
