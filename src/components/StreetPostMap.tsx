import { useEffect, useMemo, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type FilterSpecification,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { displayName, truncate } from "../lib/format";
import type { GlobalMapPost, Theme } from "../types";

const POST_SOURCE = "mur-posts";
const CLUSTER_LAYER = "mur-post-clusters";
const CLUSTER_COUNT_LAYER = "mur-post-cluster-count";
const POINT_LAYER = "mur-post-points";
const SELECTED_POINT_LAYER = "mur-selected-post";
const MAP_TONE_LAYER = "mur-map-tone";

const mapStyles: Record<Theme, string> = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/fiord",
};

type PostFeatureProperties = {
  postId: string;
  author: string;
  content: string;
  status: GlobalMapPost["status"];
  activity: number;
};

const asFeatureCollection = (
  posts: GlobalMapPost[],
): FeatureCollection<Point, PostFeatureProperties> => ({
  type: "FeatureCollection",
  features: posts.map((post) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [post.longitude, post.latitude],
    },
    properties: {
      postId: post.id,
      author: displayName(post),
      content: truncate(post.content, 90),
      status: post.status,
      activity: post.likes_count + post.comments_count,
    },
  })),
});

const selectedPostFilter = (selectedId: string | null): FilterSpecification => [
  "==",
  ["get", "postId"],
  selectedId ?? "__none__",
];

const fitPosts = (
  map: MapLibreMap,
  posts: GlobalMapPost[],
  animate: boolean,
) => {
  if (posts.length === 0) {
    map.jumpTo({ center: [0, 18], zoom: 1.35 });
    return;
  }

  if (posts.length === 1) {
    map.easeTo({
      center: [posts[0].longitude, posts[0].latitude],
      zoom: 12,
      duration: animate ? 480 : 0,
    });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  posts.forEach((post) => bounds.extend([post.longitude, post.latitude]));
  map.fitBounds(bounds, {
    padding: { top: 72, right: 72, bottom: 72, left: 72 },
    maxZoom: 12,
    duration: animate ? 520 : 0,
  });
};

const addPostLayers = (
  map: MapLibreMap,
  data: FeatureCollection<Point, PostFeatureProperties>,
  selectedId: string | null,
  theme: Theme,
) => {
  const borderColor = theme === "dark" ? "#1d2125" : "#ffffff";

  if (theme === "dark") {
    map.addLayer({
      id: MAP_TONE_LAYER,
      type: "background",
      paint: {
        "background-color": "#0f172a",
        "background-opacity": 0.16,
      },
    });
  }

  map.addSource(POST_SOURCE, {
    type: "geojson",
    data,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 52,
  });
  map.addLayer({
    id: CLUSTER_LAYER,
    type: "circle",
    source: POST_SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#0c66e4",
        25,
        "#0e7490",
        100,
        "#5e4db2",
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        18,
        25,
        23,
        100,
        29,
      ],
      "circle-stroke-color": borderColor,
      "circle-stroke-width": 2,
      "circle-opacity": 0.94,
    },
  });
  map.addLayer({
    id: CLUSTER_COUNT_LAYER,
    type: "symbol",
    source: POST_SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
    },
    paint: { "text-color": "#ffffff" },
  });
  map.addLayer({
    id: POINT_LAYER,
    type: "circle",
    source: POST_SOURCE,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": [
        "match",
        ["get", "status"],
        "moderated",
        "#c9372c",
        "deleted",
        "#7e8da7",
        "#0c66e4",
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "activity"],
        0,
        6,
        20,
        9,
        100,
        13,
      ],
      "circle-stroke-color": borderColor,
      "circle-stroke-width": 2,
      "circle-opacity": 0.94,
    },
  });
  map.addLayer({
    id: SELECTED_POINT_LAYER,
    type: "circle",
    source: POST_SOURCE,
    filter: selectedPostFilter(selectedId),
    paint: {
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-radius": 14,
      "circle-stroke-color": theme === "dark" ? "#85b8ff" : "#0055cc",
      "circle-stroke-width": 3,
    },
  });
};

const popupContent = (properties: Partial<PostFeatureProperties>) => {
  const root = document.createElement("div");
  root.className = "street-map-popup-content";

  const author = document.createElement("strong");
  author.textContent = properties.author || "Usuario";
  const content = document.createElement("span");
  content.textContent = properties.content || "Publicacion sin texto";

  root.append(author, content);
  return root;
};

export default function StreetPostMap({
  posts,
  selectedId,
  onSelect,
  scopeKey,
  theme,
}: {
  posts: GlobalMapPost[];
  selectedId: string | null;
  onSelect: (postId: string) => void;
  scopeKey: string;
  theme: Theme;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const postsRef = useRef(posts);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const data = useMemo(() => asFeatureCollection(posts), [posts]);

  useEffect(() => {
    postsRef.current = posts;
    const source = mapRef.current?.getSource(POST_SOURCE) as GeoJSONSource | undefined;
    source?.setData(data);
  }, [data, posts]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    const map = mapRef.current;
    if (!map?.getLayer(SELECTED_POINT_LAYER)) return;

    map.setFilter(SELECTED_POINT_LAYER, selectedPostFilter(selectedId));
    const post = posts.find((item) => item.id === selectedId);
    if (post && !map.getBounds().contains([post.longitude, post.latitude])) {
      map.easeTo({ center: [post.longitude, post.latitude], duration: 420 });
    }
  }, [posts, selectedId]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) fitPosts(map, postsRef.current, true);
  }, [scopeKey]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyles[theme],
      center: [0, 18],
      zoom: 1.35,
      maxZoom: 18,
      cooperativeGestures: true,
      renderWorldCopies: false,
    });
    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: `street-map-popup street-map-popup-${theme}`,
    });

    const setPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };
    const handleClusterClick = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;

      const clusterId = Number(feature.properties?.cluster_id);
      const source = map.getSource(POST_SOURCE) as GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: feature.geometry.coordinates as [number, number],
        zoom,
        duration: 420,
      });
    };
    const handlePointClick = (event: MapLayerMouseEvent) => {
      const postId = event.features?.[0]?.properties?.postId;
      if (typeof postId === "string") onSelectRef.current(postId);
    };
    const handlePointEnter = (event: MapLayerMouseEvent) => {
      setPointer();
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      popup
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(popupContent(feature.properties ?? {}))
        .addTo(map);
    };
    const handlePointLeave = () => {
      clearPointer();
      popup.remove();
    };

    map.on("load", () => {
      addPostLayers(
        map,
        asFeatureCollection(postsRef.current),
        selectedIdRef.current,
        theme,
      );
      fitPosts(map, postsRef.current, false);
      map.on("click", CLUSTER_LAYER, handleClusterClick);
      map.on("click", POINT_LAYER, handlePointClick);
      map.on("mouseenter", CLUSTER_LAYER, setPointer);
      map.on("mouseleave", CLUSTER_LAYER, clearPointer);
      map.on("mouseenter", POINT_LAYER, handlePointEnter);
      map.on("mouseleave", POINT_LAYER, handlePointLeave);
    });

    return () => {
      resizeObserver.disconnect();
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="street-post-map"
      role="application"
      aria-label={`Mapa callejero interactivo con ${posts.length} publicaciones`}
    />
  );
}
