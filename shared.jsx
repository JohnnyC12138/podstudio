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
function Scene({ scene = 'chicago', atmo = {}, voice = 0 }) {
  // ── A real room: desk in the foreground, a deep window onto a living city,
  //    light that actually spills. Nothing is a sticker; everything casts. ──
  const CITIES = {
    chicago: {
      name: 'Chicago',
      sky: ['oklch(0.32 0.06 265)', 'oklch(0.46 0.10 300)', 'oklch(0.68 0.14 55)', 'oklch(0.60 0.16 40)'],
      glow: 'oklch(0.62 0.14 45)', water: true, moon: false,
    },
    newyork: {
      name: 'New York',
      sky: ['oklch(0.24 0.05 275)', 'oklch(0.34 0.08 310)', 'oklch(0.52 0.11 350)', 'oklch(0.60 0.13 45)'],
      glow: 'oklch(0.55 0.12 350)', water: false, moon: true,
    },
    hongkong: {
      name: 'Hong Kong',
      sky: ['oklch(0.22 0.05 290)', 'oklch(0.32 0.09 330)', 'oklch(0.45 0.13 05)', 'oklch(0.50 0.15 25)'],
      glow: 'oklch(0.48 0.13 05)', water: true, moon: true,
    },
    losangeles: {
      name: 'Los Angeles',
      sky: ['oklch(0.48 0.08 260)', 'oklch(0.66 0.11 40)', 'oklch(0.78 0.13 60)', 'oklch(0.72 0.15 45)'],
      glow: 'oklch(0.74 0.13 55)', water: false, moon: false,
    },
    sanfrancisco: {
      name: 'San Francisco',
      sky: ['oklch(0.44 0.05 255)', 'oklch(0.58 0.07 80)', 'oklch(0.72 0.09 70)', 'oklch(0.64 0.11 50)'],
      glow: 'oklch(0.66 0.10 65)', water: true, moon: false,
    },
  };
  const c = CITIES[scene] || CITIES.chicago;

  // Depth palette — atmospheric perspective (far = pale, near = ink)
  const FAR  = 'oklch(0.45 0.045 280 / 0.55)';
  const MID  = 'oklch(0.31 0.05 275)';
  const NEAR = 'oklch(0.20 0.04 270)';
  const LIT  = 'oklch(0.86 0.12 78)';
  const LIT2 = 'oklch(0.78 0.10 60)';

  // Deterministic warm window grid for a building face
  const Win = ({ x, y, w, h, seed = 1, step = 6.5, glowRatio = 2 }) => {
    const dots = []; let k = seed;
    for (let wy = y + 3; wy < y + h - 3; wy += step) {
      for (let wx = x + 2.5; wx < x + w - 2.5; wx += step) {
        k = (k * 1103515245 + 12345) % 2147483648;
        if (k % 6 < glowRatio) dots.push(
          <rect key={`${wx}-${wy}`} x={wx} y={wy} width="2.1" height="2.6"
            fill={k % 11 === 0 ? LIT2 : LIT} opacity={0.35 + (k % 55) / 100} />);
      }
    }
    return <g>{dots}</g>;
  };
  // Rooftop aircraft beacon
  const Beacon = ({ x, y, d = 0 }) => (
    <circle cx={x} cy={y} r="1.8" fill="oklch(0.62 0.22 25)"
      style={{ animation: `beacon ${1.6 + d}s ease-in-out ${d}s infinite` }} />
  );

  const skylines = {
    chicago: (
      <g>
        <path d="M0 240 L0 168 L36 168 L36 148 L74 148 L74 176 L120 176 L120 156 L168 156 L168 182 L230 182 L230 150 L300 150 L300 190 L400 190 L400 160 L470 160 L470 186 L560 186 L560 152 L640 152 L640 178 L720 178 L720 240 Z" fill={FAR} />
        <g>
          <rect x="120" y="118" width="52" height="122" fill={MID} /><Win x={120} y={120} w={52} h={118} seed={3} />
          <rect x="205" y="132" width="44" height="108" fill={MID} /><Win x={205} y={134} w={44} h={104} seed={9} />
          <rect x="580" y="124" width="48" height="116" fill={MID} /><Win x={580} y={126} w={48} h={112} seed={17} />
          <rect x="655" y="146" width="40" height="94" fill={MID} /><Win x={655} y={148} w={40} h={90} seed={19} />
        </g>
        {/* Willis Tower — tiered, two antennas, beacons */}
        <g>
          <rect x="306" y="64" width="52" height="176" fill={NEAR} />
          <rect x="314" y="44" width="36" height="22" fill={NEAR} />
          <rect x="322" y="30" width="20" height="16" fill={NEAR} />
          <line x1="327" y1="2" x2="327" y2="30" stroke={NEAR} strokeWidth="2.6" />
          <line x1="339" y1="-6" x2="339" y2="30" stroke={NEAR} strokeWidth="2.6" />
          <Beacon x={327} y={4} d={0} /><Beacon x={339} y={-4} d={0.7} />
          <Win x={306} y={66} w={52} h={172} seed={7} step={6} glowRatio={2} />
          <rect x="306" y="64" width="5" height="176" fill="oklch(0.55 0.10 45 / 0.35)" />
        </g>
        {/* Hancock — taper + X-bracing + antennas */}
        <g>
          <path d="M468 240 L476 74 L520 74 L528 240 Z" fill={NEAR} />
          <line x1="490" y1="46" x2="490" y2="74" stroke={NEAR} strokeWidth="2.6" />
          <line x1="506" y1="52" x2="506" y2="74" stroke={NEAR} strokeWidth="2.2" />
          <Beacon x={490} y={48} d={0.4} /><Beacon x={506} y={54} d={1.1} />
          <g stroke="oklch(0.42 0.05 270)" strokeWidth="1.3" opacity="0.9">
            <line x1="478" y1="96" x2="518" y2="140" /><line x1="518" y1="96" x2="478" y2="140" />
            <line x1="478" y1="140" x2="518" y2="184" /><line x1="518" y1="140" x2="478" y2="184" />
            <line x1="479" y1="184" x2="519" y2="228" /><line x1="519" y1="184" x2="479" y2="228" />
          </g>
          <Win x={478} y={80} w={40} h={156} seed={13} step={7.5} />
          <path d="M468 240 L476 74 L481 74 L474 240 Z" fill="oklch(0.55 0.10 45 / 0.3)" />
        </g>
      </g>
    ),
    newyork: (
      <g>
        <path d="M0 240 L0 172 L40 172 L40 152 L90 152 L90 178 L140 178 L140 158 L200 158 L200 184 L260 184 L260 148 L330 148 L330 186 L420 186 L420 156 L500 156 L500 180 L570 180 L570 148 L650 148 L650 176 L720 176 L720 240 Z" fill={FAR} />
        <g>
          <path d="M120 240 L126 108 L166 108 L172 240 Z" fill={MID} /><line x1="146" y1="76" x2="146" y2="108" stroke={MID} strokeWidth="2.4" /><Beacon x={146} y={78} d={0.2} />
          <Win x={128} y={112} w={38} h={124} seed={31} step={7} />
          <rect x="222" y="152" width="46" height="88" fill={MID} /><Win x={222} y={154} w={46} h={84} seed={33} />
          <rect x="540" y="140" width="44" height="100" fill={MID} /><Win x={540} y={142} w={44} h={96} seed={37} />
          <rect x="618" y="126" width="40" height="114" fill={MID} /><Win x={618} y={128} w={40} h={110} seed={39} />
        </g>
        {/* Empire State — setbacks, lit crown, needle */}
        <g>
          <rect x="300" y="146" width="76" height="94" fill={NEAR} />
          <rect x="312" y="104" width="52" height="44" fill={NEAR} />
          <rect x="324" y="66" width="28" height="40" fill={NEAR} />
          <rect x="324" y="66" width="28" height="10" fill={LIT2} opacity="0.85" />
          <line x1="338" y1="28" x2="338" y2="66" stroke={NEAR} strokeWidth="3" />
          <Beacon x={338} y={30} d={0} />
          <Win x={302} y={148} w={72} h={90} seed={21} /><Win x={314} y={106} w={48} h={40} seed={23} step={5.5} />
          <rect x="300" y="146" width="5" height="94" fill="oklch(0.52 0.10 350 / 0.4)" />
        </g>
        {/* Chrysler — glowing crown arches */}
        <g>
          <rect x="452" y="128" width="48" height="112" fill={NEAR} />
          <path d="M452 128 Q476 88 500 128 Z" fill={NEAR} />
          <path d="M460 122 Q476 96 492 122 Z" fill="none" stroke={LIT} strokeWidth="1.4" opacity="0.9" />
          <path d="M465 118 Q476 100 487 118 Z" fill="none" stroke={LIT} strokeWidth="1.2" opacity="0.75" />
          <path d="M470 114 Q476 104 482 114 Z" fill="none" stroke={LIT} strokeWidth="1" opacity="0.6" />
          <line x1="476" y1="62" x2="476" y2="92" stroke={NEAR} strokeWidth="2.4" /><Beacon x={476} y={64} d={0.9} />
          <Win x={454} y={132} w={44} h={104} seed={27} step={6} />
        </g>
      </g>
    ),
    hongkong: (
      <g>
        {/* The Peak — ridge with radio tower */}
        <path d="M0 240 Q 130 96 300 168 Q 470 92 610 150 Q 680 122 720 140 L720 240 Z" fill="oklch(0.30 0.05 290 / 0.6)" />
        <line x1="196" y1="96" x2="196" y2="124" stroke="oklch(0.30 0.05 290)" strokeWidth="2" /><Beacon x={196} y={98} d={0.5} />
        <g>
          <rect x="128" y="140" width="46" height="100" fill={MID} /><Win x={128} y={142} w={46} h={96} seed={43} step={5.5} glowRatio={3} />
          <rect x="240" y="156" width="38" height="84" fill={MID} /><Win x={240} y={158} w={38} h={80} seed={47} step={5.5} glowRatio={3} />
          <rect x="600" y="134" width="44" height="106" fill={MID} /><Win x={600} y={136} w={44} h={102} seed={53} step={5.5} glowRatio={3} />
        </g>
        {/* IFC — crown of fins */}
        <g>
          <rect x="300" y="76" width="54" height="164" fill={NEAR} />
          <path d="M300 76 L308 56 L346 56 L354 76 Z" fill={NEAR} />
          <g stroke={NEAR} strokeWidth="2.2">{[310,320,330,340].map((x,i)=><line key={i} x1={x} y1="40" x2={x} y2="56" />)}</g>
          <Beacon x={327} y={42} d={0.3} />
          <Win x={302} y={80} w={50} h={158} seed={57} step={5.5} glowRatio={3} />
          <rect x="349" y="76" width="5" height="164" fill="oklch(0.50 0.12 05 / 0.4)" />
        </g>
        {/* Bank of China — faceted diagonals */}
        <g>
          <path d="M440 240 L440 118 L474 80 L508 118 L508 240 Z" fill={NEAR} />
          <path d="M440 118 L474 80 L474 148 Z" fill="oklch(0.28 0.05 275)" />
          <g stroke="oklch(0.52 0.07 270)" strokeWidth="1.4" opacity="0.95">
            <line x1="440" y1="150" x2="508" y2="205" /><line x1="508" y1="150" x2="440" y2="205" />
            <line x1="440" y1="118" x2="508" y2="118" /><line x1="440" y1="205" x2="508" y2="150" />
          </g>
          <line x1="474" y1="52" x2="474" y2="80" stroke={NEAR} strokeWidth="2.4" /><Beacon x={474} y={54} d={1.2} />
          <Win x={444} y={122} w={60} h={112} seed={59} step={7} glowRatio={3} />
        </g>
      </g>
    ),
    losangeles: (
      <g>
        {/* Enormous low sun with banded glow */}
        <circle cx="180" cy="150" r="80" fill="oklch(0.88 0.11 60)" opacity="0.3" />
        <circle cx="180" cy="150" r="55" fill="oklch(0.90 0.12 62)" opacity="0.55" />
        <circle cx="180" cy="150" r="38" fill="oklch(0.94 0.12 70)" />
        <rect x="90" y="166" width="190" height="3" fill={c.sky[3]} opacity="0.6" />
        <rect x="104" y="178" width="160" height="2.4" fill={c.sky[3]} opacity="0.45" />
        {/* Low hills with scattered house lights */}
        <path d="M0 240 L0 216 Q 150 196 320 226 Q 420 214 530 230 L720 222 L720 240 Z" fill="oklch(0.30 0.05 100 / 0.8)" />
        {Array.from({length:11}).map((_,i)=><rect key={i} x={36+i*60} y={218+(i%3)*5} width="2" height="2" fill={LIT} opacity="0.85" />)}
        <g>
          <rect x="316" y="106" width="42" height="134" fill={NEAR} /><path d="M316 106 Q337 90 358 106 Z" fill={NEAR} />
          <rect x="316" y="106" width="42" height="6" fill={LIT2} opacity="0.7" />
          <Win x={318} y={112} w={38} h={126} seed={61} step={6.5} />
          <rect x="380" y="146" width="38" height="94" fill={MID} /><Win x={380} y={148} w={38} h={90} seed={63} />
          <path d="M436 240 L442 152 L468 152 L474 240 Z" fill={MID} /><Win x={444} y={156} w={24} h={80} seed={69} step={5.5} />
          <Beacon x={337} y={92} d={0.6} />
        </g>
        {/* Palms — inside the glass, close */}
        {[96, 154, 664].map((px, i) => (
          <g key={i}>
            <path d={`M${px} 240 Q ${px + 5} 196 ${px + 2} 178`} stroke="oklch(0.20 0.04 120)" strokeWidth="4" fill="none" />
            <g stroke="oklch(0.24 0.06 130)" strokeWidth="2.4" fill="none" strokeLinecap="round">
              <path d={`M${px + 2} 178 q -20 -10 -32 3`} /><path d={`M${px + 2} 178 q 20 -10 32 3`} />
              <path d={`M${px + 2} 178 q -13 -17 -25 -15`} /><path d={`M${px + 2} 178 q 13 -17 25 -15`} />
              <path d={`M${px + 2} 178 q 2 -20 -1 -22`} />
            </g>
          </g>
        ))}
      </g>
    ),
    sanfrancisco: (
      <g>
        <path d="M0 240 L0 176 L60 176 L60 158 L120 158 L120 182 L200 182 L200 162 L280 162 L280 186 L360 186 L360 168 L430 168 L430 240 Z" fill={FAR} />
        {/* Transamerica + Coit */}
        <path d="M150 240 L182 78 L214 240 Z" fill={MID} />
        <g fill={LIT} opacity="0.75">{[120,140,160,180,200,220].map((y,i)=><rect key={i} x={182-(y-78)/7.4} y={y} width={((y-78)/7.4)*2} height="1.8" opacity="0.4" />)}</g>
        <line x1="182" y1="56" x2="182" y2="78" stroke={MID} strokeWidth="2.2" /><Beacon x={182} y={58} d={0.8} />
        <path d="M92 240 L100 168 L114 168 L122 240 Z" fill={MID} /><rect x="98" y="158" width="18" height="12" rx="5" fill={MID} />
        <rect x="250" y="150" width="40" height="90" fill={MID} /><Win x={250} y={152} w={40} h={86} seed={71} step={6} />
        {/* Golden Gate — near, detailed, International Orange */}
        <g>
          <g stroke="oklch(0.55 0.15 32)" strokeWidth="6" fill="none">
            <line x1="490" y1="240" x2="490" y2="96" /><line x1="646" y1="240" x2="646" y2="96" />
          </g>
          <g stroke="oklch(0.55 0.15 32)" strokeWidth="3.4" fill="none">
            <line x1="478" y1="112" x2="658" y2="112" /><line x1="478" y1="148" x2="658" y2="148" />
            <line x1="478" y1="96" x2="502" y2="96" /><line x1="634" y1="96" x2="658" y2="96" />
          </g>
          <path d="M420 208 Q 490 100 568 186 Q 646 100 720 196" stroke="oklch(0.58 0.16 34)" strokeWidth="2.6" fill="none" />
          <g stroke="oklch(0.55 0.15 32)" strokeWidth="1.1" opacity="0.95">
            {[440,456,472,508,524,540,556,590,606,622,662,678,694].map((x,i)=>{
              const t = x < 568 ? Math.abs(x-490)/78 : Math.abs(x-646)/78;
              const y = 186 - (1 - t*t) * 84;
              return <line key={i} x1={x} y1={Math.max(y,100)} x2={x} y2="204" />;
            })}
          </g>
          <rect x="420" y="200" width="300" height="7" fill="oklch(0.48 0.13 32)" />
          <Beacon x={490} y={92} d={0.2} /><Beacon x={646} y={92} d={1.0} />
        </g>
        {/* Fog banks — drifting */}
        <rect x="-40" y="150" width="820" height="30" fill="oklch(0.90 0.012 80)" opacity="0.42" style={{ filter: 'blur(9px)', animation: 'sc-drift 34s ease-in-out infinite alternate' }} />
        <rect x="-40" y="196" width="820" height="22" fill="oklch(0.92 0.010 82)" opacity="0.3" style={{ filter: 'blur(10px)', animation: 'sc-drift 44s ease-in-out infinite alternate-reverse' }} />
      </g>
    ),
  };

  // Window geometry (all % of stage)
  const WIN = { left: '25%', width: '54%', top: '4.5%', height: '60%' };
  const lampOn = !!atmo.lamp;
  const fireOn = !!atmo.fireplace;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'linear-gradient(to bottom, oklch(0.925 0.013 84) 0%, oklch(0.945 0.012 86) 40%, oklch(0.950 0.012 87) 100%)' }}>

      {/* Wall texture — plaster, barely there */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35,
        background: 'repeating-linear-gradient(to bottom, transparent 0 52px, oklch(0.87 0.013 80 / 0.5) 52px 53px)' }} />

      {/* City light wash on the wall around the window */}
      <div style={{ position: 'absolute', left: '12%', top: '-6%', width: '80%', height: '86%', pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 42%, ${c.glow.replace(')', ' / 0.16)')} 0%, transparent 62%)`, filter: 'blur(14px)' }} />

      {/* ── Fireplace — built into the wall, tucked behind the desk ── */}
      {fireOn && (
        <div style={{ position: 'absolute', left: '2.5%', bottom: '15%', width: 210, height: 200, zIndex: 2 }}>
          <svg viewBox="0 0 210 200" width="210" height="200">
            <rect x="14" y="30" width="182" height="170" rx="4" fill="oklch(0.885 0.016 78)" />
            <rect x="14" y="30" width="182" height="170" rx="4" fill="none" stroke="oklch(0.79 0.02 74)" strokeWidth="1.5" />
            <rect x="6" y="18" width="198" height="16" rx="3" fill="oklch(0.86 0.018 76)" stroke="oklch(0.76 0.02 72)" strokeWidth="1.2" />
            <rect x="6" y="34" width="198" height="4" fill="oklch(0.30 0.03 60 / 0.12)" />
            {/* Mantel props: books + tiny clock */}
            <g>
              <rect x="26" y="2" width="7" height="17" rx="1" fill="oklch(0.52 0.14 33)" />
              <rect x="35" y="4" width="6" height="15" rx="1" fill="oklch(0.45 0.06 130)" />
              <rect x="43" y="0" width="7" height="19" rx="1" fill="oklch(0.60 0.10 70)" transform="rotate(7 46 19)" />
              <circle cx="172" cy="10" r="8.5" fill="oklch(0.94 0.008 88)" stroke="oklch(0.40 0.03 60)" strokeWidth="1.4" />
              <line x1="172" y1="10" x2="172" y2="4.5" stroke="oklch(0.30 0.02 60)" strokeWidth="1.2" />
              <line x1="172" y1="10" x2="176" y2="12" stroke="oklch(0.30 0.02 60)" strokeWidth="1" />
            </g>
            {/* Firebox — recessed with depth */}
            <path d="M46 200 L46 92 Q 105 56 164 92 L164 200 Z" fill="oklch(0.13 0.02 45)" />
            <path d="M46 92 Q 105 56 164 92 L164 100 Q 105 66 46 100 Z" fill="oklch(0.09 0.015 45)" />
            <ellipse cx="105" cy="192" rx="52" ry="9" fill="oklch(0.20 0.035 45)" />
            <rect x="66" y="180" width="78" height="9" rx="4.5" fill="oklch(0.36 0.06 55)" transform="rotate(-4 105 184)" />
            <rect x="70" y="186" width="70" height="9" rx="4.5" fill="oklch(0.30 0.05 50)" transform="rotate(5 105 190)" />
            {/* Embers */}
            {[86, 100, 116, 128].map((x, i) => (
              <circle key={i} cx={x} cy={190 - (i % 2) * 4} r="1.6" fill="oklch(0.72 0.17 45)"
                style={{ animation: `beacon ${1.2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }} />
            ))}
          </svg>
          {/* Flames — outer body + bright core; they catch, settle, catch again */}
          {[{ x: 84, s: 0.9, d: 0, t: 3.1 }, { x: 98, s: 1.4, d: 0.6, t: 2.5 }, { x: 114, s: 1.15, d: 1.3, t: 3.6 }, { x: 126, s: 0.7, d: 0.2, t: 2.9 }].map((f, i) => (
            <React.Fragment key={i}>
              <div style={{ position: 'absolute', left: f.x - 10, bottom: 16, width: 20, height: 48 * f.s,
                borderRadius: '50% 50% 44% 44% / 72% 72% 28% 28%',
                background: 'linear-gradient(to top, oklch(0.58 0.19 33) 0%, oklch(0.74 0.17 50) 45%, oklch(0.88 0.13 75) 78%, oklch(0.94 0.09 90) 100%)',
                transformOrigin: 'bottom center',
                boxShadow: '0 0 18px oklch(0.75 0.16 55 / 0.6)',
                animation: `flame-burst ${f.t}s ease-in-out ${f.d}s infinite`, filter: 'blur(0.4px)' }} />
              <div style={{ position: 'absolute', left: f.x - 4.5, bottom: 17, width: 9, height: 26 * f.s,
                borderRadius: '50% 50% 46% 46% / 70% 70% 30% 30%',
                background: 'linear-gradient(to top, oklch(0.82 0.14 65), oklch(0.96 0.06 95))',
                transformOrigin: 'bottom center',
                animation: `flame-burst ${f.t * 0.82}s ease-in-out ${f.d + 0.3}s infinite` }} />
            </React.Fragment>
          ))}
          {/* Sparks drifting up the flue */}
          {[0, 1, 2].map(i => (
            <div key={'sp' + i} style={{ position: 'absolute', left: 92 + i * 14, width: 2.4, height: 2.4, borderRadius: '50%',
              background: 'oklch(0.85 0.15 70)', '--sway': `${(i - 1) * 10}px`,
              animation: `spark-rise ${2.2 + i * 0.9}s ease-out ${i * 1.4}s infinite both` }} />
          ))}
          {/* Glow from the box */}
          <div style={{ position: 'absolute', left: 30, bottom: 0, width: 150, height: 110, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center bottom, oklch(0.75 0.15 55 / 0.5), transparent 70%)',
            animation: 'hearth-glow 2.2s ease-in-out infinite' }} />
        </div>
      )}

      {/* ── The window — casing with depth, city behind glass ── */}
      <div style={{ position: 'absolute', ...WIN, zIndex: 3 }}>
        {/* Outer casing */}
        <div style={{ position: 'absolute', inset: -14, borderRadius: 10,
          background: 'linear-gradient(to bottom, oklch(0.90 0.014 80), oklch(0.86 0.016 76))',
          boxShadow: '0 34px 70px -30px oklch(0.28 0.04 60 / 0.45), 0 4px 14px -6px oklch(0.28 0.04 60 / 0.25)' }} />
        {/* Depth reveal */}
        <div style={{ position: 'absolute', inset: -3, borderRadius: 6, background: 'oklch(0.72 0.02 72)',
          boxShadow: 'inset 0 2px 5px oklch(0.25 0.03 60 / 0.45)' }} />

        {/* Glass + city */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 4, overflow: 'hidden',
          background: `linear-gradient(to bottom, ${c.sky[0]} 0%, ${c.sky[1]} 40%, ${c.sky[2]} 74%, ${c.sky[3]} 100%)` }}>
          {/* Stars */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={'s' + i} style={{ position: 'absolute', left: `${(i * 43 + 11) % 96 + 2}%`, top: `${(i * 15) % 30 + 2}%`,
              width: 1.5, height: 1.5, borderRadius: '50%', background: 'oklch(0.95 0.02 85)',
              animation: `sc-twinkle ${2.6 + (i % 5) * 0.9}s ease-in-out ${i * 0.5}s infinite` }} />
          ))}
          {c.moon && (
            <div style={{ position: 'absolute', right: '12%', top: '8%', width: 40, height: 40, borderRadius: '50%',
              background: 'oklch(0.94 0.025 92)', boxShadow: '0 0 30px oklch(0.94 0.03 90 / 0.55), inset -8px -5px 0 oklch(0.84 0.035 86)' }} />
          )}

          {/* Skyline — layered depth */}
          <svg viewBox="0 0 720 240" preserveAspectRatio="xMidYMax slice"
            style={{ position: 'absolute', left: 0, right: 0, bottom: c.water ? '11%' : 0, width: '100%', height: '82%' }}>
            {skylines[scene] || skylines.chicago}
          </svg>

          {/* Water — reflected light */}
          {c.water && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '11%',
              background: `linear-gradient(to bottom, oklch(0.26 0.05 265), oklch(0.18 0.04 268))` }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ position: 'absolute', left: `${(i * 31 + 6) % 86 + 5}%`, top: `${(i * 27) % 68 + 8}%`,
                  width: 14 + (i % 4) * 9, height: 1.5,
                  background: i % 4 === 1 ? 'oklch(0.62 0.18 25)' : LIT, opacity: 0.55,
                  animation: `window-shimmer ${1.8 + (i % 5) * 0.7}s ease-in-out ${i * 0.28}s infinite` }} />
              ))}
            </div>
          )}

          {/* Weather, outside the glass */}
          {atmo.snow && Array.from({ length: 30 }).map((_, i) => (
            <div key={'sn' + i} style={{ position: 'absolute', left: `${(i * 37 + 5) % 98}%`, top: '-4%',
              width: i % 4 === 0 ? 4 : 2.4, height: i % 4 === 0 ? 4 : 2.4, borderRadius: '50%',
              background: 'oklch(0.97 0.005 90)', opacity: 0.9, '--sway': `${(i % 5) * 9 - 18}px`,
              filter: i % 4 === 0 ? 'blur(0.6px)' : 'none',
              animation: `snow-fall ${4 + (i % 7) * 1.2}s linear ${(i * 0.47) % 5}s infinite both` }} />
          ))}
          {atmo.rain && (
            <>
              {Array.from({ length: 22 }).map((_, i) => (
                <div key={'rn' + i} style={{ position: 'absolute', left: `${(i * 41 + 7) % 97}%`, top: '-10%',
                  width: 1.1, height: 22 + (i % 3) * 8, borderRadius: 2,
                  background: 'linear-gradient(to bottom, transparent, oklch(0.92 0.01 240 / 0.55))',
                  animation: `rain-streak ${0.9 + (i % 4) * 0.25}s linear ${(i * 0.19) % 1.4}s infinite both` }} />
              ))}
              {/* Droplets clinging to the glass */}
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={'dp' + i} style={{ position: 'absolute', left: `${(i * 53 + 12) % 92 + 3}%`, top: `${(i * 29) % 55 + 6}%`,
                  width: 4, height: 6.5, borderRadius: '46% 46% 60% 60%',
                  background: 'linear-gradient(to bottom, oklch(1 0 0 / 0.42), oklch(0.85 0.01 240 / 0.30))',
                  boxShadow: 'inset 0 -1px 1.5px oklch(1 0 0 / 0.5)',
                  animation: `drop-slide ${5 + (i % 5) * 2.2}s ease-in ${(i * 1.3) % 7}s infinite both` }} />
              ))}
              {/* Rain dims the city slightly */}
              <div style={{ position: 'absolute', inset: 0, background: 'oklch(0.55 0.02 250 / 0.10)' }} />
            </>
          )}

          {/* Glass: reflection + inner edge shadow */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(114deg, transparent 38%, oklch(1 0 0 / 0.09) 43%, oklch(1 0 0 / 0.03) 54%, transparent 60%), linear-gradient(250deg, transparent 74%, oklch(1 0 0 / 0.05) 82%, transparent 90%)' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 4,
            boxShadow: 'inset 0 0 26px oklch(0.15 0.03 270 / 0.35)' }} />
        </div>

        {/* Muntin — one horizontal bar, high */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '38%', height: 7, borderRadius: 2,
          background: 'linear-gradient(to bottom, oklch(0.90 0.014 80), oklch(0.82 0.016 76))',
          boxShadow: '0 2px 4px oklch(0.2 0.03 60 / 0.3)' }} />

        {/* Curtains — framing the view, swaying barely */}
        {['left', 'right'].map(side => (
          <div key={side} style={{
            position: 'absolute', top: -18, bottom: -8, [side]: -26, width: 56,
            borderRadius: side === 'left' ? '0 6px 14px 0' : '6px 0 0 14px',
            background: `repeating-linear-gradient(90deg,
              oklch(0.55 0.15 35) 0 9px, oklch(0.64 0.16 40) 9px 17px, oklch(0.59 0.15 37) 17px 26px)`,
            boxShadow: `${side === 'left' ? '6px' : '-6px'} 0 18px -6px oklch(0.25 0.05 40 / 0.4)`,
            transformOrigin: 'top center',
            animation: `curtain-sway ${7 + (side === 'left' ? 0 : 1.6)}s ease-in-out infinite`, zIndex: 4,
          }} />
        ))}

        {/* Sill with returns */}
        <div style={{ position: 'absolute', left: -22, right: -22, top: '100%', marginTop: 12, height: 13, borderRadius: 3,
          background: 'linear-gradient(to bottom, oklch(0.92 0.012 82), oklch(0.85 0.016 78))',
          boxShadow: '0 10px 20px -8px oklch(0.28 0.04 60 / 0.4)' }} />
      </div>

      {/* ── The desk — walnut, in the foreground ── */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '19%', zIndex: 5,
        background: 'linear-gradient(to bottom, oklch(0.46 0.055 55) 0%, oklch(0.40 0.05 52) 30%, oklch(0.34 0.045 50) 100%)' }}>
        {/* Edge highlight */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2.5, background: 'oklch(0.62 0.07 60 / 0.9)' }} />
        {/* Wood grain */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.30,
          background: 'repeating-linear-gradient(94deg, transparent 0 34px, oklch(0.28 0.04 48 / 0.5) 34px 35.5px, transparent 35.5px 70px, oklch(0.30 0.04 50 / 0.35) 70px 71px)' }} />
        {/* City light pooling on the desk */}
        <div style={{ position: 'absolute', left: '26%', width: '52%', top: 0, height: '100%',
          background: `linear-gradient(to bottom, ${c.glow.replace(')', ' / 0.22)')}, transparent 80%)`, filter: 'blur(6px)' }} />
        {fireOn && (
          <div style={{ position: 'absolute', left: 0, width: '34%', top: 0, height: '100%',
            background: 'linear-gradient(to bottom, oklch(0.72 0.14 55 / 0.28), transparent 85%)', filter: 'blur(8px)',
            animation: 'hearth-glow 2.2s ease-in-out infinite' }} />
        )}
      </div>

      {/* ── Desk props ── */}
      {/* Coffee, right of the mic */}
      <div style={{ position: 'absolute', right: '21%', bottom: '13.5%', width: 74, height: 70, zIndex: 6 }}>
        {atmo.coffee && [0, 1, 2].map(i => (
          <div key={i} style={{ position: 'absolute', left: 22 + i * 9, bottom: 44, width: 7, height: 18,
            borderRadius: '50%', background: `oklch(0.94 0.008 88 / ${0.5 + Math.min(voice, 1) * 0.4})`, filter: 'blur(3px)',
            animation: `steam-rise ${2.4 + i * 0.5}s ease-out ${i * 0.7}s infinite`, transition: 'background 0.2s' }} />
        ))}
        <svg viewBox="0 0 74 70" width="74" height="70">
          <ellipse cx="37" cy="62" rx="30" ry="5.5" fill="oklch(0.20 0.03 50 / 0.35)" />
          <ellipse cx="37" cy="59" rx="26" ry="5" fill="oklch(0.88 0.014 80)" />
          <path d="M20 32 L23 56 Q 37 62 51 56 L54 32 Z" fill="oklch(0.93 0.010 86)" stroke="oklch(0.74 0.02 74)" strokeWidth="1.2" />
          <path d="M54 36 q 12 2 8 12 q -3 7 -10 6" fill="none" stroke="oklch(0.74 0.02 74)" strokeWidth="3.4" />
          <ellipse cx="37" cy="32" rx="17" ry="4.5" fill={atmo.coffee ? 'oklch(0.32 0.05 55)' : 'oklch(0.85 0.012 80)'} stroke="oklch(0.74 0.02 74)" strokeWidth="1" />
          <rect x="30" y="42" width="14" height="7" rx="2" fill="oklch(0.60 0.19 35 / 0.8)" />
        </svg>
      </div>
      {/* Notebook + pencil, left of the mic */}
      <div style={{ position: 'absolute', left: '20%', bottom: '11.5%', width: 120, height: 74, zIndex: 6, transform: 'rotate(-5deg)' }}>
        <svg viewBox="0 0 120 74" width="120" height="74">
          <rect x="6" y="10" width="96" height="58" rx="4" fill="oklch(0.20 0.03 50 / 0.30)" transform="translate(3 4)" />
          <rect x="6" y="10" width="96" height="58" rx="4" fill="oklch(0.955 0.008 88)" stroke="oklch(0.78 0.02 76)" strokeWidth="1.2" />
          <line x1="54" y1="12" x2="54" y2="66" stroke="oklch(0.82 0.016 78)" strokeWidth="1.4" />
          {[22, 32, 42, 52].map((y, i) => <line key={i} x1="14" y1={y} x2="46" y2={y} stroke="oklch(0.80 0.02 76)" strokeWidth="1" />)}
          {[22, 32, 42].map((y, i) => <line key={'r' + i} x1="62" y1={y} x2="94" y2={y} stroke="oklch(0.80 0.02 76)" strokeWidth="1" />)}
          <path d="M60 52 q 8 -5 16 0 q 6 4 12 -1" fill="none" stroke="oklch(0.45 0.06 60)" strokeWidth="1.2" />
          <g transform="rotate(14 100 30)">
            <rect x="92" y="26" width="34" height="5" rx="1.5" fill="oklch(0.72 0.13 75)" />
            <path d="M126 26 L133 28.5 L126 31 Z" fill="oklch(0.88 0.02 80)" />
            <path d="M130.5 27.5 L133 28.5 L130.5 29.6 Z" fill="oklch(0.30 0.03 60)" />
            <rect x="92" y="26" width="5" height="5" fill="oklch(0.60 0.19 35)" />
          </g>
        </svg>
      </div>
      {/* Desk lamp — left edge, throws real light */}
      <div style={{ position: 'absolute', left: '6%', bottom: '12.5%', width: 130, height: 170, zIndex: 6 }}>
        {lampOn && (
          <div style={{ position: 'absolute', left: 6, bottom: -14, width: 190, height: 120, pointerEvents: 'none',
            background: `radial-gradient(ellipse at 34% 20%, oklch(0.92 0.09 85 / ${0.45 + Math.min(voice, 1) * 0.45}), transparent 68%)`,
            filter: 'blur(4px)', animation: 'lamp-warmth 3.2s ease-in-out infinite', transition: 'background 0.18s' }} />
        )}
        <svg viewBox="0 0 130 170" width="130" height="170">
          <ellipse cx="46" cy="160" rx="30" ry="5.5" fill="oklch(0.20 0.03 50 / 0.4)" />
          <ellipse cx="46" cy="156" rx="24" ry="5" fill="oklch(0.30 0.03 65)" />
          <path d="M46 156 L46 96 Q 46 74 68 66 L82 61" stroke="oklch(0.34 0.035 68)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M46 156 L46 96 Q 46 74 68 66 L82 61" stroke="oklch(0.58 0.06 75)" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.6" />
          <g transform="rotate(32 88 58)">
            <path d="M70 44 L106 44 L98 72 L78 72 Z" fill={lampOn ? 'oklch(0.72 0.12 70)' : 'oklch(0.42 0.04 68)'} stroke="oklch(0.30 0.03 62)" strokeWidth="1.4" />
            {lampOn && <ellipse cx="88" cy="73" rx="11" ry="3.5" fill="oklch(0.95 0.09 88)" opacity="0.95" />}
          </g>
        </svg>
      </div>

      {/* Room-wide warmth when the hearth or lamp is on */}
      {(fireOn || lampOn) && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7,
          background: 'radial-gradient(ellipse at 18% 82%, oklch(0.75 0.12 55 / 0.10), transparent 58%)',
          animation: fireOn ? 'hearth-glow 2.4s ease-in-out infinite' : 'none' }} />
      )}

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8,
        background: 'radial-gradient(ellipse at center, transparent 52%, oklch(0.70 0.03 70 / 0.30) 100%)' }} />
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
  // PS-47 — a modern heirloom: slim capsule, hairline yoke, weighted base.
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%">
      <defs>
        <linearGradient id="ps-brass" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.42 0.06 78)" />
          <stop offset="26%" stopColor="oklch(0.88 0.10 84)" />
          <stop offset="46%" stopColor="oklch(0.72 0.09 80)" />
          <stop offset="72%" stopColor="oklch(0.52 0.07 78)" />
          <stop offset="100%" stopColor="oklch(0.36 0.05 76)" />
        </linearGradient>
        <linearGradient id="ps-body" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.20 0.02 70)" />
          <stop offset="30%" stopColor="oklch(0.34 0.03 74)" />
          <stop offset="52%" stopColor="oklch(0.27 0.025 72)" />
          <stop offset="100%" stopColor="oklch(0.15 0.018 70)" />
        </linearGradient>
        <radialGradient id="ps-grille" cx="0.36" cy="0.26" r="0.9">
          <stop offset="0%" stopColor="oklch(0.44 0.05 78)" />
          <stop offset="55%" stopColor="oklch(0.27 0.035 75)" />
          <stop offset="100%" stopColor="oklch(0.15 0.025 72)" />
        </radialGradient>
        <pattern id="ps-mesh" x="0" y="0" width="4.2" height="4.2" patternUnits="userSpaceOnUse">
          <circle cx="1.05" cy="1.05" r="0.72" fill="oklch(0.11 0.015 72)" />
          <circle cx="3.15" cy="3.15" r="0.72" fill="oklch(0.11 0.015 72)" />
          <circle cx="0.9" cy="0.9" r="0.3" fill="oklch(0.58 0.06 80)" />
          <circle cx="3.0" cy="3.0" r="0.3" fill="oklch(0.50 0.05 78)" />
        </pattern>
        <linearGradient id="ps-stem" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="oklch(0.16 0.015 72)" />
          <stop offset="45%" stopColor="oklch(0.44 0.04 76)" />
          <stop offset="60%" stopColor="oklch(0.30 0.03 74)" />
          <stop offset="100%" stopColor="oklch(0.12 0.012 70)" />
        </linearGradient>
        <radialGradient id="ps-base" cx="0.5" cy="0.32" r="0.75">
          <stop offset="0%" stopColor="oklch(0.36 0.03 74)" />
          <stop offset="70%" stopColor="oklch(0.22 0.022 72)" />
          <stop offset="100%" stopColor="oklch(0.14 0.015 70)" />
        </radialGradient>
      </defs>

      {/* Contact shadow */}
      <ellipse cx="100" cy="269" rx="50" ry="6.5" fill="oklch(0.32 0.03 60)" opacity="0.30" />
      <ellipse cx="100" cy="268" rx="28" ry="3.8" fill="oklch(0.26 0.03 58)" opacity="0.35" />

      {/* Weighted base — low dome with brass foot ring */}
      <ellipse cx="100" cy="262" rx="34" ry="8" fill="url(#ps-base)" />
      <path d="M66 262 A34 8 0 0 1 134 262 L134 258 A34 8 0 0 0 66 258 Z" fill="oklch(0.12 0.014 70)" />
      <ellipse cx="100" cy="256" rx="26" ry="5.5" fill="url(#ps-base)" />
      <ellipse cx="100" cy="254.6" rx="26" ry="5" fill="none" stroke="oklch(0.72 0.09 82 / 0.8)" strokeWidth="1.1" />
      <ellipse cx="92" cy="253" rx="8" ry="1.6" fill="oklch(0.62 0.06 80 / 0.5)" />

      {/* Stem — slender, with brass collar */}
      <rect x="96.5" y="196" width="7" height="60" rx="3" fill="url(#ps-stem)" />
      <rect x="94" y="222" width="12" height="5.5" rx="2.2" fill="url(#ps-brass)" />
      <line x1="98.2" y1="196" x2="98.2" y2="256" stroke="oklch(0.62 0.06 80 / 0.5)" strokeWidth="0.8" />

      {/* Yoke — hairline U with pivot dots */}
      <path d="M 56 132 Q 56 186 100 193 Q 144 186 144 132"
        stroke="url(#ps-brass)" strokeWidth="4.4" fill="none" strokeLinecap="round" />
      <path d="M 56 132 Q 56 186 100 193 Q 144 186 144 132"
        stroke="oklch(0.95 0.05 88 / 0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <circle cx="56" cy="130" r="4.6" fill="url(#ps-brass)" />
      <circle cx="144" cy="130" r="4.6" fill="url(#ps-brass)" />
      <circle cx="54.6" cy="128.6" r="1.4" fill="oklch(0.96 0.05 90 / 0.85)" />
      <circle cx="142.6" cy="128.6" r="1.4" fill="oklch(0.96 0.05 90 / 0.85)" />
      {/* Yoke meets stem */}
      <rect x="93" y="190" width="14" height="8" rx="3.5" fill="url(#ps-brass)" />

      {/* Capsule — slim, tall, quiet */}
      <rect x="62" y="42" width="76" height="140" rx="38" fill="url(#ps-body)" />
      <rect x="62" y="42" width="76" height="140" rx="38" fill="none" stroke="oklch(0.46 0.05 78)" strokeWidth="1.2" />
      {/* Top cap + bottom cap in brass */}
      <path d="M62 82 L62 80 A38 38 0 0 1 138 80 L138 82 Z" fill="none" />
      <path d="M 66 66 A 34 34 0 0 1 134 66 L 134 74 L 66 74 Z" fill="url(#ps-brass)" opacity="0.9" />
      <rect x="66" y="150" width="68" height="7" fill="url(#ps-brass)" opacity="0.9" />
      {/* Grille */}
      <rect x="68" y="78" width="64" height="68" rx="8" fill="url(#ps-grille)" />
      <rect x="68" y="78" width="64" height="68" rx="8" fill="url(#ps-mesh)" opacity="0.95" />
      <rect x="68" y="78" width="64" height="68" rx="8" fill="none" stroke="oklch(0.50 0.05 78 / 0.7)" strokeWidth="1" />
      {/* Specular sweep on the glass-smooth body */}
      <path d="M 72 50 Q 68 110 72 174" stroke="oklch(0.96 0.05 90 / 0.4)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="86" cy="94" rx="10" ry="16" fill="oklch(1 0 0 / 0.10)" />

      {/* Badge — engraved, small */}
      <text x="100" y="169" textAnchor="middle" fontSize="8" fontFamily="Georgia, serif" fontStyle="italic"
        fill="oklch(0.74 0.09 82)" letterSpacing="1.2">PS·47</text>

      {/* Status jewel — recessed */}
      <circle cx="100" cy="176" r="2.6" fill="oklch(0.12 0.015 70)" />
      <circle cx="100" cy="176" r="1.9"
        fill={active ? 'oklch(0.66 0.21 33)' : 'oklch(0.40 0.03 76)'}
        style={{ filter: active ? 'drop-shadow(0 0 4px oklch(0.66 0.21 33))' : 'none' }} />
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
