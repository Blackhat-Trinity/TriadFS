const { app, BrowserWindow, clipboard, dialog, ipcMain, shell } = require("electron");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createBackendRuntimeManager } = require("./backend-runtime.cjs");

const APP_ID = "com.triadfs.desktop";
const MAX_HASH_BYTES = 64 * 1024 * 1024;
const MAX_TEXT_PREVIEW_BYTES = 24 * 1024;

const fileWatchers = new Map();
const backendRuntimeManager = createBackendRuntimeManager({ app });

app.setAppUserModelId(APP_ID);

function resolveWindowIconPath() {
  const fileName = process.platform === "win32" ? "icon.ico" : "icon.png";
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "build", fileName);
  }
  return path.join(__dirname, "..", "build", fileName);
}

function commandExists(command) {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const probe = spawnSync(locator, [command], { encoding: "utf8", windowsHide: true });
  return probe.status === 0;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      ...options
    });

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

function resolveDirectoryPath(targetPath) {
  try {
    const stats = fsSync.statSync(targetPath);
    return stats.isDirectory() ? targetPath : path.dirname(targetPath);
  } catch {
    return path.dirname(targetPath);
  }
}

function spawnDetached(command, args, options = {}) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    ...options
  });
  child.unref();
}

function emitToWindow(window, channel, payload) {
  if (!window || window.isDestroyed()) {
    return;
  }
  window.webContents.send(channel, payload);
}

function runPowerShell(script, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        env: { ...process.env, ...env },
        windowsHide: true
      }
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `PowerShell exited with code ${code}`));
    });
  });
}

