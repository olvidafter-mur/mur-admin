import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  ExternalLink,
  Heart,
  LoaderCircle,
  MessageCircle,
  Search,
  ShieldAlert,
} from "lucide-react";
import { listPosts, setPostModeration } from "../lib/adminApi";
import { displayName, formatDate, truncate } from "../lib/format";
import type { PaginatedResult, PostRow } from "../types";
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
const POST_SHARE_BASE_URL = "https://mur.olvidaftech.com/p";

const postShareUrl = (post: PostRow) =>
  `${POST_SHARE_BASE_URL}/${encodeURIComponent(post.share_slug || post.id)}`;

const statusLabel = {
  visible: "Visible",
  moderated: "Moderado",
  deleted: "Eliminado",
} as const;

export default function PostsPage({
  notify,
}: {
  notify: (message: string, tone?: "success" | "danger") => void;
}) {
  const [result, setResult] = useState<PaginatedResult<PostRow> | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<PostRow | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await listPosts({
          search,
          status,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las publicaciones.");
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

  const handleModeration = async () => {
    if (!target) return;
    const shouldHide = target.status === "visible";
    if (shouldHide && !reason.trim()) return;

    setSaving(true);
    try {
      await setPostModeration(target.id, shouldHide, reason.trim());
      notify(shouldHide ? "Publicacion ocultada." : "Publicacion restaurada.");
      setTarget(null);
      setReason("");
      await load();
    } catch (saveError) {
      notify(saveError instanceof Error ? saveError.message : "No se pudo moderar la publicacion.", "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader eyebrow="Content" title="Publicaciones" description="Contenido publicado, respuesta de la comunidad y acciones de moderacion." />

      <form className="toolbar" onSubmit={handleSearch}>
        <label className="search-control">
          <Search size={18} />
          <input
            type="search"
            value={draftSearch}
            placeholder="Buscar texto o autor"
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
            <option value="visible">Visibles</option>
            <option value="moderated">Moderados</option>
            <option value="deleted">Eliminados por usuario</option>
          </select>
        </label>
        <button className="button button-secondary" type="submit"><Search size={17} /><span>Buscar</span></button>
      </form>

      {error ? <ErrorState message={error} /> : null}
      {loading && !result ? <LoadingState label="Cargando publicaciones" /> : null}

      {result ? (
        <div className={loading ? "data-surface is-updating" : "data-surface"}>
          {result.items.length === 0 ? (
            <EmptyState title="No encontramos publicaciones" description="Proba con otra busqueda o filtro." />
          ) : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Publicacion</th><th>Autor</th><th>Categoria</th><th>Interacciones</th><th>Estado</th><th>Fecha</th><th><span className="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  {result.items.map((post) => (
                    <tr key={post.id}>
                      <td className="post-cell">
                        <strong>{truncate(post.content, 105)}</strong>
                        <span>{post.post_type || "text"} - {post.id.slice(0, 8)}</span>
                      </td>
                      <td>
                        <div className="identity-cell identity-cell-compact">
                          <Avatar src={post.avatar_url} name={displayName(post)} size="small" />
                          <div><strong>{displayName(post)}</strong><span>{post.username ? `@${post.username}` : "Sin usuario"}</span></div>
                        </div>
                      </td>
                      <td><Badge tone="neutral">{post.category_name || "Sin categoria"}</Badge></td>
                      <td>
                        <div className="engagement-cell">
                          <span title="Me gusta"><Heart size={15} /> {post.likes_count}</span>
                          <span title="Comentarios"><MessageCircle size={15} /> {post.comments_count}</span>
                          <span className={post.report_count > 0 ? "has-alert" : ""} title="Reportes"><ShieldAlert size={15} /> {post.report_count}</span>
                        </div>
                      </td>
                      <td>
                        <Badge tone={post.status === "visible" ? "success" : post.status === "moderated" ? "danger" : "neutral"}>
                          {statusLabel[post.status]}
                        </Badge>
                        {post.moderation_reason ? <span className="cell-subline" title={post.moderation_reason}>{truncate(post.moderation_reason, 36)}</span> : null}
                      </td>
                      <td className="cell-muted">{formatDate(post.created_at)}</td>
                      <td className="cell-actions post-cell-actions">
                        <div className="post-row-actions">
                          <a
                            className="button button-secondary post-open-button"
                            href={postShareUrl(post)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir post ${post.id.slice(0, 8)}`}
                          >
                            <ExternalLink size={15} />
                            <span>Abrir post</span>
                          </a>
                          {post.status !== "deleted" ? (
                            <button
                              className={post.status === "visible" ? "icon-button icon-button-danger" : "icon-button icon-button-success"}
                              type="button"
                              title={post.status === "visible" ? "Ocultar publicacion" : "Restaurar publicacion"}
                              aria-label={post.status === "visible" ? "Ocultar publicacion" : "Restaurar publicacion"}
                              onClick={() => setTarget(post)}
                            >
                              {post.status === "visible" ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                          ) : null}
                        </div>
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
        title={target?.status === "visible" ? "Ocultar publicacion" : "Restaurar publicacion"}
        description={target ? truncate(target.content, 90) : undefined}
        onClose={closeModal}
      >
        {target?.status === "visible" ? (
          <label className="field">
            <span>Motivo de moderacion</span>
            <textarea
              value={reason}
              rows={4}
              maxLength={500}
              placeholder="Ejemplo: contenido que incumple las normas"
              autoFocus
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        ) : (
          <p className="modal-body-copy">La publicacion volvera a estar visible en la aplicacion.</p>
        )}
        <footer className="modal-actions">
          <button className="button button-secondary" type="button" onClick={closeModal}>Cancelar</button>
          <button
            className={target?.status === "visible" ? "button button-danger" : "button button-success"}
            type="button"
            disabled={saving || (target?.status === "visible" && !reason.trim())}
            onClick={handleModeration}
          >
            {saving ? <LoaderCircle className="spin" size={17} /> : target?.status === "visible" ? <EyeOff size={17} /> : <Eye size={17} />}
            <span>{target?.status === "visible" ? "Ocultar" : "Restaurar"}</span>
          </button>
        </footer>
      </Modal>
    </div>
  );
}
