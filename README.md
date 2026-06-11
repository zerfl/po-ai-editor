# PO AI Editor

A lightweight full-stack TypeScript application for translating gettext PO files using AI.

## Architecture

```
Browser (React + Vite + Tailwind)  →  Node.js (Hono)  →  OpenAI API
```

- **Frontend**: React 19, Vite, Tailwind v4
- **Backend**: Hono, OpenAI SDK, gettext-parser
- **Shared**: TypeScript types and Zod schemas

## Features

- Load and parse `.po` and `.pot` files
- Edit translations with context, comments, and references
- Filter entries (all, translated, untranslated, fuzzy, obsolete)
- AI-powered translation with configurable model, formality, and tone
- Batch translation with configurable batch size (5-100)
- Glossary support for consistent terminology
- Merge `.pot` updates into `.po` files
- Export `.po` and generate `.mo` binary files

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+

### Installation

```bash
pnpm install
```

### Configuration

Copy `.env.example` to `.env` and set your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env`:

```
OPENAI_API_KEY=sk-your-key-here
OPENAI_DEFAULT_MODEL=gpt-5.4-mini
OPENAI_ALLOWED_MODELS=gpt-5.4-mini,gpt-5.4,gpt-5.4-nano
PORT=8787
```

### Development

```bash
pnpm dev
```

This starts both the frontend (http://localhost:5173) and backend (http://localhost:8787).

### Production

```bash
pnpm build
pnpm start
```

The server serves both the API and frontend static files on port 8787.

## Project Structure

```
po-ai-editor/
├── apps/
│   ├── web/              # React frontend
│   └── server/           # Hono backend
├── packages/
│   └── shared/           # TypeScript types and Zod schemas
├── turbo.json            # Turborepo configuration
└── pnpm-workspace.yaml   # pnpm workspace config
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/models` | List available AI models |
| POST | `/api/parse` | Parse PO/POT file content |
| POST | `/api/translate` | Translate entries with AI |
| POST | `/api/export/po` | Export as .po file |
| POST | `/api/export/mo` | Generate .mo binary |

## Testing

```bash
pnpm test
```

## Tech Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Sonner (toasts)
- **Backend**: Hono, @hono/node-server, OpenAI SDK, gettext-parser
- **Validation**: Zod
- **Build**: Turborepo, pnpm, TypeScript
- **Testing**: Vitest
