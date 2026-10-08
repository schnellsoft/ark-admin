# AGENTS.md – Web development guidelines

Applies to HTML, CSS, JavaScript, TypeScript, Next.js 16, PWA, Tailwind CSS v4, shadcn/ui. Follow the section matching the files you touch. Check installed versions in package.json first.

---


# HTML Skill

## Principles
1. **Semantics first.** Pick the element that describes the content, not the one that looks right. Style with CSS.
2. **Native before custom.** `<button>`, `<dialog>`, `<details>`, `<input type=...>`, `popover` beat div + JS + ARIA.
3. **Accessible by default.** Keyboard, screen reader, zoom, reduced motion.
4. **Progressive enhancement.** Content and forms work without JS where feasible.

## Document skeleton
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page title – Site</title>
  <meta name="description" content="140–160 chars summary.">
  <link rel="canonical" href="https://example.com/page">
  <meta name="theme-color" content="#ffffff">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta property="og:title" content="…"><meta property="og:image" content="…">
  <link rel="stylesheet" href="/styles.css">
  <script src="/app.js" type="module" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header>…<nav aria-label="Primary">…</nav></header>
  <main id="main">…</main>
  <footer>…</footer>
</body>
</html>
```

## Rules
- Exactly one `<h1>`; do not skip heading levels. Landmarks: `header nav main aside footer`; one `main`.
- Links navigate (`<a href>`); buttons act (`<button type="button">`). Never `<div onclick>`.
- Always set `type` on buttons inside forms (`type="button"` vs `type="submit"`).
- Every `<img>`: `alt` (empty `alt=""` if decorative), `width`/`height` (prevents CLS), `loading="lazy"` below the fold, `decoding="async"`. Hero/LCP image: no lazy, add `fetchpriority="high"`.
- Responsive images: `srcset` + `sizes`, or `<picture>` for formats (AVIF/WebP) and art direction.
- Video: `<video controls playsinline preload="metadata">` + captions `<track kind="captions">`.
- Lists for lists, `<table>` only for tabular data (`<caption>`, `<th scope>`), `<figure>/<figcaption>`, `<time datetime>`, `<address>`, `<abbr>`, `<mark>`.
- Escape user content; never build HTML by string concatenation with untrusted input.
- External links opened in a new tab: `rel="noopener noreferrer"`.
- Avoid inline `style` and inline event handlers (also blocks strict CSP).

## Forms
```html
<form method="post" action="/subscribe" novalidate>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" autocomplete="email" required
         aria-describedby="email-help">
  <p id="email-help">We never share your address.</p>
  <button type="submit">Subscribe</button>
