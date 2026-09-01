import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const resolvePath = (relativePath) => fileURLToPath(new URL(relativePath, import.meta.url));

// Redirects bare "/public" (no trailing slash) to "/public/" so it resolves to
// public/index.html — Vite only auto-serves index.html for slash-terminated directory URLs.
function publicRouteRedirect() {
  const redirect = (req, res, next) => {
    if (req.url === "/public") {
      res.writeHead(302, { Location: "/public/" });
      res.end();
      return;
    }
    next();
  };
  return {
    name: "public-route-redirect",
    configureServer(server) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

// Multi-page app: map (index), admin dashboard, and public report page all share src/Map.
export default defineConfig({
  // "public" is used as the report page's route folder (public/index.html), not Vite's
  // static-assets convention, so the default publicDir behavior is turned off.
  publicDir: false,
  plugins: [publicRouteRedirect()],
  build: {
    rollupOptions: {
      input: {
        main: resolvePath("./index.html"),
        admin: resolvePath("./admin.html"),
        report: resolvePath("./public/index.html"),
      },
    },
  },
});
