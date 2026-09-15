import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { KyroMark } from './components/Logo'
import Toaster from './components/Toaster'
import { useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Payments from './pages/Payments'
import SendMoney from './pages/SendMoney'
import RequestMoney from './pages/RequestMoney'
import Scan from './pages/Scan'
import MyQr from './pages/MyQr'
import Recharge from './pages/Recharge'
import BillPayment from './pages/BillPayment'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import KyroSave from './pages/KyroSave'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import Insights from './pages/Insights'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import About from './pages/About'
import NotFound from './pages/NotFound'

/** Full-screen KYRO splash shown while the stored session is validated. */
function BootSplash() {
  return (
    <div className="kyro-gradient flex min-h-screen flex-col items-center justify-center gap-5 text-white">
      <div className="animate-pop">
        <KyroMark size={64} onDark />
      </div>
      <div className="text-center">
        <p className="text-2xl font-extrabold tracking-tight">KYRO</p>
        <p className="mt-1 text-xs text-white/60">Smart Digital Payments &amp; Money Management</p>
      </div>
      <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-white/15">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-kyro-400" />
      </div>
    </div>
  )
}

/** Blocks a route until there is a valid session. */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <BootSplash />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth()

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            isLoading ? (
              <BootSplash />
            ) : isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/send" element={<SendMoney />} />
          <Route path="/request" element={<RequestMoney />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/my-qr" element={<MyQr />} />
          <Route path="/recharge" element={<Recharge />} />
          <Route path="/bills/:billType" element={<BillPayment />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:id" element={<TransactionDetail />} />
          <Route path="/save" element={<KyroSave />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetail />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      <Toaster />
    </>
  )
}
