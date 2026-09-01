import { bootMap } from "./mapBoot.js";

const map = bootMap("map");

// Exposed for manual debugging in the browser console only.
if (import.meta.env.DEV) window.__map = map;
