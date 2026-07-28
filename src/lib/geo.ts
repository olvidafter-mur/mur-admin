export type GeoPosition = [number, number];

export type GeoGeometry =
  | { type: "Polygon"; coordinates: GeoPosition[][] }
  | { type: "MultiPolygon"; coordinates: GeoPosition[][][] };

export type GeoFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoGeometry;
};

export type GeoFeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

export type CountryReference = {
  name: string;
  iso3: string;
  feature: GeoFeature;
};

export type BoundaryMetadata = {
  boundaryName: string;
  boundaryISO: string;
  boundaryCanonical: string;
  boundarySource: string;
  boundaryLicense: string;
  admUnitCount: string;
  simplifiedGeometryGeoJSON: string;
  gjDownloadURL: string;
  sourceLabel?: string;
  sourceUrl?: string;
};

export type CountryDivisions = {
  collection: GeoFeatureCollection;
  metadata: BoundaryMetadata;
};

type AdministrativeLevel = "ADM1" | "ADM2";

const boundaryCache = new Map<string, CountryDivisions>();

const valueAsString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const featureName = (feature: GeoFeature) =>
  valueAsString(feature.properties.name)
  || valueAsString(feature.properties.shapeName)
  || "Region sin nombre";

export const normalizeWorldCollection = (
  input: GeoFeatureCollection,
): { collection: GeoFeatureCollection; countries: CountryReference[] } => {
  const countries: CountryReference[] = [];
  const features = input.features.flatMap((feature) => {
    if (feature.geometry?.type !== "Polygon" && feature.geometry?.type !== "MultiPolygon") {
      return [];
    }

    const name = valueAsString(feature.properties.NAME_ES)
      || valueAsString(feature.properties.ADMIN)
      || valueAsString(feature.properties.NAME)
      || valueAsString(feature.properties.name);
    const iso3Candidate = valueAsString(feature.properties.ISO_A3);
    const iso3 = iso3Candidate && iso3Candidate !== "-99"
      ? iso3Candidate
      : valueAsString(feature.properties.ADM0_A3);

    if (!name || !iso3 || iso3 === "-99") return [];

    const normalized: GeoFeature = {
      ...feature,
      properties: { ...feature.properties, name, iso3 },
    };
    countries.push({ name, iso3, feature: normalized });
    return [normalized];
  });

  return {
    collection: { type: "FeatureCollection", features },
    countries,
  };
};

const normalizeDivisionCollection = (input: GeoFeatureCollection) => ({
  type: "FeatureCollection" as const,
  features: input.features.flatMap((feature) => {
    if (feature.geometry?.type !== "Polygon" && feature.geometry?.type !== "MultiPolygon") {
      return [];
    }

    const name = valueAsString(feature.properties.shapeName)
      || valueAsString(feature.properties.name);
    if (!name) return [];

    return [{
      ...feature,
      properties: { ...feature.properties, name },
    }];
  }),
});

const resolveGeometryUrl = (geometryUrl: string) => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(geometryUrl);
  } catch {
    throw new Error("La fuente cartografica devolvio una URL invalida.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("La fuente cartografica devolvio una URL no segura.");
  }

  const githubRawPath = parsedUrl.hostname === "github.com"
    ? parsedUrl.pathname.match(/^\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/)
    : null;

  if (!githubRawPath) return parsedUrl.toString();

  const [, owner, repository, reference, path] = githubRawPath;
  return `https://media.githubusercontent.com/media/${owner}/${repository}/${reference}/${path}`;
};