</form>
```
- Every control has a visible `<label>` (wrapping or `for`/`id`). Placeholder is not a label.
- Use correct `type`, `inputmode`, `autocomplete`, `min/max/pattern/required`; group with `<fieldset><legend>`.
- Errors: text near field, linked via `aria-describedby`, `aria-invalid="true"`; do not rely on color alone.

## Modern native features (prefer these)
- `<dialog>` + `showModal()` for modals (focus trap, Esc, backdrop free).
- `popover` attribute + `popovertarget` for menus/tooltips; `<details name="group">` for accordions.
- `inert` to disable background content; `hidden="until-found"`; `<search>` element for search regions.
- `<link rel="preload|preconnect|modulepreload">` sparingly.

## ARIA
First rule: don't use ARIA if a native element exists. If used: correct role + states (`aria-expanded`, `aria-controls`, `aria-current="page"`, `aria-live="polite"` for async status), and implement the full keyboard pattern from the WAI-ARIA Authoring Practices.

## Checklist before finishing
- [ ] Valid, well-nested HTML; `lang` set; unique `id`s
- [ ] Keyboard-only walkthrough works; visible focus
- [ ] Color contrast ≥ 4.5:1 (3:1 large text/UI)
- [ ] Images have alt/dimensions; no layout shift
- [ ] Title, description, canonical, OG tags

---


# CSS Skill

If the project uses Tailwind, prefer the `tailwind` skill for markup-level styling and use this one for custom CSS, `@layer`, and platform features.

## Architecture
```css
@layer reset, tokens, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  * { margin: 0; }
  img, svg, video, canvas { display: block; max-width: 100%; height: auto; }
  input, button, textarea, select { font: inherit; }
  :where(p, h1, h2, h3, h4) { overflow-wrap: break-word; }
}
@layer tokens {
  :root {
    color-scheme: light dark;
    --space-1: .25rem; --space-2: .5rem; --space-4: 1rem; --space-8: 2rem;
    --radius: .5rem;
    --brand: oklch(62% .19 260);
    --bg: light-dark(#fff, #0b0b0f);
    --fg: light-dark(#111, #eee);
    --step-0: clamp(1rem, .95rem + .25vw, 1.125rem);
  }
}
@layer base { body { background: var(--bg); color: var(--fg); font: var(--step-0)/1.6 system-ui, sans-serif; } }
```
- Use **cascade layers** to control specificity instead of `!important` or deep selectors.
- Keep specificity low: classes, `:where()` to zero it out. Avoid IDs and `!important`.
- Naming: BEM-ish (`.card`, `.card__title`, `.card--featured`) or component-scoped via CSS Modules.

## Layout
- **Grid** for 2D, **flexbox** for 1D. Use `gap`, never margin hacks.
- Fluid auto-fit grid: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));`
- Centering: `display:grid; place-items:center;`
- `aspect-ratio`, `inset`, `min()/max()/clamp()`, `svh/dvh/lvh` (use `dvh` for mobile full height).
- **Subgrid** for aligning nested content to parent tracks.
- **Container queries** for component-level responsiveness:
```css
.card-wrap { container: card / inline-size; }
@container card (min-width: 30rem) { .card { grid-template-columns: 8rem 1fr; } }
```
- Mobile-first media queries (`min-width`); prefer range syntax: `@media (width >= 48rem)`.

## Modern features (check Baseline status before shipping)
- Nesting: `.btn { &:hover {…} .icon {…} @media (…) {…} }`
- `:has()`, `:is()`, `:where()`, `:not()`; `:focus-visible` (not bare `:focus`).
- Logical properties: `margin-inline`, `padding-block`, `inset-inline-start` (RTL-ready).
- Color: `oklch()`, `color-mix(in oklab, var(--brand) 20%, white)`, `light-dark()`, relative colors.
- `@property` for typed/animatable custom properties; `@starting-style` + `transition-behavior: allow-discrete` for animating `display`/popover/dialog entry.
- Scroll: `scroll-snap`, `overscroll-behavior`, scroll-driven animations (progressive enhancement).
- View Transitions: `document.startViewTransition()` / `@view-transition { navigation: auto; }`.
- Wrap newer features in `@supports (…)` with a sensible fallback.

## Accessibility & UX
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
```
- Never remove outlines without a replacement. Honor `prefers-color-scheme`, `prefers-contrast`, `forced-colors`.
- Touch targets ≥ 24px (aim 44px). Use `rem` for type, `em` for component-relative spacing.
- Hover-only styles go inside `@media (hover: hover)`.

## Performance
- Animate only `transform`, `opacity`, `filter`; avoid animating layout properties.
- `content-visibility: auto` + `contain-intrinsic-size` for long offscreen sections.
- `font-display: swap`, `size-adjust` fallback fonts, preload critical fonts; variable fonts.
- Avoid `@import` in CSS (blocks); bundle or `<link>`.

## Anti-patterns
`!important` wars, magic pixel numbers, `float` layouts, fixed heights on text containers, `100vh` on mobile, deep tag chains (`div > div > span`), hand-written vendor prefixes (use Lightning CSS/Autoprefixer).

---


# JavaScript Skill

## Defaults
- ES modules (`import`/`export`, `<script type="module">`), `"use strict"` is implicit in modules.
- `const` by default, `let` when reassigned, never `var`.
- `===`/`!==`; use `??` and `?.` instead of `||`/manual guards when `0`/`''` are valid.
- Prefer pure functions, small modules, early returns, descriptive names. No globals.
- Modern built-ins: `structuredClone`, `Array.prototype.at/toSorted/toReversed/toSpliced/with`, `Object.groupBy`, `Object.fromEntries`, `Array.fromAsync`, `Promise.withResolvers`, `Set` methods (union/intersection), `URL`, `URLSearchParams`, `AbortController`, `crypto.randomUUID()`, `Intl.*`.

## Async
```js
async function getJson(url, { signal } = {}) {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`); // fetch does not reject on 4xx/5xx
  return res.json();
}
const results = await Promise.allSettled(urls.map((u) => getJson(u)));
```
- Always `await`/return promises; never leave floating promises. Use `try/catch` at boundaries.
- Parallelize independent work with `Promise.all`/`allSettled`; do not `await` inside loops unless sequential on purpose.
- Cancellation/timeouts: `AbortSignal.timeout(5000)`, `AbortController` for stale requests.
- Don't use `async` for functions with no `await`; don't mix `.then` chains with `await`.

## DOM & events
- Query once, cache references; `querySelector`, `closest`, `matches`, `classList`, `dataset`, `toggleAttribute`.
- **Event delegation** for lists: one listener on the parent.
- Use `textContent` for text. Never `innerHTML` with untrusted data (XSS); use `DOMPurify` or `Element.setHTML`/Trusted Types where needed.
- Clean up listeners with `{ signal }` option: `el.addEventListener('click', fn, { signal: ac.signal })`.
- Passive listeners for scroll/touch; `requestAnimationFrame` for visual updates; `IntersectionObserver`/`ResizeObserver` instead of scroll polling.
- Forms: `FormData`, `form.checkValidity()`, `event.preventDefault()` only when handling via JS.
- Custom elements/Web Components for framework-free reusable UI (`customElements.define`, Shadow DOM).

## Storage & network
- `localStorage` is sync and string-only: wrap `JSON.parse` in try/catch; never store secrets/tokens in it. Use IndexedDB (via `idb`) for large/structured data.
- Debounce input handlers; throttle scroll/resize.
- Handle offline & errors with user-visible messages.

## Errors & quality
- Throw `Error` (or subclasses with `cause`): `throw new Error('msg', { cause: err })`.
- Validate external input (user, URL, JSON, API) at the boundary; use `zod`/`valibot` in larger apps.
- Lint with ESLint (flat config) or Biome; format with Prettier/Biome; test with Vitest/Node test runner.
- JSDoc types + `// @ts-check` if not using TypeScript.

## Anti-patterns
Mutating function arguments, `for...in` over arrays, `==`, `eval`/`new Function`, `document.write`, sync XHR, giant functions, swallowing errors (`catch {}`), nested ternaries, relying on `this` in callbacks (use arrows), polluting prototypes.

## Security
Sanitize output, use CSP, avoid inline handlers, `rel="noopener"`, validate `postMessage` origins, never trust `location.hash/search` without validation, keep secrets server-side.

---


# TypeScript Skill

## tsconfig baseline (apps)
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```
Never loosen `strict`. Fix the types, don't silence them.

## Rules
- **No `any`.** Use `unknown` for untrusted data and narrow it. If unavoidable, isolate it and comment why. Avoid `as` casts and `!` non-null assertions; prefer narrowing, type guards, `satisfies`.
- `interface` for object shapes that may be extended; `type` for unions, intersections, mapped/conditional types.
- Prefer **string-literal unions** over `enum`: `type Status = 'idle' | 'loading' | 'error'`. Use `as const` objects for value+type.
- Use `import type { X }` / `import { type X }` for type-only imports (required by `verbatimModuleSyntax`).
- Let inference work for locals; **annotate** exported function params/returns and public APIs.
- Prefer `readonly`, `ReadonlyArray<T>`, immutability.
- Model state with **discriminated unions**, and check exhaustiveness:
```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
function assertNever(x: never): never { throw new Error(`Unexpected: ${String(x)}`); }
switch (s.kind) { case 'a': … ; case 'b': … ; default: assertNever(s); }
```
- `satisfies` validates a value against a type while keeping its narrow inferred type:
```ts
const routes = { home: '/', about: '/about' } as const satisfies Record<string, `/${string}`>;
```

## Generics & utility types
```ts
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> { … }
type Props = React.ComponentProps<'button'> & { variant?: 'solid' | 'ghost' };
```
Know: `Partial, Required, Readonly, Pick, Omit, Record, Exclude, Extract, NonNullable, ReturnType, Parameters, Awaited, InstanceType, NoInfer`. Keep generics simple; constrain with `extends`; avoid deeply recursive conditional types.

## Runtime validation
Types vanish at runtime. Validate all external data (API, forms, env, `JSON.parse`, `searchParams`) with **Zod** (or Valibot) and infer the type:
```ts
const User = z.object({ id: z.string().uuid(), email: z.string().email() });
type User = z.infer<typeof User>;
const user = User.parse(await res.json());
```

## React + TS
- Props: `type Props = { … }`; use `React.ReactNode` for children, `React.ComponentProps<'el'>` to extend DOM props. React 19: `ref` is a normal prop; no `forwardRef` needed.
- `useState<User | null>(null)`, typed `useReducer` with discriminated action unions.
- Event types: `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`.
- Avoid `React.FC`.

## Errors
`catch (e)` is `unknown`: `if (e instanceof Error) …`. Create typed error classes or `Result` types for expected failures.

## Tooling
`tsc --noEmit` in CI, `typescript-eslint` (strict + stylistic), `@total-typescript/ts-reset` optional, Vitest for tests. Use project references/`tsc -b` in monorepos. Generate types from OpenAPI/GraphQL/DB schema rather than hand-writing.

## Anti-patterns
`any`/`as any`, `// @ts-ignore` (use `@ts-expect-error` with a reason), double assertions `as unknown as T`, overloading where a union works, enums, optional-everything types, duplicating types instead of deriving (`typeof`, `keyof`, `ReturnType`).

---


# Next.js 16 Skill (current line: 16.x, Active LTS; v15 EOL 2026-10-21)

**Verify the installed version** (`npx next --version`) and read the matching docs (`node_modules/next/dist/docs` if present, or nextjs.org/docs). Behaviour differs between 14 / 15 / 16. Requirements: Node ≥ 20.9, TypeScript ≥ 5.1, React 19.2.

```bash
npx create-next-app@latest my-app          # TS, Tailwind, ESLint, App Router, Turbopack, @/* alias
npm i next@latest react@latest react-dom@latest
npx @next/codemod@latest upgrade latest    # automated upgrade
```

## Structure (App Router)
```
app/
  layout.tsx            root layout (html/body, providers, fonts)
  page.tsx              route "/"
  globals.css
  (marketing)/about/page.tsx    route group (no URL segment)
  blog/[slug]/page.tsx          dynamic segment
  api/health/route.ts           route handler (GET/POST…)
  loading.tsx  error.tsx  not-found.tsx  template.tsx
  @modal/…  default.tsx         parallel routes (default.tsx now REQUIRED)
  manifest.ts  sitemap.ts  robots.ts  icon.tsx  opengraph-image.tsx
proxy.ts                request interception (replaces middleware.ts)
next.config.ts
components/  lib/  actions/
```
Colocate; only `page`/`route` files are routable. Private folders: `_folder`.

## Server vs Client Components
- Everything is a **Server Component by default**: async, can `await` data, access DB/secrets, zero client JS.
- Add `"use client"` only to leaf components needing state, effects, event handlers, browser APIs, or client-only libs. Pass Server Components as `children` into client ones.
- Never import server-only code into client components: mark with `import 'server-only'`; mark client-only with `'client-only'`.
- Props crossing the boundary must be serializable. Secrets only from `process.env` (non-`NEXT_PUBLIC_`) on the server.

## Async request APIs (mandatory in 16)
Synchronous access is removed. `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are async:
```tsx
export default async function Page({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const cookieStore = await cookies();
}
```
Use `npx next typegen` for the global `PageProps<'/blog/[slug]'>`, `LayoutProps` helpers.

## Data fetching & caching (16: Cache Components)
Caching is **opt-in** and explicit. Enable in `next.config.ts`: `cacheComponents: true` (replaces `experimental.ppr`/`dynamicIO`).
```tsx
import { cacheLife, cacheTag } from 'next/cache';

async function getPosts() {
  'use cache';                    // cache a function, component, or whole page
  cacheLife('hours');             // or { stale, revalidate, expire }
  cacheTag('posts');
  return db.post.findMany();
}
```
- Dynamic/request-time data goes inside `<Suspense>` boundaries so the static shell prerenders (Partial Prerendering) and dynamic parts stream.
- Invalidate: `revalidateTag('posts', 'max')` (**second arg profile is required in 16**), `updateTag('posts')` in Server Actions for read-your-writes, `refresh()` for uncached data, `revalidatePath('/blog')`.
- Fetch in Server Components directly (`await fetch`/DB); avoid client-side fetching for initial data. Run independent requests with `Promise.all`; avoid waterfalls; use `React.cache` to dedupe.
- Never use `useEffect` fetching for primary page data.

## Mutations: Server Actions
```tsx
'use server';
import { z } from 'zod';
export async function createPost(prev: State, formData: FormData) {
  const session = await auth();                       // ALWAYS authenticate/authorize inside the action
  if (!session) throw new Error('Unauthorized');
  const parsed = Schema.safeParse(Object.fromEntries(formData));  // ALWAYS validate input
  if (!parsed.success) return { errors: z.flattenError(parsed.error) };
  await db.post.create({ data: parsed.data });
  updateTag('posts'); redirect('/posts');
}
```
Use with `<form action={…}>`, `useActionState`, `useFormStatus`, `useOptimistic`. Treat actions as public POST endpoints.

## proxy.ts (formerly middleware.ts)
```ts
import { NextRequest, NextResponse } from 'next/server';
export function proxy(req: NextRequest) { /* redirect, rewrite, headers */ return NextResponse.next(); }
export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
```
Runs on Node runtime. Keep light (redirects/rewrites/headers); do real authorization near the data, not only here.

## Routing & navigation
`<Link>` (prefetches), `useRouter` from `next/navigation`, `redirect()`, `notFound()`, `usePathname`, `useSearchParams` (needs Suspense). Layout deduplication and incremental prefetching are automatic in 16. Typed routes: `typedRoutes: true`.

## Metadata, images, fonts, scripts
```tsx
export const metadata: Metadata = { title: { default: 'Site', template: '%s | Site' }, description: '…' };
export async function generateMetadata({ params }: Props): Promise<Metadata> { … }
```
- `next/image` (always `width/height` or `fill` + `sizes`; `priority` for LCP; remote hosts via `images.remotePatterns` — `images.domains` is deprecated; local images with query strings need `images.localPatterns`).
- `next/font` (self-hosted, zero CLS); `next/script` with `strategy`.
- `generateStaticParams` for static dynamic routes; `export const dynamicParams`.

## Config & tooling
- **Turbopack is default** for dev and build (`next dev`, `next build`); use `--webpack` only if a plugin requires it. File-system caching available (`experimental.turbopackFileSystemCacheForDev`).
- React Compiler: `reactCompiler: true` (needs `babel-plugin-react-compiler`); don't hand-write `useMemo/useCallback` for perf unless profiled.
- `next lint` was **removed**: run `eslint .` (flat config, `eslint-config-next`) or Biome directly.
- Removed: AMP, `next/legacy/image`, sync `params`, `serverRuntimeConfig`/`publicRuntimeConfig` (use env vars), `experimental.ppr`.
- Env: `.env.local`; only `NEXT_PUBLIC_*` reaches the browser. Validate env at startup (zod / `@t3-oss/env-nextjs`).
- Security headers/CSP in `next.config.ts` `headers()` or proxy; set `poweredByHeader: false`.
- Output: `output: 'standalone'` for Docker; deploy on Vercel or any Node host.

## Performance & quality checklist
- [ ] Minimal `"use client"` surface; dynamic import (`next/dynamic`) heavy client widgets
- [ ] Suspense + `loading.tsx`, `error.tsx` (client component), `not-found.tsx`
- [ ] Images/fonts via Next components; LCP image prioritized
- [ ] Server Actions validate + authorize; no secrets in client bundles
- [ ] `next build` passes with no type/lint errors; check bundle with `@next/bundle-analyzer`
- [ ] Core Web Vitals via `useReportWebVitals` or Vercel Analytics

## Anti-patterns
Pages Router in new code, sync `params` access, `"use client"` at the top of every file, fetching in `useEffect`, API routes where a Server Action/Server Component suffices, relying on middleware alone for auth, putting secrets in `NEXT_PUBLIC_*`, giant layouts that read `cookies()` (makes the whole tree dynamic).

---


# PWA Skill

## Installability requirements
1. Served over **HTTPS** (localhost ok).
2. Web app manifest with `name`/`short_name`, `icons` (192 and 512 PNG, one `purpose: "maskable"`), `start_url`, `display` (`standalone`).
3. Registered service worker is no longer strictly required for the install prompt in Chromium, but is required for offline/push.
(Lighthouse no longer has a PWA category; test with DevTools → Application and manifest/installability panels.)

## Manifest
```json
{
  "id": "/",
  "name": "My App",
  "short_name": "MyApp",
  "description": "What it does",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0b5fff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [{ "src": "/shots/wide.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide" },
                  { "src": "/shots/narrow.png", "sizes": "720x1280", "type": "image/png", "form_factor": "narrow" }],
  "shortcuts": [{ "name": "New item", "url": "/new" }]
}
```
HTML head: `<link rel="manifest" href="/manifest.webmanifest">`, `<meta name="theme-color">`, and for iOS `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` (180×180) and `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style`, `viewport-fit=cover` + `env(safe-area-inset-*)` padding.

## Service worker (hand-written baseline)
```js
// public/sw.js
const VERSION = 'v1';
const STATIC = `static-${VERSION}`, PAGES = `pages-${VERSION}`;
const PRECACHE = ['/offline', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![STATIC, PAGES].includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  if (request.mode === 'navigate') {            // network-first for pages, offline fallback
    e.respondWith(fetch(request).then((r) => { const c = r.clone(); caches.open(PAGES).then((x) => x.put(request, c)); return r; })
      .catch(async () => (await caches.match(request)) || caches.match('/offline')));
  } else if (/\.(?:js|css|png|jpe?g|svg|webp|avif|woff2)$/.test(request.url)) {   // stale-while-revalidate
    e.respondWith(caches.match(request).then((hit) => {
      const net = fetch(request).then((r) => { caches.open(STATIC).then((c) => c.put(request, r.clone())); return r; });
      return hit || net;
    }));
  }
});
```
Register (client, after load):
```js
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }));
}
```

## Caching strategy guide
| Resource | Strategy |
|---|---|
| App shell / hashed static assets | Cache-first (precache) |
| Images, fonts | Stale-while-revalidate / cache-first with expiry |
| HTML navigations | Network-first with offline fallback |
| API reads | Network-first or SWR with short TTL |
| Auth, POST, payments, personalised data | **Never cache** (network only) |
Rules: version caches and delete old ones; cap entries; never cache opaque error responses or `Set-Cookie`d private data; serve `sw.js` with `Cache-Control: no-cache`; be careful with `skipWaiting()` (can mix old page + new assets: prompt user "Update available" then `postMessage({type:'SKIP_WAITING'})`).

## Install prompt (Chromium)
```js
let deferred;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; showInstallButton(); });
installBtn.onclick = async () => { deferred.prompt(); await deferred.userChoice; deferred = null; };
addEventListener('appinstalled', () => hideInstallButton());
```
iOS Safari has no prompt: show instructions (Share → Add to Home Screen). Detect standalone: `matchMedia('(display-mode: standalone)').matches || navigator.standalone`.

## Push notifications
Server: `web-push` + VAPID keys; client: `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, send subscription to your server; SW handles `push` (`self.registration.showNotification`) and `notificationclick` (`clients.openWindow`). iOS 16.4+ supports push **only for installed** home-screen apps and needs a user gesture to request permission. Ask permission in context, not on load.

