import { useState, type ReactNode } from "react";
import {
  Activity,
  ChevronRight,
  FileText,
  Globe2,
  LoaderCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
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
  { id: "dashboard", label: "Resumen", description: "Pulso y patrones", icon: Activity },
  { id: "map", label: "Mapa global", description: "Actividad geolocalizada", icon: Globe2 },
  { id: "publish", label: "Publicar", description: "Crear contenido", icon: Send },
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
  signingOut,
  onToggleTheme,
}: {
  admin: AdminUser;
  view: AdminView;
  theme: Theme;
  children: ReactNode;
  onNavigate: (view: AdminView) => void;
  onSignOut: () => void;
  signingOut: boolean;
  onToggleTheme: () => void;
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("mur-admin-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const toggleSidebar = () => {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    try {
      window.localStorage.setItem("mur-admin-sidebar-collapsed", String(nextCollapsed));
    } catch {
      // Keep the preference for this session when storage is unavailable.
    }
  };
  const activeItem = navItems.find((item) => item.id === view) ?? navItems[0];

  return (
    <div className={collapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar" id="admin-sidebar">
        <div className="sidebar-heading">
        <div className="brand-lockup">
          <BrandMark />
          <div>
            <strong>mur.</strong>
            <span>Administración</span>
          </div>
        </div>
        <button
          className="icon-button sidebar-toggle"
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-controls="admin-sidebar"
          aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
          title={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        </div>

        <div className="workspace-chip">
          <span className="status-orb" />
          <div><strong>Espacio de trabajo</strong><span>Equipo de Mur</span></div>
          <ShieldCheck size={15} />
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {[
            { label: "Explorar", items: navItems.slice(0, 2) },
            { label: "Gestionar", items: navItems.slice(2) },
          ].map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-section-label">{group.label}</span>
              {group.items.map(({ id, label, description, icon: Icon }) => (
                <button
                  key={id}
                  className={view === id ? "nav-item is-active" : "nav-item"}
                  type="button"
                  aria-label={label}
                  title={collapsed ? label : undefined}
                  aria-current={view === id ? "page" : undefined}
                  onClick={() => onNavigate(id)}
                >
                  <span className="nav-icon"><Icon size={18} /></span>
                  <span><strong>{label}</strong><small>{description}</small></span>
                  <ChevronRight className="nav-arrow" size={15} />
                </button>
              ))}
            </div>
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
            disabled={signingOut}
            onClick={onSignOut}
          >
            {signingOut ? <LoaderCircle className="spin" size={17} /> : <LogOut size={17} />}
          </button>
        </div>
      </aside>

      <div className="workspace-shell">
        <header className="workspace-bar">
          <div className="workspace-breadcrumb">
            <span>Administración</span>
            <ChevronRight size={14} />
            <strong>{activeItem.label}</strong>
          </div>
          <div className="workspace-status">
            <span className="live-indicator"><ShieldCheck size={14} /> Acceso autorizado</span>
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
            disabled={signingOut}
            onClick={onSignOut}
          >
            {signingOut ? <LoaderCircle className="spin" size={18} /> : <LogOut size={18} />}
          </button>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Navegación principal">
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
