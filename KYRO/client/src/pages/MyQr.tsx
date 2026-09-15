import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import Logo from '../components/Logo'
import { Avatar } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useUi } from '../context/UiContext'
import { buildQrPayload, colorForName, initialsOf } from '../utils/format'

export default function MyQr() {
  const { user } = useAuth()
  const { showToast } = useUi()
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const payload = buildQrPayload(user.upiId, user.name)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(user!.upiId)
      setCopied(true)
      showToast('UPI ID copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Could not copy — please copy the UPI ID manually.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-app">
      <PageHeader title="My QR Code" subtitle="Let others pay you on KYRO" />

      <PageBody className="max-w-md">
        <div className="kyro-gradient rounded-3xl p-6 text-white">
          <div className="flex items-center justify-between">
            <Logo size={28} light />
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
              Receive
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <Avatar
              name={initialsOf(user.name)}
              size={56}
              color={colorForName(user.name)}
              image={user.profileImage || undefined}
            />
            <p className="mt-3 text-lg font-bold">{user.name}</p>
            <p className="text-xs text-white/60">{user.upiId}</p>

            <div className="mt-6 rounded-3xl bg-white p-5">
              <QRCodeSVG
                value={payload}
                size={200}
                level="M"
                bgColor="#ffffff"
                fgColor="#0e1735"
              />
            </div>

            <p className="mt-5 text-center text-xs text-white/60">
              Scan this code inside KYRO to pay {user.name.split(' ')[0]}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="kyro-card focus-ring mt-4 flex w-full items-center gap-3 p-4 transition-colors hover:bg-muted"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-soft">
            {copied ? <Check size={18} className="text-mint-500" /> : <Copy size={18} />}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-bold text-strong">
              {copied ? 'Copied to clipboard' : 'Copy UPI ID'}
            </p>
            <p className="truncate text-xs text-soft">{user.upiId}</p>
          </div>
        </button>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-soft">
          This QR code works only inside the KYRO demo application. It is not registered with any
          real UPI network.
        </p>
      </PageBody>
    </div>
  )
}
