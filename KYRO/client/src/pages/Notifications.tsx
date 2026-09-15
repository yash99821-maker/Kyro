import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  Bell,
  BellRing,
  CheckCheck,
  Info,
  PiggyBank,
  Send,
  Users,
} from 'lucide-react'
import { Button, EmptyState, ErrorState, ListSkeleton } from '../components/ui'
import PageHeader, { PageBody } from '../layouts/PageHeader'
import { useUi } from '../context/UiContext'
import { useApiResource } from '../hooks/useApiResource'
import { notificationService } from '../services'
import { getErrorMessage } from '../services/api'
import { formatRelativeDay, formatTime } from '../utils/format'
import type { NotificationType } from '../types'

const ICONS: Record<NotificationType, { Icon: typeof Bell; tint: string }> = {
  PAYMENT: { Icon: Send, tint: 'bg-kyro-100 text-kyro-700 dark:bg-kyro-500/15 dark:text-kyro-200' },
  RECEIVED: { Icon: ArrowDownLeft, tint: 'bg-mint-100 text-mint-700 dark:bg-mint-500/15 dark:text-mint-300' },
  SAVING: { Icon: PiggyBank, tint: 'bg-mint-100 text-mint-700 dark:bg-mint-500/15 dark:text-mint-300' },
  GROUP: { Icon: Users, tint: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  INSIGHT: { Icon: BellRing, tint: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  REQUEST: { Icon: Bell, tint: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' },
  SYSTEM: { Icon: Info, tint: 'bg-muted text-soft' },
}

export default function Notifications() {
  const navigate = useNavigate()
  const { showToast } = useUi()
  const notifications = useApiResource(() => notificationService.list(), [])

  async function markAllRead() {
    try {
      await notificationService.markAllRead()
      await notifications.reload()
      showToast('All notifications marked as read')
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    }
  }

  async function open(id: string, link: string, alreadyRead: boolean) {
    if (!alreadyRead) {
      try {
        await notificationService.markRead(id)
        await notifications.reload()
      } catch {
        /* opening the link still matters more than the read receipt */
      }
    }
    if (link) navigate(link)
  }

  const unreadCount = notifications.data?.unreadCount ?? 0

  return (
    <div className="min-h-screen bg-app">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
        action={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              className="shrink-0 px-3 py-2 text-xs"
              icon={<CheckCheck size={14} />}
              onClick={markAllRead}
            >
              Mark all
            </Button>
          ) : undefined
        }
      />

      <PageBody>
        {notifications.isLoading ? (
          <ListSkeleton rows={5} />
        ) : notifications.error ? (
          <ErrorState message={notifications.error} onRetry={notifications.reload} />
        ) : (notifications.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Bell size={26} />}
            title="No notifications yet"
            description="Payment confirmations, Kyro Save round-ups and group updates will show up here."
          />
        ) : (
          <div className="space-y-2.5">
            {notifications.data!.items.map((notification) => {
              const { Icon, tint } = ICONS[notification.type] ?? ICONS.SYSTEM
              return (
                <button
                  key={notification.id}
                  onClick={() => open(notification.id, notification.link, notification.read)}
                  className={`focus-ring flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                    notification.read
                      ? 'border-app bg-card hover:bg-muted'
                      : 'border-kyro-200 bg-kyro-50/60 hover:bg-kyro-50 dark:border-kyro-500/30 dark:bg-kyro-500/10'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tint}`}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-strong">{notification.title}</p>
                      {!notification.read && (
                        <span
                          aria-label="Unread"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-kyro-500"
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-soft">
                      {notification.message}
                    </p>
                    <p className="mt-1.5 text-[11px] text-soft">
                      {formatRelativeDay(notification.createdAt)} ·{' '}
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </PageBody>
    </div>
  )
}