## Offline data & sync
IndexedDB (via `idb`/Dexie) for app data; queue mutations and replay when online (`navigator.onLine` + `online` event; Background Sync API is Chromium-only, so provide a fallback). Show offline UI state.

## Next.js 16 integration
- Manifest: `app/manifest.ts` returning `MetadataRoute.Manifest` (served at `/manifest.webmanifest`), icons in `public/`.
- Simple/official approach: hand-written `public/sw.js` + client registration component, plus headers in `next.config.ts`:
```ts
async headers() { return [
  { source: '/sw.js', headers: [
    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" } ] } ]; }
```
- Precaching with build hashes: **Serwist** (`@serwist/next`, successor to `next-pwa`); confirm Turbopack compatibility in its docs for your versions, otherwise use the manual approach or `next build --webpack`.
- Don't cache RSC/Server Action requests blindly; restrict to static assets and offline fallback page.

## Checklist
- [ ] Manifest valid (DevTools → Application → Manifest), maskable icon verified
- [ ] Offline fallback page works with network disabled
- [ ] Update flow tested (deploy v2, old clients refresh cleanly)
- [ ] No sensitive data in caches; logout clears caches
- [ ] iOS tested on a real device in standalone mode

---


# Tailwind CSS v4 Skill (current line: 4.3.x)

