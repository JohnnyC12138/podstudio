// Modals — Invite guest, Music library, Export

function InviteModal({ onClose, roomId }) {
  const [copied, setCopied] = React.useState(false);
  const link = roomId && typeof getRoomInviteLink !== 'undefined'
    ? getRoomInviteLink(roomId)
    : window.location.href.split('?')[0] + '?room=' + (roomId || 'ABC123');
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 520, maxWidth: '90vw',
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderRadius: 12,
        boxShadow: '0 40px 80px -20px oklch(0 0 0 / 0.7), inset 0 1px 0 oklch(1 0 0 / 0.04)',
        zIndex: 101, animation: 'fade-in 0.25s ease',
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-0)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Invite a guest to the studio</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginTop: 2 }}>They'll record locally — no install, no account.</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 4 }}>
            <I.X size={14} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 8 }}>Studio link</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px',
            background: 'var(--bg-0)',
            border: '1px solid var(--line-0)',
            borderRadius: 6,
          }}>
            <I.Link size={14} style={{ color: 'var(--teal)' }} />
            <span className="mono" style={{ flex: 1, fontSize: 12, color: 'var(--fg-0)' }}>{link}</span>
            <button className="btn" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
              {copied ? <><I.Check size={11} /> Copied</> : <><I.Copy size={11} /> Copy</>}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            {[
              { label: 'Role', v: 'Guest · can speak' },
              { label: 'Works on', v: 'Any device · no install' },
              { label: 'Recording', v: 'Local · in their browser' },
              { label: 'Valid while', v: 'You keep the studio open' },
            ].map((x, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--line-0)', borderRadius: 6 }}>
                <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 3 }}>{x.label}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-0)' }}>{x.v}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 18,
            padding: '10px 12px',
            background: 'oklch(0.78 0.15 65 / 0.06)',
            border: '1px solid oklch(0.78 0.15 65 / 0.25)',
            borderRadius: 6,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <I.Sparkle size={12} style={{ color: 'var(--amber)', marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-1)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Heads up:</span> stay in the Green Room while your guest joins — the room lives in this browser tab.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn btn-primary btn-lg" onClick={onClose}>
              <I.Users size={14} /> Open Green Room
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function MusicModal({ onClose, onPick, tracks: recordedTracks = [], currentBed }) {
  const [playing, setPlaying] = React.useState(null);
  const [matching, setMatching] = React.useState(false);
  const beds = MUSIC_BEDS;

  React.useEffect(() => () => stopBedPreview(), []);

  const togglePreview = async (kind) => {
    if (playing === kind) { stopBedPreview(); setPlaying(null); return; }
    setPlaying(kind);
    await previewBed(kind);
  };

  const pick = (kind) => {
    stopBedPreview();
    const bed = beds.find(b => b.kind === kind);
    onPick?.(bed);
    onClose();
  };

  const autoMatch = async () => {
    setMatching(true);
    const src = recordedTracks.find(t => t.blob);
    const kind = src ? await autoMatchBed(src.blob) : 'warm-glow';
    setMatching(false);
    pick(kind);
  };
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 560, maxWidth: '92vw',
        maxHeight: '84vh',
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderRadius: 12,
        boxShadow: '0 40px 80px -20px oklch(0 0 0 / 0.7)',
        zIndex: 101, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'fade-in 0.25s ease',
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-0)', display: 'flex', alignItems: 'center' }}>
          <I.Music size={16} style={{ color: 'var(--teal)', marginRight: 10 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Background music</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginTop: 2 }}>Synthesized on-device · loops forever · ducks under voices at export.</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 4 }}>
            <I.X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
          {recordedTracks.length > 0 && (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }} onClick={autoMatch} disabled={matching}>
              <I.Sparkle size={13} /> {matching ? 'Listening to your episode…' : 'Auto-match to my episode'}
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {beds.map(b => {
              const isPlay = playing === b.kind;
              const isCurrent = currentBed?.kind === b.kind;
              return (
                <div key={b.kind} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: isCurrent ? 'var(--brass-tint)' : 'var(--bg-2)',
                  border: `1px solid ${isCurrent ? 'oklch(0.78 0.1 82 / 0.4)' : 'var(--line-0)'}`,
                }}>
                  <button onClick={() => togglePreview(b.kind)} style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isPlay ? 'var(--teal)' : 'var(--bg-3)',
                    color: isPlay ? 'oklch(0.18 0.02 195)' : 'var(--fg-0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isPlay ? '0 0 12px var(--teal-glow)' : 'none',
                    flexShrink: 0,
                  }}>
                    {isPlay ? <I.Pause size={13} /> : <I.Play size={12} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-0)' }}>{b.name} {isCurrent && <span className="chip teal" style={{ padding: '1px 6px', fontSize: 9, marginLeft: 6 }}>SELECTED</span>}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{b.desc}</div>
                  </div>
                  <span className="chip teal" style={{ padding: '1px 5px', fontSize: 9 }}>LOOP</span>
                  <button className="btn" style={{ fontSize: 11.5, padding: '6px 12px' }} onClick={() => pick(b.kind)}>
                    {isCurrent ? 'Keep' : 'Use this'}
                  </button>
                </div>
              );
            })}
          </div>

          {currentBed && (
            <button className="btn btn-ghost" style={{ marginTop: 12, fontSize: 11.5 }} onClick={() => { stopBedPreview(); onPick?.(null); onClose(); }}>
              <I.X size={11} /> Remove background music
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function ExportModal({ onClose, tracks = [], musicBed }) {
  const [format, setFormat] = React.useState('audio');
  const [quality, setQuality] = React.useState('high');
  const [rendering, setRendering] = React.useState(false);
  const epTitle = localStorage.getItem('podstudio-episode-title') || 'Untitled episode';
  const hasTracks = tracks.some(t => t.blob);
  const formats = [
    { k: 'audio', l: 'Mixed master (WAV)', d: musicBed ? `All voices + ${musicBed.name} bed` : 'All voices mixed to one file', icon: I.Volume, sizes: 'Lossless · 16-bit 44.1 kHz' },
    { k: 'stems', l: 'Separate tracks', d: 'One file per speaker (as recorded)', icon: I.Scissors, sizes: `${tracks.length || 0} file${tracks.length === 1 ? '' : 's'} · WebM/Opus` },
  ];

  const doExport = async () => {
    if (!hasTracks || rendering) return;
    setRendering(true);
    try {
      const safe = epTitle.replace(/[^\w一-鿿-]+/g, '-');
      if (format === 'audio') {
        const blob = await renderMixToWav(tracks.filter(t => t.blob).map(t => t.blob), musicBed?.kind);
        if (blob) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${safe}-master.wav`;
          document.body.appendChild(a); a.click(); a.remove();
        }
      } else {
        tracks.forEach((t, i) => {
          if (!t.blob) return;
          const ext = t.blob.type.includes('ogg') ? 'ogg' : 'webm';
          const a = document.createElement('a');
          a.href = t.url;
          a.download = `${safe}-${(t.name || 'track-' + i).replace(/[^\w一-鿿-]+/g, '-')}.${ext}`;
          document.body.appendChild(a); setTimeout(() => { a.click(); a.remove(); }, i * 350);
        });
      }
      onClose();
    } finally { setRendering(false); }
  };
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 680, maxWidth: '92vw',
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderRadius: 12,
        boxShadow: '0 40px 80px -20px oklch(0 0 0 / 0.7)',
        zIndex: 101, overflow: 'hidden',
        animation: 'fade-in 0.25s ease',
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-0)', display: 'flex', alignItems: 'center' }}>
          <I.Download size={16} style={{ color: 'var(--teal)', marginRight: 10 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Export “{epTitle}”</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginTop: 2 }}>
              {hasTracks ? `${tracks.length} track${tracks.length > 1 ? 's' : ''} recorded${musicBed ? ` · ${musicBed.name} bed` : ''}` : 'Nothing recorded yet'}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 4 }}>
            <I.X size={14} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 10 }}>Choose format</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
            {formats.map(f => (
              <button key={f.k} onClick={() => setFormat(f.k)}
                className={format === f.k ? 'glow-teal' : ''}
                style={{
                  padding: '14px 16px',
                  background: format === f.k ? 'oklch(0.82 0.14 195 / 0.06)' : 'var(--bg-2)',
                  border: `1px solid ${format === f.k ? 'transparent' : 'var(--line-0)'}`,
                  borderRadius: 8,
                  textAlign: 'left',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                <div style={{ color: format === f.k ? 'var(--teal)' : 'var(--fg-1)', marginTop: 2 }}>
                  <f.icon size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', marginBottom: 3 }}>{f.l}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-2)', marginBottom: 6 }}>{f.d}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{f.sizes}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{
            padding: 12,
            background: 'var(--bg-0)',
            border: '1px solid var(--line-0)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 18,
          }}>
            <I.Clock size={13} style={{ color: 'var(--fg-2)' }} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-1)' }}>
              {hasTracks
                ? <>Renders in your browser and downloads immediately — nothing is uploaded.</>
                : <>No recording yet — record an episode first, then export it here.</>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={doExport} disabled={!hasTracks || rendering}>
              <I.Download size={13} /> {rendering ? 'Rendering…' : 'Export now'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

window.InviteModal = InviteModal;
window.MusicModal = MusicModal;
window.ExportModal = ExportModal;
