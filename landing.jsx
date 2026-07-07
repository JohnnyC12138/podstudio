// Landing — warm redesign

function LandingPage({ setPage, openInvite }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-0)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px',
        borderBottom: '1px solid var(--line-0)',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'color-mix(in oklch, var(--bg-0) 85%, transparent)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="caps">Home</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="rec-dot" />
            <span style={{ fontSize: 12, color: 'var(--fg-1)' }}>2 studios live right now</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost"><I.Search size={14} /> Search</button>
          <button className="btn" onClick={openInvite}><I.Share size={13} /> Invite guest</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '80px 48px 60px', borderBottom: '1px solid var(--line-0)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              <I.Coffee size={14} style={{ color: 'var(--terracotta)' }} />
              <span className="caps" style={{ color: 'var(--terracotta)' }}>Warm · v4.2</span>
            </div>
            <h1 className="display" style={{
              fontSize: 'clamp(44px, 6vw, 72px)',
              lineHeight: 1.02, margin: 0, letterSpacing: '-0.025em',
            }}>
              Recording, made <em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>gentle</em>.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--fg-1)', marginTop: 22, marginBottom: 32, maxWidth: 460 }}>
              Studio-grade sound without the studio jargon. Invite a guest, press one button, and leave with a polished episode.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => setPage('onboarding')}>
                <I.Mic size={15} /> Start recording
              </button>
              <button className="btn btn-lg" onClick={openInvite}>
                <I.Link size={14} /> Invite a guest
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 28, color: 'var(--fg-2)', fontSize: 13 }}>
              <I.Check size={13} style={{ color: 'var(--sage)' }} />
              <span>Free · no account · records entirely in your browser</span>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--line-0)',
              display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-2)',
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'oklch(0.72 0.12 25)' }} />
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'oklch(0.78 0.13 75)' }} />
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'oklch(0.72 0.1 145)' }} />
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>ep-047 · live</span>
              <div style={{ flex: 1 }} />
              <div className="chip rec"><span className="rec-dot" style={{ width: 6, height: 6 }} /> REC · 24:17</div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {[
                  { name: 'Noa Weiss', role: 'Host', tint: 'terracotta' },
                  { name: 'Maya Chen', role: 'Guest · LA', tint: 'olive' },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 'var(--r-md)' }}>
                    <Avatar name={p.name} tint={p.tint} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-2)' }}>{p.role}</div>
                    </div>
                    <div style={{ width: 72 }}><AnimatedLevel active={true} segments={14} /></div>
                  </div>
                ))}
              </div>
              <LiveWaveform height={64} color="terracotta" barCount={90} />
            </div>
          </div>
        </div>
      </div>

      {/* Feature row */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 48px' }}>
        <h2 className="display" style={{ fontSize: 36, margin: 0, maxWidth: 560 }}>
          A calm space that does the hard parts for you.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 32 }}>
          {[
            { t: 'Guests join by link', d: 'No install, no account — a browser and a mic is all they need.', i: I.Zap },
            { t: 'Every voice, its own track', d: 'Each speaker records locally. Multi-track lands in the editor automatically.', i: I.Mic },
            { t: 'Music + one-file export', d: 'On-device background beds that duck under voices, mixed to WAV.', i: I.Music },
          ].map((f, i) => (
            <div key={i} className="card" style={{ padding: 22 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--r-md)',
                background: 'var(--terracotta-tint)', color: 'var(--terracotta)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <f.i size={18} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{f.t}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.55 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.LandingPage = LandingPage;
