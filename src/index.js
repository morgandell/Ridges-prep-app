import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { COLORS } from "./constants/colors"; // import your colors

// Function to inject CSS variables into :root
function applyColors() {
  const root = document.documentElement;
  Object.entries(COLORS).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}

// Apply colors before rendering the app
applyColors();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);