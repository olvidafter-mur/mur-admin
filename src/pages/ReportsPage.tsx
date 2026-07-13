import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  EyeOff,
  LoaderCircle,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { listReports, reviewReport } from "../lib/adminApi";
import { formatDate, truncate } from "../lib/format";
import type { PaginatedResult, ReportRow } from "../types";
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
type ReviewStatus = "pending" | "resolved" | "dismissed";

const reasonLabels: Record<string, string> = {
  user_report: "Reporte de usuario",
  spam: "Spam",
  harassment: "Acoso",
  hate: "Odio",
  violence: "Violencia",
  misinformation: "Informacion falsa",
};

export default function ReportsPage({
  notify,
}: {
  notify: (message: string, tone?: "success" | "danger") => void;
}) {
  const [result, setResult] = useState<PaginatedResult<ReportRow> | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<ReportRow | null>(null);
  const [decision, setDecision] = useState<ReviewStatus>("resolved");
  const [notes, setNotes] = useState("");
  const [hidePost, setHidePost] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await listReports({
          search,
          status,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los reportes.");
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

  const openReview = (report: ReportRow) => {
    setTarget(report);
    setDecision(report.status === "pending" ? "resolved" : report.status);
    setNotes(report.review_notes || "");
    setHidePost(false);
  };

  const closeReview = () => {
    if (saving) return;
    setTarget(null);
    setNotes("");
    setHidePost(false);
  };

  const handleReview = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await reviewReport(target.id, decision, notes.trim(), hidePost);
      notify(
        decision === "pending"
          ? "Reporte reabierto."
          : decision === "resolved"
            ? "Reporte resuelto."
            : "Reporte descartado.",
      );
      setTarget(null);
      setNotes("");
      setHidePost(false);
      await load();
    } catch (saveError) {
      notify(saveError instanceof Error ? saveError.message : "No se pudo revisar el reporte.", "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader eyebrow="Trust & safety" title="Reportes" description="Revision contextual y resolucion de contenido denunciado." />

      <div className="filter-tabs" role="tablist" aria-label="Estado del reporte">
        {(["pending", "resolved", "dismissed"] as const).map((value) => (
          <button
            key={value}
            className={status === value ? "filter-tab is-active" : "filter-tab"}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => {
              setPage(1);
              setStatus(value);
            }}
          >
            {value === "pending" ? "Pendientes" : value === "resolved" ? "Resueltos" : "Descartados"}
          </button>
        ))}
      </div>

      <form className="toolbar toolbar-compact" onSubmit={handleSearch}>
        <label className="search-control">
          <Search size={18} />
          <input
            type="search"
            value={draftSearch}
            placeholder="Buscar motivo, texto o autor"
            onChange={(event) => setDraftSearch(event.target.value)}
          />
        </label>
        <button className="button button-secondary" type="submit"><Search size={17} /><span>Buscar</span></button>
      </form>

      {error ? <ErrorState message={error} /> : null}
      {loading && !result ? <LoadingState label="Cargando reportes" /> : null}

      {result ? (
        <div className={loading ? "data-surface is-updating" : "data-surface"}>
          {result.items.length === 0 ? (
            <EmptyState
              title={status === "pending" ? "No hay reportes pendientes" : "No encontramos reportes"}
              description={status === "pending" ? "La bandeja de moderacion esta al dia." : "Proba con otra busqueda."}
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Motivo</th><th>Publicacion</th><th>Autor</th><th>Reportado por</th><th>Estado</th><th>Fecha</th><th><span className="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  {result.items.map((report) => (
                    <tr key={report.id}>
                      <td><strong>{reasonLabels[report.reason] || report.reason}</strong>{report.details ? <span className="cell-subline">{truncate(report.details, 52)}</span> : null}</td>
                      <td className="post-cell"><strong>{truncate(report.post_content, 90)}</strong><span>{report.post_id.slice(0, 8)}</span></td>
                      <td>
                        <div className="identity-cell identity-cell-compact">
                          <Avatar src={report.author_avatar_url} name={report.author_name} size="small" />
                          <strong>{report.author_name}</strong>
                        </div>
                      </td>
                      <td>{report.reporter_name}</td>
                      <td>
                        <Badge tone={report.status === "pending" ? "warning" : report.status === "resolved" ? "success" : "neutral"}>
                          {report.status === "pending" ? "Pendiente" : report.status === "resolved" ? "Resuelto" : "Descartado"}
                        </Badge>
                      </td>
                      <td className="cell-muted">{formatDate(report.created_at)}</td>
                      <td className="cell-actions">
                        <button
                          className="icon-button"
                          type="button"
                          title={report.status === "pending" ? "Revisar reporte" : "Editar revision"}
                          aria-label={report.status === "pending" ? "Revisar reporte" : "Editar revision"}
                          onClick={() => openReview(report)}
                        >
                          <ClipboardCheck size={17} />
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
        title="Revisar reporte"
        description={target ? `${reasonLabels[target.reason] || target.reason} - ${formatDate(target.created_at)}` : undefined}
        onClose={closeReview}
      >
        {target ? (
          <div className="review-content">
            <div className="reported-post">
              <span>Publicacion de {target.author_name}</span>
              <p>{target.post_content || "Publicacion sin texto o eliminada."}</p>
              {target.details ? <small>Detalle: {target.details}</small> : null}
            </div>

            <fieldset className="field">
              <legend>Decision</legend>
              <div className="segmented-control">
                <label className={decision === "resolved" ? "is-selected" : ""}>
                  <input type="radio" name="decision" value="resolved" checked={decision === "resolved"} onChange={() => setDecision("resolved")} />
                  <CheckCircle2 size={16} /> Resolver
                </label>
                <label className={decision === "dismissed" ? "is-selected" : ""}>
                  <input type="radio" name="decision" value="dismissed" checked={decision === "dismissed"} onChange={() => { setDecision("dismissed"); setHidePost(false); }} />
                  <XCircle size={16} /> Descartar
                </label>
                {target.status !== "pending" ? (
                  <label className={decision === "pending" ? "is-selected" : ""}>
                    <input type="radio" name="decision" value="pending" checked={decision === "pending"} onChange={() => { setDecision("pending"); setHidePost(false); }} />
                    <RotateCcw size={16} /> Reabrir
                  </label>
                ) : null}
              </div>
            </fieldset>

            <label className="field">
              <span>Nota interna</span>
              <textarea value={notes} rows={4} maxLength={1000} placeholder="Criterio aplicado o contexto de la decision" onChange={(event) => setNotes(event.target.value)} />
            </label>

            {decision === "resolved" && !target.post_deleted_at ? (
              <label className="checkbox-control">
                <input type="checkbox" checked={hidePost} onChange={(event) => setHidePost(event.target.checked)} />
                <span className="checkbox-box"><EyeOff size={15} /></span>
                <span><strong>Ocultar tambien la publicacion</strong><small>Dejara de aparecer en Mur.</small></span>
              </label>
            ) : null}
          </div>
        ) : null}
        <footer className="modal-actions">
          <button className="button button-secondary" type="button" onClick={closeReview}>Cancelar</button>
          <button className="button button-primary" type="button" disabled={saving} onClick={handleReview}>
            {saving ? <LoaderCircle className="spin" size={17} /> : <ClipboardCheck size={17} />}
            <span>Guardar revision</span>
          </button>
        </footer>
      </Modal>
    </div>
  );
}
