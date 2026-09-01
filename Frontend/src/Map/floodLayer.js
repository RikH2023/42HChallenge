import maplibregl from "maplibre-gl";
import { FLOOD_DATA_URL, LEVEL_WEIGHTS } from "./mapConfig.js";
import { TEST_FLOOD_DATA } from "./testFloodData.js";

/**
 * Backend contract (GET FLOOD_DATA_URL):
 * [[longitude, latitude, level], ...] where level is "LOW" | "MEDIUM" | "HIGH".
 */
export async function fetchFloodData() {
  const response = await fetch(FLOOD_DATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch flood data: ${response.status}`);
  }
  return response.json();
}

function toGeoJSON(records) {
  return {
    type: "FeatureCollection",
    features: records.map(([longitude, latitude, level]) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: { level, weight: LEVEL_WEIGHTS[level] ?? 1 },
    })),
  };
}

const SOURCE_ID = "flood-levels";
const HOVER_LAYER_ID = "flood-levels-hover";

// Rendered in this order (LOW -> HIGH) so a cluster of low-severity points
// can never visually stack up into a "false" red — HIGH is always painted
// last/on top, so red only ever means an actual HIGH point is there.
const BLOB_LEVELS = [
  { level: "LOW", color: "#2b83ba" },
  { level: "MEDIUM", color: "#fdae61" },
  { level: "HIGH", color: "#d7191c" },
];

function blobLayerId(level) {
  return `flood-levels-blob-${level.toLowerCase()}`;
}

function glowLayerId(level) {
  return `${blobLayerId(level)}-glow`;
}

function coreLayerId(level) {
  return `${blobLayerId(level)}-core`;
}

// Placeholder copy until the backend provides real per-point details.
const PLACEHOLDER_MESSAGES = [
  "Water level rising rapidly in this area.",
  "Sensors report unusual moisture levels.",
  "Local drainage system nearing capacity.",
  "Historical flood risk zone.",
  "Recent rainfall exceeding seasonal average.",
];

function buildPopupHTML(level) {
  const message =
    PLACEHOLDER_MESSAGES[Math.floor(Math.random() * PLACEHOLDER_MESSAGES.length)];
  return `<strong>Flood level: ${level}</strong><br/>${message}`;
}

export async function addFloodHeatmapLayer(map) {
  let data;
  try {
    data = toGeoJSON(await fetchFloodData());
  } catch (error) {
    console.warn("Backend flood data unavailable, using local test data instead.", error);
    data = toGeoJSON(TEST_FLOOD_DATA);
  }

  map.addSource(SOURCE_ID, { type: "geojson", data });

  // Per severity: a soft blurred "glow" halo (shows spread/blob shape) plus
  // a small solid, white-outlined "core" dot on top (keeps each point easy
  // to spot at a glance instead of fading into the basemap).
  for (const { level, color } of BLOB_LEVELS) {
    map.addLayer({
      id: glowLayerId(level),
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "level"], level],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 12, 14, 38],
        "circle-blur": 1,
        "circle-color": color,
        "circle-opacity": 0.45,
      },
    });

    map.addLayer({
      id: coreLayerId(level),
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "level"], level],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 14, 9],
        "circle-color": color,
        "circle-opacity": 0.95,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.9,
      },
    });
  }

  // Invisible circles sized per severity, used purely as a hover hit-target
  // since a blurred circle's actual paint area is larger than its geometry.
  map.addLayer({
    id: HOVER_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        ["match", ["get", "level"], "HIGH", 18, "MEDIUM", 12, 8],
        14,
        ["match", ["get", "level"], "HIGH", 50, "MEDIUM", 35, 20],
      ],
      "circle-opacity": 0,
    },
  });

  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });

  map.on("mouseenter", HOVER_LAYER_ID, (event) => {
    map.getCanvas().style.cursor = "pointer";
    const feature = event.features[0];
    popup
      .setLngLat(feature.geometry.coordinates)
      .setHTML(buildPopupHTML(feature.properties.level))
      .addTo(map);
  });

  map.on("mouseleave", HOVER_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  // Zoom in towards a point's area when its blob is selected.
  map.on("click", HOVER_LAYER_ID, (event) => {
    const feature = event.features[0];
    map.flyTo({
      center: feature.geometry.coordinates,
      zoom: Math.max(map.getZoom(), 13),
      essential: true,
    });
  });

  return SOURCE_ID;
}

/** Call this once new backend data has been fetched to refresh the flood blobs. */
export async function refreshFloodData(map) {
  const source = map.getSource(SOURCE_ID);
  if (!source) return;
  try {
    source.setData(toGeoJSON(await fetchFloodData()));
  } catch (error) {
    console.error("Could not refresh flood data:", error);
  }
}
