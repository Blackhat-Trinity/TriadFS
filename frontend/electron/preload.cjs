const { contextBridge, ipcRenderer } = require("electron");

const apiBaseUrlArg = process.argv.find((entry) => entry.startsWith("--triadfs-api-base-url="));
const standaloneArg = process.argv.find((entry) => entry.startsWith("--triadfs-standalone="));
const backendApiBaseUrl = apiBaseUrlArg ? apiBaseUrlArg.split("=").slice(1).join("=") : null;
const backendStandalone = standaloneArg ? standaloneArg.endsWith("1") : false;

contextBridge.exposeInMainWorld("triadfsDesktop", {
  isDesktop: true,
  platform: process.platform,
  backend: {
    apiBaseUrl: backendApiBaseUrl,
    standalone: backendStandalone,
    getAccessToken: () => ipcRenderer.invoke("backend:get-access-token"),
    getLogPath: () => ipcRenderer.invoke("backend:get-log-path")
  },
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  },
  windowControls: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximizeToggle: () => ipcRenderer.send("window:maximize-toggle"),
    close: () => ipcRenderer.send("window:close"),
    newExplorerWindow: (targetPath) => ipcRenderer.invoke("window:new-explorer-window", targetPath)
  },
  fileSystem: {
    listRoots: () => ipcRenderer.invoke("fs:list-roots"),
    listDirectory: (targetPath) => ipcRenderer.invoke("fs:list-directory", targetPath),
    openPath: (targetPath) => ipcRenderer.invoke("fs:open-path", targetPath),
    createFolder: (parentPath, name) => ipcRenderer.invoke("fs:create-folder", parentPath, name),
    createFile: (parentPath, name) => ipcRenderer.invoke("fs:create-file", parentPath, name),
    renamePath: (targetPath, newName) => ipcRenderer.invoke("fs:rename-path", targetPath, newName),
    listTrash: () => ipcRenderer.invoke("fs:list-trash"),
    moveToTrash: (targetPath) => ipcRenderer.invoke("fs:move-to-trash", targetPath),
    restoreTrashPath: (trashedPath) => ipcRenderer.invoke("fs:restore-trash-path", trashedPath),
    deleteTrashedPath: (trashedPath) => ipcRenderer.invoke("fs:delete-trashed-path", trashedPath),
    deletePath: (targetPath) => ipcRenderer.invoke("fs:delete-path", targetPath),
    movePath: (sourcePath, destinationDirectory) => ipcRenderer.invoke("fs:move-path", sourcePath, destinationDirectory),
    copyPath: (sourcePath, destinationDirectory) => ipcRenderer.invoke("fs:copy-path", sourcePath, destinationDirectory),
    duplicatePath: (sourcePath) => ipcRenderer.invoke("fs:duplicate-path", sourcePath),
    copyText: (text) => ipcRenderer.invoke("fs:copy-text", text),
    revealPath: (targetPath) => ipcRenderer.invoke("fs:reveal-path", targetPath),
    getSpecialPaths: () => ipcRenderer.invoke("fs:get-special-paths"),
    getCapabilities: () => ipcRenderer.invoke("fs:get-capabilities"),
    pickDirectory: (defaultPath) => ipcRenderer.invoke("fs:pick-directory", defaultPath),
    watchPath: (targetPath) => ipcRenderer.invoke("fs:watch-path", targetPath),
    unwatchPath: (targetPath) => ipcRenderer.invoke("fs:unwatch-path", targetPath),
    openInTerminal: (targetPath) => ipcRenderer.invoke("fs:open-in-terminal", targetPath),
    openWithCode: (targetPath) => ipcRenderer.invoke("fs:open-with-code", targetPath),
    compressPaths: (targetPaths) => ipcRenderer.invoke("fs:compress-paths", targetPaths),
    createShortcut: (targetPath, destinationDirectory) => ipcRenderer.invoke("fs:create-shortcut", targetPath, destinationDirectory),
    getMetadata: (targetPath) => ipcRenderer.invoke("fs:get-metadata", targetPath),
    getPreview: (targetPath) => ipcRenderer.invoke("fs:get-preview", targetPath),
    onPathChanged: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("fs:path-changed", listener);
      return () => ipcRenderer.removeListener("fs:path-changed", listener);
    },
    onPathWatchError: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("fs:path-watch-error", listener);
      return () => ipcRenderer.removeListener("fs:path-watch-error", listener);
    }
  },
  explorer: {
    onOpenPathRequest: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("explorer:open-path", listener);
      return () => ipcRenderer.removeListener("explorer:open-path", listener);
    }
  }
});
