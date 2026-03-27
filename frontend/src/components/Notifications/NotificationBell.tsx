import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useDisclosure } from "../../hooks/useDisclosure";
import { useNotificationsStore } from "../../store/notifications";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const { isOpen, onToggle, onClose } = useDisclosure(false);
  const unreadCount = useNotificationsStore((state) =>
    state.notifications.filter((n) => !n.read).length
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={containerRef}>
      <Link
        to="/notifications"
        className="relative p-2 rounded-full text-theme hover:bg-surface focus:outline-none focus:ring-2 ring-theme"
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-white text-xs font-medium"
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
      {isOpen && (
        <NotificationDropdown onClose={onClose} maxItems={5} />
      )}
    </div>
  );
}
