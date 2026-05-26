import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAssets, fetchDomains } from "../api";

export default function HomePage() {
  const { data: assets } = useQuery({ queryKey: ["assets"], queryFn: () => fetchAssets() });
  const { data: domains } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains });

  const recentAssets = assets?.slice(0, 5) ?? [];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to datacat</h1>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Assets</h2>
          <Link
            to="/assets/new"
            className="text-sm font-medium text-fuchsia-800 hover:text-fuchsia-900 transition-colors"
          >
            + Register asset
          </Link>
        </div>
        {recentAssets.length === 0 ? (
          <p className="text-sm text-gray-400">No assets registered yet.</p>
        ) : (
          <div className="grid gap-2">
            {recentAssets.map((a) => (
              <Link
                key={a.id}
                to={`/assets/${a.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm hover:border-fuchsia-400 hover:shadow-md transition-all duration-150"
              >
                <span className="font-medium text-gray-800">{a.name}</span>
                {a.source_type && (
                  <span className="rounded-full bg-fuchsia-100 border border-fuchsia-300 px-2.5 py-0.5 text-xs font-medium text-fuchsia-900">
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
      className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all duration-150 hover:border-fuchsia-400 hover:shadow-md group"
    >
      <div className="text-3xl font-bold text-fuchsia-800 group-hover:text-fuchsia-900 transition-colors">
        {value}
      </div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </Link>
  );
}
