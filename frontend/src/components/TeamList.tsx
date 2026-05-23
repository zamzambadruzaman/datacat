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
      <h1 className="text-2xl font-bold text-gray-800">Teams</h1>

      {showForm ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
          className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Team Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name || createMut.isPending}
              className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create Team
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
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
              className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-gray-800">{team.name}</h2>
              <p className="mt-2 text-sm text-gray-600">{team.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
