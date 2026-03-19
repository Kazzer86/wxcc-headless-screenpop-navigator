# WxCC ScreenPop Navigator Widget

Headless Widget für Webex Contact Center (Agent Desktop).
Navigiert bei Anrufannahme automatisch zur Screen Pop Custom Page, sofern im WxCC Flow eine Screenpop-URL konfiguriert ist.

---

## Funktionsweise

Das Widget läuft unsichtbar im Hintergrund als **Headless Widget** im Agent Desktop. Es greift über das `@wxcc-desktop/sdk` auf das interne Eventsystem zu und lauscht auf das `eScreenPop`-Event des `Desktop.screenpop`-Moduls.

### Ablauf

```
Agent nimmt Anruf an
        │
        ▼
Desktop.screenpop feuert „eScreenPop"
        │
        ├─ Keine screenPopUrl in den Eventdaten?
        │   └─ LOG: „Es wurde keine Screenpop URL gefunden" → Stop
        │
        ├─ Screen Pop Tab nicht im DOM?
        │   └─ LOG: „Screenpop Tab ist nicht vorhanden" → Stop
        │
        └─ Alles OK → programmatischer Click auf den Screen Pop Tab
```

### Warum `eScreenPop` statt `eAgentContactAssigned`?

Das `eScreenPop`-Event feuert **nur dann**, wenn im WxCC Flow Designer eine Screenpop-URL für den Anruf konfiguriert wurde. Es enthält die URL direkt in den Eventdaten (`detail.data.screenPopUrl`). Damit ist die URL-Prüfung implizit durch den Event-Typ abgedeckt – kein separater Lookup in den Kontaktdaten nötig.

### Shadow DOM – warum rekursive Suche?

Der Screen Pop Tab-Button im Agent Desktop sitzt **3 Shadow-Root-Ebenen tief**:

```
document (reguläres DOM)
└─ md-tooltip[message="Screen Pop"]
   └─ #shadow-root
      └─ agentx-wc-navigation-item
         └─ #shadow-root
            └─ md-button[arialabel="Screen Pop"]
               └─ #shadow-root
                  └─ <button aria-label="Screen Pop">  ← Ziel
```

`document.querySelector()` durchsucht Shadow Roots nicht. Das Widget verwendet daher eine rekursive `deepQuery`-Funktion, die alle Shadow Roots traversiert. Der Klick wird via nativem `.click()` ausgelöst, um ein `isTrusted: true`-Event zu erzeugen – synthetische `MouseEvent`-Dispatches werden von WxCC ignoriert.

---

## Projektstruktur

```
wxcc-screenpop-navigator/
├── src/
│   └── screenpop-navigator.js   ← Widget-Source (bearbeiten)
├── dist/
│   └── screenpop-navigator.js   ← Webpack-Build-Output
├── server.js                    ← Lokaler Dev-Server (kein npm install nötig)
├── build.js                     ← Minimaler Build ohne externe Abhängigkeiten
├── webpack.config.js            ← Webpack-Konfiguration
└── package.json
```

---

## Entwicklung

### Abhängigkeiten installieren

```bash
npm install
```

### Build

```bash
npx webpack
# oder
npm run build
```

Das SDK (`@wxcc-desktop/sdk`) wird vom Webpack in die `dist/screenpop-navigator.js` gebundelt.
Die Build-Warnungen zur Dateigröße (~297 KiB) sind erwartetes Verhalten.

### Dev-Server starten

```bash
node server.js 8080
# oder
npm start
```

Der Server läuft auf `http://0.0.0.0:8080` und liefert die Datei aus `dist/` mit den nötigen CORS-Headern.
**Wichtig:** Im Layout JSON muss die Netzwerk-IP des Entwicklungsrechners verwendet werden – nicht `localhost` – da der Browser des Agenten die Datei direkt laden muss.

---

## Bereitstellung via jsDelivr (GitHub CDN)

Nach dem Push auf GitHub ist der Build-Output direkt über jsDelivr abrufbar.

**URL-Format:**
```
# Feste Version (empfohlen für Produktion):
https://cdn.jsdelivr.net/gh/{github-user}/{repo}@{tag}/dist/screenpop-navigator.js

# Beispiel mit Tag v1.0.0:
https://cdn.jsdelivr.net/gh/mein-org/wxcc-screenpop-navigator@1.0.0/dist/screenpop-navigator.js

# Latest main (nur für Entwicklung):
https://cdn.jsdelivr.net/gh/mein-org/wxcc-screenpop-navigator/dist/screenpop-navigator.js
```

> **Wichtig:** Die `dist/`-Datei muss im Repository committed sein – jsDelivr liest direkt aus GitHub, nicht aus npm. `node_modules/` ist via `.gitignore` ausgeschlossen, `dist/` bewusst nicht.

Ein GitHub Release mit Tag (z.B. `v1.0.0`) erstellen – dann über die versionierte URL einbinden. So bleibt der laufende Betrieb stabil, auch wenn später Änderungen gepusht werden.

---

## Desktop Layout JSON

### 1. Headless Widget eintragen

Das Widget wird im `headless`-Block des Desktop-Layouts registriert:

```json
"headless": {
  "id": "headless",
  "widgets": {
    "screenpop-nav": {
      "comp": "screenpop-navigator",
      "script": "http://192.168.x.x:8080/screenpop-navigator.js"
    }
  },
  "layout": {
    "areas": [["screenpop-nav"]],
    "size": { "cols": [1], "rows": [1] }
  }
}
```

### 2. Screen Pop Custom Page definieren

Das Widget navigiert zum Tab mit dem Label `"Screen Pop"`. Diese Custom Page muss im Layout vorhanden sein – das `agentx-wc-screen-pop`-Widget zeigt die vom Flow übergebene URL als iFrame an:

```json
{
  "nav": {
    "label": "Screen Pop",
    "icon": "pop-out",
    "iconType": "momentumDesign",
    "navigateTo": "screenpop",
    "align": "top"
  },
  "page": {
    "id": "agentx-wc-screen-pop",
    "widgets": {
      "comp1": {
        "comp": "agentx-wc-screen-pop",
        "properties": {
          "screenPopUrl": "$STORE.session.screenpop.screenPopSelector"
        }
      }
    },
    "layout": {
      "areas": [["comp1"]],
      "size": { "cols": [1], "rows": [1] }
    }
  }
}
```

---

## WxCC Flow Designer

Damit das Widget reagiert, muss im Flow eine Screenpop-URL konfiguriert sein.
Ohne URL feuert `eScreenPop` nicht – der Tab wird folglich nicht geöffnet.

**Schritte:**
1. Flow im Flow Designer öffnen
2. Eine `Screen Pop`-Aktivität hinzufügen
3. URL eintragen (statisch oder dynamisch via Flow-Variable)
4. Aktivität mit dem entsprechenden Event-Handler verbinden (z.B. nach `Contact Queued` oder `Agent Answered`)
5. Flow veröffentlichen

---

## Console Log Referenz

| Log | Bedeutung |
|---|---|
| `<screenpop-navigator> registriert` | Custom Element wurde im DOM registriert |
| `Bereit für Anrufe.` | SDK initialisiert, `eScreenPop`-Listener aktiv |
| `Screenpop URL: https://...` | Event empfangen, URL vorhanden |
| `Tab aktiviert: Screen Pop` | Button gefunden, Click ausgelöst |
| `Es wurde keine Screenpop URL gefunden` | `eScreenPop` gefeuert, aber `screenPopUrl` ist leer/null |
| `Screenpop Tab ist nicht vorhanden` | `button[aria-label="Screen Pop"]` nicht im DOM gefunden |
