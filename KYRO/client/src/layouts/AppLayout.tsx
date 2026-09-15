import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, Home, PiggyBank, User, Users, Wallet } from 'lucide-react'
import Logo from '../components/Logo'
import { DemoNotice } from '../components/ui'

/**
 * The five primary destinations. Rendered as a bottom bar on phones and a
 * sidebar from `lg` upwards, from one definition so they can never diverge.
 */
const NAV_ITEMS = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/payments', label: 'Payments', Icon: Wallet, end: false },
  { to: '/groups', label: 'Groups', Icon: Users, end: false },
  { to: '/insights', label: 'Kyro AI', Icon: BarChart3, end: false },
  { to: '/profile', label: 'Profile', Icon: User, end: false },
]

/** Routes that take over the screen and hide the primary navigation. */
const FULLSCREEN_ROUTES = ['/scan', '/send', '/recharge', '/bills/']

export default function AppLayout() {
  const location = useLocation()
  const hideNav = FULLSCREEN_ROUTES.some((route) => location.pathname.startsWith(route))

  return (
    <div className="flex min-h-screen bg-app">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-app bg-card px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo size={36} showTagline />
        </div>

        <nav aria-label="Main" className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `focus-ring flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-navy-800 text-white shadow-md shadow-navy-900/15'
                    : 'text-soft hover:bg-muted hover:text-strong'
                }`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}

          <NavLink
            to="/save"
            className={({ isActive }) =>
              `focus-ring mt-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-mint-600 text-white shadow-md shadow-mint-600/20'
                  : 'text-soft hover:bg-muted hover:text-strong'
              }`
            }
          >
            <PiggyBank size={19} />
            Kyro Save
          </NavLink>
        </nav>

        <DemoNotice className="mt-4 px-2 text-left" />
      </aside>

      {/* ---------- Page content ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className={`flex-1 ${hideNav ? '' : 'pb-20 lg:pb-0'}`}>
          <Outlet />
        </main>

        {/* ---------- Mobile bottom navigation ---------- */}
        {!hideNav && (
          <nav
            aria-label="Main"
            className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-app bg-card/95 backdrop-blur lg:hidden"
          >
            {NAV_ITEMS.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `focus-ring flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                    isActive ? 'text-kyro-600 dark:text-kyro-300' : 'text-soft'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                        isActive ? 'bg-kyro-100 dark:bg-kyro-500/15' : ''
                      }`}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="text-[10px] font-semibold">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
