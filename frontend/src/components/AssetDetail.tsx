import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAsset, deleteAsset, publishAsset, unpublishAsset } from "../api";
import AccessRequestForm from "./AccessRequestForm";

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => fetchAsset(id!),
    enabled: !!id,
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteAsset(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      navigate("/assets");
    },
  });

  const publishMut = useMutation({
    mutationFn: () => publishAsset(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset", id] });
    },
  });

  const unpublishMut = useMutation({
    mutationFn: () => unpublishAsset(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset", id] });
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (error || !asset) return <p className="text-red-600">Asset not found.</p>;

  let schemaDisplay: string | null = null;
  try {
    const parsed = JSON.parse(asset.schema_json);
    if (Object.keys(parsed).length > 0) {
      schemaDisplay = JSON.stringify(parsed, null, 2);
    }
  } catch {
    /* not valid JSON — skip */
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{asset.name}</h1>
          <p className="mt-1 text-gray-500">{asset.description || "No description"}</p>
          <p className="mt-2 text-sm">
            <span className={`rounded px-2 py-1 ${asset.published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
              {asset.published ? "Published to Catalog" : "Private (Team Only)"}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {asset.published ? (
            <button
              onClick={() => unpublishMut.mutate()}
              disabled={unpublishMut.isPending}
              className="rounded bg-yellow-600 px-3 py-1.5 text-sm text-white hover:bg-yellow-700"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => publishMut.mutate()}
              disabled={publishMut.isPending}
              className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
            >
              Publish
            </button>
          )}
          <button
            onClick={() => deleteMut.mutate()}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-white p-6 shadow-sm md:grid-cols-3">
        <Field label="Source Type" value={asset.source_type} />
        <Field label="Owner" value={asset.owner_email} />
        <Field label="Freshness" value={asset.freshness} />
        <Field label="Quality Score" value={asset.quality_score?.toFixed(2) ?? "N/A"} />
        <Field label="Domain ID" value={asset.domain_id} />
        <Field label="Tags" value={asset.tags || "—"} />
        <Field label="Created" value={new Date(asset.created_at).toLocaleDateString()} />
        <Field label="Updated" value={new Date(asset.updated_at).toLocaleDateString()} />
      </div>

      {schemaDisplay && (
        <div>
          <h2 className="mb-2 text-lg font-semibold text-gray-700">Schema</h2>
          <pre className="overflow-auto rounded-lg bg-gray-800 p-4 text-sm text-green-300">
            {schemaDisplay}
          </pre>
        </div>
      )}

      {/* Access request button */}
      <div className="mt-4">
        <AccessRequestForm assetId={asset.id} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value || "—"}</dd>
    </div>
  );
}
