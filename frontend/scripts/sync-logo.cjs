const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const toIco = require("to-ico");

const ROOT_LOGO_PATH = path.resolve(__dirname, "..", "..", "TriadFS_logo.png");
const PUBLIC_LOGO_PATH = path.resolve(__dirname, "..", "public", "assets", "TriadFS_logo.png");
const BUILD_DIR = path.resolve(__dirname, "..", "build");
const ICON_PNG_PATH = path.resolve(BUILD_DIR, "icon.png");
const ICON_ICO_PATH = path.resolve(BUILD_DIR, "icon.ico");
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function syncLogo() {
  await ensureDir(path.dirname(PUBLIC_LOGO_PATH));
  await ensureDir(BUILD_DIR);

  const sourceBuffer = await fs.readFile(ROOT_LOGO_PATH);

  await fs.writeFile(PUBLIC_LOGO_PATH, sourceBuffer);
  await fs.writeFile(ICON_PNG_PATH, sourceBuffer);

  const pngVariants = await Promise.all(
    ICO_SIZES.map((size) =>
      sharp(sourceBuffer)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer()
    )
  );

  const icoBuffer = await toIco(pngVariants);
  await fs.writeFile(ICON_ICO_PATH, icoBuffer);

  console.log(`Synced logo from ${ROOT_LOGO_PATH}`);
}

syncLogo().catch((error) => {
  console.error("Failed to sync logo:", error);
  process.exit(1);
});
