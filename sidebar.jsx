// Sidebar — warm palette

function Sidebar({ page, setPage }) {
  const userName = localStorage.getItem('podstudio-name') || 'Your studio';
  const episodeTitle = localStorage.getItem('podstudio-episode-title') || '';
  const items = [
    { key: 'home', label: 'Home', icon: I.Home },
    { key: 'studio', label: 'Studio', icon: I.Mic, sub: 'record' },
    { key: 'edit', label: 'Editor', icon: I.Edit, sub: 'mix & export' },
  ];

  return (
    <aside style={{
      width: 224,
      background: 'var(--bg-1)',
      borderRight: '1px solid var(--line-0)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
      padding: '16px 14px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '4px 6px 16px',
        borderBottom: '1px solid var(--line-0)',
        marginBottom: 14,
      }}>
        <div style={{ color: 'var(--terracotta)' }}>
          <I.Logo size={22} />
        </div>
        <div>
          <div className="display" style={{ fontSize: 19, lineHeight: 1 }}>Podstudio</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 2 }}>Warm recording</div>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => setPage('onboarding')}
        style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}
      >
        <I.Plus size={14} />
        <span>New episode</span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => (
          <div key={item.key}
            className={`nav-item ${page === item.key ? 'active' : ''}`}
            onClick={() => setPage(item.key)}
          >
            <item.icon size={15} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.sub && <span style={{ fontSize: 9.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.sub}</span>}
          </div>
        ))}
      </div>

      {episodeTitle && (
        <>
          <div className="caps" style={{ padding: '18px 10px 6px' }}>Current episode</div>
          <div className="nav-item" style={{ padding: '7px 10px' }} onClick={() => setPage('studio')}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {episodeTitle}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 1 }}>In progress</div>
            </div>
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ padding: '12px 10px 4px', borderTop: '1px solid var(--line-0)', marginTop: 12, fontSize: 10.5, color: 'var(--fg-3)', lineHeight: 1.5 }}>
        Recordings live in this browser — download after each session.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px 0' }}>
        <Avatar name={userName} tint="terracotta" size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Local studio</div>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