**Check the installed version first** (`package.json`). If it is v3 (has `tailwind.config.js`, `@tailwind base;`), follow v3 conventions or offer to migrate with `npx @tailwindcss/upgrade`.

## Setup (v4)
```bash
npm i tailwindcss @tailwindcss/vite        # Vite / SvelteKit / Astro etc.
npm i tailwindcss @tailwindcss/postcss postcss   # Next.js / PostCSS
```
```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
export default { plugins: [tailwindcss()] };
```
```js
// postcss.config.mjs (Next.js)
export default { plugins: { '@tailwindcss/postcss': {} } };
```
```css
/* app/globals.css */
@import "tailwindcss";
```
- No `tailwind.config.js` and no `content` array: sources are auto-detected (respects .gitignore). Add extra sources with `@source "../node_modules/some-lib";`. Legacy config only via `@config "./tailwind.config.js";`.
- Requires modern browsers (Safari 16.4+, Chrome 111+, Firefox 128+) and Node 20+.

## Theme in CSS
```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", system-ui, sans-serif;
  --color-brand-500: oklch(0.62 0.19 260);
  --breakpoint-3xl: 120rem;
  --radius-card: 0.75rem;
  --animate-fade-in: fade-in .2s ease-out;
  @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
}
```
Every `--color-*`, `--spacing`, `--font-*`, `--text-*`, `--breakpoint-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--animate-*` variable creates utilities (`bg-brand-500`, `rounded-card`, `animate-fade-in`) and is exposed as a real CSS variable. Use `@theme inline { … }` when a theme value references another variable (this is how shadcn/ui maps `--background` to `bg-background`). Reset a namespace with `--color-*: initial;`.

