# ReqLite

High-performance API testing desktop app built with Tauri 2.0 and SolidJS. A lightweight, fast alternative to Postman with real-time team sync via a self-hosted server.

## Features

### Core
- **HTTP Client** — Send GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS requests with full control over headers, query params, body, and auth
- **Multi-Tab Interface** — Work on multiple requests simultaneously with tab state management
- **Collection Tree** — Organize requests into nested folders with drag-friendly sort ordering
- **Environment Variables** — Define variables per environment and use `{{variable}}` syntax in URLs, headers, and body content
- **Request History** — Auto-saved execution log with search and filtering

### Request Body Types
- **JSON** — Syntax-highlighted JSON editor
- **Raw** — Plain text, HTML, XML with content-type selector
- **Form URL-Encoded** — Key-value pairs
- **Multipart Form Data** — Text fields and file uploads
- **GraphQL** — Query and variables editors
- **Binary** — File upload

### Authentication
- **Bearer Token**
- **Basic Auth** (username/password)
- **API Key** (header or query param)

### Response Viewer
- **Auto-formatted JSON** with word wrap toggle
- **Response Headers** table
- **Timing Chart** — Visual breakdown of DNS, connection, TLS, TTFB, and download phases
- **Status, duration, and size** at a glance

### Advanced
- **cURL Import** — Paste a cURL command to populate a request (Ctrl+I)
- **OpenAPI Import** — Import an OpenAPI 3.0 spec to generate a full collection tree
- **Code Generation** — Export any request as cURL, Python (requests), or JavaScript (fetch)
- **Pre/Post-Request Scripts** — JavaScript scripting via sandboxed Boa engine with `pm.*` API (Postman-compatible)
- **WebSocket Client** — Connect, send/receive messages, real-time message stream via Tauri events

### Team Sync
- **Self-hosted sync server** — Single Rust binary or Docker container
- **Event sourcing** — Full operation history with monotonic revisions
- **Delta sync** — Only sends changes since last known revision on reconnect
- **Field-level conflict detection** — Auto-merges non-overlapping edits, rejects overlapping ones with explicit conflict UX
- **JWT + team key auth** — Simple authentication, no OAuth required

### Performance
- ~10MB binary (Tauri + rustls, no runtime deps)
- SQLite with WAL mode for <5ms startup and concurrent reads
- reqwest connection pool with keep-alive
- SolidJS fine-grained reactivity (no virtual DOM diffing)
- Boa JS engine pool for zero cold-start scripting
- Virtualized lists for large response bodies and history

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri 2.0 (Rust) |
| Frontend | SolidJS + Vite |
| Styling | Plain CSS + CSS custom properties |
| Local database | SQLite (rusqlite, bundled, WAL mode) |
| HTTP client | reqwest (rustls-tls) |
| JS scripting | Boa engine (Rust-native, sandboxed) |
| Sync server | Axum + SQLite |
| Sync protocol | WebSocket + event sourcing |

---

## Prerequisites

### Rust
```bash
# Linux/macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows — download installer from https://rustup.rs
```

