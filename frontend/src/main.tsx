import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import process from "process";

import App from "./App";
import "./index.css";

// Vite 5 removed automatic Node globals; inject the ones polkadot/api uses.
if (!(globalThis as Record<string, unknown>).Buffer) {
  (globalThis as Record<string, unknown>).Buffer = Buffer;
}

if (!(globalThis as Record<string, unknown>).process) {
  (globalThis as Record<string, unknown>).process = process;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
