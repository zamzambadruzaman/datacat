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
      {/* Brand mark */}
      <div className="text-center mb-8">
        <span className="text-3xl font-bold bg-gradient-to-r from-fuchsia-500 to-fuchsia-700 bg-clip-text text-transparent">
          datacat
        </span>
        <p className="mt-1 text-sm text-gray-500">Your lightweight data catalog</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); reset(); }}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-all duration-150 ${
                tab === t
                  ? "border-b-2 border-fuchsia-600 text-fuchsia-600 bg-fuchsia-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t === "login" ? "Login" : "Create account"}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                placeholder={tab === "signup" ? "Min. 6 characters" : ""}
              />
            </div>
            {tab === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-fuchsia-600 text-white py-2.5 text-sm font-semibold hover:bg-fuchsia-700 disabled:opacity-50 transition-all duration-150 shadow-sm hover:shadow-fuchsia-200 hover:shadow-md"
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
    </div>
  );
}
