import React from "react";

interface KnotrunLogoProps {
  variant?: "icon" | "full" | "minimal";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  glow?: boolean;
}

const SIZE_MAP = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

export const KnotrunLogo: React.FC<KnotrunLogoProps> = ({
  variant = "full",
  size = "md",
  className = "",
  glow = true,
}) => {
  const dim = SIZE_MAP[size];

  const iconElement = (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block transition-transform duration-300 group-hover:scale-105 select-none shrink-0"
      aria-label="Knotrun Emblem"
    >
      <defs>
        <radialGradient id="iconKnotAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF9900" stopOpacity={glow ? "0.35" : "0.1"} />
          <stop offset="70%" stopColor="#00E5FF" stopOpacity={glow ? "0.15" : "0.05"} />
          <stop offset="100%" stopColor="#070A0F" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="iconAmberConduit" x1="20" y1="20" x2="110" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE072" />
          <stop offset="35%" stopColor="#FF9900" />
          <stop offset="100%" stopColor="#FF4500" />
        </linearGradient>

        <linearGradient id="iconCyanVelocity" x1="110" y1="50" x2="30" y2="115" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="55%" stopColor="#00B0FF" />
          <stop offset="100%" stopColor="#00FF88" />
        </linearGradient>

        <filter id="iconCoreGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {glow && <circle cx="64" cy="64" r="58" fill="url(#iconKnotAura)" />}

      {/* Chassis Shield */}
      <path
        d="M 64 6 L 114 34 L 114 94 L 64 122 L 14 94 L 14 34 Z"
        fill="#080D18"
        stroke="#1E2E48"
        strokeWidth="1.8"
      />

      {/* Cyan Loop (Underneath) */}
      <path
        d="M 62 64 C 74 76, 92 88, 102 96 C 96 102, 84 104, 72 98 C 54 88, 38 72, 32 58 C 28 48, 30 36, 38 28 C 44 22, 54 22, 62 28 C 72 36, 78 48, 64 64 Z"
        fill="url(#iconCyanVelocity)"
        opacity="0.92"
      />

      {/* Amber Topological K-Spine & Ribbon */}
      <path
        d="M 32 26 C 32 26, 44 22, 50 26 C 58 32, 60 44, 52 54 L 38 68 C 30 76, 26 86, 32 96 C 36 102, 44 102, 50 98 C 60 90, 72 76, 84 62 L 102 36 C 106 30, 100 24, 92 26 C 80 28, 68 40, 58 52 Z"
        fill="url(#iconAmberConduit)"
      />

      {/* Intersect Shadow */}
      <path d="M 50 50 C 54 46, 60 48, 64 54 C 62 60, 56 64, 50 60 Z" fill="#03060B" opacity="0.6" />

      {/* Specular Highlight */}
      <path
        d="M 34 27 C 44 23, 56 30, 62 40 C 72 56, 88 44, 98 32 C 104 26, 98 38, 90 48 C 78 62, 66 76, 52 94"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.8"
        fill="none"
      />

      {/* DAG Vertex Quantum Cores */}
      <circle cx="34" cy="28" r="3.5" fill="#FFE072" stroke="#FF9900" strokeWidth="1.5" filter="url(#iconCoreGlow)" />
      <circle cx="34" cy="28" r="1.2" fill="#FFFFFF" />

      <circle cx="64" cy="64" r="4.5" fill="#00E5FF" stroke="#FFFFFF" strokeWidth="1.5" filter="url(#iconCoreGlow)" />
      <circle cx="64" cy="64" r="1.8" fill="#FFFFFF" />

      <circle cx="98" cy="94" r="3.5" fill="#00FF88" stroke="#00E5FF" strokeWidth="1.5" filter="url(#iconCoreGlow)" />
      <circle cx="98" cy="94" r="1.2" fill="#FFFFFF" />
    </svg>
  );

  if (variant === "icon" || variant === "minimal") {
    return <span className={className}>{iconElement}</span>;
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {iconElement}
      <div className="flex flex-col">
        <div className="flex items-center">
          <span className="text-white font-extrabold tracking-tight font-['Space_Grotesk'] text-lg sm:text-xl">
            KNOT
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 font-extrabold tracking-tight font-['Space_Grotesk'] text-lg sm:text-xl">
            RUN
          </span>
        </div>
        <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase -mt-1 hidden sm:block">
          ORCHESTRATION ENGINE
        </span>
      </div>
    </div>
  );
};