const argentinaBoundarySource = (level: AdministrativeLevel) => {
  const filename = level === "ADM1" ? "argentina-adm1.json" : "argentina-adm2.json";
  const resource = level === "ADM1" ? "provincias" : "departamentos";
  const geometryUrl = `${import.meta.env.BASE_URL}cartography/${filename}`;
  const metadata: BoundaryMetadata = {
    boundaryName: "Argentina",
    boundaryISO: "ARG",
    boundaryCanonical: "Georef Argentina v2.0",
    boundarySource: "IGN / Georef Argentina",
    boundaryLicense: "Datos oficiales",
    admUnitCount: level === "ADM1" ? "24" : "528",
    simplifiedGeometryGeoJSON: geometryUrl,
    gjDownloadURL: `https://apis.datos.gob.ar/georef/api/v2.0/${resource}.geojson`,
    sourceLabel: "Georef Argentina",
    sourceUrl: "https://www.argentina.gob.ar/georef",
  };
  return { geometryUrl, metadata };
};

const getAdministrativeDivisions = async (
  iso3: string,
  level: AdministrativeLevel,
) => {
  const cacheKey = `${iso3}-${level}`;
  const cached = boundaryCache.get(cacheKey);
  if (cached) return cached;

  let metadata: BoundaryMetadata;
  let resolvedGeometryUrl: string;
  if (iso3 === "ARG") {
    const argentinaSource = argentinaBoundarySource(level);
    metadata = argentinaSource.metadata;
    resolvedGeometryUrl = argentinaSource.geometryUrl;
  } else {
    let metadataResponse: Response;
    try {
      metadataResponse = await fetch(
        `https://www.geoboundaries.org/api/current/gbOpen/${encodeURIComponent(iso3)}/${level}/`,
      );
    } catch {
      throw new Error("No se pudo conectar con el servicio cartografico.");
    }
    if (!metadataResponse.ok) {
      throw new Error("Este pais no tiene divisiones administrativas disponibles.");
    }

    metadata = await metadataResponse.json() as BoundaryMetadata;
    const geometryUrl = metadata.simplifiedGeometryGeoJSON || metadata.gjDownloadURL;
    resolvedGeometryUrl = resolveGeometryUrl(geometryUrl);
  }

  let geometryResponse: Response;
  try {
    geometryResponse = await fetch(resolvedGeometryUrl);
  } catch {
    throw new Error("No se pudo conectar con el servicio cartografico.");
  }
  if (!geometryResponse.ok) {
    throw new Error("No se pudieron cargar las divisiones de este pais.");
  }

  const collection = normalizeDivisionCollection(
    await geometryResponse.json() as GeoFeatureCollection,
  );
  if (collection.features.length === 0) {
    throw new Error("Este pais no tiene divisiones administrativas disponibles.");
  }

  const result = { collection, metadata };
  boundaryCache.set(cacheKey, result);
  return result;
};

export const getCountryDivisions = (iso3: string) =>
  getAdministrativeDivisions(iso3, "ADM1");

export const getCountrySubdivisions = (iso3: string) =>
  getAdministrativeDivisions(iso3, "ADM2");

const normalizeLongitude = (longitude: number, reference: number) => {
  let normalized = longitude;
  while (normalized - reference > 180) normalized -= 360;
  while (normalized - reference < -180) normalized += 360;
  return normalized;
};

const pointInRing = ([longitude, latitude]: GeoPosition, ring: GeoPosition[]) => {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    const currentLongitude = normalizeLongitude(currentPoint[0], longitude);
    const previousLongitude = normalizeLongitude(previousPoint[0], longitude);
    const crossesLatitude = (currentPoint[1] > latitude) !== (previousPoint[1] > latitude);
    const crossingLongitude = (
      (previousLongitude - currentLongitude)
      * (latitude - currentPoint[1])
      / (previousPoint[1] - currentPoint[1])
      + currentLongitude
    );

    if (crossesLatitude && longitude < crossingLongitude) inside = !inside;
  }
  return inside;
};

const pointInPolygon = (point: GeoPosition, polygon: GeoPosition[][]) => {
  if (!polygon[0] || !pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
};

export const pointInFeature = (point: GeoPosition, feature: GeoFeature) => {
  if (feature.geometry.type === "Polygon") {
    return pointInPolygon(point, feature.geometry.coordinates);
  }
  return feature.geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
};

const outerRings = (feature: GeoFeature) => (
  feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates[0]]
    : feature.geometry.coordinates.map((polygon) => polygon[0])
);

