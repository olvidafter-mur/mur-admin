import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { getInitials } from "../lib/format";
import type { Theme } from "../types";

export const BrandMark = ({ large = false }: { large?: boolean }) => (
  <span className={large ? "brand-mark brand-mark-large" : "brand-mark"} aria-hidden="true">
    <img src="/mur-icon.png" alt="" />
  </span>
);

export const Avatar = ({
  src,
  name,
  size = "medium",
}: {
  src?: string | null;
  name?: string | null;
  size?: "small" | "medium" | "large";
}) => (
  <span className={`avatar avatar-${size}`} aria-hidden="true">
    {src ? <img src={src} alt="" /> : getInitials(name)}
  </span>
);

export const Badge = ({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}) => <span className={`badge badge-${tone}`}>{children}</span>;

export const ThemeToggle = ({
  theme,
  onToggle,
  showLabel = true,
}: {
  theme: Theme;
  onToggle: () => void;
  showLabel?: boolean;
}) => {
  const nextTheme = theme === "light" ? "oscuro" : "claro";
  return (
    <button
      className={showLabel ? "theme-toggle" : "theme-toggle theme-toggle-compact"}
      type="button"
      title={`Activar modo ${nextTheme}`}
      aria-label={`Activar modo ${nextTheme}`}
      onClick={onToggle}
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      {showLabel ? <span>{theme === "light" ? "Oscuro" : "Claro"}</span> : null}
    </button>
  );
};

export const PageHeader = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <header className="page-header">
    <div>
      {eyebrow ? <span className="page-eyebrow">{eyebrow}</span> : null}
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {action ? <div className="page-header-action">{action}</div> : null}
  </header>
);

export const LoadingState = ({ label = "Cargando datos" }: { label?: string }) => (
  <div className="state-panel" role="status">
    <LoaderCircle className="spin" size={22} />
    <span>{label}</span>
  </div>
);

export const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="state-panel state-panel-empty">
    <Inbox size={24} />
    <strong>{title}</strong>
    <span>{description}</span>
  </div>
);

export const ErrorState = ({ message }: { message: string }) => (
  <div className="inline-alert inline-alert-danger" role="alert">
    <AlertCircle size={18} />
    <span>{message}</span>
  </div>
);

export const Pagination = ({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <footer className="pagination">
      <span>
        {start}-{end} de {total}
      </span>
      <div className="pagination-actions">
        <button
          className="icon-button"
          type="button"
          title="Pagina anterior"
          aria-label="Pagina anterior"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="page-count">
          {page} / {totalPages}
        </span>
        <button
          className="icon-button"
          type="button"
          title="Pagina siguiente"
          aria-label="Pagina siguiente"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </footer>
  );
};
export const Modal = ({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) => {
  const modalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      modalRef.current
        ?.querySelector<HTMLElement>(
          '[autofocus], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
        )
        ?.focus();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description ? <p id="modal-description">{description}</p> : null}
          </div>
          <button
            className="icon-button"
            type="button"
            title="Cerrar"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
};
