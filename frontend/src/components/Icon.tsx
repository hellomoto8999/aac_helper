import type { ReactNode } from "react";

export type IconName =
  | "undo"
  | "redo"
  | "list"
  | "listOrdered"
  | "quote"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "image"
  | "link"
  | "grid"
  | "highlighter"
  | "textbox"
  | "frame"
  | "wrap"
  | "textAround"
  | "volume"
  | "minus"
  | "plus"
  | "reset"
  | "fit"
  | "printer"
  | "chevronDown"
  | "chevronUp"
  | "sun"
  | "moon"
  | "save"
  | "newDoc"
  | "download"
  | "upload"
  | "trash"
  | "close";

const PATHS: Record<IconName, ReactNode> = {
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
  redo: (
    <>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h3" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="18" r="1" />
    </>
  ),
  listOrdered: (
    <>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M4 5h1v3M3.6 8h2" />
      <path d="M3.6 11.5c.3-.6 1.6-.8 1.8 0 .2.9-1.2 1.4-1.8 2.5h2" />
      <path d="M3.6 17h1.6a1 1 0 0 1 0 2H4.4a1 1 0 0 0 0 2h0" />
    </>
  ),
  quote: (
    <>
      <path d="M6 7h4v4H7a3 3 0 0 0 3 3" />
      <path d="M14 7h4v4h-3a3 3 0 0 0 3 3" />
    </>
  ),
  alignLeft: <path d="M4 6h16M4 12h10M4 18h14" />,
  alignCenter: <path d="M4 6h16M7 12h10M5 18h14" />,
  alignRight: <path d="M4 6h16M10 12h10M6 18h14" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 15-4.5-4.5L7 20" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </>
  ),
  highlighter: (
    <>
      <path d="m9 11 4 4-3 3H6l-2-2z" />
      <path d="M12 8l3.5-3.5 4 4L16 12" />
      <path d="M4 21h16" />
    </>
  ),
  textbox: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 9h8M12 9v7" />
    </>
  ),
  frame: <rect x="4" y="4" width="16" height="16" rx="1.5" />,
  wrap: (
    <>
      <path d="M4 6h16M4 18h7" />
      <path d="M20 12H7a3 3 0 0 0 0 6h2" />
      <path d="m11 16-2 2 2 2" />
    </>
  ),
  textAround: (
    <>
      <path d="M4 6h9M4 10h9M4 14h9M4 18h9" />
      <rect x="15" y="8" width="5" height="8" rx="1" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15 9a4 4 0 0 1 0 6" />
      <path d="M18 6a8 8 0 0 1 0 12" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  reset: (
    <>
      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
      <path d="M4 4v5h5" />
    </>
  ),
  fit: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />,
  printer: (
    <>
      <path d="M7 8V4h10v4" />
      <rect x="4" y="8" width="16" height="8" rx="2" />
      <path d="M7 16h10v4H7z" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  save: (
    <>
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M8 3v6h8V3M8 21v-6h8v6" />
    </>
  ),
  newDoc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M12 11v6M9 14h6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 21V9" />
      <path d="m7 13 5-5 5 5" />
      <path d="M5 3h14" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
};

export default function Icon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