### Node.js (v18+)
Download from [nodejs.org](https://nodejs.org) or install via nvm.

### Tauri System Dependencies

**Windows:** Microsoft Visual Studio C++ Build Tools + WebView2 (pre-installed on Windows 11).

**macOS:** Xcode Command Line Tools:
```bash
xcode-select --install
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

---

## Quick Start

```bash
cd reqlite

# Install frontend dependencies
npm install

# Run in development mode (hot-reload)
npm run tauri dev
```

This launches the Vite dev server for the frontend and compiles/runs the Tauri Rust backend. The app window opens automatically.

---

## Building for Production

```bash
npm run tauri build
```

Outputs:
- **Binary:** `src-tauri/target/release/reqlite` (or `reqlite.exe` on Windows)
- **Installer:** `.msi` (Windows), `.dmg` (macOS), `.deb`/`.AppImage` (Linux) in `src-tauri/target/release/bundle/`

---

## Sync Server

The sync server enables real-time collaboration between team members. It's optional — the app works fully offline without it.

### Option A: Run Directly

```bash
# Build
cargo build --release -p reqlite-sync-server

# Run
JWT_SECRET=your-secret-here ./target/release/reqlite-sync-server
```

Server starts on `http://localhost:3000`.

### Option B: Docker

```bash
cd sync-server
export JWT_SECRET=your-secret-here
docker compose up -d
```

### Configuration

All config is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `3000` | Listen port |
| `DATABASE_PATH` | `reqlite-sync.db` | SQLite file location |
| `JWT_SECRET` | `reqlite-dev-secret-change-me` | **Change in production** |
| `TEAM_KEY` | *(none)* | Optional shared team key for auth |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/workspaces` | List workspaces |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces/{id}/snapshot` | Get workspace snapshot |
| GET | `/ws` | WebSocket sync endpoint |

### Connecting the App

1. Open ReqLite
2. Go to Settings
3. Enter sync server URL (e.g. `http://localhost:3000`)
4. Register or login with username/password
5. Edits sync in real-time across all connected clients

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New request tab |
| `Ctrl+Enter` | Send request |
| `Ctrl+S` | Save request |
| `Ctrl+I` | Import cURL |

---

## Project Structure

```
reqlite/
├── Cargo.toml                    # Workspace root
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
│
├── shared/                       # Shared Rust types (client + server)
│   └── src/
│       ├── models.rs             # Data model structs
│       ├── protocol.rs           # Sync message types
│       └── version.rs            # Vector clock / revision tracking
│
├── src-tauri/                    # Tauri Rust backend
│   ├── tauri.conf.json           # Tauri app configuration
│   └── src/
│       ├── main.rs               # Entry point
│       ├── lib.rs                # Plugin + command registration
│       ├── state.rs              # AppState (DB, HTTP client, WS, scripting)
│       ├── db/                   # SQLite migrations and CRUD
│       ├── commands/             # Tauri IPC command handlers
│       │   ├── collections.rs    # Workspace, collection, request CRUD
│       │   ├── http.rs           # HTTP execution with timing
│       │   ├── environments.rs   # Environment CRUD
│       │   ├── history.rs        # Request history
│       │   ├── import.rs         # cURL and OpenAPI import
│       │   ├── codegen.rs        # Code generation
│       │   ├── scripting.rs      # JavaScript script execution
│       │   ├── websocket.rs      # WebSocket connections
│       │   └── sync.rs           # Sync server connection
│       ├── http/                 # reqwest client utilities
│       ├── websocket/            # WebSocket connection manager
│       ├── scripting/            # Boa JS engine with pm.* API
│       ├── import/               # cURL parser, OpenAPI importer
│       ├── codegen/              # cURL, Python, JS code generators
│       └── sync_client/          # Sync server WebSocket client
│
├── src/                          # SolidJS frontend
│   ├── index.html                # HTML entry with CSS variables
│   ├── index.tsx                 # Render entry point
│   ├── App.tsx                   # Root component
│   ├── styles.css                # All component styles
│   ├── lib/
│   │   └── api.ts                # Typed Tauri invoke wrappers
│   ├── stores/
│   │   ├── collections.ts        # Collection tree state
│   │   ├── request.ts            # Tab and request state
│   │   ├── environments.ts       # Environment state
│   │   └── history.ts            # History state
│   ├── components/
│   │   ├── layout/               # Sidebar, TabBar, StatusBar
│   │   ├── request/              # UrlBar, RequestPanel, BodyEditor, AuthEditor
│   │   ├── response/             # ResponsePanel (body, headers, timing)
│   │   ├── environments/         # EnvManager
│   │   ├── import/               # CurlImport dialog
│   │   └── shared/               # KeyValueGrid, VirtualList, ContextMenu
│   └── pages/
│       ├── MainWorkspace.tsx      # Main app layout
│       └── Settings.tsx           # Settings page
│
└── sync-server/                  # Self-hosted sync server
    ├── Dockerfile
    ├── docker-compose.yml
    └── src/
        ├── main.rs               # Axum server entry
        ├── config.rs             # Environment config
        ├── db/                   # SQLite pool, migrations, queries
        ├── auth/                 # JWT + argon2 password auth
        ├── api/                  # REST endpoints
        └── sync/                 # WebSocket handler, SyncManager,
                                  #   conflict detection, broadcaster
```

---

## Database Schema

SQLite with WAL mode. All IDs are ULIDs.

**Client tables:** `workspaces`, `collections` (nested via `parent_id`), `requests` (headers/params/body as JSON), `environments` (variables as JSON array), `history` (append-only), `websocket_connections`, `sync_log`, `sync_cursors`

**Server tables:** `users`, `workspaces`, `workspace_members`, `operations` (event sourcing log with `revision INTEGER PRIMARY KEY AUTOINCREMENT`), `snapshots`

---

## Sync Protocol

1. Client connects via WebSocket, authenticates with JWT
2. Client sends `Subscribe` with `workspace_id` and `last_revision`
3. Server sends `Delta` with all operations since that revision
4. On local edit: client writes optimistically, sends operation to server
5. Server assigns monotonic revision, stores in operation log, broadcasts to all other clients
6. **Conflict resolution:** Field-level — if two clients edit the same entity, server checks field overlap. No overlap = auto-merge. Overlap = reject with conflict, client fetches latest and retries.

---

## License

MIT
