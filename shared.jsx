// Shared components — warm palette version

// Live waveform — softer, gentler
function LiveWaveform({ height = 80, color = 'terracotta', active = true, barCount = 70 }) {
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const phaseRef = React.useRef(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const cmap = {
      terracotta: 'oklch(0.62 0.14 40)',
      olive:      'oklch(0.55 0.08 115)',
      amber:      'oklch(0.72 0.14 75)',
      teal:       'oklch(0.62 0.14 40)',   // legacy alias
      purple:     'oklch(0.58 0.11 310)',
      green:      'oklch(0.55 0.08 145)',
      dim:        'oklch(0.68 0.014 50)',
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const barW = w / barCount;
      const gap = barW * 0.4;
      phaseRef.current += 0.04;

      for (let i = 0; i < barCount; i++) {
        const t = phaseRef.current + i * 0.2;
        const amp = active
          ? (Math.sin(t) * 0.4 + Math.sin(t * 2.1 + 1) * 0.28 + Math.sin(t * 0.6 + 2) * 0.22 + Math.sin(t * 4.5 + i * 0.3) * 0.1)
          : Math.sin(t * 0.2) * 0.04;
        const mag = Math.max(0.05, Math.abs(amp));
        const barH = mag * h * 0.85;
        const x = i * barW + gap / 2;
        const y = (h - barH) / 2;
        const rw = barW - gap;
        const r = Math.min(rw / 2, 3);
        ctx.fillStyle = cmap[color] || cmap.terracotta;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + rw, y, x + rw, y + r, r);
        ctx.arcTo(x + rw, y + barH, x + rw - r, y + barH, r);
        ctx.arcTo(x, y + barH, x, y + barH - r, r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [color, active, barCount]);

  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />;
}

// Static waveform — for timeline
function StaticWaveform({ height = 40, color = 'terracotta', density = 100, seed = 1, playhead = 0 }) {
  const rand = (n) => {
    const x = Math.sin(n * 9301 + seed * 49297) * 233280;
    return x - Math.floor(x);
  };
  const bars = React.useMemo(() => Array.from({ length: density }, (_, i) => {
    const base = (Math.sin(i * 0.08) * 0.3 + Math.sin(i * 0.15 + 2) * 0.25 + 0.55);
    let v = base * (0.6 + rand(i) * 0.4);
    if (rand(i * 1.3) < 0.08) v *= 0.2;
    return Math.max(0.08, Math.min(1, v));
  }), [density, seed]);

  const cmap = {
    terracotta: 'oklch(0.62 0.14 40)',
    olive:      'oklch(0.55 0.08 115)',
    amber:      'oklch(0.72 0.14 75)',
    teal:       'oklch(0.62 0.14 40)',   // legacy alias
    purple:     'oklch(0.58 0.11 310)',
    green:      'oklch(0.55 0.08 145)',
    dim:        'oklch(0.68 0.014 50)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1.5, height, width: '100%' }}>
      {bars.map((v, i) => {
        const past = (i / density) < playhead;
        return (
          <div key={i} style={{
            flex: 1,
            height: `${v * 100}%`,
            background: past ? cmap[color] : `color-mix(in oklch, ${cmap[color]} 35%, transparent)`,
            borderRadius: 2,
            minHeight: 3,
          }} />
        );
      })}
    </div>
  );
}

// Animated level — dots instead of segments
function AnimatedLevel({ active = true, segments = 18 }) {
  const [v, setV] = React.useState(0.5);
  React.useEffect(() => {
    if (!active) { setV(0.05); return; }
    const id = setInterval(() => setV(0.3 + Math.random() * 0.6), 95);
    return () => clearInterval(id);
  }, [active]);
  const activeCount = Math.floor(v * segments);
  return (
    <div style={{ display: 'flex', gap: 3, height: 8, alignItems: 'center' }}>
      {Array.from({ length: segments }, (_, i) => {
        const on = i < activeCount;
        let color = 'var(--olive)';
        if (i > segments * 0.85) color = 'var(--rec)';
        else if (i > segments * 0.7) color = 'var(--amber)';
        else if (i > segments * 0.4) color = 'var(--terracotta)';
        return (
          <div key={i} style={{
            flex: 1,
            height: on ? 8 : 3,
            background: on ? color : 'var(--line-0)',
            borderRadius: 2,
            transition: 'height 0.08s, background 0.08s',
          }} />
        );
      })}
    </div>
  );
}

function Avatar({ name = 'User', size = 32, tint = 'terracotta' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const tints = {
    terracotta: { bg: 'oklch(0.85 0.08 40)', fg: 'oklch(0.35 0.12 40)' },
    olive:      { bg: 'oklch(0.86 0.06 115)', fg: 'oklch(0.32 0.08 115)' },
    amber:      { bg: 'oklch(0.88 0.08 75)', fg: 'oklch(0.38 0.12 70)' },
    sky:        { bg: 'oklch(0.86 0.05 220)', fg: 'oklch(0.38 0.08 220)' },
    plum:       { bg: 'oklch(0.85 0.05 340)', fg: 'oklch(0.38 0.09 340)' },
  };
  const c = tints[tint] || tints.terracotta;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: c.bg, color: c.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600,
      flexShrink: 0,
      boxShadow: 'inset 0 -1px 0 oklch(0.3 0.05 40 / 0.08)',
    }}>{initials}</div>
  );
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

// Step indicator — 1. Check → 2. Record → 3. Export
function StepIndicator({ current }) {
  const steps = [
    { k: 'check', l: 'Check audio', n: 1 },
    { k: 'record', l: 'Record', n: 2 },
    { k: 'export', l: 'Export', n: 3 },
  ];
  const curIdx = steps.findIndex(s => s.k === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {steps.map((s, i) => {
        const done = i < curIdx;
        const active = i === curIdx;
        return (
          <React.Fragment key={s.k}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: done ? 'var(--olive)' : active ? 'var(--terracotta)' : 'var(--bg-2)',
                color: (done || active) ? 'oklch(0.98 0.01 60)' : 'var(--fg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
                border: `1px solid ${done ? 'var(--olive)' : active ? 'var(--terracotta)' : 'var(--line-0)'}`,
                boxShadow: active ? '0 0 0 4px var(--terracotta-tint)' : 'none',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : s.n}
              </div>
              <span style={{
                fontSize: 12.5,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--fg-0)' : done ? 'var(--fg-1)' : 'var(--fg-3)',
              }}>{s.l}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 36, height: 1,
                background: i < curIdx ? 'var(--olive)' : 'var(--line-0)',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Scene — cinematic background environments (painted with CSS)
// ─────────────────────────────────────────────────────────────
function Scene({ scene = 'lateNight', size = 'full' }) {
  // Paper stages — every scene is ink and one voice of vermillion on bone paper
  const INK = 'oklch(0.30 0.025 55)';
  const VERM = 'oklch(0.60 0.19 35)';
  const defs = {
    lateNight: { tone: 'oklch(0.955 0.012 88)', motif: 'lamp' },
    rooftop:   { tone: 'oklch(0.948 0.014 80)', motif: 'skyline' },
    whiteRoom: { tone: 'oklch(0.975 0.006 90)', motif: 'blank' },
    vintage:   { tone: 'oklch(0.945 0.016 75)', motif: 'halftone' },
    terrace:   { tone: 'oklch(0.952 0.014 95)', motif: 'meadow' },
  };
  const s = defs[scene] || defs.lateNight;
  return (
    <div style={{ position: 'absolute', inset: 0, background: s.tone, overflow: 'hidden' }}>
      {/* Ruled paper texture — faint horizontal guides */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5,
        background: 'repeating-linear-gradient(to bottom, transparent 0 46px, oklch(0.86 0.014 80 / 0.55) 46px 47px)' }} />
      {/* Margin rule, like a notebook */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 64, width: 1, background: 'oklch(0.60 0.19 35 / 0.18)' }} />

      {s.motif === 'lamp' && (
        <>
          <div style={{ position: 'absolute', right: '14%', top: '8%', width: 300, height: 300,
            background: 'radial-gradient(circle, oklch(0.88 0.07 70 / 0.55), transparent 68%)', filter: 'blur(18px)' }} />
          <svg viewBox="0 0 200 160" style={{ position: 'absolute', right: '16%', top: '6%', width: 130, opacity: 0.85 }}>
            <g stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round">
              <line x1="100" y1="0" x2="100" y2="42" />
              <path d="M78 42 h44 l-8 26 h-28 Z" fill="oklch(0.985 0.006 90)" />
              <path d="M86 74 a14 10 0 0 0 28 0" fill="oklch(0.72 0.13 75 / 0.5)" stroke="none" />
            </g>
          </svg>
        </>
      )}
      {s.motif === 'skyline' && (
        <>
          <div style={{ position: 'absolute', left: '12%', top: '16%', width: 110, height: 110, borderRadius: '50%',
            background: VERM, opacity: 0.85 }} />
          <svg viewBox="0 0 800 140" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: '18%', width: '100%', height: 120 }}>
            <path d="M0 120 L60 120 L60 70 L120 70 L120 100 L180 100 L180 40 L250 40 L250 90 L330 90 L330 60 L400 60 L400 110 L470 110 L470 30 L540 30 L540 80 L620 80 L620 55 L700 55 L700 95 L800 95"
              fill="none" stroke={INK} strokeWidth="1.6" opacity="0.7" />
          </svg>
        </>
      )}
      {s.motif === 'halftone' && (
        <>
          <div style={{ position: 'absolute', right: '10%', top: '12%', width: 260, height: 260, borderRadius: '50%', opacity: 0.5,
            background: `radial-gradient(circle, ${VERM} 1.4px, transparent 1.6px)`, backgroundSize: '14px 14px',
            WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 70%)', maskImage: 'radial-gradient(circle, black 40%, transparent 70%)' }} />
          <div style={{ position: 'absolute', inset: 26, border: '1px solid oklch(0.30 0.025 55 / 0.25)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 32, border: '1px solid oklch(0.30 0.025 55 / 0.15)', pointerEvents: 'none' }} />
        </>
      )}
      {s.motif === 'meadow' && (
        <>
          <svg viewBox="0 0 800 160" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: '14%', width: '100%', height: 140 }}>
            <path d="M0 110 Q 160 70 340 104 T 800 92" fill="none" stroke={INK} strokeWidth="1.6" opacity="0.65" />
            <path d="M0 140 Q 220 108 460 136 T 800 126" fill="none" stroke={INK} strokeWidth="1.2" opacity="0.4" />
          </svg>
          <svg viewBox="0 0 800 90" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, width: '100%', height: 80 }}>
            <path d="M-10 12 Q 400 78 810 26" fill="none" stroke={INK} strokeWidth="1.3" opacity="0.55" />
            {[90, 210, 330, 450, 570, 690].map((x, i) => {
              const y = 12 + Math.sin((x / 810) * Math.PI) * 60;
              return <circle key={i} cx={x} cy={y + 9} r="4.5" fill={i % 3 === 1 ? VERM : 'oklch(0.72 0.13 75)'} opacity="0.9">
                <animate attributeName="opacity" values="0.9;0.45;0.9" dur={`${2.8 + i * 0.5}s`} repeatCount="indefinite" />
              </circle>;
            })}
          </svg>
        </>
      )}

      {/* Soft paper vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 55%, oklch(0.82 0.02 75 / 0.35) 100%)' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MicSculpture — a beautiful hero microphone
// ─────────────────────────────────────────────────────────────
function MicSculpture({ size = 280, active = true, level = 0.6, popFilter = false, onDesk = false }) {
  return (
    <div style={{ position: 'relative', width: size, height: size * 1.4 }}>
      {/* Pulsing listening ring at base of stand */}
      {active && (
        <div className="mic-listen-ring" style={{
          position: 'absolute', left: '50%', bottom: '-8%',
          transform: 'translateX(-50%)',
          width: size * 0.75, height: size * 0.22,
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
      )}
      {/* Desk reflection */}
      {onDesk && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translateX(-50%) scaleY(-0.45)',
          width: size, height: size * 1.4,
          opacity: 0.22,
          filter: 'blur(1.2px)',
          maskImage: 'linear-gradient(to bottom, oklch(0 0 0 / 0.55), transparent 60%)',
          WebkitMaskImage: 'linear-gradient(to bottom, oklch(0 0 0 / 0.55), transparent 60%)',
          pointerEvents: 'none',
          zIndex: -1,
        }}>
          <MicSvg />
        </div>
      )}

      <div className={active ? 'mic-pulse' : ''} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <MicSvg active={active} />

        {/* Pop filter — mesh screen on gooseneck arm */}
        {popFilter && (
          <svg viewBox="0 0 200 280" width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              <radialGradient id="pop-mesh" cx="0.3" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="oklch(0.94 0 0 / 0.35)" />
                <stop offset="60%" stopColor="oklch(0.78 0 0 / 0.18)" />
                <stop offset="100%" stopColor="oklch(0.2 0 0 / 0.45)" />
              </radialGradient>
              <pattern id="mesh-pat" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
                <rect width="3" height="3" fill="none" />
                <circle cx="1.5" cy="1.5" r="0.4" fill="oklch(0.6 0.02 80 / 0.55)" />
              </pattern>
            </defs>
            {/* Gooseneck arm — rises from stand base, curves up to pop filter */}
            <path d="M 100 210 Q 30 205 22 158 Q 18 118 22 92"
              stroke="oklch(0.28 0.02 80)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M 100 210 Q 30 205 22 158 Q 18 118 22 92"
              stroke="oklch(0.55 0.05 80)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
            {/* Clamp on the arm */}
            <rect x="16" y="82" width="12" height="14" rx="1.5" fill="oklch(0.22 0.02 80)" stroke="oklch(0.45 0.04 80)" strokeWidth="0.6" />
            {/* Circular pop filter */}
            <g transform="translate(22, 92) rotate(14)">
              <ellipse cx="42" cy="0" rx="38" ry="40" fill="url(#pop-mesh)" stroke="oklch(0.42 0.03 80)" strokeWidth="1.8" />
              <ellipse cx="42" cy="0" rx="35" ry="37" fill="url(#mesh-pat)" opacity="0.7" />
              {/* Frame ring highlight */}
              <ellipse cx="42" cy="-2" rx="36" ry="38" fill="none" stroke="oklch(0.85 0.05 80 / 0.35)" strokeWidth="0.8" />
              {/* Subtle inner shadow */}
              <ellipse cx="42" cy="2" rx="32" ry="34" fill="none" stroke="oklch(0 0 0 / 0.3)" strokeWidth="1" />
            </g>
          </svg>
        )}

        {/* Reactive halo */}
        {active && (
          <div style={{
            position: 'absolute', inset: -20, borderRadius: '50%',
            background: `radial-gradient(circle at 50% 40%, oklch(0.78 0.1 82 / ${0.12 + level * 0.15}) 0%, transparent 55%)`,
            pointerEvents: 'none', transition: 'background 0.2s',
          }} />
        )}
      </div>
    </div>
  );
}

