# Podstudio — Project Handoff

_Last updated: April 2026_

**Live site: https://johnnyc12138.github.io/podstudio/** (GitHub Pages, deploys automatically from `main`)

---

## 1. What Is Podstudio

Podstudio is a **browser-based podcast recording studio**. The core product vision is a beautiful, opinionated tool for recording high-quality podcast conversations — solo or with remote guests — and editing the result into a finished episode, all without installing anything.

### Design philosophy
- **Editorial aesthetic** — deep forest green backgrounds, aged brass accent, warm linen text. Feels like a late-night broadcast booth, not a SaaS dashboard.
- **Immersive studio** — the recording screen is a full theatrical space: a 3D scene, a sculptural microphone, cinematic lighting. Recording should feel like an event, not a chore.
- **Local-first recording** — audio is captured and stored in the user's browser. No upload during recording; no server dependency for the actual audio data.
- **No install, no account for guests** — a guest joins via a URL. Their browser records their audio locally. Tracks are collected at wrap.

### Pages / phases
```
Home (landing) → Onboarding → Studio (Green Room → Sound Check → Countdown → Recording → Wrap) → Editor → Export
```

---

## 2. File Structure

```
Podstudio/
├── Podstudio.html   — Entry point. Loads all scripts in order.
├── styles.css       — Full design system (tokens, components, animations)
├── icons.jsx        — All SVG icons as React components (the `I` object)
├── shared.jsx       — Reusable UI components shared across pages
├── sidebar.jsx      — Left nav (Home / Studio / Editor links + user footer)
├── landing.jsx      — Home page (hero, recent episodes, stats)
├── onboarding.jsx   — Mode picker: Solo vs With Guests
├── room.jsx         — WebRTC room management (PeerJS, multi-track recording utilities)
├── studio.jsx       — Recording Studio + Green Room + Wrap screen
├── editor.jsx       — Post-recording editor (timeline, AI panel, transport)
├── modals.jsx       — InviteModal, MusicModal, ExportModal
└── app.jsx          — App shell, routing, global state
```

The folder is now a Git repository (`.git/` initialized locally) so changes can be tracked going forward.

### Script load order (Podstudio.html)
```
icons → shared → sidebar → landing → onboarding → room → studio → editor → modals → app
```
Each file exposes its components to the global scope (`window.ComponentName = ComponentName`). Babel standalone transpiles JSX in the browser — no build step required.

---

### File-by-file breakdown

#### `styles.css`
Complete design system. Key tokens:
- `--bg-0` through `--bg-inset` — layered dark forest backgrounds
- `--brass`, `--brass-bright`, `--brass-tint` — the single primary accent (aged brass / gold)
- `--fg-0` through `--fg-4` — warm linen text scale
- `--rec` — recording red
- `--sage` — secondary green accent (used for "live" / "connected" indicators)
- Legacy aliases: `--terracotta`, `--teal`, `--amber`, `--olive` all map to brass variants for backward compat
- CSS classes: `.btn`, `.btn-primary`, `.btn-rec`, `.btn-ghost`, `.chip`, `.card`, `.kbd`, `.mono`, `.caps`, `.display`, `.serif-it`, `.nav-item`
- Animations: `fade-in`, `pulse-rec`, `grain` (paper texture via SVG filter on `body[data-grain=true]`)

#### `icons.jsx`
All icons as inline SVG React components under the `I` namespace:
`I.Logo`, `I.Home`, `I.Mic`, `I.MicOff`, `I.Edit`, `I.Play`, `I.Pause`, `I.Stop`, `I.Volume`, `I.Music`, `I.Scissors`, `I.Wand`, `I.Sparkle`, `I.Download`, `I.Share`, `I.Link`, `I.Copy`, `I.Check`, `I.Plus`, `I.X`, `I.Search`, `I.Clock`, `I.Settings`, `I.ChevronLeft`, `I.ChevronRight`, `I.Zap`, `I.FileText`, `I.Video`, `I.VideoOff`, `I.Team`, `I.Library`, `I.SoloMark`

