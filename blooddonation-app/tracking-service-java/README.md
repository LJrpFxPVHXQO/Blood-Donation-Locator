# Java live tracking service

This is the live blood center tracking backend for the React app. It replaces the
previous Express/SQLite tracking endpoints with a small Java 8 service that has no
third-party dependencies.

## Requirements

- A JDK 8 or newer to compile the service (`javac`).
- A Java 8 or newer runtime to run it (`java`).

The service can run on a JRE alone when `build/classes` already contains a build.

## Run it

From the `blooddonation-app` directory:

```bash
npm run tracking
```

The launcher (`scripts/run-tracking.js`) compiles the Java sources when a JDK is
available and starts the service. To build and run manually:

```bash
javac -encoding UTF-8 -source 1.8 -target 1.8 -d build/classes $(find src/main/java -name '*.java')
java -cp build/classes com.blooddonation.tracking.TrackingServer
```

On Windows, use `Get-ChildItem -Recurse -Filter *.java` to collect the source files
or run `npm run tracking` from the app directory.

The service listens on `http://127.0.0.1:3002` by default. Vite proxies the tracking
routes to that port during development.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/blood-centers?city=Manila` | List centers, optionally filtered by city |
| `GET` | `/api/blood-centers/{id}/inventory` | Get a center and its stock per blood type |
| `POST` | `/api/blood-centers` | Create a center with empty stock for all blood types |
| `PUT` | `/api/blood-inventory` | Create or update stock for one blood type |
| `GET` | `/api/health` | Health check |

The request/response shapes match the previous Express endpoints, so the React
locator (`src/views/locator.jsx` and `src/services/bloodCenterService.js`) does not
need a different data contract.

## Data

Tracking data is stored as JSON in `tracking-service-java/data/blood-centers.json`.
On first start the service seeds the same sample NCR blood centers that the old
SQLite seed script used. Inventory changes are written back to this file, so they
survive restarts.

Configuration environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRACKING_HOST` | `127.0.0.1` | Bind address |
| `TRACKING_PORT` | `3002` | HTTP port |
| `TRACKING_DATA_FILE` | `data/blood-centers.json` | JSON data file (relative to the service directory) |
| `JAVA_COMMAND` | `java` | Java executable used by the npm launcher |
| `JAVAC_COMMAND` | `javac` | Compiler used by the npm launcher |
