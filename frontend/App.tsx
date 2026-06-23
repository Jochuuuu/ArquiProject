import { useEffect, useState } from "react";
import HomePage from "./views/HomePage";
import IdePage from "./views/IdePage";

function getRoute() {
  return window.location.pathname === "/ide" ? "/ide" : "/";
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(getRoute);

  useEffect(() => {
    const syncRouteFromHistory = () => setCurrentRoute(getRoute());
    window.addEventListener("popstate", syncRouteFromHistory);
    return () => window.removeEventListener("popstate", syncRouteFromHistory);
  }, []);

  const navigateTo = (path: "/" | "/ide") => {
    window.history.pushState({}, "", path);
    setCurrentRoute(path);
  };

  return currentRoute === "/ide" ? (
    <IdePage />
  ) : (
    <HomePage onLaunchIde={() => navigateTo("/ide")} />
  );
}
