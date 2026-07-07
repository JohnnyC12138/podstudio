// Edit & Export page — post-recording editor

function EditorPage({ openExport, openMusic, tracks, recording, musicBed, onRemoveBed }) {
  // Imported soundtracks (jingles, ad reads, external audio) join the session
  const [imported, setImported] = React.useState([]);
  const importInputRef = React.useRef(null);
  const importFile = async (file) => {
    if (!file) return;
    let duration = 0;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      duration = (await ctx.decodeAudioData(await file.arrayBuffer())).duration;
      ctx.close();
    } catch (_) { alert('Could not decode this audio file.'); return; }
    setImported(prev => [...prev, { blob: file, url: URL.createObjectURL(file), name: file.name.replace(/\.[^.]+$/, ''), tint: 'blue', duration }]);
  };

  // Support both old `recording` (single) and new `tracks` (array)
  const effectiveTracks = React.useMemo(() => {
    const base = tracks?.length > 0 ? tracks : recording ? [{ ...recording, name: 'Your Recording' }] : [];
    return base.length > 0 || imported.length > 0 ? [...base, ...imported] : [];
  }, [tracks, recording, imported]);

  // Per-track mix settings: volume, mute, start offset (drag on the timeline)
  const [trackSettings, setTrackSettings] = React.useState({});
  const getSet = (i) => trackSettings[i] || { vol: 1, muted: false, offset: 0 };
  const patchSet = (i, patch) => setTrackSettings(prev => ({ ...prev, [i]: { ...getSet(i), ...patch } }));


  // Real recording playback — uses first (host) track
  const audioRef = React.useRef(null);
  const [recPlaying, setRecPlaying] = React.useState(false);
  const [recTime, setRecTime] = React.useState(0);
  const [recDuration, setRecDuration] = React.useState(effectiveTracks[0]?.duration || 0);
  const [trackWaveforms, setTrackWaveforms] = React.useState({}); // index → bars

  // Decode audio buffer for each track
  React.useEffect(() => {
    if (!effectiveTracks.length) return;
    effectiveTracks.forEach((track, i) => {
      if (!track?.blob) return;
      const decode = async () => {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const arrayBuf = await track.blob.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          if (i === 0) setRecDuration(audioBuf.duration);
          const data = audioBuf.getChannelData(0);
          const barCount = 240;
          const step = Math.floor(data.length / barCount);
          const bars = [];
          for (let b = 0; b < barCount; b++) {
            let peak = 0;
            for (let j = 0; j < step; j++) peak = Math.max(peak, Math.abs(data[b * step + j] || 0));
            bars.push(peak);
          }
          const max = Math.max(...bars, 0.001);
          setTrackWaveforms(prev => ({ ...prev, [i]: bars.map(v => v / max) }));
          ctx.close();
        } catch (e) { /* decode failed, show fallback */ }
      };
      decode();
    });
  }, [effectiveTracks]);

  // Sync recTime from audio element (host track)
  React.useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setRecTime(el.currentTime);
    const onEnd = () => { setRecPlaying(false); setRecTime(0); };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    return () => { el.removeEventListener('timeupdate', onTime); el.removeEventListener('ended', onEnd); };
  }, [effectiveTracks]);

  const toggleRecPlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (recPlaying) { el.pause(); setRecPlaying(false); }
    else { el.play(); setRecPlaying(true); }
  };

  // Music bed loops quietly under playback when one is selected
  const bedCtxRef = React.useRef(null);
  React.useEffect(() => {
    if (!recPlaying || !musicBed) return;
    let src = null, cancelled = false;
    (async () => {
      const buf = await generateBed(musicBed.kind);
      if (cancelled) return;
      if (!bedCtxRef.current) bedCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = bedCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const g = ctx.createGain(); g.gain.value = 0.5;
      src.connect(g); g.connect(ctx.destination);
      src.start();
    })();
    return () => { cancelled = true; try { src && src.stop(); } catch (_) {} };
  }, [recPlaying, musicBed]);

  const [mixing, setMixing] = React.useState(false);
  const exportMix = async () => {
    if (mixing) return;
    setMixing(true);
    try {
      const blob = await renderMixToWav(
        effectiveTracks
          .map((t, i) => ({ blob: t.blob, gain: getSet(i).muted ? 0 : getSet(i).vol, offset: getSet(i).offset }))
          .filter(t => t.blob && t.gain > 0),
        musicBed?.kind, 0.6, { ...post, intro: post.intro && !!musicBed }
      );
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const title = (localStorage.getItem('podstudio-episode-title') || 'episode').replace(/[^\w一-鿿-]+/g, '-');
        a.download = `${title}-mix.wav`;
        document.body.appendChild(a); a.click(); a.remove();
      }
    } finally { setMixing(false); }
  };

  const downloadRecording = () => {
    effectiveTracks.forEach((track, i) => {
      if (!track?.blob) return;
      const ext = track.blob.type.includes('ogg') ? 'ogg' : track.blob.type.includes('mp4') ? 'm4a' : 'webm';
      const a = document.createElement('a');
      a.href = track.url;
      a.download = `podstudio-${track.name?.toLowerCase().replace(/\s+/g, '-') || 'track-' + i}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  // Real timeline length — the longest recorded track
  const totalSeconds = Math.max(
    recDuration || 0,
    ...effectiveTracks.map((t, i) => (t.duration || 0) + getSet(i).offset),
    1
  );
  const [post, setPost] = React.useState({ tighten: false, polish: true, fade: true, intro: false });
  const togglePost = (k) => setPost(p => ({ ...p, [k]: !p[k] }));
  const [speed, setSpeed] = React.useState(1);
  const setRate = (r) => { setSpeed(r); if (audioRef.current) audioRef.current.playbackRate = r; };
  const seekTo = (sec) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(totalSeconds, sec));
    setRecTime(el.currentTime);
  };

  // No recording yet — honest empty state instead of a demo project
  if (effectiveTracks.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)' }}>
        <div style={{ textAlign: 'center', maxWidth: 380, padding: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--line-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--brass)' }}>
            <I.Edit size={24} />
          </div>
          <h2 className="display" style={{ fontSize: 28, margin: '0 0 10px', color: 'var(--fg-0)' }}>Nothing to edit yet</h2>
          <p style={{ fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.6, margin: '0 0 22px' }}>
            Record an episode and it lands here automatically — every speaker on their own track, ready to mix with music and export.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => window.__setPage('studio')}>
            <I.Mic size={14} /> Go to the studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>
      {/* Editor top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px',
        borderBottom: '1px solid var(--line-0)',
        flexShrink: 0,
      }}>
        <span className="caps" style={{ color: 'var(--fg-3)' }}>Editor · Post</span>
        <div style={{ width: 1, height: 18, background: 'var(--line-0)' }} />
        <div style={{ fontSize: 13, fontWeight: 500 }}>{localStorage.getItem('podstudio-episode-title') || 'Untitled episode'}</div>
        <div className="chip">
          <span className="mono">{fmtTime(effectiveTracks.length > 0 ? Math.round(recDuration) : totalSeconds)}</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={openMusic}>
          <I.Music size={13} /> {musicBed ? musicBed.name : 'Add music'}
        </button>
        {musicBed && (
          <button className="btn btn-ghost" onClick={onRemoveBed} title="Remove background music" style={{ padding: '6px 8px' }}>
            <I.X size={12} />
          </button>
        )}
        {effectiveTracks.length > 0 && (
          <button className="btn" onClick={downloadRecording} title={effectiveTracks.length > 1 ? `Download ${effectiveTracks.length} tracks` : 'Download recording'}>
            <I.Download size={13} /> {effectiveTracks.length > 1 ? `Tracks (${effectiveTracks.length})` : 'Download'}
          </button>
        )}
        {effectiveTracks.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { k: 'tighten', l: 'Tighten pauses', tip: 'AI shortens silences over 0.5s' },
              { k: 'polish', l: 'Polish voices', tip: 'Removes rumble, evens loudness' },
              { k: 'fade', l: 'Fades', tip: 'Fade in and out' },
              { k: 'intro', l: 'Music intro/outro', tip: 'Bed opens solo 3s and closes 4s (needs music)', needsBed: true },
            ].map(o => (
              <button key={o.k} title={o.tip} onClick={() => togglePost(o.k)}
                disabled={o.needsBed && !musicBed}
                style={{
                  padding: '4px 8px', borderRadius: 999, fontSize: 10.5, whiteSpace: 'nowrap',
                  background: post[o.k] && (!o.needsBed || musicBed) ? 'oklch(0.82 0.14 195 / 0.15)' : 'var(--bg-2)',
                  border: `1px solid ${post[o.k] && (!o.needsBed || musicBed) ? 'oklch(0.82 0.14 195 / 0.45)' : 'var(--line-0)'}`,
                  color: o.needsBed && !musicBed ? 'var(--fg-4)' : post[o.k] ? 'var(--teal)' : 'var(--fg-2)',
                }}>
                <I.Sparkle size={9} /> {o.l}
              </button>
            ))}
          </div>
        )}
        {effectiveTracks.length > 0 && (
          <button className="btn btn-primary" onClick={exportMix} disabled={mixing}>
            <I.Download size={13} /> {mixing ? 'Rendering…' : musicBed ? 'Export mix (WAV)' : 'Export (WAV)'}
          </button>
        )}
      </div>
      {musicBed && (
        <div style={{ padding: '7px 18px', borderBottom: '1px solid var(--line-0)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--brass-tint)', fontSize: 11.5, color: 'var(--fg-1)' }}>
          <I.Music size={11} style={{ color: 'var(--brass-bright)' }} />
          <span><b>{musicBed.name}</b> plays under your voices — hear it with ▶, it ducks automatically in the export.</span>
        </div>
      )}
      {effectiveTracks[0]?.url && <audio ref={audioRef} src={effectiveTracks[0].url} preload="auto" style={{ display: 'none' }} />}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left — track list */}
        <aside style={{
          width: 200, flexShrink: 0,
          borderRight: '1px solid var(--line-0)',
          background: 'var(--bg-1)',
          overflow: 'auto',
          padding: '14px 10px',
        }}>
          <div className="caps" style={{ color: 'var(--fg-3)', padding: '0 6px 8px' }}>Tracks</div>
          {effectiveTracks.map((track, i) => {
            const tintColors = { terracotta: 'var(--brass)', olive: 'oklch(0.72 0.1 145)', amber: 'var(--amber)', blue: 'var(--teal)', forest: 'oklch(0.65 0.1 155)', purple: 'oklch(0.7 0.14 300)' };
            const barColor = tintColors[track.tint] || 'var(--brass)';
            const s = getSet(i);
            return (
              <div key={i} style={{ padding: '7px 6px', borderRadius: 5, marginBottom: 2, background: 'oklch(0.78 0.1 82 / 0.08)', border: '1px solid oklch(0.78 0.1 82 / 0.2)', opacity: s.muted ? 0.55 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: barColor }} />
                  <span style={{ flex: 1, fontSize: 11.5, color: 'var(--brass-bright)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name || `Track ${i + 1}`}</span>
                  <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-3)', flexShrink: 0 }}>{fmtTime(i === 0 ? recDuration : track.duration || 0)}</span>
                  <button
                    onClick={() => patchSet(i, { muted: !s.muted })}
                    title={s.muted ? 'Unmute' : 'Mute'}
                    style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: s.muted ? 'oklch(0.85 0.15 25)' : 'var(--fg-3)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--line-0)', flexShrink: 0 }}
                  >M</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, paddingLeft: 9 }}>
                  <I.Volume size={9} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                  <input type="range" min="0" max="1.5" step="0.05" value={s.vol}
                    onChange={e => patchSet(i, { vol: parseFloat(e.target.value) })}
                    className="slider" style={{ flex: 1, height: 3 }} />
                  {s.offset > 0 && <span className="mono" style={{ fontSize: 8.5, color: 'var(--teal)', flexShrink: 0 }}>+{s.offset.toFixed(1)}s</span>}
                </div>
              </div>
            );
          })}

          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11.5, marginTop: 8 }} onClick={() => importInputRef.current?.click()}>
            <I.Plus size={11} /> Import audio
          </button>
          <input ref={importInputRef} type="file" accept="audio/*" style={{ display: 'none' }}
            onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} />

          <div style={{ height: 1, background: 'var(--line-0)', margin: '16px 0 14px' }} />

          <div className="caps" style={{ color: 'var(--fg-3)', padding: '0 6px 8px' }}>Session</div>
          <div style={{ padding: '0 6px', fontSize: 11.5, color: 'var(--fg-2)', lineHeight: 1.7 }}>
            <div>{effectiveTracks.length} track{effectiveTracks.length > 1 ? 's' : ''} · {fmtTime(totalSeconds)}</div>
            <div>{musicBed ? `Music: ${musicBed.name}` : 'No background music'}</div>
          </div>
        </aside>

        {/* Center — multitrack timeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Transport */}
          <div style={{
            padding: '10px 18px',
            borderBottom: '1px solid var(--line-0)',
            display: 'flex', alignItems: 'center', gap: 12,
            flexShrink: 0,
          }}>
            <button className="btn-ghost" title="Back 15s" onClick={() => seekTo(recTime - 15)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6 }}>
              <I.ChevronLeft size={14} />
            </button>
            <button
              onClick={toggleRecPlay}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: recPlaying ? 'var(--teal)' : 'var(--bg-2)',
                color: recPlaying ? 'oklch(0.15 0.02 195)' : 'var(--fg-0)',
                border: recPlaying ? 'none' : '1px solid var(--line-0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: recPlaying ? '0 0 16px -2px var(--teal-glow)' : 'none',
              }}>
              {recPlaying ? <I.Pause size={14} /> : <I.Play size={13} />}
            </button>
            <button className="btn-ghost" title="Forward 15s" onClick={() => seekTo(recTime + 15)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6 }}>
              <I.ChevronRight size={14} />
            </button>

            <div style={{ width: 1, height: 18, background: 'var(--line-0)' }} />

            <span className="mono" style={{ fontSize: 14, color: 'var(--fg-0)', letterSpacing: '0.02em' }}>
              {fmtTime(recTime)}
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
              / {fmtTime(totalSeconds)}
            </span>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[1, 1.5, 2].map(r => (
                <button key={r} onClick={() => setRate(r)} style={{
                  padding: '4px 7px', borderRadius: 4,
                  background: speed === r ? 'var(--bg-3)' : 'transparent',
                  color: speed === r ? 'var(--fg-0)' : 'var(--fg-2)',
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                }}>{r}×</button>
              ))}
            </div>
          </div>

          {/* Multitrack canvas */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px', position: 'relative' }}>
            <EditorTimeline
              playhead={totalSeconds > 0 ? recTime / totalSeconds : 0}
              setPlayhead={(p) => seekTo(p * totalSeconds)}
              totalSeconds={totalSeconds}
              recordingTracks={effectiveTracks.map((track, i) => ({
                name: track.name || `Track ${i + 1}`,
                tint: track.tint,
                bars: trackWaveforms[i] || null,
                duration: i === 0 ? recDuration : track.duration || 0,
                recTime: i === 0 ? recTime : 0,
                recPlaying: i === 0 ? recPlaying : false,
                onPlayPause: i === 0 ? toggleRecPlay : null,
                muted: getSet(i).muted,
                offsetFrac: totalSeconds > 0 ? getSet(i).offset / totalSeconds : 0,
                widthFrac: totalSeconds > 0 ? Math.min(1, (i === 0 ? recDuration : track.duration || 0) / totalSeconds) : 1,
                onOffset: (deltaFrac) => patchSet(i, { offset: Math.max(0, getSet(i).offset + deltaFrac * totalSeconds) }),
              }))}
            />
          </div>
        </div>

        {/* Right — AI sidebar */}
        <aside style={{
          width: 320, flexShrink: 0,
          borderLeft: '1px solid var(--line-0)',
          background: 'var(--bg-1)',
          display: 'flex', flexDirection: 'column',
          minHeight: 0,
        }}>
          <AIPanel notesKey={'podstudio-notes-' + (localStorage.getItem('podstudio-episode-title') || 'default')} />
        </aside>
      </div>
    </div>
  );
}

function EditorTimeline({ playhead, setPlayhead, totalSeconds, recordingTracks = [] }) {
  // Ruler: pick a tick interval that gives ~8-12 labeled marks
  const niceSteps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800];
  const step = niceSteps.find(s => totalSeconds / s <= 10) || 3600;
  const ticks = [];
  for (let t = 0; t <= totalSeconds; t += step / 5) ticks.push(t);

  const seekFromClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setPlayhead?.(frac);
  };

  return (
    <div style={{ position: 'relative', minWidth: 600, cursor: 'pointer' }} onClick={seekFromClick}>
      {/* Ruler */}
      <div style={{ position: 'relative', height: 20, marginBottom: 6, borderBottom: '1px solid var(--line-0)' }}>
        {ticks.map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(t / totalSeconds) * 100}%`, top: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ width: 1, height: i % 5 === 0 ? 10 : 4, background: 'var(--line-1)' }} />
            {i % 5 === 0 && (
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-3)', marginTop: 2 }}>
                {fmtTime(t)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Playhead */}
      <div style={{
        position: 'absolute', left: `${playhead * 100}%`, top: 0, bottom: 0,
        width: 1, background: 'var(--teal)',
        boxShadow: '0 0 8px var(--teal-glow)',
        pointerEvents: 'none', zIndex: 5,
      }}>
        <div style={{
          position: 'absolute', top: 12, left: -5,
          width: 11, height: 11, background: 'var(--teal)',
          transform: 'rotate(45deg)', borderRadius: 2,
          boxShadow: '0 0 8px var(--teal-glow)',
        }} />
      </div>

      {/* Real recorded tracks */}
      {recordingTracks.map((rt, ri) => {
        const tintColors = { terracotta: { main: 'var(--brass)', bg: 'oklch(0.78 0.1 82 / 0.08)', border: 'oklch(0.78 0.1 82 / 0.35)', bright: 'var(--brass-bright)' }, olive: { main: 'oklch(0.72 0.1 145)', bg: 'oklch(0.72 0.1 145 / 0.08)', border: 'oklch(0.72 0.1 145 / 0.35)', bright: 'oklch(0.82 0.1 145)' }, amber: { main: 'var(--amber)', bg: 'oklch(0.78 0.15 65 / 0.08)', border: 'oklch(0.78 0.15 65 / 0.35)', bright: 'var(--amber)' }, blue: { main: 'var(--teal)', bg: 'oklch(0.82 0.14 195 / 0.08)', border: 'oklch(0.82 0.14 195 / 0.3)', bright: 'var(--teal)' }, forest: { main: 'oklch(0.65 0.1 155)', bg: 'oklch(0.65 0.1 155 / 0.08)', border: 'oklch(0.65 0.1 155 / 0.3)', bright: 'oklch(0.75 0.1 155)' }, purple: { main: 'oklch(0.7 0.14 300)', bg: 'oklch(0.7 0.14 300 / 0.08)', border: 'oklch(0.7 0.14 300 / 0.3)', bright: 'oklch(0.8 0.14 300)' } };
        const tc = tintColors[rt.tint] || tintColors.terracotta;
        const playFrac = rt.duration > 0 ? rt.recTime / rt.duration : 0;
        const startDrag = (e) => {
          if (!rt.onOffset) return;
          e.stopPropagation();
          const row = e.currentTarget.parentElement;
          const width = row.getBoundingClientRect().width || 1;
          let lastX = e.clientX;
          const move = (ev) => { rt.onOffset((ev.clientX - lastX) / width); lastX = ev.clientX; };
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        };
        return (
          <div key={ri} style={{ height: 56, marginBottom: 4, background: 'var(--bg-1)', border: '1px solid var(--line-0)', borderRadius: 4, position: 'relative', overflow: 'hidden', opacity: rt.muted ? 0.45 : 1 }} onClick={e => e.stopPropagation()}>
            <div
              onPointerDown={startDrag}
              title="Drag to shift this track in time"
              style={{
                position: 'absolute', top: 4, bottom: 4,
                left: `${(rt.offsetFrac || 0) * 100}%`,
                width: `${(rt.widthFrac || 1) * 100}%`,
                minWidth: 120,
                padding: '3px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: 4,
                cursor: rt.onOffset ? 'grab' : 'default', touchAction: 'none',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                {rt.onPlayPause ? (
                  <button onClick={rt.onPlayPause} style={{ width: 18, height: 18, borderRadius: '50%', background: rt.recPlaying ? tc.main : `${tc.main}44`, color: tc.bright, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {rt.recPlaying ? <I.Pause size={9} /> : <I.Play size={8} />}
                  </button>
                ) : <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${tc.main}22`, flexShrink: 0 }} />}
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: tc.bright, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{rt.name}</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--fg-3)' }}>{fmtTime(rt.recTime)} / {fmtTime(rt.duration)}</span>
              </div>
              <div style={{ position: 'relative', height: 24 }}>
                {rt.bars ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%' }}>
                    {rt.bars.map((v, bi) => {
                      const past = bi / rt.bars.length < playFrac;
                      return <div key={bi} style={{ flex: 1, borderRadius: 1, height: `${Math.max(15, v * 100)}%`, background: past ? tc.main : `${tc.main}55`, minHeight: 2 }} />;
                    })}
                  </div>
                ) : (
                  <StaticWaveform height={24} color={rt.tint === 'terracotta' ? 'terracotta' : rt.tint === 'amber' ? 'amber' : 'teal'} density={120} seed={99 + ri} />
                )}
                {rt.duration > 0 && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${playFrac * 100}%`, width: 1, background: tc.main, pointerEvents: 'none' }} />
                )}
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
}

function AIPanel({ notesKey }) {
  // Real, persistent session notes; AI features are labeled honestly until wired to a backend
  const [notes, setNotes] = React.useState(() => localStorage.getItem(notesKey) || '');
  const saveNotes = (v) => { setNotes(v); localStorage.setItem(notesKey, v); };
  const [copied, setCopied] = React.useState(false);

  return (
    <>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <I.FileText size={14} style={{ color: 'var(--brass)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Show notes</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>Saved on this device as you type.</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 14, gap: 12, overflow: 'auto' }}>
        <textarea
          value={notes}
          onChange={e => saveNotes(e.target.value)}
          placeholder={'Episode notes, timestamps, links...\n\n03:20 - great story about X\n12:45 - cut the tangent'}
          style={{
            flex: 1, minHeight: 220, resize: 'none',
            background: 'var(--bg-inset)', border: '1px solid var(--line-0)',
            borderRadius: 'var(--r-md)', padding: 12,
            fontSize: 12.5, lineHeight: 1.6, color: 'var(--fg-0)',
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button className="btn" style={{ alignSelf: 'flex-start', fontSize: 11.5 }} onClick={() => { navigator.clipboard?.writeText(notes).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          <I.Copy size={11} /> {copied ? 'Copied' : 'Copy notes'}
        </button>

        <div style={{ borderTop: '1px solid var(--line-0)', paddingTop: 12 }}>
          <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 8 }}>Not wired up yet</div>
          {[
            { i: I.FileText, l: 'Transcription', d: 'needs a speech-to-text service' },
            { i: I.Wand, l: 'AI cleanup (de-noise, filler words)', d: 'needs an audio-processing backend' },
            { i: I.Scissors, l: 'AI clip picker', d: 'needs transcription first' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', opacity: 0.65 }}>
              <f.i size={12} style={{ color: 'var(--fg-3)', marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-1)' }}>{f.l}</div>
                <div style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

window.EditorPage = EditorPage;
