export function ApathyLogo({
  className = '',
  framed = false,
  title = 'The Apathy Coalition',
}) {
  const frameClass = framed
    ? 'rounded-[32px] border border-border/80 bg-gradient-to-br from-background via-muted/45 to-background p-4 shadow-[0_32px_100px_rgba(0,0,0,0.28)]'
    : '';

  return (
    <div className={`${frameClass} ${className}`.trim()}>
      <svg
        viewBox="0 0 160 180"
        role="img"
        aria-label={title}
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="login-face-fill" x1="0%" x2="100%" y1="10%" y2="90%">
            <stop offset="0%" stopColor="#f7f7f7" />
            <stop offset="62%" stopColor="#efefef" />
            <stop offset="100%" stopColor="#dadada" />
          </linearGradient>
          <linearGradient id="login-rim-fill" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#2a2a2d" />
            <stop offset="100%" stopColor="#111214" />
          </linearGradient>
          <linearGradient id="login-shadow-fill" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#6f7277" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#43464a" stopOpacity="0.15" />
          </linearGradient>
          <clipPath id="login-face-clip">
            <ellipse cx="80" cy="90" rx="49" ry="67" />
          </clipPath>
          <filter id="login-drop-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="11" stdDeviation="10" floodColor="#000000" floodOpacity="0.34" />
          </filter>
        </defs>

        <g filter="url(#login-drop-shadow)">
          <ellipse cx="80" cy="90" rx="59" ry="79" fill="url(#login-rim-fill)" />
          <ellipse cx="80" cy="90" rx="49" ry="67" fill="url(#login-face-fill)" />
          <g clipPath="url(#login-face-clip)">
            <path d="M28 14C47 32 53 58 50 95C47 127 57 153 78 173L34 173L26 13Z" fill="url(#login-shadow-fill)" />
            <path d="M57 20C70 35 74 61 72 92C70 122 77 150 95 171L80 173C60 154 51 128 54 95C57 59 52 36 40 18Z" fill="#ffffff" fillOpacity="0.36" />
          </g>
          <path d="M44 76C56 73 69 72 79 72C74 83 64 88 50 87C47 84 45 80 44 76Z" fill="#101113" />
          <path d="M116 76C104 73 91 72 81 72C86 83 96 88 110 87C113 84 115 80 116 76Z" fill="#101113" />
          <path d="M69 124C76 121 84 121 91 124C92 126 92 129 90 130C83 132 76 132 70 131C68 129 68 126 69 124Z" fill="#101113" />
          <ellipse cx="80" cy="90" rx="49.5" ry="67.5" fill="none" stroke="#060709" strokeOpacity="0.55" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}
