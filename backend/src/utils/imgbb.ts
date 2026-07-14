/**
 * imgbb.ts — Upload a Buffer to imgbb and return the hosted image URL.
 *
 * imgbb API docs: https://api.imgbb.com/
 * Expected env var: IMGBB_API_KEY
 */

import env from "../config/env.js";

export interface ImgBBResult {
  url: string;      // direct image URL (e.g. https://i.ibb.co/…/name.webp)
  displayUrl: string;
  deleteUrl: string;
  size: number;
}

/**
 * Upload an image Buffer to imgbb.
 * @param buffer   — Optimised image buffer (already processed by sharp)
 * @param filename — Filename hint sent to imgbb (affects the URL slug)
 * @param expiration — Optional seconds until imgbb auto-deletes (omit = permanent)
 */
export async function uploadToImgBB(
  buffer: Buffer,
  filename: string,
  expiration?: number,
): Promise<ImgBBResult> {
  const apiKey = env.IMGBB_API_KEY;
  const apiUrl = env.IMGBB_API_URL;
  if (!apiKey) throw new Error("IMGBB_API_KEY is not set in environment variables");
  if (!apiUrl) throw new Error("IMGBB_API_URL is not set in environment variables");

  // imgbb accepts base64 as a simple form field — URLSearchParams works with fetch()
  const params = new URLSearchParams();
  params.append("image", buffer.toString("base64"));
  params.append("name", filename);
  if (expiration) params.append("expiration", String(expiration));

  const url = `${apiUrl}?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`imgbb upload failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    data: {
      url: string;
      display_url: string;
      delete_url: string;
      size: number;
    };
    success: boolean;
    status: number;
  };

  if (!json.success) throw new Error("imgbb returned success=false");

  return {
    url: json.data.url,
    displayUrl: json.data.display_url,
    deleteUrl: json.data.delete_url,
    size: json.data.size,
  };
}
