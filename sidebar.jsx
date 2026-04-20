// Sidebar — warm palette

function Sidebar({ page, setPage }) {
  const items = [
    { key: 'home', label: 'Home', icon: I.Home },
    { key: 'studio', label: 'Studio', icon: I.Mic },
    { key: 'edit', label: 'Editor', icon: I.Edit },
  ];
  const secondary = [
    { key: 'library', label: 'Episodes', icon: I.Library, badge: '12' },
    { key: 'music', label: 'Music', icon: I.Music },
    { key: 'team', label: 'Team', icon: I.Team },
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
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="caps" style={{ padding: '18px 10px 6px' }}>Library</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {secondary.map(item => (
          <div key={item.key} className="nav-item">
            <item.icon size={15} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{ fontSize: 11, color: 'var(--fg-3)' }} className="mono">{item.badge}</span>
            )}
          </div>
        ))}
      </div>

      <div className="caps" style={{ padding: '18px 10px 6px' }}>Recent</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[
          { name: 'Ep. 47 — Maya Chen', time: '2h ago', status: 'draft' },
          { name: 'Ep. 46 — Creative Ops', time: 'Yesterday', status: 'live' },
          { name: 'Ep. 45 — Q&A', time: 'Apr 12', status: 'live' },
        ].map((s, i) => (
          <div key={i} className="nav-item" style={{ padding: '7px 10px' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: s.status === 'draft' ? 'var(--amber)' : 'var(--olive)',
              flexShrink: 0,
            }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 1 }}>{s.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: '12px 10px 10px', borderTop: '1px solid var(--line-0)', marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="caps">Storage</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-2)' }}>42 / 100 GB</span>
        </div>
        <div style={{ height: 5, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: '42%', height: '100%', background: 'var(--terracotta)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px 0' }}>
        <Avatar name="Noa Weiss" tint="terracotta" size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-0)' }}>Noa Weiss</div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Pro plan</div>
        </div>
        <button className="btn-ghost" style={{ padding: 6, borderRadius: 6, display: 'flex' }}>
          <I.Settings size={14} />
        </button>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
