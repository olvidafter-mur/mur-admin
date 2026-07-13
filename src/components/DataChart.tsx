import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import {
  BarChart,
  GraphChart,
  LineChart,
  PieChart,
} from "echarts/charts";
import {
  AriaComponent,
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
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
  GridComponent,
  LabelLayout,
  LegendComponent,
  LineChart,
  PieChart,
  TooltipComponent,
  UniversalTransition,
]);

export type ChartOption = EChartsCoreOption;

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
}: {
  option: ChartOption;
  label: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current, undefined, {
      renderer: "canvas",
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      useDirtyRect: true,
    });
    chartRef.current = chart;

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

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
  }, [option, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`data-chart ${className}`.trim()}
      role="img"
      aria-label={label}
    />
  );
}
