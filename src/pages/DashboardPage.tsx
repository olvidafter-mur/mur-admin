import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Info,
  Minus,
  Network,
  RefreshCw,
  ShieldAlert,
  Timer,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import DataChart, { type ChartOption } from "../components/DataChart";
import { getAnalytics } from "../lib/adminApi";
import { formatDate, formatNumber, truncate } from "../lib/format";
import type {
  AdminAnalyticsData,
  AdminView,
  AnalyticsOverview,
  AnalyticsRange,
  Theme,
} from "../types";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "../components/ui";

const dateLabel = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

const getChartColors = (theme: Theme) => theme === "dark" ? {
  lime: "#579dff",
  cyan: "#60c6d2",
  violet: "#b8acf6",
  coral: "#fd9891",
  amber: "#f5cd47",
  ink: "#22272b",
  text: "#f7f8f9",
  muted: "#b6c2cf",
  grid: "rgba(182,194,207,0.16)",
  tooltipBackground: "#282e33",
  tooltipBorder: "#505a62",
  area: "rgba(87,157,255,0.14)",
} : {
  lime: "#0c66e4",
  cyan: "#0e7c86",
  violet: "#6e5dc6",
  coral: "#ae2e24",
  amber: "#974f0c",
  ink: "#ffffff",
  text: "#172b4d",
  muted: "#626f86",
  grid: "rgba(9,30,66,0.12)",
  tooltipBackground: "#ffffff",
  tooltipBorder: "#dcdfe4",
  area: "rgba(12,102,228,0.12)",
};

const getTooltip = (colors: ReturnType<typeof getChartColors>) => ({
  trigger: "axis" as const,
  renderMode: "richText" as const,
  backgroundColor: colors.tooltipBackground,
  borderColor: colors.tooltipBorder,
  borderWidth: 1,
  textStyle: { color: colors.text, fontSize: 12 },
  axisPointer: { type: "line" as const, lineStyle: { color: colors.lime } },
});

const change = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const formatDelta = (value: number) => `${Math.abs(value).toFixed(0)}%`;

const getOperationalPulse = (overview: AnalyticsOverview) => {
  const activityDelta = change(overview.active_users, overview.active_users_previous);
  const reportRate = overview.posts > 0
    ? (overview.reports / overview.posts) * 100
    : overview.reports > 0 ? 100 : 0;
  const score = Math.round(clamp(
    100
      - Math.min(reportRate * 4, 30)
      - Math.min(overview.reports_pending * 2.5, 30)
      - (activityDelta < 0 ? Math.min(Math.abs(activityDelta) * 0.4, 20) : 0),
    0,
    100,
  ));

  if (score >= 82) return { score, label: "Estable", tone: "success" as const };
  if (score >= 62) return { score, label: "Atencion", tone: "warning" as const };
  return { score, label: "Prioridad", tone: "danger" as const };
};

function MetricCard({
  icon,
  label,
  value,
  current,
  previous,
  detail,
  inverse = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  current: number;
  previous: number;
  detail: string;
  inverse?: boolean;
}) {
  const delta = change(current, previous);
  const positive = inverse ? delta < 0 : delta > 0;
  const negative = inverse ? delta > 0 : delta < 0;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <article className="metric-card metric-card-v2">
      <div className="metric-card-topline">
        <span className="metric-icon-v2">{icon}</span>
        <span className={`metric-trend ${positive ? "is-positive" : negative ? "is-negative" : ""}`}>
          <TrendIcon size={14} />
          {formatDelta(delta)}
        </span>
      </div>
      <span className="metric-label">{label}</span>
      <strong>{formatNumber(value)}</strong>
      <small>{detail} · vs. periodo anterior</small>
    </article>
  );
}

