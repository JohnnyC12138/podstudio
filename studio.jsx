// Recording Studio — immersive broadcast space

// Real audio level (0..1 RMS) for any MediaStream — drives every meter in the studio
function useStreamLevel(stream) {
  const [level, setLevel] = React.useState(0);
  React.useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) { setLevel(0); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    let ctx, src, raf;
    try {
      ctx = new Ctx();
      src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.55;
      src.connect(an);
      const data = new Uint8Array(an.fftSize);
      let last = 0;
      const tick = (t) => {
        if (t - last > 80) { // ~12fps is plenty for a meter
          last = t;
          an.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3.2));
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch (e) { console.warn('[Level] analyser failed:', e); }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { src && src.disconnect(); } catch (_) {}
      try { ctx && ctx.state !== 'closed' && ctx.close(); } catch (_) {}
    };
  }, [stream]);
  return level;
}

// Segmented meter driven by real audio (replaces the decorative AnimatedLevel)
function LiveLevel({ stream, segments = 10 }) {
  const level = useStreamLevel(stream);
  const lit = Math.round(level * segments);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: segments }).map((_, i) => {
        const on = i < lit;
        const hot = i >= segments - 2;
        return (
          <div key={i} style={{
            width: 3, height: 10, borderRadius: 1,
            background: on ? (hot ? 'oklch(0.72 0.16 45)' : 'var(--sage)') : 'var(--bg-3)',
            transition: 'background 0.08s',
          }} />
        );
      })}
    </div>
  );
}

