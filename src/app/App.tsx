import { useEffect, useState } from "react";
import { DemoPage } from "../demo/DemoPage";
import { LandingPage } from "../landing/LandingPage";

function usePathname() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function App() {
  const path = usePathname();
  return path.startsWith("/demo") ? <DemoPage /> : <LandingPage />;
}
