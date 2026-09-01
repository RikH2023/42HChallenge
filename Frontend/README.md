# Frontend — Netherlands Flood Map

Vite + vanilla JavaScript app rendering a full-page [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) map
restricted to the Netherlands, with a heatmap overlay for flood levels.

## Structure

- `src/Map/mapConfig.js` — map style, Netherlands bounds/center, zoom limits, backend endpoint URL.
- `src/Map/mapInit.js` — creates the MapLibre map, locks panning to the Netherlands, enables scroll-zoom, adds zoom/compass buttons.
- `src/Map/floodLayer.js` — fetches flood level points from the backend GET endpoint and renders them as a heatmap layer.
- `src/main.js` — app entry point.

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

Set a custom backend URL by creating a `.env.local` file:

```
VITE_API_URL=http://localhost:8000/api/flood-levels
```
