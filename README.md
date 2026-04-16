# Astraea

Interview preparation platform for the modern era.

## Stack

- Next.js App Router + TypeScript
- TailwindCSS
- MongoDB + Prisma ORM
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
   Set `DATABASE_URL` to your MongoDB connection string (MongoDB Atlas or local `mongod`).
3. Push Prisma schema to the database and seed templates:
   ```bash
   npm run prisma:generate
   npm run prisma:push
   npm run prisma:seed
   ```
4. Run dev server:
   ```bash
   npm run dev
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
- Database: MongoDB (replacing PostgreSQL for simpler hosted/local setup)
