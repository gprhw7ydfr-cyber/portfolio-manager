import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import "./index.css";
import App from "./App";

// Offline support / installability for the browser build. The Tauri desktop shell already
// bundles everything locally, so a service worker there would only add a stale-cache risk.
if (!("__TAURI_INTERNALS__" in window)) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
