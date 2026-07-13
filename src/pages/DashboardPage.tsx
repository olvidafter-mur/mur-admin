import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  FileText,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { getDashboard } from "../lib/adminApi";
import { formatDate, formatNumber, truncate } from "../lib/format";
import type { AdminView, DashboardData } from "../types";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "../components/ui";

export default function DashboardPage({
  onNavigate,
}: {
  onNavigate: (view: AdminView) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboard());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el resumen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page">
      <PageHeader
        title="Resumen"
        description="Estado operativo de Mur en este momento."
        action={
          <button className="button button-secondary" type="button" onClick={load}>
            <RefreshCw size={17} />
            <span>Actualizar</span>
          </button>
        }
      />

      {error ? <ErrorState message={error} /> : null}
      {loading && !data ? <LoadingState /> : null}

      {data ? (
        <>
          <section className="metric-grid" aria-label="Metricas principales">
            <article className="metric-card">
              <span className="metric-icon metric-icon-ink"><UsersRound size={20} /></span>
              <div><span>Usuarios</span><strong>{formatNumber(data.metrics.users_total)}</strong></div>
              <small><UserPlus size={14} /> {data.metrics.users_new_7d} nuevos en 7 dias</small>
            </article>
            <article className="metric-card">
              <span className="metric-icon metric-icon-accent"><FileText size={20} /></span>
              <div><span>Posts visibles</span><strong>{formatNumber(data.metrics.posts_visible)}</strong></div>
              <small><Activity size={14} /> {data.metrics.posts_24h} durante las ultimas 24 h</small>
            </article>
            <article className="metric-card">
              <span className="metric-icon metric-icon-danger"><ShieldAlert size={20} /></span>
              <div><span>Reportes pendientes</span><strong>{formatNumber(data.metrics.reports_pending)}</strong></div>
              <small>{data.metrics.reports_7d} recibidos en 7 dias</small>
            </article>
            <article className="metric-card">
              <span className="metric-icon metric-icon-warning"><RefreshCw size={20} /></span>
              <div><span>Acciones activas</span><strong>{formatNumber(data.metrics.users_suspended + data.metrics.posts_moderated)}</strong></div>
              <small>{data.metrics.users_suspended} usuarios y {data.metrics.posts_moderated} posts</small>
            </article>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <h2>Reportes recientes</h2>
                <p>Casos pendientes ordenados por fecha.</p>
              </div>
              <button className="button button-quiet" type="button" onClick={() => onNavigate("reports")}>
                <span>Ver todos</span><ArrowRight size={17} />
              </button>
            </div>

            {data.recent_reports.length === 0 ? (
              <EmptyState title="Sin reportes pendientes" description="No hay casos que requieran revision." />
            ) : (
              <div className="data-surface">
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Motivo</th><th>Publicacion</th><th>Autor</th><th>Reportado por</th><th>Fecha</th></tr></thead>
                    <tbody>
                      {data.recent_reports.map((report) => (
                        <tr key={report.id}>
                          <td><Badge tone="danger">{report.reason}</Badge></td>
                          <td className="cell-main">{truncate(report.post_content, 70)}</td>
                          <td>{report.author_name}</td>
                          <td>{report.reporter_name}</td>
                          <td className="cell-muted">{formatDate(report.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
