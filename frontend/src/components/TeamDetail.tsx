import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeamMembers, addTeamMember, updateTeamMemberRole, removeTeamMember, searchUsers, TeamMember } from "../api";
import { useState, useRef } from "react";

const ROLES = ["manager", "member"] as const;
type Role = typeof ROLES[number];

function RoleBadge({ role }: { role: string }) {
  const isManager = role === "manager" || role === "owner";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      isManager
        ? "bg-fuchsia-100 border border-fuchsia-300 text-fuchsia-900"
        : "bg-gray-100 border border-gray-200 text-gray-600"
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
      <Link to="/teams" className="inline-flex items-center text-sm font-medium text-fuchsia-800 hover:text-fuchsia-900 transition-colors">
        ← Back to Teams
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>

      {isManager && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Add member</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (noUserFound) return;
              addMut.mutate();
            }}
            className="flex gap-2 flex-wrap items-start"
          >
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
                className={`w-full rounded-lg border px-3 py-1.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 ${
                  noUserFound
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-300 focus:border-fuchsia-700 focus:ring-fuchsia-700/20"
                }`}
              />

              {showSuggestions && inputHasText && filteredSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg text-sm overflow-hidden">
                  {filteredSuggestions.map((s) => (
                    <li
                      key={s.id}
                      onMouseDown={() => { setNewEmail(s.email); setShowSuggestions(false); }}
                      className="cursor-pointer px-3 py-2 hover:bg-fuchsia-100 font-mono transition-colors"
                    >
                      {s.email}
                    </li>
                  ))}
                </ul>
              )}

              {noUserFound && (
                <p className="mt-1 text-xs text-red-500">
                  User not found — check the email or ask them to register first.
                </p>
              )}
            </div>

            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm shadow-sm transition focus:border-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-700/20"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
            </select>
            <button
              type="submit"
              disabled={!exactMatch || addMut.isPending}
              className="rounded-lg bg-fuchsia-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-fuchsia-900 disabled:opacity-50 transition-all duration-150"
            >
              {addMut.isPending ? "Adding…" : "Add"}
            </button>
          </form>
          {addError && <p className="mt-2 text-sm text-red-500">{addError}</p>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
              {isManager && <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-gray-400">No members yet.</td>
              </tr>
            )}
            {members.map((m: TeamMember) => (
              <tr key={m.id} className="hover:bg-fuchsia-100/20 transition-colors">
                <td className="px-5 py-3 text-gray-800 font-mono">{m.email}</td>
                <td className="px-5 py-3">
                  {isManager && m.email !== currentEmail ? (
                    <select
                      value={m.role === "owner" ? "manager" : m.role}
                      onChange={(e) => roleMut.mutate({ email: m.email, role: e.target.value })}
                      className="rounded-lg border border-gray-300 px-2 py-0.5 text-xs transition focus:border-fuchsia-700 focus:outline-none focus:ring-1 focus:ring-fuchsia-700/20"
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
                        className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
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
