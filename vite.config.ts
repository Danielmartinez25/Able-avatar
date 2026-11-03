import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: { main: "index.html", comparison: "compare.html", totem: "totem.html", totem2: "totem2.html" },
    },
  },
});
