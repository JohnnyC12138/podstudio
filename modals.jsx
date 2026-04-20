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
              { label: 'Expires', v: '24 hours after start' },
              { label: 'Video', v: 'Optional · 1080p' },
              { label: 'Recording', v: 'Local · 48 kHz' },
            ].map((x, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--line-0)', borderRadius: 6 }}>
                <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 3 }}>{x.label}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-0)' }}>{x.v}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 8 }}>Or invite directly</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input placeholder="maya@chen.studio" style={{
                flex: 1,
                background: 'var(--bg-0)',
                border: '1px solid var(--line-0)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--fg-0)',
                outline: 'none',
              }} />
              <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>Send email</button>
            </div>
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
              <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Pro tip:</span> Share a <span className="mono">mic-test link</span> 24h ahead so we can level-match before the call.
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

function MusicModal({ onClose }) {
  const [category, setCategory] = React.useState('ambient');
  const [playing, setPlaying] = React.useState(null);
  const cats = [
    { k: 'ambient', l: 'Ambient beds', count: 84 },
    { k: 'intro', l: 'Intros', count: 42 },
    { k: 'outro', l: 'Outros', count: 38 },
    { k: 'sting', l: 'Stings', count: 56 },
    { k: 'transition', l: 'Transitions', count: 27 },
  ];
  const tracks = [
    { n: 'Amber Room', a: 'Sessions / PS', d: '2:14', loop: true, color: 'amber', seed: 1 },
    { n: 'Slow Current', a: 'Sessions / PS', d: '3:02', loop: true, color: 'teal', seed: 2 },
    { n: 'Halfway Light', a: 'Eno & Hyde', d: '4:18', loop: false, color: 'purple', seed: 3 },
    { n: 'Room 214', a: 'Sessions / PS', d: '2:48', loop: true, color: 'teal', seed: 4 },
    { n: 'Paper Snow', a: 'Morr Music', d: '3:33', loop: false, color: 'green', seed: 5 },
    { n: 'Dusk Protocol', a: 'Sessions / PS', d: '2:11', loop: true, color: 'amber', seed: 6 },
  ];
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 820, maxWidth: '92vw',
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
            <div style={{ fontSize: 15, fontWeight: 600 }}>Music library</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginTop: 2 }}>Rights-cleared tracks · loop-ready · ducks under voice automatically.</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 4 }}>
            <I.X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ width: 180, borderRight: '1px solid var(--line-0)', padding: '12px 8px', overflow: 'auto' }}>
            {cats.map(c => (
              <div key={c.k} onClick={() => setCategory(c.k)}
                className={`nav-item ${category === c.k ? 'active' : ''}`}
                style={{ fontSize: 12 }}
              >
                <span style={{ flex: 1 }}>{c.l}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{c.count}</span>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '7px 10px', background: 'var(--bg-2)', border: '1px solid var(--line-0)', borderRadius: 6 }}>
                <I.Search size={13} style={{ color: 'var(--fg-3)' }} />
                <input placeholder="Search ambient beds…" style={{ flex: 1, background: 'none', border: 'none', fontSize: 12, color: 'var(--fg-0)', outline: 'none' }} />
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 11 }}>BPM</button>
              <button className="btn btn-ghost" style={{ fontSize: 11 }}>Mood</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {tracks.map((t, i) => {
                const isPlay = playing === i;
                return (
                  <div key={i}
                    onClick={() => setPlaying(isPlay ? null : i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: isPlay ? 'var(--bg-2)' : 'transparent',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      borderColor: isPlay ? 'var(--line-0)' : 'transparent',
                    }}
                    onMouseEnter={e => !isPlay && (e.currentTarget.style.background = 'var(--bg-2)')}
                    onMouseLeave={e => !isPlay && (e.currentTarget.style.background = 'transparent')}
                  >
                    <button style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: isPlay ? 'var(--teal)' : 'var(--bg-3)',
                      color: isPlay ? 'oklch(0.18 0.02 195)' : 'var(--fg-0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isPlay ? '0 0 12px var(--teal-glow)' : 'none',
                      flexShrink: 0,
                    }}>
                      {isPlay ? <I.Pause size={12} /> : <I.Play size={11} />}
                    </button>
                    <div style={{ width: 160, flexShrink: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg-0)' }}>{t.n}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 1 }}>{t.a}</div>
                    </div>
                    <div style={{ flex: 1, height: 20 }}>
                      <StaticWaveform height={20} color={isPlay ? t.color : 'dim'} density={80} seed={t.seed} variant="music" playhead={isPlay ? 0.4 : 0} />
                    </div>
                    {t.loop && <span className="chip teal" style={{ padding: '1px 5px', fontSize: 9 }}>LOOP</span>}
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-2)', width: 40, textAlign: 'right' }}>{t.d}</span>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>Add</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ExportModal({ onClose }) {
  const [format, setFormat] = React.useState('audio');
  const [quality, setQuality] = React.useState('high');
  const formats = [
    { k: 'audio', l: 'Master audio', d: 'MP3 · WAV · FLAC', icon: I.Volume, sizes: '24 / 384 / 620 MB' },
    { k: 'video', l: 'Video podcast', d: 'Waveform + video + captions', icon: I.Video, sizes: '1.2 GB · 1080p' },
    { k: 'social', l: 'Short clips', d: '12 AI-picked · 9:16 / 1:1', icon: I.Scissors, sizes: '4 – 18 MB each' },
    { k: 'rss', l: 'Push to RSS', d: 'Anchor, Spotify, Apple', icon: I.Zap, sizes: 'Live in 3 min' },
  ];
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
            <div style={{ fontSize: 15, fontWeight: 600 }}>Export Ep. 47</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginTop: 2 }}>45:38 · 3 tracks · AI polish applied</div>
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

          <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 8 }}>Quality</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {[
              { k: 'web', l: 'Web', s: '128 kbps' },
              { k: 'high', l: 'High', s: '256 kbps' },
              { k: 'studio', l: 'Studio', s: 'Lossless' },
            ].map(q => (
              <button key={q.k} onClick={() => setQuality(q.k)} style={{
                flex: 1,
                padding: '10px 12px',
                background: quality === q.k ? 'var(--bg-3)' : 'var(--bg-2)',
                border: `1px solid ${quality === q.k ? 'var(--teal)' : 'var(--line-0)'}`,
                borderRadius: 6,
                textAlign: 'left',
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: quality === q.k ? 'var(--teal)' : 'var(--fg-0)' }}>{q.l}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>{q.s}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {[
              ['Include chapter markers', true],
              ['Auto-generate captions (SRT + VTT)', true],
              ['Embed episode summary', false],
              ['Push transcript to show notes', true],
            ].map(([l, on], i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: on ? 'var(--teal)' : 'var(--bg-3)',
                  border: `1px solid ${on ? 'var(--teal)' : 'var(--line-1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'oklch(0.15 0.02 195)',
                  boxShadow: on ? '0 0 6px var(--teal-glow)' : 'none',
                }}>
                  {on && <I.Check size={10} />}
                </span>
                <span style={{ color: 'var(--fg-1)' }}>{l}</span>
              </label>
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
              Estimated render: <span className="mono" style={{ color: 'var(--fg-0)' }}>2m 14s</span> · ready to publish by <span className="mono" style={{ color: 'var(--teal)' }}>10:42 AM</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary"><I.Download size={13} /> Export now</button>
          </div>
        </div>
      </div>
    </>
  );
}

window.InviteModal = InviteModal;
window.MusicModal = MusicModal;
window.ExportModal = ExportModal;