const activityOption = (data: AdminAnalyticsData, theme: Theme): ChartOption => {
  const colors = getChartColors(theme);
  return {
    aria: {
      enabled: true,
      description: `Actividad de Mur durante ${data.window_days} dias: usuarios activos, publicaciones e interacciones por dia.`,
    },
    color: [colors.lime, colors.violet, colors.amber],
    tooltip: getTooltip(colors),
    legend: {
      top: 0,
      left: 0,
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: colors.muted, fontSize: 11 },
    },
    grid: { left: 12, right: 12, top: 45, bottom: 24, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.timeseries.map((point) =>
        dateLabel.format(new Date(`${point.date}T12:00:00`))),
      axisLine: { lineStyle: { color: colors.grid } },
      axisTick: { show: false },
      axisLabel: { color: colors.muted, fontSize: 10, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.muted, fontSize: 10 },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    dataZoom: [{ type: "inside", zoomOnMouseWheel: false, moveOnMouseWheel: true }],
    series: [
      {
        name: "Usuarios activos",
        type: "line",
        data: data.timeseries.map((point) => point.active_users),
        smooth: 0.32,
        showSymbol: false,
        lineStyle: { width: 2.5 },
        areaStyle: { color: colors.area },
        emphasis: { focus: "series" },
      },
      {
        name: "Publicaciones",
        type: "line",
        data: data.timeseries.map((point) => point.posts),
        smooth: 0.32,
        showSymbol: false,
        lineStyle: { width: 2 },
        emphasis: { focus: "series" },
      },
      {
        name: "Interacciones",
        type: "line",
        data: data.timeseries.map((point) => point.likes + point.comments),
        smooth: 0.32,
        showSymbol: false,
        lineStyle: { width: 2 },
        emphasis: { focus: "series" },
      },
    ],
  };
};

const categoryOption = (data: AdminAnalyticsData, theme: Theme): ChartOption => {
  const colors = getChartColors(theme);
  const categories = [...data.categories].reverse();
  return {
    aria: {
      enabled: true,
      description: `Comparacion de publicaciones e interacciones por categoria durante ${data.window_days} dias.`,
    },
    color: [colors.lime, colors.violet],
    tooltip: { ...getTooltip(colors), trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      top: 0,
      left: 0,
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: colors.muted, fontSize: 11 },
    },
    grid: { left: 8, right: 8, top: 42, bottom: 8, containLabel: true },
    xAxis: {
      type: "value",
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.muted, fontSize: 10 },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    yAxis: {
      type: "category",
      data: categories.map((category) => category.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.text, fontSize: 11 },
    },
    series: [
      {
        name: "Publicaciones",
        type: "bar",
        data: categories.map((category) => category.posts),
        barMaxWidth: 9,
        itemStyle: { borderRadius: 5 },
      },
      {
        name: "Interacciones",
        type: "bar",
        data: categories.map((category) => category.interactions),
        barMaxWidth: 9,
        itemStyle: { borderRadius: 5 },
      },
    ],
  };
};

