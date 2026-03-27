import type { ComponentType, MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  UserPlus,
  Receipt,
  CheckCircle2,
  XCircle,
  Users,
  Megaphone,
  CreditCard,
} from "lucide-react";
import type { Notification, NotificationType } from "../../types/notifications";
import { useNotificationsStore } from "../../store/notifications";

const TYPE_ICONS: Record<NotificationType, ComponentType<{ className?: string }>> = {
  split_invitation: Users,
  payment_reminder: CreditCard,
  payment_received: Receipt,
  split_completed: CheckCircle2,
  split_cancelled: XCircle,
  friend_request: UserPlus,
  system_announcement: Megaphone,
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationItemProps {
  notification: Notification;
  compact?: boolean;
}

export function NotificationItem({ notification, compact = false }: NotificationItemProps) {
  const { markAsRead, markAsUnread } = useNotificationsStore();
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const isUnread = !notification.read;

  const content = (
    <>
      <div
        className={`flex shrink-0 w-10 h-10 rounded-full items-center justify-center bg-theme border-theme border ${isUnread ? "bg-accent/10 text-accent" : "bg-surface text-theme"}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium text-theme ${isUnread ? "font-semibold" : ""}`}>
          {notification.title}
        </p>
        <p className="text-sm text-muted-theme line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-muted-theme mt-1">{formatTime(notification.createdAt)}</p>
      </div>
    </>
  );

  const toggleRead = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (notification.read) {
      markAsUnread(notification.id);
    } else {
      markAsRead(notification.id);
    }
  };

  const wrapperClass = `
    flex gap-3 p-3 rounded-lg border border-theme bg-card-theme
    transition-colors hover:bg-surface
    ${isUnread ? "bg-accent/5 border-accent/30" : ""}
    ${compact ? "py-2" : ""}
  `.trim();

  if (notification.actionUrl) {
    return (
      <Link
        to={notification.actionUrl}
        className={`block ${wrapperClass}`}
        onClick={() => !notification.read && markAsRead(notification.id)}
        data-testid={`notification-${notification.id}`}
      >
        {content}
        {!compact && (
          <button
            type="button"
            onClick={toggleRead}
            className="shrink-0 self-start text-xs text-muted-theme hover:text-theme underline"
            aria-label={notification.read ? "Mark as unread" : "Mark as read"}
          >
            {notification.read ? "Mark as unread" : "Mark as read"}
          </button>
        )}
      </Link>
    );
  }

  return (
    <div
      className={wrapperClass}
      data-testid={`notification-${notification.id}`}
    >
      {content}
      {!compact && (
        <button
          type="button"
          onClick={toggleRead}
          className="shrink-0 self-start text-xs text-muted-theme hover:text-theme underline"
          aria-label={notification.read ? "Mark as unread" : "Mark as read"}
        >
          {notification.read ? "Mark as unread" : "Mark as read"}
        </button>
      )}
    </div>
  );
}
