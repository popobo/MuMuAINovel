# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
pnpm dev              # Start development server (Next.js 16)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
```

### Database Operations
```bash
pnpm exec prisma migrate dev     # Run database migrations
pnpm exec prisma generate        # Generate Prisma Client
pnpm exec prisma studio          # Open Prisma Studio (GUI)
```

### Testing
```bash
pnpm test             # Run unit tests (Vitest)
pnpm test:unit        # Run unit tests in tests/unit
pnpm test:e2e         # Run E2E tests (Playwright)
```

### One-off Scripts
```bash
pnpm create-admin     # Create admin user via tsx scripts/create-admin.ts
```

## Architecture Overview

### AI Provider Abstraction
The application uses a multi-provider AI system supporting OpenAI, Anthropic (Claude), and Gemini. The AI layer is abstracted through `src/lib/ai/`:

- **AI Service** (`src/lib/ai/index.ts`): Main entry point managing multiple providers
- **Provider Pattern**: Each provider (OpenAI, Anthropic, Gemini) implements a common interface
- **User Settings Override** (`src/lib/ai/complete-with-user-settings.ts`): Per-user API keys/config override env defaults via `UserAiSettings` model

### Per-User AI Configuration
Instead of relying solely on environment variables, the application supports per-user AI settings:

- **Model**: `UserAiSettings` (Prisma schema line 32-44)
- **Service**: `UserAiSettingsService` in `src/services/user-ai-settings.service.ts`
- **Resolution Logic**: `completeWithUserOrEnv()` in `src/lib/ai/complete-with-user-settings.ts` falls back to env defaults when user settings are missing

Key providers:
- `openai`: Standard OpenAI API (default: `https://api.openai.com/v1`)
- `openrouter`: OpenRouter API (`https://openrouter.ai/api/v1`)
- `mumu`: Custom MuMu API (`https://api.mumuverse.space/v1`)
- `anthropic`: Anthropic Claude API

### Next.js App Router Structure
The app uses Next.js 16 with App Router and route groups:
- `(auth)`: Authentication routes (login, etc.)
- `(dashboard)`: Protected routes requiring authentication
- API routes in `src/app/api/`

### Service Layer Pattern
Business logic is encapsulated in services under `src/services/`:
- `project.service.ts`: Project CRUD operations
- `chapter.service.ts`: Chapter management
- `character.service.ts`: Character and relationship management
- `book-import.service.ts`: TXT book import with AI-powered chapter inference
- `user-ai-settings.service.ts`: Per-user AI configuration
- `wizard.service.ts`: Project creation wizard flow

### Database Models (Prisma)
Core entities:
- **User**: Authentication via NextAuth.js v5 (beta)
- **Project**: Novel projects with world-building fields (timePeriod, location, atmosphere, rules)
- **Chapter**: Content with outline relationships (one-to-many or one-to-one via `outlineMode`)
- **Character**: Characters with career levels and relationships
- **BookImportTask**: Async TXT import with chapter preview and retry logic

### Book Import Flow
The book import system (`book-import.service.ts`) handles TXT file uploads:
1. Upload and parse TXT into chapters
2. AI-powered chapter structure inference (volume/chapter numbering)
3. Paginated preview before import
4. Task persistence for failure recovery
5. Creates Project, Chapters, and Outlines in transaction

## Important Conventions

### AI Usage Pattern
When using AI features:
1. Check for user-specific settings via `completeWithUserOrEnv(userId, messages, options)`
2. This function falls back to environment defaults if user hasn't configured their own API keys
3. Never use `aiService` directly in user-facing routes—always use `completeWithUserOrEnv`

### Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL` and `NEXTAUTH_SECRET`: NextAuth configuration
- At least one AI provider key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`)

### Database Migrations
Always run migrations after schema changes:
```bash
pnpm exec prisma migrate dev
```

The application uses Prisma with PostgreSQL. See `prisma/schema.prisma` for the full data model.

### Testing Strategy
- Unit tests in `tests/unit/` using Vitest
- E2E tests using Playwright
- Test utilities in `@testing-library/react` and `jsdom`
