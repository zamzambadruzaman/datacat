import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDomains, createDomain, deleteDomain, Domain } from "../api";
import { useState } from "react";

export default function DomainList() {
  const qc = useQueryClient();
  const { data: domains, isLoading } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains });

  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  const addMut = useMutation({
    mutationFn: () => createDomain({ name, owner_email: ownerEmail }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domains"] });
      setName("");
      setOwnerEmail("");
    },
  });

  const delMut = useMutation({
    mutationFn: deleteDomain,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading domains...</p>;

  return (
    <div className="space-y-6">
      {/* Add domain form */}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Domain name"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <input
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="Owner email"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={() => addMut.mutate()}
          disabled={!name || addMut.isPending}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Domain list */}
      <div className="grid gap-3">
        {domains?.map((d: Domain) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm"
          >
            <div>
              <h3 className="font-semibold text-gray-800">{d.name}</h3>
              <p className="text-sm text-gray-500">{d.owner_email || "No owner"}</p>
            </div>
            <button
              onClick={() => delMut.mutate(d.id)}
              className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
