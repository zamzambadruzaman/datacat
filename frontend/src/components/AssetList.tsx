import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAssets, Asset } from "../api";

export default function AssetList({
  searchQuery,
  domainId,
}: {
  searchQuery?: string;
  domainId?: string;
}) {
  const { data: assets, isLoading, error } = useQuery({
    queryKey: ["assets", searchQuery, domainId],
    queryFn: () => fetchAssets({ q: searchQuery, domain_id: domainId }),
  });

  if (isLoading) return <p className="text-gray-500">Loading assets...</p>;
  if (error) return <p className="text-red-600">Failed to load assets.</p>;
  if (!assets?.length) return <p className="text-gray-400">No assets found.</p>;

  return (
    <div className="grid gap-3">
      {assets.map((a: Asset) => (
        <Link
          key={a.id}
          to={`/assets/${a.id}`}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm
                     transition hover:border-indigo-300 hover:shadow"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{a.name}</h3>
            {a.source_type && (
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {a.source_type}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {a.description || "No description"}
          </p>
          {a.tags && (
            <div className="mt-2 flex flex-wrap gap-1">
              {a.tags.split(",").map((t) => (
                <span
                  key={t}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
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