function StudioPage({ openInvite, openMusic, studioMode, onRecordingComplete, roomId, isHost = true }) {
  const [phase, setPhase] = React.useState('greenRoom');
  const [scene, setScene] = React.useState('lateNight');
  const [paused, setPaused] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);
  const [ambient, setAmbient] = React.useState('none');
  const [musicBed, setMusicBed] = React.useState(false);
  const [coachSeen, setCoachSeen] = React.useState(() => localStorage.getItem('podstudio-coach-seen') === '1');
  const [showCoach, setShowCoach] = React.useState(false);
  const [micError, setMicError] = React.useState(null);
  const [localStream, setLocalStream] = React.useState(null);
  const [pendingPhase, setPendingPhase] = React.useState(null);
  const [finishedTracks, setFinishedTracks] = React.useState([]);
  const [userName, setUserName] = React.useState(() => localStorage.getItem('podstudio-name') || '');
  const [episodeTitle, setEpisodeTitle] = React.useState(() => localStorage.getItem('podstudio-episode-title') || '');

  const myName = userName || (isHost ? 'Host' : 'Guest');
  const saveName = (name) => {
    const clean = name.trim().slice(0, 40);
    if (!clean) return;
    localStorage.setItem('podstudio-name', clean);
    setUserName(clean);
  };
  const saveTitle = (title) => {
    const clean = title.slice(0, 80);
    setEpisodeTitle(clean);
    localStorage.setItem('podstudio-episode-title', clean);
  };

  // Real audio recording refs
  const mediaRecorderRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const streamRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const audioCtxRef = React.useRef(null);
  const trackRecordersRef = React.useRef({});
  const elapsedRef = React.useRef(0);
  React.useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  // WebRTC room — must be declared before isRoomSession so peers is available.
  // The room only goes live once the user has entered their name, so peers
  // always see real names (guests retry until the host's room appears).
  const { peers, connectionStatus, chatMessages, sendChat, sendPhase, sendMeta } = useRoom({
    roomId: userName ? roomId : null,
    isHost,
    localStream,
    userName: myName,
    onMetaChange: (meta) => {
      if (!isHost && meta && typeof meta.title === 'string') setEpisodeTitle(meta.title);
    },
    onPhaseChange: (remotePhase) => {
      if (isHost) return;
      if (remotePhase === 'wrap') {
        // Host ended the session — finish our own recording if one is running
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') stopRecording();
        else goToPhase('wrap');
        return;
      }
      // Mic-gated phases need a user gesture (mobile Safari) — defer until
      // the guest taps "Join now" if they haven't granted the mic yet
      if ((remotePhase === 'check' || remotePhase === 'countdown' || remotePhase === 'record') && !streamRef.current) {
        setPendingPhase(remotePhase);
        return;
      }
      if (remotePhase === 'record') {
        // Mic already granted — start recording locally in sync with the host
        if (phase !== 'record') { goToPhase('record'); setElapsed(0); startRecording(); }
        return;
      }
      goToPhase(remotePhase);
    },
  });

  // isRoomSession: true for guest mode, guests who came via URL, or connected peers
  const hasRealPeers = Object.keys(peers).length > 0;
  const isRoomSession = studioMode === 'guests' || !isHost || hasRealPeers;
  const isGuests = studioMode === 'guests' || isRoomSession;

  // Host broadcasts episode meta to everyone (re-sent when a new peer joins)
  React.useEffect(() => {
    if (isHost && isRoomSession) sendMeta({ title: episodeTitle });
  }, [episodeTitle, peers, isHost, isRoomSession, sendMeta]);

  // Build live guest list from real peers (plus yourself)
  const liveGuests = React.useMemo(() => {
    if (!isRoomSession) {
      return [
        { key: 'self', name: myName === 'Host' ? 'You' : myName, role: 'Solo', tint: 'terracotta', status: 'ready', you: true, stream: localStream },
      ];
    }
    const peerEntries = Object.entries(peers).map(([id, p]) => {
      const peerIsHost = id.includes('-host');
      return {
        key: id,
        name: p.name || (peerIsHost ? 'Host' : 'Guest'),
        role: peerIsHost ? 'Host' : 'Guest',
        tint: peerIsHost ? 'terracotta' : (p.tint || 'olive'),
        status: p.status || 'joining',
        stream: p.stream,
        you: false,
      };
    });
    if (isHost) {
      return [
        { key: 'self-host', name: myName, role: 'Host', tint: 'terracotta', status: 'ready', you: true, stream: localStream },
        ...peerEntries,
      ];
    }
    const hostPeer = peerEntries.find(p => p.role === 'Host') || { key: 'host-waiting', name: 'Host', role: 'Host', tint: 'terracotta', status: 'joining' };
    const otherGuests = peerEntries.filter(p => p.role !== 'Host');
    return [
      hostPeer,
      { key: 'self-guest', name: myName, role: 'Guest', tint: 'olive', status: 'ready', you: true, stream: localStream },
      ...otherGuests,
    ];
  }, [isRoomSession, peers, isHost, myName, localStream]);

  // Request mic on sound-check entry
  React.useEffect(() => {
    if (phase !== 'check') return;
    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;
        setLocalStream(stream);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch (err) {
        setMicError('Microphone access denied. Check browser permissions.');
      }
    };
    initMic();
  }, [phase]);

  // Cleanup mic on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close();
    };
  }, []);

  // Phase change — host broadcasts to guests
  const goToPhase = (newPhase) => {
    setPhase(newPhase);
    if (isHost && isRoomSession) sendPhase(newPhase);
  };

  const startRecording = () => {
    if (!streamRef.current) { console.warn('[Podstudio] no stream — mic not ready'); return; }
    chunksRef.current = [];
    const mimeType =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
      MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
      MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' :
      MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' : '';
    const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
    mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
    mr.start(250);
    mediaRecorderRef.current = mr;

    // Start a recorder per guest stream
    trackRecordersRef.current = {};
    if (isRoomSession) {
      Object.entries(peers).forEach(([id, p]) => {
        if (p.stream) {
          const rec = createTrackRecorder(p.stream);
          rec.start();
          trackRecordersRef.current[id] = { rec, name: p.name || 'Guest', tint: p.tint || 'olive' };
        }
      });
    }
    console.log('[Podstudio] recording started, tracks:', 1 + Object.keys(trackRecordersRef.current).length);
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') { finishSession(null, []); return; }
    if (mr.state === 'recording') { try { mr.requestData(); } catch (_) {} }

    const guestStopPromises = Object.entries(trackRecordersRef.current).map(([id, { rec, name, tint }]) =>
      rec.stop().then(blob => blob ? { blob, url: URL.createObjectURL(blob), name, tint } : null)
    );

    mr.addEventListener('stop', () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
      const hostTrack = blob.size > 0 ? { blob, url: URL.createObjectURL(blob), name: myName, duration: elapsedRef.current } : null;
      Promise.all(guestStopPromises).then(guestTracks => {
        finishSession(hostTrack, guestTracks.filter(Boolean));
      });
    }, { once: true });

    mr.stop();
  };

  // Pick up guest streams that connect after recording has already started
  React.useEffect(() => {
    if (phase !== 'record') return;
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    Object.entries(peers).forEach(([id, p]) => {
      if (p.stream && !trackRecordersRef.current[id]) {
        const rec = createTrackRecorder(p.stream);
        rec.start();
        trackRecordersRef.current[id] = { rec, name: p.name || 'Guest', tint: p.tint || 'olive' };
        console.log('[Podstudio] late-joining track added:', id);
      }
    });
  }, [peers, phase]);

  // A stale "join now" prompt only makes sense in the green room
  React.useEffect(() => {
    if (phase !== 'greenRoom' && pendingPhase) setPendingPhase(null);
  }, [phase]);

  const finishSession = (hostTrack, guestTracks) => {
    const allTracks = [hostTrack, ...guestTracks].filter(Boolean);
    if (allTracks.length > 0) onRecordingComplete?.(allTracks);
    setFinishedTracks(allTracks);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    goToPhase('wrap');
  };

  // Real mic level drives the sculpture glow and the Signal meter
  const myLevel = useStreamLevel(micOn && !paused ? localStream : null);
  const level = Math.max(myLevel, 0.04);
  const inputDb = myLevel > 0.001 ? Math.max(-60, Math.round(20 * Math.log10(myLevel))) : null;

  // Elapsed timer
  React.useEffect(() => {
    if (phase !== 'record' || paused) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase, paused]);

  // Coach tip — show once, 2s after recording starts
  React.useEffect(() => {
    if (phase === 'record' && !coachSeen) {
      const t = setTimeout(() => setShowCoach(true), 2200);
      return () => clearTimeout(t);
    }
  }, [phase, coachSeen]);

  const dismissCoach = () => {
    setShowCoach(false);
    setCoachSeen(true);
    localStorage.setItem('podstudio-coach-seen', '1');
  };

  const scenes = [
    { k: 'lateNight', l: 'Late Night', sub: 'wood & lamp' },
    { k: 'rooftop',   l: 'Rooftop',    sub: 'dusk city' },
    { k: 'whiteRoom', l: 'White Room', sub: 'minimal' },
    { k: 'vintage',   l: 'Vintage',    sub: 'radio booth' },
    { k: 'terrace',   l: 'Terrace',    sub: 'outdoor' },
  ];

  if (phase === 'greenRoom') {
    return (
      <GreenRoom
        guests={liveGuests}
        onStart={() => goToPhase('check')}
        openInvite={openInvite}
        chatMessages={isRoomSession ? chatMessages : null}
        onSendChat={isRoomSession ? sendChat : null}
        connectionStatus={isRoomSession ? connectionStatus : null}
        roomId={roomId}
        isHost={isHost}
        pendingPhase={pendingPhase}
        onAcceptPhase={() => {
          // No mic yet — always route through sound check so getUserMedia
          // runs inside this tap's user-gesture context
          goToPhase(streamRef.current ? pendingPhase : 'check');
          setPendingPhase(null);
        }}
        userName={userName}
        onSaveName={saveName}
        episodeTitle={episodeTitle}
        onSaveTitle={saveTitle}
        isRoomSession={isRoomSession}
      />
    );
  }

  if (phase === 'wrap') {
    return <WrapScreen elapsed={elapsed} tracks={finishedTracks} episodeTitle={episodeTitle} isHost={isHost} />;
  }

  // Collapse side rails on narrower viewports so the stage stays usable
  const narrow = typeof window !== 'undefined' && window.innerWidth < 1200;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)', position: 'relative' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 22px',
        borderBottom: '1px solid var(--line-0)',
        flexShrink: 0,
        background: 'var(--bg-1)',
        zIndex: 20,
      }}>
        <div style={{ minWidth: 0, lineHeight: 1.3 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span className="serif-it" style={{ color: 'var(--fg-1)' }}>{episodeTitle || 'Untitled episode'}</span></div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isGuests ? `${liveGuests.filter(g => g.status === 'joined').length} in studio · recording locally` : 'Solo session · auto-saving'}
            {isRoomSession && connectionStatus !== 'connected' && <span style={{ color: 'oklch(0.82 0.16 25)', marginLeft: 6 }}>· {connectionStatus}…</span>}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {phase === 'check' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 14px',
            background: 'var(--brass-tint)',
            border: '1px solid oklch(0.78 0.1 82 / 0.28)',
            borderRadius: 999,
          }}>
            <I.Mic size={12} style={{ color: 'var(--brass-bright)' }} />
            <span style={{ fontSize: 12, color: 'var(--fg-0)' }}>
              Sound check · <span style={{ fontStyle: 'italic', color: 'var(--brass-bright)' }}>say a few words, gently</span>
            </span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        {phase === 'record' && <OnAirSign active={!paused} />}
        {phase === 'record' && (
          <span className="mono" style={{ fontSize: 14, color: 'var(--fg-0)', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
            {fmtTime(elapsed)}
          </span>
        )}
        {micError && (
          <div style={{ fontSize: 11.5, color: 'oklch(0.82 0.16 25)', background: 'oklch(0.66 0.17 25 / 0.12)', border: '1px solid oklch(0.66 0.17 25 / 0.3)', borderRadius: 6, padding: '5px 10px' }}>
            {micError}
          </div>
        )}
        {phase === 'check' && (
          <button className="btn btn-ghost" onClick={() => window.__setPage('home')}>
            <I.ChevronLeft size={12} /> Exit
          </button>
        )}
      </div>

      {/* Main stage — scene + mic + guests + left rail + right rail */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {/* Left rail — scene selector */}
        <aside style={{
          width: narrow ? 172 : 220, flexShrink: 0,
          borderRight: '1px solid var(--line-0)',
          background: 'var(--bg-1)',
          overflowY: 'auto',
          padding: '18px 12px',
          zIndex: 10,
        }}>
          <PullCordSpec />
          <div style={{ padding: '0 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { k: 'none',   l: 'Silence' },
              { k: 'cafe',   l: 'Coffee shop hum' },
              { k: 'rain',   l: 'Rain on glass' },
              { k: 'noise',  l: 'Warm noise' },
            ].map(a => (
              <button key={a.k}
                onClick={() => setAmbient(a.k)}
                className="nav-item"
                style={{
                  background: ambient === a.k ? 'var(--brass-tint)' : 'transparent',
                  color: ambient === a.k ? 'var(--brass-bright)' : 'var(--fg-1)',
                  fontSize: 12, padding: '6px 10px',
                }}>
                {ambient === a.k ? <I.Volume size={11} /> : <div style={{ width: 11 }} />}
                {a.l}
              </button>
            ))}
          </div>
          {ambient !== 'none' && (
            <div style={{ marginTop: 10, padding: '6px 10px', background: 'var(--bg-2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>Vol</span>
              <input type="range" defaultValue="30" className="slider" style={{ flex: 1 }} />
            </div>
          )}
          </div>
        </aside>

        {/* Center stage */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
          <Scene scene={scene} />

          {/* Pull cord — ceiling hanging cord with vintage bulb */}
          <PullCord
            sceneName={scenes.find(s => s.k === scene)?.l || 'Late Night'}
            onPull={() => {
              const idx = scenes.findIndex(s => s.k === scene);
              setScene(scenes[(idx + 1) % scenes.length].k);
            }}
          />

          {/* 3D desk — perspective container */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-end',
            padding: '32px 20px 0',
            perspective: '1200px',
          }}>

            {/* Guest tiles — sitting across the desk */}
            {isGuests && (
              <div style={{
                display: 'flex', gap: narrow ? 12 : 24, alignItems: 'flex-end', justifyContent: 'center',
                marginTop: 40,
                transform: 'rotateX(6deg)',
                transformOrigin: 'center bottom',
                maxWidth: '100%',
                overflowX: 'auto',
                flexWrap: 'nowrap',
                padding: '0 12px 6px',
                scrollbarWidth: 'none',
              }}>
                {liveGuests.filter(g => !g.you).map((g, i) => (
                  <GuestSeat key={g.key} g={g} recording={phase === 'record' && !paused} narrow={narrow} />
                ))}
              </div>
            )}

            <div style={{ flex: 1 }} />

            {/* Microphone hero */}
            <div style={{
              position: 'relative',
              marginBottom: 40,
              transform: 'translateZ(40px)',
            }}>
              <MicSculpture size={220} active={phase === 'record' && !paused && micOn} level={level} popFilter={true} onDesk={true} />
              {/* Desk surface under mic */}
              <div style={{
                position: 'absolute', left: '50%', bottom: -40,
                transform: 'translateX(-50%) rotateX(74deg)',
                width: 640, height: 240,
                background: 'radial-gradient(ellipse at center top, oklch(0.22 0.03 75 / 0.9) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: -1,
              }} />
              {/* Host name plate removed — it was colliding with the toolbar. The "You · live" chip in the recording banner covers this role. */}
            </div>
          </div>

          {/* Sound-check heading now lives in the top bar so it never fights with the mic or guests */}

          {/* Recording waveform banner */}
          {phase === 'record' && (
            <div style={{
              position: 'absolute', left: 24, right: 24, bottom: 110, zIndex: 5,
              padding: '14px 18px',
              background: 'oklch(0 0 0 / 0.5)',
              backdropFilter: 'blur(12px)',
              borderRadius: 'var(--r-lg)',
              border: '1px solid oklch(0.78 0.1 82 / 0.2)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Avatar name="Noa Weiss" tint="terracotta" size={24} />
                  <span style={{ fontSize: 12, color: 'oklch(0.95 0 0)', fontWeight: 500 }}>You · live</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'oklch(0.72 0 0)' }}>−14 LUFS · 48kHz</span>
                </div>
                <RealWaveform analyserRef={analyserRef} active={!paused && micOn} height={40} />
              </div>
            </div>
          )}

          {/* Floating toolbar — frosted glass sitting on the desk */}
          <div style={{
            position: 'absolute', bottom: 22, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 10px',
            background: 'linear-gradient(to bottom, oklch(0.14 0.02 55 / 0.62), oklch(0.10 0.015 55 / 0.82))',
            backdropFilter: 'blur(18px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
            border: '1px solid oklch(0.78 0.1 82 / 0.22)',
            borderTop: '1px solid oklch(0.78 0.1 82 / 0.38)',
            borderRadius: 999,
            boxShadow: '0 14px 40px -8px oklch(0 0 0 / 0.7), inset 0 1px 0 oklch(1 0 0 / 0.08), 0 -2px 24px oklch(0.78 0.1 82 / 0.08)',
            zIndex: 30,
            maxWidth: 'calc(100% - 32px)',
            overflowX: 'auto',
          }}>
            {phase === 'check' ? (
              <>
                <ToolbarBtn icon={micOn ? I.Mic : I.MicOff} label={micOn ? 'Mic on' : 'Muted'} active={micOn} onClick={() => setMicOn(!micOn)} danger={!micOn} />
                <ToolbarBtn icon={camOn ? I.Video : I.VideoOff} label={camOn ? 'Camera' : 'Cam off'} active={camOn} onClick={() => setCamOn(!camOn)} danger={!camOn} />
                <div style={{ width: 1, height: 26, background: 'oklch(0.78 0.1 82 / 0.2)', margin: '0 4px' }} />
                <button className="btn btn-rec" onClick={() => goToPhase('countdown')} style={{ padding: '10px 18px', borderRadius: 999, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span className="rec-dot" style={{ background: 'white', animation: 'none' }} />
                  Start
                </button>
              </>
            ) : (
              <>
                <ToolbarBtn icon={micOn ? I.Mic : I.MicOff} label={micOn ? 'Mic' : 'Muted'} active={micOn} onClick={() => setMicOn(!micOn)} danger={!micOn} />
                <ToolbarBtn icon={camOn ? I.Video : I.VideoOff} label="Camera" active={camOn} onClick={() => setCamOn(!camOn)} />
                <ToolbarBtn icon={I.Music} label="Music" active={musicBed} onClick={() => { setMusicBed(!musicBed); openMusic(); }} />
                <ToolbarBtn icon={I.Sparkle} label="Effects" />
                <ToolbarBtn icon={paused ? I.Play : I.Pause} label={paused ? 'Resume' : 'Pause'} onClick={() => setPaused(!paused)} />
                <div style={{ width: 1, height: 26, background: 'oklch(0.78 0.1 82 / 0.2)', margin: '0 4px' }} />
                <button className="btn btn-rec" onClick={stopRecording} style={{ padding: '10px 16px', borderRadius: 999, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <I.Stop size={12} /> End
                </button>
              </>
            )}
          </div>

          {/* Countdown */}
          {phase === 'countdown' && <Countdown onDone={() => { goToPhase('record'); setElapsed(0); startRecording(); }} />}

          {/* Coach tip */}
          {showCoach && (
            <CoachTip
              tip={isGuests
                ? "Pause for 2 seconds after a guest finishes speaking — it makes editing dramatically easier later."
                : "Try recording a 'pickup' phrase now — if you stumble later, you can patch it in without re-recording."}
              onDismiss={dismissCoach}
            />
          )}
        </div>

        {/* Right rail */}
        <aside style={{
          width: narrow ? 232 : 280, flexShrink: 0,
          borderLeft: '1px solid var(--line-0)',
          background: 'var(--bg-1)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
          padding: '18px 14px',
        }}>
          <div className="caps" style={{ marginBottom: 10 }}>Signal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11.5, color: 'var(--fg-2)' }}>Input level</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--brass)' }}>{inputDb !== null ? `${inputDb} dB` : '—'}</span>
              </div>
              <LiveLevel stream={micOn && !paused ? localStream : null} segments={22} />
            </div>
            <QualStat label="Recording" v={phase === 'record' ? (paused ? 'Paused' : 'Live') : 'Standby'} />
            {isRoomSession && <QualStat label="Room" v={connectionStatus === 'connected' ? 'Connected' : connectionStatus} />}
          </div>

          {isGuests && (
            <>
              <div className="caps" style={{ marginBottom: 10 }}>In studio</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {liveGuests.map(g => <GuestRow key={g.key} g={g} />)}
                <button onClick={openInvite} className="btn-ghost" style={{ fontSize: 11.5, padding: '8px 10px', border: '1px dashed var(--line-1)', borderRadius: 'var(--r-md)', justifyContent: 'center' }}>
                  <I.Plus size={11} /> Invite another
                </button>
              </div>
            </>
          )}

          <div className="caps" style={{ marginBottom: 10 }}>Notes</div>
          <textarea placeholder="Jot a moment to revisit in the editor…" style={{
            width: '100%', minHeight: 80, resize: 'vertical',
            background: 'var(--bg-inset)',
            border: '1px solid var(--line-0)',
            borderRadius: 'var(--r-md)',
            padding: 10, fontSize: 12, color: 'var(--fg-0)',
            fontFamily: 'inherit',
            outline: 'none',
          }} />
        </aside>
      </div>
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, active, danger, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding: '6px 12px',
      borderRadius: 22,
      background: active ? 'oklch(0.78 0.1 82 / 0.16)' : 'transparent',
      color: danger ? 'oklch(0.82 0.16 25)' : active ? 'var(--brass-bright)' : 'oklch(0.92 0 0)',
      transition: 'all 0.15s',
      minWidth: 52,
    }}>
      <Icon size={15} />
      <span style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '0.02em', opacity: 0.9 }}>{label}</span>
    </button>
  );
}

