// Icons — refined, simpler strokes
const Icon = ({ d, size = 16, stroke = 'currentColor', fill = 'none', strokeWidth = 1.6, children, viewBox = '0 0 24 24' }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  Logo: ({ size = 22 }) => (
    // Warm studio mark — circle with radiating lines
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.9" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Home: (p) => <Icon {...p} d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V11z" />,
  Mic: (p) => <Icon {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8" /></Icon>,
  MicOff: (p) => <Icon {...p}><path d="M9 9v-4a3 3 0 016 0v7M15 9v1M9 12a3 3 0 003 3M5 11a7 7 0 007 7M12 18v4M2 2l20 20" /></Icon>,
  Edit: (p) => <Icon {...p}><path d="M3 10h3v10H3zM9 6h3v14H9zM15 14h3v6h-3z" /><path d="M21 10h-3" /></Icon>,
  Library: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></Icon>,
  Team: (p) => <Icon {...p}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2.2 1.8-4 4-4s2 0.9 2 2" /></Icon>,
  Settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></Icon>,
  Play: (p) => <Icon {...p} fill="currentColor" stroke="none"><path d="M7 4l13 8-13 8z" /></Icon>,
  Pause: (p) => <Icon {...p}><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /></Icon>,
  Stop: (p) => <Icon {...p} fill="currentColor" stroke="none"><rect x="5" y="5" width="14" height="14" rx="2" /></Icon>,
  Video: (p) => <Icon {...p}><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M22 8l-6 4 6 4z" /></Icon>,
  VideoOff: (p) => <Icon {...p}><path d="M2 2l20 20M16 16v2a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2M22 8l-6 4 6 4V8z" /></Icon>,
  Share: (p) => <Icon {...p}><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" /></Icon>,
  Link: (p) => <Icon {...p}><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></Icon>,
  Copy: (p) => <Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></Icon>,
  Check: (p) => <Icon {...p} d="M4 12l5 5L20 6" />,
  Plus: (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  X: (p) => <Icon {...p} d="M6 6l12 12M18 6L6 18" />,
  Music: (p) => <Icon {...p}><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /><path d="M9 18V5l12-2v13" /></Icon>,
  Sparkle: (p) => <Icon {...p}><path d="M12 3v4M12 17v4M5 12H1M23 12h-4M18 6l-2 2M8 16l-2 2M18 18l-2-2M8 8L6 6" /></Icon>,
  Wand: (p) => <Icon {...p}><path d="M3 21l12-12M14 6l4 4M11 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.8 1.6L21.4 14l-1.6.4L19 16l-.8-1.6L16.6 14l1.6-.4z" /></Icon>,
  FileText: (p) => <Icon {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" /></Icon>,
  Scissors: (p) => <Icon {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" /></Icon>,
  Download: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></Icon>,
  ChevronDown: (p) => <Icon {...p} d="M6 9l6 6 6-6" />,
  ChevronRight: (p) => <Icon {...p} d="M9 6l6 6-6 6" />,
  ChevronLeft: (p) => <Icon {...p} d="M15 18l-6-6 6-6" />,
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></Icon>,
  Clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon>,
  Flag: (p) => <Icon {...p}><path d="M4 21V4a1 1 0 011-1h14l-3 5 3 5H5" /></Icon>,
  Volume: (p) => <Icon {...p}><path d="M11 5L6 9H2v6h4l5 4V5zM15 9a3 3 0 010 6" /></Icon>,
  Headphones: (p) => <Icon {...p}><path d="M3 14v4a2 2 0 002 2h2v-8H5a2 2 0 00-2 2zM21 14v4a2 2 0 01-2 2h-2v-8h2a2 2 0 012 2zM3 14a9 9 0 0118 0" /></Icon>,
  User: (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></Icon>,
  Users: (p) => <Icon {...p}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2" /><path d="M3 20c0-3 2.5-6 6-6s6 3 6 6M15 20c0-2 1.5-4 4-4s2 1 2 2" /></Icon>,
  Folder: (p) => <Icon {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></Icon>,
  MoreH: (p) => <Icon {...p}><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></Icon>,
  Heart: (p) => <Icon {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></Icon>,
  Smile: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></Icon>,
  Bell: (p) => <Icon {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21a2 2 0 004 0" /></Icon>,
  Info: (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></Icon>,
  Cloud: (p) => <Icon {...p}><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" /></Icon>,
  Zap: (p) => <Icon {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  Sun: (p) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></Icon>,
  Moon: (p) => <Icon {...p} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
  Coffee: (p) => <Icon {...p}><path d="M17 8h1a4 4 0 010 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 2v3M10 2v3M14 2v3" /></Icon>,
  Waveform: (p) => <Icon {...p}><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2" /></Icon>,
  // Warm illustrated-style marks
  SoloMark: ({ size = 56 }) => (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="26" fill="oklch(0.88 0.06 45)" />
      <rect x="23" y="14" width="10" height="18" rx="5" fill="oklch(0.62 0.14 40)" />
      <path d="M18 26a10 10 0 0020 0M28 36v4M22 40h12" stroke="oklch(0.35 0.1 40)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  GuestsMark: ({ size = 56 }) => (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="26" fill="oklch(0.86 0.06 115)" />
      <circle cx="20" cy="24" r="5" fill="oklch(0.55 0.08 115)" />
      <circle cx="36" cy="22" r="5" fill="oklch(0.55 0.08 115)" />
      <path d="M12 42c2-5 6-8 10-8s6 2 8 4M28 38c2-3 6-5 10-5s6 2 8 4" stroke="oklch(0.32 0.08 115)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
};

window.I = I;
