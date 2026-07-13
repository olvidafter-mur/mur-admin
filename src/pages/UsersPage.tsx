import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Ban,
  CheckCircle2,
  LoaderCircle,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { listUsers, setUserStatus } from "../lib/adminApi";
import { displayName, formatDate, formatNumber } from "../lib/format";
import type { PaginatedResult, UserRow } from "../types";
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
} from "../components/ui";

const PAGE_SIZE = 25;

export default function UsersPage({
  notify,
}: {
  notify: (message: string, tone?: "success" | "danger") => void;
}) {
  const [result, setResult] = useState<PaginatedResult<UserRow> | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await listUsers({
          search,
          status,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  const closeModal = () => {
    if (saving) return;
    setTarget(null);
    setReason("");
  };

  const handleStatusChange = async () => {
    if (!target) return;
    const nextStatus = target.account_status === "active" ? "suspended" : "active";
    if (nextStatus === "suspended" && !reason.trim()) return;

    setSaving(true);
    try {
      await setUserStatus(target.id, nextStatus, reason.trim());
      notify(nextStatus === "suspended" ? "Usuario suspendido." : "Usuario reactivado.");
      closeModal();
      await load();
    } catch (saveError) {
      notify(saveError instanceof Error ? saveError.message : "No se pudo actualizar el usuario.", "danger");
    } finally {
      setSaving(false);
      setTarget(null);
      setReason("");
    }
  };

  return (
    <div className="page">
      <PageHeader title="Usuarios" description="Perfiles, actividad y estado de acceso." />

      <form className="toolbar" onSubmit={handleSearch}>
        <label className="search-control">
          <Search size={18} />
          <input
            type="search"
            value={draftSearch}
            placeholder="Buscar por nombre, usuario o correo"
            onChange={(event) => setDraftSearch(event.target.value)}
          />
        </label>
        <label className="select-control">
          <span className="sr-only">Filtrar por estado</span>
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </label>
        <button className="button button-secondary" type="submit">
          <Search size={17} /><span>Buscar</span>
        </button>
      </form>

      {error ? <ErrorState message={error} /> : null}
      {loading && !result ? <LoadingState label="Cargando usuarios" /> : null}

      {result ? (
        <div className={loading ? "data-surface is-updating" : "data-surface"}>
          {result.items.length === 0 ? (
            <EmptyState title="No encontramos usuarios" description="Proba con otra busqueda o filtro." />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Usuario</th><th>Estado</th><th>Actividad</th><th>Ranking</th><th>Reportes</th><th>Alta</th><th><span className="sr-only">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {result.items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="identity-cell">
                          <Avatar src={user.avatar_url} name={displayName(user)} />
                          <div>
                            <strong>{displayName(user)}</strong>
                            <span>{user.username ? `@${user.username}` : user.email || "Sin correo"}</span>
                          </div>
                          {user.is_verified ? <CheckCircle2 className="verified-icon" size={16} aria-label="Verificado" /> : null}
                        </div>
                      </td>
                      <td>
                        <div className="badge-stack">
                          <Badge tone={user.account_status === "active" ? "success" : "danger"}>
                            {user.account_status === "active" ? "Activo" : "Suspendido"}
                          </Badge>
                          {user.is_admin ? <Badge tone="accent"><ShieldCheck size={12} /> Admin</Badge> : null}
                        </div>
                      </td>
                      <td><strong>{formatNumber(user.posts_count)}</strong><span className="cell-subline">posts / {formatNumber(user.likes_received_count)} me gusta</span></td>
                      <td><strong>{Number(user.rank_score ?? 0).toFixed(1)}</strong><span className="cell-subline">sobre 100</span></td>
                      <td><Badge tone={user.reports_received_count > 0 ? "warning" : "neutral"}>{user.reports_received_count}</Badge></td>
                      <td className="cell-muted">{formatDate(user.created_at)}</td>
                      <td className="cell-actions">
                        <button
                          className={user.account_status === "active" ? "icon-button icon-button-danger" : "icon-button icon-button-success"}
                          type="button"
                          title={user.account_status === "active" ? "Suspender usuario" : "Reactivar usuario"}
                          aria-label={user.account_status === "active" ? "Suspender usuario" : "Reactivar usuario"}
                          disabled={user.is_admin}
                          onClick={() => setTarget(user)}
                        >
                          {user.account_status === "active" ? <Ban size={17} /> : <UserCheck size={17} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} onChange={setPage} />
        </div>
      ) : null}

      <Modal
        open={Boolean(target)}
        title={target?.account_status === "active" ? "Suspender usuario" : "Reactivar usuario"}
        description={target ? displayName(target) : undefined}
        onClose={closeModal}
      >
        {target?.account_status === "active" ? (
          <label className="field">
            <span>Motivo de la suspension</span>
            <textarea
              value={reason}
              rows={4}
              maxLength={500}
              placeholder="Describe brevemente el motivo"
              autoFocus
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        ) : (
          <p className="modal-body-copy">El usuario podra volver a iniciar sesion y usar la aplicacion.</p>
        )}
        <footer className="modal-actions">
          <button className="button button-secondary" type="button" onClick={closeModal}>Cancelar</button>
          <button
            className={target?.account_status === "active" ? "button button-danger" : "button button-success"}
            type="button"
            disabled={saving || (target?.account_status === "active" && !reason.trim())}
            onClick={handleStatusChange}
          >
            {saving ? <LoaderCircle className="spin" size={17} /> : target?.account_status === "active" ? <Ban size={17} /> : <UserCheck size={17} />}
            <span>{target?.account_status === "active" ? "Suspender" : "Reactivar"}</span>
          </button>
        </footer>
      </Modal>
    </div>
  );
}
