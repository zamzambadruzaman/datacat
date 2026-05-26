import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAsset, deleteAsset, publishAsset, unpublishAsset, fetchTeamMembers, getUserEmail } from "../api";
import AccessRequestForm from "./AccessRequestForm";
import { type SchemaColumn } from "./AssetForm";

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => fetchAsset(id!),
    enabled: !!id,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", asset?.team_id],
    queryFn: () => fetchTeamMembers(asset!.team_id!),
    enabled: !!asset?.team_id,
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

  const currentEmail = getUserEmail();
  const canManage = !!currentEmail && !!teamMembers?.some((m) => m.email === currentEmail);

  // Parse schema — supports new array format and legacy {col: type} object format
  let schemaColumns: SchemaColumn[] | null = null;
  try {
    const parsed = JSON.parse(asset.schema_json);
    if (Array.isArray(parsed) && parsed.length > 0) {
      schemaColumns = parsed as SchemaColumn[];
    } else if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
      schemaColumns = Object.entries(parsed as Record<string, string>).map(([name, type]) => ({
        id: name,
        name,
        type: String(type),
        nullable: true,
        description: "",
      }));
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

        {canManage && (
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
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-white p-6 shadow-sm md:grid-cols-3">
        <Field label="Source Type" value={asset.source_type} />
        <Field label="Owner" value={asset.owner_email} />
        <Field label="Freshness" value={asset.freshness} />
        <Field label="Quality Score" value={asset.quality_score?.toFixed(2) ?? "N/A"} />
        <Field label="Domain" value={asset.domain_name ?? asset.domain_id} />
        <Field label="Tags" value={asset.tags || "—"} />
        <Field label="Created" value={new Date(asset.created_at).toLocaleDateString()} />
        <Field label="Updated" value={new Date(asset.updated_at).toLocaleDateString()} />
      </div>

      {schemaColumns && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">
            Schema
            <span className="ml-2 text-sm font-normal text-gray-400">
              {schemaColumns.length} column{schemaColumns.length !== 1 ? "s" : ""}
            </span>
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Column</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Nullable</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {schemaColumns.map((col, idx) => (
                  <tr key={col.id ?? idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-sm font-medium text-gray-800">{col.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                        {col.type || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                      {col.nullable ? (
                        <span className="text-gray-400">nullable</span>
                      ) : (
                        <span className="font-medium text-gray-700">required</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{col.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!canManage && (
        <div className="mt-4">
          <AccessRequestForm assetId={asset.id} />
        </div>
      )}
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
