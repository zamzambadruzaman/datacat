import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "../api";

type Tab = "login" | "signup";

export default function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setEmail("");
    setPassword("");
    setConfirm("");
    setError("");
  }

  async function persistSession(token: string, userEmail: string) {
    localStorage.setItem("datacat_token", token);
    localStorage.setItem("datacat_user_email", userEmail);
    // Fetch profile so we can store is_superadmin synchronously for the nav
    try {
      const me = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
      localStorage.setItem("datacat_is_superadmin", String(!!me.is_superadmin));
    } catch {
      localStorage.setItem("datacat_is_superadmin", "false");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = new URLSearchParams();
      body.append("username", email.trim());
      body.append("password", password);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) throw new Error("Incorrect email or password");
      const data = await res.json();
      await persistSession(data.access_token, email.trim());
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signup({ email: email.trim(), password });
      // Auto-login after signup
      const body = new URLSearchParams();
      body.append("username", email.trim());
      body.append("password", password);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = await res.json();
      await persistSession(data.access_token, email.trim());
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      {/* Tabs */}
      <div className="flex border-b mb-6">
        {(["login", "signup"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); reset(); }}
            className={`flex-1 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "login" ? "Login" : "Create account"}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded shadow-sm p-6 space-y-4">
        <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              placeholder={tab === "signup" ? "Min. 6 characters" : ""}
            />
          </div>
          {tab === "signup" && (
            <div>
              <label className="block text-sm font-medium mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading
              ? "Please wait…"
              : tab === "login"
              ? "Login"
              : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
