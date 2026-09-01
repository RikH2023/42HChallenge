import { initMap } from "./Map/mapInit.js";
import { addFloodHeatmapLayer } from "./Map/floodLayer.js";

const map = initMap("map");

// Exposed for manual debugging in the browser console only.
if (import.meta.env.DEV) window.__map = map;

map.on("load", () => {
  addFloodHeatmapLayer(map);
});