#### `shared.jsx`
Reusable components used across pages:
- `LiveWaveform` — animated sine-wave bars (canvas, `requestAnimationFrame`). Used in Wrap screen and fallback states. Takes `active`, `color`, `height`, `barCount`.
- `StaticWaveform` — seeded pseudo-random bars (deterministic, no animation). Used in editor track clips and music library. Takes `seed`, `density`, `color`, `variant` (`voice` / `music` / `noise`).
- `Avatar` — initials circle with tint color
- `AnimatedLevel` — horizontal segmented level meter, used in studio rails
- `MicSculpture` — the large 3D-ish microphone hero in the studio center stage. Takes `size`, `active`, `level`, `popFilter`, `onDesk`.
- `Scene` — full-bleed background scene switcher (`lateNight`, `rooftop`, `whiteRoom`, `vintage`, `terrace`). CSS/SVG illustrations.
- `LateNightBooth` — detailed SVG of the late-night studio scene
- `PullCord` — the hanging vintage light-pull cord (scene switcher UI). Animated on click.
- `PullCordSpec` — the scene selector rail inside the left aside
- `OnAirSign` — glowing "ON AIR" indicator
- `Countdown` — 3-2-1 countdown overlay before recording starts. Calls `onDone` when complete.
- `CoachTip` — floating contextual tip shown once during first recording
- `fmtTime(seconds)` — `MM:SS` formatter used everywhere

#### `sidebar.jsx`
Persistent left navigation. Shows: logo, Home/Studio/Editor nav, library items (Episodes, Music, Team — UI only), storage bar, user footer. Highlights active page.

#### `landing.jsx`
Home page. Shows hero CTA ("Start recording"), recent episode cards, a live stats row, a featured episode waveform. The "Invite guest" button in the top bar opens the InviteModal. Mostly static/demo content.

#### `onboarding.jsx`
Two-card mode picker: **Solo** or **With Guests**. Sets `studioMode` in App state and navigates to Studio. Accessed from landing "New episode" CTA.

#### `room.jsx`  _(new — WebRTC layer)_
All real-time collaboration utilities. Exposes to `window`:

| Export | Description |
|--------|-------------|
| `generateRoomId()` | Returns a random 6-char uppercase room code |
| `getRoomInviteLink(roomId)` | Builds `currentURL?room=ROOMID` |
| `parseRoomFromUrl()` | Reads `?room=` from `window.location.search` |
| `createTrackRecorder(stream)` | Returns `{ start(), stop() → Promise<Blob\|null> }` — a MediaRecorder wrapper for a single stream |
| `useRoom(options)` | React hook — full PeerJS room lifecycle |

**`useRoom` hook:**
```js
const { peers, connectionStatus, chatMessages, sendChat, sendPhase } = useRoom({
  roomId,       // string — the room code
  isHost,       // bool
  localStream,  // MediaStream | null — audio stream; hook re-runs audio call when this changes
  userName,     // string — display name
  onPhaseChange // callback(phase) — called when host broadcasts a phase change
});
```
- Loads PeerJS 1.5.4 dynamically from unpkg if not already present
- Peer ID scheme: host = `ps-{roomId}-host`, guest = `ps-{roomId}-g{random5}`
- Establishes **data channels** immediately for chat and phase sync (no stream needed)
- Makes/answers **audio calls** when `localStream` becomes available
- `peers` state: `{ [peerId]: { name, tint, status, stream } }`
- `connectionStatus`: `'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'`
- Auto-reconnects on disconnect with 2s delay

**Tint assignment:** deterministic hash of peerId → one of `['olive', 'amber', 'blue', 'forest', 'purple']`

#### `studio.jsx`
The main recording experience. Phases:

```
greenRoom → check → countdown → record → wrap
```

