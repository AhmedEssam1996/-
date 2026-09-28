# Hadiya (هدية) — AI-Powered Digital Gifting Platform

> هدايا تُفتح بقلبٍ أكبر. منصة هدايا رقمية بالذكاء الاصطناعي، مصممة للغة العربية مع دعم كامل للـ RTL والـ LTR.

## Overview

Hadiya is a full-stack web application for creating personalized, interactive digital gifts powered by AI. It runs on Next.js 15 with React 19, Supabase, and Postgres — with a deterministic offline mock provider so the product is usable without any external API keys.

### Key Capabilities

- **AI Gift Finder** — Describe a recipient + occasion → get 5 personalized gift suggestions
- **AI Message Generator** — Write messages in any tone or length, with alternative variants
- **Interactive Gift Experience** — Multi-section narrative gifts (cover, story, memory, message, quote, image, countdown, quiz, final) with animations and confetti
- **Gift Builder** — Drag-and-drop section editor with live preview and AI-assisted generation
- **Public Gift Gallery** — Browse published gifts by category
- **Admin Dashboard** — Real-time analytics, user management, content moderation, AI generation monitoring
- **RTL Arabic-first** — Full right-to-left layout, Arabic copy everywhere

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19 |
| Styling | Tailwind CSS v4, CSS custom properties |
| Animation | Motion v12 (Framer Motion) |
| Auth | Supabase Auth (email/password, magic link) |
| Database | PostgreSQL via `pg` + Supabase client |
| AI | OpenRouter API + deterministic offline mock provider |
| Icons | Lucide React |
| Validation | Zod |
| Charts | Recharts |

## Getting Started

### Prerequisites

- Node.js >= 20.9.0
- PostgreSQL (local or hosted) — optional for first run
- npm

### Installation

```bash
npm install
```

### Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

Required for a full experience:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://user:pass@localhost:5432/hadiya
OPENROUTER_API_KEY=your-openrouter-key
```

For first-run without database/AI keys, the app falls back to:
- A deterministic mock AI provider (Arabic content)
- In-memory mock data for gifts and categories

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### Seeding Demo Data

```bash
npm run db:push          # Push migrations to database
npm run db:seed          # Seed demo users, templates, and gifts
npm run db:seed:clear    # Clear all demo data
```

### Promote Admin

```bash
npm run admin:promote    # Promotes the email in INITIAL_ADMIN_EMAIL env var
```

## Project Structure

```
src/
  app/
    (auth pages)
    (public pages)
    dashboard/              # User dashboard
    admin/                  # Admin panel (layout + pages)
    api/                    # API route handlers
  components/
    layout/                 # SiteNav, SiteFooter, Logo, AmbientBackground
    shared/                 # PageShell, Section, ScrollReveal, FormField, GiftCard, AiThinking
    ui/                     # shadcn-style primitives (Button, Card, etc.)
    admin/                  # Admin dashboard components (charts, tables)
    gift/                   # GiftViewer, GiftFallback
  hooks/                    # useAuth, useAsync, useIsMobile
  lib/
    ai/                     # Provider, mock provider, prompts, schemas, service
    api/                    # Route helpers, schemas, features
    auth/                   # Session, guards
    db/                     # pg.ts, supabase clients
    admin/                  # Admin queries
    gifts/                  # Gift queries
    analytics/              # Event tracking
  types/                    # Database types
  lib/mock-data.ts          # Fallback data for offline/demo mode
scripts/                    # db-push, seed, promote-admin
supabase/
  migrations/               # SQL migrations
```

## Routes

### Public

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, features, testimonials |
| `/gifts` | Gift discovery feed with category filters |
| `/ai-gift` | AI gift finder — enter recipient details, get suggestions |
| `/ai-message` | AI message generator — write personalized messages |
| `/create-gift` | Interactive gift builder with drag-and-drop sections |
| `/gift/[slug]` | Public gift viewing experience with animations |
| `/login` | User login |
| `/register` | User registration |
| `/forgot-password` | Password reset flow |
| `/dashboard` | User dashboard — overview, drafts, recent gifts |

### Admin

| Route | Description |
|-------|-------------|
| `/admin` | Overview dashboard with analytics |
| `/admin/analytics` | Detailed analytics, time series, funnel, distributions |
| `/admin/users` | User management — roles, status, deletion |
| `/admin/gifts` | Gift management — disable, delete, filter |
| `/admin/categories` | Gift template management |
| `/admin/gift-cards` | Gift card management (balance, expiry) |
| `/admin/ai-generations` | AI generation log/monitoring |
| `/admin/settings` | Site settings, AI config, feature flags |

### API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/public/stats` | GET | Homepage trust signals |
| `/api/public/templates` | GET | Active gift templates |
| `/api/public/gifts` | GET | Public gift discovery feed |
| `/api/gift-categories` | GET | Category metadata with counts |
| `/api/ai/gift-finder` | POST | Generate gift suggestions |
| `/api/ai/message` | POST | Generate message |
| `/api/ai/gift-experience` | POST | Generate full experience |
| `/api/ai/story` | POST | Generate story |
| `/api/ai/vibe` | POST | Generate theme/vibe |
| `/api/ai/quota` | GET | Check AI quota |
| `/api/ai/status` | GET | AI service status |
| `/api/gifts` | POST | Create gift |
| `/api/gifts/[id]` | GET/PATCH/DELETE | Gift CRUD |
| `/api/gifts/[id]/sections` | PUT | Replace sections |
| `/api/gifts/[id]/publish` | PATCH | Change status |
| `/api/gifts/[id]/stats` | GET | Gift open stats |
| `/api/dashboard/overview` | GET | User dashboard data |
| `/api/gift-open` | POST | Record gift open |
| `/api/gift-duration` | POST | Record view duration |
| `/api/admin/stats` | GET | Admin dashboard aggregates |
| `/api/admin/users` | GET/PATCH | User management |
| `/api/admin/gifts` | GET/PATCH | Gift management |
| `/api/admin/settings` | GET/PATCH | Settings management |
| `/api/admin/logs` | GET | Admin audit log |
| `/api/admin/ai-generations` | GET | AI generation monitoring |
| `/api/admin/bootstrap` | POST | Initial admin bootstrap |
| `/api/admin/demo/purge` | POST | Purge demo data |
| `/api/analytics/events` | POST | Track analytics event |
| `/api/analytics/page-view` | POST | Track page view |
| `/api/health` | GET | Health check |

## Design System

- **Theme**: Dark luxury — `#07090D` background, `#10141A` cards
- **Primary Accent**: Emerald — `#00D6A3`
- **Secondary Accents**: Violet (`#8B5CF6`), Pink (`#FF4D8D`), Amber (`#F5C451`)
- **Typography**: RTL Arabic-first with proper font stacks
- **Components**: Glassmorphism cards, animated transitions, confetti on interactions

## Development

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking
npm run format     # Format code with Prettier
```

## License

Private — Hadiya platform.
