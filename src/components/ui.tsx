import { useEffect, type ReactNode } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  X,
} from "lucide-react";
import { getInitials } from "../lib/format";

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

export const PageHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <header className="page-header">
    <div>
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
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description ? <p>{description}</p> : null}
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
    </div>
  );
};
