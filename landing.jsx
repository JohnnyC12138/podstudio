// Landing — paper-and-stamps editorial (light), the door into the lamplit studio

// ── Postage-stamp illustrations, hand-drawn feel ─────────────
// Each stamp: paper rect + perforated edges (punched circles in page color) + line-art motif
const STAMP_PAPER = 'oklch(0.985 0.006 90)';
const STAMP_INK = 'oklch(0.30 0.030 55)';
const PAGE_BG = 'oklch(0.955 0.012 85)';

function StampFrame({ children, w = 96, h = 116 }) {
  const perf = [];
  const r = 3.2, step = 10;
  for (let x = step / 2; x < w; x += step) { perf.push([x, 0], [x, h]); }
  for (let y = step / 2; y < h; y += step) { perf.push([0, y], [w, y]); }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <rect x="0" y="0" width={w} height={h} fill={STAMP_PAPER} />
      {perf.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r} fill={PAGE_BG} />)}
      <rect x="7" y="7" width={w - 14} height={h - 14} fill="none" stroke={STAMP_INK} strokeWidth="1" opacity="0.55" />
      {children}
      <text x={w - 12} y={h - 13} textAnchor="end" fontSize="7" fill={STAMP_INK} opacity="0.65" fontFamily="Georgia, serif" fontStyle="italic">PS·47</text>
    </svg>
  );
}

function StampMic() {
  return (
    <StampFrame>
      <g stroke={STAMP_INK} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <rect x="38" y="26" width="20" height="32" rx="10" />
        <path d="M32 46 a16 16 0 0 0 32 0" />
        <line x1="48" y1="64" x2="48" y2="76" />
        <line x1="38" y1="76" x2="58" y2="76" />
        <line x1="43" y1="34" x2="53" y2="34" opacity="0.5" />
        <line x1="43" y1="40" x2="53" y2="40" opacity="0.5" />
        <line x1="43" y1="46" x2="53" y2="46" opacity="0.5" />
      </g>
      <text x="48" y="97" textAnchor="middle" fontSize="8.5" fill={STAMP_INK} fontFamily="Georgia, serif" fontStyle="italic">the mic</text>
    </StampFrame>
  );
}

function StampCassette() {
  return (
    <StampFrame>
      <g stroke={STAMP_INK} strokeWidth="1.5" fill="none" strokeLinecap="round">
        <rect x="22" y="34" width="52" height="34" rx="4" />
        <circle cx="37" cy="51" r="6" />
        <circle cx="59" cy="51" r="6" />
        <line x1="43" y1="51" x2="53" y2="51" />
        <path d="M28 68 l4 -6 M68 68 l-4 -6" opacity="0.5" />
        <rect x="30" y="39" width="36" height="5" rx="2.5" fill="oklch(0.72 0.13 70)" stroke="none" opacity="0.85" />
      </g>
      <text x="48" y="90" textAnchor="middle" fontSize="8.5" fill={STAMP_INK} fontFamily="Georgia, serif" fontStyle="italic">the tape</text>
    </StampFrame>
  );
}

function StampHeadphones() {
  return (
    <StampFrame>
      <g stroke={STAMP_INK} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M30 58 v-8 a18 18 0 0 1 36 0 v8" />
        <rect x="26" y="56" width="9" height="16" rx="4" fill={STAMP_PAPER} />
        <rect x="61" y="56" width="9" height="16" rx="4" fill={STAMP_PAPER} />
        <path d="M40 82 q8 6 16 0" opacity="0.5" strokeDasharray="2 3" />
      </g>
      <text x="48" y="99" textAnchor="middle" fontSize="8.5" fill={STAMP_INK} fontFamily="Georgia, serif" fontStyle="italic">the ears</text>
    </StampFrame>
  );
}

function StampOnAir() {
  return (
    <StampFrame>
      <g>
        <rect x="24" y="38" width="48" height="24" rx="4" fill="oklch(0.60 0.16 28)" opacity="0.92" />
        <text x="48" y="54" textAnchor="middle" fontSize="10" fontWeight="700" fill={STAMP_PAPER} fontFamily="Georgia, serif" letterSpacing="1.5">ON AIR</text>
        <g stroke={STAMP_INK} strokeWidth="1.2" opacity="0.55">
          <line x1="48" y1="30" x2="48" y2="38" />
          <line x1="34" y1="32" x2="38" y2="39" />
          <line x1="62" y1="32" x2="58" y2="39" />
        </g>
      </g>
      <text x="48" y="88" textAnchor="middle" fontSize="8.5" fill={STAMP_INK} fontFamily="Georgia, serif" fontStyle="italic">the light</text>
    </StampFrame>
  );
}

