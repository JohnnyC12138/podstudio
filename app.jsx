// App shell

const TWEAKS = /*EDITMODE-BEGIN*/{
  "accent": "terracotta",
  "showGrain": true
}/*EDITMODE-END*/;

function App() {
  // Parse ?room= directly from URL — don't rely on room.jsx loading order
  const urlRoomId = new URLSearchParams(window.location.search).get('room') || null;
  const [page, setPage] = React.useState(() => urlRoomId ? 'studio' : 'home');
  const [studioMode, setStudioMode] = React.useState(() => localStorage.getItem('podstudio-mode') || 'guests');
  const [modal, setModal] = React.useState(null);
  const [tweaks, setTweaks] = React.useState(TWEAKS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [tracks, setTracks] = React.useState([]);
  const [musicBed, setMusicBed] = React.useState(null);
  const [roomId] = React.useState(() => urlRoomId || Math.random().toString(36).slice(2, 8).toUpperCase());
  const [isHost] = React.useState(() => !urlRoomId);

  // Guests get a focused, chrome-free view; narrow screens drop the sidebar
  const [vw, setVw] = React.useState(() => window.innerWidth);
  React.useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Landing is a chrome-free paper page; the app shell appears once you step inside
  const showSidebar = isHost && vw >= 920 && page !== 'home';

  // The stamp splash greets first-time visitors only — after you've stepped
  // into the app once, Home becomes a working desk
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    if (page !== 'home' && !entered) setEntered(true);
  }, [page, entered]);

  React.useEffect(() => { localStorage.setItem('podstudio-page', page); }, [page]);
  React.useEffect(() => { localStorage.setItem('podstudio-mode', studioMode); }, [studioMode]);

  // Expose setter so pages can cross-navigate without prop-drilling
  React.useEffect(() => { window.__setPage = setPage; }, []);

  // Recordings live only in memory — warn before the tab discards them.
  // StudioPage sets window.__recordingActive while a session is rolling.
  React.useEffect(() => {
    const guard = (e) => {
      if (tracks.length > 0 || window.__recordingActive) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [tracks]);

  // Tweaks host protocol
  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const setTweak = (k, v) => {
    setTweaks(t => {
      const next = { ...t, [k]: v };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
      return next;
    });
  };

  const openInvite = React.useCallback(() => {
    setStudioMode('guests');
    setPage('studio');
    setModal('invite');
  }, []);

  // Accent swap — warm-family hues, re-map --terracotta
  React.useEffect(() => {
    const map = {
      terracotta: { h: 40,  c: 0.14 },
      rust:       { h: 28,  c: 0.15 },
      clay:       { h: 52,  c: 0.12 },
      forest:     { h: 150, c: 0.09 },
      ink:        { h: 250, c: 0.09 },
    };
    const v = map[tweaks.accent] || map.terracotta;
    const root = document.documentElement.style;
    root.setProperty('--terracotta', `oklch(0.62 ${v.c} ${v.h})`);
    root.setProperty('--terracotta-soft', `oklch(0.88 ${v.c * 0.45} ${v.h})`);
    root.setProperty('--terracotta-tint', `oklch(0.62 ${v.c} ${v.h} / 0.10)`);
  }, [tweaks.accent]);

  // Apply grain via body attribute
  React.useEffect(() => {
    document.body.setAttribute('data-grain', tweaks.showGrain ? 'true' : 'false');
  }, [tweaks.showGrain]);

  // Keyboard
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') setPage('studio');
      if (e.key === 'e' || e.key === 'E') setPage('edit');
      if (e.key === 'h' || e.key === 'H') setPage('home');
      if (e.key === 'Escape') setModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }} data-screen-label={`Podstudio · ${page}`}>
      {showSidebar && <Sidebar page={page} setPage={setPage} />}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {page === 'home' && (entered
          ? <HomePage setPage={setPage} openInvite={openInvite} tracks={tracks} />
          : <LandingPage setPage={setPage} openInvite={openInvite} />)}
        {page === 'onboarding' && <OnboardingPage setPage={setPage} setStudioMode={setStudioMode} />}
        {page === 'studio' && <StudioPage openInvite={openInvite} openMusic={() => setModal('music')} studioMode={studioMode} roomId={roomId} isHost={isHost} onRecordingComplete={(newTracks) => setTracks(newTracks)} />}
        {page === 'edit' && <EditorPage openExport={() => setModal('export')} openMusic={() => setModal('music')} tracks={tracks} musicBed={musicBed} onRemoveBed={() => setMusicBed(null)} onSetBed={setMusicBed} />}
      </main>

      {modal === 'invite' && <InviteModal onClose={() => setModal(null)} roomId={roomId} />}
      {modal === 'music' && <MusicModal onClose={() => setModal(null)} onPick={setMusicBed} tracks={tracks} currentBed={musicBed} />}
      {modal === 'export' && <ExportModal onClose={() => setModal(null)} tracks={tracks} musicBed={musicBed} />}

      {tweaksOpen && (
        <div style={{
          position: 'fixed', bottom: 22, right: 22,
          width: 260,
          background: 'var(--bg-1)',
          border: '1px solid var(--line-1)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--sh-lg)',
          padding: 16,
          zIndex: 200,
          fontSize: 12,
          color: 'var(--fg-0)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <I.Settings size={12} style={{ color: 'var(--terracotta)' }} />
            <span style={{ fontWeight: 600 }}>Tweaks</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setTweaksOpen(false)} className="btn-ghost" style={{ padding: 2 }}><I.X size={12} /></button>
          </div>

          <div className="caps" style={{ marginBottom: 8 }}>Accent</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[
              { k: 'terracotta', c: 'oklch(0.62 0.14 40)' },
              { k: 'rust',       c: 'oklch(0.62 0.15 28)' },
              { k: 'clay',       c: 'oklch(0.62 0.12 52)' },
              { k: 'forest',     c: 'oklch(0.62 0.09 150)' },
              { k: 'ink',        c: 'oklch(0.62 0.09 250)' },
            ].map(a => (
              <button key={a.k} onClick={() => setTweak('accent', a.k)} style={{
                width: 28, height: 28, borderRadius: 6,
                background: a.c,
                border: tweaks.accent === a.k ? '2px solid var(--fg-0)' : '1px solid var(--line-0)',
                boxShadow: tweaks.accent === a.k ? 'var(--sh-md)' : 'none',
                cursor: 'pointer',
              }} />
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
            <input type="checkbox" checked={tweaks.showGrain} onChange={e => setTweak('showGrain', e.target.checked)} />
            <span>Paper texture</span>
          </label>

          <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 12, lineHeight: 1.5 }}>
            <span className="kbd">H</span> home · <span className="kbd">R</span> studio · <span className="kbd">E</span> editor
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
