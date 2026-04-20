// Edit & Export page — post-recording editor

function EditorPage({ openExport, tracks, recording }) {
  // Support both old `recording` (single) and new `tracks` (array)
  const effectiveTracks = React.useMemo(() => {
    if (tracks?.length > 0) return tracks;
    if (recording) return [{ ...recording, name: 'Your Recording' }];
    return [];
  }, [tracks, recording]);

  const [playing, setPlaying] = React.useState(false);
  const [playhead, setPlayhead] = React.useState(0.18);
  const [selectedClip, setSelectedClip] = React.useState(null);
  const [aiPanel, setAiPanel] = React.useState('transcript');
  const [toggles, setToggles] = React.useState({
    noise: true, filler: true, levels: true, plosive: false, click: false,
  });

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

  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setPlayhead(p => Math.min(1, p + 0.0015)), 50);
    return () => clearInterval(id);
  }, [playing]);

  const totalSeconds = 2738; // 45:38

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
        <div style={{ fontSize: 13, fontWeight: 500 }}>Ep. 47 — The Attention Economy</div>
        <div className="chip teal">
          <I.Check size={10} /> Auto-saved 2s ago
        </div>
        <div className="chip">
          <span className="mono">{fmtTime(totalSeconds)}</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost"><I.Wand size={13} /> Quick polish</button>
        <button className="btn"><I.Share size={13} /> Share preview</button>
        {effectiveTracks.length > 0 && (
          <button className="btn" onClick={downloadRecording} title={effectiveTracks.length > 1 ? `Download ${effectiveTracks.length} tracks` : 'Download recording'}>
            <I.Download size={13} /> {effectiveTracks.length > 1 ? `Download (${effectiveTracks.length})` : 'Download'}
          </button>
        )}
        <button className="btn btn-primary" onClick={openExport}>
          <I.Download size={13} /> Export
        </button>
      </div>
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
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 6px', borderRadius: 5, marginBottom: 2, background: 'oklch(0.78 0.1 82 / 0.08)', border: '1px solid oklch(0.78 0.1 82 / 0.2)' }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: barColor }} />
                <span style={{ flex: 1, fontSize: 11.5, color: 'var(--brass-bright)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name || `Track ${i + 1}`}</span>
                <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-3)', flexShrink: 0 }}>{fmtTime(i === 0 ? recDuration : track.duration || 0)}</span>
              </div>
            );
          })}
          {effectiveTracks.length === 0 && [
            { n: 'Music bed', mute: false, solo: false, color: 'green' },
            { n: 'Room tone', mute: true, solo: false, color: 'dim' },
            { n: 'SFX pad', mute: false, solo: false, color: 'purple' },
          ].map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 6px',
              borderRadius: 5,
              marginBottom: 2,
              cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 3, height: 18, borderRadius: 2,
                background: t.color === 'teal' ? 'var(--teal)' : t.color === 'amber' ? 'var(--amber)' : t.color === 'green' ? 'oklch(0.75 0.14 145)' : t.color === 'purple' ? 'oklch(0.7 0.14 300)' : 'var(--fg-4)',
              }} />
              <span style={{ flex: 1, fontSize: 11.5, color: t.mute ? 'var(--fg-3)' : 'var(--fg-0)' }}>{t.n}</span>
              <button style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: t.mute ? 'oklch(0.85 0.15 25)' : 'var(--fg-3)', padding: '1px 4px', borderRadius: 3, border: '1px solid var(--line-0)' }}>M</button>
              <button style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: t.solo ? 'var(--amber)' : 'var(--fg-3)', padding: '1px 4px', borderRadius: 3, border: '1px solid var(--line-0)' }}>S</button>
            </div>
          ))}

          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11.5, marginTop: 8 }}>
            <I.Plus size={11} /> New track
          </button>

          <div style={{ height: 1, background: 'var(--line-0)', margin: '16px 0 14px' }} />

          <div className="caps" style={{ color: 'var(--fg-3)', padding: '0 6px 8px' }}>Chapters</div>
          {[
            { t: '00:00', n: 'Cold open' },
            { t: '03:12', n: 'Maya intro' },
            { t: '08:44', n: 'The attention trap' },
            { t: '21:30', n: 'Reader Q&A', ai: true },
            { t: '36:02', n: 'Outro' },
          ].map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 6px',
              fontSize: 11.5, cursor: 'pointer', borderRadius: 4,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-3)', width: 40 }}>{c.t}</span>
              <span style={{ flex: 1, color: 'var(--fg-1)' }}>{c.n}</span>
              {c.ai && <I.Sparkle size={10} style={{ color: 'var(--teal)' }} />}
            </div>
          ))}
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
            <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6 }}>
              <I.ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPlaying(p => {
                const next = !p;
                if (audioRef.current) { if (next) audioRef.current.play().catch(() => {}); else audioRef.current.pause(); }
                return next;
              })}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: playing ? 'var(--teal)' : 'var(--bg-2)',
                color: playing ? 'oklch(0.15 0.02 195)' : 'var(--fg-0)',
                border: playing ? 'none' : '1px solid var(--line-0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: playing ? '0 0 16px -2px var(--teal-glow)' : 'none',
              }}>
              {playing ? <I.Pause size={14} /> : <I.Play size={13} />}
            </button>
            <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6 }}>
              <I.ChevronRight size={14} />
            </button>

            <div style={{ width: 1, height: 18, background: 'var(--line-0)' }} />

            <span className="mono" style={{ fontSize: 14, color: 'var(--fg-0)', letterSpacing: '0.02em' }}>
              {fmtTime(playhead * totalSeconds)}
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
              / {fmtTime(totalSeconds)}
            </span>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-3)' }}>
              <I.Search size={12} />
              <input placeholder="Find in transcript…" style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line-0)',
                borderRadius: 5,
                padding: '5px 8px',
                fontSize: 11.5,
                color: 'var(--fg-0)',
                width: 180,
                outline: 'none',
              }} />
              <span className="kbd">⌘F</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {['1×', '1.5×', '2×'].map((s, i) => (
                <button key={i} style={{
                  padding: '4px 7px', borderRadius: 4,
                  background: i === 0 ? 'var(--bg-3)' : 'transparent',
                  color: i === 0 ? 'var(--fg-0)' : 'var(--fg-2)',
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Multitrack canvas */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px', position: 'relative' }}>
            <EditorTimeline
              playhead={playhead}
              setPlayhead={setPlayhead}
              selectedClip={selectedClip}
              setSelectedClip={setSelectedClip}
              totalSeconds={totalSeconds}
              recordingTracks={effectiveTracks.map((track, i) => ({
                name: track.name || `Track ${i + 1}`,
                tint: track.tint,
                bars: trackWaveforms[i] || null,
                duration: i === 0 ? recDuration : track.duration || 0,
                recTime: i === 0 ? recTime : 0,
                recPlaying: i === 0 ? recPlaying : false,
                onPlayPause: i === 0 ? toggleRecPlay : null,
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
          <AIPanel panel={aiPanel} setPanel={setAiPanel} toggles={toggles} setToggles={setToggles} playhead={playhead} totalSeconds={totalSeconds} setPlayhead={setPlayhead} />
        </aside>
      </div>
    </div>
  );
}

function EditorTimeline({ playhead, setPlayhead, selectedClip, setSelectedClip, totalSeconds, recordingTracks = [] }) {
  const tracks = [
    { name: 'Host · Noa', color: 'teal', seed: 11, clips: [
      { s: 0, e: 0.22 }, { s: 0.25, e: 0.46 }, { s: 0.5, e: 0.62 }, { s: 0.7, e: 0.88 }, { s: 0.92, e: 1 },
    ]},
    { name: 'Guest · Maya', color: 'amber', seed: 22, clips: [
      { s: 0.08, e: 0.28, selected: true }, { s: 0.32, e: 0.48 }, { s: 0.55, e: 0.7 }, { s: 0.78, e: 0.95 },
    ]},
    { name: 'Guest · Dominic', color: 'purple', seed: 33, clips: [
      { s: 0.12, e: 0.22 }, { s: 0.4, e: 0.58 }, { s: 0.68, e: 0.82 },
    ]},
    { name: 'Music bed', color: 'green', seed: 44, variant: 'music', clips: [
      { s: 0, e: 0.08, fade: true }, { s: 0.9, e: 1, fade: true },
    ]},
    { name: 'Room tone', color: 'dim', seed: 55, variant: 'noise', clips: [
      { s: 0, e: 1, muted: true },
    ]},
    { name: 'SFX pad', color: 'purple', seed: 66, variant: 'music', clips: [
      { s: 0.21, e: 0.25 }, { s: 0.61, e: 0.64 },
    ]},
  ];

  const colorMap = {
    teal: { main: 'var(--teal)', bg: 'oklch(0.82 0.14 195 / 0.12)', border: 'oklch(0.82 0.14 195 / 0.35)' },
    amber: { main: 'var(--amber)', bg: 'oklch(0.78 0.15 65 / 0.12)', border: 'oklch(0.78 0.15 65 / 0.35)' },
    purple: { main: 'oklch(0.72 0.14 300)', bg: 'oklch(0.72 0.14 300 / 0.12)', border: 'oklch(0.72 0.14 300 / 0.35)' },
    green: { main: 'oklch(0.78 0.14 145)', bg: 'oklch(0.78 0.14 145 / 0.1)', border: 'oklch(0.78 0.14 145 / 0.3)' },
    dim: { main: 'var(--fg-3)', bg: 'oklch(0.22 0.008 250 / 0.7)', border: 'var(--line-1)' },
  };

  return (
    <div style={{ position: 'relative', minWidth: 900 }}>
      {/* Ruler */}
      <div style={{ position: 'relative', height: 20, marginBottom: 6, borderBottom: '1px solid var(--line-0)', marginLeft: 0 }}>
        {Array.from({ length: 46 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(i / 45) * 100}%`, top: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ width: 1, height: i % 5 === 0 ? 10 : 4, background: 'var(--line-1)' }} />
            {i % 5 === 0 && (
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-3)', marginTop: 2 }}>
                {fmtTime((i / 45) * totalSeconds)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Chapter markers */}
      <div style={{ position: 'relative', height: 0 }}>
        {[
          { p: 0, n: 'Cold open' },
          { p: 0.07, n: 'Maya intro' },
          { p: 0.19, n: 'Attention trap' },
          { p: 0.47, n: 'Q&A', ai: true },
          { p: 0.79, n: 'Outro' },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${c.p * 100}%`, top: -34, zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 6px', borderRadius: 3,
            background: c.ai ? 'oklch(0.82 0.14 195 / 0.15)' : 'var(--bg-2)',
            border: c.ai ? '1px solid oklch(0.82 0.14 195 / 0.4)' : '1px solid var(--line-0)',
          }}>
            {c.ai && <I.Sparkle size={9} style={{ color: 'var(--teal)' }} />}
            <span style={{ fontSize: 10, color: c.ai ? 'var(--teal)' : 'var(--fg-1)' }}>{c.n}</span>
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
        return (
          <div key={ri} style={{ height: 56, marginBottom: 4, background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: 4, padding: '3px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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

      {/* Tracks */}
      {recordingTracks.length === 0 && tracks.map((t, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center',
          height: 56, marginBottom: 4,
          background: 'var(--bg-1)',
          border: '1px solid var(--line-0)',
          borderRadius: 4,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* clips */}
          {t.clips.map((c, j) => {
            const isSel = selectedClip === `${i}-${j}` || c.selected;
            const cm = colorMap[t.color];
            return (
              <div
                key={j}
                onClick={() => setSelectedClip(`${i}-${j}`)}
                style={{
                  position: 'absolute',
                  left: `${c.s * 100}%`,
                  width: `${(c.e - c.s) * 100}%`,
                  top: 4, bottom: 4,
                  background: c.muted ? 'repeating-linear-gradient(-45deg, var(--bg-2), var(--bg-2) 4px, var(--bg-1) 4px, var(--bg-1) 8px)' : cm.bg,
                  border: `1px solid ${isSel ? cm.main : cm.border}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  padding: '4px 6px 2px',
                  cursor: 'pointer',
                  boxShadow: isSel ? `0 0 0 1px ${cm.main}, 0 0 12px -2px ${cm.main}` : 'none',
                  opacity: c.muted ? 0.5 : 1,
                }}>
                <div style={{
                  fontSize: 9, fontFamily: 'var(--font-mono)',
                  color: cm.main, opacity: 0.85,
                  display: 'flex', alignItems: 'center', gap: 4,
                  marginBottom: 2,
                }}>
                  {c.fade && <I.Volume size={8} />}
                  <span>{t.name.split('·')[0].trim()}</span>
                </div>
                <div style={{ height: 22, opacity: c.muted ? 0.4 : 1 }}>
                  <StaticWaveform
                    height={22}
                    color={t.color}
                    density={Math.max(20, Math.floor((c.e - c.s) * 100))}
                    seed={t.seed + j}
                    variant={t.variant || 'voice'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Selected clip info */}
      {selectedClip && (
        <div style={{
          position: 'absolute', bottom: -42, left: 0, right: 0,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 10px', background: 'var(--bg-2)',
          border: '1px solid var(--line-0)', borderRadius: 6,
          fontSize: 11, color: 'var(--fg-1)',
        }}>
          <span className="chip teal">Clip selected</span>
          <span className="mono" style={{ color: 'var(--fg-2)' }}>03:12 → 08:44  ·  5:32 duration</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}><I.Scissors size={11} /> Split</button>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}><I.Volume size={11} /> Fade</button>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}><I.Sparkle size={11} /> AI trim silence</button>
        </div>
      )}
    </div>
  );
}

function AIPanel({ panel, setPanel, toggles, setToggles, playhead, totalSeconds, setPlayhead }) {
  const transcript = [
    { t: 181, sp: 'Noa', text: 'Welcome back to the show. I\'m here with Maya Chen — author, technologist, and the reason half of you are thinking differently about attention.', color: 'teal' },
    { t: 202, sp: 'Maya', text: "Thanks Noa. It's great to be here. [laughs] I've been looking forward to this for months.", color: 'amber', ai: 'filler-trimmed' },
    { t: 218, sp: 'Noa', text: "Let's start with the thing everyone's asking about — what broke in 2022?", color: 'teal' },
    { t: 231, sp: 'Maya', text: "So the model we built — it assumed people could choose where to look. That assumption fell apart when feeds got faster than reflexes.", color: 'amber', highlight: true },
    { t: 258, sp: 'Dominic', text: "Which is when you wrote the first draft of the book?", color: 'purple' },
  ];

  return (
    <>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <I.Sparkle size={14} style={{ color: 'var(--teal)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Studio AI</span>
          <div style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>v2.8 · claude</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>Polishing, transcribing, and indexing in the background.</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line-0)', flexShrink: 0 }}>
        {[
          { k: 'transcript', l: 'Transcript', i: I.FileText },
          { k: 'tools', l: 'Cleanup', i: I.Wand },
          { k: 'clips', l: 'Clips', i: I.Scissors },
          { k: 'summary', l: 'Notes', i: I.FileText },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setPanel(t.k)}
            style={{
              flex: 1, padding: '9px 4px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: panel === t.k ? 'var(--fg-0)' : 'var(--fg-2)',
              borderBottom: panel === t.k ? '1px solid var(--teal)' : '1px solid transparent',
              marginBottom: -1,
              fontSize: 10,
            }}
          >
            <t.i size={13} />
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>
        {panel === 'transcript' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <I.Search size={12} style={{ color: 'var(--fg-3)' }} />
              <input placeholder="Search transcript… e.g. 'attention'" style={{
                flex: 1,
                background: 'var(--bg-2)',
                border: '1px solid var(--line-0)',
                borderRadius: 5,
                padding: '5px 8px',
                fontSize: 11,
                color: 'var(--fg-0)',
                outline: 'none',
              }} />
            </div>

            {transcript.map((l, i) => (
              <div key={i} onClick={() => setPlayhead(l.t / totalSeconds)} style={{
                padding: '8px 10px',
                borderRadius: 5,
                background: l.highlight ? 'oklch(0.82 0.14 195 / 0.06)' : 'transparent',
                border: l.highlight ? '1px solid oklch(0.82 0.14 195 / 0.25)' : '1px solid transparent',
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="mono" style={{
                    fontSize: 9.5,
                    color: l.color === 'teal' ? 'var(--teal)' : l.color === 'amber' ? 'var(--amber)' : 'oklch(0.72 0.14 300)',
                    fontWeight: 600,
                  }}>{l.sp.toUpperCase()}</span>
                  <span className="mono" style={{ fontSize: 9, color: 'var(--fg-3)' }}>{fmtTime(l.t)}</span>
                  {l.ai && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <I.Sparkle size={8} /> {l.ai}
                    </span>
                  )}
                  {l.highlight && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--amber)' }}>⭐ Pull-quote</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-1)', lineHeight: 1.5 }}>
                  {l.text.split('attention').map((part, k, arr) => (
                    <React.Fragment key={k}>
                      {part}
                      {k < arr.length - 1 && <mark style={{ background: 'oklch(0.78 0.15 65 / 0.25)', color: 'var(--amber)', padding: '0 2px', borderRadius: 2 }}>attention</mark>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}

            <div style={{
              padding: '10px 12px',
              background: 'var(--bg-2)',
              border: '1px dashed var(--line-0)',
              borderRadius: 6,
              fontSize: 11, color: 'var(--fg-2)',
              textAlign: 'center',
            }}>
              Transcript · 12,847 words · 99.2% accuracy
            </div>
          </div>
        )}

        {panel === 'tools' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { k: 'noise', l: 'Background noise removal', d: 'Suppresses HVAC, keyboards, breath.', meter: 0.87 },
              { k: 'filler', l: 'Filler word trim', d: 'Auto-removes "um", "uh", "like".', meter: 0.62, count: 47 },
              { k: 'levels', l: 'Level matching', d: 'Normalizes each speaker to −16 LUFS.', meter: 0.93 },
              { k: 'plosive', l: 'De-plosive', d: 'Smooths harsh P/B pops.', meter: 0.24 },
              { k: 'click', l: 'Mouth click removal', d: 'Surgical removal of clicks.', meter: 0.18 },
            ].map(t => (
              <div key={t.k} style={{
                padding: '10px 12px',
                background: 'var(--bg-2)',
                border: '1px solid var(--line-0)',
                borderRadius: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-0)', flex: 1 }}>{t.l}</div>
                  <button
                    onClick={() => setToggles(s => ({ ...s, [t.k]: !s[t.k] }))}
                    style={{
                      width: 28, height: 16, borderRadius: 8,
                      background: toggles[t.k] ? 'var(--teal)' : 'var(--bg-3)',
                      position: 'relative',
                      boxShadow: toggles[t.k] ? '0 0 8px var(--teal-glow)' : 'none',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2, left: toggles[t.k] ? 14 : 2,
                      width: 12, height: 12, borderRadius: '50%',
                      background: 'var(--fg-0)',
                      transition: 'left 0.18s',
                    }} />
                  </button>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--fg-3)', marginBottom: 8 }}>{t.d}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 3, background: 'var(--bg-0)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${toggles[t.k] ? t.meter * 100 : 0}%`, height: '100%', background: 'var(--teal)', transition: 'width 0.25s', boxShadow: '0 0 6px var(--teal-glow)' }} />
                  </div>
                  {t.count && <span className="mono" style={{ fontSize: 9.5, color: 'var(--amber)' }}>−{t.count}</span>}
                </div>
              </div>
            ))}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              <I.Wand size={13} /> Apply to master
            </button>
          </div>
        )}

        {panel === 'clips' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="caps" style={{ color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <I.Sparkle size={11} style={{ color: 'var(--teal)' }} /> AI picks · 12 moments
            </div>
            {[
              { t: '09:12', d: '0:38', title: 'The attention trap assumption', score: 94, quote: '"Feeds got faster than reflexes."' },
              { t: '14:22', d: '0:51', title: 'Breaking point at Meta, 2022', score: 89, quote: '"That\'s when the old model fell."' },
              { t: '21:30', d: '1:04', title: 'Reader Q&A — the framework', score: 87, quote: '"Start with consent, not clicks."' },
              { t: '33:08', d: '0:28', title: 'Book closing line', score: 82, quote: '"If the machine learns, so should we."' },
            ].map((c, i) => (
              <div key={i} style={{
                padding: 10,
                background: 'var(--bg-2)',
                border: '1px solid var(--line-0)',
                borderRadius: 6,
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--teal)' }}>{c.t}</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>· {c.d}</span>
                  <div style={{ flex: 1 }} />
                  <span className="mono" style={{ fontSize: 9.5, color: c.score > 90 ? 'var(--amber)' : 'var(--fg-2)' }}>
                    {c.score}/100
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-0)', marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-2)', fontStyle: 'italic', marginBottom: 8 }}>{c.quote}</div>
                <div style={{ height: 18 }}>
                  <StaticWaveform height={18} color="teal" density={50} seed={i + 77} />
                </div>
              </div>
            ))}
          </div>
        )}

        {panel === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 8 }}>Episode Summary</div>
              <div style={{
                padding: 12,
                background: 'var(--bg-2)',
                border: '1px solid var(--line-0)',
                borderRadius: 6,
                fontSize: 12, color: 'var(--fg-1)', lineHeight: 1.55,
              }}>
                Maya Chen joins Noa to unpack what collapsed in her 2022 attention model — why audiences got faster than the feeds designed to hold them — and sketches a consent-first alternative built on slower loops and reader sovereignty.
              </div>
            </div>

            <div>
              <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 8 }}>Topics</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['attention economy', 'consent design', 'feed velocity', 'Maya\'s book', 'reader Q&A'].map(t => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="caps" style={{ color: 'var(--fg-3)', marginBottom: 8 }}>Draft post</div>
              <div style={{
                padding: 12,
                background: 'var(--bg-2)',
                border: '1px solid var(--line-0)',
                borderRadius: 6,
                fontSize: 11.5, color: 'var(--fg-1)', lineHeight: 1.55,
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap',
              }}>
{`Ep 47 is live. Maya Chen on why the
2022 attention model broke — and
what a consent-first web sounds like.

→ The feeds-faster-than-reflexes idea
→ Q&A with readers
→ A framework for "slower loops"`}
              </div>
              <button className="btn btn-ghost" style={{ marginTop: 6, fontSize: 11 }}><I.Copy size={11} /> Copy</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

window.EditorPage = EditorPage;
