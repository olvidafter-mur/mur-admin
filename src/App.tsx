import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AlertTriangle, CheckCircle2, LoaderCircle, LockKeyhole, Settings2 } from "lucide-react";
import AppShell from "./components/AppShell";
import { BrandMark } from "./components/ui";
import { getAdminMe } from "./lib/adminApi";
import { isSupabaseConfigured, requireSupabase, supabase } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import type { AdminUser, AdminView, Theme } from "./types";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const PostsPage = lazy(() => import("./pages/PostsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));

const validViews: AdminView[] = ["dashboard", "map", "reports", "posts", "users"];

const getViewFromHash = (): AdminView => {
  const hash = window.location.hash.replace("#", "") as AdminView;
  return validViews.includes(hash) ? hash : "dashboard";
};

const getInitialTheme = (): Theme => {
  try {
    return window.localStorage.getItem("mur-admin-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

function FullPageLoader() {
  return (
    <main className="full-page-state" role="status">
      <BrandMark large />
      <span className="loader-bar" />
      <p>Validando acceso</p>
    </main>
  );
}

function ViewLoader() {
  return (
    <div className="state-panel view-loader" role="status">
      <LoaderCircle className="spin" size={20} />
      <span>Preparando vista</span>
    </div>
  );
}

function ConfigurationRequired() {
  return (
    <main className="full-page-state full-page-message">
      <span className="state-icon state-icon-warning"><Settings2 size={26} /></span>
      <h1>Falta configurar Supabase</h1>
      <p>
        Crea <code>.env.local</code> a partir de <code>.env.example</code> y agrega la URL y la clave publica del proyecto.
      </p>
    </main>
  );
}

function AccessDenied({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main className="full-page-state full-page-message">
      <span className="state-icon state-icon-danger"><LockKeyhole size={26} /></span>
      <h1>Cuenta sin acceso administrativo</h1>
      <p>La sesion es valida, pero esta cuenta no figura entre los administradores de Mur.</p>
      <button className="button button-secondary" type="button" onClick={onSignOut}>Cerrar sesion</button>
    </main>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [view, setView] = useState<AdminView>(getViewFromHash);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);
  const sessionUserId = session?.user.id ?? null;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#f7f8f9" : "#1d2125");
    try {
      window.localStorage.setItem("mur-admin-theme", theme);
    } catch {
      // The selected theme still applies for the current session.
    }
  }, [theme]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionUserId) {
      setAdmin(null);
      setAccessDenied(false);
      setAdminLoading(false);
      return;
    }

    let active = true;
    setAdminLoading(true);
    setAccessDenied(false);

    void getAdminMe()
      .then((profile) => {
        if (active) setAdmin(profile);
      })
      .catch(() => {
        if (active) {
          setAdmin(null);
          setAccessDenied(true);
        }
      })
      .finally(() => {
        if (active) setAdminLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionUserId]);

  useEffect(() => {
    const handleHashChange = () => setView(getViewFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const navigate = (nextView: AdminView) => {
    const updateView = () => {
      window.location.hash = nextView;
      setView(nextView);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };

    if (!reducedMotion && transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(updateView);
    } else {
      updateView();
    }
  };

  const signOut = useCallback(() => {
    void requireSupabase().auth.signOut();
  }, []);

  const notify = useCallback((message: string, tone: "success" | "danger" = "success") => {
    setToast({ message, tone });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => current === "light" ? "dark" : "light");
  }, []);

  if (!isSupabaseConfigured) return <ConfigurationRequired />;
  if (authLoading || adminLoading) return <FullPageLoader />;
  if (!session) return <LoginPage theme={theme} onToggleTheme={toggleTheme} />;
  if (accessDenied || !admin) return <AccessDenied onSignOut={signOut} />;

  return (
    <>
      <a className="skip-link" href="#main-content">Ir al contenido principal</a>
      <AppShell
        admin={admin}
        view={view}
        theme={theme}
        onNavigate={navigate}
        onSignOut={signOut}
        onToggleTheme={toggleTheme}
      >
        <Suspense fallback={<ViewLoader />}>
          {view === "dashboard" ? <DashboardPage theme={theme} onNavigate={navigate} /> : null}
          {view === "map" ? <MapPage theme={theme} onNavigate={navigate} /> : null}
          {view === "reports" ? <ReportsPage notify={notify} /> : null}
          {view === "posts" ? <PostsPage notify={notify} /> : null}
          {view === "users" ? <UsersPage notify={notify} /> : null}
        </Suspense>
      </AppShell>

      {toast ? (
        <div className={`toast toast-${toast.tone}`} role="status">
          {toast.tone === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      ) : null}
    </>
  );
}
