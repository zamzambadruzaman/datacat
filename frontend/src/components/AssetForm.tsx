import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAsset, fetchDomains, Domain } from "../api";

// ── Types ────────────────────────────────────────────────────────────────────

export type SchemaColumn = {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  description: string;
};

// ── Data types per source ────────────────────────────────────────────────────

const DATA_TYPES: Record<string, string[]> = {
  snowflake: [
    "VARCHAR", "NUMBER", "INTEGER", "FLOAT", "BOOLEAN",
    "DATE", "TIMESTAMP_NTZ", "TIMESTAMP_LTZ", "TIMESTAMP_TZ",
    "VARIANT", "ARRAY", "OBJECT", "BINARY",
  ],
  bigquery: [
    "STRING", "INTEGER", "INT64", "FLOAT", "FLOAT64", "BOOLEAN", "BOOL",
    "DATE", "DATETIME", "TIMESTAMP", "BYTES", "NUMERIC", "BIGNUMERIC",
    "RECORD", "JSON",
  ],
  redshift: [
    "VARCHAR", "CHAR", "INTEGER", "BIGINT", "SMALLINT",
    "FLOAT", "DOUBLE PRECISION", "BOOLEAN", "DATE",
    "TIMESTAMP", "TIMESTAMPTZ", "NUMERIC", "SUPER",
  ],
  synapse: [
    "VARCHAR", "NVARCHAR", "INT", "BIGINT", "SMALLINT", "TINYINT",
    "FLOAT", "REAL", "BIT", "DATE", "DATETIME2", "DATETIMEOFFSET", "DECIMAL",
  ],
  postgres: [
    "VARCHAR", "TEXT", "INTEGER", "BIGINT", "SMALLINT",
    "FLOAT", "DOUBLE PRECISION", "BOOLEAN", "DATE",
    "TIMESTAMP", "TIMESTAMPTZ", "NUMERIC", "UUID", "JSON", "JSONB",
  ],
};

const FILE_FORMAT_TYPES: Record<string, string[]> = {
  csv:     ["STRING", "INTEGER", "FLOAT", "BOOLEAN", "DATE", "TIMESTAMP"],
  parquet: ["BOOLEAN", "INT32", "INT64", "FLOAT", "DOUBLE", "STRING", "BINARY", "DATE", "TIMESTAMP", "DECIMAL", "LIST", "MAP", "STRUCT"],
  json:    ["STRING", "NUMBER", "BOOLEAN", "ARRAY", "OBJECT", "NULL"],
  avro:    ["NULL", "BOOLEAN", "INT", "LONG", "FLOAT", "DOUBLE", "BYTES", "STRING", "ENUM", "ARRAY", "MAP"],
  orc:     ["BOOLEAN", "TINYINT", "SMALLINT", "INT", "BIGINT", "FLOAT", "DOUBLE", "STRING", "BINARY", "TIMESTAMP", "DATE", "DECIMAL", "LIST", "MAP", "STRUCT"],
};

const FILE_FORMATS = ["csv", "parquet", "json", "avro", "orc"] as const;

const DEFAULT_TYPES = [
  "STRING", "VARCHAR", "TEXT", "INTEGER", "BIGINT",
  "FLOAT", "BOOLEAN", "DATE", "TIMESTAMP",
];

// ── YAML parser ──────────────────────────────────────────────────────────────

