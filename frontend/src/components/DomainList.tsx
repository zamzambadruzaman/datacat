import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDomains, fetchTeams, createDomain, deleteDomain, fetchMe, Domain, Team } from "../api";

export default function DomainList() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: domains = [], isLoading } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains });
  const { data: teams = [] } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [addError, setAddError] = useState("");

  const manageableTeams = teams;

  const addMut = useMutation({
    mutationFn: () => createDomain({ name: name.trim(), description, team_id: teamId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domains"] });
      setName(""); setDescription(""); setTeamId(""); setShowForm(false); setAddError("");
    },
    onError: (e: Error) => setAddError(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteDomain,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading domains…</p>;

  return (
    <div className="space-y-6">
      {manageableTeams.length > 0 && (
        showForm ? (
          <form
            onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }}
            className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 max-w-lg"
          >
            <h2 className="font-display text-lg font-bold text-gray-800">New domain</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-700/20"
                placeholder="e.g. Customer Analytics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <input
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-700/20"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Team</label>
              <select
                value={teamId} onChange={(e) => setTeamId(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-700/20"
              >
                <option value="">Select a team…</option>
                {manageableTeams.map((t: Team) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={!name || !teamId || addMut.isPending}
                className="rounded-lg bg-fuchsia-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-fuchsia-900 disabled:opacity-50 transition-all duration-150">
                {addMut.isPending ? "Creating…" : "Create"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setAddError(""); }}
                className="rounded-lg bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all duration-150">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="rounded-lg bg-fuchsia-800 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-900 transition-all duration-150">
            + New domain
          </button>
        )
      )}

      {domains.length === 0 ? (
        <p className="text-gray-400 text-sm">No domains yet.</p>
      ) : (
        <div className="grid gap-3">
          {domains.map((d: Domain) => {
            const team = teams.find((t: Team) => t.id === d.team_id);
            return (
              <div key={d.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:border-fuchsia-300 transition-all duration-150">
                <div>
                  <h3 className="font-semibold text-gray-800">{d.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Team: {team?.name ?? d.team_id}
                    {d.description && ` · ${d.description}`}
                  </p>
                </div>
                {(me?.is_superadmin) && (
                  <button onClick={() => { if (confirm(`Delete domain "${d.name}"?`)) delMut.mutate(d.id); }}
                    className="rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-all duration-150">
                    Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
