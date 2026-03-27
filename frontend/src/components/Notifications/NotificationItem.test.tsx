import type { ReactElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { NotificationItem } from "./NotificationItem";
import { useNotificationsStore } from "../../store/notifications";
import { resetNotificationsForTesting } from "../../test-utils/notifications";
import type { Notification } from "../../types/notifications";

const wrap = (ui: ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

const mockNotification: Notification = {
  id: "test-1",
  type: "payment_received",
  title: "Payment received",
  message: "You received $10.",
  read: false,
  createdAt: new Date().toISOString(),
};

describe("NotificationItem", () => {
  beforeEach(() => {
    resetNotificationsForTesting();
  });

  it("renders title and message", () => {
    wrap(<NotificationItem notification={mockNotification} />);
    expect(screen.getByText("Payment received")).toBeInTheDocument();
    expect(screen.getByText("You received $10.")).toBeInTheDocument();
  });

  it("shows Mark as read when unread", () => {
    wrap(<NotificationItem notification={mockNotification} />);
    expect(screen.getByRole("button", { name: /mark as read/i })).toBeInTheDocument();
  });

  it("shows Mark as unread when read", () => {
    wrap(
      <NotificationItem
        notification={{ ...mockNotification, read: true }}
      />
    );
    expect(screen.getByRole("button", { name: /mark as unread/i })).toBeInTheDocument();
  });

  it("mark as read updates store", () => {
    useNotificationsStore.setState({
      notifications: [mockNotification],
    });
    wrap(<NotificationItem notification={mockNotification} />);
    const btn = screen.getByRole("button", { name: /mark as read/i });
    fireEvent.click(btn);
    const updated = useNotificationsStore.getState().notifications.find((n) => n.id === "test-1");
    expect(updated?.read).toBe(true);
  });

  it("has data-testid for notification id", () => {
    wrap(<NotificationItem notification={mockNotification} />);
    expect(screen.getByTestId("notification-test-1")).toBeInTheDocument();
  });
});
