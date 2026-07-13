import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import {
  BarChart,
  GraphChart,
  LineChart,
  PieChart,
  ScatterChart,
} from "echarts/charts";
import {
  AriaComponent,
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  GeoComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([
  AriaComponent,
  BarChart,
  CanvasRenderer,
  DataZoomComponent,
  DatasetComponent,
  GraphChart,
  GeoComponent,
  GridComponent,
  LabelLayout,
  LegendComponent,
  LineChart,
  PieChart,
  ScatterChart,
  TooltipComponent,
  UniversalTransition,
]);

export type ChartOption = EChartsCoreOption;

export const registerMap = (
  name: string,
  geoJson: Parameters<typeof echarts.registerMap>[1],
) => echarts.registerMap(name, geoJson);

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
};

export default function DataChart({
  option,
  label,
  className = "",
  onClick,
  useDirtyRect = true,
}: {
  option: ChartOption;
  label: string;
  className?: string;
  onClick?: (params: unknown) => void;
  useDirtyRect?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const reducedMotion = useReducedMotion();
  const onClickRef = useRef(onClick);

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current, undefined, {
      renderer: "canvas",
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      useDirtyRect,
    });
    chartRef.current = chart;
    chart.on("click", (params) => onClickRef.current?.(params));

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [useDirtyRect]);

  useEffect(() => {
    chartRef.current?.setOption(
      {
        ...option,
        animation: !reducedMotion,
        animationDuration: reducedMotion ? 0 : 520,
        animationDurationUpdate: reducedMotion ? 0 : 360,
        animationEasing: "cubicOut",
        animationEasingUpdate: "cubicOut",
      },
      { notMerge: true, lazyUpdate: true },
    );
  }, [option, reducedMotion, useDirtyRect]);

  return (
    <div
      ref={containerRef}
      className={`data-chart ${className}`.trim()}
      role="img"
      aria-label={label}
    />
  );
}
