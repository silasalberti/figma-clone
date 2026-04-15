# figma-clone

A small, opinionated Figma-style collaborative design tool.

- **Canvas** — infinite pan & zoom with a dynamic grid
- **Shapes** — rectangle, ellipse, line, and text with drag-to-create
- **Edit** — move, multi-select, resize, rotate, align, corner radius, stroke/fill/opacity
- **Layers panel** — reorder by drag, rename, show/hide, lock, z-order controls
- **Undo / redo** — powered by `Y.UndoManager`, works across clients
- **Export** — one-click PNG export of the current canvas
- **Real-time multiplayer** — every change syncs over a Yjs CRDT; see other users' live cursors and an avatar stack of who's in the room
- **Rooms** — the URL hash (`#room-name`) is the room id; share the link to collaborate

The frontend is React + TypeScript + Vite + `react-konva`. Collab is Yjs over
`y-websocket`, with a minimal Node server in `server/` that holds a `Y.Doc` per
room in memory.

## Quick start

```bash
npm install
npm run dev
```

That starts:

- the y-websocket server on `ws://localhost:1234`
- the Vite dev server on `http://localhost:5173`, which proxies `/ws` → `:1234`

Open the app, then open the same URL in a second browser tab or window to see
multiplayer cursors and live edits sync between them.

## Scripts

| Script              | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Run web + collab server concurrently               |
| `npm run dev:web`   | Run Vite dev server only                           |
| `npm run dev:server`| Run the collab (y-websocket) server only           |
| `npm run build`     | Type-check and build a production bundle           |
| `npm run preview`   | Preview the production build                       |
| `npm run server`    | Run the collab server (used in production)         |
| `npm run typecheck` | `tsc -b` type check                                |
| `npm run lint`      | ESLint                                             |

## Keyboard shortcuts

| Shortcut                         | Action                                  |
| -------------------------------- | --------------------------------------- |
| `V`                              | Select / move tool                      |
| `H` / hold **Space**             | Hand (pan) tool                         |
| `R` / `O` / `L` / `T`            | Rectangle / ellipse / line / text       |
| Drag on empty canvas             | Marquee select                          |
| Ctrl/⌘ + drag wheel              | Zoom (also pinch-zoom)                  |
| Arrow keys / Shift + Arrow keys  | Nudge selection by 1 / 10 px            |
| Ctrl/⌘ + Z / Ctrl/⌘ + Shift + Z  | Undo / redo                             |
| Ctrl/⌘ + A                       | Select all                              |
| Ctrl/⌘ + D                       | Duplicate                               |
| Delete / Backspace               | Delete selection                        |
| Double-click text                | Edit text inline                        |
| Escape                           | Clear selection / cancel                |

## Architecture

```
┌───────────────────────┐        WebSocket (Yjs sync + awareness)        ┌──────────────────────┐
│   React + react-konva │  ────────────────────────────────────────────▶ │  y-websocket server  │
│   (browser clients)   │  ◀──────────────────────────────────────────── │   (server/index.ts)  │
└───────────────────────┘                                                 └──────────────────────┘
        │                                                                        │
        │ Y.Doc                                                                  │ in-memory Y.Doc per room
        │  ├─ Y.Map<Shape>   "shapes"  — every shape keyed by id                 │
        │  ├─ Y.Array<id>    "order"   — z-order (end = top)                     │
        │  ├─ Y.UndoManager            — local undo stack                        │
        │  └─ Awareness                — cursor + user (name, color)             │
```

- `src/store/yjs.ts` — creates the Y.Doc, WebsocketProvider, and UndoManager.
- `src/store/shapes.ts` — thin imperative API over the Yjs collections.
- `src/store/ui.ts` — Zustand store for UI-only state (current tool, selection, viewport, in-flight text edit).
- `src/components/Canvas.tsx` — the Konva stage and all pointer/keyboard logic.
- `src/components/ShapeNode.tsx` — renders a single shape, with rotation always around its center.
- `server/index.ts` — `ws` + `y-websocket` glue; one `Y.Doc` per room.

Rooms are identified by the URL hash (e.g. `#team-jam`). If no hash is present,
the app creates a random one and redirects to it so you have a shareable link.

## Production

1. `npm run build` produces `dist/`.
2. Run `npm run server` (or set `PORT`) somewhere reachable.
3. Serve `dist/` and set `VITE_WS_URL` at build time if the ws server isn't at
   `/ws` on the same origin as the static files.

## Roadmap / ideas

- Image shapes, frames / groups
- Alignment guides + smart snapping
- Commenting with presence threads
- Persist documents (SQLite / Postgres) — currently everything is in-memory
- Auth + per-room permissions
