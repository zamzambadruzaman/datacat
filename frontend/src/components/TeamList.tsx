import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, createTeam, Team } from "../api";
import { Link } from "react-router-dom";

export default function TeamList() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const qc = useQueryClient();
  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const createMut = useMutation({
    mutationFn: () => createTeam({ name, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      setName("");
      setDescription("");
      setShowForm(false);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Teams</h1>

      {showForm ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm max-w-lg"
        >
          <h2 className="font-semibold text-gray-800">New team</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Team Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name || createMut.isPending}
              className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-700 disabled:opacity-50 transition-all duration-150"
            >
              Create Team
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-700 transition-all duration-150 shadow-sm"
        >
          + New Team
        </button>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading teams...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {teams?.map((team: Team) => (
            <Link
              to={`/teams/${team.id}`}
              key={team.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-fuchsia-300 hover:shadow-md transition-all duration-150"
            >
              <h2 className="text-lg font-semibold text-gray-800">{team.name}</h2>
              <p className="mt-2 text-sm text-gray-500">{team.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
