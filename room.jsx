// WebRTC room management via PeerJS

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getRoomInviteLink(roomId) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('room', roomId);
  return url.toString();
}

function parseRoomFromUrl() {
  return new URLSearchParams(window.location.search).get('room') || null;
}

function createTrackRecorder(stream) {
  const chunks = [];
  let mr = null;
  const mimeType =
    MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
    MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
    MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : '';
  return {
    start() {
      chunks.length = 0;
      mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mr.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
      mr.start(250);
    },
    stop() {
      return new Promise(resolve => {
        if (!mr || mr.state === 'inactive') { resolve(null); return; }
        if (mr.state === 'recording') { try { mr.requestData(); } catch (_) {} }
        mr.addEventListener('stop', () => {
          const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
          resolve(blob.size > 0 ? blob : null);
        }, { once: true });
        mr.stop();
      });
    },
  };
}

function peerTint(peerId) {
  const tints = ['olive', 'amber', 'blue', 'forest', 'purple'];
  let h = 0;
  for (let i = 0; i < peerId.length; i++) h = ((h * 31) + peerId.charCodeAt(i)) & 0x7fffffff;
  return tints[h % tints.length];
}

function useRoom({ roomId, isHost, localStream, userName, onPhaseChange, onMetaChange, onTrackReceived }) {
  const peerRef = React.useRef(null);
  const peerReadyRef = React.useRef(false);
  const dataConnsRef = React.useRef({});
  const localStreamRef = React.useRef(localStream);
  const callsMadeRef = React.useRef(new Map());
  const [peers, setPeers] = React.useState({});
  const [connectionStatus, setConnectionStatus] = React.useState('idle');
  const [chatMessages, setChatMessages] = React.useState([]);
  const onPhaseChangeRef = React.useRef(onPhaseChange);
  const onMetaChangeRef = React.useRef(onMetaChange);
  const onTrackReceivedRef = React.useRef(onTrackReceived);
  const incomingTracksRef = React.useRef({}); // fromId → { name, mime, chunks[] }

  React.useEffect(() => { onPhaseChangeRef.current = onPhaseChange; }, [onPhaseChange]);
  React.useEffect(() => { onMetaChangeRef.current = onMetaChange; }, [onMetaChange]);
  React.useEffect(() => { onTrackReceivedRef.current = onTrackReceived; }, [onTrackReceived]);
  React.useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  const handleMsg = React.useCallback((msg, fromId) => {
    if (msg.type === 'chat') {
      setChatMessages(m => [...m, {
        id: Date.now() + Math.random(),
        from: msg.name,
        text: msg.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fromId,
      }]);
    } else if (msg.type === 'phase') {
      onPhaseChangeRef.current?.(msg.phase);
    } else if (msg.type === 'meta') {
      onMetaChangeRef.current?.(msg.meta);
    } else if (msg.type === 'hello') {
      setPeers(p => ({
        ...p,
        [fromId]: { ...(p[fromId] || {}), name: msg.name, status: 'joined', tint: p[fromId]?.tint || peerTint(fromId) },
      }));
    } else if (msg.type === 'tkmeta') {
      // Guest is about to send their full-quality local recording
      incomingTracksRef.current[fromId] = { name: msg.name, mime: msg.mime, chunks: [] };
    } else if (msg.type === 'tkchunk') {
      incomingTracksRef.current[fromId]?.chunks.push(msg.data);
    } else if (msg.type === 'tkend') {
      const inc = incomingTracksRef.current[fromId];
      if (inc) {
        const blob = new Blob(inc.chunks, { type: inc.mime || 'audio/webm' });
        delete incomingTracksRef.current[fromId];
        if (blob.size > 0) onTrackReceivedRef.current?.({ blob, name: inc.name, fromId });
      }
    }
  }, []);

  const tryCall = React.useCallback((peer, targetId, stream) => {
    if (!peer || !stream) return;
    // Re-call the peer whenever OUR stream identity changes (e.g. camera
    // turned on mid-session) — keyed by stream id, not just target
    if (callsMadeRef.current.get(targetId) === stream.id) return;
    callsMadeRef.current.set(targetId, stream.id);
    const call = peer.call(targetId, stream, { metadata: { name: userName } });
    if (!call) return;
    call.on('stream', remoteStream => {
      setPeers(p => ({ ...p, [targetId]: { ...(p[targetId] || {}), stream: remoteStream, status: 'joined' } }));
    });
    call.on('error', e => console.warn('[Room] call error:', e));
  }, [userName]);

  // Init peer and data connections
  React.useEffect(() => {
    if (!roomId) return;
    let destroyed = false;
    let retryTimer = null;

    const suffix = Math.random().toString(36).slice(2, 7);
    const myId = isHost ? `ps-${roomId}-host` : `ps-${roomId}-g${suffix}`;
    const hostId = `ps-${roomId}-host`;

    setConnectionStatus('connecting');
    setChatMessages([]);
    setPeers({});
    callsMadeRef.current = new Map();

    // Guest → host connection with retry: the host may not have opened the
    // room yet (or the broker may lag), so keep trying until the channel opens.
    const scheduleRetry = (peer) => {
      if (destroyed || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (!destroyed && peer && !peer.destroyed && !peer.disconnected) connectToHost(peer);
      }, 3000);
    };

    const connectToHost = (peer) => {
      if (destroyed) return;
      const existing = dataConnsRef.current[hostId];
      if (existing && existing.open) return;
      const dc = peer.connect(hostId, { reliable: true, metadata: { name: userName } });
      if (!dc) { scheduleRetry(peer); return; }
      dataConnsRef.current[hostId] = dc;
      dc.on('open', () => {
        if (destroyed) return;
        setConnectionStatus('connected');
        dc.send({ type: 'hello', name: userName });
        setPeers(p => ({ ...p, [hostId]: { ...(p[hostId] || {}), name: 'Host', tint: 'terracotta', status: 'joined' } }));
        if (localStreamRef.current) tryCall(peer, hostId, localStreamRef.current);
      });
      dc.on('data', msg => handleMsg(msg, hostId));
      dc.on('close', () => {
        if (destroyed) return;
        delete dataConnsRef.current[hostId];
        callsMadeRef.current.delete(hostId);
        setConnectionStatus('reconnecting');
        setPeers(p => p[hostId] ? { ...p, [hostId]: { ...p[hostId], status: 'disconnected' } } : p);
        scheduleRetry(peer);
      });
      dc.on('error', e => console.warn('[Room] dc error:', e));
      // Safety net: if the attempt neither opens nor errors, drop it and retry
      setTimeout(() => {
        if (!destroyed && dataConnsRef.current[hostId] === dc && !dc.open) {
          try { dc.close(); } catch (_) {}
          delete dataConnsRef.current[hostId];
          scheduleRetry(peer);
        }
      }, 8000);
    };

    const initPeer = () => {
      if (destroyed) return;
      try {
        const peer = new Peer(myId, {
          config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] },
          debug: 0,
        });
        peerRef.current = peer;

        peer.on('open', () => {
          if (destroyed) return;
          peerReadyRef.current = true;
          console.log('[Room] peer open:', myId);
          if (isHost) {
            // Host room is live once registered with the broker
            setConnectionStatus('connected');
          } else {
            // Guest is only "connected" once the data channel to the host opens
            connectToHost(peer);
          }
        });

        peer.on('connection', conn => {
          if (destroyed) return;
          const guestId = conn.peer;
          dataConnsRef.current[guestId] = conn;
          conn.on('open', () => {
            if (destroyed) return;
            setPeers(p => ({
              ...p,
              [guestId]: { ...(p[guestId] || {}), name: conn.metadata?.name || 'Guest', tint: peerTint(guestId), status: 'joining' },
            }));
            conn.send({ type: 'hello', name: userName });
          });
          conn.on('data', msg => handleMsg(msg, guestId));
          conn.on('close', () => {
            if (!destroyed) setPeers(p => p[guestId] ? { ...p, [guestId]: { ...p[guestId], status: 'disconnected' } } : p);
            delete dataConnsRef.current[guestId];
          });
        });

        peer.on('call', call => {
          if (destroyed) return;
          const stream = localStreamRef.current;
          if (stream) call.answer(stream); else call.answer();
          const guestId = call.peer;
          call.on('stream', remoteStream => {
            if (!destroyed) {
              setPeers(p => ({
                ...p,
                [guestId]: {
                  ...(p[guestId] || {}),
                  stream: remoteStream,
                  status: 'joined',
                  name: call.metadata?.name || p[guestId]?.name || 'Guest',
                  tint: p[guestId]?.tint || peerTint(guestId),
                },
              }));
            }
          });
        });

        peer.on('error', err => {
          if (destroyed) return;
          if (err.type === 'peer-unavailable') {
            // Target peer not registered (yet) — for guests this means the host
            // hasn't opened the room; keep waiting and retrying.
            if (!isHost) {
              delete dataConnsRef.current[hostId];
              setConnectionStatus('connecting');
              scheduleRetry(peer);
            }
            return;
          }
          if (err.type === 'unavailable-id') {
            // Stale registration from a reload — recreate once the broker releases it
            try { peer.destroy(); } catch (_) {}
            setConnectionStatus('connecting');
            retryTimer = setTimeout(() => { retryTimer = null; initPeer(); }, 2500);
            return;
          }
          console.error('[Room] error:', err.type);
          setConnectionStatus('error');
        });
        peer.on('disconnected', () => {
          if (!destroyed) {
            setConnectionStatus('reconnecting');
            setTimeout(() => { if (!destroyed && peer.disconnected) peer.reconnect(); }, 2000);
          }
        });
      } catch (e) {
        console.error('[Room] init failed:', e);
        setConnectionStatus('error');
      }
    };

    if (typeof Peer !== 'undefined') {
      initPeer();
    } else {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = initPeer;
      s.onerror = () => { console.error('[Room] PeerJS load failed'); setConnectionStatus('error'); };
      document.head.appendChild(s);
    }

    return () => {
      destroyed = true;
      peerReadyRef.current = false;
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      if (peerRef.current) { try { peerRef.current.destroy(); } catch (_) {} peerRef.current = null; }
      dataConnsRef.current = {};
    };
  }, [roomId, isHost, userName]);

  // Call (or re-call) every reachable peer whenever our stream appears or
  // changes identity — this is how a camera turned on mid-session reaches
  // the other side. `peers` is a dep so the host calls late joiners too.
  React.useEffect(() => {
    if (!localStream || !roomId || !peerReadyRef.current) return;
    const targets = isHost ? Object.keys(dataConnsRef.current) : [`ps-${roomId}-host`];
    targets.forEach(id => tryCall(peerRef.current, id, localStream));
  }, [localStream, roomId, isHost, tryCall, peers]);

  const broadcast = React.useCallback((msg) => {
    Object.values(dataConnsRef.current).forEach(conn => { if (conn.open) conn.send(msg); });
  }, []);

  const sendChat = React.useCallback((text) => {
    const msg = { type: 'chat', name: userName, text };
    broadcast(msg);
    const chatMsg = {
      id: Date.now() + Math.random(),
      from: userName,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      you: true,
    };
    setChatMessages(m => [...m, chatMsg]);
    return chatMsg;
  }, [userName, broadcast]);

  const sendPhase = React.useCallback((phase) => {
    broadcast({ type: 'phase', phase });
  }, [broadcast]);

  const sendMeta = React.useCallback((meta) => {
    broadcast({ type: 'meta', meta });
  }, [broadcast]);

  // Guest → host: stream the full-quality local recording over the data
  // channel in 256KB chunks (PeerJS serializes typed arrays natively)
  const sendTrack = React.useCallback(async (blob, name, onProgress) => {
    const conns = Object.values(dataConnsRef.current).filter(c => c.open);
    if (conns.length === 0 || !blob) return false;
    const conn = conns[0]; // guests only hold the host connection
    const CHUNK = 256 * 1024;
    conn.send({ type: 'tkmeta', name, mime: blob.type, size: blob.size });
    for (let off = 0; off < blob.size; off += CHUNK) {
      const buf = new Uint8Array(await blob.slice(off, off + CHUNK).arrayBuffer());
      conn.send({ type: 'tkchunk', data: buf });
      onProgress?.(Math.min(1, (off + CHUNK) / blob.size));
      // Yield so the channel's send buffer can drain
      await new Promise(r => setTimeout(r, 25));
    }
    conn.send({ type: 'tkend' });
    return true;
  }, []);

  return { peers, connectionStatus, chatMessages, sendChat, sendPhase, sendMeta, sendTrack };
}

window.generateRoomId = generateRoomId;
window.getRoomInviteLink = getRoomInviteLink;
window.parseRoomFromUrl = parseRoomFromUrl;
window.createTrackRecorder = createTrackRecorder;
window.useRoom = useRoom;
