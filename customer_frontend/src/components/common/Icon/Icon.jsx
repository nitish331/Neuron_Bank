/**
 * Inline SVG icon set.
 *
 * Icons are components rather than image files so they inherit `currentColor`
 * and stay crisp at any size. Every icon shares the same 24x24 viewBox.
 */

const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function ArrowRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function ShieldIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 6v6c0 4.2 2.8 7.6 7 9 4.2-1.4 7-4.8 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function BoltIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

export function ChartIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 20V10" />
      <path d="M12 20V4" />
      <path d="M19 20v-6" />
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function GlobeIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.4 9.5h17.2" />
      <path d="M3.4 14.5h17.2" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

// Brand marks are solid glyphs, not outlines, so they need their own base.
const solid = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true,
  focusable: false,
};

export function RocketIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.2c3.1 2 5 5.4 5 9.2l-2.6 2.6H9.6L7 12.4c0-3.8 1.9-7.2 5-9.2Z" />
      <circle cx="12" cy="10" r="1.8" />
      <path d="M9.6 15.6 8 20l3-1.4" />
      <path d="M14.4 15.6 16 20l-3-1.4" />
    </svg>
  );
}

export function FacebookIcon(props) {
  return (
    <svg {...solid} {...props}>
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.12V9.9H7.6V13h2.7v8h3.2Z" />
    </svg>
  );
}

export function InstagramIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TwitterIcon(props) {
  return (
    <svg {...solid} {...props}>
      <path d="M21 5.9c-.7.3-1.4.5-2.2.6.8-.5 1.4-1.2 1.7-2.1-.75.44-1.56.76-2.42.93a3.8 3.8 0 0 0-6.5 3.47A10.8 10.8 0 0 1 3.7 4.8a3.8 3.8 0 0 0 1.18 5.08c-.62-.02-1.2-.19-1.72-.47v.05a3.8 3.8 0 0 0 3.05 3.73c-.56.15-1.15.17-1.72.07a3.8 3.8 0 0 0 3.55 2.64A7.63 7.63 0 0 1 3 17.48 10.76 10.76 0 0 0 8.83 19.2c6.99 0 10.81-5.79 10.81-10.81l-.01-.49A7.7 7.7 0 0 0 21 5.9Z" />
    </svg>
  );
}

export function LinkedinIcon(props) {
  return (
    <svg {...solid} {...props}>
      <path d="M6.94 8.5H3.9V21h3.04V8.5ZM5.42 3a1.76 1.76 0 1 0 0 3.53 1.76 1.76 0 0 0 0-3.53ZM21 13.9c0-3.2-1.71-4.7-4-4.7a3.45 3.45 0 0 0-3.13 1.72V8.5H10.9V21h3.04v-6.05c0-1.6.3-3.14 2.28-3.14 1.95 0 1.97 1.82 1.97 3.24V21H21v-7.1Z" />
    </svg>
  );
}

export function CardIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.6" />
      <path d="M2.5 9.6h19" />
      <path d="M6 14.6h3.4" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20c0-3.6 3.2-5.8 7.2-5.8s7.2 2.2 7.2 5.8" />
    </svg>
  );
}

export function MailIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.4" />
      <path d="m3.8 7 7.2 5.2c.6.45 1.4.45 2 0L20.2 7" />
    </svg>
  );
}

export function PhoneIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
      <path d="M10.6 5.4h2.8" />
      <path d="M12 18.2h.01" />
    </svg>
  );
}

export function CalendarIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.4" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <path d="M12 14.6v2.2" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4.5 20 20.5" />
      <path d="M9.9 6.1A9.6 9.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.4 4" />
      <path d="M6.4 8A17.3 17.3 0 0 0 2.5 12S6 18.2 12 18.2a9.9 9.9 0 0 0 3.6-.66" />
      <path d="M10 10.2a3 3 0 0 0 4.1 4.2" />
    </svg>
  );
}