**Key state:**
- `phase` — current phase string
- `localStream` / `streamRef` — the user's mic stream (both state for reactivity + ref for recording)
- `analyserRef` — Web Audio `AnalyserNode` connected to the mic, used by `RealWaveform`
- `mediaRecorderRef` / `chunksRef` — host's MediaRecorder
- `trackRecordersRef` — `{ [peerId]: { rec: TrackRecorder, name, tint } }` for guest tracks
- `elapsedRef` — synced from `elapsed` state, readable inside async callbacks

**Multi-track recording flow:**
1. `startRecording()` — creates `MediaRecorder` for host stream + `createTrackRecorder` for each connected guest `p.stream`
2. `stopRecording()` — calls `mr.requestData()` + `mr.stop()`, simultaneously calls `rec.stop()` on each guest recorder, `Promise.all` waits for all, then calls `finishSession(hostTrack, guestTracks[])`
3. `finishSession()` — calls `onRecordingComplete(tracksArray)` with all tracks, stops mic tracks, calls `goToPhase('wrap')`

**Phase sync:**
- `goToPhase(phase)` — sets local phase AND calls `sendPhase(phase)` if host in a room session
- Guests receive phase via `onPhaseChange` callback in `useRoom` → calls `goToPhase` on their side
- Phases broadcast: `check`, `countdown`, `record`, `wrap`

**`isRoomSession` logic:**
- `true` if the session is guest mode, if guest came via `?room=` URL, OR if host has at least one connected peer
- When `false` (solo host, no peers yet): shows demo guest tiles (Maya Chen, Dominic Hale)
- When `true`: shows real peers from `useRoom`

**Sub-components:**
- `GreenRoom` — waiting room with episode info, chat, invite button, room link display
- `StudioRoomCard` — explicit two-person room surface in Green Room. Shows room code, connection status, host/guest seats, and a waiting guest slot before anyone joins.
- `WrapScreen` — post-recording summary with duration stats and "Go to editor" CTA
- `RealWaveform` — canvas waveform driven by live `AnalyserNode`. Falls back to animated sine wave when no analyser. Uses `ResizeObserver` + `requestAnimationFrame`.
- `GuestSeat` — video-call-style tile for each guest in the center stage area
- `GuestRow` — compact guest row in the right rail
- `ToolbarBtn` — icon + label button for the frosted glass toolbar
- `QualStat` — green dot + label + value, used in Signal panel

#### `editor.jsx`
Post-recording editor. Accepts:
- `tracks` — array of `{ blob, url, name, tint, duration }` (new multi-track format)
- `recording` — legacy single-track object (backward compat; wrapped into `effectiveTracks[0]`)

**Key behaviors:**
- Decodes each track's blob via `AudioContext.decodeAudioData` → normalized amplitude bars → renders as inline waveform in timeline
- First track (host) is wired to an `<audio>` element for playback; play/pause synced with transport button
- Download button downloads all tracks as separate files (`podstudio-host.webm`, `podstudio-guest.webm`, etc.)
- Timeline renders real recorded tracks with decoded waveforms + playhead
- Demo placeholder tracks are shown only when no real recorded tracks exist

**Sub-components:**
- `EditorTimeline` — the multitrack canvas. Props: `playhead`, `setPlayhead`, `selectedClip`, `setSelectedClip`, `totalSeconds`, `recordingTracks[]`
- `AIPanel` — right sidebar with tabs: Transcript (mock), Cleanup tools (toggleable), AI Clips, Notes/Summary

#### `modals.jsx`
Three modal dialogs:
- `InviteModal` — shows real room invite link (`getRoomInviteLink(roomId)`), copies to clipboard via `navigator.clipboard`
- `MusicModal` — music library browser (UI only; tracks are mock data)
- `ExportModal` — export format/quality picker (UI only)

