# Tangent Insight — Vite + React + Framer Motion + Three.js

Premium, highly-animated BIM intelligence dashboard for Tangent Landscape
Architecture. Same Supabase backend, agent, and Revit plugin as before — this
is a full frontend rebuild on a real build toolchain.

## Stack
- **Vite** build (code-split: three / motion / charts chunks)
- **React 18**
- **Framer Motion** — page transitions, spring physics, magnetic hover, shared-element nav indicator
- **Three.js** + **@react-three/fiber** — WebGL ambient particle field with depth + parallax
- **Lenis** — smooth inertia scrolling
- **Recharts** — animated data viz
- **lucide-react** — icons

## Run locally
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

## Deploy (Vercel)
`vercel.json` is set: framework `vite`, build `npm run build`, output `dist`,
SPA rewrite. Just push to the GitHub repo connected to Vercel.

## Motion quality
Auto-detects device tier (high/mid/low/off) on load and scales the WebGL
particle count and DPR accordingly. A topbar toggle (Cinematic / Balanced /
Light / Minimal) lets the user override; reduced-motion users get a static
gradient background and instant transitions. All decorative work is GPU
particle rendering or CSS transforms — data rendering is never blocked.

## Backend
Supabase URL + anon key are in `src/lib/data.js`. The anon key is browser-safe
by design (RLS makes it read-mostly). Migrations 0001–0009, the desktop agent,
and the Revit plugin are unchanged and live in the other repo.

## Architecture notes
- `src/lib/` — data layer (`data.js`, `useLiveData.js`), `auth.js` (GoTrue REST
  with background JWT refresh + `getValidToken`), `util.js` (CSV/toast).
- `src/three/AmbientBackground.jsx` — the WebGL layer, fully decoupled.
- `src/motion/` — Framer variants + hooks (Lenis, magnetic). No business logic.
- `src/components/` — primitives, KPI card, shell (sidebar/topbar).
- `src/screens/` — one file per screen; all wired to live data.
