import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SearchBar from "../components/SearchBar";
import AssetList from "../components/AssetList";
import { fetchDomains, fetchLayers } from "../api";

export default function AssetsPage() {
  const [query, setQuery] = useState("");
  const [params] = useSearchParams();
  const sourceType = params.get("source_type") || undefined;
  const domainId = params.get("domain_id") || undefined;
  const layerId = params.get("layer_id") || undefined;

  const { data: domains } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains, enabled: !!domainId });
  const { data: layers } = useQuery({ queryKey: ["layers"], queryFn: fetchLayers, enabled: !!layerId });
  const domainName = domains?.find((d) => d.id === domainId)?.name;
  const layerName = layers?.find((l) => l.id === layerId)?.name;

  const activeFilter = sourceType
    ? { label: "Source type", value: sourceType }
    : domainId
    ? { label: "Domain", value: domainName ?? domainId }
    : layerId
    ? { label: "Layer", value: layerName ?? layerId }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900">Assets</h1>
        <Link
          to="/assets/new"
          className="rounded-lg bg-fuchsia-800 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-900 transition-all duration-150"
        >
          + Register Asset
        </Link>
      </div>

      {activeFilter && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{activeFilter.label}:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-50 px-2.5 py-0.5 font-mono text-xs text-fuchsia-700">
            {activeFilter.value}
            <Link to="/assets" className="text-fuchsia-400 hover:text-fuchsia-700" aria-label="Clear filter">
              ×
            </Link>
          </span>
        </div>
      )}

      <SearchBar onSearch={setQuery} />
      <AssetList searchQuery={query || undefined} sourceType={sourceType} domainId={domainId} layerId={layerId} />
    </div>
  );
}
