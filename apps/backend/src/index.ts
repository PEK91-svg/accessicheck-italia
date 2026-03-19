import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import scanRouter from './routes/scan';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ─── Middleware ────────────────────────────────────────────────────────────

app.use(
  helmet({
    contentSecurityPolicy: false, // Disabilitato per permettere Puppeteer/PDF
  })
);

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json({ limit: '1mb' }));

// ─── Health check ──────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AccessiCheck Italia API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ────────────────────────────────────────────────────────────────

app.use('/api/scan', scanRouter);

// Il PDF è esposto anche come /api/report/:id/pdf (alias)
app.get('/api/report/:id/pdf', (req, res) => {
  res.redirect(`/api/scan/${req.params.id}/pdf`);
});

// ─── Error handler globale ─────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[server] Errore non gestito:', err);
    res.status(500).json({
      error: 'Errore interno del server',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.info(`
╔══════════════════════════════════════════════════╗
║        AccessiCheck Italia — Backend API         ║
║  Avviato su http://localhost:${PORT}                ║
║  Frontend atteso su ${FRONTEND_URL}  ║
╚══════════════════════════════════════════════════╝
  `);
});

export default app;
