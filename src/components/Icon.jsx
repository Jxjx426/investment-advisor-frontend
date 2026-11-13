const paths = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10H3z" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  trades: (
    <>
      <path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="3" />
      <path d="M3 9h18m-5 5h2" />
    </>
  ),
  research: (
    <>
      <path d="M4 20V4m0 16h16M8 15l4-5 4 2 4-7" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H4v16h6m4-13 5 5-5 5m-5-5h12" />
    </>
  ),
  upload: (
    <>
      <path d="M4 15v5h16v-5M12 16V3m-5 5 5-5 5 5" />
    </>
  ),
  download: (
    <>
      <path d="M4 15v5h16v-5M12 3v13m-5-5 5 5 5-5" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
};
export default function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.home}
    </svg>
  );
}
