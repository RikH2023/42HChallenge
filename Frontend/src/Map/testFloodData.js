// Local stand-in for the backend GET endpoint, used until it is available.
// Same shape the backend will send: an array of [longitude, latitude, level].
import { NETHERLANDS_BOUNDS } from "./mapConfig.js";

const LEVELS = ["LOW", "MEDIUM", "HIGH"];

const [[WEST, SOUTH], [EAST, NORTH]] = NETHERLANDS_BOUNDS;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Biases a cluster of points around a center so the different severities
// form visually distinct blobs instead of one uniform scatter.
function randomCluster(centerLng, centerLat, spread, count, level) {
  return Array.from({ length: count }, () => [
    centerLng + randomBetween(-spread, spread),
    centerLat + randomBetween(-spread, spread),
    level,
  ]);
}

function randomScatter(count) {
  return Array.from({ length: count }, () => [
    randomBetween(WEST, EAST),
    randomBetween(SOUTH, NORTH),
    LEVELS[Math.floor(Math.random() * LEVELS.length)],
  ]);
}

export const TEST_FLOOD_DATA = [
  // Zeeland / Rotterdam area — low-lying, marked as a HIGH-risk hotspot.
  ...randomCluster(4.05, 51.55, 0.35, 12, "HIGH"),
  // Around Utrecht — moderate risk cluster.
  ...randomCluster(5.12, 52.09, 0.3, 10, "MEDIUM"),
  // Northern provinces — mild, spread out low risk.
  ...randomCluster(6.1, 53.1, 0.4, 8, "LOW"),
  // A few fully random points scattered across the whole country.
  ...randomScatter(15),
];
