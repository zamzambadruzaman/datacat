import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeamMembers, addTeamMember, updateTeamMemberRole, removeTeamMember, searchUsers, TeamMember } from "../api";
import { useState, useRef } from "react";

const ROLES = ["manager", "member"] as const;
type Role = typeof ROLES[number];

function RoleBadge({ role }: { role: string }) {
  const isManager = role === "manager" || role === "owner";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
      isManager ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"
    }`}>
      {isManager ? "manager" : "member"}
    </span>
  );
}

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const qc = useQueryClient();
  const currentEmail = localStorage.getItem("datacat_user_email") ?? "";

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("member");
  const [addError, setAddError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch matching users as the email input changes
  const { data: suggestions = [] } = useQuery({
    queryKey: ["user-search", newEmail],
    queryFn: () => searchUsers(newEmail),
    enabled: newEmail.length > 0,
    staleTime: 10_000,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () => fetchTeamMembers(teamId!),
    enabled: !!teamId,
  });

  const currentMember = members.find((m) => m.email === currentEmail);
  const isManager = currentMember?.role === "manager" || currentMember?.role === "owner";

  const memberEmails = new Set(members.map((m) => m.email.toLowerCase()));
  const filteredSuggestions = suggestions.filter(
    (s) => !memberEmails.has(s.email.toLowerCase())
  );
  const inputHasText = newEmail.trim().length > 0;
  const exactMatch = filteredSuggestions.some(
    (s) => s.email.toLowerCase() === newEmail.trim().toLowerCase()
  );
  // "not found" only if there are no results at all (including already-members)
  const allMatches = suggestions.length;
  const noUserFound = inputHasText && allMatches === 0;

  const addMut = useMutation({
    mutationFn: () => addTeamMember(teamId!, { email: newEmail.trim(), role: newRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members", teamId] });
      setNewEmail("");
      setNewRole("member");
      setAddError("");
    },
    onError: (e: Error) => setAddError(e.message),
  });

  const roleMut = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      updateTeamMemberRole(teamId!, email, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members", teamId] }),
  });

  const removeMut = useMutation({
    mutationFn: (email: string) => removeTeamMember(teamId!, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members", teamId] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading team…</p>;

  return (
    <div className="space-y-6">
      <Link to="/teams" className="text-indigo-600 hover:text-indigo-700 text-sm">
        ← Back to Teams
      </Link>

      <h1 className="text-2xl font-bold text-gray-800">Team Members</h1>

      {/* Add member form — managers only */}
      {isManager && (
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Add member</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (noUserFound) return;
              addMut.mutate();
            }}
            className="flex gap-2 flex-wrap items-start"
          >
            {/* Email input with autocomplete dropdown */}
            <div className="relative flex-1 min-w-48">
              <input
                ref={inputRef}
                type="text"
                required
                placeholder="Search by email…"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setShowSuggestions(true); setAddError(""); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
                className={`w-full rounded border px-2 py-1.5 text-sm shadow-sm focus:outline-none ${
                  noUserFound
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-300 focus:border-indigo-500"
                }`}
              />

              {/* Suggestions dropdown */}
              {showSuggestions && inputHasText && filteredSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow-md text-sm overflow-hidden">
                  {filteredSuggestions.map((s) => (
                    <li
                      key={s.id}
                      onMouseDown={() => { setNewEmail(s.email); setShowSuggestions(false); }}
                      className="cursor-pointer px-3 py-2 hover:bg-indigo-50 font-mono"
                    >
                      {s.email}
                    </li>
                  ))}
                </ul>
              )}

              {/* "User not found" hint */}
              {noUserFound && (
                <p className="mt-1 text-xs text-red-500">
                  User not found — check the email or ask them to register first.
                </p>
              )}
            </div>

            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
            </select>
            <button
              type="submit"
              disabled={!exactMatch || addMut.isPending}
              className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {addMut.isPending ? "Adding…" : "Add"}
            </button>
          </form>
          {addError && <p className="mt-2 text-sm text-red-500">{addError}</p>}
        </div>
      )}

      {/* Members table */}
      <div className="overflow-hidden rounded-lg border shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Role</th>
              {isManager && <th className="px-5 py-3 text-right font-medium text-gray-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-gray-400">No members yet.</td>
              </tr>
            )}
            {members.map((m: TeamMember) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-800 font-mono">{m.email}</td>
                <td className="px-5 py-3">
                  {isManager && m.email !== currentEmail ? (
                    <select
                      value={m.role === "owner" ? "manager" : m.role}
                      onChange={(e) => roleMut.mutate({ email: m.email, role: e.target.value })}
                      className="rounded border border-gray-300 px-1.5 py-0.5 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="member">member</option>
                      <option value="manager">manager</option>
                    </select>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}
                </td>
                {isManager && (
                  <td className="px-5 py-3 text-right">
                    {m.email !== currentEmail && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${m.email} from this team?`)) removeMut.mutate(m.email);
                        }}
                        disabled={removeMut.isPending}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isManager && (
        <p className="text-sm text-gray-400">Only team managers can add or remove members.</p>
      )}
    </div>
  );
}
