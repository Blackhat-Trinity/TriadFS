# Frontend

TriadFS frontend is a React + TypeScript desktop client with a file-explorer-first experience and integrated transfer analytics.

## Stack

- React + Vite + Electron
- TypeScript
- Tailwind CSS
- Radix + shadcn-style component architecture
- Recharts
- React Query + Axios

## Run As Windows Desktop App (Recommended)

```bash
npm install
npm run desktop:dev
```

This starts:
- Vite dev server
- Electron shell that opens the TriadFS desktop window
- Auto port fallback (starts at `5173`, uses next free port if busy)

## Explorer Highlights

- Explorer-style navigation pane, command bar, breadcrumbs, details pane
- Multi-select, range-select, drag/drop move
- Context menu actions (open/rename/copy/cut/delete/favorite)
- Keyboard shortcuts: `Ctrl+C/X/V`, `Ctrl+A`, `Ctrl+F`, `Ctrl+N`, `F2`, `Delete`, `Alt+Left/Right`, `F5`
- Recycle bin + restore workflow
- Backend-powered search suggestions + file version history + version download

If PowerShell blocks `npm` scripts, run commands through CMD:

```bash
cmd /c npm run desktop:dev
```

## Build Windows App (.exe)

```bash
npm run desktop:build
```

Output is written to `frontend/release/TriadFS-win32-x64/` and can be launched via `TriadFS.exe`.

## Build Windows Installer (Optional)

```bash
npm run desktop:installer
```

If installer generation fails with symlink permission errors, enable Windows Developer Mode or run terminal as Administrator.

## Web Preview (Optional)

```bash
npm run dev
```
