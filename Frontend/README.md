# Frontend — Netherlands Flood Map

Vite + vanilla JavaScript app rendering a full-page [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) map
restricted to the Netherlands, with a heatmap overlay for flood levels. The map is the shared background layer for
all three pages below; the admin/report UIs are floating card components on top of it.

## Pages

- `index.html` — map only.
- `admin.html` — map background + floating admin sidebar (`src/admin/`) for reviewing reported cities and
  publishing emergency alerts.
- `public/index.html` (served at `/public`) — map background + floating announcements card and
  report-flooding form (`src/report/`) for residents.

## Structure

- `src/Map/mapConfig.js` — map style, Netherlands bounds/center, zoom limits, backend endpoint URL.
- `src/Map/mapInit.js` — creates the MapLibre map, locks panning to the Netherlands, enables scroll-zoom, adds zoom/compass buttons.
- `src/Map/floodLayer.js` — fetches flood level points from the backend GET endpoint and renders them as a heatmap layer.
- `src/mapBoot.js` — shared helper (`bootMap(containerId)`) that wires up `mapInit` + `floodLayer`, used by all three pages.
- `src/main.js` — entry point for `index.html`.
- `src/admin/adminView.js`, `src/report/reportView.js` — build their page's overlay markup via `insertAdjacentHTML`
  (same JS-driven style as `src/Map`, not static HTML), called once at the top of `admin.js`/`report.js`.
- `src/admin/`, `src/report/` — JS/CSS for the admin and report overlay UIs. `admin.html`/`public/index.html` are
  just a `#map` div + a `<script type="module">` — all markup is generated at runtime, mirroring how `main.js`
  drives the map.
- `public/` — route folder for the resident-facing report page (`/public`), NOT Vite's static-assets convention;
  `publicDir` is disabled in `vite.config.js` since this folder name is repurposed for the route.

## Backend contract

`GET` request to the URL configured via `VITE_API_URL` (defaults to `/api/flood-levels`) must return JSON:

```json
[
  { "latitude": 52.37, "longitude": 4.90, "level": 7 },
  { "latitude": 51.92, "longitude": 4.48, "level": 3 }
]
```

`level` is used as the heatmap weight (flood severity).

## Getting started

```bash
cd Frontend
npm install
npm run dev
```

Then open `/`, `/admin.html`, or `/public`. Set a custom backend URL by creating a `.env.local` file:

```
VITE_API_URL=http://localhost:8000/api/flood-levels
```
