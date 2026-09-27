import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { LegalPage } from "./LegalPage.jsx";
import "./styles.css";

const page = window.location.pathname === "/terms.html"
  ? <LegalPage type="terms" />
  : window.location.pathname === "/privacy.html"
    ? <LegalPage type="privacy" />
    : <App />;

createRoot(document.getElementById("root")).render(<StrictMode>{page}</StrictMode>);
