import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Crosshair,
  ExternalLink,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import LocationPickerMap, {
  type SelectedLocation,
} from "../components/LocationPickerMap";
import { Avatar, ErrorState, LoadingState, PageHeader } from "../components/ui";
import { createAdminPost, getPostComposerOptions } from "../lib/adminApi";
import { displayName, formatDate } from "../lib/format";
import type {
  AdminCreatedPost,
  AdminUser,
  AdminView,
  PostComposerOptions,
  Theme,
} from "../types";

const POST_SHARE_BASE_URL = "https://mur.olvidaftech.com/p";

const coordinatesLabel = (location: SelectedLocation) =>
  `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;

export default function PublishPage({
  admin,
  theme,
  notify,
  onNavigate,
}: {
  admin: AdminUser;
  theme: Theme;
  notify: (message: string, tone?: "success" | "danger") => void;
  onNavigate: (view: AdminView) => void;
}) {
  const [options, setOptions] = useState<PostComposerOptions | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [shareLocation, setShareLocation] = useState(true);
  const [createdPost, setCreatedPost] = useState<AdminCreatedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextOptions = await getPostComposerOptions();
      setOptions(nextOptions);
      setCategoryId((current) =>
        current || nextOptions.categories.find((item) => item.slug === "general")?.id
          || nextOptions.categories[0]?.id
          || "",
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo preparar el editor de publicaciones.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const selectedCategory = useMemo(
    () => options?.categories.find((category) => category.id === categoryId) ?? null,
    [categoryId, options],
  );
  const contentLimit = options?.content_limit ?? 280;
  const charactersLeft = contentLimit - content.length;
  const canPublish = Boolean(
    content.trim()
      && content.length <= contentLimit
      && categoryId
      && location
      && !saving,
  );

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      notify("Este navegador no permite obtener la ubicacion.", "danger");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        notify("No se pudo obtener la ubicacion del navegador.", "danger");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canPublish || !location) return;

    setSaving(true);
    setError(null);
    try {
      const result = await createAdminPost({
        content: content.trim(),
        categoryId,
        latitude: location.latitude,
        longitude: location.longitude,
        shareLocation,
      });
      setCreatedPost(result);
      notify("Publicacion creada correctamente.");
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : "No se pudo crear la publicacion.";
      setError(message);
      notify(message, "danger");
    } finally {
      setSaving(false);
    }
  };

  const resetComposer = () => {
    setContent("");
    setLocation(null);
    setShareLocation(true);
    setCreatedPost(null);
    setError(null);
  };

  const shareUrl = createdPost
    ? `${POST_SHARE_BASE_URL}/${encodeURIComponent(createdPost.share_slug || createdPost.id)}`
    : null;

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      notify("Enlace copiado.");
    } catch {
      notify("No se pudo copiar el enlace.", "danger");
    }
  };

  if (loading) {
    return (
      <div className="page publish-page">
        <LoadingState label="Preparando editor de publicaciones" />
      </div>
    );
  }

  if (!options) {
    return (
      <div className="page publish-page">
        <PageHeader
          eyebrow="Publicacion administrativa"
          title="Crear publicacion"
          description="Publica contenido geolocalizado desde la consola de operaciones."
        />
        <ErrorState message={error ?? "No se pudo cargar el editor."} />
        <button className="button button-secondary" type="button" onClick={() => void loadOptions()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="page publish-page">
      <PageHeader
        eyebrow="Publicacion administrativa"
        title="Crear publicacion"
        description="Selecciona un punto exacto en el mapa y publica desde tu cuenta administrativa."
        action={(
          <button className="button button-secondary" type="button" onClick={() => onNavigate("posts")}>
            Ver publicaciones
          </button>
        )}
      />

      <div className="publish-workspace">
        <section className="publish-map-panel" aria-labelledby="location-title">
          <header className="publish-panel-header">
            <div>
              <span className="panel-kicker">Paso 1 · Ubicacion</span>
              <h2 id="location-title">Selecciona el punto de publicacion</h2>
              <p>Haz clic sobre el mapa o arrastra el pin para ajustar las coordenadas.</p>
            </div>
            <button
              className="button button-secondary"
              type="button"
              disabled={locating}
              onClick={useCurrentLocation}
            >
              {locating ? <LoaderCircle className="spin" size={16} /> : <Crosshair size={16} />}
              {locating ? "Ubicando" : "Mi ubicacion"}
            </button>
          </header>

          <LocationPickerMap value={location} theme={theme} onChange={setLocation} />

          <footer className="publish-map-footer">
            <div className={location ? "coordinate-status is-selected" : "coordinate-status"}>
              <span className="coordinate-icon"><MapPin size={17} /></span>
              <div>
                <strong>{location ? "Punto seleccionado" : "Falta seleccionar una ubicacion"}</strong>
                <span>{location ? coordinatesLabel(location) : "Haz clic en cualquier lugar del mapa"}</span>
              </div>
            </div>
            {location ? (
              <div className="coordinate-fields" aria-label="Coordenadas seleccionadas">
                <label>
                  <span>Latitud</span>
                  <input value={location.latitude.toFixed(6)} readOnly />
                </label>
                <label>
                  <span>Longitud</span>
                  <input value={location.longitude.toFixed(6)} readOnly />
                </label>
              </div>
            ) : null}
          </footer>
        </section>

        <aside className="publish-composer-panel" aria-labelledby="composer-title">
          {createdPost && shareUrl ? (
            <div className="publish-success" role="status">
              <span className="publish-success-icon"><CheckCircle2 size={28} /></span>
              <div>
                <span className="panel-kicker">Publicada</span>
                <h2>La publicacion ya esta activa</h2>
                <p>Se creo como {displayName(admin)} y quedo registrada en la auditoria administrativa.</p>
              </div>

              <div className="publish-success-summary">
                <span><MapPin size={15} /> {createdPost.latitude.toFixed(5)}, {createdPost.longitude.toFixed(5)}</span>
                <span><Clock3 size={15} /> Expira {formatDate(createdPost.expires_at)}</span>
              </div>

              <div className="share-link-box">
                <span>Enlace compartible</span>
                <strong>{shareUrl}</strong>
                <button className="icon-button" type="button" title="Copiar enlace" onClick={() => void copyShareUrl()}>
                  <Copy size={17} />
                </button>
              </div>

              <a className="button button-primary button-full" href={shareUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={17} /> Abrir publicacion
              </a>
              <button className="button button-secondary button-full" type="button" onClick={resetComposer}>
                <RotateCcw size={17} /> Crear otra publicacion
              </button>
            </div>
          ) : (
            <form className="publish-form" onSubmit={handleSubmit}>
              <header className="publish-composer-header">
                <div>
                  <span className="panel-kicker">Paso 2 · Contenido</span>
                  <h2 id="composer-title">Configura la publicacion</h2>
                </div>
                <div className="publishing-identity">
                  <Avatar src={admin.avatar_url} name={displayName(admin)} size="small" />
                  <div><strong>{displayName(admin)}</strong><span>Cuenta administradora</span></div>
                </div>
              </header>

              {error ? <ErrorState message={error} /> : null}

              <label className="field publish-category-field">
                <span>Categoria</span>
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  {options.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label className="field publish-content-field">
                <span>Contenido</span>
                <textarea
                  rows={8}
                  maxLength={contentLimit}
                  value={content}
                  placeholder="Escribe la informacion que quieres publicar..."
                  onChange={(event) => setContent(event.target.value)}
                />
                <small className={charactersLeft < 30 ? "character-count is-warning" : "character-count"}>
                  {charactersLeft} caracteres disponibles
                </small>
              </label>

              <label className="publish-visibility-option">
                <input
                  type="checkbox"
                  checked={shareLocation}
                  onChange={(event) => setShareLocation(event.target.checked)}
                />
                <span className="visibility-check"><ShieldCheck size={17} /></span>
                <span>
                  <strong>Mostrar ubicacion en Mur</strong>
                  <small>La comunidad podra ver el punto asociado a esta publicacion.</small>
                </span>
              </label>

              <div className="publish-review-card">
                <span className="category-dot" style={{ background: selectedCategory?.color ?? undefined }} />
                <div>
                  <strong>{selectedCategory?.name ?? "Categoria"}</strong>
                  <span>{location ? coordinatesLabel(location) : "Ubicacion pendiente"}</span>
                </div>
                <span className={location ? "review-status is-ready" : "review-status"}>
                  {location ? "Listo" : "Incompleto"}
                </span>
              </div>

              <div className="publish-lifecycle-note">
                <Clock3 size={16} />
                <p>Como el resto del contenido de Mur, esta publicacion se elimina automaticamente despues de {options.expires_in_hours} horas. Su actividad queda conservada en metricas.</p>
              </div>

              <button className="button button-primary button-full publish-submit" type="submit" disabled={!canPublish}>
                {saving ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
                {saving ? "Publicando" : "Publicar ahora"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
