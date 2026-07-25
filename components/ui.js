// components/ui.js — identidade GO PET + componentes base (client)
"use client";
import { useEffect, useRef, useState } from "react";

export const C = {
  brand: "#1D3F2F", brandDeep: "#142C21", mint: "#DCE9DF", paper: "#F7F6F2",
  amber: "#D98E2B", amberSoft: "#F6E3C6", ink: "#22271F", inkSoft: "#5A6157",
  white: "#FFFFFF", danger: "#B4432F",
};
export const F = {
  display: "'Bricolage Grotesque',system-ui,sans-serif",
  body: "'Instrument Sans',system-ui,sans-serif",
  mono: "'Space Mono',ui-monospace,monospace",
};

export function Btn({ children, tom = "amber", cheio = true, className = "", ...rest }) {
  const cores = {
    amber: cheio ? { background: C.amber, color: C.brandDeep } : { border: `2px solid ${C.amber}`, color: C.amber },
    brand: cheio ? { background: C.brand, color: C.paper } : { border: `2px solid ${C.brand}`, color: C.brand },
    ghost: { color: C.brand },
  };
  return (
    <button className={`px-5 py-3 rounded-xl font-semibold transition-transform active:scale-95 disabled:opacity-40 ${className}`}
      style={{ fontFamily: F.body, fontSize: 15, ...cores[tom] }} {...rest}>
      {children}
    </button>
  );
}

export function Selo({ children, tom = "mint" }) {
  const m = {
    mint: { background: C.mint, color: C.brand },
    amber: { background: C.amberSoft, color: "#8A5A14" },
    live: { background: "#FBE9E5", color: C.danger },
  };
  return <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ fontFamily: F.mono, ...m[tom] }}>{children}</span>;
}

export function AvatarIni({ ini, tam = 44 }) {
  return (
    <div className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{ width: tam, height: tam, background: C.brand, color: C.mint, fontFamily: F.display, fontSize: tam * 0.36 }}>
      {ini}
    </div>
  );
}

export function Estrelas({ n }) {
  return (
    <span style={{ color: C.amber, letterSpacing: 1 }} aria-label={`${n} de 5`}>
      {"★".repeat(Math.round(n))}
      <span style={{ color: C.inkSoft, fontSize: 12, marginLeft: 6, fontFamily: F.mono }}>{Number(n).toFixed(1)}</span>
    </span>
  );
}

// ── Trilha do passeio (assinatura da marca) ────────────────────
const TRAJETO = "M 20 130 C 60 90, 90 140, 140 100 S 210 30, 260 70 S 320 120, 360 60";
export function TrilhaAoVivo({ altura = 170, rotulo = true, petFoto = null }) {
  const pathRef = useRef(null);
  const clipId = useRef("clip" + Math.random().toString(36).slice(2));
  const [pos, setPos] = useState({ x: 20, y: 130 });
  const [dir, setDir] = useState(1);
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const reduzir = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzir) { setProg(0.62); return; }
    let raf, t0;
    const loop = (t) => { if (!t0) t0 = t; setProg(((t - t0) / 24000) % 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    const pt = pathRef.current.getPointAtLength(len * prog);
    const pf = pathRef.current.getPointAtLength(len * Math.min(prog + 0.012, 1));
    setPos({ x: pt.x, y: pt.y });
    if (Math.abs(pf.x - pt.x) > 0.05) setDir(pf.x >= pt.x ? 1 : -1);
  }, [prog]);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: C.mint, height: altura }}>
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `linear-gradient(${C.brand}22 1px, transparent 1px), linear-gradient(90deg, ${C.brand}22 1px, transparent 1px)`,
        backgroundSize: "46px 46px" }} />
      <svg viewBox="0 0 380 160" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden="true">
        <defs><clipPath id={clipId.current}><circle r="10" /></clipPath></defs>
        <path d={TRAJETO} fill="none" stroke={C.brand} strokeWidth="3" strokeDasharray="1 10" strokeLinecap="round" opacity="0.85" />
        <path ref={pathRef} d={TRAJETO} fill="none" stroke="none" />
        <circle cx="20" cy="130" r="6" fill={C.brand} />
        <g transform={`translate(${pos.x} ${pos.y})`}>
          <circle r="12" fill={C.amber} stroke={C.white} strokeWidth="3" />
          {petFoto ? (
            <g clipPath={`url(#${clipId.current})`}>
              <image href={petFoto} x="-10" y="-10" width="20" height="20" preserveAspectRatio="xMidYMid slice" />
            </g>
          ) : (
            <text y="4.5" textAnchor="middle" fontSize="12" transform={dir === 1 ? "scale(-1,1)" : undefined}>🐕</text>
          )}
        </g>
      </svg>
      {rotulo && (
        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ background: C.white, fontFamily: F.mono, fontSize: 11, color: C.brand }}>
          <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: C.danger }} />AO VIVO
        </div>
      )}
      <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full"
        style={{ background: C.brandDeep, color: C.mint, fontFamily: F.mono, fontSize: 11 }}>1,2 km · 18 min</div>
    </div>
  );
}

export function Logo() {
  return (
    <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20 }}>
      <span style={{ color: C.amber }}>GO</span>
      <span style={{ color: C.brand }}> PET</span>
      <span style={{ fontFamily: F.mono, fontWeight: 400, fontSize: 11, color: C.inkSoft }}>.dogwalker</span>
    </span>
  );
}
