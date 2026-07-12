// Recording Studio — immersive broadcast space

// Real audio level (0..1 RMS) for any MediaStream — drives every meter in the studio.
// One shared AudioContext + one analyser per stream: iOS caps concurrent
// contexts, and several meters often watch the same stream.
const _levelShared = { ctx: null, byStream: new WeakMap() };
function getSharedAnalyser(stream) {
  if (!_levelShared.ctx) _levelShared.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_levelShared.ctx.state === 'suspended') _levelShared.ctx.resume().catch(() => {});
  let an = _levelShared.byStream.get(stream);
  if (!an) {
    const src = _levelShared.ctx.createMediaStreamSource(stream);
    an = _levelShared.ctx.createAnalyser();
    an.fftSize = 256;
    an.smoothingTimeConstant = 0.55;
    src.connect(an);
    _levelShared.byStream.set(stream, an);
  }
  return an;
}

function useStreamLevel(stream) {
  const [level, setLevel] = React.useState(0);
  React.useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) { setLevel(0); return; }
    let raf;
    try {
      const an = getSharedAnalyser(stream);
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
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [stream]);
  return level;
}

// Plays a remote peer's audio. Also required for metering: Chrome only feeds
// WebRTC streams into AnalyserNodes while an HTMLMediaElement is consuming them.
function RemoteAudio({ stream }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {});
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}

// Renders a live video stream into a tile
function VideoTile({ stream, muted = true, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {});
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />;
}

