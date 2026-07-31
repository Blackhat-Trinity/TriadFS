const fs = require("node:fs");
const path = require("node:path");
const { rcedit } = require("rcedit");

module.exports = async function artifactBuildCompleted(context) {
  if (context.packager.platform.name !== "windows") {
    return;
  }

  const artifactPath = context.artifactPath;
  const iconPath = path.resolve(context.packager.projectDir, "build", "icon.ico");

  if (!artifactPath || !artifactPath.toLowerCase().endsWith(".exe")) {
    return;
  }

  const fileName = path.basename(artifactPath);
  const isPortableExe = /^TriadFS \d+\.\d+\.\d+\.exe$/i.test(fileName);

  if (!isPortableExe || !fs.existsSync(iconPath)) {
    return;
  }

  await rcedit(artifactPath, {
    icon: iconPath
  });
};