#### `app.jsx`
Root component and global state:
- Parses `?room=` from URL directly via `new URLSearchParams(window.location.search)` (inline, does not depend on room.jsx load order)
- If guest URL detected: `isHost=false`, `page='studio'` (auto-routes to studio)
- If host: `isHost=true`, `page` from localStorage or `'home'`
- `roomId` — guests get it from URL; hosts get a pre-generated random ID (ready for the first invite)
- `tracks` state — array of recorded tracks; passed to EditorPage
- `onRecordingComplete(tracks[])` — called by StudioPage at wrap; sets tracks for editor
- `openInvite()` — switches the host into guest studio mode, navigates to Studio, then opens `InviteModal`; this ensures the Host peer is mounted before a guest opens the link
- Global keyboard shortcuts: `H` home, `R` studio, `E` editor, `Escape` close modal
- Tweaks panel (bottom-right): accent color picker (terracotta/rust/clay/forest/ink), paper texture toggle
- `window.__setPage` — escape hatch for cross-page navigation from child components

---

## 3. What Is Complete

### Recording pipeline (fully working)
- Mic permission request on entering Sound Check
- Live `AnalyserNode` → `RealWaveform` canvas during recording
- `MediaRecorder` with 250ms timeslice chunks; `requestData()` flush before stop
- Blob assembled on stop → `URL.createObjectURL` → passed to Editor
- Editor decodes blob via `AudioContext.decodeAudioData` → real waveform bars in timeline
- Playback via `<audio>` element synced with transport play button
- Download button (all tracks as separate files)

### WebRTC guest connection (implemented, needs real-world testing)
- `room.jsx` — complete PeerJS lifecycle (data channels + audio calls)
- Guest URL routing: `?room=ROOMID` auto-routes to Studio as guest
- Green Room shows real-time chat via data channels
- Phase sync: host's phase changes broadcast to all guests
- Multi-track recording: separate `MediaRecorder` per guest stream
- Invite modal shows real link; Green Room has inline Copy button
- `InviteModal` + Green Room both show the real `?room=` link
- Host-side editor receives separate recorded tracks and can download them individually

### UI / design system (complete)
- All pages rendered: Home, Onboarding, Studio (all phases), Editor, Wrap
- Full CSS design system with tokens
- Scene switcher with pull-cord animation
- Tweaks panel with accent color and grain toggle
- All modals (Invite, Music, Export)
- Responsive layout (narrow viewport handling in studio)

---

## 4. Recent Completions

### WebRTC room flow
- Added `room.jsx` with PeerJS loading, host/guest peer IDs, data channels, chat messages, phase sync, reconnect status, and audio calls.
- Added guest URL routing via `?room=ROOMID`, including automatic Studio routing for guests.
- Invite actions now route the host into Studio guest mode before opening the invite dialog, so the host room is actually live while the link is shared.
- Wired Studio Green Room to real room links, connected peer state, room chat, and host/guest status display.
- Guest-mode hosts now enter the real room state immediately, before guests connect.
- Host Green Room → Sound Check transition now uses `goToPhase('check')`, so guests receive the phase transition.
- Wired Studio recording to capture the host mic track plus a `MediaRecorder` for each connected remote stream.
- Passed the resulting multi-track array into the Editor.

### Editor multi-track integration
- `EditorPage` now accepts `tracks[]` array and `effectiveTracks` memo
- Track waveforms decoded per-track into `trackWaveforms` state object
- `EditorTimeline` updated to accept `recordingTracks[]` and render each as a row
- Track list sidebar shows real recorded tracks when recordings exist
- Download iterates all tracks
- Demo placeholder tracks in the track list and timeline are hidden when real recorded tracks exist

### Project hygiene
- Initialized Git in `/Users/sunxiaomei/Podstudio` so future work can be tracked locally.

