import { initMap } from "./Map/mapInit.js";
import { addFloodHeatmapLayer, refreshFloodData } from "./Map/floodLayer.js";

const REFRESH_INTERVAL_MS = 30_000;

// Shared map bootstrap so index/admin/report pages all render the same background map.
export function bootMap(containerId = "map") {
  const map = initMap(containerId);
  map.on("load", () => {
    addFloodHeatmapLayer(map).then(() => {
      let isRefreshing = false;

      const refresh = async () => {
        if (document.visibilityState !== "visible" || isRefreshing) return;

        isRefreshing = true;
        try {
          await refreshFloodData(map);
        } finally {
          isRefreshing = false;
        }
      };

      const refreshTimer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
      const refreshWhenVisible = () => {
        if (document.visibilityState === "visible") refresh();
      };

      document.addEventListener("visibilitychange", refreshWhenVisible);
      window.addEventListener(
        "pagehide",
        () => {
          window.clearInterval(refreshTimer);
          document.removeEventListener("visibilitychange", refreshWhenVisible);
        },
        { once: true },
      );
    });
  });
  return map;
}
