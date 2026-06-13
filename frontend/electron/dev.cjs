const fs = require("node:fs");
const { spawn } = require("node:child_process");
const path = require("node:path");

async function startDesktopDev() {
  const { createServer } = await import("vite");

  const viteServer = await createServer({
    configFile: path.resolve(__dirname, "..", "vite.config.ts"),
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: false,
      watch: {
        ignored: [
          "**/release/**",
          "**/dist/**",
          "**/build/**",
          "**/.git/**"
        ]
      }
    }
  });

  await viteServer.listen();

  const localUrl = viteServer.resolvedUrls?.local?.[0] ?? "http://127.0.0.1:5173/";
  const devUrl = localUrl.endsWith("/") ? localUrl.slice(0, -1) : localUrl;
  const electronBinary = require("electron");

  let electronProcess = null;
  let restarting = false;
  let shuttingDown = false;
  let restartTimer = null;

  const launchElectron = () => {
    const electronEnv = { ...process.env, TRIADFS_ELECTRON_DEV_URL: devUrl };
    delete electronEnv.ELECTRON_RUN_AS_NODE;

    electronProcess = spawn(electronBinary, ["."], {
      stdio: "inherit",
      env: electronEnv
    });

    electronProcess.on("exit", async (code) => {
      if (shuttingDown) {
        return;
      }
      if (restarting) {
        restarting = false;
        launchElectron();
        return;
      }
      await shutdown(code ?? 0);
    });
  };

  const restartElectron = () => {
    if (!electronProcess || electronProcess.killed) {
      launchElectron();
      return;
    }
    restarting = true;
    electronProcess.kill("SIGTERM");
  };

  const shutdown = async (code = 0) => {
    shuttingDown = true;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    fileWatcher?.close();
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill("SIGTERM");
    }
    await viteServer.close();
    process.exit(code);
  };

  const electronDir = path.resolve(__dirname);
  const fileWatcher = fs.watch(
    electronDir,
    { recursive: true },
    (_eventType, filename) => {
      if (!filename || !filename.endsWith(".cjs")) {
        return;
      }
      if (restartTimer) {
        clearTimeout(restartTimer);
      }
      restartTimer = setTimeout(() => {
        restartElectron();
      }, 150);
    }
  );

  launchElectron();

  process.on("SIGINT", async () => {
    await shutdown(0);
  });

  process.on("SIGTERM", async () => {
    await shutdown(0);
  });
}

startDesktopDev().catch((error) => {
  console.error("Failed to start desktop dev mode:", error);
  process.exit(1);
});
