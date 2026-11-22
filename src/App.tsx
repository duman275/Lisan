import { useEffect, useRef, useState } from "react";
import { getJSON } from "./lib/api";
import { HealthContext, NavContext, NO_HEALTH, type Health, type Route, type Tab } from "./components/common";
import { Assistant } from "./components/Assistant";
import { registerNav } from "./lib/actions";
import { Learn } from "./components/Learn";
import { Library } from "./components/Library";
import { Analysis, Catalog, Summary } from "./components/Books";
import { SettingsView } from "./components/Settings";
import { Player } from "./components/Player";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "learn", label: "Öğren", icon: "🎓" },
  { id: "library", label: "Kütüphane", icon: "📚" },
  { id: "catalog", label: "Efsaneler", icon: "🏛️" },
  { id: "summary", label: "Özetler", icon: "🧾" },
  { id: "analysis", label: "Analiz", icon: "🔎" },
  { id: "settings", label: "Ayarlar", icon: "⚙️" },
];

function parseHash(): Route {
  const [tab, id] = location.hash.replace(/^#\/?/, "").split("/");
  const t = TABS.some((x) => x.id === tab) ? (tab as Tab) : "learn";
  if (t === "catalog" && id) return { tab: t, universe: id };
  return t === "library" && id ? { tab: t, readerId: decodeURIComponent(id) } : t === "learn" && id ? { tab: t, learnSub: id } : { tab: t };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [health, setHealth] = useState<Health>(NO_HEALTH);
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const check = () =>
      getJSON<Omit<Health, "checked">>("/api/health")
        .then((h) => setHealth({ ai: h.ai, llm: h.llm, free: h.free, agent: h.agent, checked: true }))
        .catch(() => setHealth({ ...NO_HEALTH, checked: true }));
    void check();
    window.addEventListener("lisan:health", check);
    const t = window.setInterval(check, 60_000); // Ollama sonradan açılırsa algıla
    const onHash = () => setRoute((r) => ({ ...parseHash(), prefill: r.prefill }));
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("lisan:health", check);
      window.clearInterval(t);
    };
  }, []);

  const go = (r: Route) => {
    setRoute(r);
    const hash = `#/${r.tab}${r.readerId ? `/${encodeURIComponent(r.readerId)}` : r.learnSub ? `/${r.learnSub}` : r.universe ? `/${r.universe}` : ""}`;
    if (location.hash !== hash) history.pushState(null, "", hash);
    window.scrollTo({ top: 0 });
  };

  registerNav(go, () => routeRef.current);

  return (
    <HealthContext.Provider value={health}>
      <NavContext.Provider value={{ route, go }}>
        <header className="top">
          <a className="brand" href="#/learn" onClick={(e) => (e.preventDefault(), go({ tab: "learn" }))}>
            <span className="logo">L</span> Lisan
          </a>
          <nav className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={route.tab === t.id ? "on" : ""} onClick={() => go({ tab: t.id })} aria-current={route.tab === t.id ? "page" : undefined}>
                <span aria-hidden>{t.icon}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </nav>
        </header>
        <main>
          {route.tab === "learn" && <Learn />}
          {route.tab === "library" && <Library />}
          {route.tab === "catalog" && <Catalog />}
          {route.tab === "summary" && <Summary />}
          {route.tab === "analysis" && <Analysis />}
          {route.tab === "settings" && <SettingsView />}
        </main>
        <Player />
        <Assistant />
      </NavContext.Provider>
    </HealthContext.Provider>
  );
}
