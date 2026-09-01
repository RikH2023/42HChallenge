// Local stand-in for the backend GET endpoint, used until it is available.
// Same shape the backend will send: an array of [longitude, latitude, level].
//
// Fixed, hand-picked points (not randomly generated) so they can be tweaked
// individually. Grouped into separate clusters, each spanning a small area
// with neighboring points roughly 50-500m apart from each other.

// Cluster 1 — Maas riverside, Rotterdam.
const ROTTERDAM_CLUSTER = [
  [4.49, 51.91, "HIGH"],
  [4.49087, 51.91036, "HIGH"],
  [4.48927, 51.91063, "HIGH"],
  [4.49218, 51.91108, "HIGH"],
  [4.48913, 51.90946, "HIGH"],
  [4.49175, 51.90973, "MEDIUM"],
  [4.48796, 51.91018, "MEDIUM"],
  [4.49291, 51.91135, "MEDIUM"],
  [4.4868, 51.9091, "MEDIUM"],
  [4.49364, 51.9127, "MEDIUM"],
  [4.49437, 51.9082, "LOW"],
  [4.48534, 51.91162, "LOW"],
  [4.49582, 51.91045, "LOW"],
  [4.48345, 51.90775, "LOW"],
  [4.49073, 51.90596, "LOW"],
  [4.48854, 51.90686, "LOW"],
];

// Cluster 2 — historic island city center, Dordrecht.
const DORDRECHT_CLUSTER = [
  [4.6901, 51.8133, "LOW"],
  [4.69112, 51.81294, "LOW"],
  [4.68923, 51.81375, "LOW"],
  [4.69199, 51.81402, "MEDIUM"],
  [4.68792, 51.81276, "MEDIUM"],
  [4.69301, 51.81168, "MEDIUM"],
  [4.6869, 51.81456, "MEDIUM"],
  [4.69446, 51.81384, "LOW"],
  [4.68603, 51.8115, "LOW"],
  [4.69591, 51.81061, "LOW"],
  [4.684, 51.81528, "LOW"],
  [4.69126, 51.81644, "LOW"],
];

export const TEST_FLOOD_DATA = [...ROTTERDAM_CLUSTER, ...DORDRECHT_CLUSTER];


