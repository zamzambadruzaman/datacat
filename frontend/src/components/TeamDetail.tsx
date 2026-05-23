import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeamMembers, addTeamMember, removeTeamMember, TeamMember } from "../api";
import { useState } from "react";

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("member");
  const qc = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () => fetchTeamMembers(teamId!),
    enabled: !!teamId,
  });

  const addMut = useMutation({
    mutationFn: () => addTeamMember(teamId!, { email: newEmail, role: newRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members", teamId] });
      setNewEmail("");
      setNewRole("member");
    },
  });

  const removeMut = useMutation({
    mutationFn: (email: string) => removeTeamMember(teamId!, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members", teamId] });
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading team...</p>;

  return (
    <div className="space-y-6">
      <Link to="/teams" className="text-indigo-600 hover:text-indigo-700">
        ← Back to Teams
      </Link>

      <h1 className="text-2xl font-bold text-gray-800">Team Members</h1>

      <div className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700">Add Member</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMut.mutate();
          }}
          className="flex gap-2"
        >
          <input
            type="email"
            required
            placeholder="Email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="member">Member</option>
            <option value="owner">Owner</option>
          </select>
          <button
            type="submit"
            disabled={!newEmail || addMut.isPending}
            className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members?.map((m: TeamMember) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-800">{m.email}</td>
                <td className="px-6 py-3 text-sm">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${
                    m.role === "owner" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {m.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <button
                    onClick={() => removeMut.mutate(m.email)}
                    disabled={removeMut.isPending}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
