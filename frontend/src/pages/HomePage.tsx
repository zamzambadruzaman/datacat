import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAssets, fetchDomains } from "../api";
import SourceTypeIcon from "../components/SourceTypeIcon";

export default function HomePage() {
  const { data: assets } = useQuery({ queryKey: ["assets"], queryFn: () => fetchAssets() });
  const { data: domains } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains });

  const recentAssets = assets?.slice(0, 5) ?? [];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Your lightweight data catalog</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 md:grid-cols-3">
        <StatCard
          label="Domains"
          value={domains?.length ?? 0}
          to="/domains"
          delay={40}
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          }
        />
        <StatCard
          label="Assets"
          value={assets?.length ?? 0}
          to="/assets"
          delay={80}
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3M4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5" />
          }
        />
        <StatCard
          label="Source Types"
          value={new Set(assets?.map((a) => a.source_type).filter(Boolean)).size}
          to="/assets"
          delay={120}
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 7h.01M7 3h5c.53 0 1.04.21 1.41.59l7 7a2 2 0 010 2.82l-7 7a2 2 0 01-2.82 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          }
        />
      </div>

      {/* Recent assets */}
      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-gray-500">Recent Assets</h2>
          <Link
            to="/assets/new"
            className="text-sm font-medium text-fuchsia-700 hover:text-fuchsia-900 transition-colors"
          >
            Register asset
          </Link>
        </div>
        {recentAssets.length === 0 ? (
          <p className="text-sm text-gray-400">No assets registered yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {recentAssets.map((a) => (
              <Link
                key={a.id}
                to={`/assets/${a.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-800">{a.name}</span>
                {a.source_type && (
                  <span className="flex items-center gap-1.5 font-mono text-xs text-gray-400">
                    <SourceTypeIcon type={a.source_type} className="w-3.5 h-3.5" />
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
  delay = 0,
}: {
  label: string;
  value: number;
  to: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <Link
      to={to}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-fade-up group bg-white px-5 py-5 transition-colors hover:bg-gray-50"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-gray-400">{label}</span>
        <svg
          className="w-4 h-4 text-gray-300 group-hover:text-fuchsia-600 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {icon}
        </svg>
      </div>
      <div className="tnum mt-3 font-display text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </div>
    </Link>
  );
}
