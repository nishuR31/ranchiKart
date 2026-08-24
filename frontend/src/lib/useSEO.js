/**
 * useSEO — sets document.title and meta tags for each page.
 * Works without any external library.
 *
 * Usage:
 *   useSEO({ title: "Product Name", description: "…", image: "…", type: "product" })
 */

const SITE_NAME = "UrbanRanchi";
const SITE_URL  = "https://urbanranchi.vercel.app";
const DEFAULT_DESC = "Shop mobiles, fashion, grocery, home essentials and more — delivered fast across Ranchi & Jharkhand.";
const DEFAULT_IMG  = `${SITE_URL}/og-image.png`;

export default function useSEO({
  title = SITE_NAME,
  description = DEFAULT_DESC,
  image = DEFAULT_IMG,
  type = "website",
  noindex = false,
} = {}) {
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} — ${SITE_NAME}`;

  // ── document.title ──────────────────────────────────────────────────────
  document.title = fullTitle;

  // ── Helper ──────────────────────────────────────────────────────────────
  function setMeta(attr, key, value) {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  }

  // Standard
  setMeta("name", "description", description);
  noindex
    ? setMeta("name", "robots", "noindex,nofollow")
    : setMeta("name", "robots", "index,follow");

  // Open Graph
  setMeta("property", "og:title",       fullTitle);
  setMeta("property", "og:description", description);
  setMeta("property", "og:image",       image);
  setMeta("property", "og:type",        type);
  setMeta("property", "og:site_name",   SITE_NAME);

  // Twitter Card
  setMeta("name", "twitter:card",        "summary_large_image");
  setMeta("name", "twitter:title",       fullTitle);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image",       image);
}