## Custom utilities, variants, dark mode
```css
@utility scrollbar-hidden { scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
@custom-variant dark (&:where(.dark, .dark *));     /* class-based dark mode */
@custom-variant theme-midnight (&:where([data-theme=midnight], [data-theme=midnight] *));
@layer components { .btn { @apply inline-flex items-center rounded-md px-4 py-2; } }
```
Default dark mode follows `prefers-color-scheme`; override with `@custom-variant` as above for a toggle. Prefer extracting **components** (React/Vue/partials) over `@apply`.

## Changed in v4 (do not write the old forms)
| v3 | v4 |
|---|---|
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `shadow-sm` / `shadow` | `shadow-xs` / `shadow-sm` |
| `rounded-sm` / `rounded` | `rounded-xs` / `rounded-sm` |
| `blur-sm` / `blur` | `blur-xs` / `blur-sm` |
| `outline-none` | `outline-hidden` (`outline-none` now truly removes outline) |
| `ring` (3px) | `ring-3` (`ring` = 1px) |
| `bg-opacity-50` etc. (removed) | `bg-black/50` |
| `flex-shrink-*`, `flex-grow-*`, `overflow-ellipsis` | `shrink-*`, `grow-*`, `text-ellipsis` |
| `bg-gradient-to-r` | `bg-linear-to-r` (also `bg-radial`, `bg-conic`, `bg-linear-45`) |
| `!flex` (prefix important) | `flex!` (suffix) |
| `bg-[--brand]` | `bg-(--brand)` |
| `space-x-*` margins on children | prefer `gap-*` with flex/grid |
| `border` default color `gray-200` | defaults to `currentColor` — set a color: `border border-border` |
| `hover:` always | `hover:` applies only on hover-capable devices |
| Variant stacking right-to-left | left-to-right: `*:first:pt-0` |
| `theme()` in CSS | `var(--color-red-500)` |
| Container plugin | `@container`, `@sm:`, `@max-md:`, `@min-[400px]:` built in |