function resolveVsCodeExecutable() {
  if (process.platform === "darwin") {
    return fsSync.existsSync("/Applications/Visual Studio Code.app") || commandExists("code") ? "vscode-mac" : null;
  }

  if (process.platform === "linux") {
    if (commandExists("code")) {
      return "code";
    }
    if (commandExists("code-insiders")) {
      return "code-insiders";
    }
    return null;
  }

  const candidates = [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs", "Microsoft VS Code", "Code.exe") : null,
    process.env["PROGRAMFILES"] ? path.join(process.env["PROGRAMFILES"], "Microsoft VS Code", "Code.exe") : null,
    process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft VS Code", "Code.exe") : null
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  const probe = spawnSync("where.exe", ["code"], { encoding: "utf8", windowsHide: true });
  if (probe.status === 0) {
    const match = probe.stdout
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find(Boolean);
    if (match) {
      return match;
    }
  }

  return null;
}

function supportsWindowsTerminal() {
  return commandExists("wt.exe");
}

function resolveLinuxTerminalCommand() {
  const candidates = [
    { command: "x-terminal-emulator", args: (workingDirectory) => ["--working-directory", workingDirectory] },
    { command: "gnome-terminal", args: (workingDirectory) => [`--working-directory=${workingDirectory}`] },
    { command: "konsole", args: (workingDirectory) => ["--workdir", workingDirectory] },
    { command: "xfce4-terminal", args: (workingDirectory) => ["--working-directory", workingDirectory] },
    { command: "kitty", args: (workingDirectory) => ["--directory", workingDirectory] },
    { command: "wezterm", args: (workingDirectory) => ["start", "--cwd", workingDirectory] },
    { command: "alacritty", args: (workingDirectory) => ["--working-directory", workingDirectory] }
  ];

  return candidates.find((candidate) => commandExists(candidate.command)) ?? null;
}

function toPosixShellPath(targetPath) {
  return `'${String(targetPath).replace(/'/g, "'\\''")}'`;
}

function createWindowsShortcut(targetPath, shortcutPath, targetDirectory, isDirectory) {
  const script = [
    "$shell = New-Object -ComObject WScript.Shell",
    "$shortcut = $shell.CreateShortcut($env:TRIADFS_SHORTCUT_PATH)",
    "$shortcut.TargetPath = $env:TRIADFS_TARGET_PATH",
    `$shortcut.WorkingDirectory = "${isDirectory ? "$env:TRIADFS_TARGET_PATH" : "$env:TRIADFS_TARGET_DIR"}"`,
    "$shortcut.IconLocation = \"$env:TRIADFS_TARGET_PATH,0\"",
    "$shortcut.Save()"
  ].join("; ");

  return runPowerShell(script, {
    TRIADFS_SHORTCUT_PATH: shortcutPath,
    TRIADFS_TARGET_PATH: targetPath,
    TRIADFS_TARGET_DIR: targetDirectory
  });
}

async function createMacAlias(targetPath, shortcutPath) {
  const escapeAppleScript = (value) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  await runCommand("osascript", [
    "-e",
    'tell application "Finder"',
    "-e",
    `set targetItem to POSIX file "${escapeAppleScript(targetPath)}" as alias`,
    "-e",
    `make new alias file to targetItem at POSIX file "${escapeAppleScript(path.dirname(shortcutPath))}"`,
    "-e",
    "set aliasFile to result",
    "-e",
    `set name of aliasFile to "${escapeAppleScript(path.basename(shortcutPath))}"`,
    "-e",
    "end tell"
  ]);
}

function getSpecialPaths() {
  const safeGetPath = (name) => {
    try {
      return app.getPath(name);
    } catch {
      return null;
    }
  };

  return {
    home: safeGetPath("home"),
    desktop: safeGetPath("desktop"),
    documents: safeGetPath("documents"),
    downloads: safeGetPath("downloads")
  };
}

function inferMimeType(targetPath, isDirectory) {
  if (isDirectory) {
    return "inode/directory";
  }

  const extension = path.extname(targetPath).slice(1).toLowerCase();
  const byExtension = {
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    js: "text/javascript",
    jsx: "text/javascript",
    ts: "text/typescript",
    tsx: "text/typescript",
    java: "text/x-java-source",
    sql: "application/sql",
    csv: "text/csv",
    xml: "application/xml",
    yml: "application/yaml",
    yaml: "application/yaml",
    html: "text/html",
    css: "text/css",
    log: "text/plain",
    ini: "text/plain",
    properties: "text/plain",
    env: "text/plain",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    flac: "audio/flac",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    pdf: "application/pdf"
  };

  return byExtension[extension] ?? "application/octet-stream";
}

async function computeSha256(targetPath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fsSync.createReadStream(targetPath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function readTextPreview(targetPath) {
  const handle = await fs.open(targetPath, "r");
  try {
    const buffer = Buffer.alloc(MAX_TEXT_PREVIEW_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, MAX_TEXT_PREVIEW_BYTES, 0);
    const text = buffer
      .slice(0, bytesRead)
      .toString("utf8")
      .replace(/\u0000/g, "");

    return text.trim();
  } finally {
    await handle.close();
  }
}

function resolvePreviewKind(mimeType) {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "application/xml" || mimeType === "application/sql" || mimeType === "application/yaml") {
    return "text";
  }
  return "none";
}

function isTextPreviewable(targetPath) {
  const extension = path.extname(targetPath).slice(1).toLowerCase();
  return new Set([
    "txt",
    "md",
    "json",
    "js",
    "jsx",
    "ts",
    "tsx",
    "java",
    "sql",
    "csv",
    "xml",
    "yml",
    "yaml",
    "html",
    "css",
    "log",
    "ini",
    "properties",
    "env"
  ]).has(extension);
}

function isWindowsHidden(targetPath) {
  if (process.platform !== "win32") {
    return path.basename(targetPath).startsWith(".");
  }

  const probe = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "$item = Get-Item -LiteralPath $env:TRIADFS_TARGET; if ($item.Attributes -band [IO.FileAttributes]::Hidden) { 'true' } else { 'false' }"
    ],
    {
      encoding: "utf8",
      env: { ...process.env, TRIADFS_TARGET: targetPath },
      windowsHide: true
    }
  );

  if (probe.status !== 0) {
    return path.basename(targetPath).startsWith(".");
  }

  return probe.stdout.trim().toLowerCase() === "true";
}

