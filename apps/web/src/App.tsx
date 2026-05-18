import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { PublicTracking } from "./pages/PublicTracking";
import { getToken } from "./api";
import { useEffect } from "react";

export function App() {
  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem("tracking_theme") === "dark" ? "dark" : "classic";
  }, []);

  const path = window.location.pathname;

  if (path.startsWith("/t/")) {
    return <PublicTracking publicToken={path.split("/").filter(Boolean)[1]} />;
  }

  if (path === "/login") {
    return <Login />;
  }

  if (path === "/dashboard" && getToken()) {
    return <Dashboard />;
  }

  window.history.replaceState(null, "", getToken() ? "/dashboard" : "/login");
  return getToken() ? <Dashboard /> : <Login />;
}
