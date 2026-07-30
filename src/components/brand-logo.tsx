type BrandLogoProps = {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

/** Food cloche + steam mark for DinePooja */
export function BrandLogo({
  size = 36,
  className = "",
  showWordmark = false,
  wordmarkClassName = "",
}: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <rect width="64" height="64" rx="16" fill="#E11D48" />
        <path
          d="M14 40c0-10.5 8-18 18-18s18 7.5 18 18"
          stroke="#FFF7ED"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M12 42h40"
          stroke="#FFF7ED"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M20 46h24"
          stroke="#FECACA"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M28 16c0 2.5-1.2 4-2.5 5.2M32 14c0 3-1.5 5-3 6.5M36 16c0 2.5-1 4-2.2 5.2"
          stroke="#FDE68A"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="46" cy="22" r="3" fill="#FDE68A" />
      </svg>
      {showWordmark ? (
        <span
          className={`font-[family-name:var(--font-display)] font-semibold tracking-tight text-[var(--ink)] ${wordmarkClassName}`}
        >
          DinePooja
        </span>
      ) : null}
    </div>
  );
}
