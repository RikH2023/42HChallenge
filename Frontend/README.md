# Frontend

This folder contains three separate, currently-unmerged front ends. None of them import
from one another — each is served independently and talks directly to the Backend API
(`http://127.0.0.1:8000`).

- `map-app/` — Vite + MapLibre GL app rendering the Netherlands flood heatmap.
  Run with `cd map-app; npm install; npm run dev`. See [map-app/README.md](map-app/README.md).
- `admin/` — Static admin dashboard (`admin.html` + `admin.js` + `admin.css`) for reviewing
  reported cities and publishing emergency alerts. No build step; open `admin.html` directly
  or serve statically, e.g. `python -m http.server` from inside `admin/`.
- `report/` — Static public reporting page (`report.html` + `report.js` + `report.css`) for
  residents to report flooding and read published announcements. No build step; serve the same
  way as `admin/`.

## Next steps

`report/` has a `map-placeholder` section reserved for embedding the map, but the map
(`map-app/`) is not yet wired into it — integrating the two is still outstanding.
