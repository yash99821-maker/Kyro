import { useId } from 'react'

interface LogoProps {
  size?: number
  showText?: boolean
  showTagline?: boolean
  light?: boolean
  className?: string
}

/**
 * The KYRO mark: a rounded tile holding a "K" whose upper arm continues into a
 * rising arrow — payments that move your money forward — with a coin at the
 * foot for the round-up that gets kept.
 *
 * `onDark` swaps the navy tile for a translucent one so the mark stays visible
 * when it sits on the navy app header instead of a light surface.
 *
 * Drawn inline as SVG so it stays crisp at any size and needs no image asset.
 */
export function KyroMark({ size = 40, onDark = false }: { size?: number; onDark?: boolean }) {
  // Gradient ids must be unique per instance — the logo appears more than once
  // on a page, and duplicate SVG ids make browsers reuse the wrong gradient.
  const uid = useId().replace(/:/g, '')
  const bgId = `kyro-bg-${uid}`
  const accentId = `kyro-accent-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="KYRO"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width="64"
        height="64"
        rx="16"
        fill={onDark ? 'rgba(255,255,255,0.12)' : `url(#${bgId})`}
        stroke={onDark ? 'rgba(255,255,255,0.22)' : 'none'}
        strokeWidth={onDark ? 1.5 : 0}
      />
      {/* K stem */}
      <rect x="16" y="17" width="6" height="30" rx="3" fill="white" />
      {/* lower leg of the K */}
      <path d="M24 32.5 L36.5 46.5" stroke="white" strokeWidth="6" strokeLinecap="round" />
      {/* upper arm rising into an arrow */}
      <path d="M24 31.5 L41 15" stroke={`url(#${accentId})`} strokeWidth="6" strokeLinecap="round" />
      <path
        d="M33.5 14.5 H42.5 V23.5"
        stroke={`url(#${accentId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* savings coin: the round-up that gets kept */}
      <circle cx="46" cy="44" r="6" fill="#34d399" />
      <circle cx="46" cy="44" r="2.2" fill="#0e1735" />
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e2d5e" />
          <stop offset="1" stopColor="#0a1229" />
        </linearGradient>
        <linearGradient id={accentId} x1="24" y1="32" x2="44" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22cdf5" />
          <stop offset="1" stopColor="#57e1ff" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function Logo({
  size = 40,
  showText = true,
  showTagline = false,
  light = false,
  className = '',
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <KyroMark size={size} onDark={light} />
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className="font-extrabold tracking-tight"
            style={{
              fontSize: size * 0.55,
              letterSpacing: '-0.02em',
              color: light ? '#ffffff' : 'var(--text-strong)',
            }}
          >
            KYRO
          </span>
          {showTagline && (
            <span
              className="font-medium mt-1"
              style={{
                fontSize: Math.max(9, size * 0.2),
                color: light ? 'rgba(255,255,255,0.68)' : 'var(--text-muted)',
              }}
            >
              Smart Digital Payments
            </span>
          )}
        </div>
      )}
    </div>
  )
}