function LandingPage({ setPage, openInvite }) {
  const ink = 'oklch(0.25 0.028 55)';
  const inkSoft = 'oklch(0.48 0.024 60)';
  const stamps = [
    { C: StampMic, rot: -11, y: 14 },
    { C: StampCassette, rot: -4, y: 0 },
    { C: StampOnAir, rot: 4, y: 2 },
    { C: StampHeadphones, rot: 12, y: 16 },
  ];
  return (
    <div style={{ flex: 1, overflow: 'auto', background: PAGE_BG, color: ink, display: 'flex', flexDirection: 'column' }}>
      {/* Minimal top bar — wordmark and two words */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '26px 40px', flexShrink: 0 }}>
        <span className="display" style={{ fontSize: 21, color: ink }}>Podstudio</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          <a onClick={() => setPage('studio')} style={{ fontSize: 13.5, color: inkSoft, cursor: 'pointer' }}>Studio</a>
          <a onClick={() => setPage('edit')} style={{ fontSize: 13.5, color: inkSoft, cursor: 'pointer' }}>Editor</a>
        </div>
      </div>

      {/* Hero — one thought, one action */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 24px 60px', textAlign: 'center' }}
        onMouseMove={e => {
          const fan = e.currentTarget.querySelector('[data-fan]');
          if (!fan) return;
          const r = e.currentTarget.getBoundingClientRect();
          const dx = (e.clientX - r.left - r.width / 2) / r.width;
          const dy = (e.clientY - r.top - r.height / 2) / r.height;
          fan.style.transform = `translate(${dx * 14}px, ${dy * 10}px) rotate(${dx * 2}deg)`;
        }}
        onMouseLeave={e => { const fan = e.currentTarget.querySelector('[data-fan]'); if (fan) fan.style.transform = 'none'; }}
      >
        {/* Fanned stamps — drop in one by one, then follow the cursor gently */}
        <div data-fan style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 44, filter: 'drop-shadow(0 10px 18px oklch(0.3 0.04 60 / 0.16))', transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {stamps.map(({ C, rot, y }, i) => (
            <div key={i} style={{
              '--stamp-rot': `${rot}deg`, '--stamp-y': `${y}px`,
              transform: `rotate(${rot}deg) translateY(${y}px)`,
              marginLeft: i > 0 ? -18 : 0, zIndex: i === 2 ? 3 : i,
              animation: `stamp-in 0.65s cubic-bezier(0.34, 1.4, 0.64, 1) ${0.15 + i * 0.14}s both`,
              transition: 'transform 0.3s ease',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = `rotate(${rot}deg) translateY(${y - 12}px) scale(1.04)`}
              onMouseLeave={e => e.currentTarget.style.transform = `rotate(${rot}deg) translateY(${y}px)`}>
              <C />
            </div>
          ))}
        </div>

        <h1 className="display rise-in" style={{ fontSize: 'clamp(52px, 9vw, 108px)', lineHeight: 0.98, margin: 0, color: ink, fontWeight: 500, letterSpacing: '-0.01em', animationDelay: '0.55s' }}>
          Podcasts,<br /><em style={{ color: 'var(--brass)' }}>made gentle.</em>
        </h1>

        <p className="rise-in" style={{ fontSize: 15.5, color: inkSoft, marginTop: 26, maxWidth: 400, lineHeight: 1.65, animationDelay: '0.72s' }}>
          Record with guests right in the browser. Edit, mix and export — all on your device, nothing uploaded.
        </p>

        <button
          onClick={() => setPage('studio')}
          className="display rise-in"
          style={{
            marginTop: 36,
            padding: '17px 42px',
            fontSize: 19,
            borderRadius: 999,
            background: 'var(--brass)',
            color: 'var(--brass-on)',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 14px 30px -10px oklch(0.52 0.18 35 / 0.55)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            animationDelay: '0.88s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 20px 40px -10px oklch(0.52 0.18 35 / 0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 14px 30px -10px oklch(0.52 0.18 35 / 0.55)'; }}
        >
          <I.Mic size={16} style={{ marginRight: 10, verticalAlign: '-2px' }} />Start recording
        </button>

        <div className="rise-in" style={{ fontSize: 12, color: 'oklch(0.60 0.02 65)', marginTop: 18, animationDelay: '1.02s' }}>
          Free · no account · guests join by link
        </div>
      </div>

      {/* Footer — an endless ticker, like tape running */}
      <div style={{ padding: '0 0 26px', overflow: 'hidden', flexShrink: 0, maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)' }}>
        <div className="mono" style={{ display: 'inline-flex', whiteSpace: 'nowrap', fontSize: 11, color: 'oklch(0.55 0.03 60)', letterSpacing: '0.16em', textTransform: 'uppercase', animation: 'marquee 26s linear infinite' }}>
          {[0, 1].map(k => (
            <span key={k} style={{ paddingRight: 0 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i}>
                  &nbsp;&nbsp;Record&nbsp;&nbsp;→&nbsp;&nbsp;Edit&nbsp;&nbsp;→&nbsp;&nbsp;Export&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;<span style={{ color: 'var(--brass)' }}>ON AIR</span>&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;nothing leaves your device&nbsp;&nbsp;&nbsp;·
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

window.LandingPage = LandingPage;