## Useful v4 features
`size-*`, dynamic values (`grid-cols-15`, `mt-17`, `w-29`), `not-*`, `in-*`, `nth-*`, `has-*`, `group-has-*`, `inert:`, `starting:` (enter animations), `field-sizing-content`, `inset-shadow-*`, `text-shadow-*` and `mask-*` (4.1), logical block spacing `pbs-* mbe-*` and new neutral palettes `mauve olive mist taupe` (4.2), `scrollbar-*`, `zoom-*`, `tab-*`, `@container-size` (4.3), `@variant` stacked forms.
`color-mix`/`oklch` P3 palette is default.

## Writing classes well
- Mobile-first: unprefixed = base, then `sm: md: lg: xl: 2xl:`.
- Order: layout → box model → typography → visual → state (`prettier-plugin-tailwindcss` sorts automatically; install it).
- Never build class names dynamically (`` `bg-${color}-500` ``): Tailwind scans for complete strings. Map to full class names or use CSS variables.
- Conditional classes: `cn()` (clsx + tailwind-merge) or `tailwind-variants` / `cva` for component variants.
- Arbitrary values `w-[22rem]`, `bg-[#123]`, `grid-cols-[1fr_auto]` are fine sparingly; promote repeated ones to `@theme`.
- Accessibility: keep `focus-visible:` rings, `sr-only`, `motion-reduce:`, `forced-colors:`, `aria-*:` and `data-*:` variants (`aria-expanded:rotate-180`, `data-[state=open]:bg-muted`).
- Use `group`/`peer` and `group/name` for relationships instead of JS.