### Invite flow fix (April 2026)
- **InviteModal** now has an "Open Green Room →" footer button that calls `onClose()`. Since `openInvite` already sets `page='studio'` before opening the modal, the host is already in Green Room behind it — closing the modal reveals it cleanly.
- **Guest routing** was already working correctly via `?room=ROOMID` URL param parsed inline in `app.jsx`. Guests land in `StudioPage` with `isHost=false` and `phase='greenRoom'`.
- **Studio room surface** now exists in Green Room via `StudioRoomCard`. It makes the shared room visible to both host and guest, including room code, connection state, participant seats, and waiting slot.
- **Participant list normalization** now avoids duplicate Host entries on the guest side and adds explicit "You (Host)" / "You (Guest)" self seats.
- **GreenRoom guest view** now shows a status pill ("In the green room · waiting for host") instead of "Go to sound check" — the host-only button is conditionally rendered with `{isHost && ...}`.
- **Phase sync (mobile-safe)**: guests no longer auto-advance to 'check' or 'record' when the host broadcasts a phase change. Instead, a `pendingPhase` banner appears ("Host started sound check — tap to join") requiring a manual user gesture. This unblocks `getUserMedia` on mobile Safari which requires a tap to grant mic access.

### Room join reliability + public deployment (April 2026)
- **Guest connect retry** (`room.jsx`): guests now retry the data connection to the host every 3s until it opens (previously a single silent attempt — the root cause of "both sides stuck in Green Room"). `peer-unavailable` errors keep status at `connecting` instead of fatal `error`; an 8s safety timeout drops hung attempts and retries.
- **Host reload recovery** (`room.jsx`): `unavailable-id` (stale broker registration after a reload) now destroys and re-creates the peer after 2.5s instead of dying.
- **Guest connected status** (`room.jsx`): guests only show `connected` once the data channel to the host actually opens (previously showed connected as soon as their own peer registered).
- **Mid-recording track pickup** (`studio.jsx`): if a guest's stream arrives after the host already started recording, a `createTrackRecorder` is started for it on the fly — late joiners are recorded.
- **Mic-gated phase sync** (`studio.jsx`): guests defer `check`/`countdown`/`record` broadcasts behind the "tap to join" banner whenever they have no mic stream; accepting always routes through Sound Check so `getUserMedia` runs inside the tap's gesture. `wrap` from the host stops the guest's local recorder so they keep their own track.
- **Deployment**: repo made public, GitHub Pages enabled (branch `main`, root). `index.html` redirects to `Podstudio.html` preserving `?room=` params. HTTPS means mic works on every device — invite links work across networks, no shared WiFi needed.

### De-mocking pass — real product behavior (April 2026)
- **Name gate** (`studio.jsx` GreenRoom): room sessions now require a display name before the room goes live (`useRoom` gets `roomId: null` until named). Names persist in `localStorage('podstudio-name')` and flow into chat, peer lists, and recorded track names.
- **Real episode title** (`studio.jsx` + `room.jsx`): host edits the title inline in the Green Room (styled as the display heading); it broadcasts to guests via a new `meta` data-channel message (`sendMeta`/`onMetaChange`) and re-sends when peers join. Shown in the studio top bar instead of the hardcoded "Ep. 47".
- **Fake content removed from the room flow**: demo guests (Maya Chen etc.), seeded chat messages, "Recording begins at 10:45 AM PT", and fake Planned/Quality stats are gone. The InviteModal's fake email invite and inaccurate details replaced with honest ones.
- **Mobile/guest layout**: sidebar hidden for guests and below 920px; Green Room collapses to a single column with smaller type on narrow screens.
- **Verified in-browser** (preview + simulated host peer): guest name gate → green room join → real names on both sides → title sync → phase-sync banner all confirmed working against the live PeerJS broker.

