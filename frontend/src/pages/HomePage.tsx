import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAssets, fetchDomains } from "../api";

export default function HomePage() {
  const { data: assets } = useQuery({ queryKey: ["assets"], queryFn: () => fetchAssets() });
  const { data: domains } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains });

  const recentAssets = assets?.slice(0, 5) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">datacat</h1>
        <p className="mt-1 text-gray-500">Your lightweight data catalog</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Domains" value={domains?.length ?? 0} to="/domains" />
        <StatCard label="Assets" value={assets?.length ?? 0} to="/assets" />
        <StatCard
          label="Source Types"
          value={new Set(assets?.map((a) => a.source_type).filter(Boolean)).size}
          to="/assets"
        />
      </div>

      {/* Recent assets */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">Recent Assets</h2>
          <Link to="/assets/new" className="text-sm text-indigo-600 hover:underline">
            + Register asset
          </Link>
        </div>
        {recentAssets.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No assets registered yet.</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {recentAssets.map((a) => (
              <Link
                key={a.id}
                to={`/assets/${a.id}`}
                className="flex items-center justify-between rounded border bg-white p-3 text-sm shadow-sm hover:border-indigo-300"
              >
                <span className="font-medium text-gray-800">{a.name}</span>
                {a.source_type && (
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                    {a.source_type}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg border bg-white p-5 text-center shadow-sm transition hover:shadow"
    >
      <div className="text-3xl font-bold text-indigo-600">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </Link>
  );
}
