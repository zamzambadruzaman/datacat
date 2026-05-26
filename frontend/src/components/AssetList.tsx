import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAssets, fetchLayers, Asset } from "../api";
import SourceTypeIcon from "./SourceTypeIcon";
import LayerBadge from "./LayerBadge";

export default function AssetList({
  searchQuery,
  domainId,
  sourceType,
  layerId,
}: {
  searchQuery?: string;
  domainId?: string;
  sourceType?: string;
  layerId?: string;
}) {
  const { data: assets, isLoading, error } = useQuery({
    queryKey: ["assets", searchQuery, domainId, sourceType, layerId],
    queryFn: () => fetchAssets({ q: searchQuery, domain_id: domainId, source_type: sourceType, layer_id: layerId }),
  });
  const { data: layers } = useQuery({ queryKey: ["layers"], queryFn: fetchLayers });
  const layerById = new Map((layers ?? []).map((l) => [l.id, l]));

  if (isLoading) return <p className="text-gray-500">Loading assets...</p>;
  if (error) return <p className="text-red-600">Failed to load assets.</p>;
  if (!assets?.length) return <p className="text-gray-400">No assets found.</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
      {assets.map((a: Asset) => (
        <Link
          key={a.id}
          to={`/assets/${a.id}`}
          className="block px-4 py-4 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-gray-900">{a.name}</h3>
            {a.source_type && (
              <span className="flex flex-shrink-0 items-center gap-1.5 font-mono text-xs text-gray-400">
                <SourceTypeIcon type={a.source_type} className="w-3.5 h-3.5" />
                {a.source_type}
              </span>
            )}
          </div>
          {a.domain_name && (
            <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-gray-400">{a.domain_name}</p>
          )}
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {a.description || "No description"}
          </p>
          {(a.layer_id || a.tags) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {a.layer_id && layerById.get(a.layer_id) && (
                <LayerBadge layer={layerById.get(a.layer_id)!} />
              )}
              {a.tags &&
                a.tags.split(",").map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {t.trim()}
                  </span>
                ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