// Extracted mic SVG (so we can reuse for reflection)
function MicSvg({ active = true }) {
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%">
      <defs>
        <linearGradient id="brass-g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.86 0.11 82)" />
          <stop offset="45%" stopColor="oklch(0.68 0.09 82)" />
          <stop offset="100%" stopColor="oklch(0.38 0.05 82)" />
        </linearGradient>
        <linearGradient id="brass-hi" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.32 0.03 82)" />
          <stop offset="40%" stopColor="oklch(0.92 0.1 82)" />
          <stop offset="60%" stopColor="oklch(0.78 0.1 82)" />
          <stop offset="100%" stopColor="oklch(0.35 0.04 82)" />
        </linearGradient>
        <linearGradient id="mic-body" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.18 0.02 80)" />
          <stop offset="50%" stopColor="oklch(0.32 0.03 80)" />
          <stop offset="100%" stopColor="oklch(0.14 0.02 80)" />
        </linearGradient>
        <radialGradient id="grille-g" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="oklch(0.55 0.08 82)" />
          <stop offset="100%" stopColor="oklch(0.22 0.04 82)" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="268" rx="52" ry="7" fill="oklch(0.10 0.01 80)" opacity="0.7" />
      <rect x="94" y="200" width="12" height="68" fill="url(#mic-body)" />
      <ellipse cx="100" cy="200" rx="30" ry="5" fill="url(#brass-hi)" />
      <path d="M 52 140 Q 52 180 80 186 L 120 186 Q 148 180 148 140" stroke="url(#brass-hi)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="56" y="54" width="88" height="120" rx="44" fill="url(#brass-g)" stroke="oklch(0.38 0.04 82)" strokeWidth="1.5" />
      <rect x="64" y="62" width="72" height="104" rx="36" fill="url(#grille-g)" />
      <g opacity="0.6">
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={i} x1="66" x2="134" y1={66 + i * 10} y2={66 + i * 10} stroke="oklch(0.12 0.02 80)" strokeWidth="1" />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1={70 + i * 10} x2={70 + i * 10} y1="66" y2="164" stroke="oklch(0.12 0.02 80)" strokeWidth="1" />
        ))}
      </g>
      <ellipse cx="88" cy="80" rx="16" ry="28" fill="oklch(1 0 0 / 0.12)" />
      <rect x="84" y="144" width="32" height="12" rx="2" fill="oklch(0.22 0.03 82)" stroke="oklch(0.55 0.08 82)" strokeWidth="0.8" />
      <text x="100" y="153" textAnchor="middle" fontSize="7" fontFamily="monospace" fill="oklch(0.7 0.08 82)" letterSpacing="1">PS·47</text>
      <circle cx="100" cy="180" r="3"
        fill={active ? 'oklch(0.75 0.18 25)' : 'oklch(0.45 0.04 80)'}
        style={{ filter: active ? 'drop-shadow(0 0 4px oklch(0.75 0.18 25))' : 'none' }} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Countdown — full-screen 3 · 2 · 1
