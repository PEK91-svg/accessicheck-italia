import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { scanPage, validateUrl } from '../services/scanner';
import { analyzeResults } from '../services/analyzer';
import { generatePdfReport } from '../services/pdf';
import { scanMultiplePages, aggregateResults } from '../services/multi-scanner';
import { ScanResult, ScanStatus } from '../types';

const router = Router();

// Store in-memory per i risultati (MVP — no database)
const scanStore = new Map<string, ScanResult & { status: ScanStatus; error?: string }>();

// Schema validazione input
const ScanRequestSchema = z.object({
  url: z.string().url({ message: 'URL non valida. Assicurarsi di includere http:// o https://' }),
  options: z
    .object({
      level: z.enum(['A', 'AA']).default('AA'),
      standard: z.enum(['wcag21', 'wcag22']).default('wcag21'),
      locale: z.enum(['it', 'en']).default('it'),
      includeScreenshot: z.boolean().default(false),
      maxPages: z.number().int().min(1).max(50).default(1),
    })
    .optional(),
});

// ─── POST /api/scan ────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  // Validazione input
  const parsed = ScanRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Input non valido',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { url, options } = parsed.data;

  // Valida ulteriormente l'URL (blocca localhost, file://, IP privati)
  try {
    validateUrl(url);
  } catch (e) {
    return res.status(400).json({
      error: (e as Error).message,
    });
  }

  // Crea un ID per la scansione e restituisce subito
  const scanId = uuidv4();
  const pendingResult: ScanResult & { status: ScanStatus } = {
    id: scanId,
    url,
    timestamp: new Date().toISOString(),
    duration: 0,
    status: 'running',
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
    passes: [],
    incomplete: [],
    customChecks: [],
    manualCheckRequired: [],
  };

  scanStore.set(scanId, pendingResult);

  console.info(`[api/scan] Avvio scansione ID=${scanId} URL=${url}`);

  const maxPages = options?.maxPages ?? 1;

  // Esegui la scansione in background (non-blocking)
  setImmediate(async () => {
    try {
      if (maxPages === 1) {
        // ─── Scansione singola pagina ──────────────────────────────────
        const rawData = await scanPage(url, options?.includeScreenshot ?? false);
        const result = analyzeResults(url, rawData);
        result.id = scanId;
        scanStore.set(scanId, { ...result, status: 'completed' });
        console.info(`[api/scan] Completata ID=${scanId}, score=${result.score.overall}`);
      } else {
        // ─── Scansione multi-pagina ────────────────────────────────────
        const { pages, totalDuration } = await scanMultiplePages(
          url,
          maxPages,
          (progress) => {
            // Aggiorna il progresso in store ad ogni pagina
            const existing = scanStore.get(scanId);
            if (existing) {
              scanStore.set(scanId, { ...existing, progress });
            }
          }
        );

        const aggregated = aggregateResults(url, pages, totalDuration);
        const existing = scanStore.get(scanId)!;

        scanStore.set(scanId, {
          ...existing,
          ...aggregated,
          id: scanId,
          status: 'completed',
          passes: [],
          incomplete: [],
          customChecks: [],
          manualCheckRequired: existing.manualCheckRequired,
          progress: undefined,
        });

        console.info(
          `[api/scan] Multi-page completata ID=${scanId}, ${pages.length} pagine, score=${aggregated.score.overall}`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[api/scan] Errore ID=${scanId}:`, errorMessage);
      const existing = scanStore.get(scanId)!;
      scanStore.set(scanId, { ...existing, status: 'failed', error: errorMessage });
    }
  });

  return res.status(202).json({
    scanId,
    status: 'running',
    message: 'Scansione avviata. Usare GET /api/scan/:id per il risultato.',
    pollUrl: `/api/scan/${scanId}`,
  });
});

// ─── GET /api/scan/:id ─────────────────────────────────────────────────────

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = scanStore.get(id);

  if (!result) {
    return res.status(404).json({ error: `Scansione ${id} non trovata` });
  }

  // Se ancora in corso restituisce stato + progresso multi-pagina
  if (result.status === 'running' || result.status === 'pending') {
    return res.json({
      scanId: id,
      status: result.status,
      url: result.url,
      message: result.progress
        ? `Analisi pagina ${result.progress.pagesScanned + 1} di ${result.progress.pagesTotal}: ${result.progress.currentUrl}`
        : 'Scansione in corso...',
      progress: result.progress ?? null,
    });
  }

  if (result.status === 'failed') {
    return res.json({
      scanId: id,
      status: 'failed',
      url: result.url,
      error: result.error ?? 'Errore sconosciuto durante la scansione',
    });
  }

  return res.json(result);
});

// ─── GET /api/scan/:id/summary ─────────────────────────────────────────────

router.get('/:id/summary', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = scanStore.get(id);

  if (!result) {
    return res.status(404).json({ error: `Scansione ${id} non trovata` });
  }

  return res.json({
    scanId: id,
    status: result.status,
    url: result.url,
    timestamp: result.timestamp,
    score: result.score,
    conformanceLevel: result.conformanceLevel,
    summary: result.summary,
  });
});

// ─── GET /api/report/:id/pdf ───────────────────────────────────────────────

router.get('/:id/pdf', async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = scanStore.get(id);

  if (!result) {
    return res.status(404).json({ error: `Scansione ${id} non trovata` });
  }

  if (result.status !== 'completed') {
    return res.status(400).json({
      error: 'Il PDF è disponibile solo per scansioni completate',
      status: result.status,
    });
  }

  try {
    console.info(`[api/scan] Generazione PDF per ID=${id}`);
    const pdfBuffer = await generatePdfReport(result);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="accessicheck-report-${id.slice(0, 8)}.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    console.error(`[api/scan] Errore generazione PDF ID=${id}:`, error);
    return res.status(500).json({
      error: 'Errore durante la generazione del PDF',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
