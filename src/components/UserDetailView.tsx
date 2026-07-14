import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Ban,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  ExternalLink,
  FileText,
  Heart,
  Languages,
  MessageCircle,
  MonitorSmartphone,
  Radio,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { displayName, formatDate, formatNumber, truncate } from "../lib/format";
import type {
  UserDetail,
  UserDetailComment,
  UserDetailPost,
  UserDetailReport,
  UserRow,
} from "../types";
import { Avatar, Badge, ErrorState, LoadingState } from "./ui";

type ActivityView = "posts" | "comments" | "reports";

const reportReasonLabel: Record<string, string> = {
  user_report: "Reporte de usuario",
  spam: "Spam",
  harassment: "Acoso",
  hate: "Odio",
  violence: "Violencia",
  misinformation: "Informacion falsa",
};

const languageLabel = {
  system: "Sistema",
  en: "Ingles",
  es: "Español",
} as const;

const themeLabel = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
} as const;

const postStatusLabel = {
  visible: "Visible",
  moderated: "Moderado",
  deleted: "Eliminado",
} as const;

const postShareUrl = (post: { id: string; share_slug: string | null }) =>
  `https://mur.olvidaftech.com/p/${encodeURIComponent(post.share_slug || post.id)}`;

const asNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatScore = (value: number | string | null | undefined) => asNumber(value).toFixed(1);

const formatDateOnly = (value: string | null) => {
  if (!value) return "Sin registrar";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
};

const ActivityEmpty = ({ children }: { children: string }) => (
  <div className="user-detail-empty">{children}</div>
);

const UserPostList = ({ posts }: { posts: UserDetailPost[] }) => {
  if (posts.length === 0) return <ActivityEmpty>Este usuario todavia no publico contenido.</ActivityEmpty>;

  return (
    <div className="user-post-list">
      {posts.map((post) => (
        <article className="user-post-item" key={post.id}>
          {post.preview_image_url ? (
            <img src={post.preview_image_url} alt="Vista previa de la publicacion" loading="lazy" />
          ) : (
            <div className="user-post-placeholder"><FileText size={20} /></div>
          )}
          <div className="user-post-content">
            <div className="user-activity-item-heading">
              <div>
                <Badge tone="neutral">{post.category_name || post.post_type || "General"}</Badge>
                <Badge tone={post.status === "visible" ? "success" : post.status === "moderated" ? "danger" : "neutral"}>
                  {postStatusLabel[post.status]}
                </Badge>
              </div>
              <time>{formatDate(post.created_at)}</time>
            </div>
            <p>{post.content || "Publicacion sin texto."}</p>
            {post.moderation_reason ? <small>Moderacion: {post.moderation_reason}</small> : null}
            <footer>
              <span><Heart size={14} /> {post.likes_count}</span>
              <span><MessageCircle size={14} /> {post.comments_count}</span>
              <span className={post.report_count > 0 ? "has-alert" : ""}><ShieldAlert size={14} /> {post.report_count}</span>
              <a href={postShareUrl(post)} target="_blank" rel="noopener noreferrer">
                Abrir post <ExternalLink size={14} />
              </a>
            </footer>
          </div>
        </article>
      ))}
    </div>
  );
};

