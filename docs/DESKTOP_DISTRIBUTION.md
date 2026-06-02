# Desktop Distribution

## Goal

TriadFS desktop releases should be shareable as a real application, not as a frontend that assumes the recipient will manually start Docker, PostgreSQL, and the backend API.

The chosen distribution model is:

- Electron desktop shell
- bundled Spring Boot backend fat jar
- bundled platform-native Java runtime
- local standalone database profile using H2

This is the correct tradeoff for desktop distribution because it avoids bundling PostgreSQL into a cross-platform desktop installer while still preserving the full backend service boundary.

## Runtime Model

When a packaged desktop build starts:

1. Electron main process checks whether a bundled backend exists.
2. If present, it launches the bundled Java runtime and Spring Boot jar locally.
3. The backend starts with the `desktop` Spring profile.
4. The desktop profile uses:
   - local H2 database files
   - local chunk storage directory
   - localhost-only binding
5. A desktop bootstrap user is created automatically.
6. The desktop frontend authenticates against the local backend and uses that token for API calls.

The target machine does not need:

- Docker
- PostgreSQL
- Java installed separately

## Why Not Bundle PostgreSQL

Bundling a full PostgreSQL service inside a cross-platform desktop installer is possible, but it is the wrong tradeoff for this project:

- larger installer
- more brittle process lifecycle
- more failure modes during upgrades
- more platform-specific packaging work

For desktop distribution, an embedded database profile is operationally better.

For development and server-like deployments, PostgreSQL remains the primary database.

## Build Requirements

Build each desktop platform on its native OS so the bundled Java runtime matches the release target:

- Windows build on Windows
- macOS build on macOS
- Linux build on Linux

This is required for reliable packaging and native artifact generation.

## Build Commands

From `frontend/`:

### Windows

```bash
npm install
npm run desktop:build
```

Outputs:

- `release/TriadFS Setup 0.1.0.exe`
- `release/TriadFS 0.1.0.exe`

### macOS

```bash
npm install
npm run desktop:build:mac
```

Typical outputs:

- `release/*.dmg`
- `release/*.zip`

### Linux

```bash
npm install
npm run desktop:build:linux
```

Typical outputs:

- `release/*.AppImage`
- `release/*.deb`

## Build Pipeline Details

The desktop build step performs these actions:

1. Build the frontend production bundle with Vite.
2. Package the backend Spring Boot jar with Maven.
3. Detect the local Java runtime on the build machine.
4. Copy that runtime into `frontend/build/backend-bundle/runtime`.
5. Copy the backend jar into `frontend/build/backend-bundle/api-server.jar`.
6. Include the backend bundle in the packaged Electron app as `resources/backend-bundle`.

This means each packaged artifact carries its own backend runtime stack.

## Development vs Packaged Behavior

### Development

`npm run desktop:dev`

- uses your normal development mode
- may talk to a Docker-backed or separately started backend
- is intended for iterative engineering

### Packaged Desktop

`desktop:build*` outputs

- starts its own bundled backend locally
- persists data inside the desktop app user-data path
- is the shareable distribution path

## Desktop Data Locations

At runtime, the standalone desktop app stores data in its user-data area, including:

- backend logs
- local H2 database files
- local chunk storage
- desktop bootstrap credentials

This keeps the packaged release self-contained from the user’s perspective while still preserving local state across launches.

## Operational Notes

- The standalone desktop database is intended for local use.
- Development and server deployments should continue to use PostgreSQL.
- Build and release validation still need to happen natively on each target OS.

This split is intentional:

- PostgreSQL for dev/server correctness
- H2 desktop profile for shareable desktop distribution