// ─────────────────────────────────────────────────────────────
function Countdown({ onDone }) {
  const [n, setN] = React.useState(3);
  React.useEffect(() => {
    if (n === 0) { const t = setTimeout(onDone, 420); return () => clearTimeout(t); }
    const t = setTimeout(() => setN(n - 1), 900);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 500,
      background: 'oklch(0.08 0.014 58 / 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 32,
      animation: 'fade-in 0.25s ease',
    }}>
      <div className="caps" style={{ color: 'var(--brass)', letterSpacing: '0.3em' }}>Starting in</div>
      <div key={n} className="display" style={{
        fontSize: 260, lineHeight: 1,
        color: n === 0 ? 'var(--rec)' : 'var(--brass-bright)',
        textShadow: n === 0
          ? '0 0 40px oklch(0.66 0.17 25 / 0.6), 0 0 100px oklch(0.66 0.17 25 / 0.3)'
          : '0 0 40px oklch(0.78 0.1 82 / 0.5), 0 0 100px oklch(0.78 0.1 82 / 0.25)',
        animation: 'count-pop 0.9s cubic-bezier(.22,1.5,.3,1) both',
        fontStyle: 'italic',
      }}>
        {n === 0 ? 'ON' : n}
      </div>
      <style>{`
        @keyframes count-pop {
          0% { transform: scale(0.4); opacity: 0; }
          30% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.08); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// On-Air sign
// ─────────────────────────────────────────────────────────────
function OnAirSign({ active = true }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '8px 16px',
      background: active ? 'oklch(0.18 0.05 25)' : 'oklch(0.18 0.02 80)',
      border: `1px solid ${active ? 'oklch(0.6 0.15 25)' : 'var(--line-1)'}`,
      borderRadius: 4,
      boxShadow: active
        ? '0 0 24px oklch(0.66 0.17 25 / 0.45), inset 0 0 16px oklch(0.66 0.17 25 / 0.2)'
        : 'var(--sh-sm)',
    }}>
      <span style={{
        fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400,
        fontSize: 18, letterSpacing: '0.25em',
      }} className={active ? 'on-air-text' : ''}>
        ON AIR
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Coach tip — dismissible, once-per-session
// ─────────────────────────────────────────────────────────────
function CoachTip({ tip, onDismiss }) {
  return (
    <div className="fade-in" style={{
      position: 'absolute', bottom: 110, left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: 380,
      padding: '14px 18px',
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--sh-lg)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      zIndex: 100,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--brass-tint)', color: 'var(--brass-bright)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <I.Sparkle size={14} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--brass)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          Coach
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-0)', lineHeight: 1.5 }}>{tip}</div>
      </div>
      <button onClick={onDismiss} className="btn-ghost" style={{ padding: 4, color: 'var(--fg-2)' }}>
        <I.X size={13} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LateNightBooth — illustrated cozy radio booth
// ─────────────────────────────────────────────────────────────
function LateNightBooth() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'linear-gradient(to bottom, oklch(0.14 0.02 55) 0%, oklch(0.10 0.015 55) 62%, oklch(0.18 0.025 55) 62%, oklch(0.22 0.03 55) 100%)',
    }}>
      {/* Back wall — wood paneling */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, bottom: '38%',
        background: `
          repeating-linear-gradient(90deg,
            oklch(0.16 0.022 55) 0px, oklch(0.16 0.022 55) 62px,
            oklch(0.11 0.015 55) 62px, oklch(0.11 0.015 55) 64px,
            oklch(0.18 0.025 55) 64px, oklch(0.18 0.025 55) 128px,
            oklch(0.11 0.015 55) 128px, oklch(0.11 0.015 55) 130px)`,
        filter: 'blur(1.2px)',
      }} />

      {/* Ceiling shadow */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '18%',
        background: 'linear-gradient(to bottom, oklch(0 0 0 / 0.75), transparent)',
        pointerEvents: 'none' }} />

      {/* Bookshelf — right back wall */}
      <div style={{
        position: 'absolute', right: '6%', top: '18%', width: 180, height: 140,
        background: 'oklch(0.12 0.015 55)',
        border: '1px solid oklch(0.08 0.01 55)',
        filter: 'blur(2.2px)',
        opacity: 0.85,
      }}>
        {[0, 1, 2].map(row => (
          <div key={row} style={{
            position: 'absolute', left: 6, right: 6, top: 10 + row * 45, height: 30,
            borderBottom: '1.5px solid oklch(0.07 0.01 55)',
            display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 4px',
          }}>
            {[0.6, 0.9, 0.7, 0.85, 0.55, 0.8, 0.95, 0.65, 0.75].map((h, i) => (
              <div key={i} style={{
                width: 7 + (i % 3) * 2, height: `${h * 90}%`,
                background: ['oklch(0.28 0.04 30)', 'oklch(0.22 0.03 60)', 'oklch(0.26 0.05 40)', 'oklch(0.30 0.04 25)', 'oklch(0.20 0.02 50)'][i % 5],
              }} />
            ))}
          </div>
        ))}
      </div>

      {/* Acoustic foam panels — left back wall */}
      <div style={{
        position: 'absolute', left: '5%', top: '22%', width: 160, height: 130,
        filter: 'blur(2px)',
        opacity: 0.75,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: 3,
      }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            background: `linear-gradient(${(i * 37) % 180}deg, oklch(0.16 0.02 30) 0%, oklch(0.10 0.015 30) 50%, oklch(0.14 0.018 30) 100%)`,
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          }} />
        ))}
      </div>

      {/* Window — right center, night cityscape */}
      <div style={{
        position: 'absolute', right: '28%', top: '14%', width: 220, height: 150,
        background: `
          linear-gradient(to bottom,
            oklch(0.18 0.04 250) 0%,
            oklch(0.22 0.05 240) 45%,
            oklch(0.16 0.03 245) 100%)`,
        border: '3px solid oklch(0.08 0.01 55)',
        borderRadius: 3,
        filter: 'blur(2.5px)',
        boxShadow: 'inset 0 0 20px oklch(0 0 0 / 0.5)',
        overflow: 'hidden',
      }}>
        {/* Window frame cross */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 3, background: 'oklch(0.08 0.01 55)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 3, background: 'oklch(0.08 0.01 55)' }} />
        {/* Skyline */}
        <svg viewBox="0 0 220 150" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <path d="M0 150 L0 110 L18 110 L18 88 L34 88 L34 100 L50 100 L50 70 L72 70 L72 92 L92 92 L92 60 L112 60 L112 82 L130 82 L130 98 L148 98 L148 66 L170 66 L170 86 L190 86 L190 78 L210 78 L210 104 L220 104 L220 150 Z" fill="oklch(0.08 0.015 250)" />
        </svg>
        {/* Window lights bokeh */}
        {Array.from({ length: 22 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(i * 37) % 90 + 5}%`,
            top: `${45 + (i * 13) % 40}%`,
            width: 3, height: 3, borderRadius: '50%',
            background: i % 4 === 0 ? 'oklch(0.92 0.08 75)' : i % 3 === 0 ? 'oklch(0.85 0.12 70)' : 'oklch(0.78 0.06 80)',
            boxShadow: '0 0 5px currentColor',
            opacity: 0.85,
          }} />
        ))}
      </div>

      {/* Warm lamp — upper left, cone of light */}
      <div style={{
        position: 'absolute', left: '8%', top: 0, width: 80, height: 130,
        pointerEvents: 'none',
      }}>
        {/* Lamp shade silhouette */}
        <div style={{
          position: 'absolute', left: 14, top: 0,
          width: 52, height: 44,
          background: 'linear-gradient(to bottom, oklch(0.08 0.01 55) 0%, oklch(0.14 0.02 40) 100%)',
          clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0 100%)',
        }} />
        {/* Lamp bulb glow */}
        <div style={{
          position: 'absolute', left: 30, top: 38, width: 20, height: 14,
          background: 'radial-gradient(ellipse, oklch(0.94 0.14 75) 0%, oklch(0.82 0.16 65) 60%, transparent 100%)',
          filter: 'blur(2px)',
        }} />
      </div>

      {/* Cone of lamp light — big soft gradient falling onto desk */}
      <div style={{
        position: 'absolute', left: '-4%', top: '4%', width: 520, height: 580,
        background: `radial-gradient(ellipse 55% 48% at 22% 14%,
          oklch(0.85 0.14 75 / 0.42) 0%,
          oklch(0.78 0.12 65 / 0.22) 28%,
          oklch(0.6 0.08 55 / 0.08) 55%,
          transparent 75%)`,
        pointerEvents: 'none',
        filter: 'blur(8px)',
      }} />

      {/* Desk surface — bottom 38% */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%',
        background: `
          linear-gradient(to bottom,
            oklch(0.22 0.04 50) 0%,
            oklch(0.26 0.05 48) 20%,
            oklch(0.20 0.035 50) 100%)`,
        boxShadow: 'inset 0 8px 20px oklch(0 0 0 / 0.6)',
      }}>
        {/* Wood grain */}
        <div style={{ position: 'absolute', inset: 0,
          background: `
            repeating-linear-gradient(92deg,
              transparent 0px, transparent 38px,
              oklch(0.16 0.03 50 / 0.35) 38px, oklch(0.16 0.03 50 / 0.35) 39px,
              transparent 39px, transparent 88px,
              oklch(0.30 0.05 50 / 0.22) 88px, oklch(0.30 0.05 50 / 0.22) 89px)`,
          opacity: 0.7,
        }} />
        {/* Desk front edge highlight */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2,
          background: 'linear-gradient(to right, transparent, oklch(0.55 0.08 70 / 0.5) 30%, oklch(0.55 0.08 70 / 0.5) 70%, transparent)' }} />
      </div>

      {/* Foreground prop — coffee mug edge (bottom left) */}
      <div style={{
        position: 'absolute', left: '6%', bottom: '6%', width: 90, height: 110,
        pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 90 110" width="100%" height="100%">
          <defs>
            <linearGradient id="mug-body" x1="0" x2="1">
              <stop offset="0%" stopColor="oklch(0.18 0.015 50)" />
              <stop offset="45%" stopColor="oklch(0.32 0.02 50)" />
              <stop offset="100%" stopColor="oklch(0.16 0.015 50)" />
            </linearGradient>
          </defs>
          {/* Handle */}
          <path d="M 60 40 Q 82 42 82 60 Q 82 78 60 80" stroke="url(#mug-body)" strokeWidth="6" fill="none" />
          {/* Body */}
          <rect x="14" y="30" width="52" height="68" rx="3" fill="url(#mug-body)" />
          {/* Rim */}
          <ellipse cx="40" cy="30" rx="26" ry="5" fill="oklch(0.12 0.01 50)" />
          <ellipse cx="40" cy="29" rx="23" ry="3.5" fill="oklch(0.08 0.01 40)" />
          {/* Steam */}
          <path d="M 30 20 Q 28 10 32 4" stroke="oklch(0.75 0.02 60 / 0.3)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 42 18 Q 44 8 40 2" stroke="oklch(0.75 0.02 60 / 0.25)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 52 20 Q 50 12 54 6" stroke="oklch(0.75 0.02 60 / 0.2)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Foreground prop — folded paper with handwritten notes (bottom right) */}
      <div style={{
        position: 'absolute', right: '8%', bottom: '5%', width: 150, height: 90,
        transform: 'rotate(-4deg)',
        pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 150 90" width="100%" height="100%">
          <defs>
            <linearGradient id="paper-g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.82 0.03 85)" />
              <stop offset="100%" stopColor="oklch(0.72 0.04 80)" />
            </linearGradient>
          </defs>
          {/* Paper */}
          <rect x="4" y="4" width="142" height="82" fill="url(#paper-g)" stroke="oklch(0.55 0.04 80)" strokeWidth="0.5" />
          {/* Fold crease */}
          <line x1="75" y1="4" x2="75" y2="86" stroke="oklch(0.55 0.04 80 / 0.35)" strokeWidth="0.8" strokeDasharray="2 3" />
          {/* Shadow */}
          <rect x="6" y="86" width="140" height="3" fill="oklch(0 0 0 / 0.35)" filter="blur(2px)" />
          {/* Handwritten squiggles */}
          {[14, 24, 34, 44, 56, 66].map((y, i) => (
            <path key={i} d={`M 14 ${y} Q ${20 + (i%2)*6} ${y - 3} ${30 + (i%3)*4} ${y} T ${50 + (i%2)*8} ${y} T ${70} ${y}`}
              stroke="oklch(0.22 0.02 260)" strokeWidth={i === 0 ? 1.6 : 1.1} fill="none" opacity={0.75 - i * 0.05} />
          ))}
          {[14, 26, 38, 50, 62].map((y, i) => (
            <path key={i + 'r'} d={`M 82 ${y} Q ${90 + (i%2)*4} ${y - 2} ${100 + (i%3)*3} ${y} T ${125 + (i%2)*6} ${y}`}
              stroke="oklch(0.22 0.02 260)" strokeWidth="1.1" fill="none" opacity={0.7 - i * 0.05} />
          ))}
          {/* Little star bullet */}
          <path d="M 8 72 L 10 76 L 14 77 L 10 79 L 9 83 L 7 79 L 4 77 L 7 75 Z" fill="oklch(0.55 0.14 30)" opacity="0.8" />
        </svg>
      </div>

      {/* On-air desk light (small, currently OFF) */}
      <div style={{
        position: 'absolute', left: '28%', bottom: '8%', width: 62, height: 36,
        pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 62 36" width="100%" height="100%">
          {/* Base */}
          <rect x="4" y="26" width="54" height="10" rx="2" fill="oklch(0.14 0.01 55)" stroke="oklch(0.35 0.03 70)" strokeWidth="0.6" />
          {/* Dome — unlit, dim red */}
          <rect x="8" y="6" width="46" height="22" rx="4" fill="oklch(0.22 0.05 30)" stroke="oklch(0.12 0.02 30)" strokeWidth="0.8" />
          {/* Text */}
          <text x="31" y="21" textAnchor="middle" fontSize="8.5" fontFamily="Georgia, serif" fontStyle="italic" fill="oklch(0.38 0.06 30)" letterSpacing="1.5">on air</text>
          {/* Subtle highlight */}
          <rect x="10" y="8" width="42" height="4" rx="2" fill="oklch(0.4 0.06 30 / 0.4)" />
        </svg>
      </div>

      {/* Depth-of-field vignette */}
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 55%, transparent 0%, oklch(0 0 0 / 0.35) 65%, oklch(0 0 0 / 0.65) 100%)',
        pointerEvents: 'none' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PullCord — hanging cord from ceiling with vintage bulb
// ─────────────────────────────────────────────────────────────
function PullCord({ sceneName = 'Late Night', onPull, state = 'idle' }) {
  // state: idle | pulling | releasing
  const [localState, setLocalState] = React.useState('idle');
  const current = state !== 'idle' ? state : localState;

  const handlePull = () => {
    if (localState !== 'idle') return;
    setLocalState('pulling');
    setTimeout(() => setLocalState('releasing'), 280);
    setTimeout(() => { onPull && onPull(); setLocalState('idle'); }, 900);
  };

  const translateY = current === 'pulling' ? 28 : current === 'releasing' ? -6 : 0;
  const rotate = current === 'releasing' ? 3 : 0;

  return (
    <div style={{ position: 'absolute', left: 40, top: 0, width: 96, height: 220, pointerEvents: 'none', zIndex: 8 }}>
      {/* Ceiling mount */}
      <div style={{
        position: 'absolute', left: 30, top: 0,
        width: 36, height: 10,
        background: 'linear-gradient(to bottom, oklch(0.22 0.02 55), oklch(0.12 0.015 55))',
        borderRadius: '0 0 4px 4px',
        boxShadow: '0 2px 6px oklch(0 0 0 / 0.6)',
      }} />
      {/* Mount bolt */}
      <div style={{ position: 'absolute', left: 44, top: 6, width: 8, height: 4, borderRadius: '50%',
        background: 'oklch(0.5 0.08 82)', boxShadow: 'inset 0 -1px 0 oklch(0 0 0 / 0.4)' }} />

      {/* Cord — braided, hanging */}
      <svg viewBox="0 0 96 220" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: `translateY(${translateY}px) rotate(${rotate}deg)`,
        transformOrigin: 'top center',
      }}>
        <defs>
          <linearGradient id="cord-g" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.24 0.03 55)" />
            <stop offset="50%" stopColor="oklch(0.42 0.05 55)" />
            <stop offset="100%" stopColor="oklch(0.22 0.03 55)" />
          </linearGradient>
        </defs>
        {/* Braided cord — two zig-zags */}
        <path d="M 48 10 Q 44 30 48 50 Q 52 70 48 90 Q 44 110 48 130 Q 52 150 48 170"
          stroke="url(#cord-g)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 48 10 Q 52 30 48 50 Q 44 70 48 90 Q 52 110 48 130 Q 44 150 48 170"
          stroke="oklch(0.30 0.04 55 / 0.7)" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Bulb socket */}
        <rect x="42" y="168" width="12" height="10" rx="1.5" fill="oklch(0.28 0.03 70)" stroke="oklch(0.12 0.01 55)" strokeWidth="0.6" />
        {/* Bulb */}
        <g>
          <ellipse cx="48" cy="194" rx="14" ry="16" fill="oklch(0.92 0.14 75)" opacity="0.28" filter="blur(4px)" />
          <path d="M 38 178 Q 36 196 48 208 Q 60 196 58 178 Z"
            fill="oklch(0.88 0.12 75)"
            stroke="oklch(0.55 0.08 75)" strokeWidth="0.6" />
          {/* Filament */}
          <path d="M 44 188 Q 46 192 48 190 Q 50 192 52 188" stroke="oklch(0.95 0.18 70)" strokeWidth="0.7" fill="none" />
          {/* Highlight */}
          <ellipse cx="43" cy="185" rx="3" ry="6" fill="oklch(1 0.1 85 / 0.5)" />
        </g>
      </svg>

      {/* Scene name pill — above bulb */}
      <div className="fade-in" key={sceneName} style={{
        position: 'absolute', left: '50%', top: 112,
        transform: 'translateX(-50%)',
        padding: '3px 10px',
        background: 'oklch(0.10 0.01 55 / 0.7)',
        backdropFilter: 'blur(6px)',
        border: '1px solid oklch(0.78 0.1 82 / 0.22)',
        borderRadius: 999,
        fontSize: 10.5,
        fontFamily: 'var(--font-display)', fontStyle: 'italic',
        color: 'var(--brass-bright)',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>{sceneName}</div>

      {/* Hit target */}
      <button onClick={handlePull} style={{
        position: 'absolute', left: 20, top: 160, width: 56, height: 64,
        cursor: 'grab', pointerEvents: 'auto',
        background: 'transparent', border: 0,
      }} aria-label="Pull to change scene" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pull cord annotation frames — designer spec
// ─────────────────────────────────────────────────────────────
function PullCordSpec() {
  return (
    <div style={{ padding: 12 }}>
      <div className="caps" style={{ marginBottom: 10 }}>Scene switcher · spec</div>
      <div style={{ fontSize: 11, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 14 }}>
        Pull the cord to change scene. Three states:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <CordFrame n="1" label="Idle" sub="Late Night" state="idle"
          notes={['bulb glowing warm', 'scene name sits above bulb']} />
        <CordFrame n="2" label="Mid-pull" sub="taut · motion blur" state="pulling"
          notes={['scene begins to fade', 'ambient sound crossfades']} />
        <CordFrame n="3" label="Released" sub="Rooftop" state="releasing"
          notes={['spring physics on release', 'bulb flickers on change', 'new name fades in']} />
      </div>
      <div style={{ height: 1, background: 'var(--line-0)', margin: '18px 0 12px' }} />
      <div className="caps" style={{ marginBottom: 10 }}>Ambient · just for you</div>
    </div>
  );
}

function CordFrame({ n, label, sub, state, notes }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {/* Frame */}
      <div style={{
        position: 'relative', flexShrink: 0,
        width: 68, height: 110,
        background: 'linear-gradient(to bottom, oklch(0.10 0.015 55), oklch(0.16 0.025 55))',
        borderRadius: 6,
        border: '1px solid var(--line-0)',
        overflow: 'hidden',
      }}>
        {/* Frame number */}
        <div style={{ position: 'absolute', top: 3, left: 5,
          fontSize: 8.5, color: 'var(--brass)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
          background: 'oklch(0 0 0 / 0.4)', padding: '1px 4px', borderRadius: 3 }}>{n}</div>
        {/* Ceiling */}
        <div style={{ position: 'absolute', left: 28, top: 8, width: 12, height: 3,
          background: 'oklch(0.2 0.02 55)', borderRadius: '0 0 2px 2px' }} />
        {/* Cord + bulb — animated pose */}
        <MiniCord state={state} />
        {/* Scene label */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 4, textAlign: 'center',
          fontSize: 7, fontFamily: 'var(--font-display)', fontStyle: 'italic',
          color: state === 'pulling' ? 'var(--fg-3)' : 'var(--brass-bright)',
          opacity: state === 'pulling' ? 0.4 : 1,
          transition: 'opacity 0.3s',
        }}>
          {state === 'releasing' ? 'Rooftop' : state === 'pulling' ? '…' : 'Late Night'}
        </div>
        {/* Motion blur lines for pulling */}
        {state === 'pulling' && (
          <>
            <div style={{ position: 'absolute', left: 32, top: 40, width: 2, height: 12, background: 'oklch(0.5 0.06 70 / 0.3)', filter: 'blur(1px)' }} />
            <div style={{ position: 'absolute', left: 36, top: 48, width: 2, height: 10, background: 'oklch(0.5 0.06 70 / 0.25)', filter: 'blur(1px)' }} />
          </>
        )}
        {/* Flicker highlight for release */}
        {state === 'releasing' && (
          <div style={{ position: 'absolute', left: 24, top: 54, width: 20, height: 20, borderRadius: '50%',
            background: 'radial-gradient(circle, oklch(0.95 0.16 75 / 0.6), transparent 70%)', filter: 'blur(2px)' }} />
        )}
      </div>

      {/* Notes */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-0)' }}>{label}</div>
        <div style={{ fontSize: 9.5, color: 'var(--fg-3)', marginBottom: 6, fontStyle: 'italic' }}>{sub}</div>
        {notes.map((note, i) => (
          <div key={i} style={{ display: 'flex', gap: 5, fontSize: 9.5, color: 'var(--fg-2)', lineHeight: 1.35, marginBottom: 2 }}>
            <span style={{ color: 'var(--brass)', flexShrink: 0 }}>→</span>
            <span>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCord({ state }) {
  const ty = state === 'pulling' ? 14 : state === 'releasing' ? -3 : 0;
  const rot = state === 'releasing' ? 4 : 0;
  const bulbColor = state === 'releasing' ? 'oklch(0.96 0.18 75)' : state === 'pulling' ? 'oklch(0.72 0.1 75)' : 'oklch(0.88 0.14 75)';
  return (
    <svg viewBox="0 0 68 110" style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: `translateY(${ty}px) rotate(${rot}deg)`,
      transformOrigin: 'top center',
    }}>
      <path d={state === 'pulling'
        ? "M 34 11 L 34 74"
        : "M 34 11 Q 30 30 34 50 Q 38 70 34 74"}
        stroke="oklch(0.4 0.04 55)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Bulb */}
      <ellipse cx="34" cy="85" rx="10" ry="11" fill={bulbColor} opacity="0.32" filter="blur(3px)" />
      <path d="M 29 76 Q 28 88 34 94 Q 40 88 39 76 Z" fill={bulbColor} stroke="oklch(0.5 0.06 75)" strokeWidth="0.4" />
      <path d="M 32 83 Q 33 85 34 84 Q 35 85 36 83" stroke="oklch(1 0.1 85)" strokeWidth="0.5" fill="none" />
    </svg>
  );
}

Object.assign(window, { LiveWaveform, StaticWaveform, AnimatedLevel, Avatar, fmtTime, StepIndicator, Scene, MicSculpture, Countdown, OnAirSign, CoachTip, LateNightBooth, PullCord, PullCordSpec });
