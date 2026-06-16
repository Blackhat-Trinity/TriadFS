import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import App from "./app/App";
import { queryClient } from "./lib/queryClient";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" forcedTheme="dark" defaultTheme="dark" enableSystem={false} storageKey="triadfs-theme">
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
