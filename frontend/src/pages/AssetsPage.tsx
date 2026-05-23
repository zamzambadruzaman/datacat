import { useState } from "react";
import { Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import AssetList from "../components/AssetList";

export default function AssetsPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Assets</h1>
        <Link
          to="/assets/new"
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          + Register Asset
        </Link>
      </div>
      <SearchBar onSearch={setQuery} />
      <AssetList searchQuery={query || undefined} />
    </div>
  );
}
