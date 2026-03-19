#!/usr/bin/env node

/**
 * Minimaler Build-Schritt ohne externe Abhängigkeiten.
 * Kopiert src/ → dist/ und entfernt Kommentare + überschüssige Whitespaces.
 *
 * Für echte Minification: npm install terser -D
 * und dann: npx terser src/screenpop-navigator.js -o dist/screenpop-navigator.js
 */

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "src", "screenpop-navigator.js");
const DIST_DIR = path.join(__dirname, "dist");
const DIST = path.join(DIST_DIR, "screenpop-navigator.js");

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

let code = fs.readFileSync(SRC, "utf8");

// Einzeilen-Kommentare entfernen (nicht in Strings)
code = code.replace(/\/\/.*$/gm, "");
// Mehrzeilen-Kommentare entfernen
code = code.replace(/\/\*[\s\S]*?\*\//g, "");
// Mehrfache Leerzeilen auf eine reduzieren
code = code.replace(/\n{3,}/g, "\n\n");
// Führende/abschließende Whitespaces pro Zeile
code = code.replace(/[ \t]+$/gm, "").trim();

fs.writeFileSync(DIST, code, "utf8");

const srcSize = fs.statSync(SRC).size;
const distSize = fs.statSync(DIST).size;
const reduction = (((srcSize - distSize) / srcSize) * 100).toFixed(1);

console.log(`Build OK:`);
console.log(`  src:  ${srcSize} Bytes`);
console.log(`  dist: ${distSize} Bytes  (-${reduction}%)`);
console.log(`  → ${DIST}`);
