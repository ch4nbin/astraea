# Astraea

Interview preparation platform for object-oriented design and API-based coding interviews.

## Stack

- Next.js App Router + TypeScript
- TailwindCSS
- PostgreSQL + Prisma
- Next.js API routes

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```
5. Run migrations and seed templates:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

## Main Features

- Google authentication with protected dashboard/session/results routes
- Template-based problem generation with persisted prompts and selected variants
- Monaco editor with JavaScript/Python switching and per-problem save
- Submission stub endpoint with stored mock evaluation output
- Session results page with prompt and submission history
- Embedded Astraea Coach chatbot (open/close widget + session-aware API)

## Milestone Status

- Milestone 1: foundation scaffold
- Milestone 2: auth + Prisma schema + seed data
- Milestone 3: session creation + persisted problem generation
- Milestone 4: Monaco editor + code save
- Milestone 5: submission stub + results page
- Milestone 6: embedded chatbot
- Milestone 7: API validation and production polish
