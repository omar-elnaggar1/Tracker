import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 ${className}`}>{children}</div>;
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  color = "#22c55e",
  label,
  sublabel,
}: {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  color?: string;
  label?: ReactNode;
  sublabel?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-tight">
        <span className="text-2xl font-bold tabular-nums">{label ?? Math.round(v)}</span>
        {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }}
      />
    </div>
  );
}

export function scoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

export const inputCls =
  "rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-base text-slate-100 outline-none sm:text-sm focus:border-slate-400";
export const btnCls =
  "rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium sm:py-1.5 text-slate-100 hover:bg-slate-700 disabled:opacity-40";
export const primaryBtnCls =
  "rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold sm:py-1.5 text-slate-950 hover:bg-emerald-400 disabled:opacity-40";
