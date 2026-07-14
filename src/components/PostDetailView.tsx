import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  EyeOff,
  FileText,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Music2,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { displayName, formatDate } from "../lib/format";
import type {
  PostDetail,
  PostDetailComment,
  PostDetailLike,
  PostDetailReport,
  PostRow,
} from "../types";
import { Avatar, Badge, ErrorState, LoadingState } from "./ui";

type ActivityView = "comments" | "likes" | "reports";

const statusLabel = {
  visible: "Visible",
  moderated: "Moderado",
  deleted: "Eliminado",
} as const;

const reportReasonLabel: Record<string, string> = {
  user_report: "Reporte de usuario",
  spam: "Spam",
  harassment: "Acoso",
  hate: "Odio",
  violence: "Violencia",
  misinformation: "Informacion falsa",
};

const postShareUrl = (post: PostRow) =>
  `https://mur.olvidaftech.com/p/${encodeURIComponent(post.share_slug || post.id)}`;

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(size >= 102400 ? 0 : 1)} KB`;
};

const actorName = (actor: {
  display_name?: string | null;
  username?: string | null;
}) => displayName(actor);

const ActivityEmpty = ({ children }: { children: string }) => (
  <div className="post-detail-empty">
    <span>{children}</span>
  </div>
);

const LikeList = ({ likes }: { likes: PostDetailLike[] }) => {
  if (likes.length === 0) return <ActivityEmpty>Esta publicacion todavia no tiene Me gusta.</ActivityEmpty>;

  return (
    <div className="post-activity-list post-like-list">
      {likes.map((like) => (
        <article className="post-activity-item" key={like.user_id}>
          <Avatar src={like.avatar_url} name={actorName(like)} size="small" />
          <div>
            <strong>{actorName(like)}</strong>
            <span>{like.username ? `@${like.username}` : "Sin nombre de usuario"}</span>
          </div>
          <time>{formatDate(like.created_at)}</time>
        </article>
      ))}
    </div>
  );
};

const CommentList = ({ comments }: { comments: PostDetailComment[] }) => {
  if (comments.length === 0) return <ActivityEmpty>Esta publicacion todavia no tiene comentarios.</ActivityEmpty>;

  return (
    <div className="post-activity-list">
      {comments.map((comment) => (
        <article className="post-comment-item" key={comment.id}>
          <Avatar src={comment.avatar_url} name={actorName(comment)} size="small" />
          <div>
            <header>
              <strong>{actorName(comment)}</strong>
              <span>{comment.username ? `@${comment.username}` : "Sin nombre de usuario"}</span>
              <time>{formatDate(comment.created_at)}</time>
            </header>
            <p>{comment.content}</p>
          </div>
        </article>
      ))}
    </div>
  );
};

const ReportList = ({ reports }: { reports: PostDetailReport[] }) => {
  if (reports.length === 0) return <ActivityEmpty>Esta publicacion no tiene reportes.</ActivityEmpty>;

  return (
    <div className="post-activity-list">
      {reports.map((report) => (
        <article className="post-report-item" key={report.id}>
          <div className="post-report-item-header">
            <div>
              <strong>{reportReasonLabel[report.reason] || report.reason}</strong>
              <span>por {actorName({ display_name: report.reporter_display_name, username: report.reporter_username })}</span>
            </div>
            <Badge tone={report.status === "pending" ? "warning" : report.status === "resolved" ? "success" : "neutral"}>
              {report.status === "pending" ? "Pendiente" : report.status === "resolved" ? "Resuelto" : "Descartado"}
            </Badge>
          </div>
          {report.details ? <p>{report.details}</p> : null}
          {report.review_notes ? <small>Revision: {report.review_notes}</small> : null}
          <time>{formatDate(report.created_at)}</time>
        </article>
      ))}
    </div>
  );
};

export default function PostDetailView({
  summary,
  detail,
  loading,
  error,
  onBack,
  onRetry,
  onModerate,
}: {
  summary: PostRow;
  detail: PostDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
  onModerate: (post: PostRow) => void;
}) {
  const [activityView, setActivityView] = useState<ActivityView>("comments");

  useEffect(() => {
    if (!detail) return;
    setActivityView(
      detail.post.comments_count > 0
        ? "comments"
        : detail.post.likes_count > 0
          ? "likes"
          : "reports",
    );
  }, [detail]);

  const post = detail?.post;

  return (
    <div className="page post-detail-page">
      <button className="post-detail-back" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        Volver a publicaciones
      </button>

      <header className="post-detail-page-header">
        <div>
          <span className="page-eyebrow">Publicaciones / Detalle</span>
          <h1>Detalle de la publicacion</h1>
          <p>{summary.id} · {formatDate(summary.created_at)}</p>
        </div>
        <div className="post-detail-page-actions">
          {post && post.status !== "deleted" ? (
            <button className="button button-secondary" type="button" onClick={() => onModerate(post)}>
              {post.status === "visible" ? <EyeOff size={16} /> : <RotateCcw size={16} />}
              {post.status === "visible" ? "Moderar" : "Restaurar"}
            </button>
          ) : null}
          <a className="button button-secondary" href={postShareUrl(post || summary)} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} /> Abrir post
          </a>
        </div>
      </header>

      {loading ? <div className="post-detail-state"><LoadingState label="Cargando publicacion completa" /></div> : null}
      {error ? (
        <div className="post-detail-error">
          <ErrorState message={error} />
          <button className="button button-secondary" type="button" onClick={onRetry}>Reintentar</button>
        </div>
      ) : null}

      {detail && post ? (
        <div className="post-detail-content">
          <header className="post-detail-author">
            <Avatar src={post.avatar_url} name={displayName(post)} size="medium" />
            <div>
              <span className="post-detail-overline">Autor de la publicacion</span>
              <strong>{displayName(post)}</strong>
              <span>{post.username ? `@${post.username}` : "Sin nombre de usuario"}</span>
              {post.author_email ? <small>{post.author_email}</small> : null}
            </div>
            <Badge tone={post.status === "visible" ? "success" : post.status === "moderated" ? "danger" : "neutral"}>
              {statusLabel[post.status]}
            </Badge>
          </header>

          <section className="post-detail-metrics" aria-label="Metricas de la publicacion">
            <div><Heart size={19} /><span>Me gusta</span><strong>{post.likes_count}</strong></div>
            <div><MessageCircle size={19} /><span>Comentarios</span><strong>{post.comments_count}</strong></div>
            <div><ShieldAlert size={19} /><span>Reportes</span><strong>{post.report_count}</strong></div>
            <div><BarChart3 size={19} /><span>Interacciones</span><strong>{post.likes_count + post.comments_count}</strong></div>
          </section>

          <div className="post-detail-primary-grid">
            <section className="post-detail-publication">
              <div className="post-detail-section-heading">
                <div>
                  <span>Contenido completo</span>
                  <strong>{post.category_name || "Sin categoria"}</strong>
                </div>
                <Badge tone="neutral">{post.post_type || "text"}</Badge>
              </div>
              <p className="post-detail-copy">{post.content || "Publicacion sin texto."}</p>

              {detail.media.length > 0 ? (
                <div className="post-media-grid">
                  {detail.media.map((media, index) => (
                    <figure className="post-media-item" key={media.id}>
                      {media.media_type === "image" ? (
                        <img src={media.public_url} alt={`Multimedia de la publicacion ${index + 1}`} loading="lazy" />
                      ) : (
                        <div className="post-audio-item">
                          <Music2 size={22} />
                          <audio controls preload="metadata" src={media.public_url}>
                            Tu navegador no puede reproducir este audio.
                          </audio>
                        </div>
                      )}
                      <figcaption>
                        {media.media_type === "image" ? <ImageIcon size={13} /> : <Music2 size={13} />}
                        {media.mime_type} · {formatFileSize(media.size_bytes)}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}

              {detail.poll ? (
                <div className="post-poll-detail">
                  <div className="post-detail-section-heading">
                    <div><span>Encuesta</span><strong>{detail.poll.question}</strong></div>
                    <span>{detail.poll.total_votes} votos</span>
                  </div>
                  <div className="post-poll-options">
                    {detail.poll.options.map((option) => {
                      const percentage = detail.poll && detail.poll.total_votes > 0
                        ? Math.round((option.votes_count / detail.poll.total_votes) * 100)
                        : 0;
                      return (
                        <div className="post-poll-option" key={option.id}>
                          <div><strong>{option.option_text}</strong><span>{option.votes_count} · {percentage}%</span></div>
                          <span className="post-poll-track"><i style={{ width: `${percentage}%` }} /></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="post-detail-metadata">
              <div className="post-detail-section-heading">
                <div><span>Registro</span><strong>Datos de la publicacion</strong></div>
                <FileText size={18} />
              </div>
              <dl>
                <div><dt>Creada</dt><dd>{formatDate(post.created_at)}</dd></div>
                <div><dt>Editada</dt><dd>{post.is_edited && post.edited_at ? formatDate(post.edited_at) : "No"}</dd></div>
                <div><dt>Visibilidad</dt><dd>{post.visibility || "public"}</dd></div>
                <div><dt>Codigo compartible</dt><dd>{post.share_slug || "Sin codigo"}</dd></div>
                <div><dt>Ubicacion publica</dt><dd>{post.share_location ? "Si" : "No, solo administradores"}</dd></div>
                <div>
                  <dt>Coordenadas</dt>
                  <dd className="post-detail-coordinate">
                    <MapPin size={14} />
                    {post.latitude !== null && post.longitude !== null
                      ? `${post.latitude.toFixed(5)}, ${post.longitude.toFixed(5)}`
                      : "Sin ubicacion"}
                  </dd>
                </div>
                {post.moderation_reason ? <div><dt>Moderacion</dt><dd>{post.moderation_reason}</dd></div> : null}
              </dl>
            </section>
          </div>

          <section className="post-detail-activity">
            <div className="post-activity-header">
              <div>
                <span>Actividad de la publicacion</span>
                <strong>Conversacion, audiencia y reportes</strong>
              </div>
              <span>Hasta {detail.activity_limit} registros recientes por seccion</span>
            </div>
            <div className="post-activity-tabs" role="tablist" aria-label="Actividad de la publicacion">
              <button type="button" role="tab" aria-selected={activityView === "comments"} className={activityView === "comments" ? "is-active" : ""} onClick={() => setActivityView("comments")}>
                <MessageCircle size={15} /> Comentarios <span>{post.comments_count}</span>
              </button>
              <button type="button" role="tab" aria-selected={activityView === "likes"} className={activityView === "likes" ? "is-active" : ""} onClick={() => setActivityView("likes")}>
                <Heart size={15} /> Me gusta <span>{post.likes_count}</span>
              </button>
              <button type="button" role="tab" aria-selected={activityView === "reports"} className={activityView === "reports" ? "is-active" : ""} onClick={() => setActivityView("reports")}>
                <ShieldAlert size={15} /> Reportes <span>{post.report_count}</span>
              </button>
            </div>
            <div className="post-activity-panel" role="tabpanel">
              {activityView === "comments" ? <CommentList comments={detail.comments} /> : null}
              {activityView === "likes" ? <LikeList likes={detail.likes} /> : null}
              {activityView === "reports" ? <ReportList reports={detail.reports} /> : null}
            </div>
            {(
              (activityView === "comments" && post.comments_count > detail.comments.length)
              || (activityView === "likes" && post.likes_count > detail.likes.length)
              || (activityView === "reports" && post.report_count > detail.reports.length)
            ) ? (
              <small className="post-activity-limit">Mostrando los {detail.activity_limit} registros mas recientes.</small>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
