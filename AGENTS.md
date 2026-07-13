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
- **react-json-view-lite** for JSON body rendering
- `@fontsource/inter` for the Inter font

## Commands

- Install: `npm install`
- Dev server: `npm run dev` (Vite, http://localhost:1420)
- Type-check (primary gate — there is no ESLint config): `npx tsc --noEmit`
- Production build: `npm run build` (`tsc && vite build`)
- Tauri: `npm run tauri`

**Always run `npx tsc --noEmit` after changes.** `tsconfig` uses `strict`,
`noUnusedLocals`, and `noUnusedParameters`, so unused imports/vars fail the build.

## Architecture & layout

```
src/
  api/
    types.ts            # Azure-SDK-shaped types (SBNamespace, SBQueue, ... , ServiceBusReceivedMessage)
    serviceBusClient.ts # Mock API: async funcs w/ simulated latency + paging
  hooks/
    useServiceBus.ts    # React Query hooks (useNamespaces/useQueues/useTopics/useSubscriptions/useMessages)
  components/
    NamespaceTree.tsx   # Left panel: lazy-loaded tree with spinners
    MessageGrid.tsx     # Middle panel: DataGrid (server pagination)
    MessageDetails.tsx  # Right panel: system/app properties + body
    ResizeHandle.tsx    # Draggable divider between panels
    bodyRenderers/      # Content-type -> body renderer registry (see below)
  theme.ts              # MUI theme (colorSchemes light/dark, cssVariables)
  App.tsx               # Three-panel layout + app state
  main.tsx              # Providers: QueryClientProvider + ThemeProvider
src-tauri/              # Tauri (Rust)
```

Three-panel layout: **tree (left) → message grid (middle) → details (right)**,
with resizable dividers between them.

## Data layer (IMPORTANT)

- **Never fetch data directly in components.** Add/extend a hook in
  `src/hooks/useServiceBus.ts`, which wraps functions in
  `src/api/serviceBusClient.ts`.
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

## Tree conventions (`NamespaceTree.tsx`)

- **Lazy loading:** a namespace's queues/topics load when it is expanded; a
  topic's subscriptions load when it is expanded. Show a spinner child
  (`LoadingItem`) while `isPending`.
- **Item id scheme** encodes kind + path so the item is identifiable:
  `namespace:<ns>`, `group:<ns>:queues|topics`, `queue:<ns>/<name>`,
  `topic:<ns>/<name>`, `subscription:<ns>/<topic>/<name>`. Loading/placeholder
  nodes use `::loading` / `::empty` / `::placeholder` suffixes.
- **Selection** resolves the full entity (incl. `countDetails`) from the React
  Query cache via `queryClient.getQueryData(...)`, producing a `SelectedEntity`.
- Count chips: **primary** = active messages, **error** = dead-letter count.

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
- Colors should stay consistent across surfaces (e.g. the messages/dead-letter
  toggle matches the header count chips: primary / error).

## Body renderer registry (extensible pattern)

Message bodies are rendered by content type via a small registry in
`src/components/bodyRenderers/`:

- `types.ts` — `BodyRendererProps { body, contentType }` and `BodyRenderer`.
- `index.ts` — `getBodyRenderer(contentType)` looks up a renderer by normalized
  MIME essence (parameters stripped), treats `*+json` as JSON, and falls back to
  `PlainTextBodyRenderer`.
- `JsonBodyRenderer.tsx` — `react-json-view-lite`, theme-aware, monospace.
- `PlainTextBodyRenderer.tsx` — monospace fallback.

**To support a new content type, add one entry to the `renderers` map in
`index.ts`** and create a renderer component implementing `BodyRenderer`. Do not
special-case content types inside `MessageDetails`.

Note: `react-json-view-lite` options like `stringifyStringValues` and
`quotesForFieldNames` are part of the `style` object (`StyleProps`), not
top-level `JsonView` props — merge them into the theme style object.

## Coding conventions

- TypeScript throughout; prefer explicit domain types (see `src/api/types.ts`).
- Formatting matches the existing files: 2-space indent, double quotes,
  semicolons, trailing commas. Keep new code consistent (no linter is
  configured, so match by hand).
- Keep components focused; extract small presentational helpers within a file
  when it aids readability (see `NamespaceTree.tsx`).
- Only add what is requested/necessary — avoid speculative abstractions,
  comments, or error handling for impossible states.
- Don't create markdown/docs files unless asked.

## Verifying changes

1. `npx tsc --noEmit` must pass.
2. For UI changes, run `npm run dev` and verify in the browser at
   http://localhost:1420 (only one dev server can bind port 1420).

## Security & compliance

Follow security best practices:
OWASP Top 10 baseline, never commit real PII/PHI/secrets (use synthetic data),
feature branches + PR review, and tests for non-trivial logic.
