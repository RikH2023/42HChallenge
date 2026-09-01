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
const HEATMAP_LAYER_ID = "flood-levels-heatmap";
const HOVER_LAYER_ID = "flood-levels-hover";

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

  map.addLayer({
    id: HEATMAP_LAYER_ID,
    type: "heatmap",
    source: SOURCE_ID,
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 10, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 1, 14, 3],
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(0,0,255,0)",
        0.2,
        "royalblue",
        0.4,
        "cyan",
        0.6,
        "lime",
        0.8,
        "yellow",
        1,
        "red",
      ],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 15, 14, 40],
      "heatmap-opacity": 0.75,
    },
  });

  // Invisible circles sized per severity, used purely as a hover hit-target
  // since the heatmap paint itself isn't reliably pickable per point.
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

  return SOURCE_ID;
}

/** Call this once new backend data has been fetched to refresh the heatmap. */
export async function refreshFloodData(map) {
  const source = map.getSource(SOURCE_ID);
  if (!source) return;
  try {
    source.setData(toGeoJSON(await fetchFloodData()));
  } catch (error) {
    console.error("Could not refresh flood data:", error);
  }
}
