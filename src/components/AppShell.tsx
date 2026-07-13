import type { ReactNode } from "react";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { Avatar } from "./ui";
import { displayName } from "../lib/format";
import type { AdminUser, AdminView } from "../types";

const navItems: Array<{
  id: AdminView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "dashboard", label: "Resumen", icon: LayoutDashboard },
  { id: "reports", label: "Reportes", icon: ShieldAlert },
  { id: "posts", label: "Publicaciones", icon: FileText },
  { id: "users", label: "Usuarios", icon: UsersRound },
];

export default function AppShell({
  admin,
  view,
  children,
  onNavigate,
  onSignOut,
}: {
  admin: AdminUser;
  view: AdminView;
  children: ReactNode;
  onNavigate: (view: AdminView) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">m</span>
          <div>
            <strong>mur.</strong>
            <span>Administracion</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegacion principal">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "nav-item is-active" : "nav-item"}
              type="button"
              onClick={() => onNavigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-account">
          <Avatar
            src={admin.avatar_url}
            name={displayName(admin)}
            size="small"
          />
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

      <div className="mobile-bar">
        <div className="brand-lockup brand-lockup-mobile">
          <span className="brand-mark">m</span>
          <strong>mur. admin</strong>
        </div>
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

      <nav className="mobile-nav" aria-label="Navegacion principal">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={view === id ? "mobile-nav-item is-active" : "mobile-nav-item"}
            type="button"
            onClick={() => onNavigate(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="main-content">{children}</main>
    </div>
  );
}
