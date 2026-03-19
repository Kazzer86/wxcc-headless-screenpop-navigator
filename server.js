#!/usr/bin/env node

/**
 * Lokaler Dev-Server für WxCC Widget Development.
 *
 * Stellt die JS-Datei mit den nötigen CORS-Headern bereit,
 * damit der Agent Desktop (desktop.wxcc-*.cisco.com) sie laden kann.
 *
 * Usage: node server.js [port]
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.argv[2] || "8080", 10);
const DIST_DIR = path.join(__dirname, "dist");
const SRC_DIR = path.join(__dirname, "src");

const MIME_TYPES = {
  ".js": "application/javascript",
  ".json": "application/json",
  ".html": "text/html",
  ".css": "text/css",
};

const server = http.createServer((req, res) => {
  // CORS – Agent Desktop läuft auf *.cisco.com / *.webex.com
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  const urlPath = req.url.split("?")[0];
  const filename = urlPath === "/" ? "/screenpop-navigator.js" : urlPath;
  const ext = path.extname(filename);

  // Erst in dist/ suchen, dann in src/ (für Dev ohne Build-Step)
  let filePath = path.join(DIST_DIR, filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(SRC_DIR, filename);
  }

  // Path traversal verhindern
  const resolvedBase = path.resolve(__dirname);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedBase)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath)) {
    console.log(`[404] ${req.url}`);
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`Not found: ${filename}`);
    return;
  }

  const mimeType = MIME_TYPES[ext] || "text/plain";
  res.writeHead(200, { "Content-Type": mimeType });
  fs.createReadStream(filePath).pipe(res);

  console.log(`[200] ${req.url}  →  ${filePath}`);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("=".repeat(55));
  console.log("  WxCC ScreenPop Navigator – Dev Server");
  console.log("=".repeat(55));
  console.log(`  Lokal:     http://localhost:${PORT}/screenpop-navigator.js`);
  console.log(`  Netzwerk:  http://<deine-IP>:${PORT}/screenpop-navigator.js`);
  console.log("=".repeat(55));
  console.log("");
  console.log("  Im Layout JSON eintragen:");
  console.log(`  "script": "http://<deine-IP>:${PORT}/screenpop-navigator.js"`);
  console.log("");
  console.log("  Dateien werden aus folgenden Verzeichnissen geliefert:");
  console.log(`  dist/  →  ${DIST_DIR}`);
  console.log(`  src/   →  ${SRC_DIR}  (Fallback)`);
  console.log("");
  console.log("  Strg+C zum Beenden");
  console.log("");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} ist bereits belegt. Versuche: node server.js ${PORT + 1}`);
  } else {
    console.error("Server-Fehler:", err.message);
  }
  process.exit(1);
});
