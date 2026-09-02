import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MAP_STYLE,
  NETHERLANDS_BOUNDS,
  NETHERLANDS_CENTER,
  INITIAL_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
} from "./mapConfig.js";

/**
 * Creates a MapLibre map locked to the Netherlands, with mouse-scroll
 * zoom enabled and zoom in/out + compass buttons added.
 */
export function initMap(containerId) {
  const map = new maplibregl.Map({
    container: containerId,
    style: MAP_STYLE,
    center: NETHERLANDS_CENTER,
    zoom: INITIAL_ZOOM,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBounds: NETHERLANDS_BOUNDS,
    attributionControl: true,
  });

  // Scroll-wheel zoom is enabled by default; keep it explicit for clarity.
  map.scrollZoom.enable();

  // Adds the +/- zoom buttons and compass/reset-north control.
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
  map.addControl(new maplibregl.ScaleControl(), "bottom-left");

  // Keep the canvas correctly sized on any screen/window size.
  window.addEventListener("resize", () => map.resize());

  return map;
}