function hasLiveVideo(stream) {
  return !!stream && stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
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
  const [scene, setScene] = React.useState(() => localStorage.getItem('podstudio-scene') || 'chicago');
  const [atmo, setAtmo] = React.useState({ rain: false, snow: false, fireplace: false, lamp: true, coffee: true });
  const [sceneFlash, setSceneFlash] = React.useState(null);
  const changeScene = (k, label) => {
    setScene(k);
    localStorage.setItem('podstudio-scene', k);
    setSceneFlash(label);
    setTimeout(() => setSceneFlash(null), 1700);
  };
  // Entrance ritual: curtains part, camera pushes in on the mic, settles wide
  const [entrance, setEntrance] = React.useState(false);
  const entranceDoneRef = React.useRef(false);
  React.useEffect(() => {
    if (phase === 'check' && !entranceDoneRef.current) {
      entranceDoneRef.current = true;
      setEntrance(true);
      const t = setTimeout(() => setEntrance(false), 4300);
      return () => clearTimeout(t);
    }
  }, [phase]);
  const [paused, setPaused] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(false);
  const [coachSeen, setCoachSeen] = React.useState(() => localStorage.getItem('podstudio-coach-seen') === '1');
  const [showCoach, setShowCoach] = React.useState(false);
  const [micError, setMicError] = React.useState(null);
  const [localStream, setLocalStream] = React.useState(null);
  const [pendingPhase, setPendingPhase] = React.useState(null);
  const [finishedTracks, setFinishedTracks] = React.useState([]);
  const [finishedVideos, setFinishedVideos] = React.useState([]);
  const videoRecordersRef = React.useRef([]);
  const [cameraPref, setCameraPref] = React.useState(false);
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
  const { peers, connectionStatus, chatMessages, sendChat, sendPhase, sendMeta, sendTrack } = useRoom({
    roomId: userName ? roomId : null,
    isHost,
    localStream,
    userName: myName,
    onMetaChange: (meta) => {
      if (!isHost && meta && typeof meta.title === 'string') setEpisodeTitle(meta.title);
    },
    onTrackReceived: ({ blob, name }) => {
      // A guest pushed their full-quality local recording after wrap.
      // It REPLACES the WebRTC-compressed copy we recorded of the same
      // person — keeping both would double the voice (echo) in the mix.
      const track = { blob, url: URL.createObjectURL(blob), name: `${name} (HD)`, tint: 'blue' };
      setFinishedTracks(prev => {
        const next = [...prev.filter(t => t.name !== name && t.name !== track.name), track];
        onRecordingComplete?.(next);
        return next;
      });
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

  // Request mic (and camera, if chosen in the green room) on sound-check entry
  React.useEffect(() => {
    if (phase !== 'check') return;
    const initMic = async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: cameraPref ? { width: { ideal: 640 }, facingMode: 'user' } : false,
        });
      } catch (err) {
        if (cameraPref) {
          // Camera failed — retry audio-only rather than blocking the session
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); } catch (_) {}
        }
      }
      if (!stream) { setMicError('Microphone access denied. Check browser permissions.'); return; }
      try {
        setCamOn(stream.getVideoTracks().length > 0);
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

  // Camera toggle: on → request the camera now and re-call peers with the
  // new stream; off → stop the video track entirely (camera light goes off)
  const toggleCam = async () => {
    const cur = streamRef.current;
    const vts = cur?.getVideoTracks() || [];
    if (camOn && vts.length > 0) {
      vts.forEach(t => t.stop());
      const audioOnly = new MediaStream(cur.getAudioTracks());
      streamRef.current = audioOnly;
      setLocalStream(audioOnly);
      setCamOn(false);
      return;
    }
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, facingMode: 'user' }, audio: false });
      const merged = new MediaStream([...(cur?.getAudioTracks() || []), ...cam.getVideoTracks()]);
      streamRef.current = merged;
      setLocalStream(merged);
      setCamOn(true);
    } catch (err) {
      setMicError('Camera unavailable or permission denied.');
      setTimeout(() => setMicError(null), 4000);
      setCamOn(false);
    }
  };

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
    // Podcast tracks are audio-only even when cameras are on
    const mr = new MediaRecorder(new MediaStream(streamRef.current.getAudioTracks()), mimeType ? { mimeType } : {});
    mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
    mr.start(250);
    mediaRecorderRef.current = mr;

    // Start a recorder per guest stream
    trackRecordersRef.current = {};
    if (isRoomSession) {
      Object.entries(peers).forEach(([id, p]) => {
        if (p.stream && p.stream.getAudioTracks().length > 0) {
          const rec = createTrackRecorder(new MediaStream(p.stream.getAudioTracks()));
          rec.start();
          trackRecordersRef.current[id] = { rec, name: p.name || 'Guest', tint: p.tint || 'olive' };
        }
      });
    }
    // Video recorders: one per participant whose stream has a live camera.
    // Kept separate from the audio pipeline so audio tracks stay clean.
    videoRecordersRef.current = [];
    const startVideoRec = (stream, name) => {
      if (!stream || !stream.getVideoTracks().some(t => t.readyState === 'live')) return;
      try {
        const s = new MediaStream([...stream.getVideoTracks(), ...stream.getAudioTracks()]);
        const vMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' :
                      MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
        const vr = new MediaRecorder(s, vMime ? { mimeType: vMime, videoBitsPerSecond: 1200000 } : {});
        const chunks = [];
        vr.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
        vr.start(500);
        videoRecordersRef.current.push({ vr, chunks, name });
      } catch (e) { console.warn('[Podstudio] video recorder failed:', e); }
    };
    startVideoRec(streamRef.current, myName);
    if (isRoomSession) Object.values(peers).forEach(p => startVideoRec(p.stream, p.name || 'Guest'));

    console.log('[Podstudio] recording started, tracks:', 1 + Object.keys(trackRecordersRef.current).length, '· video:', videoRecordersRef.current.length);
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') { finishSession(null, []); return; }
    if (mr.state === 'recording') { try { mr.requestData(); } catch (_) {} }

    const guestStopPromises = Object.entries(trackRecordersRef.current).map(([id, { rec, name, tint }]) =>
      rec.stop().then(blob => blob ? { blob, url: URL.createObjectURL(blob), name, tint } : null)
    );

    // Stop video recorders and collect their files
    const videoStopPromises = videoRecordersRef.current.map(({ vr, chunks, name }) =>
      new Promise(resolve => {
        vr.addEventListener('stop', () => {
          const blob = new Blob(chunks, { type: vr.mimeType || 'video/webm' });
          resolve(blob.size > 0 ? { blob, url: URL.createObjectURL(blob), name } : null);
        }, { once: true });
        try { if (vr.state === 'recording') vr.requestData(); vr.stop(); } catch (_) { resolve(null); }
      })
    );

    mr.addEventListener('stop', () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
      const hostTrack = blob.size > 0 ? { blob, url: URL.createObjectURL(blob), name: myName, duration: elapsedRef.current } : null;
      Promise.all([Promise.all(guestStopPromises), Promise.all(videoStopPromises)]).then(([guestTracks, videos]) => {
        finishSession(hostTrack, guestTracks.filter(Boolean), videos.filter(Boolean));
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
      if (p.stream && p.stream.getAudioTracks().length > 0 && !trackRecordersRef.current[id]) {
        const rec = createTrackRecorder(new MediaStream(p.stream.getAudioTracks()));
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

  const finishSession = (hostTrack, guestTracks, videos = []) => {
    const allTracks = [hostTrack, ...guestTracks].filter(Boolean);
    if (allTracks.length > 0) onRecordingComplete?.(allTracks);
    setFinishedTracks(allTracks);
    setFinishedVideos(videos);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    goToPhase('wrap');
    // Guests push their full-quality local track to the host automatically
    if (!isHost && hostTrack?.blob) {
      sendTrack(hostTrack.blob, myName).then(ok => {
        if (ok) console.log('[Podstudio] HQ track sent to host');
      }).catch(e => console.warn('[Podstudio] track send failed:', e));
    }
  };

  // Real mic level drives the sculpture glow and the Signal meter
  const myLevel = useStreamLevel(micOn && !paused ? localStream : null);
  const level = Math.max(myLevel, 0.04);
  const inputDb = myLevel > 0.001 ? Math.max(-60, Math.round(20 * Math.log10(myLevel))) : null;

  // Flag a live session for the app-level "don't lose the recording" guard
  React.useEffect(() => {
    window.__recordingActive = phase === 'record';
    return () => { window.__recordingActive = false; };
  }, [phase]);

  // Elapsed timer
  React.useEffect(() => {
    if (phase !== 'record' || paused) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase, paused]);

  // Pause actually pauses every recorder (solo sessions only — cross-device
  // pause would desync guest tracks, so the button is hidden in rooms)
  React.useEffect(() => {
    if (phase !== 'record') return;
    const syncRec = (r) => {
      try {
        if (paused && r.state === 'recording') r.pause();
        if (!paused && r.state === 'paused') r.resume();
      } catch (_) {}
    };
    if (mediaRecorderRef.current) syncRec(mediaRecorderRef.current);
    videoRecordersRef.current.forEach(({ vr }) => syncRec(vr));
  }, [paused, phase]);

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
    { k: 'chicago',      l: 'Chicago',       sub: 'the loop at dusk' },
    { k: 'newyork',      l: 'New York',      sub: 'midtown spires' },
    { k: 'hongkong',     l: 'Hong Kong',     sub: 'harbour lights' },
    { k: 'losangeles',   l: 'Los Angeles',   sub: 'golden hour' },
    { k: 'sanfrancisco', l: 'San Francisco', sub: 'fog on the bridge' },
  ];
  const atmoOptions = [
    { k: 'rain',      l: 'Rain on the glass', sub: 'droplets sliding down' },
    { k: 'snow',      l: 'Snowfall',          sub: 'outside the window' },
    { k: 'fireplace', l: 'Fireplace',         sub: 'built into the wall' },
    { k: 'lamp',      l: 'Desk lamp',         sub: 'a pool of warm light' },
    { k: 'coffee',    l: 'Fresh coffee',      sub: 'steam curling up' },
  ];

  // Hidden layer that plays every remote peer's audio (and keeps meters fed)
  const remoteAudioLayer = (
    <div style={{ display: 'none' }}>
      {Object.entries(peers).map(([id, p]) => p.stream ? <RemoteAudio key={id} stream={p.stream} /> : null)}
    </div>
  );

  if (phase === 'greenRoom') {
    return (
      <>
      {remoteAudioLayer}
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
        cameraPref={cameraPref}
        onToggleCamera={() => setCameraPref(c => !c)}
      />
      </>
    );
  }

  if (phase === 'wrap') {
    return <WrapScreen elapsed={elapsed} tracks={finishedTracks} videos={finishedVideos} episodeTitle={episodeTitle} isHost={isHost} />;
  }

  // Collapse side rails on narrower viewports so the stage stays usable
  const narrow = typeof window !== 'undefined' && window.innerWidth < 1200;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)', position: 'relative' }}>
      {remoteAudioLayer}
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
          <div className="caps" style={{ padding: '0 10px 8px', color: 'var(--brass)' }}>The view</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {scenes.map(s => (
              <button key={s.k} onClick={() => changeScene(s.k, s.l)}
                className="nav-item"
                style={{
                  textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                  background: scene === s.k ? 'var(--brass-tint)' : 'transparent',
                  border: `1px solid ${scene === s.k ? 'oklch(0.60 0.19 35 / 0.3)' : 'transparent'}`,
                }}>
                <div style={{ fontSize: 12.5, fontWeight: scene === s.k ? 600 : 500, color: scene === s.k ? 'var(--brass)' : 'var(--fg-1)' }}>{s.l}</div>
                <div className="serif-it" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{s.sub}</div>
              </button>
            ))}
          </div>

          <div className="caps" style={{ padding: '18px 10px 8px', color: 'var(--brass)' }}>Atmosphere</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {atmoOptions.map(a => (
              <button key={a.k} onClick={() => setAtmo(p => ({ ...p, [a.k]: !p[a.k] }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                  background: atmo[a.k] ? 'var(--brass-tint)' : 'transparent',
                  border: `1px solid ${atmo[a.k] ? 'oklch(0.60 0.19 35 / 0.3)' : 'transparent'}`,
                }}>
                <span style={{
                  width: 28, height: 16, borderRadius: 999, position: 'relative', flexShrink: 0,
                  background: atmo[a.k] ? 'var(--brass)' : 'var(--bg-3)', transition: 'background 0.15s',
                }}>
                  <span style={{ position: 'absolute', top: 2, left: atmo[a.k] ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: 'oklch(0.97 0.008 88)', transition: 'left 0.15s', boxShadow: 'var(--sh-sm)' }} />
                </span>
                <span>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: atmo[a.k] ? 'var(--brass)' : 'var(--fg-1)' }}>{a.l}</div>
                  <div className="serif-it" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{a.sub}</div>
                </span>
              </button>
            ))}
          </div>

          <div style={{ padding: '16px 10px 0', fontSize: 10.5, color: 'var(--fg-3)', lineHeight: 1.5 }}>
            The view is yours alone — it never touches the audio.
          </div>
        </aside>

        {/* Center stage */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            animation: entrance ? 'camera-push 4s cubic-bezier(0.45, 0, 0.25, 1) 0.4s both' : 'none',
            transformOrigin: '50% 72%',
          }}>
          <Scene scene={scene} atmo={atmo} voice={myLevel} />

          {/* Pull cord — ceiling hanging cord with vintage bulb */}
          <PullCord
            sceneName={scenes.find(s => s.k === scene)?.l || 'Chicago'}
            onPull={() => {
              const idx = scenes.findIndex(s => s.k === scene);
              const next = scenes[(idx + 1) % scenes.length];
              changeScene(next.k, next.l);
            }}
          />

          {/* 3D desk — perspective container (above the room layers) */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-end',
            padding: '32px 20px 0',
            perspective: '1200px',
            zIndex: 7,
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

            {/* Microphone hero — standing clear on the desk, above the toolbar */}
            <div style={{
              position: 'relative',
              marginBottom: 92,
              transform: 'translateZ(40px)',
              filter: 'drop-shadow(0 18px 22px oklch(0.25 0.03 55 / 0.30))',
            }}>
              <MicSculpture size={196} active={phase === 'record' && !paused && micOn} level={level} popFilter={true} onDesk={false} />
            </div>
          </div>

          {/* Sound-check heading now lives in the top bar so it never fights with the mic or guests */}

          {/* Self camera preview */}
          {camOn && hasLiveVideo(localStream) && (
            <div style={{
              position: 'absolute', right: 24, top: 18, zIndex: 6,
              width: narrow ? 120 : 168, height: narrow ? 86 : 118,
              borderRadius: 'var(--r-md)', overflow: 'hidden',
              border: '1px solid oklch(0.78 0.1 82 / 0.4)',
              boxShadow: 'var(--sh-md)',
            }}>
              <VideoTile stream={localStream} style={{ transform: 'scaleX(-1)' }} />
              <span style={{ position: 'absolute', left: 8, bottom: 6, fontSize: 10, color: 'var(--fg-0)', textShadow: '0 1px 3px oklch(1 0 0/0.6)' }}>You</span>
            </div>
          )}

          {/* Recording waveform banner */}
          {phase === 'record' && (
            <div style={{
              position: 'absolute', left: 24, right: 24, bottom: 110, zIndex: 5,
              padding: '14px 18px',
              background: 'oklch(0.97 0.008 88 / 0.75)',
              backdropFilter: 'blur(12px)',
              borderRadius: 'var(--r-lg)',
              border: '1px solid oklch(0.78 0.1 82 / 0.2)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Avatar name={myName} tint="terracotta" size={24} />
                  <span style={{ fontSize: 12, color: 'var(--fg-0)', fontWeight: 500 }}>You · live</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'oklch(0.72 0 0)' }}>{inputDb !== null ? `${inputDb} dB` : 'no signal'}</span>
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
            background: 'linear-gradient(to bottom, oklch(0.97 0.008 88 / 0.72), oklch(0.94 0.012 86 / 0.9))',
            backdropFilter: 'blur(18px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
            border: '1px solid oklch(0.78 0.1 82 / 0.22)',
            borderTop: '1px solid oklch(0.78 0.1 82 / 0.38)',
            borderRadius: 999,
            boxShadow: '0 14px 36px -10px oklch(0.3 0.03 60 / 0.28), inset 0 1px 0 oklch(1 0 0 / 0.7)',
            zIndex: 30,
            maxWidth: 'calc(100% - 32px)',
            overflowX: 'auto',
          }}>
            {phase === 'check' ? (
              <>
                <ToolbarBtn icon={micOn ? I.Mic : I.MicOff} label={micOn ? 'Mic on' : 'Muted'} active={micOn} onClick={() => setMicOn(!micOn)} danger={!micOn} />
                <ToolbarBtn icon={camOn ? I.Video : I.VideoOff} label={camOn ? 'Camera' : 'Cam off'} active={camOn} onClick={toggleCam} danger={!camOn} />
                <div style={{ width: 1, height: 26, background: 'oklch(0.78 0.1 82 / 0.2)', margin: '0 4px' }} />
                {isHost ? (
                  <button className="btn btn-rec" onClick={() => goToPhase('countdown')} style={{ padding: '10px 18px', borderRadius: 999, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <span className="rec-dot" style={{ background: 'white', animation: 'none' }} />
                    Start
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--fg-0)', padding: '0 10px', whiteSpace: 'nowrap' }}>
                    Waiting for the host to start…
                  </span>
                )}
              </>
            ) : (
              <>
                <ToolbarBtn icon={micOn ? I.Mic : I.MicOff} label={micOn ? 'Mic' : 'Muted'} active={micOn} onClick={() => setMicOn(!micOn)} danger={!micOn} />
                <ToolbarBtn icon={camOn ? I.Video : I.VideoOff} label="Camera" active={camOn} onClick={toggleCam} />
                {isHost && <ToolbarBtn icon={I.Music} label="Music" onClick={openMusic} />}
                {isHost && !isRoomSession && <ToolbarBtn icon={paused ? I.Play : I.Pause} label={paused ? 'Resume' : 'Pause'} onClick={() => setPaused(!paused)} />}
                <div style={{ width: 1, height: 26, background: 'oklch(0.78 0.1 82 / 0.2)', margin: '0 4px' }} />
                {isHost ? (
                  <button className="btn btn-rec" onClick={stopRecording} style={{ padding: '10px 16px', borderRadius: 999, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <I.Stop size={12} /> End
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--fg-0)', padding: '0 10px', whiteSpace: 'nowrap' }}>
                    Recording · host ends the session
                  </span>
                )}
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
          </div>{/* end camera wrapper */}

          {/* Scene name flash — the ritual of arriving somewhere new */}
          {sceneFlash && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div className="display" style={{
                fontSize: 'clamp(40px, 7vw, 92px)', textTransform: 'uppercase',
                color: 'var(--brass)', opacity: 0.9,
                textShadow: '0 2px 30px oklch(0.96 0.01 88 / 0.9)',
                animation: 'scene-flash 1.7s cubic-bezier(0.22, 1, 0.36, 1) both',
              }}>
                {sceneFlash}
              </div>
            </div>
          )}

          {/* Entrance curtains — vermillion velvet parting on the room */}
          {entrance && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none', overflow: 'hidden' }}>
              {['left', 'right'].map(side => (
                <div key={side} style={{
                  position: 'absolute', top: 0, bottom: 0, [side]: 0, width: '52%',
                  background: `repeating-linear-gradient(90deg,
                    oklch(0.46 0.16 33) 0 22px, oklch(0.56 0.18 36) 22px 40px, oklch(0.50 0.17 34) 40px 58px)`,
                  boxShadow: side === 'left' ? '10px 0 34px oklch(0.2 0.05 35 / 0.45)' : '-10px 0 34px oklch(0.2 0.05 35 / 0.45)',
                  animation: `curtain-${side} 1.4s cubic-bezier(0.55, 0, 0.3, 1) 0.35s both`,
                }} />
              ))}
              {/* Valance across the top */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 26,
                background: 'oklch(0.42 0.15 33)',
                borderBottom: '3px solid oklch(0.34 0.12 32)',
                animation: 'fade-in 0.3s ease both reverse 3.4s',
              }} />
            </div>
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
      color: danger ? 'oklch(0.82 0.16 25)' : active ? 'var(--brass-bright)' : 'var(--fg-0)',
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
      background: 'oklch(0.985 0.006 90)',
      borderRadius: 'var(--r-md)',
      border: `1px solid ${g.status === 'joined' ? 'oklch(0.78 0.1 82 / 0.45)' : 'var(--line-0)'}`,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: g.status === 'joined' ? '0 0 24px -6px oklch(0.78 0.1 82 / 0.35), var(--sh-md)' : 'var(--sh-md)',
      transform: `perspective(800px) rotateY(${g.name === 'Maya Chen' ? 4 : -4}deg)`,
    }}>
      {g.status === 'joined' ? (
        hasLiveVideo(g.stream) ? (
          <div style={{ position: 'absolute', inset: 0 }}>
            <VideoTile stream={g.stream} />
          </div>
        ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${tint} 0%, oklch(0.92 0.014 84) 75%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Avatar name={g.name} tint={g.tint} size={56} />
        </div>
        )
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
        <span style={{ fontSize: 11, color: 'var(--fg-0)', fontWeight: 500 }}>{g.name.split(' ')[0]}</span>
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
function GreenRoom({ guests, onStart, openInvite, chatMessages, onSendChat, connectionStatus, roomId, isHost, pendingPhase, onAcceptPhase, userName, onSaveName, episodeTitle, onSaveTitle, isRoomSession, cameraPref, onToggleCamera }) {
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
        <Scene scene="chicago" />
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
      <Scene scene="chicago" />
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

          <label style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', width: 'fit-content' }}>
            <span style={{
              width: 34, height: 20, borderRadius: 999, position: 'relative', flexShrink: 0,
              background: cameraPref ? 'var(--brass)' : 'var(--bg-3)',
              border: '1px solid var(--line-1)', transition: 'background 0.15s',
            }} onClick={onToggleCamera}>
              <span style={{
                position: 'absolute', top: 2, left: cameraPref ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%', background: 'var(--fg-0)',
                transition: 'left 0.15s',
              }} />
            </span>
            <span style={{ fontSize: 13, color: 'var(--fg-1)', display: 'flex', alignItems: 'center', gap: 6 }} onClick={onToggleCamera}>
              <I.Video size={13} style={{ color: cameraPref ? 'var(--brass-bright)' : 'var(--fg-3)' }} />
              Join with camera {cameraPref ? 'on' : 'off'}
            </span>
          </label>

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
    <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'oklch(0.975 0.008 88 / 0.92)', borderColor: 'var(--line-1)' }}>
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
function WrapScreen({ elapsed, tracks = [], videos = [], episodeTitle, isHost }) {
  const [shared, setShared] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
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
      <Scene scene="chicago" />
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
            <div className="card" style={{ padding: 16, marginTop: 28, marginBottom: 20, background: 'oklch(0.975 0.008 88 / 0.92)', backdropFilter: 'blur(10px)', textAlign: 'left' }}>
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

          {videos.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 20, background: 'oklch(0.975 0.008 88 / 0.92)', backdropFilter: 'blur(10px)', textAlign: 'left' }}>
              <div className="caps" style={{ marginBottom: 12 }}>Video recordings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {videos.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--line-0)', borderRadius: 8 }}>
                    <I.Video size={14} style={{ color: 'var(--brass)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{(v.blob.size / 1024 / 1024).toFixed(1)} MB · WebM</div>
                    </div>
                    <button className="btn" style={{ fontSize: 11, padding: '6px 10px' }} onClick={() => {
                      const a = document.createElement('a');
                      a.href = v.url; a.download = `${(episodeTitle || 'episode').replace(/[^\w一-鿿-]+/g, '-')}-${v.name.replace(/[^\w一-鿿-]+/g, '-')}.webm`;
                      document.body.appendChild(a); a.click(); a.remove();
                    }}>
                      <I.Download size={11} /> Save
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setComposerOpen(true)}>
                <I.Video size={12} /> Create video episode…
              </button>
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

          {composerOpen && <VideoComposeModal videos={videos} episodeTitle={episodeTitle} onClose={() => setComposerOpen(false)} />}
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
