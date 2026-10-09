const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  modules: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  analysis: 'M3 20h18M5 16l5-5 4 3 6-8',
  reports: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 .6-1.5-1.2L15 4h-4l-.5 2.4L9 7.6 7 7 5 11l2 1v1l-2 1 2 4 2-.6 1.5 1.2L11 20h4l.5-2.4 1.5-1.2 2 .6 2-4-2-1z',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 5l-4 14',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5',
  cube: 'M12 3l7 4v10l-7 4-7-4V7zM12 12l7-4M12 12v9M12 12L5 8',
  bug: 'M8 3h8v6l3 3v4l-3 3H8l-3-3v-4l3-3zM10 11h4',
  warn: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  trend: 'M3 20h18M5 15l4-4 3 2 6-7',
  search: 'M20 20l-4-4M11 18a7 7 0 100-14 7 7 0 000 14z',
  filter: 'M3 5h18l-7 8v6l-4-2v-4z',
  chevR: 'M9 6l6 6-6 6',
  chevL: 'M15 6l-6 6 6 6',
  chevD: 'M6 9l6 6 6-6',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
  arrowL: 'M19 12H5M11 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
  calendar: 'M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zM3 10h18M8 3v4M16 3v4',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  check: 'M5 12l5 5 9-10',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18, className = '', strokeWidth = 1.8 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
