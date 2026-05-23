import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAccessRequest } from "../api";

/**
 * Simple form that lets a data consumer request access to an asset.
 * It posts to the backend ``/api/access-requests`` endpoint and shows a
 * success / error message.
 */
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
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded border p-4">
      <h3 className="text-lg font-medium text-gray-800">Request Access</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700">Your Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Message (optional)</label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {mutation.isPending ? "Sending…" : "Send Request"}
      </button>
      {mutation.isError && (
        <p className="text-sm text-red-600">Failed to send request. Please try again.</p>
      )}
    </form>
  );
}