## Anti-patterns
v3 syntax in v4 projects, `tailwind.config.js` for new v4 setups, `@apply` everywhere, giant unreadable class strings with no component extraction, `!important` utilities, inline `style` for things utilities cover, mixing a second CSS framework.

---


# shadcn/ui Skill

shadcn/ui is **not an npm component library**: the CLI copies component source into your repo (`components/ui/*`), which you own and edit. Built on Tailwind CSS v4 + Radix UI (or Base UI) + `class-variance-authority`.

## Always start by inspecting the project
```bash
npx shadcn@latest info --json     # framework, Tailwind version, aliases, base (radix|base), icon lib, installed components
```
Use the project's package runner (`npx`, `pnpm dlx`, `bunx --bun`). **Search before building custom UI:**
```bash
npx shadcn@latest search button      # search registries
npx shadcn@latest view @shadcn/dialog
npx shadcn@latest docs dialog select # fetch up-to-date docs/examples
```

## CLI
```bash
npx shadcn@latest init -d                    # non-interactive defaults (init is interactive otherwise!)
npx shadcn@latest init --template next -d    # or --template vite
npx shadcn@latest init -d --base radix       # or --base base-ui
npx shadcn@latest init --preset <code> -f    # apply a design preset
npx shadcn@latest add button card dialog     # add components (also: add --all)
npx shadcn@latest add button --diff          # preview changes vs. local edits (--dry-run, --view)
npx shadcn@latest add @acme/custom-button    # namespaced registries (@v0, @acme …)
npx shadcn@latest apply <preset>             # apply preset to an existing project
npx shadcn@latest migrate radix              # move to the unified `radix-ui` package
npx shadcn@latest build                      # build your own registry (registry.json -> public/r)
npx shadcn@latest mcp init --client cursor   # MCP server for AI assistants (also claude, vscode…)
```
Official agent skill: `pnpm dlx skills add shadcn/ui`. `create` is an alias of `init`. Commands evolve; confirm with `npx shadcn@latest --help`.

