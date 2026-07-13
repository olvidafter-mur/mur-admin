import type { ReactNode } from "react";
import {
  Activity,
  ChevronRight,
  FileText,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Avatar, BrandMark, ThemeToggle } from "./ui";
import { displayName } from "../lib/format";
import type { AdminUser, AdminView, Theme } from "../types";

const navItems: Array<{
  id: AdminView;
  label: string;
  description: string;
  icon: typeof Activity;
}> = [
  { id: "dashboard", label: "Inteligencia", description: "Pulso y patrones", icon: Activity },
  { id: "reports", label: "Reportes", description: "Cola de decisiones", icon: ShieldAlert },
  { id: "posts", label: "Publicaciones", description: "Contenido y estado", icon: FileText },
  { id: "users", label: "Usuarios", description: "Perfiles y acceso", icon: UsersRound },
];

export default function AppShell({
  admin,
  view,
  theme,
  children,
  onNavigate,
  onSignOut,
  onToggleTheme,
}: {
  admin: AdminUser;
  view: AdminView;
  theme: Theme;
  children: ReactNode;
  onNavigate: (view: AdminView) => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
}) {
  const activeItem = navItems.find((item) => item.id === view) ?? navItems[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <BrandMark />
          <div>
            <strong>mur.</strong>
            <span>Operations</span>
          </div>
        </div>

        <div className="workspace-chip">
          <span className="status-orb" />
          <div><strong>Produccion</strong><span>Supabase conectado</span></div>
          <ShieldCheck size={15} />
        </div>

        <nav className="sidebar-nav" aria-label="Navegacion principal">
          <span className="nav-section-label">Workspace</span>
          {navItems.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "nav-item is-active" : "nav-item"}
              type="button"
              aria-current={view === id ? "page" : undefined}
              onClick={() => onNavigate(id)}
            >
              <span className="nav-icon"><Icon size={18} /></span>
              <span><strong>{label}</strong><small>{description}</small></span>
              <ChevronRight className="nav-arrow" size={15} />
            </button>
          ))}
        </nav>

        <div className="sidebar-account">
          <Avatar src={admin.avatar_url} name={displayName(admin)} size="small" />
          <div className="account-copy">
            <strong>{displayName(admin)}</strong>
            <span>{admin.email}</span>
          </div>
          <button
            className="icon-button icon-button-dark"
            type="button"
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
            onClick={onSignOut}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="workspace-shell">
        <header className="workspace-bar">
          <div className="workspace-breadcrumb">
            <span>Mur operations</span>
            <ChevronRight size={14} />
            <strong>{activeItem.label}</strong>
          </div>
          <div className="workspace-status">
            <span className="live-indicator"><i /> Online</span>
            <span className="workspace-divider" />
            <span>Acceso administrador</span>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </header>

        <main className="main-content" id="main-content">{children}</main>
      </div>

      <div className="mobile-bar">
        <div className="brand-lockup brand-lockup-mobile">
          <BrandMark />
          <div><strong>mur.</strong><span>{activeItem.label}</span></div>
        </div>
        <div className="mobile-bar-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} showLabel={false} />
          <button
            className="icon-button"
            type="button"
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
            onClick={onSignOut}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Navegacion principal">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={view === id ? "mobile-nav-item is-active" : "mobile-nav-item"}
            type="button"
            aria-current={view === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
