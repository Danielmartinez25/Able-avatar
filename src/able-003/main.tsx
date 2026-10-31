import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ComparisonApp } from "./ComparisonApp";
import "../app/styles.css";
import "./comparison.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ComparisonApp />
  </StrictMode>,
);
