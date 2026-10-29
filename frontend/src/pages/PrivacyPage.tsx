import React from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { SEOHead } from "../components/SEOHead";
import { KnotrunLogo } from "../components/KnotrunLogo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 selection:bg-white/20">
      <SEOHead
        title="Privacy Policy | Knotrun Studio — Cloud DAG Orchestrator"
        description="Comprehensive privacy policies for Knotrun Studio: guest sessions, AES-256 credential encryption, isolated V8 execution, and zero-persistence DAG runtimes."
        canonicalUrl="https://studio.knotrun.io/privacy"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-8">
        {/* Top Navbar Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" title="Return to Workspaces">
              <KnotrunLogo variant="icon" size="sm" />
            </Link>
            <Breadcrumbs items={[{ label: "Privacy Policy" }]} />
          </div>
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3000"
              className="text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition"
            >
              3D Site &rarr;
            </a>
            <Link
              to="/dashboard"
              className="text-xs font-mono font-medium text-slate-200 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/15 transition"
            >
              Back to Workspaces
            </Link>
          </div>
        </div>

        {/* Header Block with Single H1 */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <span>SECURE STUDIO ENCLAVE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy — Knotrun Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            Last Updated: October 29, 2026 • Studio Enclave Specification v2.4
          </p>
        </header>

        {/* Card: Architectural Data Guarantees */}
        <div className="p-6 rounded-2xl bg-[#0B111E] border border-white/10 space-y-4 shadow-lg">
          <h2 className="text-lg font-bold text-white">
            1. Studio Data Processing &amp; Ephemeral Memory
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Knotrun Studio operates as a decoupled orchestration interface for managing Directed Acyclic Graphs (DAGs). When workflows execute, all node inputs, intermediate step evaluations, and branch decisions execute strictly in volatile server RAM.
          </p>
          <ul className="text-xs sm:text-sm text-slate-400 list-disc list-inside space-y-1.5">
            <li>Execution payload logs are scrubbed and truncated according to your workspace retention window.</li>
            <li>No persistent caching of intermediate API secrets or private Bearer tokens in plaintext.</li>
            <li>Full audit logging with cryptographic execution identifiers.</li>
          </ul>
        </div>

        {/* Card: Guest Mode Data Policy */}
        <div className="p-6 rounded-2xl bg-[#0B111E] border border-white/10 space-y-3 shadow-lg">
          <h2 className="text-lg font-bold text-white">
            2. Recruiter Guest Mode Authentication
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            To facilitate rapid technical evaluations, Knotrun Studio offers an automatic Recruiter Guest Mode. Guest mode operates with an ephemeral JWT session and does not harvest contact details or require third-party OAuth permissions. You may reset or purge your guest workspace at any time.
          </p>
        </div>

        {/* Card: Credential Vault & AES-256 Encryption */}
        <div className="p-6 rounded-2xl bg-[#0B111E] border border-white/10 space-y-3 shadow-lg">
          <h2 className="text-lg font-bold text-white">
            3. Encrypted Credential Vault
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            All API keys, OAuth refresh tokens, and webhook secrets configured inside the Credentials tab are encrypted at rest using AES-256-GCM. Decryption keys are stored in isolated environment variables and never surfaced in client-side network payloads or client bundle code.
          </p>
        </div>

        {/* Card: User Rights (GDPR & CCPA) */}
        <div className="p-6 rounded-2xl bg-[#0B111E] border border-white/10 space-y-3 shadow-lg">
          <h2 className="text-lg font-bold text-white">
            4. User Rights, Deletion &amp; Data Export
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            You retain absolute ownership of all workflow definitions, node logic, and custom JavaScript functions authored within Knotrun Studio. You may delete any workspace or account with immediate cascading deletion of all associated workflows, runs, and credentials.
          </p>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="text-xs font-mono text-slate-400 hover:text-white transition"
          >
            &larr; Return to Workspaces
          </Link>
          <a
            href="mailto:security@knotrun.io"
            className="text-xs font-mono text-slate-400 hover:text-white transition"
          >
            Security Inquiries: security@knotrun.io
          </a>
        </div>
      </div>
    </div>
  );
}
