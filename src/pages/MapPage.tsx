import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  Heart,
  Layers3,
  LockKeyhole,
  MapPin,
  MessageCircle,
  MousePointer2,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import DataChart, {
  registerMap,
  type ChartOption,
} from "../components/DataChart";
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "../components/ui";
import { getGlobalPostMap } from "../lib/adminApi";
import { displayName, formatDate, formatNumber, truncate } from "../lib/format";
import type {
  AdminView,
  GlobalMapPost,
  GlobalPostMapData,
  PostMapRange,
  PostMapStatus,
  Theme,
} from "../types";

const MAP_NAME = "mur-world";

const statusCopy = {
  visible: { label: "Visible", plural: "Visibles", tone: "success" },
  moderated: { label: "Moderado", plural: "Moderados", tone: "danger" },
  deleted: { label: "Eliminado", plural: "Eliminados", tone: "neutral" },
} as const;

type MapDatum = {
  name: string;
  value: [number, number, number];
  postId: string;
  author: string;
  content: string;
  status: GlobalMapPost["status"];
};

const coordinates = (post: GlobalMapPost) =>
  `${post.latitude.toFixed(5)}, ${post.longitude.toFixed(5)}`;

export default function MapPage({
  theme,
  onNavigate,
}: {
  theme: Theme;
  onNavigate: (view: AdminView) => void;
}) {
  const [data, setData] = useState<GlobalPostMapData | null>(null);
  const [range, setRange] = useState<PostMapRange>(0);
  const [status, setStatus] = useState<PostMapStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void fetch(`${import.meta.env.BASE_URL}world.json`)
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar la cartografia.");
        return response.json() as Promise<Parameters<typeof registerMap>[1]>;
      })
      .then((world) => {
        registerMap(MAP_NAME, world);
        if (active) setMapReady(true);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setMapError(loadError instanceof Error ? loadError.message : "No se pudo cargar la cartografia.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextData = await getGlobalPostMap("all", range);
      setData(nextData);
      setSelectedId((current) => (
        current && nextData.items.some((post) => post.id === current)
          ? current
          : nextData.items[0]?.id ?? null
      ));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el mapa global.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return (data?.items ?? []).filter((post) => {
      if (status !== "all" && post.status !== status) return false;
      if (!query) return true;

      return [
        post.content,
        post.username,
        post.display_name,
        post.category_name,
      ].some((value) => value?.toLocaleLowerCase("es").includes(query));
    });
  }, [data, search, status]);

  useEffect(() => {
    setSelectedId((current) => (
      current && filteredItems.some((post) => post.id === current)
        ? current
        : filteredItems[0]?.id ?? null
    ));
  }, [filteredItems]);

  const selectedPost = filteredItems.find((post) => post.id === selectedId) ?? null;

  const mapOption = useMemo<ChartOption>(() => {
    const palette = theme === "dark"
      ? {
          land: "#2c333a",
          landHover: "#3b444c",
          border: "#596773",
          ink: "#f7f8f9",
          muted: "#b6c2cf",
          visible: "#579dff",
          moderated: "#fd9891",
          deleted: "#8c9bab",
        }
      : {
          land: "#eef1f4",
          landHover: "#dfe6ed",
          border: "#b3b9c4",
          ink: "#172b4d",
          muted: "#626f86",
          visible: "#0c66e4",
          moderated: "#ae2e24",
          deleted: "#7e8da7",
        };

    const series = (["visible", "moderated", "deleted"] as const).map((itemStatus) => {
      const points: MapDatum[] = filteredItems
        .filter((post) => post.status === itemStatus)
        .map((post) => ({
          name: displayName(post),
          value: [
            post.longitude,
            post.latitude,
            post.likes_count + post.comments_count,
          ],
          postId: post.id,
          author: displayName(post),
          content: post.content,
          status: post.status,
        }));

      return {
        name: statusCopy[itemStatus].plural,
        type: "scatter" as const,
        coordinateSystem: "geo" as const,
        data: points,
        symbolSize: (value: unknown) => {
          const activity = Array.isArray(value) ? Number(value[2] ?? 0) : 0;
          return Math.min(22, 8 + Math.sqrt(Math.max(activity, 0)) * 1.7);
        },
        itemStyle: {
          color: palette[itemStatus],
          borderColor: theme === "dark" ? "#1d2125" : "#ffffff",
          borderWidth: 1.5,
          opacity: 0.92,
        },
        emphasis: {
          scale: 1.45,
          itemStyle: { opacity: 1, borderWidth: 2.5 },
        },
        large: points.length > 2000,
        largeThreshold: 2000,
        progressive: 800,
        progressiveThreshold: 1200,
      };
    });

    return {
      backgroundColor: "transparent",
      aria: {
        enabled: true,
        label: { description: `Mapa mundial con ${filteredItems.length} publicaciones geolocalizadas.` },
      },
      tooltip: {
        trigger: "item",
        renderMode: "richText",
        backgroundColor: theme === "dark" ? "#282e33" : "#ffffff",
        borderColor: palette.border,
        borderWidth: 1,
        padding: 10,
        textStyle: { color: palette.ink, fontSize: 12 },
        formatter: (params: unknown) => {
          const datum = (params as { data?: MapDatum }).data;
          if (!datum) return "";
          const activity = datum.value[2];
          return `${datum.author}\n${truncate(datum.content, 62)}\n${statusCopy[datum.status].label} · ${activity} interacciones`;
        },
      },
      legend: {
        top: 8,
        right: 12,
        itemWidth: 8,
        itemHeight: 8,
        icon: "circle",
        textStyle: { color: palette.muted, fontSize: 11 },
      },
      geo: {
        map: MAP_NAME,
        roam: true,
        zoom: 1.08,
        scaleLimit: { min: 1, max: 18 },
        left: 18,
        right: 18,
        top: 48,
        bottom: 18,
        itemStyle: {
          areaColor: palette.land,
          borderColor: palette.border,
          borderWidth: 0.65,
        },
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: palette.landHover },
        },
        selectedMode: false,
      },
      series,
    };
  }, [filteredItems, theme]);

  const handleMapClick = (params: unknown) => {
    const postId = (params as { data?: { postId?: unknown } }).data?.postId;
    if (typeof postId === "string") setSelectedId(postId);
  };

  const metricItems = [
    { key: "all", label: "Con ubicacion", value: data?.total ?? 0 },
    { key: "visible", label: "Visibles", value: data?.visible ?? 0 },
    { key: "moderated", label: "Moderados", value: data?.moderated ?? 0 },
    { key: "deleted", label: "Eliminados", value: data?.deleted ?? 0 },
  ] as const;

  return (
    <div className="page map-page">
      <PageHeader
        eyebrow="Geospatial operations"
        title="Mapa global"
        description="Explora todas las publicaciones geolocalizadas, su estado y la actividad de la comunidad desde una unica vista administrativa."
        action={(
          <div className="header-controls">
            <div className="range-control" aria-label="Periodo del mapa">
              {([30, 90, 0] as PostMapRange[]).map((days) => (
                <button
                  key={days}
                  className={range === days ? "is-active" : ""}
                  type="button"
                  aria-pressed={range === days}
                  onClick={() => setRange(days)}
                >
                  {days === 0 ? "Todo" : `${days}d`}
                </button>
              ))}
            </div>
            <button className="button button-secondary" type="button" disabled={loading} onClick={() => void load()}>
              <RefreshCw className={loading ? "spin" : ""} size={17} />
              <span>Actualizar</span>
            </button>
          </div>
        )}
      />

      <div className="map-privacy-note" role="note">
        <LockKeyhole size={18} />
        <div>
          <strong>Vista administrativa restringida</strong>
          <span>Incluye coordenadas exactas aunque el autor no comparta su ubicacion publicamente. Evita exportarlas o distribuirlas.</span>
        </div>
      </div>

      <section className="map-metric-grid" aria-label="Resumen de publicaciones geolocalizadas">
        {metricItems.map((item) => (
          <button
            key={item.key}
            className={status === item.key ? `map-metric is-active map-metric-${item.key}` : `map-metric map-metric-${item.key}`}
            type="button"
            aria-pressed={status === item.key}
            onClick={() => setStatus(item.key)}
          >
            <span>{item.label}</span>
            <strong>{formatNumber(item.value)}</strong>
          </button>
        ))}
      </section>

      <div className="map-toolbar">
        <label className="search-control map-search-control">
          <Search size={17} />
          <input
            type="search"
            value={search}
            placeholder="Buscar texto, autor o categoria"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="map-result-count">
          <Layers3 size={16} />
          <span>{formatNumber(filteredItems.length)} puntos en vista</span>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {mapError ? <ErrorState message={mapError} /> : null}
      {loading && !data ? <LoadingState label="Cargando publicaciones geolocalizadas" /> : null}

      {data ? (
        <section className={loading ? "map-workspace is-updating" : "map-workspace"}>
          <div className="map-panel">
            <header className="map-panel-header">
              <div>
                <span className="panel-kicker">Cobertura mundial</span>
                <h2>Distribucion de publicaciones</h2>
              </div>
              <span className="map-interaction-hint"><MousePointer2 size={14} /> Arrastra y usa la rueda para explorar</span>
            </header>

            {mapReady ? (
              <DataChart
                className="data-chart-world"
                option={mapOption}
                label={`Mapa mundial con ${filteredItems.length} publicaciones geolocalizadas`}
                onClick={handleMapClick}
              />
            ) : mapError ? null : (
              <LoadingState label="Preparando cartografia" />
            )}

            {mapReady && filteredItems.length === 0 ? (
              <div className="map-empty-overlay">
                <EmptyState title="No hay puntos para mostrar" description="Cambia el estado, el periodo o la busqueda." />
              </div>
            ) : null}
          </div>

          <aside className="map-inspector" aria-label="Detalle de publicaciones del mapa">
            <header className="map-inspector-header">
              <div>
                <span className="panel-kicker">Inspector</span>
                <h2>{selectedPost ? "Publicacion seleccionada" : "Publicaciones"}</h2>
              </div>
              <Badge tone="accent">{filteredItems.length}</Badge>
            </header>

            {selectedPost ? (
              <article className="map-post-detail">
                <div className="map-post-author">
                  <Avatar src={selectedPost.avatar_url} name={displayName(selectedPost)} size="medium" />
                  <div>
                    <strong>{displayName(selectedPost)}</strong>
                    <span>{selectedPost.username ? `@${selectedPost.username}` : "Sin nombre de usuario"}</span>
                  </div>
                  <Badge tone={statusCopy[selectedPost.status].tone}>{statusCopy[selectedPost.status].label}</Badge>
                </div>

                <p>{truncate(selectedPost.content, 280)}</p>

                <dl className="map-post-metadata">
                  <div><dt>Coordenadas</dt><dd><MapPin size={14} /> {coordinates(selectedPost)}</dd></div>
                  <div><dt>Fecha</dt><dd>{formatDate(selectedPost.created_at)}</dd></div>
                  <div><dt>Categoria</dt><dd>{selectedPost.category_name || "Sin categoria"}</dd></div>
                  <div><dt>Ubicacion publica</dt><dd>{selectedPost.share_location ? "Si" : "No, solo administradores"}</dd></div>
                </dl>

                <div className="map-post-engagement" aria-label="Interacciones de la publicacion">
                  <span><Heart size={15} /> {selectedPost.likes_count}</span>
                  <span><MessageCircle size={15} /> {selectedPost.comments_count}</span>
                  <span className={selectedPost.report_count > 0 ? "has-alert" : ""}><ShieldAlert size={15} /> {selectedPost.report_count}</span>
                </div>

                {selectedPost.moderation_reason ? (
                  <div className="map-moderation-reason">
                    <ShieldAlert size={15} />
                    <span><strong>Motivo de moderacion</strong>{selectedPost.moderation_reason}</span>
                  </div>
                ) : null}

                <button className="button button-secondary button-full" type="button" onClick={() => onNavigate("posts")}>
                  <Eye size={16} />
                  <span>Abrir publicaciones</span>
                </button>
              </article>
            ) : null}

            <div className="map-post-list-header">
              <strong>Posts en esta vista</strong>
              <span>Mas recientes primero</span>
            </div>
            <div className="map-post-list">
              {filteredItems.slice(0, 30).map((post) => (
                <button
                  key={post.id}
                  className={post.id === selectedId ? "map-post-list-item is-active" : "map-post-list-item"}
                  type="button"
                  onClick={() => setSelectedId(post.id)}
                >
                  <span className={`map-status-dot map-status-${post.status}`} />
                  <span>
                    <strong>{displayName(post)}</strong>
                    <small>{truncate(post.content, 62)}</small>
                  </span>
                  <MapPin size={14} />
                </button>
              ))}
            </div>
            {filteredItems.length > 30 ? (
              <span className="map-list-limit">Mostrando los 30 mas recientes. Todos los puntos siguen visibles en el mapa.</span>
            ) : null}
          </aside>
        </section>
      ) : null}
    </div>
  );
}