function isWritable(targetPath) {
  try {
    fsSync.accessSync(targetPath, fsSync.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function buildPreview(targetPath, stats) {
  if (stats.isDirectory()) {
    return {
      kind: "none",
      fileUrl: null,
      textContent: null,
      truncated: false
    };
  }

  const mimeType = inferMimeType(targetPath, false);
  const previewKind = resolvePreviewKind(mimeType);

  if (previewKind === "text" && isTextPreviewable(targetPath)) {
    const textContent = await readTextPreview(targetPath);
    return {
      kind: "text",
      fileUrl: null,
      textContent,
      truncated: stats.size > MAX_TEXT_PREVIEW_BYTES
    };
  }

  if (previewKind === "image" || previewKind === "audio" || previewKind === "video" || previewKind === "pdf") {
    return {
      kind: previewKind,
      fileUrl: pathToFileURL(targetPath).href,
      textContent: null,
      truncated: false
    };
  }

  return {
    kind: "none",
    fileUrl: null,
    textContent: null,
    truncated: false
  };
}

function uniqueSiblingPath(targetPath) {
  if (!fsSync.existsSync(targetPath)) {
    return targetPath;
  }

  const directory = path.dirname(targetPath);
  const extension = path.extname(targetPath);
  const stem = path.basename(targetPath, extension);
  let counter = 2;
  let nextPath = targetPath;

  while (fsSync.existsSync(nextPath)) {
    nextPath = path.join(directory, `${stem} (${counter})${extension}`);
    counter += 1;
  }

  return nextPath;
}

function getTriadFsTrashPaths() {
  const baseDirectory = path.join(app.getPath("userData"), "recycle-bin");
  return {
    baseDirectory,
    manifestPath: path.join(baseDirectory, "index.json")
  };
}

async function ensureTriadFsTrashStore() {
  const { baseDirectory, manifestPath } = getTriadFsTrashPaths();
  await fs.mkdir(baseDirectory, { recursive: true });
  try {
    await fs.access(manifestPath);
  } catch {
    await fs.writeFile(manifestPath, "[]", "utf8");
  }
  return { baseDirectory, manifestPath };
}

async function readTriadFsTrashManifest() {
  const { manifestPath } = await ensureTriadFsTrashStore();
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeTriadFsTrashManifest(entries) {
  const { manifestPath } = await ensureTriadFsTrashStore();
  await fs.writeFile(manifestPath, JSON.stringify(entries, null, 2), "utf8");
}

async function movePathSafely(sourcePath, destinationPath) {
  try {
    await fs.rename(sourcePath, destinationPath);
    return destinationPath;
  } catch (error) {
    if (!error || error.code !== "EXDEV") {
      throw error;
    }
  }

  const stats = await fs.stat(sourcePath);
  if (stats.isDirectory()) {
    await fs.cp(sourcePath, destinationPath, { recursive: true, errorOnExist: true, force: false });
    await fs.rm(sourcePath, { recursive: true, force: true });
  } else {
    await fs.copyFile(sourcePath, destinationPath, fsSync.constants.COPYFILE_EXCL);
    await fs.rm(sourcePath, { force: true });
  }

  return destinationPath;
}

async function listTriadFsTrashEntries() {
  const manifest = await readTriadFsTrashManifest();
  const nextManifest = [];
  const entries = [];

  for (const entry of manifest) {
    if (!entry || !entry.trashedPath || !entry.originalPath) {
      continue;
    }

    try {
      const stats = await fs.stat(entry.trashedPath);
      const mapped = {
        trashedPath: entry.trashedPath,
        originalPath: entry.originalPath,
        name: path.basename(entry.originalPath),
        nodeType: stats.isDirectory() ? "FOLDER" : "FILE",
        sizeBytes: stats.isDirectory() ? 0 : stats.size,
        updatedAt: stats.mtime.toISOString(),
        deletedAt: entry.deletedAt ?? stats.mtime.toISOString()
      };
      nextManifest.push(mapped);
      entries.push(mapped);
    } catch {
      // drop stale entry
    }
  }

  await writeTriadFsTrashManifest(nextManifest);
  return entries.sort((left, right) => new Date(right.deletedAt).getTime() - new Date(left.deletedAt).getTime());
}

async function movePathToTriadFsTrash(targetPath) {
  const { baseDirectory } = await ensureTriadFsTrashStore();
  const destinationPath = uniqueSiblingPath(path.join(baseDirectory, path.basename(targetPath)));
  const deletedAt = new Date().toISOString();
  await movePathSafely(targetPath, destinationPath);

  const manifest = await readTriadFsTrashManifest();
  manifest.push({
    trashedPath: destinationPath,
    originalPath: targetPath,
    deletedAt
  });
  await writeTriadFsTrashManifest(manifest);
  return { trashedPath: destinationPath, originalPath: targetPath, deletedAt };
}

async function restorePathFromTriadFsTrash(trashedPath) {
  const manifest = await readTriadFsTrashManifest();
  const entry = manifest.find((candidate) => candidate.trashedPath === trashedPath);
  if (!entry) {
    throw new Error(`Trash entry not found for ${trashedPath}`);
  }

  const restoredPath = uniqueSiblingPath(entry.originalPath);
  await fs.mkdir(path.dirname(restoredPath), { recursive: true });
  await movePathSafely(trashedPath, restoredPath);
  await writeTriadFsTrashManifest(manifest.filter((candidate) => candidate.trashedPath !== trashedPath));
  return { path: restoredPath, originalPath: entry.originalPath };
}

async function deleteTriadFsTrashPath(trashedPath) {
  const manifest = await readTriadFsTrashManifest();
  try {
    await fs.rm(trashedPath, { recursive: true, force: true });
  } finally {
    await writeTriadFsTrashManifest(manifest.filter((candidate) => candidate.trashedPath !== trashedPath));
  }
  return { deleted: true };
}

async function collectFolderSummary(targetPath) {
  const summary = {
    folderCount: 0,
    fileCount: 0,
    totalSizeBytes: 0
  };

  const stack = [targetPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        summary.folderCount += 1;
        stack.push(entryPath);
        continue;
      }
      if (entry.isFile()) {
        summary.fileCount += 1;
        try {
          const stats = await fs.stat(entryPath);
          summary.totalSizeBytes += stats.size;
        } catch {
          // ignore unreadable files
        }
      }
    }
  }

  return summary;
}

async function duplicatePathToSibling(sourcePath) {
  const parentDirectory = path.dirname(sourcePath);
  const stats = await fs.stat(sourcePath);
  const parsed = path.parse(sourcePath);
  const duplicateBaseName = `${parsed.name} - Copy${parsed.ext}`;
  const duplicatePath = uniqueSiblingPath(path.join(parentDirectory, duplicateBaseName));

  if (stats.isDirectory()) {
    await fs.cp(sourcePath, duplicatePath, { recursive: true, errorOnExist: true, force: false });
  } else {
    await fs.copyFile(sourcePath, duplicatePath, fsSync.constants.COPYFILE_EXCL);
  }

  return duplicatePath;
}

function cleanupWatchersForWindow(webContentsId) {
  for (const [key, watcher] of fileWatchers.entries()) {
    if (watcher.webContentsId !== webContentsId) {
      continue;
    }
    try {
      watcher.handle.close();
    } catch {
      // ignore watcher cleanup errors
    }
    fileWatchers.delete(key);
  }
}

function createMainWindow(initialExplorerTarget = null) {
  const windowIconPath = resolveWindowIconPath();
  const useCustomTitlebar = process.platform !== "darwin";
  const backendBootstrap = backendRuntimeManager.getRendererBootstrapConfig();
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    autoHideMenuBar: true,
    backgroundColor: "#111111",
    icon: windowIconPath,
    frame: !useCustomTitlebar,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [
        `--triadfs-api-base-url=${backendBootstrap.apiBaseUrl ?? ""}`,
        `--triadfs-standalone=${backendBootstrap.standalone ? "1" : "0"}`
      ]
    }
  });
  const webContentsId = window.webContents.id;

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const devServerUrl = process.env.TRIADFS_ELECTRON_DEV_URL;
  if (devServerUrl) {
    window.loadURL(devServerUrl);
    if (process.env.TRIADFS_OPEN_DEVTOOLS === "1") {
      window.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  if (initialExplorerTarget) {
    window.webContents.once("did-finish-load", () => {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("explorer:open-path", initialExplorerTarget);
      }
    });
  }

  window.on("closed", () => {
    cleanupWatchersForWindow(webContentsId);
  });

  return window;
}

