import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { SEOHead } from "../components/SEOHead";

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
      <SEOHead
        title="Sign In | Knotrun Studio"
        description="Sign in to your Knotrun Studio account to manage private DAG workflows, encrypted credentials, and execution history."
        canonicalUrl="https://studio.knotrun.io/login"
      />
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
          {/* 1-CLICK RECRUITER / HIRING MANAGER DEMO BYPASS */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>RECRUITER &amp; HIRING MANAGER ACCESS</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Skip authentication and enter directly with full demo workspaces and pre-loaded DAG pipelines.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold font-mono text-xs py-2.5 rounded-lg transition shadow-md uppercase tracking-wider cursor-pointer"
            >
              1-Click Instant Demo Access &rarr;
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0B111E] px-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 relative">
              OR SIGN IN WITH EMAIL
            </span>
          </div>

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

        {/* Back to landing page & Privacy */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
          <a
            href="https://knotrun-landing.onrender.com"
            className="hover:text-slate-300 transition"
          >
            &larr; 3D Site
          </a>
          <Link
            to="/privacy"
            className="hover:text-slate-300 transition"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