const segmentOption = (data: AdminAnalyticsData, theme: Theme): ChartOption => {
  const colors = getChartColors(theme);
  return {
    aria: {
      enabled: true,
      description: `Distribucion de usuarios por nivel de participacion durante ${data.window_days} dias.`,
    },
    color: [colors.violet, colors.lime, colors.amber, theme === "dark" ? "#596773" : "#b3b9c4"],
    tooltip: { ...getTooltip(colors), trigger: "item" },
    series: [
      {
        name: "Segmentos",
        type: "pie",
        radius: ["58%", "80%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        itemStyle: { borderColor: colors.ink, borderWidth: 4, borderRadius: 8 },
        emphasis: { scaleSize: 5 },
        data: data.segments.map((segment) => ({
          name: segment.label,
          value: segment.users,
        })),
      },
    ],
  };
};

const networkOption = (data: AdminAnalyticsData, theme: Theme): ChartOption => {
  const colors = getChartColors(theme);
  const categoryIndex = { signal: 0, creator: 1, participant: 2 } as const;
  return {
    aria: {
      enabled: true,
      description: `Red agregada de ${data.network.nodes.length} usuarios conectados por interacciones con publicaciones. El tamano representa intensidad de actividad.`,
    },
    tooltip: {
      trigger: "item",
      renderMode: "richText",
      backgroundColor: colors.tooltipBackground,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 12 },
    },
    legend: {
      top: 0,
      left: 0,
      data: ["Con señal", "Creadores", "Participantes"],
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: colors.muted, fontSize: 11 },
    },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        scaleLimit: { min: 0.55, max: 2.8 },
        categories: [
          { name: "Con señal", itemStyle: { color: colors.coral } },
          { name: "Creadores", itemStyle: { color: colors.lime } },
          { name: "Participantes", itemStyle: { color: colors.violet } },
        ],
        data: data.network.nodes.map((node) => ({
          id: node.id,
          name: node.name,
          value: node.activity,
          category: categoryIndex[node.segment],
          symbolSize: clamp(12 + Math.sqrt(node.activity) * 4, 14, 48),
        })),
        links: data.network.edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          value: edge.weight,
          lineStyle: { width: clamp(0.6 + Math.sqrt(edge.weight) * 0.45, 1, 5) },
        })),
        force: { repulsion: 140, gravity: 0.08, edgeLength: [55, 125] },
        label: { show: false, color: colors.text, fontSize: 10 },
        lineStyle: { color: "source", opacity: 0.22, curveness: 0.08 },
        emphasis: {
          focus: "adjacency",
          label: { show: true },
          lineStyle: { opacity: 0.85 },
        },
      },
    ],
  };
};

