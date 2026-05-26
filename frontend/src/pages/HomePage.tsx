import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAssets, fetchDomains } from "../api";

export default function HomePage() {
  const { data: assets } = useQuery({ queryKey: ["assets"], queryFn: () => fetchAssets() });
  const { data: domains } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains });

  const recentAssets = assets?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      {/* Page header — left accent bar instead of bottom divider */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-10 bg-fuchsia-800 rounded-full flex-shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Your lightweight data catalog</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label="Domains"
          value={domains?.length ?? 0}
          to="/domains"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          }
        />
        <StatCard
          label="Assets"
          value={assets?.length ?? 0}
          to="/assets"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3M4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5" />
          }
        />
        <StatCard
          label="Source Types"
          value={new Set(assets?.map((a) => a.source_type).filter(Boolean)).size}
          to="/assets"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 7h.01M7 3h5c.53 0 1.04.21 1.41.59l7 7a2 2 0 010 2.82l-7 7a2 2 0 01-2.82 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          }
        />
      </div>

      {/* Recent assets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Recent Assets</h2>
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
                className="flex items-center justify-between rounded-xl border border-gray-200 border-l-[3px] border-l-transparent bg-white px-4 py-3 text-sm shadow-sm hover:border-l-fuchsia-800 hover:shadow-md transition-all duration-150"
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

function StatCard({
  label,
  value,
  to,
  icon,
}: {
  label: string;
  value: number;
  to: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-gray-200 border-t-2 border-t-fuchsia-800 bg-white px-5 py-4 shadow-sm transition-all duration-150 hover:shadow-md hover:border-t-fuchsia-900 group"
    >
      <svg
        className="w-6 h-6 text-fuchsia-800 group-hover:text-fuchsia-900 transition-colors mb-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {icon}
      </svg>
      <div className="text-2xl font-bold text-fuchsia-800 group-hover:text-fuchsia-900 transition-colors">
        {value}
      </div>
      <div className="mt-0.5 text-sm text-gray-500">{label}</div>
    </Link>
  );
}