function GuestSeat({ g, recording, narrow }) {
  const tint = g.tint === 'olive' ? 'oklch(0.72 0.06 155)' : g.tint === 'amber' ? 'oklch(0.78 0.1 82)' : 'oklch(0.68 0.12 45)';
  const w = narrow ? 128 : 180, h = narrow ? 92 : 128;
  return (
    <div style={{
      width: w, height: h, flexShrink: 0,
      background: 'oklch(0.12 0.02 165 / 0.8)',
      borderRadius: 'var(--r-md)',
      border: `1px solid ${g.status === 'joined' ? 'oklch(0.78 0.1 82 / 0.45)' : 'var(--line-0)'}`,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: g.status === 'joined' ? '0 0 24px -6px oklch(0.78 0.1 82 / 0.35), var(--sh-md)' : 'var(--sh-md)',
      transform: `perspective(800px) rotateY(${g.name === 'Maya Chen' ? 4 : -4}deg)`,
    }}>
      {g.status === 'joined' ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${tint} 0%, oklch(0.14 0.02 165) 75%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Avatar name={g.name} tint={g.tint} size={56} />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: 'var(--fg-3)' }}>
          <I.Clock size={18} />
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Waiting</span>
        </div>
      )}
      <div style={{
        position: 'absolute', left: 8, bottom: 8, right: 8,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 11, color: 'oklch(0.95 0 0)', fontWeight: 500 }}>{g.name.split(' ')[0]}</span>
        <div style={{ flex: 1 }}>
          {g.status === 'joined' && <LiveLevel stream={g.stream} segments={10} />}
        </div>
      </div>
    </div>
  );
}

