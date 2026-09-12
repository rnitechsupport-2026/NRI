/* Inline stroke icons — keeps the bundle free of an icon dependency. */
const S = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.9,
  strokeLinecap: 'round', strokeLinejoin: 'round',
};
const Ico = ({ children, viewBox = '0 0 24 24', ...p }) => (
  <svg viewBox={viewBox} {...S} {...p}>{children}</svg>
);

export const Home = (p) => <Ico {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></Ico>;
export const User = (p) => <Ico {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Ico>;
export const Briefcase = (p) => <Ico {...p}><rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" /><path d="M3 12.5h18" /></Ico>;
export const Building = (p) => <Ico {...p}><rect x="5" y="3" width="14" height="18" rx="1.6" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /><path d="M10 21v-3h4v3" /></Ico>;
export const Wrench = (p) => <Ico {...p}><path d="M14.7 6.3a4.5 4.5 0 0 0 5.9 5.9l-8.1 8.1a2.4 2.4 0 0 1-3.4-3.4z" /><path d="M14.7 6.3 17 4a4.5 4.5 0 0 1 3.6 8.2" /></Ico>;
export const MapPin = (p) => <Ico {...p}><path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10.3" r="2.8" /></Ico>;
export const Search = (p) => <Ico {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></Ico>;
export const Bed = (p) => <Ico {...p}><path d="M3 17V6" /><path d="M3 11h13a4 4 0 0 1 4 4v2" /><path d="M3 17h18" /><circle cx="7.5" cy="8.5" r="1.8" /></Ico>;
export const Bath = (p) => <Ico {...p}><path d="M4 11V6.2A2.2 2.2 0 0 1 6.2 4c1 0 1.7.5 2 1.2" /><path d="M3 11h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" /><path d="M7 18.5 6 21M17 18.5l1 2.5" /></Ico>;
export const Ruler = (p) => <Ico {...p}><rect x="2.5" y="8.5" width="19" height="7" rx="1.6" transform="rotate(-45 12 12)" /><path d="M9 8.2 10.4 9.6M11.6 10.8 13 12.2M14.2 13.4l1.4 1.4" /></Ico>;
export const Heart = (p) => <Ico {...p}><path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 0 1 19.4 13z" /></Ico>;
export const Star = (p) => <Ico {...p}><path d="m12 3.6 2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.85z" /></Ico>;
export const Check = (p) => <Ico {...p}><path d="m4.5 12.5 5 5 10-11" /></Ico>;
export const CheckCircle = (p) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.7 2.7L16 9.5" /></Ico>;
export const Shield = (p) => <Ico {...p}><path d="M12 3 5 6v6c0 4.4 3 7.9 7 9 4-1.1 7-4.6 7-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></Ico>;
export const Phone = (p) => <Ico {...p}><path d="M6.2 3.5h3l1.5 4-2 1.3a12 12 0 0 0 5.5 5.5l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7 2 2 0 0 1 6.2 3.5Z" /></Ico>;
export const Mail = (p) => <Ico {...p}><rect x="3" y="5" width="18" height="14" rx="2.2" /><path d="m3.6 6.5 8.4 6 8.4-6" /></Ico>;
export const Lock = (p) => <Ico {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.2" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" /></Ico>;
export const Eye = (p) => <Ico {...p}><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></Ico>;
export const EyeOff = (p) => <Ico {...p}><path d="M10 6.2A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.3 4M6.2 8.2A17 17 0 0 0 2.5 12S6 18 12 18a9.5 9.5 0 0 0 3.6-.7" /><path d="M3 3l18 18" /></Ico>;
export const Menu = (p) => <Ico {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Ico>;
export const X = (p) => <Ico {...p}><path d="M6 6l12 12M18 6 6 18" /></Ico>;
export const ChevronDown = (p) => <Ico {...p}><path d="m6 9.5 6 6 6-6" /></Ico>;
export const ChevronRight = (p) => <Ico {...p}><path d="m9.5 6 6 6-6 6" /></Ico>;
export const ChevronLeft = (p) => <Ico {...p}><path d="m14.5 6-6 6 6 6" /></Ico>;
export const ArrowRight = (p) => <Ico {...p}><path d="M4 12h15" /><path d="m13.5 6.5 6 5.5-6 5.5" /></Ico>;
export const Plus = (p) => <Ico {...p}><path d="M12 5v14M5 12h14" /></Ico>;
export const Grid = (p) => <Ico {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></Ico>;
export const List = (p) => <Ico {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></Ico>;
export const Dashboard = (p) => <Ico {...p}><rect x="3.5" y="3.5" width="7.5" height="9" rx="1.5" /><rect x="13" y="3.5" width="7.5" height="5.5" rx="1.5" /><rect x="13" y="11.5" width="7.5" height="9" rx="1.5" /><rect x="3.5" y="15" width="7.5" height="5.5" rx="1.5" /></Ico>;
export const Inbox = (p) => <Ico {...p}><path d="M3.5 13.5h4l1.5 3h6l1.5-3h4" /><path d="M5.6 4.5h12.8l2.1 9v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-5z" /></Ico>;
export const Logout = (p) => <Ico {...p}><path d="M9.5 4.5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3.5" /><path d="M15 8.5 19 12l-4 3.5M19 12H9" /></Ico>;
export const Settings = (p) => <Ico {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z" /></Ico>;
export const Trash = (p) => <Ico {...p}><path d="M4 7h16" /><path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" /><path d="M6 7v12.2A1.8 1.8 0 0 0 7.8 21h8.4a1.8 1.8 0 0 0 1.8-1.8V7" /><path d="M10 11.5v5.5M14 11.5v5.5" /></Ico>;
export const Edit = (p) => <Ico {...p}><path d="M4 20h4L19 9a2.6 2.6 0 0 0-3.7-3.7L4 16z" /><path d="m14.5 6.5 3 3" /></Ico>;
export const Camera = (p) => <Ico {...p}><path d="M3 8.5h3.5L8 6h8l1.5 2.5H21v11H3z" /><circle cx="12" cy="13.5" r="3.4" /></Ico>;
export const Upload = (p) => <Ico {...p}><path d="M12 16V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" /></Ico>;
export const Cube = (p) => <Ico {...p}><path d="M12 3 3.8 7.5v9L12 21l8.2-4.5v-9z" /><path d="m3.8 7.5 8.2 4.5 8.2-4.5M12 12v9" /></Ico>;
export const Play = (p) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M10 8.5 16 12l-6 3.5z" /></Ico>;
export const Expand = (p) => <Ico {...p}><path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" /></Ico>;
export const Layers = (p) => <Ico {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3.5 12.5 8.5 4.7 8.5-4.7" /><path d="m3.5 16.8 8.5 4.7 8.5-4.7" /></Ico>;
export const Calendar = (p) => <Ico {...p}><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Ico>;
export const Trending = (p) => <Ico {...p}><path d="m3.5 15.5 5-5 3.5 3.5 6-6.5" /><path d="M14.5 7.5h4v4" /></Ico>;
export const Chart = (p) => <Ico {...p}><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7.5" y="11" width="3" height="6" rx="1" /><rect x="13" y="7" width="3" height="10" rx="1" /></Ico>;
export const Award = (p) => <Ico {...p}><circle cx="12" cy="9" r="5.5" /><path d="m8.5 13.8-1 6.7 4.5-2.4 4.5 2.4-1-6.7" /></Ico>;
export const Handshake = (p) => <Ico {...p}><path d="m11 17-2.5-2.5" /><path d="M3 9.5 7 6l4 2 2-1 4 2 4-1.5" /><path d="M7 6v7.5l4.5 4.5 2-2 2 2 3-3V8.5" /></Ico>;
export const Key = (p) => <Ico {...p}><circle cx="8" cy="16" r="4" /><path d="m11 13 8-8 2 2-1.5 1.5L21 10l-2 2-1.5-1.5L16 12" /></Ico>;
export const Document = (p) => <Ico {...p}><path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" /><path d="M13.5 3v5.5H19" /><path d="M9 13h6M9 16.5h4" /></Ico>;
export const Whatsapp = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M17.5 14.4c-.3-.2-1.8-.9-2-1s-.5-.2-.7.1-.8 1-1 1.2-.4.2-.7 0a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.5 3.5 0 0 0-1.1 2.6A6.1 6.1 0 0 0 6.9 12a13.9 13.9 0 0 0 5.3 4.7c.7.3 1.3.5 1.8.6a4.3 4.3 0 0 0 2-.1 3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5zM12 21.8a9.7 9.7 0 0 1-5-1.4l-3.5 1 1-3.4A9.8 9.8 0 1 1 12 21.8zM12 0a12 12 0 0 0-10.3 18.1L0 24l6-1.6A12 12 0 1 0 12 0z" />
  </svg>
);
export const Facebook = (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.5V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" /></svg>);
export const Instagram = (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2 0 1.8.2 2.2.4.6.2 1 .5 1.4.9s.7.8.9 1.4c.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4s-.8.7-1.4.9c-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9s-.7-.8-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4s.8-.7 1.4-.9c.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.8-.1zm0 3.4A6.4 6.4 0 1 0 18.4 12 6.4 6.4 0 0 0 12 5.6zm0 10.5A4.1 4.1 0 1 1 16.1 12 4.1 4.1 0 0 1 12 16.1zm6.6-10.8a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5z" /></svg>);
export const Linkedin = (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9.5 9h3.8v1.7h.05a4.2 4.2 0 0 1 3.75-2c4 0 4.75 2.6 4.75 6V21h-4v-5.3c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21h-4z" /></svg>);
export const Youtube = (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M23 12s0-3.6-.5-5.3a2.7 2.7 0 0 0-1.9-1.9C18.9 4.3 12 4.3 12 4.3s-6.9 0-8.6.5a2.7 2.7 0 0 0-1.9 1.9C1 8.4 1 12 1 12s0 3.6.5 5.3a2.7 2.7 0 0 0 1.9 1.9c1.7.5 8.6.5 8.6.5s6.9 0 8.6-.5a2.7 2.7 0 0 0 1.9-1.9C23 15.6 23 12 23 12zM9.8 15.3V8.7l5.7 3.3z" /></svg>);
export const Info = (p) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8h.01" /></Ico>;
export const Alert = (p) => <Ico {...p}><path d="M10.3 3.9 2.4 17.4A1.9 1.9 0 0 0 4 20.3h16a1.9 1.9 0 0 0 1.6-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" /><path d="M12 9.5v4M12 17h.01" /></Ico>;
export const Filter = (p) => <Ico {...p}><path d="M3.5 5.5h17l-6.5 7.5V19l-4 2v-8z" /></Ico>;
export const Compass = (p) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-1.8 5.2-5.2 1.8 1.8-5.2z" /></Ico>;
export const Sofa = (p) => <Ico {...p}><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M2.5 12.5a2 2 0 0 1 4 0V16h11v-3.5a2 2 0 0 1 4 0V19h-19z" /></Ico>;
export const Stairs = (p) => <Ico {...p}><path d="M4 20h4v-4h4v-4h4V8h4" /></Ico>;
export const Clock = (p) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5.3l3.3 2" /></Ico>;
export const Users = (p) => <Ico {...p}><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5a6 6 0 0 1 12 0" /><path d="M16.5 5.6a3.2 3.2 0 0 1 0 5.9M17.5 14.2a6 6 0 0 1 3.5 5.3" /></Ico>;
export const Sparkle = (p) => <Ico {...p}><path d="M12 3.2 13.9 9l5.8 1.9-5.8 1.9L12 18.6 10.1 12.8 4.3 10.9 10.1 9z" /><path d="M18.5 4v3M20 5.5h-3" /></Ico>;
export const Send = (p) => <Ico {...p}><path d="M20.5 3.5 10.8 13.2" /><path d="M20.5 3.5 14.3 20.6l-3.5-7.4-7.4-3.5z" /></Ico>;
export const Refresh = (p) => <Ico {...p}><path d="M20 11.5a8 8 0 1 1-2.4-5.7" /><path d="M20.3 4v4.4h-4.4" /></Ico>;
export const Bell = (p) => <Ico {...p}><path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.2 7.5-2.2 7.5h16.4S18 14.5 18 8.5" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></Ico>;

/* ---- amenity icons ---- */
export const Elevator = (p) => <Ico {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="m9.5 10.5 2.5-2.5 2.5 2.5" /><path d="m9.5 13.5 2.5 2.5 2.5-2.5" /></Ico>;
export const Bolt = (p) => <Ico {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></Ico>;
export const Car = (p) => <Ico {...p}><path d="M4 16V11.5l2-5.2A2 2 0 0 1 7.8 5h8.4a2 2 0 0 1 1.8 1.3l2 5.2V16" /><path d="M3.5 16h17v2.3a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1V17H7v1.3a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" /><circle cx="7.5" cy="13" r="1.1" /><circle cx="16.5" cy="13" r="1.1" /></Ico>;
export const Dumbbell = (p) => <Ico {...p}><path d="M6.5 9v6M4 10.2v3.6M17.5 9v6M20 10.2v3.6M8.5 12h7" /></Ico>;
export const Waves = (p) => <Ico {...p}><path d="M2 9c1.5 1.6 3 1.6 4.5 0s3-1.6 4.5 0 3 1.6 4.5 0 3-1.6 4.5 0" /><path d="M2 15c1.5 1.6 3 1.6 4.5 0s3-1.6 4.5 0 3 1.6 4.5 0 3-1.6 4.5 0" /></Ico>;
export const Ball = (p) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.7 5.7c2.8 3 2.8 9.6 0 12.6M18.3 5.7c-2.8 3-2.8 9.6 0 12.6" /></Ico>;
export const Tree = (p) => <Ico {...p}><path d="M12 3 7.5 10h2.7l-3.7 6h4V21h3v-5h4l-3.7-6h2.7z" /></Ico>;
export const Flame = (p) => <Ico {...p}><path d="M12 3c1 3-3 4.2-3 7.6a3 3 0 0 0 6 0c0-1-1-1.6-1-2.8 1.8 1 3 3 3 5.2a5 5 0 0 1-10 0c0-4.2 3.2-6.2 5-10Z" /></Ico>;
export const Droplet = (p) => <Ico {...p}><path d="M12 3s7 7.6 7 12a7 7 0 0 1-14 0c0-4.4 7-12 7-12Z" /></Ico>;
export const FireSafety = (p) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8c.6 1.6-1.6 2-1.6 3.6a1.6 1.6 0 0 0 3.2 0c0-.6-.5-.8-.5-1.6 1 .5 1.6 1.6 1.6 2.6a2.7 2.7 0 0 1-5.4 0c0-2.2 1.6-3.2 2.7-4.6Z" /></Ico>;
export const Wifi = (p) => <Ico {...p}><path d="M4 8.5a12 12 0 0 1 16 0" /><path d="M7 12a8 8 0 0 1 10 0" /><path d="M10 15.5a4 4 0 0 1 4 0" /><path d="M12 19h.01" /></Ico>;
export const Run = (p) => <Ico {...p}><circle cx="14.3" cy="4.7" r="1.6" /><path d="M9 20.5 11 16l2-2-1-4 3 1 2 3.5 3 1" /><path d="M11.5 13.5 8 15.5l-1.7 4.5" /></Ico>;
export const Dice = (p) => <Ico {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /></Ico>;