### Camera + music + de-mocking (July 2026)
- **Remote audio playback fix**: added a hidden `RemoteAudio` layer that attaches every peer stream to an `<audio>` element — Chrome only feeds WebRTC streams into `AnalyserNode`s while an HTMLMediaElement consumes them, so this also fixed "guest level meter never moves on host".
- **Camera support**: opt-in toggle in the Green Room ("Join with camera on/off"); `getUserMedia` requests video at sound-check entry with audio-only fallback. Self-preview tile (mirrored) top-right of the stage; guest tiles render live video via `VideoTile` when the peer has a live video track. Recording stays **audio-only** (recorders receive `new MediaStream(stream.getAudioTracks())`). Camera toggle mutes/unmutes the video track — no mid-call renegotiation.
- **Background music (`music.jsx`)**: three beds synthesized on-device with `OfflineAudioContext` (Warm Glow / Night Drift / Paper Lights) — no licensed assets. Previewable (looped), selectable in the rebuilt `MusicModal`, and **"Auto-match to my episode"** analyzes the recording's energy on-device to pick a bed. `renderMixToWav` mixes all voice tracks + looped bed with 100ms-window ducking (bed drops to 35% under speech), soft-clips, and encodes 16-bit stereo WAV. Wired into the editor toolbar ("Add music" / "Export mix (WAV)") and the rebuilt `ExportModal` (Mixed master WAV or separate stems).
- **De-mocked**: sidebar (real user name, current episode, honest storage note — removed fake episodes/storage bar/"Noa Weiss Pro plan"), export modal (real title/track count, working export), studio (removed dead Ambience panel and Effects button, real dB in the record banner, `myName` on the live chip).

### Current validation status
- Solo recording flow is implemented in-browser.
- WebRTC guest connection is implemented but still needs real-world host/guest testing across two browser sessions/devices.
- Export, transcripts, music playback, and persistence are still mock/UI-only or not yet implemented.

---

## 5. What Still Needs to Be Built

### High priority — core product
| Feature | Where | Notes |
|---------|-------|-------|
| Real background music playback | `MusicModal` + `StudioPage` | Tracks are mock UI. Need `<audio>` element wired to "Add" button; ducking under voice |
| Export / render | `ExportModal` | Currently UI only. Need actual audio encoding (Web Audio API merge + encode, or send blobs to a server) |
| Persistent episode library | `landing.jsx` + backend | Episodes list is hardcoded. Need storage (IndexedDB locally, or a backend) |
| Real transcript | `editor.jsx` AIPanel | Transcript tab is hardcoded. Need Whisper API or similar |

### Medium priority — polish
| Feature | Where | Notes |
|---------|-------|-------|
| Pull cord animation completion | `shared.jsx` `PullCord` | Animation exists but scene transition could be smoother |
| AI cleanup tools | `editor.jsx` AIPanel Cleanup tab | Toggles are UI only. Need actual audio DSP or API |
| AI clip picker | `editor.jsx` AIPanel Clips tab | Mock data. Could use Claude API to identify highlights from transcript |
| Guest waveform in tiles | `studio.jsx` `GuestSeat` | Guest tiles show `AnimatedLevel` (fake). Could create real `AnalyserNode` per remote stream |
| Reconnecting indicator | `studio.jsx` | `connectionStatus === 'reconnecting'` is shown in top bar text but no full-screen overlay |
| Onboarding → Studio flow | `onboarding.jsx` | Currently navigates directly to Studio. Could pass episode title/metadata through |

### Low priority / nice-to-have
| Feature | Notes |
|---------|-------|
| Video recording | Camera capture via `getUserMedia({ video: true })`, render guest video in tiles |
| Captions / SRT export | Use transcript + timestamps |
| Mobile layout | Current layout is desktop-first; needs responsive breakpoints below ~900px |
| Real episode metadata | Episode title, show name, artwork — currently hardcoded as "Ep. 47 · The Attention Economy" |
| Self-hosted PeerJS server | Currently uses public PeerJS broker (can be rate-limited). For production, run `peerjs --port 9000` on a VPS |
| HTTPS for cross-device mic | `getUserMedia` requires HTTPS on non-localhost. Use ngrok or a real domain for cross-device testing |

---

## 6. Architecture Decisions

### No build step
The app runs directly in the browser via Babel standalone (`@babel/standalone`). Each `.jsx` file is fetched and transpiled client-side. This means:
- Zero tooling — open with a static file server and it works
- Each file exposes components to `window` (e.g. `window.StudioPage = StudioPage`)
- Load order matters: `room.jsx` must load before `studio.jsx` and `app.jsx`
- Not suitable for production at scale (no minification, no tree-shaking, slow initial parse)

