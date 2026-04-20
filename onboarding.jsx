// Onboarding — "How do you want to record today?"

function OnboardingPage({ setPage, setStudioMode }) {
  const [hover, setHover] = React.useState(null);
  const choose = (mode) => {
    setStudioMode(mode);
    setPage('studio');
  };

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '48px 32px',
      background: 'var(--bg-0)',
      overflow: 'auto',
    }}>
      <div style={{ maxWidth: 840, width: '100%', textAlign: 'center' }} className="fade-in">
        <div className="caps" style={{ color: 'var(--terracotta)', marginBottom: 16 }}>Let's begin</div>
        <h1 className="display" style={{ fontSize: 52, lineHeight: 1.05, margin: 0, letterSpacing: '-0.02em' }}>
          How do you want to record today?
        </h1>
        <p style={{ fontSize: 15, color: 'var(--fg-2)', marginTop: 14, marginBottom: 44 }}>
          No pressure — you can change this later. Pick what matches your session.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 680, margin: '0 auto' }}>
          {[
            {
              k: 'solo',
              mark: <I.SoloMark size={72} />,
              title: 'Solo',
              sub: 'Just me',
              desc: 'Record your voice, lay down a bed of music, polish, and publish.',
              time: 'Ready in 30 seconds',
            },
            {
              k: 'guests',
              mark: <I.GuestsMark size={72} />,
              title: 'With guests',
              sub: 'Invite up to 5 people',
              desc: 'Share a link — each guest records locally in studio quality.',
              time: 'Setup takes 2 minutes',
            },
          ].map(c => (
            <button
              key={c.k}
              onClick={() => choose(c.k)}
              onMouseEnter={() => setHover(c.k)}
              onMouseLeave={() => setHover(null)}
              style={{
                background: 'var(--bg-1)',
                border: `1px solid ${hover === c.k ? 'var(--terracotta)' : 'var(--line-0)'}`,
                borderRadius: 'var(--r-lg)',
                padding: '32px 28px',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: hover === c.k ? 'var(--sh-lg)' : 'var(--sh-sm)',
                transform: hover === c.k ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}
            >
              <div style={{ animation: hover === c.k ? 'soft-bob 1.6s ease-in-out infinite' : 'none' }}>
                {c.mark}
              </div>
              <div>
                <div className="display" style={{ fontSize: 28, lineHeight: 1.1 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 2 }}>{c.sub}</div>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--fg-1)', lineHeight: 1.55 }}>{c.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
                <I.Clock size={12} style={{ color: 'var(--fg-3)' }} />
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{c.time}</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--terracotta)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Start <I.ChevronRight size={13} />
                </span>
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 40, display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'center', color: 'var(--fg-2)', fontSize: 12.5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><I.Check size={12} style={{ color: 'var(--olive)' }} /> No installs</span>
          <span>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><I.Check size={12} style={{ color: 'var(--olive)' }} /> Studio quality</span>
          <span>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><I.Check size={12} style={{ color: 'var(--olive)' }} /> AI polish included</span>
        </div>

        <button onClick={() => setPage('home')} className="btn-ghost" style={{ marginTop: 24, fontSize: 12.5 }}>
          ← Back to home
        </button>
      </div>
    </div>
  );
}

window.OnboardingPage = OnboardingPage;
