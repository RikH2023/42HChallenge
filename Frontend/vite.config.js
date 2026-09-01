import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const resolvePath = (relativePath) => fileURLToPath(new URL(relativePath, import.meta.url));

// Multi-page app: map (index), admin dashboard, and public report page all share src/Map.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolvePath("./index.html"),
        admin: resolvePath("./admin.html"),
        report: resolvePath("./report.html"),
      },
    },
  },
});
