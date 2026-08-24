import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// ─────────────────────────────────────────────────────────────────────────────
// Proxy strategy:
//   DEV  (bun run dev / npm run dev):
//     → proxy /api to http://localhost:3000  (local backend)
//     → if VITE_API_URL is set in .env.local, use that instead
//     → fallback: https://urbanranchi.onrender.com (production backend)
//
//   PROD (build output served on Vercel):
//     → vercel.json rewrites handle /api → https://urbanranchi.onrender.com
//     → no proxy needed
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // In dev: prefer local backend, fall back to remote if not running
  const localBackend = "http://localhost:3000";
  const remoteBackend = env.VITE_API_URL || "https://urbanranchi.onrender.com";
  const isDev = mode === "development";

  // Use local backend in dev by default.
  // Set VITE_USE_REMOTE=true in .env.local to proxy to render.com during dev.
  const proxyTarget =
    isDev && env.VITE_USE_REMOTE !== "true" ? localBackend : remoteBackend;

  return {
    plugins: [tailwindcss(), react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: proxyTarget.startsWith("https"),
          headers: { Connection: "keep-alive" },
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              // If local backend is down, try the remote backend as fallback
              const msg = `[proxy] ${err.message} → is your local backend running on port 3000?`;
              console.warn(msg);
              if (res && !res.headersSent) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    success: false,
                    message:
                      isDev && proxyTarget === localBackend
                        ? "We could not connect to the server. Please try again in a moment."
                        : "Backend unreachable",
                  })
                );
              }
            });
          },
        },
      },
    },
  };
});
