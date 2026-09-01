// Shared configuration for the Netherlands map.

// Free vector tile style, no API key required.
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Bounding box roughly covering the Netherlands (with small padding).
// [west, south, east, north]
export const NETHERLANDS_BOUNDS = [
  [2.9, 50.5], // south-west
  [7.5, 53.8], // north-east
];

export const NETHERLANDS_CENTER = [5.2913, 52.1326];

export const INITIAL_ZOOM = 7;
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;

// Endpoint exposed by the backend team, override with VITE_API_URL if needed.
export const FLOOD_DATA_URL =
  import.meta.env.VITE_API_URL ?? "/api/flood-levels";

// Numeric weight per flood-severity label, used to drive the heatmap intensity.
export const LEVEL_WEIGHTS = {
  LOW: 1,
  MEDIUM: 5,
  HIGH: 10,
};