function createStartupFailureWindow(error) {
  const window = new BrowserWindow({
    width: 760,
    height: 520,
    autoHideMenuBar: true,
    backgroundColor: "#111111",
    icon: resolveWindowIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const logPath = backendRuntimeManager.getLogPath();
  const message = String(error?.message ?? error ?? "Unknown startup error")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const logs = String(logPath ?? "Not available")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  window.loadURL(`data:text/html,
    <html>
      <body style="margin:0;background:#0b0c0f;color:#f4f4f5;font-family:Segoe UI,system-ui,sans-serif;">
        <div style="padding:32px;max-width:680px;">
          <h1 style="margin:0 0 12px;font-size:26px;">TriadFS could not start local services</h1>
          <p style="color:#a1a1aa;line-height:1.6;">The desktop app failed before the UI could attach to its bundled backend.</p>
          <pre style="white-space:pre-wrap;background:#14161a;border:1px solid #262a31;border-radius:12px;padding:16px;color:#f4f4f5;">${message}</pre>
          <p style="margin-top:16px;color:#a1a1aa;">Backend log file:</p>
          <pre style="white-space:pre-wrap;background:#14161a;border:1px solid #262a31;border-radius:12px;padding:16px;color:#d4d4d8;">${logs}</pre>
        </div>
      </body>
    </html>`);

  return window;
}

let ipcRegistered = false;

function registerIpcHandlers() {
  if (ipcRegistered) {
    return;
  }
  ipcRegistered = true;

  ipcMain.on("window:minimize", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.minimize();
  });

  ipcMain.on("window:maximize-toggle", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return;
    }
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.on("window:close", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.close();
  });

  ipcMain.handle("window:new-explorer-window", async (_event, targetPath) => {
    createMainWindow(targetPath ?? null);
    return { opened: true };
  });

  ipcMain.handle("backend:get-access-token", async () => {
    return backendRuntimeManager.getAccessToken();
  });

  ipcMain.handle("backend:get-log-path", async () => {
    return backendRuntimeManager.getLogPath();
  });

  ipcMain.handle("fs:list-roots", async () => {
    const roots = [];
    const homePath = getSpecialPaths().home ?? os.homedir();
    if (homePath) {
      roots.push({
        name: "Home",
        path: homePath,
        nodeType: "FOLDER",
        sizeBytes: 0,
        updatedAt: new Date().toISOString()
      });
    }

    if (process.platform === "win32") {
      for (let code = 67; code <= 90; code += 1) {
        const letter = String.fromCharCode(code);
        const drivePath = `${letter}:\\`;
        if (fsSync.existsSync(drivePath)) {
          roots.push({
            name: `${letter}:`,
            path: drivePath,
            nodeType: "FOLDER",
            sizeBytes: 0,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } else {
      roots.push({
        name: "/",
        path: "/",
        nodeType: "FOLDER",
        sizeBytes: 0,
        updatedAt: new Date().toISOString()
      });
    }

    return roots;
  });

  ipcMain.handle("fs:get-special-paths", async () => getSpecialPaths());

  ipcMain.handle("fs:watch-path", async (event, targetPath) => {
    if (!targetPath) {
      throw new Error("No path supplied");
    }

    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      throw new Error("No active window");
    }

    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
      return { watching: false, path: targetPath };
    }

    const key = `${event.sender.id}:${targetPath}`;
    const existing = fileWatchers.get(key);
    if (existing) {
      return { watching: true, path: targetPath };
    }

    const watcher = fsSync.watch(
      targetPath,
      { persistent: false },
      (_eventType, filename) => {
        emitToWindow(window, "fs:path-changed", {
          path: targetPath,
          fileName: filename ?? null
        });
      }
    );

    watcher.on("error", () => {
      emitToWindow(window, "fs:path-watch-error", { path: targetPath });
      try {
        watcher.close();
      } catch {
        // ignore close errors
      }
      fileWatchers.delete(key);
    });

    fileWatchers.set(key, {
      webContentsId: event.sender.id,
      targetPath,
      handle: watcher
    });

    return { watching: true, path: targetPath };
  });

  ipcMain.handle("fs:unwatch-path", async (event, targetPath) => {
    const key = `${event.sender.id}:${targetPath}`;
    const watcher = fileWatchers.get(key);
    if (watcher) {
      try {
        watcher.handle.close();
      } catch {
        // ignore watcher cleanup errors
      }
      fileWatchers.delete(key);
    }
    return { watching: false, path: targetPath };
  });

  ipcMain.handle("fs:list-directory", async (_event, targetPath) => {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const mapped = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(targetPath, entry.name);
        try {
          const stats = await fs.stat(entryPath);
          return {
            name: entry.name,
            path: entryPath,
            nodeType: stats.isDirectory() ? "FOLDER" : "FILE",
            sizeBytes: stats.isDirectory() ? 0 : stats.size,
            updatedAt: stats.mtime.toISOString()
          };
        } catch {
          return null;
        }
      })
    );

    return mapped
      .filter((entry) => Boolean(entry))
      .sort((left, right) => {
        if (left.nodeType !== right.nodeType) {
          return left.nodeType === "FOLDER" ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });
  });

  ipcMain.handle("fs:open-path", async (_event, targetPath) => {
    const error = await shell.openPath(targetPath);
    return { ok: !error, error: error || null };
  });

  ipcMain.handle("fs:create-folder", async (_event, parentPath, name) => {
    const createdPath = path.join(parentPath, name);
    await fs.mkdir(createdPath, { recursive: false });
    return { path: createdPath };
  });

  ipcMain.handle("fs:create-file", async (_event, parentPath, name) => {
    const createdPath = path.join(parentPath, name);
    await fs.writeFile(createdPath, "", { flag: "wx" });
    return { path: createdPath };
  });

  ipcMain.handle("fs:rename-path", async (_event, targetPath, newName) => {
    const currentBaseName = path.basename(targetPath);
    if (newName === currentBaseName) {
      return { path: targetPath, unchanged: true };
    }

    const renamedPath = path.join(path.dirname(targetPath), newName);
    await fs.rename(targetPath, renamedPath);
    return { path: renamedPath };
  });

  ipcMain.handle("fs:list-trash", async () => {
    return listTriadFsTrashEntries();
  });

  ipcMain.handle("fs:move-to-trash", async (_event, targetPath) => {
    return movePathToTriadFsTrash(targetPath);
  });

  ipcMain.handle("fs:restore-trash-path", async (_event, trashedPath) => {
    return restorePathFromTriadFsTrash(trashedPath);
  });

  ipcMain.handle("fs:delete-trashed-path", async (_event, trashedPath) => {
    return deleteTriadFsTrashPath(trashedPath);
  });

  ipcMain.handle("fs:delete-path", async (_event, targetPath) => {
    try {
      await shell.trashItem(targetPath);
      return { deleted: true };
    } catch {
      await fs.rm(targetPath, { recursive: true, force: true });
      return { deleted: true };
    }
  });

  ipcMain.handle("fs:move-path", async (_event, sourcePath, destinationDirectory) => {
    const destinationPath = uniqueSiblingPath(path.join(destinationDirectory, path.basename(sourcePath)));
    await fs.rename(sourcePath, destinationPath);
    return { path: destinationPath };
  });

  ipcMain.handle("fs:copy-path", async (_event, sourcePath, destinationDirectory) => {
    const destinationPath = uniqueSiblingPath(path.join(destinationDirectory, path.basename(sourcePath)));
    await fs.cp(sourcePath, destinationPath, { recursive: true, errorOnExist: true, force: false });
    return { path: destinationPath };
  });

  ipcMain.handle("fs:duplicate-path", async (_event, sourcePath) => {
    const pathOut = await duplicatePathToSibling(sourcePath);
    return { path: pathOut };
  });

  ipcMain.handle("fs:copy-text", async (_event, text) => {
    clipboard.writeText(text);
    return { copied: true };
  });

  ipcMain.handle("fs:reveal-path", async (_event, targetPath) => {
    const directory = resolveDirectoryPath(targetPath);
    if (process.platform === "linux") {
      await shell.openPath(directory);
      return { revealed: true };
    }

    shell.showItemInFolder(targetPath);
    return { revealed: true };
  });

  ipcMain.handle("fs:get-capabilities", async () => {
    return {
      canOpenInTerminal:
        process.platform === "win32" ||
        process.platform === "darwin" ||
        Boolean(resolveLinuxTerminalCommand()),
      canOpenWithCode: Boolean(resolveVsCodeExecutable()),
      canCreateArchive: process.platform === "win32" || commandExists("zip"),
      canCreateShortcut: true,
      canPickDirectory: true
    };
  });

  ipcMain.handle("fs:pick-directory", async (_event, defaultPath) => {
    const result = await dialog.showOpenDialog({
      title: "Select destination folder",
      defaultPath: defaultPath || undefined,
      properties: ["openDirectory", "createDirectory"]
    });

    return { path: result.canceled ? null : result.filePaths[0] ?? null };
  });

  ipcMain.handle("fs:open-in-terminal", async (_event, targetPath) => {
    const workingDirectory = resolveDirectoryPath(targetPath);
    if (process.platform === "win32" && supportsWindowsTerminal()) {
      spawnDetached("wt.exe", ["-d", workingDirectory], { windowsHide: true });
      return { opened: true };
    }

    if (process.platform === "win32") {
      spawnDetached(
        "powershell.exe",
        ["-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location -LiteralPath $env:TRIADFS_TARGET"],
        { env: { ...process.env, TRIADFS_TARGET: workingDirectory }, windowsHide: false }
      );
      return { opened: true };
    }

    if (process.platform === "darwin") {
      await runCommand("osascript", [
        "-e",
        'tell application "Terminal"',
        "-e",
        "activate",
        "-e",
        `do script "cd ${toPosixShellPath(workingDirectory)}"`,
        "-e",
        "end tell"
      ]);
      return { opened: true };
    }

    const linuxTerminal = resolveLinuxTerminalCommand();
    if (linuxTerminal) {
      spawnDetached(linuxTerminal.command, linuxTerminal.args(workingDirectory), { cwd: workingDirectory });
      return { opened: true };
    }

    throw new Error("Terminal integration is not available on this platform");
  });

  ipcMain.handle("fs:open-with-code", async (_event, targetPath) => {
    const codeExecutable = resolveVsCodeExecutable();
    if (!codeExecutable) {
      throw new Error("Visual Studio Code was not found");
    }

    if (process.platform === "darwin") {
      await runCommand("open", ["-a", "Visual Studio Code", targetPath]);
      return { opened: true };
    }

    spawnDetached(codeExecutable, [targetPath], { windowsHide: true });
    return { opened: true };
  });

  ipcMain.handle("fs:compress-paths", async (_event, targetPaths) => {
    if (!Array.isArray(targetPaths) || targetPaths.length === 0) {
      throw new Error("No paths supplied for compression");
    }

    const normalized = targetPaths.map((entry) => path.resolve(entry));
    const firstPath = normalized[0];
    const destinationDirectory = path.dirname(firstPath);
    const seedName =
      normalized.length === 1
        ? `${path.parse(firstPath).name}.zip`
        : `TriadFS Archive ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.zip`;
    const destinationPath = uniqueSiblingPath(path.join(destinationDirectory, seedName));

    if (process.platform === "win32") {
      const script = [
        "$paths = ConvertFrom-Json $env:TRIADFS_PATHS_JSON",
        "Compress-Archive -LiteralPath $paths -DestinationPath $env:TRIADFS_ARCHIVE_DEST -CompressionLevel Optimal"
      ].join("; ");

      await runPowerShell(script, {
        TRIADFS_PATHS_JSON: JSON.stringify(normalized),
        TRIADFS_ARCHIVE_DEST: destinationPath
      });
    } else {
      const relativeTargets = normalized.map((entry) => path.basename(entry));
      await runCommand("zip", ["-r", destinationPath, ...relativeTargets], { cwd: destinationDirectory });
    }

    return { path: destinationPath };
  });

  ipcMain.handle("fs:create-shortcut", async (_event, targetPath, destinationDirectory) => {
    const shortcutDirectory = destinationDirectory || resolveDirectoryPath(targetPath);
    const targetStats = await fs.stat(targetPath);
    const parsedTarget = path.parse(targetPath);
    const shortcutStem =
      process.platform === "win32"
        ? `${parsedTarget.name} - Shortcut.lnk`
        : `${parsedTarget.name} - Shortcut${parsedTarget.ext}`;
    const shortcutPath = uniqueSiblingPath(path.join(shortcutDirectory, shortcutStem));

    if (process.platform === "win32") {
      await createWindowsShortcut(targetPath, shortcutPath, resolveDirectoryPath(targetPath), targetStats.isDirectory());
    } else if (process.platform === "darwin") {
      await createMacAlias(targetPath, shortcutPath);
    } else {
      await fs.symlink(targetPath, shortcutPath, targetStats.isDirectory() ? "dir" : "file");
    }

    return { path: shortcutPath };
  });

  ipcMain.handle("fs:get-metadata", async (_event, targetPath) => {
    const stats = await fs.stat(targetPath);
    const linkStats = await fs.lstat(targetPath);
    const isDirectory = stats.isDirectory();
    const summary = isDirectory ? await collectFolderSummary(targetPath) : null;
    const mimeType = inferMimeType(targetPath, isDirectory);
    const sha256 = !isDirectory && stats.size <= MAX_HASH_BYTES ? await computeSha256(targetPath) : null;

    return {
      name: path.basename(targetPath),
      path: targetPath,
      parentPath: path.dirname(targetPath),
      kind: isDirectory ? "FOLDER" : "FILE",
      extension: isDirectory ? "" : path.extname(targetPath).slice(1).toLowerCase(),
      mimeType,
      sizeBytes: isDirectory ? summary.totalSizeBytes : stats.size,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      accessedAt: stats.atime.toISOString(),
      hidden: isWindowsHidden(targetPath),
      writable: isWritable(targetPath),
      symlink: linkStats.isSymbolicLink(),
      sha256,
      folderCount: summary?.folderCount ?? 0,
      fileCount: summary?.fileCount ?? 0,
      itemCount: summary ? summary.folderCount + summary.fileCount : 1
    };
  });

  ipcMain.handle("fs:get-preview", async (_event, targetPath) => {
    const stats = await fs.stat(targetPath);
    return buildPreview(targetPath, stats);
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  try {
    await backendRuntimeManager.start();
    createMainWindow();
  } catch (error) {
    createStartupFailureWindow(error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  void backendRuntimeManager.stop();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
