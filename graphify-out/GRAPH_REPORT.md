# Graph Report - ai powerd  (2026-09-27)

## Corpus Check
- 158 files · ~236,357 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: .err 4, .example 1, (none) 1)

## Summary
- 1138 nodes · 3140 edges · 52 communities (42 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- isDatabaseConfigured
- card.tsx
- app/gifts/page.tsx
- cn
- settings.ts
- seed.mjs
- route
- lucide-react
- react
- dependencies
- package.json
- gift-unwrap.tsx
- track.ts
- database.ts
- ai/schemas.ts
- apiError
- app/page.tsx
- jsonOk
- gift-scene.tsx
- service.ts
- compilerOptions
- Hadiya (هدية) — AI-Powered Digital Gifting Platform
- provider.ts
- components.json
- gift-viewer.tsx
- route-helpers.ts
- bootstrap/route.ts
- gifts/queries.ts
- devDependencies
- scripts
- status/route.ts
- mock-provider.ts
- api/gifts/route.ts
- app/layout.tsx
- analytics/client.ts
- insights.ts
- [slug]/page.tsx
- UntypedFilterBuilder
- codemesh
- codemesh
- publish/route.ts
- safe-image.tsx
- UntypedTable
- tailwindcss
- AiRouteOptions
- next-env.d.ts
- engines
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `cn()` - 121 edges
2. `jsonOk()` - 70 edges
3. `react` - 63 edges
4. `apiError` - 62 edges
5. `isDatabaseConfigured()` - 60 edges
6. `lucide-react` - 38 edges
7. `route()` - 36 edges
8. `readBody()` - 34 edges
9. `query()` - 34 edges
10. `usePrefersReducedMotion()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `AiGiftFinderPage()` --calls--> `cn()`  [EXTRACTED]
  src/app/ai-gift/page.tsx → src/lib/utils.ts
- `AiMessagePage()` --calls--> `cn()`  [EXTRACTED]
  src/app/ai-message/page.tsx → src/lib/utils.ts
- `GET` --calls--> `jsonOk()`  [EXTRACTED]
  src/app/api/analytics/events/route.ts → src/lib/api/route-helpers.ts
- `CreateGiftPageInner()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/create-gift/page.tsx → src/hooks/useAuth.ts
- `Chip()` --calls--> `cn()`  [EXTRACTED]
  src/app/create/page.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (52 total, 10 thin omitted)

### Community 0 - "isDatabaseConfigured"
Cohesion: 0.06
Nodes (84): ref_server_only, dynamic, GET, DEMO_FILTERS, dynamic, GET, STATUSES, dynamic (+76 more)

### Community 1 - "card.tsx"
Cohesion: 0.06
Nodes (56): AdminAiGenerationsPage(), AiGenerationRow, AiGenerationsResponse, AdminAnalyticsPage(), AnalyticsResponse, AdminCategoriesPage(), AdminGiftCardsPage(), formatCurrency() (+48 more)

### Community 2 - "app/gifts/page.tsx"
Cohesion: 0.06
Nodes (51): Chip(), CreatePage(), Draft, Length, LENGTHS, MediaSlot(), Tone, TONES (+43 more)

### Community 3 - "cn"
Cohesion: 0.05
Nodes (41): clsx, @radix-ui/react-avatar, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-progress, @radix-ui/react-switch, @radix-ui/react-tabs, @radix-ui/react-tooltip (+33 more)

### Community 4 - "settings.ts"
Cohesion: 0.07
Nodes (43): @supabase/ssr, @supabase/supabase-js, dynamic, PATCH, configStatus, isAiConfiguredServerSide(), adminSettingsRequest, getAnonClient() (+35 more)

### Community 5 - "seed.mjs"
Cohesion: 0.07
Nodes (44): compat, __dirname, eslintConfig, __filename, nextConfig, projectRoot, ref_eslint_eslintrc, ref_node_crypto (+36 more)

### Community 6 - "route"
Cohesion: 0.09
Nodes (40): dynamic, GET, POST, dynamic, GET, POST, dynamic, GET (+32 more)

### Community 7 - "lucide-react"
Cohesion: 0.12
Nodes (31): lucide-react, motion, next, DashboardOverview, DashboardPage(), STAT_ITEMS, ForgotPasswordPage(), LoginPageInner() (+23 more)

### Community 8 - "react"
Cohesion: 0.08
Nodes (28): react, AiGiftFinderPage(), FORM_FIELDS, FormState, GIFT_TYPES, OCCASIONS, RELATIONSHIPS, AiMessagePage() (+20 more)

### Community 9 - "dependencies"
Cohesion: 0.05
Nodes (38): dependencies, canvas-confetti, class-variance-authority, clsx, date-fns, lucide-react, motion, nanoid (+30 more)

### Community 10 - "package.json"
Cohesion: 0.06
Nodes (33): description, name, private, version, class-variance-authority, date-fns, eslint, eslint-config-next (+25 more)

### Community 11 - "gift-unwrap.tsx"
Cohesion: 0.11
Nodes (24): HowItWorks(), Reveal(), Stage, UNWRAP_STICKERS, HERO_STICKERS, HeroGiftExperience(), AmbientBackground(), FLOATERS (+16 more)

### Community 12 - "track.ts"
Cohesion: 0.15
Nodes (27): dynamic, GET, POST, readBodyString(), dynamic, POST, dynamic, POST (+19 more)

### Community 13 - "database.ts"
Cohesion: 0.07
Nodes (27): AdminDistributions, AdminFunnel, AdminLogRow, AdminOverview, AdminTimeSeries, AiGenerationRow, AiGenerationStatus, AnalyticsEventRow (+19 more)

### Community 14 - "ai/schemas.ts"
Cohesion: 0.09
Nodes (22): AiResponse, AiResponse, ExperienceSection, experienceSectionSchema, experienceSectionTypeSchema, GiftExperiencePayload, giftExperienceSchema, GiftSuggestion (+14 more)

### Community 15 - "apiError"
Cohesion: 0.21
Nodes (20): DELETE, dynamic, GET, ownedGift(), PATCH, dynamic, PUT, dynamic (+12 more)

### Community 16 - "app/page.tsx"
Cohesion: 0.13
Nodes (19): Hero(), HERO_STICKERS, AiGiftAssistant(), AssistantSuggestion, Choice(), IMPORTANT: this component owns presentation only. It posts to the existing, AI_FEATURES, ALL_GIFTS (+11 more)

### Community 17 - "jsonOk"
Cohesion: 0.16
Nodes (17): dynamic, POST, PATCH, GET, dynamic, GET, dynamic, GET (+9 more)

### Community 18 - "gift-scene.tsx"
Cohesion: 0.15
Nodes (14): @react-three/drei, @react-three/fiber, three, FloatingObjects(), FloatingObjectsProps, Orbiter, ORBITERS, GiftScene (+6 more)

### Community 19 - "service.ts"
Cohesion: 0.20
Nodes (19): asData(), ExperienceInput, giftExperiencePrompt(), GiftFinderInput, giftFinderPrompt(), LENGTH_RULE, MessageInput, messagePrompt() (+11 more)

### Community 20 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+12 more)

### Community 21 - "Hadiya (هدية) — AI-Powered Digital Gifting Platform"
Cohesion: 0.10
Nodes (19): Admin, API, Design System, Development, Environment Variables, Getting Started, Hadiya (هدية) — AI-Powered Digital Gifting Platform, Installation (+11 more)

### Community 22 - "provider.ts"
Cohesion: 0.18
Nodes (18): backoffDelay(), callMock(), callOpenRouter(), ChatMessage, extractBalanced(), extractJson(), generate(), GenerateOptions (+10 more)

### Community 23 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 24 - "gift-viewer.tsx"
Cohesion: 0.13
Nodes (7): canvas-confetti, FinalSection(), GiftSection, GiftViewer(), GiftViewerProps, GiftOpenStats, formatDate()

### Community 25 - "route-helpers.ts"
Cohesion: 0.15
Nodes (13): zod, dynamic, POST, Handler, jsonError(), RouteContext, traceId(), giftDurationRequest (+5 more)

### Community 26 - "bootstrap/route.ts"
Cohesion: 0.20
Nodes (14): dynamic, POST, safeEqual(), AuthState, bootstrapRequest, guardAdmin(), GuardResult, guardUser() (+6 more)

### Community 27 - "gifts/queries.ts"
Cohesion: 0.17
Nodes (15): TemplatesResponse, CreateGiftInput, getGiftOwnerName(), isSlugAvailable(), PublicGiftBundle, replaceSectionsWithClient(), sectionContent(), SectionInput (+7 more)

### Community 28 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, eslint, eslint-config-next, postcss, prettier, tailwindcss, @tailwindcss/postcss, tw-animate-css (+7 more)

### Community 29 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, admin:promote, build, db:push, db:seed, db:seed:clear, dev, format (+3 more)

### Community 30 - "status/route.ts"
Cohesion: 0.24
Nodes (8): dynamic, GET, dynamic, GET, aiStatus(), APP_NAME_AR, APP_NAME_EN, APP_VERSION

### Community 31 - "mock-provider.ts"
Cohesion: 0.33
Nodes (9): experience(), message(), mockProvider(), readMeta(), RELATIONSHIP_AR, story(), suggestions(), TONE_AR (+1 more)

### Community 32 - "api/gifts/route.ts"
Cohesion: 0.28
Nodes (8): dynamic, GIFT_STATUSES, POST, serialize(), createGiftRequest, createGift(), reserveSlug(), slugify()

### Community 33 - "app/layout.tsx"
Cohesion: 0.22
Nodes (7): src_app_globals, cairo, fraunces, metadata, plexArabic, viewport, LocaleProvider()

### Community 34 - "analytics/client.ts"
Cohesion: 0.33
Nodes (5): PageViewReporter(), flush(), queue, track(), usePageView()

### Community 35 - "insights.ts"
Cohesion: 0.29
Nodes (7): GiftPerformanceInput, GiftPerformanceInsight, ListGiftsOptions, formatDuration(), formatNumber(), formatRelative(), GiftStatus

### Community 36 - "[slug]/page.tsx"
Cohesion: 0.38
Nodes (6): dynamic, generateMetadata(), GiftPage(), GiftPageProps, revalidate, getGiftBySlug()

### Community 38 - "codemesh"
Cohesion: 0.33
Nodes (5): CODEMESH_API_URL, CODEMESH_SCOPE_ROOT, c:\Users\EL BOSTAN\.devin\extensions\codemesh.vscode-codemesh-0.4.312-universal\bin\win32-x64\codemesh.exe, mcp-stdio, codemesh

### Community 39 - "codemesh"
Cohesion: 0.33
Nodes (5): CODEMESH_API_URL, CODEMESH_SCOPE_ROOT, c:\Users\EL BOSTAN\.devin\extensions\codemesh.vscode-codemesh-0.4.312-universal\bin\win32-x64\codemesh.exe, mcp-stdio, codemesh

### Community 40 - "publish/route.ts"
Cohesion: 0.47
Nodes (5): dynamic, POST, publishRequest, setGiftStatus(), giftUrl()

### Community 41 - "safe-image.tsx"
Cohesion: 0.33
Nodes (4): GiftImage(), GradientFallback(), SafeImage(), SafeImageProps

### Community 44 - "AiRouteOptions"
Cohesion: 0.67
Nodes (3): AiRouteOptions, AiCallContext, AiResult

## Knowledge Gaps
- **384 isolated node(s):** `c:\Users\EL BOSTAN\.devin\extensions\codemesh.vscode-codemesh-0.4.312-universal\bin\win32-x64\codemesh.exe`, `mcp-stdio`, `CODEMESH_API_URL`, `CODEMESH_SCOPE_ROOT`, `c:\Users\EL BOSTAN\.devin\extensions\codemesh.vscode-codemesh-0.4.312-universal\bin\win32-x64\codemesh.exe` (+379 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 473 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `card.tsx`, `app/gifts/page.tsx`, `cn`, `[slug]/page.tsx`, `analytics/client.ts`, `settings.ts`, `lucide-react`, `safe-image.tsx`, `package.json`, `gift-unwrap.tsx`, `app/page.tsx`, `gift-scene.tsx`, `gift-viewer.tsx`, `bootstrap/route.ts`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `next` connect `lucide-react` to `isDatabaseConfigured`, `app/layout.tsx`, `app/gifts/page.tsx`, `cn`, `[slug]/page.tsx`, `seed.mjs`, `analytics/client.ts`, `settings.ts`, `react`, `package.json`, `gift-unwrap.tsx`, `track.ts`, `app/page.tsx`, `route-helpers.ts`, `bootstrap/route.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `card.tsx`, `app/gifts/page.tsx`, `lucide-react`, `react`, `safe-image.tsx`, `gift-unwrap.tsx`, `app/page.tsx`, `gift-viewer.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `c:\Users\EL BOSTAN\.devin\extensions\codemesh.vscode-codemesh-0.4.312-universal\bin\win32-x64\codemesh.exe`, `mcp-stdio`, `CODEMESH_API_URL` to the rest of the system?**
  _384 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `isDatabaseConfigured` be split into smaller, more focused modules?**
  _Cohesion score 0.05730777159348588 - nodes in this community are weakly interconnected._
- **Should `card.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06413730803974707 - nodes in this community are weakly interconnected._
- **Should `app/gifts/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06467661691542288 - nodes in this community are weakly interconnected._