## components.json (shape)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": { "components": "@/components", "ui": "@/components/ui", "utils": "@/lib/utils", "lib": "@/lib", "hooks": "@/hooks" },
  "iconLibrary": "lucide",
  "registries": { "@acme": "https://acme.com/r/{name}.json" }
}
```
`tailwind.config` stays empty for Tailwind v4.

## Conventions
- **Use `cn()`** from `@/lib/utils` (`clsx` + `tailwind-merge`) to merge classes; pass `className` through.
- **Never reinvent**: compose from installed primitives (`Button`, `Card`, `Dialog`, `Sheet`, `DropdownMenu`, `Popover`, `Command`, `Tabs`, `Table`, `Form/Field`, `Sonner`, `Sidebar`, `Skeleton`, `Badge`, `Alert`, `Tooltip`…).
- Variants via `cva`: `<Button variant="outline" size="sm">`. Add new variants inside the local component file; edit freely.
- Components use `data-slot="…"` attributes for targeting/styling; React 19 style (`ref` as prop, no `forwardRef`).
- Icons: `lucide-react` (or whatever `iconLibrary` says). Icon-only buttons need `aria-label`.
- Toasts: use **Sonner** (`<Toaster />` in root layout, `toast()`); the old Toast component is deprecated.
- Forms: `react-hook-form` + `zod` (+ `@hookform/resolvers`) with the shadcn Form/Field components; show errors via the field's message slot.
- Dialogs/Sheets/Popovers: always include a Title (visually hidden with `sr-only` if needed) and Description for accessibility.
- Data tables: `@tanstack/react-table` with the DataTable pattern.
- Charts: shadcn `Chart` (Recharts wrapper) using `--chart-1..5` variables.

## Theming (Tailwind v4)
Design tokens are CSS variables in `app/globals.css`, in OKLCH, mapped to Tailwind via `@theme inline`:
```css
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));

:root { --background: oklch(1 0 0); --foreground: oklch(0.145 0 0);
        --primary: oklch(0.205 0 0); --primary-foreground: oklch(0.985 0 0);
        --radius: 0.625rem; /* … */ }
.dark { --background: oklch(0.145 0 0); --foreground: oklch(0.985 0 0); /* … */ }

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --radius-lg: var(--radius);
}
```
- Use semantic classes (`bg-background text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`), **never** raw colors like `bg-white` / `text-gray-500` in shadcn components.
- Dark mode: `next-themes` `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `suppressHydrationWarning` on `<html>`).
- `tw-animate-css` replaces the old `tailwindcss-animate` plugin on v4.
- Change look globally by editing tokens/presets, not each component.

## Next.js notes
- Components that use hooks/events need `"use client"`; keep pages as Server Components and push interactivity to leaf client components.
- Install path alias `@/*` in tsconfig must match `components.json`.
- After `add`, check added non-UI files from third-party registries for hardcoded import paths.

## Anti-patterns
Treating it as a dependency (never "upgrade" blindly: use `add --diff`), wrapping every component in another abstraction, hardcoded colors, editing `node_modules`, mixing Radix and Base UI primitives in one component, skipping a11y labels, using the removed `tailwind.config` theme extension on v4.
