import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLayers, fetchMe, fetchAssets,
  createLayer, updateLayer, deleteLayer, DataLayer,
} from "../api";

const DEFAULT_COLOR = "#9CA3AF";

export default function ClassificationPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: layers = [], isLoading } = useQuery({ queryKey: ["layers"], queryFn: fetchLayers });
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => fetchAssets() });

  const isSuperadmin = me?.is_superadmin ?? false;

  const counts = new Map<string, number>();
  for (const a of assets) {
    if (a.layer_id) counts.set(a.layer_id, (counts.get(a.layer_id) ?? 0) + 1);
  }

  const [name, setName] = useState("");
  const [color, setColor] = useState("#0EA5E9");
  const [addError, setAddError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["layers"] });
    qc.invalidateQueries({ queryKey: ["assets"] });
  };

  const createMut = useMutation({
    mutationFn: () => createLayer({ name: name.trim(), color }),
    onSuccess: () => { invalidate(); setName(""); setColor("#0EA5E9"); setAddError(""); },
    onError: (e: Error) => setAddError(e.message.replace(/^API error \d+:\s*/, "")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) => updateLayer(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLayer(id),
    onSuccess: invalidate,
  });

  function startEdit(l: DataLayer) {
    setEditingId(l.id);
    setEditName(l.name);
    setEditColor(l.color);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900">Data Classification</h1>
        <p className="mt-1 text-sm text-gray-500">
          Organize assets by data layer. {isSuperadmin ? "Add, rename, or remove layers below." : "Managed by superadmins."}
        </p>
      </div>

      {isSuperadmin && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate(); }}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-5 max-w-xl"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Layer name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. platinum"
              className="mt-1.5 w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/15"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Color</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1.5 h-[38px] w-12 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
            />
          </label>
          <button
            type="submit"
            disabled={!name.trim() || createMut.isPending}
            className="rounded-lg bg-fuchsia-800 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-900 disabled:opacity-50 transition-colors"
          >
            {createMut.isPending ? "Adding…" : "Add layer"}
          </button>
          {addError && <p className="w-full text-sm text-red-500">{addError}</p>}
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading layers…</p>
      ) : layers.length === 0 ? (
        <p className="text-sm text-gray-400">No layers defined yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {layers.map((l) => {
            const count = counts.get(l.id) ?? 0;
            const isEditing = editingId === l.id;
            return (
              <div key={l.id} className="flex items-center gap-4 px-4 py-3">
                {isEditing ? (
                  <>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
                    />
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editName.trim()) updateMut.mutate({ id: l.id, data: { name: editName.trim(), color: editColor } });
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 rounded-lg border border-fuchsia-400 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                    />
                    <button
                      onClick={() => updateMut.mutate({ id: l.id, data: { name: editName.trim(), color: editColor } })}
                      disabled={!editName.trim() || updateMut.isPending}
                      className="rounded-lg bg-fuchsia-800 px-3 py-1 text-xs font-medium text-white hover:bg-fuchsia-900 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="font-medium text-gray-900">{l.name}</span>
                    <Link
                      to={`/assets?layer_id=${encodeURIComponent(l.id)}`}
                      className="font-mono text-xs text-gray-400 hover:text-fuchsia-700"
                    >
                      {count} asset{count !== 1 ? "s" : ""}
                    </Link>
                    {isSuperadmin && (
                      <div className="ml-auto flex items-center gap-3">
                        <button
                          onClick={() => startEdit(l)}
                          className="text-xs text-fuchsia-700 hover:text-fuchsia-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove layer "${l.name}"? Assets in it will become unclassified.`)) deleteMut.mutate(l.id);
                          }}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
