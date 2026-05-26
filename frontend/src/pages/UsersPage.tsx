import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMe, fetchUsers, fetchTeams,
  createUser, deleteUser, setSuperadmin,
  assignUserToTeam, removeUserFromTeam,
  User, Team, UserTeamMembership,
} from "../api";

function SuperadminBadge() {
  return (
    <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
      superadmin
    </span>
  );
}

function AssignTeamForm({
  userId,
  teams,
  onDone,
}: {
  userId: string;
  teams: Team[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [role, setRole] = useState("member");
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: () => assignUserToTeam(userId, { team_id: teamId, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); onDone(); },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="flex gap-2 flex-wrap items-center mt-1"
    >
      <select
        value={teamId}
        onChange={(e) => setTeamId(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1 text-xs transition focus:border-fuchsia-500 focus:outline-none"
      >
        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1 text-xs transition focus:border-fuchsia-500 focus:outline-none"
      >
        <option value="member">member</option>
        <option value="manager">manager</option>
      </select>
      <button
        type="submit"
        disabled={mut.isPending}
        className="rounded-lg bg-fuchsia-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-fuchsia-700 disabled:opacity-50 transition-all duration-150"
      >
        {mut.isPending ? "…" : "Assign"}
      </button>
      <button type="button" onClick={onDone} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
        cancel
      </button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </form>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const currentEmail = localStorage.getItem("datacat_user_email") ?? "";

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: users = [], isLoading, error } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const { data: teams = [] } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });

  const isSuperadmin = me?.is_superadmin ?? false;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setEmail(""); setPassword(""); setFormError(""); },
    onError: (e: Error) => setFormError(e.message),
  });

  const superadminMut = useMutation({
    mutationFn: ({ id, promote }: { id: string; promote: boolean }) => setSuperadmin(id, promote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const removeTeamMut = useMutation({
    mutationFn: ({ userId, teamId }: { userId: string; teamId: string }) =>
      removeUserFromTeam(userId, teamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  if (!me && !isLoading) return <p className="text-red-500">Please log in.</p>;
  if (me && !me.is_superadmin) {
    return (
      <div className="mt-16 text-center space-y-2">
        <p className="text-3xl">🔒</p>
        <p className="font-semibold text-gray-700">Superadmin access required</p>
        <p className="text-sm text-gray-400">Only superadmins can manage users.</p>
      </div>
    );
  }
  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (error) return <p className="text-red-500">Failed to load users.</p>;

  const assignableTeams = teams.filter((t: any) => !t.is_platform);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        {isSuperadmin && <SuperadminBadge />}
      </div>

      {isSuperadmin && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm max-w-md">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Add user</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); createMut.mutate({ email: email.trim(), password }); }}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                placeholder="user@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                placeholder="Min. 6 characters" />
            </div>
            {formError && <p className="text-red-500 text-sm">{formError}</p>}
            <button type="submit" disabled={createMut.isPending}
              className="rounded-lg bg-fuchsia-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-fuchsia-700 disabled:opacity-50 transition-all duration-150">
              {createMut.isPending ? "Creating…" : "Create user"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Teams</th>
              {isSuperadmin && <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Assign to team</th>}
              {isSuperadmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No users yet.</td></tr>
            )}
            {users.map((u: User) => {
              const isSelf = u.email === currentEmail;
              return (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-fuchsia-50/20 align-top transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 items-center">
                      {u.is_superadmin && <SuperadminBadge />}
                      {!u.is_superadmin && <span className="text-gray-400 text-xs">—</span>}
                      {isSuperadmin && !isSelf && (
                        <button
                          onClick={() => superadminMut.mutate({ id: u.id, promote: !u.is_superadmin })}
                          className={`text-xs underline transition-colors ${
                            u.is_superadmin
                              ? "text-red-400 hover:text-red-600"
                              : "text-fuchsia-400 hover:text-fuchsia-600"
                          }`}
                        >
                          {u.is_superadmin ? "revoke" : "promote"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.teams ?? []).length === 0 && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                      {(u.teams ?? []).map((tm: UserTeamMembership) => (
                        <span
                          key={tm.team_id}
                          className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 border border-fuchsia-200 px-2 py-0.5 text-xs text-fuchsia-700"
                        >
                          <span className="font-medium">{tm.team_name}</span>
                          <span className={`rounded-full px-1 text-[10px] font-semibold ${
                            tm.role === "manager"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-500"
                          }`}>{tm.role}</span>
                          {isSuperadmin && (
                            <button
                              title={`Remove from ${tm.team_name}`}
                              onClick={() => removeTeamMut.mutate({ userId: u.id, teamId: tm.team_id })}
                              className="ml-0.5 text-fuchsia-300 hover:text-red-500 leading-none transition-colors"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  {isSuperadmin && (
                    <td className="px-4 py-3">
                      {assigningUserId === u.id ? (
                        <AssignTeamForm
                          userId={u.id}
                          teams={assignableTeams}
                          onDone={() => setAssigningUserId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setAssigningUserId(u.id)}
                          className="text-xs text-fuchsia-500 hover:text-fuchsia-700 underline transition-colors"
                        >
                          + assign
                        </button>
                      )}
                    </td>
                  )}
                  {isSuperadmin && (
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => { if (confirm(`Delete ${u.email}?`)) deleteMut.mutate(u.id); }}
                          className="text-red-400 hover:text-red-600 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isSuperadmin && (
        <p className="text-sm text-gray-400">Contact a superadmin to be assigned to a team.</p>
      )}
    </div>
  );
}
