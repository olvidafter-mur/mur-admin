import { mkdir, writeFile } from "node:fs/promises";

const API_ROOT = "https://apis.datos.gob.ar/georef/api/v2.0";
const OUTPUT_DIRECTORY = new URL("../public/cartography/", import.meta.url);

const polygonIsInDisplayedArgentina = (polygon) => {
  let minimumLongitude = Number.POSITIVE_INFINITY;
  let maximumLatitude = Number.NEGATIVE_INFINITY;

  const inspect = (value) => {
    if (typeof value[0] === "number") {
      minimumLongitude = Math.min(minimumLongitude, value[0]);
      maximumLatitude = Math.max(maximumLatitude, value[1]);
      return;
    }
    value.forEach(inspect);
  };

  inspect(polygon);
  return maximumLatitude > -60 && minimumLongitude < -52;
};

const trimExtendedTerritories = (geometry) => {
  if (geometry.type === "Polygon") {
    return polygonIsInDisplayedArgentina(geometry.coordinates) ? geometry : null;
  }

  const coordinates = geometry.coordinates.filter(polygonIsInDisplayedArgentina);
  return coordinates.length > 0 ? { ...geometry, coordinates } : null;
};

const normalizeFeature = (feature, level) => {
  const properties = feature.properties;
  const belongsToExtendedTerritory = level === "ADM1"
    ? properties.id === "94"
    : properties.provincia?.id === "94";
  const geometry = belongsToExtendedTerritory
    ? trimExtendedTerritories(feature.geometry)
    : feature.geometry;
  if (!geometry) return null;

  return {
    type: "Feature",
    properties: {
      name: properties.nombre,
      shapeName: properties.nombre,
      shapeISO: level === "ADM1" ? properties.iso_id : "",
      shapeID: properties.id,
      shapeGroup: "ARG",
      shapeType: level,
      parentId: properties.provincia?.id ?? "",
      parentName: properties.provincia?.nombre ?? "",
      source: properties.fuente,
    },
    geometry,
  };
};

const importLayer = async (resource, level, filename) => {
  const response = await fetch(`${API_ROOT}/${resource}.geojson`);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${resource}: HTTP ${response.status}`);
  }

  const input = await response.json();
  const output = {
    type: "FeatureCollection",
    features: input.features
      .map((feature) => normalizeFeature(feature, level))
      .filter(Boolean),
  };

  await writeFile(
    new URL(filename, OUTPUT_DIRECTORY),
    `${JSON.stringify(output)}\n`,
    "utf8",
  );
  console.log(`${filename}: ${output.features.length} entidades`);
};

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await importLayer("provincias", "ADM1", "argentina-adm1.json");
await importLayer("departamentos", "ADM2", "argentina-adm2.json");
