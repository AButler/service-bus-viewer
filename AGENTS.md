# AGENTS.md

Guidance for AI agents (and humans) working in this repository. Read this
before making changes, and follow the established patterns rather than
introducing new ones.

## What this is

A desktop app (Tauri + React) for viewing and managing messages on **Azure
Service Bus**: connect to multiple namespaces, browse queues / topics /
subscriptions, and inspect messages (including dead-letter queues).

The data layer is currently **mocked** — no real Azure calls yet — but the mock
is shaped exactly like the official Microsoft SDKs so it can be swapped for the
real thing without touching the UI or hooks.

## Tech stack

- **Tauri v2** (Rust shell in `src-tauri/`) + **Vite 7** dev server on port **1420**
- **React 19** + **TypeScript ~5.8** (strict)
- **MUI v9**: `@mui/material`, `@mui/x-data-grid`, `@mui/x-tree-view`,
  `@mui/icons-material`, Emotion styling
- **@tanstack/react-query v5** for all data fetching
- **react-router-dom v7** — selection/message state lives in the URL (see Routing)
- **date-fns** — relative time in the date/time formatter
- **react-json-view-lite** for JSON body rendering
- `@fontsource/inter` for the Inter font
- **Tauri plugins:** `@tauri-apps/plugin-opener` (open links), `@tauri-apps/plugin-clipboard-manager` (copy)
- **Testing:** Vitest + Testing Library (jsdom)

## Commands

