import { Desktop } from "@wxcc-desktop/sdk";

const TAG = "[ScreenPopNavigator]";
const ELEMENT_NAME = "screenpop-navigator";

class ScreenPopNavigator extends HTMLElement {
  constructor() {
    super();
    this._onScreenPop = this._onScreenPop.bind(this);
    this._initialized = false;
  }

  async connectedCallback() {
    await this._initSDK();
  }

  async _initSDK() {
    try {
      await Desktop.config.init();
    } catch (e) {
      // Läuft im Headless-Modus ohne Widget-Kontext – ignorierbar
    }

    Desktop.screenpop.addEventListener("eScreenPop", this._onScreenPop);

    this._initialized = true;
    console.log(TAG, "Bereit für Anrufe.");
  }

  disconnectedCallback() {
    if (this._initialized) {
      try {
        Desktop.screenpop.removeEventListener("eScreenPop", this._onScreenPop);
      } catch (e) {}
    }
  }

  _onScreenPop(detail) {
    const url = detail?.data?.screenPopUrl;
    if (!url) {
      console.warn(TAG, "Es wurde keine Screenpop URL gefunden");
      return;
    }
    console.log(TAG, "Screenpop URL:", url);
    this._navigate();
  }

  _findNavButton() {
    // Der Ziel-Button sitzt 3 Shadow-Roots tief – rekursive Suche erforderlich
    function deepQuery(selector, root) {
      const el = root.querySelector(selector);
      if (el) return el;
      for (const node of root.querySelectorAll("*")) {
        if (node.shadowRoot) {
          const found = deepQuery(selector, node.shadowRoot);
          if (found) return found;
        }
      }
      return null;
    }
    return deepQuery('button[aria-label="Screen Pop"]', document);
  }

  _navigate() {
    const btn = this._findNavButton();
    if (!btn) {
      console.warn(TAG, "Screenpop Tab ist nicht vorhanden");
      return;
    }
    console.log(TAG, "Tab aktiviert: Screen Pop");
    btn.click();
  }
}

if (!customElements.get(ELEMENT_NAME)) {
  customElements.define(ELEMENT_NAME, ScreenPopNavigator);
  console.log(TAG, `<${ELEMENT_NAME}> registriert`);
} else {
  console.warn(TAG, `<${ELEMENT_NAME}> bereits registriert`);
}
