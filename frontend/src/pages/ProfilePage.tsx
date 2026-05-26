import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMe, updateMe, uploadAvatar, changePassword } from "../api";

function Avatar({ src, name, email }: { src: string; name: string; email: string }) {
  const initials = (name || email).slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt="Profile"
        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
      />
    );
  }
  return (
    <div className="w-24 h-24 rounded-full bg-fuchsia-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md">
      {initials}
    </div>
  );
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ["me"], queryFn: fetchMe });

  const [nameEdit, setNameEdit] = useState(false);
  const [nameVal, setNameVal] = useState("");

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const nameMutation = useMutation({
    mutationFn: (name: string) => updateMe({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setNameEdit(false);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (dataUrl: string) => uploadAvatar(dataUrl),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  const pwMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPwSuccess("Password updated successfully.");
      setPwError("");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    },
    onError: (e: Error) => {
      const msg = e.message.includes("Current password") ? "Current password is incorrect." : e.message;
      setPwError(msg);
      setPwSuccess("");
    },
  });

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => avatarMutation.mutate(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleNameSave() {
    const trimmed = nameVal.trim();
    if (!trimmed) return;
    nameMutation.mutate(trimmed);
  }

  function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError("New passwords do not match.");
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    pwMutation.mutate({
      current_password: pwForm.current_password,
      new_password: pwForm.new_password,
    });
  }

  if (isLoading || !user) {
    return <div className="text-gray-500 py-8 text-center">Loading profile…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Avatar + identity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <Avatar src={user.avatar} name={user.name} email={user.email} />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-medium">
              Change
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFile}
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Name */}
            <div className="mb-1">
              {nameEdit ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="border border-fuchsia-400 rounded px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-fuchsia-500 w-full"
                    value={nameVal}
                    onChange={(e) => setNameVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNameSave();
                      if (e.key === "Escape") setNameEdit(false);
                    }}
                    maxLength={128}
                  />
                  <button
                    onClick={handleNameSave}
                    disabled={nameMutation.isPending}
                    className="text-sm px-3 py-1 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 disabled:opacity-50 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setNameEdit(false)}
                    className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name">
                  <span className="text-xl font-semibold text-gray-900">
                    {user.name || <span className="text-gray-400 italic">No display name</span>}
                  </span>
                  <button
                    onClick={() => { setNameVal(user.name || ""); setNameEdit(true); }}
                    className="opacity-0 group-hover/name:opacity-100 text-xs text-fuchsia-600 hover:text-fuchsia-800 transition"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <p className="text-gray-500 text-sm">{user.email}</p>

            {user.is_superadmin && (
              <span className="inline-block mt-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 text-xs font-semibold">
                superadmin
              </span>
            )}
          </div>
        </div>

        {avatarMutation.isPending && (
          <p className="text-sm text-fuchsia-600 mt-3">Uploading avatar…</p>
        )}
      </div>

      {/* Team memberships */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Teams</h2>
        {user.teams.length === 0 ? (
          <p className="text-gray-400 text-sm">You are not a member of any team.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {user.teams.map((t) => (
              <li key={t.team_id} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-800">{t.team_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 capitalize">
                  {t.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Change Password</h2>
        <form onSubmit={handlePwSubmit} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Current password</label>
            <input
              type="password"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition"
              value={pwForm.current_password}
              onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">New password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition"
              value={pwForm.new_password}
              onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm new password</label>
            <input
              type="password"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
            />
          </div>

          {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
          {pwSuccess && <p className="text-green-600 text-sm">{pwSuccess}</p>}

          <button
            type="submit"
            disabled={pwMutation.isPending}
            className="px-4 py-2 bg-fuchsia-600 text-white text-sm rounded-lg hover:bg-fuchsia-700 disabled:opacity-50 transition-all duration-150"
          >
            {pwMutation.isPending ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