- Install: `npm install`
- Dev server: `npm run dev` (Vite, http://localhost:1420)
- Lint / type-check (primary gate — there is no ESLint config): `npm run lint` (`tsc --noEmit`)
- Tests: `npm test` (`vitest run`); watch with `npm run test:watch`
- Production build: `npm run build` (`tsc && vite build`)
- Regenerate app icons from `app-icon.svg`: `npm run icons` (`tauri icon`)
- Tauri: `npm run tauri`

**Always run `npm run lint` after changes.** `tsconfig` uses `strict`,
`noUnusedLocals`, and `noUnusedParameters`, so unused imports/vars fail the build.
CI (`.github/workflows/ci.yml`) runs lint → build → test on PRs and pushes to
`main`, annotating failures inline (tsc problem matcher + Vitest `github-actions`
reporter).

## Architecture & layout

```
src/
  api/
    types.ts               # Azure-SDK-shaped types (SBNamespace, SBQueue, ... , ServiceBusReceivedMessage)
    serviceBusClient.ts    # Mock API: async funcs w/ simulated latency + paging
  hooks/
    useServiceBus.ts       # React Query hooks (useNamespaces/useQueues/useTopics/useSubscriptions/useMessages)
  lib/
    selectionRoute.ts      # URL <-> selection mapping (parse/build/ancestors)
    namespace.ts           # deriveNamespaceHost(serviceBusEndpoint)
    clipboard.ts           # copyText() — Tauri plugin w/ browser fallback
  components/
    NamespacesPanel.tsx    # Left panel wrapper (header + tree + connect button)
    NamespaceTree.tsx      # Lazy-loaded tree (SimpleTreeView) + selection resolve
    namespaceTree/         # Tree building blocks (see Tree conventions)
    MessagesPanel.tsx      # Middle panel wrapper (toolbar + grid, or empty state)
    MessageToolbar.tsx     # Entity header, refresh, count chips, view toggle
    MessageGrid.tsx        # DataGrid (server pagination, no sorting)
    MessageDetails.tsx     # Right panel: collapsible sections + body
    messageDetails/        # CopyButton, PropertyRow, Section, properties config
    bodyRenderers/         # Content-type -> body renderer registry
    propertyFormatters/    # Property value formatter registry (see below)
    NamespacesHeader.tsx   # "Namespaces" overline + hover actions + menu
    ResizeHandle.tsx       # Draggable divider between panels
    TopBar.tsx / AppIcon.tsx / AboutButton.tsx / ColorModeToggle.tsx
  theme.ts                 # MUI theme (colorSchemes light/dark, cssVariables)
  App.tsx                  # Layout + selection/routing coordination
  main.tsx                 # Providers: QueryClientProvider + ThemeProvider + BrowserRouter
  test/setup.ts            # Vitest setup (jsdom stubs)
app-icon.svg               # Master icon; `npm run icons` regenerates src-tauri/icons
src-tauri/                 # Tauri (Rust)
```

Three-panel layout: **tree (left) → message grid (middle) → details (right)**,
with resizable dividers between them. `App.tsx` is a coordinator: it derives the
selection from the URL and renders `NamespacesPanel`, `MessagesPanel`, and
`MessageDetails`.

## Data layer (IMPORTANT)

- **Never fetch data directly in components.** Add/extend a hook in
  `src/hooks/useServiceBus.ts`, which wraps functions in
  `src/api/serviceBusClient.ts`. Hooks take an `enabled` flag for lazy loading.
- The mock client returns data in the **same shape as the Azure SDKs**
  (management plane `@azure/arm-servicebus`: `SBQueue.properties.countDetails`,
  etc.; data plane `@azure/service-bus`: `ServiceBusReceivedMessage`). Keep it
  that way so a real implementation is a drop-in replacement.
- Every mock call **simulates latency** (`delay(...)`) so loading states are
  exercised. Preserve this.
- **Paged** operations return `{ value, totalCount, nextSkip }` so callers can
  show totals and page through. `peekMessages` is server-paged.
- **Derive all counts from the API** (`properties.countDetails`), never from
  ad-hoc UI state.
- React Query keys mirror the resource hierarchy: `["namespaces"]`,
  `["queues", ns]`, `["topics", ns]`, `["subscriptions", ns, topic]`,
  `["messages", params]`. Follow this convention for new queries.
- Generated messages intentionally exercise edge cases: some have **no
  `subject`**, some **bodies exceed 1 KB**, and `enqueuedTimeUtc` is **always in
  the past and increases with `sequenceNumber`**. Preserve these when editing the
  mock.

## Routing / URL state

Selection is persisted in the URL (react-router `BrowserRouter`); `App` treats
the path as the source of truth. `src/lib/selectionRoute.ts` owns the mapping:

```
/<namespace>/queues/<queue>/<view>[/<sequenceNumber>]
/<namespace>/topics/<topic>/<subscription>/<view>[/<sequenceNumber>]
```

- `<view>` is `messages` (active) or `dead-letters` — so the message view is
  restored on reload.
- **Messages are identified by `sequenceNumber`, not `messageId`.** In Service
  Bus `messageId` is optional/app-defined and not guaranteed unique;
  `sequenceNumber` is broker-assigned and unique per entity (and per dead-letter
  subqueue). `MessageGrid` uses `getRowId={(row) => String(row.sequenceNumber)}`.
- `App` resolves the full `SelectedEntity` reactively from the queries (so deep
  links resolve counts), derives `selectedMessage` from the loaded page, and
  navigates on selection/view/pagination changes.
- **Stale-URL redirects** (once the backing queries settle): unknown namespace
  or entity → `/`; a message not found in the page → the owning entity path.
- Use `buildEntityPath` / `buildMessagePath` to construct links and
  `parseSelectionPath` to read them; never hand-build these paths.

## Tree conventions (`NamespaceTree.tsx` + `namespaceTree/`)

- Tree building blocks live in `src/components/namespaceTree/`: `treeItems.tsx`
  (`CountBadge`, `EntityLabel`, `LoadingItem`, `MessageItem`, `Placeholder`),
  `QueueItem`, `SubscriptionItem`, `TopicItem`, `NamespaceChildren`,
  `NamespaceItem`, `useResolveSelection`, and `types.ts` (`SelectedEntity`).
  `NamespaceTree.tsx` composes these into a `SimpleTreeView`.
- **Lazy loading:** a namespace's queues/topics load when expanded; a topic's
  subscriptions load when expanded. Show a spinner child (`LoadingItem`) while
  `isPending`.
- **Item id scheme** encodes kind + path: `namespace:<ns>`,
  `group:<ns>:queues|topics`, `queue:<ns>/<name>`, `topic:<ns>/<name>`,
  `subscription:<ns>/<topic>/<name>`. Loading/placeholder nodes use
  `::loading` / `::empty` / `::placeholder` suffixes.
- **Selection** (`useResolveSelection`) resolves the full entity (incl.
  `countDetails`) from the React Query cache via `queryClient.getQueryData(...)`.
- Count chips: **primary** = active messages, **error** = dead-letter count. The
  namespace status dot is a bottom-right `Badge`.
- The namespace host is derived with `deriveNamespaceHost` (`src/lib/namespace.ts`):
  URL hostname, with `:<port>` only when non-standard for the protocol.

## Message details (`MessageDetails.tsx` + `messageDetails/`)

- Body + Application/System/Dead-letter properties render as collapsible
  bordered **`Section`** accordions (controlled; expand/collapse-all buttons live
  in the "Message Details" panel header, hover-revealed).
- Property rows are config-driven: `messageDetails/properties.ts` holds the
  property name lists, `propertyLabels` overrides, `getRawPropertyValue` (incl.
  the derived `size`), and `bodyBytes`/`bodyToText`. Values format via
  `getPropertyFormatter(name)(value, "full")` and show a raw-name tooltip.
- **`CopyButton`** (shared) provides the hover-revealed copy control used by
  property rows and the Body section header; it calls `copyText` from
  `src/lib/clipboard.ts` and shows a transient check.

## Property value formatters (`propertyFormatters/`)

Mirrors the body renderer registry. `getPropertyFormatter(name)` returns a
`PropertyFormatter` `(value, detail) => string`, defaulting to `String(value)`.
`detail` is `"simple"` (used by the grid) or `"full"` (used by details):

- `bytesFormatter` — `"1,024 bytes (1 KB)"` (full) vs `"1 KB"` (simple).
- `durationFormatter` — `"1,209,600 seconds (14 days)"` (detail-agnostic today).
- `dateTimeFormatter` — ISO 8601 UTC, plus relative time in `full`.

**To add a custom format, register it in `propertyFormatters/index.ts`.** The
grid (`MessageGrid`) and details (`MessageDetails`) both format through this
registry so they stay consistent.

## Grid & toolbar

- `MessageGrid` uses server pagination, `disableColumnSorting`, `disableColumnMenu`,
  `getRowId` on `sequenceNumber`, and formats Size/Enqueued via
  `getPropertyFormatter(..., "simple")`. Default page size is 50.
- `MessageToolbar` shows the entity name and the namespace short-name (host as a
  tooltip), a refresh button, active/dead-letter count chips (collapsed on narrow
  containers via container queries), and the messages/dead-letter toggle. The
  toggle and chips use primary/error colors consistently.

## Body renderer registry (extensible pattern)

Message bodies are rendered by content type via a small registry in
`src/components/bodyRenderers/`:

- `types.ts` — `BodyRendererProps { body, contentType }` and `BodyRenderer`.
- `index.ts` — `getBodyRenderer(contentType)` looks up a renderer by normalized
  MIME essence (parameters stripped), treats `*+json` as JSON, and falls back to
  `PlainTextBodyRenderer`.
- `JsonBodyRenderer.tsx` — `react-json-view-lite`, theme-aware, monospace. It
  overrides the `punctuation` style key (via a `sbv-json-punctuation` class) to
  mute `{ } [ ] , :`, and hangs the expand chevron in the gutter so expandable
  and non-expandable keys line up.
- `PlainTextBodyRenderer.tsx` — monospace fallback.

**To support a new content type, add one entry to the `renderers` map in
`index.ts`** and create a renderer component implementing `BodyRenderer`. Do not
special-case content types inside `MessageDetails`.

Note: `react-json-view-lite` options like `stringifyStringValues` and
`quotesForFieldNames` are part of the `style` object (`StyleProps`), not
top-level `JsonView` props — merge them into the theme style object.

## Clipboard (`src/lib/clipboard.ts`)

`copyText(text)` uses the Tauri clipboard-manager plugin when running in Tauri
(`isTauri()`), and falls back to `navigator.clipboard` in the browser. The Rust
side is wired in `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, and the
`clipboard-manager:allow-write-text` capability in `capabilities/default.json`.

## UI / theme conventions

- **Do NOT use MUI `Stack`.** In this MUI v9 setup its typings resolve
  incorrectly (own-props drop out and `tsc` fails). Use `Box` with
  `sx={{ display: "flex", ... }}` instead.
- Theme lives in `theme.ts` using **`colorSchemes` (light/dark)** +
  `cssVariables`. Dark mode is driven by `useColorScheme()` and defaults to the
  system preference (`defaultMode="system"` in `main.tsx`). When reading palette
  values in `styleOverrides`, use `(theme.vars || theme).palette...`.
- Prefer the `sx` prop for styling; use theme tokens (`primary.main`,
  `divider`, `text.secondary`, `action.hover`) over hard-coded colors.
- **Responsive collapsing** uses CSS **container queries** (the middle panel sets
  `containerType: "inline-size"`), so it responds to panel resizing as well as
  window size. Prefer this over viewport breakpoints for panel-relative layout.
- Panels are resizable via `ResizeHandle`, which computes width as
  `startWidth + totalDelta` (clamped) from the drag origin — do not switch to
  incremental deltas (that reintroduces an overshoot bug at min/max).
- Hover-revealed actions use an opacity/`display` toggle on a shared class with a
  `&:hover` rule on the container (see `NamespacesHeader`, the details header,
  and the tree kebab).

## Testing & CI

- **Vitest + Testing Library** (jsdom). Config in `vitest.config.ts`; global
  stubs (`matchMedia`, `ResizeObserver`, `IntersectionObserver`, `scrollIntoView`)
  in `src/test/setup.ts`.
- Tests are colocated as `*.test.ts(x)`. Pure modules (`selectionRoute`,
  `propertyFormatters`, `namespace`, `bodyRenderers`, `messageDetails/properties`,
  `serviceBusClient`) have unit tests; `App.test.tsx` covers routing, deep-link
  restore, and the redirect rules by rendering `App` in a `MemoryRouter`.
- Import test globals explicitly from `vitest` (config uses `globals: false`).
- Add/extend tests for non-trivial logic; run `npm test` before finishing.

## Coding conventions

- TypeScript throughout; prefer explicit domain types (see `src/api/types.ts`).
- Formatting matches the existing files: 2-space indent, double quotes,
  semicolons, trailing commas. Keep new code consistent (no linter is
  configured, so match by hand).
- Keep components focused and compact; extract cohesive sub-components into a
  sibling folder (see `messageDetails/`, `namespaceTree/`) and pure helpers into
  `src/lib/`.
- Only add what is requested/necessary — avoid speculative abstractions,
  comments, or error handling for impossible states.
- Don't create markdown/docs files unless asked.

## Verifying changes

1. `npm run lint` must pass.
2. `npm test` must pass (add tests for non-trivial logic).
3. For UI changes, run `npm run dev` and verify in the browser at
   http://localhost:1420 (only one dev server can bind port 1420).

## Security & compliance

Follow security best practices:
OWASP Top 10 baseline, never commit real PII/PHI/secrets (use synthetic data),
feature branches + PR review, and tests for non-trivial logic.
