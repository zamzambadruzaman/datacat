import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAsset, fetchDomains, Domain } from "../api";

export default function AssetForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: domains } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains });

  const [form, setForm] = useState({
    domain_id: "",
    name: "",
    description: "",
    source_type: "",
    tags: "",
    owner_email: "",
    freshness: "",
    schema_json: "",
  });

  const mutation = useMutation({
    mutationFn: () => createAsset(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      navigate("/assets");
    },
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Register New Asset</h1>

      <div className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Domain</span>
          <select value={form.domain_id} onChange={set("domain_id")}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">Select domain...</option>
            {domains?.map((d: Domain) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input value={form.name} onChange={set("name")}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Description</span>
          <textarea value={form.description} onChange={set("description")} rows={3}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Source Type</span>
          <select value={form.source_type} onChange={set("source_type")}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">Select...</option>
            {["snowflake", "bigquery", "redshift", "synapse", "postgres", "s3", "gcs"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Tags (comma-separated)</span>
          <input value={form.tags} onChange={set("tags")}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Owner Email</span>
          <input type="email" value={form.owner_email} onChange={set("owner_email")}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Freshness</span>
          <select value={form.freshness} onChange={set("freshness")}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">Select...</option>
            {["real-time", "hourly", "daily", "weekly", "monthly"].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        {/* Schema JSON textarea */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Schema (JSON)</span>
          <textarea
            value={form.schema_json}
            onChange={set("schema_json")}
            rows={6}
            placeholder='{"column1":"type","column2":"type"}'
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </label>

        {mutation.isError && (
          <p className="text-sm text-red-600">Failed to create asset. Check all fields.</p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!form.name || !form.domain_id || mutation.isPending}
          className="w-full rounded bg-indigo-600 px-4 py-2 text-white
                     hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Creating..." : "Register Asset"}
        </button>
      </div>
    </div>
  );
}
