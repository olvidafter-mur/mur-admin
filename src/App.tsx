import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AlertTriangle, CheckCircle2, LockKeyhole, Settings2 } from "lucide-react";
import AppShell from "./components/AppShell";
import { getAdminMe } from "./lib/adminApi";
import { isSupabaseConfigured, requireSupabase, supabase } from "./lib/supabase";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PostsPage from "./pages/PostsPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import type { AdminUser, AdminView } from "./types";

const validViews: AdminView[] = ["dashboard", "reports", "posts", "users"];

const getViewFromHash = (): AdminView => {
  const hash = window.location.hash.replace("#", "") as AdminView;
  return validViews.includes(hash) ? hash : "dashboard";
};

function FullPageLoader() {
  return (
    <main className="full-page-state" role="status">
      <span className="brand-mark brand-mark-large">m</span>
      <span className="loader-bar" />
      <p>Validando acceso</p>
    </main>
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
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [view, setView] = useState<AdminView>(getViewFromHash);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

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
    if (!session) {
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
  }, [session]);

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
    window.location.hash = nextView;
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const signOut = useCallback(() => {
    void requireSupabase().auth.signOut();
  }, []);

  const notify = useCallback((message: string, tone: "success" | "danger" = "success") => {
    setToast({ message, tone });
  }, []);

  if (!isSupabaseConfigured) return <ConfigurationRequired />;
  if (authLoading || adminLoading) return <FullPageLoader />;
  if (!session) return <LoginPage />;
  if (accessDenied || !admin) return <AccessDenied onSignOut={signOut} />;

  return (
    <>
      <AppShell admin={admin} view={view} onNavigate={navigate} onSignOut={signOut}>
        {view === "dashboard" ? <DashboardPage onNavigate={navigate} /> : null}
        {view === "reports" ? <ReportsPage notify={notify} /> : null}
        {view === "posts" ? <PostsPage notify={notify} /> : null}
        {view === "users" ? <UsersPage notify={notify} /> : null}
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
