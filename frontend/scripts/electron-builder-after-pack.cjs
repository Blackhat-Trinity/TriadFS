const fs = require("node:fs");
const path = require("node:path");
const { rcedit } = require("rcedit");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.resolve(context.packager.projectDir, "build", "icon.ico");

  if (!fs.existsSync(exePath) || !fs.existsSync(iconPath)) {
    return;
  }

  await rcedit(exePath, {
    icon: iconPath
  });
};
