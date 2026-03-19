# AccessiCheck Italia

Tool di audit automatico dell'accessibilità web con mappatura normativa italiana.

**Stack**: Node.js + TypeScript · Playwright · axe-core · React · Tailwind CSS

---

## Setup

### Prerequisiti
- Node.js 20+
- npm 9+

### Installazione

```bash
cd Documents/accessicheck-italia

# Installa dipendenze root (concurrently)
npm install

# Installa dipendenze backend
cd apps/backend && npm install
npx playwright install chromium
cd ../..

# Installa dipendenze frontend
cd apps/frontend && npm install
cd ../..
```

### Avvio sviluppo

```bash
# Avvia backend (porta 3000) + frontend (porta 5173) in parallelo
npm run dev

# Oppure separati:
npm run backend   # solo backend
npm run frontend  # solo frontend
```

Apri http://localhost:5173

---

## Struttura

```
apps/
├── backend/
│   └── src/
│       ├── data/          ← JSON di mapping WCAG ↔ normativa IT
│       ├── routes/        ← API Express
│       ├── services/      ← scanner, analyzer, scorer, pdf
│       └── types/         ← TypeScript interfaces
└── frontend/
    └── src/
        ├── components/    ← React components
        ├── hooks/         ← useScan
        ├── services/      ← API client
        └── types/         ← TypeScript interfaces
```

## API

```
POST   /api/scan           → Avvia scansione
GET    /api/scan/:id       → Risultati (polling)
GET    /api/scan/:id/pdf   → Download PDF report
```
