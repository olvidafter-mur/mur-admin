const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const compactFormatter = new Intl.NumberFormat("es-AR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

export const formatNumber = (value: number | string | null | undefined) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? compactFormatter.format(number) : "0";
};

export const getInitials = (...values: Array<string | null | undefined>) => {
  const label = values.find((value) => value?.trim())?.trim() ?? "M";
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export const truncate = (value: string | null | undefined, length = 120) => {
  const normalized = value?.trim() || "Sin contenido de texto";
  return normalized.length > length
    ? `${normalized.slice(0, length).trim()}...`
    : normalized;
};

export const displayName = (value: {
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
}) => value.display_name || value.username || value.email || "Usuario";
