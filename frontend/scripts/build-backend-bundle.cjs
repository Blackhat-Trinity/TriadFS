const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const backendRoot = path.join(repoRoot, "backend");
const frontendRoot = path.join(repoRoot, "frontend");
const bundleDir = path.join(frontendRoot, "build", "backend-bundle");
const runtimeDir = path.join(bundleDir, "runtime");
const jarOutputPath = path.join(bundleDir, "api-server.jar");

function run(command, args, options = {}) {
  const executable = process.platform === "win32" && command.endsWith(".cmd") ? "cmd.exe" : command;
  const executableArgs = process.platform === "win32" && command.endsWith(".cmd") ? ["/c", command, ...args] : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: options.cwd ?? repoRoot,
    stdio: "pipe",
    encoding: "utf8",
    shell: false
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(output || `${command} exited with status ${result.status}`);
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function resolveMavenCommand() {
  return process.platform === "win32" ? "mvn.cmd" : "mvn";
}

function resolveJavaHome() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }

  const output = run("java", ["-XshowSettings:properties", "-version"]);
  const match = output.match(/^\s*java\.home\s*=\s*(.+)$/m);
  if (!match) {
    throw new Error("Unable to resolve java.home from the current Java installation.");
  }
  return match[1].trim();
}

function copyRuntime(javaHome) {
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  fs.mkdirSync(runtimeDir, { recursive: true });

  const runtimeEntries = ["bin", "conf", "legal", "lib", "release"];
  for (const entry of runtimeEntries) {
    const source = path.join(javaHome, entry);
    if (!fs.existsSync(source)) {
      continue;
    }
    const target = path.join(runtimeDir, entry);
    fs.cpSync(source, target, { recursive: true });
  }
}

function findBackendJar() {
  const targetDir = path.join(backendRoot, "api-server", "target");
  const candidates = fs.readdirSync(targetDir)
    .filter((name) => name.endsWith(".jar") && !name.endsWith(".original") && !name.endsWith("-sources.jar") && !name.endsWith("-javadoc.jar"))
    .map((name) => path.join(targetDir, name))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);

  if (candidates.length === 0) {
    throw new Error(`No packaged api-server jar found in ${targetDir}`);
  }
  return candidates[0];
}

function main() {
  fs.rmSync(bundleDir, { recursive: true, force: true });
  fs.mkdirSync(bundleDir, { recursive: true });

  if (process.env.TRIADFS_SKIP_BACKEND_PACKAGE !== "1") {
    run(resolveMavenCommand(), ["-q", "-pl", "api-server", "-am", "-DskipTests", "package"], { cwd: backendRoot });
  }
  const javaHome = resolveJavaHome();
  const backendJar = findBackendJar();

  fs.copyFileSync(backendJar, jarOutputPath);
  copyRuntime(javaHome);

  fs.writeFileSync(
    path.join(bundleDir, "manifest.json"),
    JSON.stringify(
      {
        preparedAt: new Date().toISOString(),
        backendJar: path.basename(jarOutputPath),
        javaHome: javaHome,
        platform: process.platform
      },
      null,
      2
    )
  );

  console.log(`Prepared desktop backend bundle in ${bundleDir}`);
}

main();
