import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);
  const error = useAuthStore((s) => s.error);
  const status = useAuthStore((s) => s.status);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      // error is already surfaced via the store's `error` field
    }
  }

  async function handleGuestLogin() {
    setIsGuestLoading(true);
    try {
      const data = await loginAsGuest();
      if (data?.workspaceId) {
        navigate(`/workspaces/${data.workspaceId}`);
      } else {
        navigate("/dashboard");
      }
    } catch {
      // error is already surfaced via the store's `error` field
    } finally {
      setIsGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex items-center justify-center px-4 selection:bg-white/20">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AETHELFLOW ENGINE // V2.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Space_Grotesk']">
            Workflow Studio Login
          </h1>
          <p className="text-xs text-slate-400 font-normal">
            Decoupled in-memory DAG engine & topological V8 orchestrator
          </p>
        </div>

        <div className="bg-[#0B111E]/95 border border-white/15 rounded-2xl p-7 shadow-2xl backdrop-blur-xl space-y-5">
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-3.5 py-2.5 font-mono">
              {error}
            </p>
          )}

          {/* ============================================================ */}
          {/* RECRUITER / GUEST 1-CLICK DEMO ACCESS (CLEAN LUNAR TITANIUM) */}
          {/* ============================================================ */}
          <div className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
                <span>⚡</span>
                <span>Recruiter & Reviewer Preview</span>
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                Instant Access
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              No registration or credentials required. Instantly launch the studio pre-loaded with production SaaS workflow templates.
            </p>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={status === "loading" || isGuestLoading}
              className="w-full group relative flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 shadow-lg"
            >
              <span>⚡</span>
              <span>
                {isGuestLoading ? "Launching Demo Studio..." : "Continue as Guest (Recruiter Preview)"}
              </span>
            </button>
          </div>

          {/* DIVIDER */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Or Sign In With Account
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

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
              disabled={status === "loading" || isGuestLoading}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 hover:text-white disabled:opacity-50 rounded-xl py-2.5 text-xs font-mono font-medium tracking-wider uppercase transition"
            >
              {status === "loading" && !isGuestLoading ? "Authenticating..." : "Log In With Password"}
            </button>

            <p className="text-xs text-slate-400 text-center pt-1 font-mono">
              Don't have an account?{" "}
              <Link to="/register" className="text-slate-200 hover:text-white hover:underline">
                Register
              </Link>
            </p>
          </form>
        </div>

        {/* Back to landing page */}
        <div className="text-center">
          <a
            href="http://localhost:3000"
            className="text-xs font-mono text-slate-500 hover:text-slate-300 transition"
          >
            &larr; Back to AethelFlow 3D Experience (Port 3000)
          </a>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
