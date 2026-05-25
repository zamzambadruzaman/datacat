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

  // Only managers/superadmin can create domains — show form if user is superadmin
  // or a manager of at least one team.
  const manageableTeams = teams; // backend already filters to the user's teams

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
      {/* Add domain */}
      {manageableTeams.length > 0 && (
        showForm ? (
          <form
            onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }}
            className="rounded-lg border bg-white p-5 shadow-sm space-y-3 max-w-lg"
          >
            <h2 className="font-semibold text-gray-700">New domain</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full border rounded px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. Customer Analytics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Team</label>
              <select
                value={teamId} onChange={(e) => setTeamId(e.target.value)} required
                className="w-full border rounded px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
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
                className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
                {addMut.isPending ? "Creating…" : "Create"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setAddError(""); }}
                className="rounded bg-gray-200 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
            + New domain
          </button>
        )
      )}

      {/* Domain list */}
      {domains.length === 0 ? (
        <p className="text-gray-400 text-sm">No domains yet.</p>
      ) : (
        <div className="grid gap-3">
          {domains.map((d: Domain) => {
            const team = teams.find((t: Team) => t.id === d.team_id);
            return (
              <div key={d.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
                <div>
                  <h3 className="font-semibold text-gray-800">{d.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Team: {team?.name ?? d.team_id}
                    {d.description && ` · ${d.description}`}
                  </p>
                </div>
                {(me?.is_superadmin) && (
                  <button onClick={() => { if (confirm(`Delete domain "${d.name}"?`)) delMut.mutate(d.id); }}
                    className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200">
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
