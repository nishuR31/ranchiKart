// generate-sitemap.js
/**
 * Parses src/App.jsx to extract route paths and generates a sitemap.xml.
 * Run via `npm run generate:sitemap` or `node scripts/generate-sitemap.js`.
 */
import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("src", "App.jsx");
const SITEMAP_PATH = path.resolve("public", "sitemap.xml");
const BASE_URL = "https://ranchikart.vercel.app"; // Adjust if needed

// Regex to capture path="..." within JSX Route elements
const routePathRegex = /path\s*=\s*"([^\"]+)"/g;

function extractRoutes(content) {
  const routes = new Set();
  let match;
  while ((match = routePathRegex.exec(content)) !== null) {
    routes.add(match[1]);
  }
  return Array.from(routes);
}

function buildUrl(route) {
  // Replace dynamic segments with placeholders
  let url = route.replace(/:([a-zA-Z0-9_-]+)/g, "sample-$1");
  url = url.replace(/\*/g, "sample");
  if (!url.startsWith("/")) url = "/" + url;
  return `${BASE_URL}${url}`;
}

function generateSitemap(routes) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  const footer = `</urlset>`;
  const entries = routes.map((r) => {
    const loc = buildUrl(r);
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
  }).join("\n");
  return `${header}\n${entries}\n${footer}`;
}

const appContent = fs.readFileSync(APP_PATH, "utf-8");
let routes = extractRoutes(appContent);
if (!routes.includes("/")) routes.unshift("/");
const sitemapXml = generateSitemap(routes);
fs.writeFileSync(SITEMAP_PATH, sitemapXml, "utf-8");
console.log(`Sitemap generated with ${routes.length} URLs at ${SITEMAP_PATH}`);
