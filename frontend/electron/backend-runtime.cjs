const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

function createBackendRuntimeManager({ app }) {
  let backendProcess = null;
  let backendStartedByApp = false;
  let backendAccessToken = null;
  let backendTokenExpiresAt = 0;
  let runtimeConfig = null;

  function getBundleDir() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "backend-bundle");
    }
    return path.join(__dirname, "..", "build", "backend-bundle");
  }

  function getRuntimeDirectories() {
    const baseDir = path.join(app.getPath("userData"), "runtime");
    return {
      baseDir,
      configDir: path.join(baseDir, "config"),
      dataDir: path.join(baseDir, "data"),
      logsDir: path.join(baseDir, "logs"),
      chunksDir: path.join(baseDir, "data", "chunks"),
      dbPath: path.join(baseDir, "data", "triadfs-desktop-db"),
      logPath: path.join(baseDir, "logs", "triadfs-api.log"),
      credentialsPath: path.join(baseDir, "config", "desktop-credentials.json")
    };
  }

  async function ensureRuntimeDirectories() {
    const dirs = getRuntimeDirectories();
    await Promise.all([
      fsp.mkdir(dirs.configDir, { recursive: true }),
      fsp.mkdir(dirs.dataDir, { recursive: true }),
      fsp.mkdir(dirs.logsDir, { recursive: true }),
      fsp.mkdir(dirs.chunksDir, { recursive: true })
    ]);
    return dirs;
  }

  async function loadOrCreateCredentials() {
    const dirs = await ensureRuntimeDirectories();
    try {
      const raw = await fsp.readFile(dirs.credentialsPath, "utf8");
      return JSON.parse(raw);
    } catch {
      const credentials = {
        email: "desktop@local.triadfs",
        displayName: `${app.getName()} Desktop`,
        password: crypto.randomBytes(24).toString("base64url"),
        jwtSecretBase64: crypto.randomBytes(64).toString("base64")
      };
      await fsp.writeFile(dirs.credentialsPath, JSON.stringify(credentials, null, 2), "utf8");
      return credentials;
    }
  }

  function resolveJavaExecutable(bundleDir) {
    const bundled = path.join(bundleDir, "runtime", "bin", process.platform === "win32" ? "java.exe" : "java");
    if (fs.existsSync(bundled)) {
      return bundled;
    }
    return "java";
  }

  function decodeJwtExpiry(token) {
    try {
      const payload = token.split(".")[1];
      if (!payload) {
        return 0;
      }
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      return typeof decoded.exp === "number" ? decoded.exp * 1000 : 0;
    } catch {
      return 0;
    }
  }

  async function isHealthy(healthUrl) {
    try {
      const response = await fetch(healthUrl);
      if (!response.ok) {
        return false;
      }
      const payload = await response.json();
      return payload?.status === "UP";
    } catch {
      return false;
    }
  }

  async function waitForHealth(healthUrl, timeoutMs = 45000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await isHealthy(healthUrl)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
    throw new Error(`Timed out waiting for backend health at ${healthUrl}`);
  }

  async function appendBackendLog(message) {
    if (!runtimeConfig?.logPath) {
      return;
    }
    await fsp.appendFile(runtimeConfig.logPath, message, "utf8");
  }

  async function authenticate(force = false) {
    if (!runtimeConfig) {
      return null;
    }
    if (!force && backendAccessToken && backendTokenExpiresAt > Date.now() + 30_000) {
      return backendAccessToken;
    }

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: runtimeConfig.credentials.email,
        password: runtimeConfig.credentials.password
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Desktop backend login failed: ${response.status} ${text}`);
    }

    const payload = await response.json();
    backendAccessToken = payload?.data?.accessToken ?? null;
    backendTokenExpiresAt = backendAccessToken ? decodeJwtExpiry(backendAccessToken) : 0;
    return backendAccessToken;
  }

  async function authenticateWithRetry(timeoutMs = 30000) {
    const startedAt = Date.now();
    let lastError = null;
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const token = await authenticate(true);
        if (token) {
          return token;
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    throw lastError ?? new Error("Timed out waiting for desktop authentication");
  }

  async function start() {
    const externalApiBaseUrl = process.env.TRIADFS_EXTERNAL_API_BASE_URL?.trim();
    if (externalApiBaseUrl) {
      runtimeConfig = {
        mode: "external",
        apiBaseUrl: externalApiBaseUrl.replace(/\/$/, ""),
        standalone: false,
        logPath: null,
        credentials: null
      };
      return runtimeConfig;
    }

    const bundleDir = getBundleDir();
    const backendJarPath = path.join(bundleDir, "api-server.jar");
    if (!fs.existsSync(backendJarPath)) {
      runtimeConfig = {
        mode: "external",
        apiBaseUrl: process.env.TRIADFS_API_BASE_URL?.trim() || "http://localhost:8080/api/v1",
        standalone: false,
        logPath: null,
        credentials: null
      };
      return runtimeConfig;
    }

    const dirs = await ensureRuntimeDirectories();
    const credentials = await loadOrCreateCredentials();
    const apiPort = Number(process.env.TRIADFS_DESKTOP_API_PORT || 38180);
    const apiBaseUrl = `http://127.0.0.1:${apiPort}/api/v1`;
    const healthUrl = `http://127.0.0.1:${apiPort}/actuator/health`;

    runtimeConfig = {
      mode: "standalone",
      standalone: true,
      apiBaseUrl,
      healthUrl,
      logPath: dirs.logPath,
      credentials
    };

    if (!(await isHealthy(healthUrl))) {
      const javaExecutable = resolveJavaExecutable(bundleDir);
      const env = {
        ...process.env,
        SPRING_PROFILES_ACTIVE: "desktop",
        TRIADFS_API_PORT: String(apiPort),
        TRIADFS_DESKTOP_DB_PATH: dirs.dbPath,
        TRIADFS_STORAGE_DIR: dirs.chunksDir,
        TRIADFS_LOG_FILE: dirs.logPath,
        TRIADFS_DESKTOP_BOOTSTRAP_ENABLED: "true",
        TRIADFS_DESKTOP_BOOTSTRAP_EMAIL: credentials.email,
        TRIADFS_DESKTOP_BOOTSTRAP_PASSWORD: credentials.password,
        TRIADFS_DESKTOP_BOOTSTRAP_DISPLAY_NAME: credentials.displayName,
        TRIADFS_AUTH_JWT_SECRET_BASE64: credentials.jwtSecretBase64
      };

      backendProcess = spawn(javaExecutable, ["-jar", backendJarPath], {
        env,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
      backendStartedByApp = true;

      backendProcess.stdout?.on("data", (chunk) => {
        void appendBackendLog(chunk.toString());
      });
      backendProcess.stderr?.on("data", (chunk) => {
        void appendBackendLog(chunk.toString());
      });
      backendProcess.on("exit", (code) => {
        backendProcess = null;
        backendAccessToken = null;
        backendTokenExpiresAt = 0;
        void appendBackendLog(`Backend exited with code ${code ?? "unknown"}${process.platform === "win32" ? "\r\n" : "\n"}`);
      });

      await waitForHealth(healthUrl);
    }

    await authenticateWithRetry();
    return runtimeConfig;
  }

  async function stop() {
    if (!backendStartedByApp || !backendProcess || backendProcess.killed) {
      return;
    }
    const signal = process.platform === "win32" ? "SIGTERM" : "SIGTERM";
    backendProcess.kill(signal);
    backendProcess = null;
    backendStartedByApp = false;
  }

  function getRendererBootstrapConfig() {
    return {
      apiBaseUrl: runtimeConfig?.apiBaseUrl ?? null,
      standalone: Boolean(runtimeConfig?.standalone)
    };
  }

  async function getAccessToken() {
    return authenticate(false);
  }

  function getLogPath() {
    return runtimeConfig?.logPath ?? null;
  }

  return {
    start,
    stop,
    getAccessToken,
    getRendererBootstrapConfig,
    getLogPath
  };
}

module.exports = {
  createBackendRuntimeManager
};
