import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, createUser, deleteUser } from "../api";

export default function UsersPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setEmail("");
      setPassword("");
      setFormError("");
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    createMutation.mutate({ email: email.trim(), password });
  }

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (error) return <p className="text-red-500">Failed to load users. Are you logged in?</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Users</h1>

      {/* Create user form — platform team members only */}
      <div className="border rounded p-4 bg-white shadow-sm max-w-md">
        <h2 className="text-lg font-semibold mb-3">Add user</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Min. 6 characters"
            />
          </div>
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "Create user"}
          </button>
        </form>
      </div>

      {/* Users table */}
      <div className="bg-white shadow-sm rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Created</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono">{u.email}</td>
                <td className="px-4 py-2 text-gray-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${u.email}?`)) deleteMutation.mutate(u.id);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
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
