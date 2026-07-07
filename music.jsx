// Background music engine — beds are synthesized on-device with Web Audio
// (no licensed assets), previewable, and mixed under the voices at export.

const MUSIC_BEDS = [
  { kind: 'warm-glow',    name: 'Warm Glow',    desc: 'slow brass-warm pad · conversational', color: 'amber',  loopSec: 16 },
  { kind: 'night-drift',  name: 'Night Drift',  desc: 'low drone & air · late-night calm',    color: 'teal',   loopSec: 16 },
  { kind: 'paper-lights', name: 'Paper Lights', desc: 'soft plucked arpeggio · light energy',  color: 'green',  loopSec: 12 },
];

const _bedCache = {};

async function generateBed(kind) {
  if (_bedCache[kind]) return _bedCache[kind];
  const bed = MUSIC_BEDS.find(b => b.kind === kind) || MUSIC_BEDS[0];
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, sr * bed.loopSec, sr);
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  const note = (freq, t0, dur, { type = 'sine', gain = 0.2, detune = 0 } = {}) => {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    const g = ctx.createGain();
    const atk = Math.min(dur * 0.4, 1.2);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + atk);
    g.gain.setValueAtTime(gain, t0 + dur - Math.min(dur * 0.4, 1.5));
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur);
  };
  const pluck = (freq, t0, gain = 0.25) => {
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + 1.5);
  };

  if (kind === 'warm-glow') {
    // Fmaj7 → Am7 → Dm7 → Bbmaj7, 4s each
    const chords = [
      [174.61, 220.0, 261.63, 329.63],
      [220.0, 261.63, 329.63, 392.0],
      [146.83, 174.61, 220.0, 261.63],
      [116.54, 174.61, 233.08, 293.66],
    ];
    chords.forEach((ch, i) => ch.forEach((f, j) => {
      note(f, i * 4, 4.6, { type: j === 0 ? 'triangle' : 'sine', gain: j === 0 ? 0.16 : 0.09, detune: j * 3 });
      note(f, i * 4, 4.6, { type: 'sine', gain: 0.05, detune: -4 });
    }));
  } else if (kind === 'night-drift') {
    // Low drone + slow airy fifth
    note(55, 0, 16.5, { type: 'sine', gain: 0.28 });
    note(82.41, 0, 16.5, { type: 'sine', gain: 0.12, detune: 2 });
    note(220, 2, 6, { type: 'sine', gain: 0.05 });
    note(164.81, 8, 7, { type: 'sine', gain: 0.05 });
    // filtered noise "air"
    const nbuf = ctx.createBuffer(1, sr * 16, sr);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.3;
    const nsrc = ctx.createBufferSource(); nsrc.buffer = nbuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    nsrc.connect(bp); bp.connect(ng); ng.connect(master);
    nsrc.start(0);
  } else {
    // paper-lights: pentatonic plucked arpeggio over 12s
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const seq = [0, 2, 4, 3, 5, 2, 1, 3, 0, 4, 2, 5, 3, 1, 4, 2];
    seq.forEach((s, i) => pluck(scale[s], i * 0.75 + 0.05, 0.16));
    note(130.81, 0, 12.5, { type: 'sine', gain: 0.1 });
    note(196.0, 0, 12.5, { type: 'sine', gain: 0.06, detune: 3 });
  }

  const buf = await ctx.startRendering();
  _bedCache[kind] = buf;
  return buf;
}

// ── Preview playback (shared context, looped) ─────────────────
let _previewCtx = null, _previewSrc = null;

async function previewBed(kind) {
  stopBedPreview();
  const buf = await generateBed(kind);
  if (!_previewCtx) _previewCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_previewCtx.state === 'suspended') await _previewCtx.resume();
  const src = _previewCtx.createBufferSource();
  src.buffer = buf; src.loop = true;
  src.connect(_previewCtx.destination);
  src.start();
  _previewSrc = src;
}

function stopBedPreview() {
  if (_previewSrc) { try { _previewSrc.stop(); } catch (_) {} _previewSrc = null; }
}

