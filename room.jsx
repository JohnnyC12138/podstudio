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

function useRoom({ roomId, isHost, localStream, userName, onPhaseChange }) {
  const peerRef = React.useRef(null);
  const peerReadyRef = React.useRef(false);
  const dataConnsRef = React.useRef({});
  const localStreamRef = React.useRef(localStream);
  const callsMadeRef = React.useRef(new Set());
  const [peers, setPeers] = React.useState({});
  const [connectionStatus, setConnectionStatus] = React.useState('idle');
  const [chatMessages, setChatMessages] = React.useState([]);
  const onPhaseChangeRef = React.useRef(onPhaseChange);

  React.useEffect(() => { onPhaseChangeRef.current = onPhaseChange; }, [onPhaseChange]);
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
    } else if (msg.type === 'hello') {
      setPeers(p => ({
        ...p,
        [fromId]: { ...(p[fromId] || {}), name: msg.name, status: 'joined', tint: p[fromId]?.tint || peerTint(fromId) },
      }));
    }
  }, []);

  const tryCall = React.useCallback((peer, targetId, stream) => {
    if (!peer || !stream || callsMadeRef.current.has(targetId)) return;
    callsMadeRef.current.add(targetId);
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

    const suffix = Math.random().toString(36).slice(2, 7);
    const myId = isHost ? `ps-${roomId}-host` : `ps-${roomId}-g${suffix}`;

    setConnectionStatus('connecting');
    setChatMessages([]);
    setPeers({});
    callsMadeRef.current = new Set();

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
          setConnectionStatus('connected');
          console.log('[Room] peer open:', myId);

          if (!isHost) {
            const hostId = `ps-${roomId}-host`;
            const dc = peer.connect(hostId, { reliable: true, metadata: { name: userName } });
            dataConnsRef.current[hostId] = dc;
            dc.on('open', () => {
              if (destroyed) return;
              dc.send({ type: 'hello', name: userName });
              setPeers(p => ({ ...p, [hostId]: { ...(p[hostId] || {}), name: 'Host', tint: 'terracotta', status: 'joined' } }));
              if (localStreamRef.current) tryCall(peer, hostId, localStreamRef.current);
            });
            dc.on('data', msg => handleMsg(msg, hostId));
            dc.on('close', () => { if (!destroyed) setConnectionStatus('reconnecting'); });
            dc.on('error', e => console.warn('[Room] dc error:', e));
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
          if (!destroyed) { console.error('[Room] error:', err.type); setConnectionStatus('error'); }
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
      if (peerRef.current) { try { peerRef.current.destroy(); } catch (_) {} peerRef.current = null; }
      dataConnsRef.current = {};
    };
  }, [roomId, isHost, userName]);

  // When localStream becomes available, make the audio call (guest → host)
  React.useEffect(() => {
    if (!localStream || !roomId || isHost || !peerReadyRef.current) return;
    const hostId = `ps-${roomId}-host`;
    tryCall(peerRef.current, hostId, localStream);
  }, [localStream, roomId, isHost, tryCall]);

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

  return { peers, connectionStatus, chatMessages, sendChat, sendPhase };
}

window.generateRoomId = generateRoomId;
window.getRoomInviteLink = getRoomInviteLink;
window.parseRoomFromUrl = parseRoomFromUrl;
window.createTrackRecorder = createTrackRecorder;
window.useRoom = useRoom;
