import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const status = useAuthStore((s) => s.status);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      // error is already surfaced via the store's `error` field
    }
  }

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex items-center justify-center px-4 selection:bg-white/20">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-medium text-slate-300">
            <span>Knotrun ENGINE // V2.0</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-['Space_Grotesk']">
            Account Log In
          </h1>
          <p className="text-xs text-slate-400 font-normal">
            Sign in to access your saved workspaces and custom workflows
          </p>
        </div>

        <div className="bg-[#0B111E]/95 border border-white/15 rounded-2xl p-7 shadow-2xl backdrop-blur-xl space-y-5">
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-3.5 py-2.5 font-mono">
              {error}
            </p>
          )}

          {/* STANDARD CREDENTIAL LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">Email Address</label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-white/40 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-white/40 transition"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-xl py-2.5 text-xs font-mono tracking-wider uppercase transition shadow-md disabled:opacity-50"
            >
              {status === "loading" ? "Authenticating..." : "Log In"}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-400">
              <Link to="/dashboard" className="text-slate-400 hover:text-white transition">
                &larr; Return to Studio (Guest)
              </Link>
              <Link to="/register" className="text-slate-200 hover:text-white hover:underline">
                Register
              </Link>
            </div>
          </form>
        </div>

        {/* Back to landing page */}
        <div className="text-center">
          <a
            href="http://localhost:3000"
            className="text-xs font-mono text-slate-500 hover:text-slate-300 transition"
          >
            &larr; Back to Knotrun 3D Experience (Port 3000)
          </a>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