// ── Auto-match: quick on-device analysis of the recording ─────
async function autoMatchBed(blob) {
  try {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const buf = await new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(await blob.arrayBuffer());
    const data = buf.getChannelData(0);
    let sum = 0, peaks = 0;
    const step = Math.max(1, Math.floor(data.length / 200000));
    for (let i = 0; i < data.length; i += step) { const v = Math.abs(data[i]); sum += v; if (v > 0.35) peaks++; }
    const avg = sum / (data.length / step);
    const energy = avg * 10 + peaks / (data.length / step) * 40;
    // lively speech → brighter bed; calm speech → drone; middle → warm pad
    return energy > 1.1 ? 'paper-lights' : energy < 0.45 ? 'night-drift' : 'warm-glow';
  } catch (_) {
    return 'warm-glow';
  }
}

// ── Export: mix voice tracks + looped bed (with ducking) to WAV ─
async function renderMixToWav(trackBlobs, bedKind, bedGain = 0.18) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const dctx = new AC();
  const voiceBufs = [];
  for (const blob of trackBlobs) {
    try { voiceBufs.push(await dctx.decodeAudioData(await blob.arrayBuffer())); } catch (_) {}
  }
  dctx.close();
  if (voiceBufs.length === 0) return null;

  const sr = 44100;
  const lenSec = Math.max(...voiceBufs.map(b => b.duration));
  const total = Math.ceil(lenSec * sr);
  const out = [new Float32Array(total), new Float32Array(total)];

  // Sum voices
  for (const b of voiceBufs) {
    const ratio = b.sampleRate / sr;
    for (let ch = 0; ch < 2; ch++) {
      const src = b.getChannelData(Math.min(ch, b.numberOfChannels - 1));
      const n = Math.min(total, Math.floor(src.length / ratio));
      for (let i = 0; i < n; i++) out[ch][i] += src[Math.floor(i * ratio)];
    }
  }

  // Bed loop with ducking: bed drops to 35% while someone is speaking
  if (bedKind) {
    const bed = await generateBed(bedKind);
    const bl = bed.length;
    const win = 4410; // 100ms envelope windows
    for (let w = 0; w < total; w += win) {
      let rms = 0;
      const end = Math.min(w + win, total);
      for (let i = w; i < end; i += 8) rms += out[0][i] * out[0][i];
      rms = Math.sqrt(rms / ((end - w) / 8));
      const duck = rms > 0.03 ? 0.35 : 1;
      const g = bedGain * duck;
      for (let ch = 0; ch < 2; ch++) {
        const bsrc = bed.getChannelData(Math.min(ch, bed.numberOfChannels - 1));
        for (let i = w; i < end; i++) out[ch][i] += bsrc[i % bl] * g;
      }
    }
  }

  // Soft clip + 16-bit WAV encode
  const dataLen = total * 2 * 2;
  const wav = new DataView(new ArrayBuffer(44 + dataLen));
  const wstr = (off, s) => { for (let i = 0; i < s.length; i++) wav.setUint8(off + i, s.charCodeAt(i)); };
  wstr(0, 'RIFF'); wav.setUint32(4, 36 + dataLen, true); wstr(8, 'WAVE');
  wstr(12, 'fmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 2, true);
  wav.setUint32(24, sr, true); wav.setUint32(28, sr * 4, true); wav.setUint16(32, 4, true); wav.setUint16(34, 16, true);
  wstr(36, 'data'); wav.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < total; i++) {
    for (let ch = 0; ch < 2; ch++) {
      let v = Math.tanh(out[ch][i]); // gentle limiter
      wav.setInt16(off, Math.max(-32768, Math.min(32767, v * 32767)), true);
      off += 2;
    }
  }
  return new Blob([wav.buffer], { type: 'audio/wav' });
}

Object.assign(window, { MUSIC_BEDS, generateBed, previewBed, stopBedPreview, autoMatchBed, renderMixToWav });
