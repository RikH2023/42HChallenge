import { initMap } from "./Map/mapInit.js";
import { addFloodHeatmapLayer } from "./Map/floodLayer.js";

// Shared map bootstrap so index/admin/report pages all render the same background map.
export function bootMap(containerId = "map") {
  const map = initMap(containerId);
  map.on("load", () => {
    addFloodHeatmapLayer(map);
  });
  return map;
}
