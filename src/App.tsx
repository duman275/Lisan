import { useEffect, useState } from "react";
import { getJSON } from "./lib/api";
import { HealthContext, NavContext, type Route, type Tab } from "./components/common";
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
  return t === "library" && id ? { tab: t, readerId: decodeURIComponent(id) } : t === "learn" && id ? { tab: t, learnSub: id } : { tab: t };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [health, setHealth] = useState({ ai: false, checked: false });

  useEffect(() => {
    getJSON<{ ai: boolean }>("/api/health")
      .then((h) => setHealth({ ai: h.ai, checked: true }))
      .catch(() => setHealth({ ai: false, checked: true }));
    const onHash = () => setRoute((r) => ({ ...parseHash(), prefill: r.prefill }));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (r: Route) => {
    setRoute(r);
    const hash = `#/${r.tab}${r.readerId ? `/${encodeURIComponent(r.readerId)}` : r.learnSub ? `/${r.learnSub}` : ""}`;
    if (location.hash !== hash) history.pushState(null, "", hash);
    window.scrollTo({ top: 0 });
  };

  return (
    <HealthContext.Provider value={health}>
      <NavContext.Provider value={{ route, go }}>
        <header className="top">
          <a className="brand" href="#/learn" onClick={(e) => (e.preventDefault(), go({ tab: "learn" }))}>
            <span className="logo">ل</span> Lisan
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
      </NavContext.Provider>
    </HealthContext.Provider>
  );
}
