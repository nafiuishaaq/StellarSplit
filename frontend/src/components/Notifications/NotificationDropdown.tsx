import { Link } from "react-router-dom";
import { useNotificationsStore } from "../../store/notifications";
import { NotificationItem } from "./NotificationItem";

interface NotificationDropdownProps {
  onClose?: () => void;
  maxItems?: number;
}

export function NotificationDropdown({
  onClose,
  maxItems = 5,
}: NotificationDropdownProps) {
  const notifications = useNotificationsStore((state) => state.notifications);
  const unreadCount = useNotificationsStore((state) =>
    state.notifications.filter((n) => !n.read).length
  );
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);
  const displayList = notifications.slice(0, maxItems);
  const hasMore = notifications.length > maxItems;

  const handleMarkAllRead = () => {
    markAllAsRead();
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-2 w-[min(90vw,380px)] rounded-xl border border-theme bg-card-theme shadow-lg z-50 flex flex-col max-h-[80vh]"
      data-testid="notification-dropdown"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
        <h3 className="text-sm font-semibold text-theme">Notifications</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs text-accent hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>
      <div className="overflow-y-auto overscroll-contain">
        {displayList.length === 0 ? (
          <p className="p-4 text-sm text-muted-theme text-center">
            No notifications yet.
          </p>
        ) : (
          <ul className="divide-y divide-theme">
            {displayList.map((n) => (
              <li key={n.id}>
                <NotificationItem notification={n} compact />
              </li>
            ))}
          </ul>
        )}
      </div>
      {hasMore && (
        <Link
          to="/notifications"
          onClick={onClose}
          className="block py-2 text-center text-sm text-accent hover:underline border-t border-theme"
        >
          View all notifications
        </Link>
      )}
    </div>
  );
}
