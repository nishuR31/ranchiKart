import sharp from "sharp";
import fs from "node:fs/promises";
import { execSync } from "node:child_process";

let cmd = "magick";

try {
    execSync("magick -version", { stdio: "ignore" });
} catch {
    cmd = "convert";
}

const ICON = "public/favicon.svg";
const SOURCE = "public/source.png";
const OUT = "public";

await fs.mkdir(OUT, { recursive: true });

async function png(src, dest, width, height = width, options = {}) {
    await sharp(src)
        .resize(width, height, {
            fit: options.fit ?? "contain",
            background: options.background ?? {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0,
            },
        })
        .png({
            compressionLevel: 9,
            quality: 100,
        })
        .toFile(`${OUT}/${dest}`);

    console.log(`✓ ${dest}`);
}

async function webp(src, dest, width, height = width) {
    await sharp(src)
        .resize(width, height)
        .webp({
            quality: 95,
        })
        .toFile(`${OUT}/${dest}`);

    console.log(`✓ ${dest}`);
}

async function avif(src, dest, width, height = width) {
    await sharp(src)
        .resize(width, height)
        .avif({
            quality: 85,
        })
        .toFile(`${OUT}/${dest}`);

    console.log(`✓ ${dest}`);
}

/* ---------------------------
   Favicons (SVG → PNG)
--------------------------- */

await png(ICON, "favicon-16x16.png", 16);
await png(ICON, "favicon-32x32.png", 32);
await png(ICON, "apple-touch-icon.png", 180);
await png(ICON, "android-chrome-192x192.png", 192);
await png(ICON, "android-chrome-512x512.png", 512);

/* ---------------------------
   Logo
--------------------------- */

await png(ICON, "logo.png", 512);
await webp(ICON, "logo.webp", 512);
await avif(ICON, "logo.avif", 512);

/* ---------------------------
   Open Graph
--------------------------- */

await png(
    SOURCE,
    "og-image.png",
    1200,
    630,
    {
        fit: "cover",
    }
);

await webp(
    SOURCE,
    "og-image.webp",
    1200,
    630
);

await avif(
    SOURCE,
    "og-image.avif",
    1200,
    630
);

/* ---------------------------
   favicon.ico
--------------------------- */

await sharp(ICON)
    .resize(256, 256)
    .png()
    .toFile(`${OUT}/__favicon.png`);

try {
    execSync(`${cmd} ${OUT}/__favicon.png ${OUT}/favicon.ico`);
    console.log("✓ favicon.ico");
} catch {
    console.warn(
        "Install ImageMagick to generate favicon.ico"
    );
}

await fs.rm(`${OUT}/__favicon.png`);

/* ---------------------------
   Manifest
--------------------------- */

await fs.writeFile(
    `${OUT}/manifest.webmanifest`,
    JSON.stringify(
        {
            name: "RanchiKart",
            short_name: "RanchiKart",
            theme_color: "#F97316",
            background_color: "#ffffff",
            display: "standalone",
            start_url: "/",
            icons: [
                {
                    src: "/android-chrome-192x192.png",
                    sizes: "192x192",
                    type: "image/png",
                },
                {
                    src: "/android-chrome-512x512.png",
                    sizes: "512x512",
                    type: "image/png",
                },
            ],
        },
        null,
        2
    )
);

console.log("✓ manifest.webmanifest");
console.log("\nDone.");