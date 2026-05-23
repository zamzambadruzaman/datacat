function getUserEmail(): string | null {
  return localStorage.getItem("datacat_user_email");
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("datacat_token");
  const userEmail = getUserEmail();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userEmail ? { "X-User-Email": userEmail } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  description: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  email: string;
  role: string; // "owner" | "member"
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  team_id: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  domain_id: string;
  name: string;
  description: string;
  source_type: string;
  connection_uri: string;
  schema_json: string;
  owner_email: string;
  tags: string;
  quality_score: number | null;
  freshness: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessRequest {
  id: string;
  asset_id: string;
  requester_email: string;
  status: string;
  created_at: string;
  decision_at: string | null;
}

// ── Teams ──────────────────────────────────────────────────────

export const fetchTeams = () => apiFetch<Team[]>("/teams");

export const createTeam = (data: { name: string; description?: string }) =>
  apiFetch<Team>("/teams", { method: "POST", body: JSON.stringify(data) });

export const updateTeam = (id: string, data: Partial<Team>) =>
  apiFetch<Team>(`/teams/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteTeam = (id: string) =>
  apiFetch<void>(`/teams/${id}`, { method: "DELETE" });

// ── Team Members ───────────────────────────────────────────────

export const fetchTeamMembers = (teamId: string) =>
  apiFetch<TeamMember[]>(`/teams/${teamId}/members`);

export const addTeamMember = (teamId: string, data: { email: string; role?: string }) =>
  apiFetch<TeamMember>(`/teams/${teamId}/members`, { method: "POST", body: JSON.stringify(data) });

export const removeTeamMember = (teamId: string, memberEmail: string) =>
  apiFetch<void>(`/teams/${teamId}/members/${memberEmail}`, { method: "DELETE" });

// ── Domains ────────────────────────────────────────────────────

export const fetchDomains = (teamId?: string) => {
  const qs = teamId ? `?team_id=${teamId}` : "";
  return apiFetch<Domain[]>(`/domains${qs}`);
};

export const createDomain = (data: { name: string; description?: string; team_id: string }) =>
  apiFetch<Domain>("/domains", { method: "POST", body: JSON.stringify(data) });

export const deleteDomain = (id: string) =>
  apiFetch<void>(`/domains/${id}`, { method: "DELETE" });

// ── Assets ─────────────────────────────────────────────────────

export const fetchAssets = (params?: { q?: string; domain_id?: string; source_type?: string; published?: boolean }) => {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.domain_id) sp.set("domain_id", params.domain_id);
  if (params?.source_type) sp.set("source_type", params.source_type);
  const qs = sp.toString();
  return apiFetch<Asset[]>(`/assets${qs ? `?${qs}` : ""}`);
};

export const fetchAsset = (id: string) => apiFetch<Asset>(`/assets/${id}`);

export const createAsset = (data: Partial<Asset>) =>
  apiFetch<Asset>("/assets", { method: "POST", body: JSON.stringify(data) });

export const updateAsset = (id: string, data: Partial<Asset>) =>
  apiFetch<Asset>(`/assets/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteAsset = (id: string) =>
  apiFetch<void>(`/assets/${id}`, { method: "DELETE" });

export const publishAsset = (id: string) =>
  apiFetch<Asset>(`/assets/${id}/publish`, { method: "POST" });

export const unpublishAsset = (id: string) =>
  apiFetch<Asset>(`/assets/${id}/unpublish`, { method: "POST" });

// ── Access Requests ───────────────────────────────────────────────────────

export const createAccessRequest = (data: {
  asset_id: string;
  requester_email: string;
  message?: string;
}) => apiFetch<AccessRequest>("/access-requests", { method: "POST", body: JSON.stringify(data) });

// ── Users ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export const fetchUsers = () => apiFetch<User[]>("/users");

export const createUser = (data: { email: string; password: string }) =>
  apiFetch<User>("/users", { method: "POST", body: JSON.stringify(data) });

export const deleteUser = (id: string) =>
  apiFetch<void>(`/users/${id}`, { method: "DELETE" });