function GuestRow({ g }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar name={g.name} tint={g.tint} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>
          {g.status === 'joined' ? 'Live' : g.status === 'invited' ? 'Waiting' : 'Ready'} · {g.role}
        </div>
      </div>
      <div style={{ width: 44 }}><LiveLevel stream={g.stream} segments={10} /></div>
    </div>
  );
}

function QualStat({ label, v }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)' }} />
      <span style={{ fontSize: 12, color: 'var(--fg-1)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--sage)' }}>{v}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Green Room — waiting area for guests
// ─────────────────────────────────────────────────────────────
function GreenRoom({ guests, onStart, openInvite, chatMessages, onSendChat, connectionStatus, roomId, isHost, pendingPhase, onAcceptPhase, userName, onSaveName, episodeTitle, onSaveTitle, isRoomSession }) {
  const isLive = !!chatMessages;
  const messages = chatMessages || [];
  const [draft, setDraft] = React.useState('');
  const [nameDraft, setNameDraft] = React.useState('');
  const chatBottomRef = React.useRef(null);
  React.useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Responsive: guests mostly join from phones
  const [vw, setVw] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  React.useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const narrow = vw < 920;

  const send = () => {
    if (!draft.trim() || !isLive) return;
    onSendChat(draft.trim());
    setDraft('');
  };

  // ── Name gate: the room only goes live once we know who you are ──
  if (isRoomSession && !userName) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)', position: 'relative' }}>
        <Scene scene="lateNight" />
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: 400, maxWidth: '94vw', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brass)' }} />
              <span className="caps" style={{ color: 'var(--brass)' }}>{isHost ? 'Your studio' : 'Joining room'} · {roomId}</span>
            </div>
            <h2 className="display" style={{ fontSize: 30, margin: '10px 0 6px', color: 'var(--fg-0)' }}>
              {isHost ? 'Open your studio' : "You're invited to record"}
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.6, margin: '0 0 20px' }}>
              {isHost
                ? 'Your name is shown to guests in the green room and on your recorded track.'
                : 'Enter your name so the host knows who joined. Your audio records right in this browser — nothing to install.'}
            </p>
            <input
              autoFocus
              placeholder="Your name"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nameDraft.trim() && onSaveName(nameDraft)}
              className="input"
              style={{ width: '100%', fontSize: 15, padding: '12px 14px', marginBottom: 12, boxSizing: 'border-box' }}
            />
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', opacity: nameDraft.trim() ? 1 : 0.5 }}
              disabled={!nameDraft.trim()}
              onClick={() => onSaveName(nameDraft)}
            >
              <I.Mic size={14} /> Enter green room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)', position: 'relative' }}>
      <Scene scene="lateNight" />
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1.4fr 1fr', gap: narrow ? 22 : 40, padding: narrow ? '26px 18px' : '48px 48px', overflow: 'auto' }}>
        {/* Left — episode info */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: narrow ? 'flex-start' : 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: narrow ? 14 : 24 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brass)' }} />
            <span className="caps" style={{ color: 'var(--brass)' }}>Green room</span>
            {isLive && connectionStatus && (
              <span style={{ fontSize: 10.5, color: connectionStatus === 'connected' ? 'var(--sage)' : 'oklch(0.82 0.16 25)', marginLeft: 4 }}>
                · {connectionStatus === 'connected' ? 'connected' : connectionStatus + '…'}
              </span>
            )}
          </div>
          {isHost ? (
            <input
              value={episodeTitle}
              onChange={e => onSaveTitle(e.target.value)}
              placeholder="Name your episode…"
              className="display"
              style={{
                fontSize: narrow ? 34 : 54, lineHeight: 1.1, margin: 0, color: 'var(--fg-0)',
                background: 'transparent', border: 'none', borderBottom: '1px dashed oklch(0.78 0.1 82 / 0.3)',
                outline: 'none', padding: '0 0 6px', width: '100%', maxWidth: 560,
              }}
            />
          ) : (
            <h1 className="display" style={{ fontSize: narrow ? 34 : 54, lineHeight: 1.1, margin: 0, color: 'var(--fg-0)' }}>
              {episodeTitle || <span style={{ color: 'var(--fg-3)' }}>Untitled episode</span>}
            </h1>
          )}
          <p style={{ fontSize: narrow ? 14 : 16, color: 'var(--fg-1)', marginTop: narrow ? 14 : 22, maxWidth: 460, lineHeight: 1.6 }}>
            {isHost
              ? 'Share the invite link below. When everyone\'s in, start the sound check — recording begins after a quick 3-2-1.'
              : 'Settle in — the host will start a quick sound check, and you\'ll get a tap-to-join prompt right here.'}
          </p>

          {pendingPhase && (
            <div style={{
              marginTop: 24,
              padding: '12px 16px',
              background: 'oklch(0.62 0.14 40 / 0.1)',
              border: '1px solid oklch(0.62 0.14 40 / 0.35)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <I.Mic size={14} style={{ color: 'var(--terracotta)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--fg-1)', flex: 1 }}>
                {pendingPhase === 'check' ? 'Host started sound check — tap to join' : 'Host is recording — tap to join in'}
              </span>
              <button className="btn btn-primary" onClick={onAcceptPhase}>
                Join now
              </button>
            </div>
          )}

          <div style={{ marginTop: 32, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isHost ? (
              <button className="btn btn-primary btn-lg" onClick={onStart}>
                <I.Mic size={15} /> Go to sound check
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--bg-2)', border: '1px solid var(--line-0)', borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: connectionStatus === 'connected' ? 'var(--sage)' : 'var(--brass)', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 13, color: 'var(--fg-1)' }}>
                  {connectionStatus === 'connected' ? 'In the green room · waiting for host' : 'Connecting to room…'}
                </span>
              </div>
            )}
            {isHost && (
              <button className="btn btn-lg" onClick={openInvite}>
                <I.Plus size={13} /> Invite guest
              </button>
            )}
            <button className="btn btn-lg" onClick={() => window.__setPage('home')}>
              <I.ChevronLeft size={13} /> Leave
            </button>
          </div>

          {isHost && roomId && (
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'oklch(0.78 0.1 82 / 0.08)', border: '1px solid oklch(0.78 0.1 82 / 0.25)', borderRadius: 8 }}>
              <I.Link size={12} style={{ color: 'var(--brass)', flexShrink: 0 }} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {window.location.href.split('?')[0]}?room={roomId}
              </span>
              <button className="btn" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }} onClick={() => {
                const link = window.location.href.split('?')[0] + '?room=' + roomId;
                navigator.clipboard?.writeText(link).catch(() => {});
                openInvite();
              }}>
                <I.Copy size={11} /> Copy
              </button>
            </div>
          )}

          <div style={{ marginTop: narrow ? 26 : 44, display: 'flex', gap: 28, alignItems: 'flex-end' }}>
            <div>
              <div className="caps" style={{ marginBottom: 6 }}>In the room</div>
              <div style={{ display: 'flex' }}>
                {guests.map((g, i) => (
                  <div key={g.key} style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid var(--bg-0)', borderRadius: '50%' }} title={g.name}>
                    <Avatar name={g.name} tint={g.tint} size={32} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="caps" style={{ marginBottom: 6 }}>Recording</div>
              <div style={{ fontSize: 13, color: 'var(--brass-bright)' }}>Local · in your browser</div>
            </div>
          </div>
        </div>

        {/* Right — visible room surface + live chat (room sessions only) */}
        {isLive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignSelf: narrow ? 'stretch' : 'center', minWidth: 0, paddingBottom: narrow ? 20 : 0 }}>
          <StudioRoomCard
            guests={guests}
            roomId={roomId}
            isHost={isHost}
            connectionStatus={connectionStatus}
            openInvite={openInvite}
          />

          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', maxHeight: 390 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-0)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="rec-dot" style={{ background: 'var(--sage)', animation: 'none' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Live chat</span>
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>· not recorded</span>
          </div>
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && isLive && (
              <div style={{ textAlign: 'center', color: 'var(--fg-3)', fontSize: 12, padding: '20px 0' }}>
                {connectionStatus === 'connected' ? 'Connected — say hi!' : 'Connecting to room…'}
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 10, flexDirection: m.you ? 'row-reverse' : 'row' }}>
                <Avatar name={m.from} tint={m.tint} size={28} />
                <div style={{ maxWidth: '72%' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexDirection: m.you ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-1)' }}>{m.from}</span>
                    <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{m.time}</span>
                  </div>
                  <div style={{
                    padding: '8px 12px',
                    background: m.you ? 'var(--brass-tint)' : 'var(--bg-2)',
                    border: m.you ? '1px solid oklch(0.78 0.1 82 / 0.3)' : '1px solid var(--line-0)',
                    borderRadius: 'var(--r-md)',
                    fontSize: 13, color: 'var(--fg-0)', lineHeight: 1.5,
                  }}>{m.text}</div>
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--line-0)', display: 'flex', gap: 8 }}>
            <input
              placeholder="Message the green room…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              className="input"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={send}><I.ChevronRight size={13} /></button>
          </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function StudioRoomCard({ guests, roomId, isHost, connectionStatus, openInvite }) {
  const connectedCount = guests.filter(g => ['ready', 'joined'].includes(g.status)).length;
  const hasGuest = guests.some(g => g.role === 'Guest' && !g.you);
  const statusText =
    connectionStatus === 'connected' ? 'Room live' :
    connectionStatus === 'reconnecting' ? 'Reconnecting' :
    connectionStatus === 'error' ? 'Connection issue' :
    'Opening room';

  const seats = hasGuest || !isHost
    ? guests
    : [...guests, { key: 'waiting-guest', name: 'Waiting for guest', role: 'Guest', tint: 'olive', status: 'invited', waiting: true }];

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'oklch(0.14 0.02 165 / 0.88)', borderColor: 'oklch(0.78 0.1 82 / 0.22)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-0)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--brass-tint)', color: 'var(--brass-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <I.Users size={15} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--fg-0)' }}>Studio room</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 2 }}>ROOM {roomId}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: connectionStatus === 'error' ? 'oklch(0.82 0.16 25)' : 'var(--sage)', fontSize: 11.5, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 12px currentColor' }} />
          {statusText}
        </div>
      </div>

      <div style={{ padding: 14, display: 'grid', gap: 8 }}>
        {seats.map(g => {
          const live = ['ready', 'joined'].includes(g.status);
          const waiting = g.waiting || g.status === 'invited' || g.status === 'joining';
          return (
            <div key={g.key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 11px',
              background: live ? 'oklch(0.78 0.1 82 / 0.08)' : 'var(--bg-2)',
              border: live ? '1px solid oklch(0.78 0.1 82 / 0.22)' : '1px dashed var(--line-1)',
              borderRadius: 8,
            }}>
              <Avatar name={g.name} tint={g.tint} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: live ? 'var(--fg-0)' : 'var(--fg-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.name}
                </div>
                <div style={{ marginTop: 2, fontSize: 10.5, color: waiting ? 'var(--brass-bright)' : 'var(--fg-3)' }}>
                  {g.you ? 'You' : g.role} · {live ? 'in room' : waiting ? 'waiting' : g.status}
                </div>
              </div>
              <div style={{ width: 54, display: 'flex', justifyContent: 'flex-end' }}>
                <LiveLevel stream={g.stream} segments={10} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="chip" style={{ background: 'var(--bg-2)' }}>
          <I.Mic size={10} /> {connectedCount} in room
        </div>
        <div style={{ flex: 1 }} />
        {isHost && !hasGuest && (
          <button className="btn" style={{ fontSize: 11, padding: '5px 10px' }} onClick={openInvite}>
            <I.Plus size={11} /> Invite
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Wrap screen — "That's a wrap"
// ─────────────────────────────────────────────────────────────
function WrapScreen({ elapsed, tracks = [], episodeTitle, isHost }) {
  const [shared, setShared] = React.useState(false);
  const safeTitle = (episodeTitle || 'episode').replace(/[^\w一-鿿-]+/g, '-').slice(0, 40);
  const ext = (blob) => (blob?.type || '').includes('ogg') ? 'ogg' : 'webm';
  const fileName = (t) => `${safeTitle}-${(t.name || 'track').replace(/[^\w一-鿿-]+/g, '-')}.${ext(t.blob)}`;

  const download = (t) => {
    const a = document.createElement('a');
    a.href = t.url;
    a.download = fileName(t);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const downloadAll = () => tracks.forEach((t, i) => setTimeout(() => download(t), i * 400));

  const files = tracks.filter(t => t.blob).map(t => new File([t.blob], fileName(t), { type: t.blob.type || 'audio/webm' }));
  const canShare = typeof navigator.canShare === 'function' && files.length > 0 && navigator.canShare({ files });
  const shareTracks = async () => {
    try {
      await navigator.share({ files, title: episodeTitle || 'Podstudio session' });
      setShared(true);
    } catch (_) {} // user cancelled
  };
  const emailHref = `mailto:?subject=${encodeURIComponent((episodeTitle || 'Podcast session') + ' — audio tracks')}&body=${encodeURIComponent('Hi!\n\nMy recorded track from "' + (episodeTitle || 'our session') + '" is attached.\n\n(Recorded with Podstudio — the files were just downloaded to my device; attaching them to this email.)')}`;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)', position: 'relative' }}>
      <Scene scene="lateNight" />
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'auto' }}>
        <div className="fade-in" style={{ maxWidth: 640, width: '100%', textAlign: 'center' }}>
          <div className="caps" style={{ color: 'var(--brass)', marginBottom: 14 }}>Session complete</div>
          <h1 className="display" style={{ fontSize: 64, lineHeight: 1, margin: 0, color: 'var(--fg-0)' }}>
            That's a <em style={{ color: 'var(--brass-bright)' }}>wrap</em>.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--fg-1)', marginTop: 16, lineHeight: 1.6 }}>
            {tracks.length > 0
              ? (isHost
                  ? `${fmtTime(elapsed)} recorded · ${tracks.length} track${tracks.length > 1 ? 's' : ''} saved locally in this browser. Download them now — they're gone if you close the tab.`
                  : `${fmtTime(elapsed)} recorded. Download your track and send it to your host — your local copy is the highest-quality version.`)
              : 'No audio was captured this session.'}
          </p>

          {tracks.length > 0 && (
            <div className="card" style={{ padding: 16, marginTop: 28, marginBottom: 20, background: 'oklch(0.18 0.02 165 / 0.85)', backdropFilter: 'blur(10px)', textAlign: 'left' }}>
              <div className="caps" style={{ marginBottom: 12 }}>Recorded tracks</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tracks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--line-0)', borderRadius: 8 }}>
                    <Avatar name={t.name || 'Track'} tint={t.tint || 'terracotta'} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name || `Track ${i + 1}`}</div>
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)', marginTop: 2 }}>{fileName(t)} · {(t.blob?.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <audio src={t.url} controls style={{ height: 30, maxWidth: 170 }} />
                    <button className="btn" style={{ fontSize: 11, padding: '6px 10px', flexShrink: 0 }} onClick={() => download(t)}>
                      <I.Download size={11} /> Save
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={downloadAll}>
                  <I.Download size={12} /> Download all
                </button>
                {canShare && (
                  <button className="btn" onClick={shareTracks}>
                    <I.Share size={12} /> {shared ? 'Shared!' : 'Share files…'}
                  </button>
                )}
                <a className="btn" href={emailHref} onClick={downloadAll} style={{ textDecoration: 'none' }}>
                  <I.FileText size={12} /> Email (downloads first)
                </a>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: tracks.length === 0 ? 28 : 0 }}>
            <button className="btn btn-lg" onClick={() => window.__setPage('home')}>
              <I.Home size={13} /> Back home
            </button>
            {tracks.length > 0 && (
              <button className="btn btn-primary btn-lg" onClick={() => window.__setPage('edit')}>
                Open in editor <I.ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Real-time waveform driven by a Web Audio AnalyserNode
function RealWaveform({ analyserRef, active, height = 40, barCount = 80 }) {
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const phaseRef = React.useRef(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let dataArray = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const analyser = analyserRef?.current;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const barW = w / barCount;
      const gap = barW * 0.4;
      phaseRef.current += 0.04;

      if (analyser && !dataArray) dataArray = new Uint8Array(analyser.frequencyBinCount);

      for (let i = 0; i < barCount; i++) {
        let mag;
        if (analyser && dataArray && active) {
          analyser.getByteFrequencyData(dataArray);
          const bin = Math.floor(i * dataArray.length / barCount);
          mag = dataArray[bin] / 255;
          if (mag < 0.02) {
            const t = phaseRef.current + i * 0.3;
            mag = 0.04 + Math.abs(Math.sin(t * 0.3)) * 0.05;
          }
        } else {
          const t = phaseRef.current + i * 0.2;
          mag = active
            ? Math.max(0.05, Math.abs(Math.sin(t) * 0.35 + Math.sin(t * 2.1) * 0.25))
            : 0.03 + Math.abs(Math.sin(phaseRef.current * 0.1 + i * 0.1)) * 0.03;
        }

        const barH = Math.max(3, mag * h * 0.92);
        const x = i * barW + gap / 2;
        const y = (h - barH) / 2;
        const rw = barW - gap;
        const r = Math.min(rw / 2, 3);
        ctx.fillStyle = 'oklch(0.72 0.12 40)';
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + rw, y, x + rw, y + r, r);
        ctx.arcTo(x + rw, y + barH, x + rw - r, y + barH, r);
        ctx.arcTo(x, y + barH, x, y + barH - r, r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [active, barCount]);

  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />;
}

window.StudioPage = StudioPage;
