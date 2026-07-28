import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Eye,
  Globe2,
  Heart,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Map as MapIcon,
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
import StreetPostMap from "../components/StreetPostMap";
import {
  Avatar,
  Badge,
  ErrorState,
  LoadingState,
  PageHeader,
} from "../components/ui";
import { getGlobalPostMap } from "../lib/adminApi";
import { displayName, formatDate, formatNumber, truncate } from "../lib/format";
import {
  featuresWithinFeature,
  featureName,
  fittedLayoutSize,
  getCountryDivisions,
  getCountrySubdivisions,
  normalizeWorldCollection,
  pointInFeature,
  type CountryDivisions,
  type CountryReference,
  type GeoFeature,
  type GeoFeatureCollection,
} from "../lib/geo";
import type {
  AdminView,
  GlobalMapPost,
  GlobalPostMapData,
  PostMapRange,
  PostMapStatus,
  Theme,
} from "../types";

const MAP_NAME = "mur-world";
type MapView = "political" | "street";

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

type CountryLayer = {
  country: CountryReference;
  divisions: CountryDivisions;
  mapName: string;
};

type SubdivisionLayer = {
  division: GeoFeature;
  subdivisions: CountryDivisions;
  collection: GeoFeatureCollection;
  mapName: string;
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
  const [worldCollection, setWorldCollection] = useState<GeoFeatureCollection | null>(null);
  const [countries, setCountries] = useState<CountryReference[]>([]);
  const [countryLayer, setCountryLayer] = useState<CountryLayer | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<GeoFeature | null>(null);
  const [subdivisionLayer, setSubdivisionLayer] = useState<SubdivisionLayer | null>(null);
  const [selectedSubdivision, setSelectedSubdivision] = useState<GeoFeature | null>(null);
  const [mapView, setMapView] = useState<MapView>("street");
  const [mapViewport, setMapViewport] = useState({ width: 0, height: 0 });
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const drillRequestRef = useRef(0);

  useEffect(() => {
    let active = true;

    void fetch(`${import.meta.env.BASE_URL}world.json`)
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar la cartografia.");
        return response.json() as Promise<GeoFeatureCollection>;
      })
      .then((world) => {
        const normalized = normalizeWorldCollection(world);
        registerMap(
          MAP_NAME,
          normalized.collection as Parameters<typeof registerMap>[1],
        );
        if (active) {
          setWorldCollection(normalized.collection);
          setCountries(normalized.countries);
          setMapReady(true);
        }
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

  useLayoutEffect(() => {
    const panel = mapPanelRef.current;
    const chart = panel?.querySelector<HTMLElement>(".data-chart-world");
    if (!chart) return;

    const updateSize = (width: number, height: number) => {
      const next = { width: Math.round(width), height: Math.round(height) };
      setMapViewport((current) => (
        current.width === next.width && current.height === next.height ? current : next
      ));
    };

    updateSize(chart.clientWidth, chart.clientHeight);
    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(chart);

    return () => observer.disconnect();
  }, [data, mapReady, mapView]);

  const enterCountry = useCallback(async (country: CountryReference) => {
    const requestId = ++drillRequestRef.current;
    setDrillLoading(true);
    setDrillError(null);

    try {
      const divisions = await getCountryDivisions(country.iso3);
      if (requestId !== drillRequestRef.current) return;

      const mapName = `mur-adm1-${country.iso3.toLowerCase()}`;
      registerMap(
        mapName,
        divisions.collection as Parameters<typeof registerMap>[1],
      );
      setCountryLayer({ country, divisions, mapName });
      setSelectedDivision(null);
      setSubdivisionLayer(null);
      setSelectedSubdivision(null);
    } catch (loadError) {
      if (requestId === drillRequestRef.current) {
        setDrillError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar las divisiones administrativas.",
        );
      }
    } finally {
      if (requestId === drillRequestRef.current) setDrillLoading(false);
    }
  }, []);

  const enterDivision = useCallback(async (division: GeoFeature) => {
    if (!countryLayer) return;

    const requestId = ++drillRequestRef.current;
    setDrillLoading(true);
    setDrillError(null);

    try {
      const subdivisions = await getCountrySubdivisions(countryLayer.country.iso3);
      if (requestId !== drillRequestRef.current) return;

      const collection = featuresWithinFeature(subdivisions.collection, division);
      if (collection.features.length === 0) {
        throw new Error("Esta provincia no tiene divisiones administrativas disponibles.");
      }

      const divisionKey = String(
        division.properties.shapeID ?? featureName(division),
      ).replace(/[^a-zA-Z0-9]+/g, "-");
      const mapName = `mur-adm2-${countryLayer.country.iso3.toLowerCase()}-${divisionKey}`;
      registerMap(
        mapName,
        collection as Parameters<typeof registerMap>[1],
      );
      setSelectedDivision(division);
      setSubdivisionLayer({ division, subdivisions, collection, mapName });
      setSelectedSubdivision(null);
    } catch (loadError) {
      if (requestId === drillRequestRef.current) {
        setDrillError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar las divisiones de esta provincia.",
        );
      }
    } finally {
      if (requestId === drillRequestRef.current) setDrillLoading(false);
    }
  }, [countryLayer]);

  const showWorld = () => {
    drillRequestRef.current += 1;
    setCountryLayer(null);
    setSelectedDivision(null);
    setSubdivisionLayer(null);
    setSelectedSubdivision(null);
    setDrillLoading(false);
    setDrillError(null);
  };

  const showCountry = () => {
    drillRequestRef.current += 1;
    setSelectedDivision(null);
    setSubdivisionLayer(null);
    setSelectedSubdivision(null);
    setDrillLoading(false);
    setDrillError(null);
  };

  const scopedItems = useMemo(() => {
    const items = data?.items ?? [];
    const boundary = selectedSubdivision
      ?? selectedDivision
      ?? countryLayer?.country.feature;
    if (!boundary) return items;

    return items.filter((post) => pointInFeature(
      [post.longitude, post.latitude],
      boundary,
    ));
  }, [countryLayer, data, selectedDivision, selectedSubdivision]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return scopedItems.filter((post) => {
      if (status !== "all" && post.status !== status) return false;
      if (!query) return true;

      return [
        post.content,
        post.username,
        post.display_name,
        post.category_name,
      ].some((value) => value?.toLocaleLowerCase("es").includes(query));
    });
  }, [scopedItems, search, status]);

  useEffect(() => {
    setSelectedId((current) => (
      current && filteredItems.some((post) => post.id === current)
        ? current
        : filteredItems[0]?.id ?? null
    ));
  }, [filteredItems]);

  const selectedPost = filteredItems.find((post) => post.id === selectedId) ?? null;
  const activeCollection = subdivisionLayer?.collection
    ?? countryLayer?.divisions.collection
    ?? worldCollection;
  const mapLayoutSize = useMemo(() => fittedLayoutSize(
    activeCollection,
    mapViewport.width,
    mapViewport.height,
  ), [activeCollection, mapViewport]);
  const scopeLabel = selectedSubdivision
    ? featureName(selectedSubdivision)
    : selectedDivision
    ? featureName(selectedDivision)
    : countryLayer?.country.name ?? "Mundo";
  const showDivisionLabels = Boolean(
    activeCollection && countryLayer && activeCollection.features.length <= 40,
  );
  const activeBoundaryMetadata = subdivisionLayer?.subdivisions.metadata
    ?? countryLayer?.divisions.metadata
    ?? null;
  const mapScopeKey = [
    countryLayer?.country.iso3 ?? "world",
    selectedDivision
      ? String(selectedDivision.properties.shapeID ?? featureName(selectedDivision))
      : "",
    selectedSubdivision
      ? String(selectedSubdivision.properties.shapeID ?? featureName(selectedSubdivision))
      : "",
  ].join(":");

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
          selectedLand: "#1c416d",
          selectedBorder: "#85b8ff",
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
          selectedLand: "#dbeafe",
          selectedBorder: "#0c66e4",
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
        label: { description: `Mapa de ${scopeLabel} con ${filteredItems.length} publicaciones geolocalizadas.` },
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
          const mapParams = params as { data?: MapDatum; name?: unknown };
          const datum = mapParams.data;
          if (!datum || typeof datum.postId !== "string") {
            return typeof mapParams.name === "string"
              ? `${mapParams.name}\nClick para explorar`
              : "";
          }
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
        map: subdivisionLayer?.mapName ?? countryLayer?.mapName ?? MAP_NAME,
        aspectScale: 1,
        roam: true,
        zoom: 1,
        scaleLimit: { min: 1, max: 18 },
        layoutCenter: ["50%", "54%"],
        layoutSize: mapLayoutSize ?? "100%",
        label: {
          show: showDivisionLabels,
          color: palette.muted,
          fontSize: 9,
        },
        itemStyle: {
          areaColor: palette.land,
          borderColor: palette.border,
          borderWidth: 0.65,
        },
        emphasis: {
          label: {
            show: Boolean(countryLayer),
            color: palette.ink,
            fontSize: 10,
          },
          itemStyle: { areaColor: palette.landHover },
        },
        regions: selectedSubdivision ? [{
          name: featureName(selectedSubdivision),
          itemStyle: {
            areaColor: palette.selectedLand,
            borderColor: palette.selectedBorder,
            borderWidth: 1.5,
          },
        }] : [],
        selectedMode: false,
      },
      series,
    };
  }, [countryLayer, filteredItems, mapLayoutSize, scopeLabel, selectedSubdivision, showDivisionLabels, subdivisionLayer, theme]);

  const handleMapClick = (params: unknown) => {
    const event = params as {
      componentType?: unknown;
      data?: { postId?: unknown };
      name?: unknown;
    };
    const postId = event.data?.postId;
    if (typeof postId === "string") {
      setSelectedId(postId);
      return;
    }

    if (event.componentType !== "geo" || typeof event.name !== "string") return;
    if (subdivisionLayer) {
      const subdivision = subdivisionLayer.collection.features.find(
        (feature) => featureName(feature) === event.name,
      );
      if (subdivision) setSelectedSubdivision(subdivision);
      return;
    }

    if (countryLayer) {
      const division = countryLayer.divisions.collection.features.find(
        (feature) => featureName(feature) === event.name,
      );
      if (division) void enterDivision(division);
      return;
    }

    const country = countries.find((item) => item.name === event.name);
    if (country) void enterCountry(country);
  };

  const metricItems = [
    { key: "all", label: "Con ubicacion", value: scopedItems.length },
    { key: "visible", label: "Visibles", value: scopedItems.filter((post) => post.status === "visible").length },
    { key: "moderated", label: "Moderados", value: scopedItems.filter((post) => post.status === "moderated").length },
    { key: "deleted", label: "Eliminados", value: scopedItems.filter((post) => post.status === "deleted").length },
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
          <span>{formatNumber(filteredItems.length)} puntos en {scopeLabel}</span>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {mapError && mapView === "political" ? <ErrorState message={mapError} /> : null}
      {drillError ? <ErrorState message={drillError} /> : null}
      {loading && !data ? <LoadingState label="Cargando publicaciones geolocalizadas" /> : null}

      {data ? (
        <section className={loading ? "map-workspace is-updating" : "map-workspace"}>
          <div ref={mapPanelRef} className="map-panel">
            <header className="map-panel-header">
              <div className="map-panel-title">
                <nav className="map-breadcrumb" aria-label="Nivel geografico">
                  <button
                    className={!countryLayer ? "is-current" : ""}
                    type="button"
                    aria-current={!countryLayer ? "location" : undefined}
                    onClick={showWorld}
                  >
                    <Globe2 size={13} /> Mundo
                  </button>
                  {countryLayer ? (
                    <>
                      <ChevronRight size={13} />
                      <button
                        className={!selectedDivision ? "is-current" : ""}
                        type="button"
                        aria-current={!selectedDivision ? "location" : undefined}
                        onClick={showCountry}
                      >
                        {countryLayer.country.name}
                      </button>
                    </>
                  ) : null}
                  {selectedDivision ? (
                    <>
                      <ChevronRight size={13} />
                      <button
                        className={!selectedSubdivision ? "is-current" : ""}
                        type="button"
                        aria-current={!selectedSubdivision ? "location" : undefined}
                        onClick={() => setSelectedSubdivision(null)}
                      >
                        {featureName(selectedDivision)}
                      </button>
                    </>
                  ) : null}
                  {selectedSubdivision ? (
                    <>
                      <ChevronRight size={13} />
                      <span>{featureName(selectedSubdivision)}</span>
                    </>
                  ) : null}
                </nav>
                <h2>
                  {subdivisionLayer
                    ? `Division departamental de ${featureName(subdivisionLayer.division)}`
                    : countryLayer
                    ? `Division politica de ${countryLayer.country.name}`
                    : "Distribucion mundial de publicaciones"}
                </h2>
              </div>
              <div className="map-panel-tools">
                <div className="map-view-switch" role="group" aria-label="Vista del mapa">
                  <button
                    className={mapView === "political" ? "is-active" : ""}
                    type="button"
                    aria-pressed={mapView === "political"}
                    onClick={() => setMapView("political")}
                  >
                    <Globe2 size={14} /> Politico
                  </button>
                  <button
                    className={mapView === "street" ? "is-active" : ""}
                    type="button"
                    aria-pressed={mapView === "street"}
                    onClick={() => setMapView("street")}
                  >
                    <MapIcon size={14} /> Mapa
                  </button>
                </div>
                <span className="map-interaction-hint">
                  <MousePointer2 size={14} />
                  {mapView === "street"
                    ? "Arrastra, acerca o selecciona un punto"
                    : subdivisionLayer
                      ? "Selecciona un departamento para filtrar"
                      : countryLayer
                        ? "Selecciona una provincia para ver sus departamentos"
                        : "Selecciona un pais para ver sus provincias"}
                </span>
              </div>
            </header>

            {mapView === "street" ? (
              <StreetPostMap
                posts={filteredItems}
                selectedId={selectedId}
                scopeKey={mapScopeKey}
                theme={theme}
                onSelect={setSelectedId}
              />
            ) : mapReady ? (
              <DataChart
                className="data-chart-world"
                option={mapOption}
                label={`Mapa de ${scopeLabel} con ${filteredItems.length} publicaciones geolocalizadas`}
                onClick={handleMapClick}
                useDirtyRect={false}
              />
            ) : mapError ? null : (
              <LoadingState label="Preparando cartografia" />
            )}

            {drillLoading ? (
              <div className="map-drill-overlay" role="status">
                <LoaderCircle className="spin" size={20} />
                <span>Cargando divisiones administrativas</span>
              </div>
            ) : null}

            {mapReady && filteredItems.length === 0 ? (
              <div className="map-no-posts-note">No hay publicaciones para los filtros actuales en {scopeLabel}.</div>
            ) : null}

            {mapView === "political" && countryLayer && activeBoundaryMetadata ? (
              <footer className="map-attribution">
                Limites: {activeBoundaryMetadata.boundarySource} · {activeBoundaryMetadata.boundaryLicense} ·{" "}
                <a
                  href={activeBoundaryMetadata.sourceUrl ?? "https://www.geoboundaries.org/"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {activeBoundaryMetadata.sourceLabel ?? "geoBoundaries"}
                </a>
              </footer>
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
