import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'sparkles'
  | 'clock'
  | 'palette'
  | 'user'
  | 'logout'
  | 'chevron'
  | 'fileText'
  | 'calendar'
  | 'trophy'
  | 'trending'
  | 'users'
  | 'heart'
  | 'image'
  | 'upload'
  | 'refresh'
  | 'check'
  | 'arrowLeft'
  | 'arrowRight'
  | 'target'
  | 'sliders'
  | 'copy'
  | 'download'
  | 'link'

const PATHS: Record<IconName, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" />,
  sparkles: (
    <>
      <path d="M12 3.5 13.6 8 18 9.5 13.6 11 12 15.5 10.4 11 6 9.5 10.4 8 12 3.5Z" />
      <path d="M18.5 14.5 19.3 17 21.5 17.8 19.3 18.6 18.5 21 17.7 18.6 15.5 17.8 17.7 17 18.5 14.5Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.5 0 2-1 2-2s-.6-1.6-.6-2.4c0-.8.7-1.6 1.6-1.6H17a3.5 3.5 0 0 0 3.5-3.5C20.5 6.8 16.7 3.5 12 3.5Z" />
      <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H15" />
      <path d="M18 15.5 21.5 12 18 8.5M21 12H9.5" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  fileText: (
    <>
      <path d="M7 3.5h7L19 8v11.5A1 1 0 0 1 18 20.5H7A1 1 0 0 1 6 19.5V4.5A1 1 0 0 1 7 3.5Z" />
      <path d="M14 3.5V8h5M9 12.5h6M9 15.5h6" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8 3.5v4M16 3.5v4" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4.5h8v4a4 4 0 0 1-8 0v-4Z" />
      <path d="M8 6H5.5v1A3.5 3.5 0 0 0 9 10.5M16 6h2.5v1A3.5 3.5 0 0 1 15 10.5M10 12.5h4M9.5 20.5h5M12 12.5v3" />
    </>
  ),
  trending: <path d="M4 15.5 10 9.5l3.5 3.5L20 6.5M20 6.5h-4.5M20 6.5V11" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5M16 6a3 3 0 0 1 0 5.5M17 15.2c2 .5 3.5 1.9 3.5 4.3" />
    </>
  ),
  heart: <path d="M12 19.5S4.5 15 4.5 9.7A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7.5 2.7C19.5 15 12 19.5 12 19.5Z" />,
  image: (
    <>
      <rect x="4" y="4.5" width="16" height="15" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.5" />
      <path d="m5 17 4.5-4.5 3.5 3.5 3-3 3 3" />
    </>
  ),
  upload: <path d="M12 15.5v-11M8 8l4-4 4 4M5 19.5h14" />,
  refresh: <path d="M19 8.5a7 7 0 1 0 1.5 5M19 4v4.5h-4.5" />,
  check: <path d="m5 12.5 4 4 10-10" />,
  arrowLeft: <path d="M19 12H5.5M11 5.5 4.5 12l6.5 6.5" />,
  arrowRight: <path d="M5 12h13.5M13 5.5 19.5 12 13 18.5" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  sliders: <path d="M4 8h10M18 8h2M4 16h2M10 16h10M14 5.5v5M6 13.5v5" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </>
  ),
  download: <path d="M12 4.5v11M8 11.5l4 4 4-4M5 19.5h14" />,
  link: <path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7.5M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5L13 16.5" />,
}

export function Icon({ name, className, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
