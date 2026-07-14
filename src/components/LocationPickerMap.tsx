import { useEffect, useRef } from "react";
import maplibregl, {
  type Map as MapLibreMap,
  type Marker as MapLibreMarker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Theme } from "../types";

export type SelectedLocation = {
  latitude: number;
  longitude: number;
};

const mapStyles: Record<Theme, string> = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/fiord",
};

export default function LocationPickerMap({
  value,
  theme,
  onChange,
}: {
  value: SelectedLocation | null;
  theme: Theme;
  onChange: (location: SelectedLocation) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({
        color: theme === "dark" ? "#579dff" : "#0c66e4",
        draggable: true,
      })
        .setLngLat([value.longitude, value.latitude])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const coordinates = markerRef.current?.getLngLat();
        if (!coordinates) return;
        onChangeRef.current({
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        });
      });
    } else {
      markerRef.current.setLngLat([value.longitude, value.latitude]);
    }
    if (!map.getBounds().contains([value.longitude, value.latitude])) {
      map.easeTo({
        center: [value.longitude, value.latitude],
        zoom: Math.max(map.getZoom(), 12),
        duration: 420,
      });
    }
  }, [theme, value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyles[theme],
      center: valueRef.current
        ? [valueRef.current.longitude, valueRef.current.latitude]
        : [-63.6167, -38.4161],
      zoom: valueRef.current ? 13 : 3.2,
      maxZoom: 19,
      cooperativeGestures: true,
      renderWorldCopies: false,
      attributionControl: false,
    });
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: false }),
      "top-right",
    );
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    const placeMarker = (location: SelectedLocation) => {
      if (!markerRef.current) {
        markerRef.current = new maplibregl.Marker({
          color: theme === "dark" ? "#579dff" : "#0c66e4",
          draggable: true,
        })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map);

        markerRef.current.on("dragend", () => {
          const coordinates = markerRef.current?.getLngLat();
          if (!coordinates) return;
          onChangeRef.current({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
          });
        });
      } else {
        markerRef.current.setLngLat([location.longitude, location.latitude]);
      }
    };

    if (valueRef.current) placeMarker(valueRef.current);

    map.on("click", (event) => {
      const location = {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      };
      placeMarker(location);
      onChangeRef.current(location);
    });

    return () => {
      resizeObserver.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="location-picker-map"
      role="application"
      aria-label="Mapa para seleccionar las coordenadas de la publicacion"
    />
  );
}