const UserCommentList = ({ comments }: { comments: UserDetailComment[] }) => {
  if (comments.length === 0) return <ActivityEmpty>Este usuario todavia no escribio comentarios.</ActivityEmpty>;

  return (
    <div className="user-comment-list">
      {comments.map((comment) => (
        <article className="user-comment-item" key={comment.id}>
          <MessageCircle size={18} />
          <div>
            <div className="user-activity-item-heading">
              <strong>Comentario en la publicacion de {comment.post_author_name || "Usuario"}</strong>
              <time>{formatDate(comment.created_at)}</time>
            </div>
            <p>{comment.content}</p>
            <div className="user-comment-context">
              <span>Publicacion original</span>
              <p>{truncate(comment.post_content || "Publicacion sin texto.", 180)}</p>
            </div>
            <a href={postShareUrl({ id: comment.post_id, share_slug: comment.post_share_slug })} target="_blank" rel="noopener noreferrer">
              Abrir post <ExternalLink size={14} />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
};

const UserReportList = ({ reports }: { reports: UserDetailReport[] }) => {
  if (reports.length === 0) return <ActivityEmpty>Este usuario no recibio reportes.</ActivityEmpty>;

  return (
    <div className="user-report-list">
      {reports.map((report) => (
        <article className="user-report-item" key={report.id}>
          <div className="user-activity-item-heading">
            <div>
              <strong>{reportReasonLabel[report.reason] || report.reason}</strong>
              <span>Reportado por {report.reporter_name || "Usuario"}</span>
            </div>
            <Badge tone={report.status === "pending" ? "warning" : report.status === "resolved" ? "success" : "neutral"}>
              {report.status === "pending" ? "Pendiente" : report.status === "resolved" ? "Resuelto" : "Descartado"}
            </Badge>
          </div>
          {report.details ? <p>{report.details}</p> : null}
          <div className="user-report-context">
            <span>Publicacion reportada</span>
            <p>{truncate(report.post_content || "Publicacion sin texto.", 220)}</p>
          </div>
          {report.review_notes ? (
            <small>Revision de {report.reviewer_name || "administrador"}: {report.review_notes}</small>
          ) : null}
          <footer>
            <time>{formatDate(report.created_at)}</time>
            <a href={postShareUrl({ id: report.post_id, share_slug: report.post_share_slug })} target="_blank" rel="noopener noreferrer">
              Abrir post <ExternalLink size={14} />
            </a>
          </footer>
        </article>
      ))}
    </div>
  );
};

export default function UserDetailView({
  summary,
  detail,
  loading,
  error,
  onBack,
  onRetry,
  onStatusChange,
}: {
  summary: UserRow;
  detail: UserDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
  onStatusChange: () => void;
}) {
  const [activityView, setActivityView] = useState<ActivityView>("posts");

  useEffect(() => {
    if (!detail) return;
    setActivityView(
      detail.recent_posts.length > 0
        ? "posts"
        : detail.recent_comments.length > 0
          ? "comments"
          : "reports",
    );
  }, [detail]);

  const profile = detail?.profile;
  const title = profile ? displayName(profile) : displayName(summary);
  const accountStatus = profile?.account_status || summary.account_status;
  const isAdmin = profile?.is_admin ?? summary.is_admin;
  const rankingScore = asNumber(detail?.ranking?.normalized_score ?? summary.rank_score);

  const rankingRows = detail?.ranking ? [
    ["Actividad", detail.ranking.activity_score],
    ["Calidad como autor", detail.ranking.author_quality_score],
    ["Comunidad", detail.ranking.community_score],
    ["Consistencia", detail.ranking.consistency_score],
    ["Confianza", detail.ranking.trust_score],
    ["Monetizacion", detail.ranking.monetization_score],
  ] as const : [];

  return (
    <div className="page user-detail-page">
      <button className="post-detail-back" type="button" onClick={onBack}>
        <ArrowLeft size={17} /> Volver a usuarios
      </button>

      <header className="user-detail-page-header">
        <div>
          <span className="page-eyebrow">Usuarios / Detalle</span>
          <h1>{title}</h1>
          <p>{summary.id}</p>
        </div>
        {!isAdmin ? (
          <button
            className={accountStatus === "active" ? "button button-danger" : "button button-success"}
            type="button"
            onClick={onStatusChange}
          >
            {accountStatus === "active" ? <Ban size={16} /> : <UserCheck size={16} />}
            {accountStatus === "active" ? "Suspender usuario" : "Reactivar usuario"}
          </button>
        ) : null}
      </header>

      {loading ? <div className="post-detail-state"><LoadingState label="Cargando perfil completo" /></div> : null}
      {error ? (
        <div className="post-detail-error">
          <ErrorState message={error} />
          <button className="button button-secondary" type="button" onClick={onRetry}>Reintentar</button>
        </div>
      ) : null}

      {detail && profile ? (
        <div className="user-detail-content">
          <section className="user-profile-hero">
            <Avatar src={profile.avatar_url} name={displayName(profile)} size="large" />
            <div className="user-profile-identity">
              <div className="user-profile-title">
                <h2>{displayName(profile)}</h2>
                {profile.is_verified ? <CheckCircle2 className="verified-icon" size={18} aria-label="Verificado" /> : null}
              </div>
              <span>{profile.username ? `@${profile.username}` : "Sin nombre de usuario"}</span>
              <span>{profile.email || "Sin correo"}</span>
              <div className="user-profile-badges">
                <Badge tone={profile.account_status === "active" ? "success" : "danger"}>
                  {profile.account_status === "active" ? "Cuenta activa" : "Cuenta suspendida"}
                </Badge>
                {profile.is_admin ? <Badge tone="accent"><ShieldCheck size={12} /> Administrador</Badge> : null}
                <Badge tone="neutral">Datos administrativos</Badge>
              </div>
              {profile.bio ? <p>{profile.bio}</p> : <p className="user-profile-no-bio">El usuario no agrego una biografia.</p>}
            </div>
            <div className="user-profile-access">
              <span>Ultimo acceso</span>
              <strong>{profile.last_sign_in_at ? formatDate(profile.last_sign_in_at) : "Sin actividad registrada"}</strong>
              <small>Alta: {formatDate(profile.created_at)}</small>
            </div>
          </section>

          {profile.account_status === "suspended" ? (
            <section className="user-suspension-banner">
              <ShieldAlert size={20} />
              <div>
                <strong>Cuenta suspendida</strong>
                <p>{profile.suspension_reason || "Sin motivo registrado."}</p>
                <small>
                  {profile.suspended_at ? formatDate(profile.suspended_at) : "Fecha no disponible"}
                  {profile.suspension_updated_by_name ? ` · por ${profile.suspension_updated_by_name}` : ""}
                </small>
              </div>
            </section>
          ) : null}

          <section className="user-detail-metrics" aria-label="Metricas principales del usuario">
            <div><FileText size={20} /><span>Publicaciones</span><strong>{formatNumber(detail.metrics.posts_total)}</strong><small>{detail.metrics.posts_visible} visibles</small></div>
            <div><Heart size={20} /><span>Respuesta recibida</span><strong>{formatNumber(detail.metrics.likes_received + detail.metrics.comments_received)}</strong><small>{detail.metrics.likes_received} Me gusta · {detail.metrics.comments_received} comentarios</small></div>
            <div><ShieldAlert size={20} /><span>Reportes recibidos</span><strong>{formatNumber(detail.metrics.reports_received)}</strong><small>{detail.metrics.blocked_by} bloqueos recibidos</small></div>
            <div><CircleGauge size={20} /><span>Ranking interno</span><strong>{rankingScore.toFixed(1)}</strong><small>sobre 100</small></div>
          </section>

          <section className="user-detail-signal-grid" aria-label="Actividad operativa">
            <div><Heart size={17} /><span>Me gusta dados</span><strong>{formatNumber(detail.metrics.likes_given)}</strong></div>
            <div><MessageCircle size={17} /><span>Comentarios dados</span><strong>{formatNumber(detail.metrics.comments_given)}</strong></div>
            <div><UsersRound size={17} /><span>Usuarios bloqueados</span><strong>{formatNumber(detail.metrics.blocks_made)}</strong></div>
            <div><ShieldAlert size={17} /><span>Reportes enviados</span><strong>{formatNumber(detail.metrics.reports_made)}</strong></div>
            <div><Bell size={17} /><span>Notificaciones sin leer</span><strong>{formatNumber(detail.metrics.unread_notifications)}</strong></div>
            <div><MonitorSmartphone size={17} /><span>Dispositivos push</span><strong>{formatNumber(detail.metrics.active_push_devices)}</strong></div>
          </section>

          <div className="user-detail-primary-grid">
            <section className="user-ranking-panel">
              <div className="user-detail-section-heading">
                <div><span>Modelo interno</span><strong>Ranking y señales de comportamiento</strong></div>
                <Radio size={18} />
              </div>
              {detail.ranking ? (
                <div className="user-ranking-content">
                  <div
                    className="user-ranking-score"
                    style={{ "--user-score": `${Math.min(100, Math.max(0, rankingScore)) * 3.6}deg` } as CSSProperties}
                  >
                    <div><strong>{rankingScore.toFixed(1)}</strong><span>/ 100</span></div>
                  </div>
                  <div className="user-ranking-breakdown">
                    {rankingRows.map(([label, value]) => (
                      <div key={label}><span>{label}</span><strong>{formatScore(value)}</strong></div>
                    ))}
                    <div className="is-penalty"><span>Penalizacion</span><strong>-{formatScore(detail.ranking.moderation_penalty)}</strong></div>
                  </div>
                  <footer>
                    <span>Multiplicador {formatScore(detail.ranking.boost_multiplier)}x</span>
                    <span>Calculado {formatDate(detail.ranking.calculated_at)}</span>
                  </footer>
                </div>
              ) : (
                <ActivityEmpty>El ranking interno todavia no fue calculado para este usuario.</ActivityEmpty>
              )}
            </section>

            <section className="user-account-panel">
              <div className="user-detail-section-heading">
                <div><span>Cuenta</span><strong>Identidad, acceso y cumplimiento</strong></div>
                <ShieldCheck size={18} />
              </div>
              <dl className="user-account-data">
                <div><dt>Correo confirmado</dt><dd>{profile.email_confirmed_at ? formatDate(profile.email_confirmed_at) : "No"}</dd></div>
                <div><dt>Ultimo acceso</dt><dd>{profile.last_sign_in_at ? formatDate(profile.last_sign_in_at) : "Sin registrar"}</dd></div>
                <div><dt>Fecha de nacimiento</dt><dd>{formatDateOnly(profile.date_of_birth)}</dd></div>
                <div><dt>Onboarding</dt><dd>{profile.onboarding_completed ? "Completado" : "Pendiente"}</dd></div>
                <div><dt>Terminos</dt><dd>{profile.terms_accepted_at ? `${profile.terms_version || "Version registrada"} · ${formatDate(profile.terms_accepted_at)}` : "Pendientes"}</dd></div>
                <div><dt>Confirmacion adulta</dt><dd>{profile.adult_confirmed_at ? formatDate(profile.adult_confirmed_at) : "Sin registrar"}</dd></div>
                <div><dt>Responsabilidad</dt><dd>{profile.responsibility_acknowledged_at ? formatDate(profile.responsibility_acknowledged_at) : "Sin registrar"}</dd></div>
              </dl>
              <div className="user-preferences">
                <div><Languages size={16} /><span>Idioma</span><strong>{languageLabel[detail.preferences.language_preference]}</strong></div>
                <div><MonitorSmartphone size={16} /><span>Tema</span><strong>{themeLabel[detail.preferences.theme_preference]}</strong></div>
                <div><CalendarDays size={16} /><span>Radio cercano</span><strong>{formatNumber(detail.preferences.nearby_radius_meters)} m</strong></div>
              </div>
            </section>
          </div>

          <section className="user-detail-activity">
            <div className="user-activity-header">
              <div>
                <span>Historial reciente</span>
                <strong>Contenido, participacion y moderacion</strong>
              </div>
              <span>Hasta {detail.activity_limit} registros por seccion</span>
            </div>
            <div className="post-activity-tabs" role="tablist" aria-label="Actividad del usuario">
              <button type="button" role="tab" aria-selected={activityView === "posts"} className={activityView === "posts" ? "is-active" : ""} onClick={() => setActivityView("posts")}>
                <FileText size={15} /> Publicaciones <span>{detail.metrics.posts_total}</span>
              </button>
              <button type="button" role="tab" aria-selected={activityView === "comments"} className={activityView === "comments" ? "is-active" : ""} onClick={() => setActivityView("comments")}>
                <MessageCircle size={15} /> Comentarios <span>{detail.metrics.comments_given}</span>
              </button>
              <button type="button" role="tab" aria-selected={activityView === "reports"} className={activityView === "reports" ? "is-active" : ""} onClick={() => setActivityView("reports")}>
                <ShieldAlert size={15} /> Reportes recibidos <span>{detail.metrics.reports_received}</span>
              </button>
            </div>
            <div className="user-activity-panel" role="tabpanel">
              {activityView === "posts" ? <UserPostList posts={detail.recent_posts} /> : null}
              {activityView === "comments" ? <UserCommentList comments={detail.recent_comments} /> : null}
              {activityView === "reports" ? <UserReportList reports={detail.reports_received} /> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