### PeerJS for WebRTC
PeerJS abstracts ICE negotiation and STUN/TURN. The public PeerJS broker (`0.peerjs.com`) handles signaling. Audio calls carry the raw `MediaStream`; data channels carry JSON messages for chat and phase sync. PeerJS is loaded dynamically at runtime (not in the HTML `<head>`) to avoid blocking if unpkg is slow.

### Local-first audio
`MediaRecorder` records directly to in-browser blobs. No audio leaves the device during recording. The host collects guest blobs only at the end of a session (future: guests could `postMessage` or upload their blobs; currently the architecture records the remote stream as received over WebRTC, which is the mixed/compressed RTP stream — not lossless).

### URL-based room routing
Guest joins by opening `?room=ROOMID`. The URL param is parsed inline in `App` (not via a helper function) to avoid dependency on `room.jsx` load timing. `isHost` / `roomId` are React state initialized once from the URL; they never change during a session.

### Color system
All colors use `oklch()` color space for perceptually uniform mixing. One primary accent (`--brass`). Legacy aliases (`--terracotta`, `--teal`, `--amber`) all point to brass variants so older component code still works. The Tweaks panel lets you remap the accent hue at runtime via CSS custom property override.

### Refs vs state for audio
- `streamRef` — mutable ref (also `localStream` state for reactivity in `useRoom`)
- `analyserRef` — ref only; read each animation frame, never needs to trigger re-render
- `mediaRecorderRef` — ref only; imperative API
- `elapsedRef` — synced copy of `elapsed` state, readable inside `stop` callbacks without stale closure

---

## 7. How to Run Locally

### Requirements
- Python 3 (for the static server) — or any static file server
- Modern browser (Chrome or Safari recommended for `MediaRecorder` + WebRTC)
- Internet connection (for Google Fonts, PeerJS signaling, and Babel CDN on first load)

### Steps

```bash
# 1. Navigate to the project folder
cd /Users/sunxiaomei/Podstudio

# 2. Start the server bound to all interfaces (required for cross-device access)
python3 -m http.server 8080 --bind 0.0.0.0

# 3. Open in browser
# Solo / host:
#   http://localhost:8080/Podstudio.html
#
# From another device on the same WiFi:
#   http://10.0.0.184:8080/Podstudio.html
```

### Cross-device guest testing
1. **Host** opens `http://10.0.0.184:8080/Podstudio.html` (use the IP, not `localhost`)
2. Host navigates to **Studio** → enters Green Room
3. Host clicks **Invite guest** or uses the Copy button in the Green Room
4. The link will be `http://10.0.0.184:8080/Podstudio.html?room=XXXXXX`
5. **Guest** opens that link on their phone/another machine — lands directly in Green Room
6. Both allow mic access, proceed to Sound Check
7. Host clicks **Start** → countdown → both sides record
8. Host clicks **End** → both tracks saved → editor shows multi-track result

### Cross-network testing (different WiFi)
```bash
brew install ngrok
ngrok http 8080
# Use the https://xxxx.ngrok.io URL — HTTPS required for mic on non-localhost
```

### Common issues
| Symptom | Fix |
|---------|-----|
| Blank page | Serving via `file://` — must use a server (`python3 -m http.server`) |
| Mic denied | Browser permissions — click the lock icon in address bar and allow microphone |
| Guest sees home page | Host opened app as `localhost` — the invite link will contain `localhost`, which guests can't reach. Host must use IP address. |
| Phone can't connect | Server binding — restart server with `--bind 0.0.0.0`; phone and computer must be on the same WiFi |
| PeerJS error in console | Public broker rate-limited or down — wait a moment and retry, or self-host PeerJS |
| No sound from guest | WebRTC audio call only fires when both sides have mic streams active (both must reach Sound Check) |