export default function DashboardPage({
  theme,
  onNavigate,
}: {
  theme: Theme;
  onNavigate: (view: AdminView) => void;
}) {
  const [range, setRange] = useState<AnalyticsRange>(30);
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalytics(range));
    } catch (loadError) {
      setError(loadError instanceof Error
        ? loadError.message
        : "No se pudo cargar la inteligencia operativa.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const pulse = useMemo(
    () => data ? getOperationalPulse(data.overview) : null,
    [data],
  );
  const activeDelta = data
    ? change(data.overview.active_users, data.overview.active_users_previous)
    : 0;
  const activityChart = useMemo(() => data ? activityOption(data, theme) : {}, [data, theme]);
  const categoryChart = useMemo(() => data ? categoryOption(data, theme) : {}, [data, theme]);
  const segmentChart = useMemo(() => data ? segmentOption(data, theme) : {}, [data, theme]);
  const behaviorChart = useMemo(() => data ? networkOption(data, theme) : {}, [data, theme]);

  return (
    <div className="page analytics-page">
      <PageHeader
        title="Resumen operativo"
        description="Actividad de la comunidad, moderación y tendencias del período seleccionado."
        action={
          <div className="header-controls">
            <div className="range-control" aria-label="Ventana temporal">
              {([7, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  className={range === days ? "is-active" : ""}
                  type="button"
                  aria-pressed={range === days}
                  onClick={() => setRange(days)}
                >
                  {days}d
                </button>
              ))}
            </div>
            <button
              className="button button-secondary button-icon-label"
              type="button"
              disabled={loading}
              onClick={load}
            >
              <RefreshCw className={loading ? "spin" : ""} size={16} />
              <span>Actualizar</span>
            </button>
          </div>
        }
      />

      {error ? <ErrorState message={error} /> : null}
      {loading && !data ? <LoadingState label="Modelando actividad" /> : null}

      {data && pulse ? (
        <>
          <section className="pulse-hero" aria-labelledby="pulse-title">
            <div className="pulse-copy">
              <span className="section-kicker">Resumen del período</span>
              <h2 id="pulse-title">
                {activeDelta >= 0
                  ? `La actividad crecio ${formatDelta(activeDelta)}.`
                  : `La actividad bajo ${formatDelta(activeDelta)}.`}
              </h2>
              <p>
                {data.overview.reports_pending === 0
                  ? "La cola de moderacion esta al dia."
                  : `${data.overview.reports_pending} casos esperan una decision.`}
                {" "}Las señales son orientativas y nunca ejecutan sanciones automaticas.
              </p>
              <div className="pulse-meta">
                <span><Activity size={14} /> Datos agregados</span>
                <span><Clock3 size={14} /> Actualizado {formatDate(data.generated_at)}</span>
              </div>
            </div>

            <div className="health-module">
              <div className="health-score">
                <strong>{pulse.score}</strong><span>/100</span>
              </div>
              <div>
                <span>Índice operativo</span>
                <Badge tone={pulse.tone}>{pulse.label}</Badge>
                <small>Actividad, reportes y backlog</small>
              </div>
            </div>
          </section>

          <section className="metric-grid metric-grid-v2" aria-label="Indicadores principales">
            <MetricCard
              icon={<UsersRound size={19} />}
              label="Usuarios activos"
              value={data.overview.active_users}
              current={data.overview.active_users}
              previous={data.overview.active_users_previous}
              detail={`${data.overview.users_new} altas nuevas`}
            />
            <MetricCard
              icon={<FileText size={19} />}
              label="Publicaciones"
              value={data.overview.posts}
              current={data.overview.posts}
              previous={data.overview.posts_previous}
              detail={`${data.window_days} dias observados`}
            />
            <MetricCard
              icon={<Activity size={19} />}
              label="Interacciones"
              value={data.overview.interactions}
              current={data.overview.interactions}
              previous={data.overview.interactions_previous}
              detail="Me gusta + comentarios"
            />
            <MetricCard
              icon={<ShieldAlert size={19} />}
              label="Reportes"
              value={data.overview.reports}
              current={data.overview.reports}
              previous={data.overview.reports_previous}
              detail={`${data.overview.reports_pending} pendientes`}
              inverse
            />
          </section>

          <section className="operations-rail" aria-label="Operacion de confianza y seguridad">
            <div className="operations-heading">
              <span className="panel-kicker">Moderación</span>
              <strong>Estado de la operación</strong>
            </div>
            <div className="operation-stat">
              <span><ShieldAlert size={16} /></span>
              <div><small>Backlog</small><strong>{formatNumber(data.overview.reports_pending)}</strong></div>
            </div>
            <div className="operation-stat">
              <span><CheckCircle2 size={16} /></span>
              <div><small>Revisados</small><strong>{formatNumber(data.overview.reports_reviewed)}</strong></div>
            </div>
            <div className="operation-stat">
              <span><Timer size={16} /></span>
              <div><small>Mediana de revision</small><strong>{data.overview.median_review_hours === null ? "—" : `${Number(data.overview.median_review_hours).toFixed(1)} h`}</strong></div>
            </div>
            <div className="operation-stat">
              <span><History size={16} /></span>
              <div><small>Acciones auditadas</small><strong>{formatNumber(data.overview.admin_actions)}</strong></div>
            </div>
          </section>

          <section className="analytics-grid">
            <article className="analytics-panel analytics-panel-wide">
              <header className="panel-heading">
                <div>
                  <span className="panel-kicker">Pulso diario</span>
                  <h2>Evolución de la actividad</h2>
                  <p>Usuarios activos, publicaciones e interacciones en la misma ventana temporal.</p>
                </div>
                <Badge tone="accent">{data.window_days} dias</Badge>
              </header>
              <DataChart
                option={activityChart}
                label={`Serie temporal de actividad durante ${data.window_days} dias`}
                className="data-chart-primary"
              />
            </article>

            <article className="analytics-panel">
              <header className="panel-heading">
                <div>
                  <span className="panel-kicker">Contenido</span>
                  <h2>Actividad por categoría</h2>
                  <p>Volumen de publicaciones y respuesta de la comunidad.</p>
                </div>
              </header>
              <DataChart
                option={categoryChart}
                label="Publicaciones e interacciones por categoria"
                className="data-chart-categories"
              />
            </article>

            <article className="analytics-panel audience-panel">
              <header className="panel-heading">
                <div>
                  <span className="panel-kicker">Participación</span>
                  <h2>Distribución de usuarios</h2>
                  <p>Segmentos calculados a partir de actividad observable.</p>
                </div>
              </header>
              <div className="audience-content">
                <DataChart
                  option={segmentChart}
                  label="Distribucion de segmentos de participacion"
                  className="data-chart-segments"
                />
                <div className="segment-list">
                  {data.segments.map((segment, index) => (
                    <div key={segment.key}>
                      <span className={`segment-dot segment-dot-${index}`} />
                      <span><strong>{segment.label}</strong><small>{segment.description}</small></span>
                      <b>{formatNumber(segment.users)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="analytics-panel signals-panel">
              <header className="panel-heading">
                <div>
                  <span className="panel-kicker">Revisión recomendada</span>
                  <h2>Señales de riesgo</h2>
                  <p>Casos que superaron umbrales objetivos y requieren revisión humana.</p>
                </div>
                <ShieldAlert size={19} />
              </header>
              {data.signals.length === 0 ? (
                <EmptyState
                  title="Sin patrones destacados"
                  description="No se superaron los umbrales del periodo."
                />
              ) : (
                <div className="signal-list">
                  {data.signals.map((signal) => (
                    <div className="signal-row" key={`${signal.kind}-${signal.user_id}`}>
                      <span className={`signal-marker signal-marker-${signal.severity}`} />
                      <div>
                        <span>{signal.user_name}</span>
                        <strong>{signal.title}</strong>
                        <small>{signal.detail}</small>
                      </div>
                      <Badge tone={signal.severity === "high" ? "danger" : signal.severity === "medium" ? "warning" : "neutral"}>
                        {signal.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="explainability-note">
                <Info size={15} />
                <span>Actividad inusual = al menos 6 posts y promedio + 2 desviaciones. Reportes y bloqueos usan conteos directos.</span>
              </div>
            </article>

            <article className="analytics-panel analytics-panel-network">
              <header className="panel-heading">
                <div>
                  <span className="panel-kicker">Relaciones</span>
                  <h2>Red de interacciones</h2>
                  <p>Relaciones agregadas entre participantes y autores. Muestra hasta 90 conexiones relevantes.</p>
                </div>
                <div className="network-summary">
                  <Network size={17} />
                  <span>{data.network.nodes.length} nodos · {data.network.edges.length} conexiones</span>
                </div>
              </header>
              {data.network.nodes.length === 0 ? (
                <EmptyState
                  title="Todavia no hay una red visible"
                  description="Se necesitan interacciones entre usuarios durante el periodo."
                />
              ) : (
                <DataChart
                  option={behaviorChart}
                  label="Red agregada de interacciones entre usuarios"
                  className="data-chart-network"
                />
              )}
            </article>
          </section>

          <section className="section-block recent-cases">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Moderación</span>
                <h2>Reportes recientes</h2>
                <p>Últimos casos pendientes de revisión por el equipo.</p>
              </div>
              <button className="button button-quiet" type="button" onClick={() => onNavigate("reports")}>
                <span>Abrir reportes</span><ArrowRight size={17} />
              </button>
            </div>

            {data.recent_reports.length === 0 ? (
              <EmptyState title="Sin reportes pendientes" description="La cola de moderacion esta al dia." />
            ) : (
              <div className="case-grid">
                {data.recent_reports.map((report) => (
                  <article className="case-card" key={report.id}>
                    <div className="case-card-topline">
                      <Badge tone="danger">{report.reason}</Badge>
                      <span>{formatDate(report.created_at)}</span>
                    </div>
                    <p>{truncate(report.post_content, 130)}</p>
                    <footer>
                      <span>Autor: <strong>{report.author_name}</strong></span>
                      <span>Reporto: <strong>{report.reporter_name}</strong></span>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
