import { useNavigate } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '../components/ui'
import { KyroMark } from '../components/Logo'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <KyroMark size={56} />
      <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-soft">
        <Compass size={26} />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-strong">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-soft">
        That page does not exist in KYRO. It may have been moved, or the link might be incorrect.
      </p>
      <Button
        variant="primary"
        className="mt-6"
        icon={<Home size={16} />}
        onClick={() => navigate('/')}
      >
        Back to dashboard
      </Button>
    </div>
  )
}
