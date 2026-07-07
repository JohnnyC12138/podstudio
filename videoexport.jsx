// Video episode composer — draws recorded videos onto a styled canvas and
// re-encodes to a single WebM. Renders in real time (captureStream), so a
// 10-minute episode takes 10 minutes; a progress bar keeps that honest.

const VIDEO_LAYOUTS = [
  { k: 'side',  name: 'Side by side', desc: 'Two speaker cards on a studio backdrop' },
  { k: 'stack', name: 'Stacked',      desc: 'Vertical cards — good for 9:16 clips reuse' },
  { k: 'focus', name: 'Focus + guest', desc: 'Host large, guest picture-in-picture' },
];

function VideoComposeModal({ videos, episodeTitle, onClose }) {
  const [layout, setLayout] = React.useState('side');
  const [phase, setPhase] = React.useState('pick'); // pick | rendering | done
  const [progress, setProgress] = React.useState(0);
  const [resultUrl, setResultUrl] = React.useState(null);
  const cancelRef = React.useRef(false);
  const canvasRef = React.useRef(null);

  const W = 1280, H = 720;
  const title = episodeTitle || 'Podstudio episode';

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const drawFrame = (ctx, els) => {
    // Studio backdrop: deep green vertical gradient + warm lamp glow
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f1a14');
    bg.addColorStop(1, '#16241c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.8, 80, 10, W * 0.8, 80, 500);
    glow.addColorStop(0, 'rgba(214,178,106,0.16)');
    glow.addColorStop(1, 'rgba(214,178,106,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Title + brand
    ctx.fillStyle = '#e9e2d4';
    ctx.font = '600 34px Georgia, serif';
    ctx.fillText(title.slice(0, 46), 60, 78);
    ctx.fillStyle = 'rgba(214,178,106,0.9)';
    ctx.font = '12px monospace';
    ctx.fillText('RECORDED WITH PODSTUDIO', 60, 104);

    const drawCard = (el, x, y, w, h, name) => {
      ctx.save();
      roundRect(ctx, x, y, w, h, 18);
      ctx.fillStyle = '#0b120e';
      ctx.fill();
      ctx.clip();
      if (el && el.videoWidth > 0) {
        // cover-fit
        const vr = el.videoWidth / el.videoHeight, cr = w / h;
        let dw = w, dh = h, dx = x, dy = y;
        if (vr > cr) { dw = h * vr; dx = x - (dw - w) / 2; } else { dh = w / vr; dy = y - (dh - h) / 2; }
        ctx.drawImage(el, dx, dy, dw, dh);
      }
      ctx.restore();
      roundRect(ctx, x, y, w, h, 18);
      ctx.strokeStyle = 'rgba(214,178,106,0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Name tag
      ctx.fillStyle = 'rgba(10,14,11,0.75)';
      roundRect(ctx, x + 14, y + h - 44, Math.min(w - 28, 24 + name.length * 11), 30, 8);
      ctx.fill();
      ctx.fillStyle = '#e9e2d4';
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText(name.slice(0, 24), x + 26, y + h - 23);
    };

    const a = els[0], b = els[1];
    if (layout === 'side') {
      if (b) {
        drawCard(a.el, 60, 150, 555, 460, a.name);
        drawCard(b.el, 665, 150, 555, 460, b.name);
      } else {
        drawCard(a.el, 240, 140, 800, 500, a.name);
      }
    } else if (layout === 'stack') {
      if (b) {
        drawCard(a.el, 340, 130, 600, 255, a.name);
        drawCard(b.el, 340, 415, 600, 255, b.name);
      } else {
        drawCard(a.el, 240, 140, 800, 500, a.name);
      }
    } else { // focus
      drawCard(a.el, 60, 140, 900, 520, a.name);
      if (b) drawCard(b.el, 990, 460, 240, 180, b.name);
    }
  };

  const render = async () => {
    setPhase('rendering');
    setProgress(0);
    cancelRef.current = false;
    const srcs = videos.slice(0, 2).map(v => {
      const el = document.createElement('video');
      el.src = v.url;
      el.muted = true;
      el.playsInline = true;
      return { el, name: v.name };
    });
    await Promise.all(srcs.map(s => new Promise(res => {
      s.el.onloadedmetadata = res;
      s.el.onerror = res;
    })));
    const totalDur = Math.max(...srcs.map(s => s.el.duration || 0), 0.1);

    const canvas = canvasRef.current;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Mix all videos' audio into the output
    const ac = new window.AudioContext();
    const dest = ac.createMediaStreamDestination();
    srcs.forEach(s => {
      s.el.muted = false;
      s.el.volume = 1;
      const node = ac.createMediaElementSource(s.el);
      node.connect(dest); // to recording only — not to speakers
    });

    const outStream = new MediaStream([
      ...canvas.captureStream(30).getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
    const rec = new MediaRecorder(outStream, { mimeType: mime, videoBitsPerSecond: 2500000 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
    const done = new Promise(res => { rec.onstop = res; });
    rec.start(1000);
    await Promise.all(srcs.map(s => s.el.play().catch(() => {})));

    await new Promise(res => {
      const tick = () => {
        if (cancelRef.current) return res();
        drawFrame(ctx, srcs);
        const t = Math.max(...srcs.map(s => s.el.currentTime));
        setProgress(Math.min(1, t / totalDur));
        if (srcs.every(s => s.el.ended || s.el.paused && s.el.currentTime >= (s.el.duration - 0.2))) return res();
        requestAnimationFrame(tick);
      };
      tick();
    });

    rec.stop();
    await done;
    srcs.forEach(s => { s.el.pause(); s.el.src = ''; });
    ac.close();
    if (cancelRef.current) { setPhase('pick'); return; }
    const blob = new Blob(chunks, { type: mime });
    setResultUrl(URL.createObjectURL(blob));
    setProgress(1);
    setPhase('done');
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `${title.replace(/[^\w一-鿿-]+/g, '-')}-video.webm`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <>
      <div className="backdrop" style={{ zIndex: 110 }} onClick={phase === 'rendering' ? undefined : onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 560, maxWidth: '94vw', maxHeight: '88vh', overflow: 'auto',
        background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 12,
        boxShadow: '0 40px 80px -20px oklch(0 0 0 / 0.7)', zIndex: 111, padding: 22, textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Create video episode</div>
          <div style={{ flex: 1 }} />
          {phase !== 'rendering' && (
            <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}><I.X size={14} /></button>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginBottom: 16 }}>
          Composes your camera recordings onto a studio backdrop, into one WebM file.
        </div>

        {phase === 'pick' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {VIDEO_LAYOUTS.map(l => (
                <button key={l.k} onClick={() => setLayout(l.k)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, textAlign: 'left',
                  background: layout === l.k ? 'var(--brass-tint)' : 'var(--bg-2)',
                  border: `1px solid ${layout === l.k ? 'oklch(0.78 0.1 82 / 0.4)' : 'var(--line-0)'}`,
                }}>
                  <I.Video size={14} style={{ color: layout === l.k ? 'var(--brass-bright)' : 'var(--fg-3)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{l.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 14, lineHeight: 1.5 }}>
              Rendering happens in real time — a 10-minute episode takes about 10 minutes. Keep this tab open.
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={render}>
              <I.Video size={14} /> Render video
            </button>
          </>
        )}

        {phase === 'rendering' && (
          <>
            <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: 'var(--brass)', transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-1)', marginBottom: 14 }}>
              Rendering… {Math.round(progress * 100)}% — playing your episode through the compositor.
            </div>
            <button className="btn" onClick={() => { cancelRef.current = true; }}>Cancel</button>
          </>
        )}

        {phase === 'done' && (
          <>
            <video src={resultUrl} controls style={{ width: '100%', borderRadius: 8, marginBottom: 14, background: '#000' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={download}><I.Download size={12} /> Save video</button>
              <button className="btn" onClick={() => { setPhase('pick'); setResultUrl(null); }}>Try another layout</button>
            </div>
          </>
        )}

        {/* Compositor canvas: visible while rendering so the user sees the result live */}
        <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 8, marginTop: 14, display: phase === 'rendering' ? 'block' : 'none', background: '#000' }} />
      </div>
    </>
  );
}

window.VIDEO_LAYOUTS = VIDEO_LAYOUTS;
window.VideoComposeModal = VideoComposeModal;