function parseYamlSchema(text: string): SchemaColumn[] {
  const lines = text.split("\n");
  const cols: SchemaColumn[] = [];

  const hasColumnsList = lines.some(l => /^columns\s*:/i.test(l.trim()));

  if (hasColumnsList) {
    let current: Partial<SchemaColumn> | null = null;
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (/^\s+-\s+name\s*:/i.test(line)) {
        if (current?.name) cols.push({ id: crypto.randomUUID(), nullable: true, description: "", type: "", ...current });
        current = { name: line.replace(/.*name\s*:\s*/i, "").replace(/^["']|["']$/g, "").trim() };
        continue;
      }
      if (!current) continue;
      const kv = line.match(/^\s+(\w+)\s*:\s*(.*)/);
      if (!kv) continue;
      const [, key, val] = kv;
      const v = val.replace(/^["']|["']$/g, "").trim();
      if (key === "type") current.type = v;
      else if (key === "nullable") current.nullable = v !== "false";
      else if (key === "description") current.description = v;
    }
    if (current?.name) cols.push({ id: crypto.randomUUID(), nullable: true, description: "", type: "", ...current });
    return cols;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([\w.]+)\s*:\s*(.+)/);
    if (!match) continue;
    const [, name, type] = match;
    if (name.toLowerCase() === "columns") continue;
    cols.push({
      id: crypto.randomUUID(),
      name,
      type: type.replace(/^["']|["']$/g, "").trim(),
      nullable: true,
      description: "",
    });
  }
  return cols;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function newColumn(): SchemaColumn {
  return { id: crypto.randomUUID(), name: "", type: "", nullable: true, description: "" };
}

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-700/20";

// ── Component ────────────────────────────────────────────────────────────────

export default function AssetForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: domains } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains });

  const [form, setForm] = useState({
    domain_id: "",
    name: "",
    description: "",
    source_type: "",
    file_format: "",
    tags: "",
    owner_email: "",
    freshness: "",
  });

  const [columns, setColumns] = useState<SchemaColumn[]>([newColumn()]);
  const [schemaTab, setSchemaTab] = useState<"manual" | "yaml">("manual");
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [yamlLoaded, setYamlLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isFileSource = form.source_type === "s3" || form.source_type === "gcs";
  const availableTypes = isFileSource
    ? (FILE_FORMAT_TYPES[form.file_format] ?? DEFAULT_TYPES)
    : (DATA_TYPES[form.source_type] ?? DEFAULT_TYPES);

  const mutation = useMutation({
    mutationFn: () => {
      const schema = columns
        .filter((c) => c.name.trim())
        .map(({ id: _id, ...rest }) => rest);
      return createAsset({ ...form, schema_json: JSON.stringify(schema) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      navigate("/assets");
    },
  });

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const updateColumn = (id: string, field: keyof SchemaColumn, value: string | boolean) =>
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const addColumn = () => setColumns((prev) => [...prev, newColumn()]);

  const removeColumn = (id: string) =>
    setColumns((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));

  const handleYamlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setYamlError(null);
    setYamlLoaded(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseYamlSchema(text);
        if (parsed.length === 0) {
          setYamlError("No columns found. Check that the file matches the supported format.");
          return;
        }
        setColumns(parsed);
        setYamlLoaded(true);
        setSchemaTab("manual");
      } catch (err) {
        setYamlError(`Parse error: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  const filledColumns = columns.filter((c) => c.name.trim()).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Register New Asset</h1>

      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        {/* ── Metadata fields ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Domain</span>
            <select value={form.domain_id} onChange={set("domain_id")} className={`mt-1.5 ${inputCls}`}>
              <option value="">Select domain...</option>
              {domains?.map((d: Domain) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Name</span>
            <input value={form.name} onChange={set("name")} className={`mt-1.5 ${inputCls}`} />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea value={form.description} onChange={set("description")} rows={2} className={`mt-1.5 ${inputCls}`} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Source Type</span>
            <select value={form.source_type} onChange={set("source_type")} className={`mt-1.5 ${inputCls}`}>
              <option value="">Select...</option>
              {["snowflake", "bigquery", "redshift", "synapse", "postgres", "s3", "gcs"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          {isFileSource && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">File Format</span>
              <select value={form.file_format} onChange={set("file_format")} className={`mt-1.5 ${inputCls}`}>
                <option value="">Select format...</option>
                {FILE_FORMATS.map((f) => (
                  <option key={f} value={f}>{f.toUpperCase()}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Determines the available column data types below.
              </p>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Freshness</span>
            <select value={form.freshness} onChange={set("freshness")} className={`mt-1.5 ${inputCls}`}>
              <option value="">Select...</option>
              {["real-time", "hourly", "daily", "weekly", "monthly"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Owner Email</span>
            <input type="email" value={form.owner_email} onChange={set("owner_email")} className={`mt-1.5 ${inputCls}`} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Tags (comma-separated)</span>
            <input value={form.tags} onChange={set("tags")} className={`mt-1.5 ${inputCls}`} />
          </label>
        </div>

        {/* ── Schema section ── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Schema</span>
              {filledColumns > 0 && (
                <span className="rounded-full bg-fuchsia-100 border border-fuchsia-300 px-2 py-0.5 text-xs font-medium text-fuchsia-900">
                  {filledColumns} column{filledColumns !== 1 ? "s" : ""}
                </span>
              )}
              {form.source_type && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {isFileSource
                    ? (form.file_format ? `${form.file_format.toUpperCase()} types` : "select a file format above")
                    : `${form.source_type} types`}
                </span>
              )}
            </div>
            <div className="flex overflow-hidden rounded-lg border border-gray-300 text-sm">
              <button
                type="button"
                onClick={() => setSchemaTab("manual")}
                className={`px-3 py-1.5 transition-colors ${
                  schemaTab === "manual"
                    ? "bg-fuchsia-800 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Columns
              </button>
              <button
                type="button"
                onClick={() => setSchemaTab("yaml")}
                className={`border-l px-3 py-1.5 transition-colors ${
                  schemaTab === "yaml"
                    ? "bg-fuchsia-800 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Upload YAML
              </button>
            </div>
          </div>

          {schemaTab === "manual" ? (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-1/4">
                      Column Name
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-1/5">
                      Data Type
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 w-16">
                      Nullable
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {columns.map((col, idx) => (
                    <tr key={col.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-2 py-1.5">
                        <input
                          value={col.name}
                          onChange={(e) => updateColumn(col.id, "name", e.target.value)}
                          placeholder="column_name"
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none transition focus:border-fuchsia-700 focus:ring-1 focus:ring-fuchsia-700/20"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={col.type}
                          onChange={(e) => updateColumn(col.id, "type", e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none transition focus:border-fuchsia-700 focus:ring-1 focus:ring-fuchsia-700/20"
                        >
                          <option value="">Select type…</option>
                          {col.type && !availableTypes.includes(col.type) && (
                            <option value={col.type}>{col.type}</option>
                          )}
                          {availableTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={col.nullable}
                          onChange={(e) => updateColumn(col.id, "nullable", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-fuchsia-800 focus:ring-fuchsia-700"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={col.description}
                          onChange={(e) => updateColumn(col.id, "description", e.target.value)}
                          placeholder="Optional description"
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none transition focus:border-fuchsia-700 focus:ring-1 focus:ring-fuchsia-700/20"
                        />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeColumn(col.id)}
                          disabled={columns.length === 1}
                          title="Remove column"
                          className="text-gray-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 text-lg leading-none transition-colors"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-200 bg-white px-3 py-2">
                <button
                  type="button"
                  onClick={addColumn}
                  className="text-sm font-medium text-fuchsia-800 hover:text-fuchsia-800 transition-colors"
                >
                  + Add Column
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="mb-2 text-sm text-gray-600">
                  Upload a <code className="rounded bg-gray-200 px-1">.yaml</code> or{" "}
                  <code className="rounded bg-gray-200 px-1">.yml</code> file. Two formats are supported:
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">Simple (key: type)</p>
                    <pre className="rounded-lg bg-white border border-gray-200 p-3 text-xs text-gray-700 leading-relaxed">{`user_id: INTEGER
email: VARCHAR
created_at: TIMESTAMP
is_active: BOOLEAN`}</pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">Detailed (columns list)</p>
                    <pre className="rounded-lg bg-white border border-gray-200 p-3 text-xs text-gray-700 leading-relaxed">{`columns:
  - name: user_id
    type: INTEGER
    nullable: false
    description: Primary key
  - name: email
    type: VARCHAR
    nullable: true`}</pre>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".yaml,.yml"
                  onChange={handleYamlUpload}
                  className="block text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-fuchsia-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-fuchsia-900"
                />
              </div>

              {yamlError && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                  {yamlError}
                </p>
              )}
              {yamlLoaded && (
                <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                  {filledColumns} column{filledColumns !== 1 ? "s" : ""} loaded — switched to Columns view.
                </p>
              )}
            </div>
          )}
        </div>

        {mutation.isError && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            Failed to create asset. Check all required fields.
          </p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!form.name || !form.domain_id || mutation.isPending}
          className="w-full rounded-lg bg-fuchsia-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-900 disabled:opacity-50 transition-all duration-150 shadow-sm"
        >
          {mutation.isPending ? "Creating..." : "Register Asset"}
        </button>
      </div>
    </div>
  );
}
