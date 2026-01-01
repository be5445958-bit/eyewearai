const GlassesIcon = ({ className = "w-12 h-12" }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="18"
        cy="32"
        r="12"
        stroke="url(#gradient)"
        strokeWidth="3"
        fill="none"
      />
      <circle
        cx="46"
        cy="32"
        r="12"
        stroke="url(#gradient)"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M30 32C30 30 34 30 34 32"
        stroke="url(#gradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M6 32H6"
        stroke="url(#gradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M58 32H58"
        stroke="url(#gradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="hsl(270, 80%, 60%)" />
          <stop offset="100%" stopColor="hsl(290, 70%, 55%)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default GlassesIcon;
