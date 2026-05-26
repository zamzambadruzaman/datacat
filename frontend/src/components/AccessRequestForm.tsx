import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAccessRequest } from "../api";

export default function AccessRequestForm({ assetId }: { assetId: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: { asset_id: string; requester_email: string; message?: string }) =>
      createAccessRequest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["access-requests"] });
      setEmail("");
      setMessage("");
      alert("Access request sent to the asset owner.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    mutation.mutate({ asset_id: assetId, requester_email: email, message });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800">Request Access</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-700/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message (optional)</label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-700/20"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-lg bg-fuchsia-800 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-900 disabled:opacity-50 transition-all duration-150 shadow-sm"
      >
        {mutation.isPending ? "Sending…" : "Send Request"}
      </button>
      {mutation.isError && (
        <p className="text-sm text-red-600">Failed to send request. Please try again.</p>
      )}
    </form>
  );
}