const ringCentroid = (ring: GeoPosition[]) => {
  let doubleArea = 0;
  let longitude = 0;
  let latitude = 0;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const cross = ring[previous][0] * ring[index][1] - ring[index][0] * ring[previous][1];
    doubleArea += cross;
    longitude += (ring[previous][0] + ring[index][0]) * cross;
    latitude += (ring[previous][1] + ring[index][1]) * cross;
  }

  return {
    area: Math.abs(doubleArea / 2),
    point: Math.abs(doubleArea) > Number.EPSILON
      ? [longitude / (3 * doubleArea), latitude / (3 * doubleArea)] as GeoPosition
      : ring[0],
  };
};

const representativePoint = (feature: GeoFeature) => {
  const rings = outerRings(feature)
    .filter((ring): ring is GeoPosition[] => Boolean(ring?.length))
    .map((ring) => ({ ring, ...ringCentroid(ring) }))
    .sort((left, right) => right.area - left.area);
  const centroid = rings[0]?.point;
  if (!centroid || pointInFeature(centroid, feature)) return centroid;

  for (const { ring } of rings) {
    const step = Math.max(1, Math.floor(ring.length / 64));
    for (let index = 0; index < ring.length; index += step) {
      const candidate: GeoPosition = [
        ring[index][0] * 0.995 + centroid[0] * 0.005,
        ring[index][1] * 0.995 + centroid[1] * 0.005,
      ];
      if (pointInFeature(candidate, feature)) return candidate;
    }
  }

  return centroid;
};

export const featuresWithinFeature = (
  collection: GeoFeatureCollection,
  parent: GeoFeature,
): GeoFeatureCollection => {
  const parentId = valueAsString(parent.properties.shapeID);
  const linkedFeatures = parentId
    ? collection.features.filter(
      (feature) => valueAsString(feature.properties.parentId) === parentId,
    )
    : [];

  return {
    type: "FeatureCollection",
    features: linkedFeatures.length > 0
      ? linkedFeatures
      : collection.features.filter((feature) => {
        const point = representativePoint(feature);
        return point ? pointInFeature(point, parent) : false;
      }),
  };
};

export const collectionAspect = (collection: GeoFeatureCollection) => {
  let minimumLongitude = Number.POSITIVE_INFINITY;
  let minimumLatitude = Number.POSITIVE_INFINITY;
  let maximumLongitude = Number.NEGATIVE_INFINITY;
  let maximumLatitude = Number.NEGATIVE_INFINITY;

  const inspect = (value: GeoPosition | GeoPosition[] | GeoPosition[][] | GeoPosition[][][]) => {
    if (typeof value[0] === "number") {
      const point = value as GeoPosition;
      minimumLongitude = Math.min(minimumLongitude, point[0]);
      minimumLatitude = Math.min(minimumLatitude, point[1]);
      maximumLongitude = Math.max(maximumLongitude, point[0]);
      maximumLatitude = Math.max(maximumLatitude, point[1]);
      return;
    }
    (value as Array<GeoPosition | GeoPosition[] | GeoPosition[][]>).forEach(inspect);
  };

  collection.features.forEach((feature) => inspect(feature.geometry.coordinates));
  const width = maximumLongitude - minimumLongitude;
  const height = maximumLatitude - minimumLatitude;
  return Number.isFinite(width) && Number.isFinite(height) && height > 0 ? width / height : 1;
};

export const fittedLayoutSize = (
  collection: GeoFeatureCollection | null,
  width: number,
  height: number,
) => {
  if (!collection || width <= 0 || height <= 0) return null;
  const aspect = collectionAspect(collection);
  const availableWidth = Math.max(280, width - 36);
  const availableHeight = Math.max(240, height - 76);

  return Math.round(
    aspect > 1
      ? Math.min(availableWidth, availableHeight * aspect)
      : Math.min(availableHeight, availableWidth / Math.max(aspect, 0.01)),
  );
};
