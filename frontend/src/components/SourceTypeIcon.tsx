type Shape = "cylinder" | "bucket" | "cloud" | "snowflake" | "document" | "stream" | "api";

type Meta = { shape: Shape; color: string };

const MAP: Record<string, Meta> = {
  // Warehouses / relational
  snowflake: { shape: "snowflake", color: "#29B5E8" },
  bigquery: { shape: "cloud", color: "#4285F4" },
  redshift: { shape: "cylinder", color: "#8C4FFF" },
  synapse: { shape: "cylinder", color: "#0078D4" },
  databricks: { shape: "cylinder", color: "#FF3621" },
  postgres: { shape: "cylinder", color: "#336791" },
  postgresql: { shape: "cylinder", color: "#336791" },
  mysql: { shape: "cylinder", color: "#00758F" },
  clickhouse: { shape: "cylinder", color: "#FFCC01" },
  duckdb: { shape: "cylinder", color: "#FFF000" },

  // Object storage
  s3: { shape: "bucket", color: "#E25444" },
  gcs: { shape: "bucket", color: "#4285F4" },
  minio: { shape: "bucket", color: "#C72E49" },
  adls: { shape: "bucket", color: "#0078D4" },
  azure_blob: { shape: "bucket", color: "#0078D4" },

  // Streaming
  kafka: { shape: "stream", color: "#231F20" },
  kinesis: { shape: "stream", color: "#8C4FFF" },
  pubsub: { shape: "stream", color: "#4285F4" },

  // File formats
  csv: { shape: "document", color: "#10B981" },
  tsv: { shape: "document", color: "#10B981" },
  json: { shape: "document", color: "#F59E0B" },
  xml: { shape: "document", color: "#F59E0B" },
  parquet: { shape: "document", color: "#3B82F6" },
  avro: { shape: "document", color: "#3B82F6" },
  orc: { shape: "document", color: "#3B82F6" },

  // APIs
  api: { shape: "api", color: "#6366F1" },
  rest: { shape: "api", color: "#6366F1" },
  graphql: { shape: "api", color: "#E10098" },
};

const DEFAULT: Meta = { shape: "cylinder", color: "#9CA3AF" };

function ShapePath({ shape, color }: Meta) {
  switch (shape) {
    case "bucket":
      return (
        <>
          <path fill={color} d="M5 7h14l-1.3 12.1a1.6 1.6 0 0 1-1.6 1.4H7.9a1.6 1.6 0 0 1-1.6-1.4L5 7z" />
          <ellipse cx="12" cy="6" rx="8" ry="2.2" fill={color} opacity="0.7" />
        </>
      );
    case "cloud":
      return (
        <path
          fill={color}
          d="M7 19a4.5 4.5 0 0 1-.3-9 6 6 0 0 1 11.5 1.2A3.8 3.8 0 0 1 17.2 19H7z"
        />
      );
    case "snowflake":
      return (
        <g stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
          <path d="M12 6.5l2.2-2.2M12 6.5l-2.2-2.2M12 17.5l2.2 2.2M12 17.5l-2.2 2.2" />
        </g>
      );
    case "document":
      return (
        <>
          <path fill={color} d="M7 3h6l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path fill="#fff" opacity="0.55" d="M13 3v5h5z" />
        </>
      );
    case "stream":
      return (
        <g fill={color}>
          <circle cx="6" cy="12" r="2.4" />
          <circle cx="17" cy="6.5" r="2.4" />
          <circle cx="17" cy="17.5" r="2.4" />
          <path stroke={color} strokeWidth="1.6" d="M7.8 11l7.4-3.8M7.8 13l7.4 3.8" />
        </g>
      );
    case "api":
      return (
        <g stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M8 7c-2.2 0-3.2 1.2-3.2 3v1.4c0 .9-.5 1.6-1.3 1.6.8 0 1.3.7 1.3 1.6V17c0 1.8 1 3 3.2 3" />
          <path d="M16 7c2.2 0 3.2 1.2 3.2 3v1.4c0 .9.5 1.6 1.3 1.6-.8 0-1.3.7-1.3 1.6V17c0 1.8-1 3-3.2 3" />
        </g>
      );
    case "cylinder":
    default:
      return (
        <path
          fill={color}
          d="M12 2C7.6 2 4 3.4 4 5.2v13.6C4 20.6 7.6 22 12 22s8-1.4 8-3.2V5.2C20 3.4 16.4 2 12 2zm0 2c4 0 6 1.2 6 1.7S16 7.4 12 7.4 6 6.2 6 5.7 8 4 12 4z"
        />
      );
  }
}

export default function SourceTypeIcon({
  type,
  className = "w-4 h-4",
}: {
  type: string;
  className?: string;
}) {
  const meta = MAP[type?.toLowerCase()] ?? DEFAULT;
  return (
    <svg className={`flex-shrink-0 ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <ShapePath {...meta} />
    </svg>
  );
}
