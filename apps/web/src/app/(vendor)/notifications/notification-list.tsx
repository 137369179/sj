"use client";

import { useState } from "react";
import type { VendorNotificationListItem } from "../../../server/notifications/service";

export function NotificationList({
  initialNotifications
}: {
  initialNotifications: VendorNotificationListItem[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [actionReceipts, setActionReceipts] = useState<Record<string, string>>({});

  async function handleMarkAsRead(notificationId: string) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST"
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  }

  async function handleConfirmWaitlist(notificationId: string) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/waitlist-confirm`, {
        method: "POST"
      });

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as { message: string };
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setActionReceipts((prev) => ({
        ...prev,
        [notificationId]: result.message
      }));
    } catch (error) {
      console.error("Failed to confirm waitlist offer", error);
    }
  }

  async function handleDeclineWaitlist(notificationId: string) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/waitlist-decline`, {
        method: "POST"
      });

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as { message: string };
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setActionReceipts((prev) => ({
        ...prev,
        [notificationId]: result.message
      }));
    } catch (error) {
      console.error("Failed to decline waitlist offer", error);
    }
  }

  async function handleWaitlistLater(notificationId: string) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/waitlist-later`, {
        method: "POST"
      });

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as { message: string };
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setActionReceipts((prev) => ({
        ...prev,
        [notificationId]: result.message
      }));
    } catch (error) {
      console.error("Failed to defer waitlist offer", error);
    }
  }

  if (notifications.length === 0) {
    return <p>当前暂无通知消息。</p>;
  }

  return (
    <ul aria-label="通知列表" style={{ listStyle: "none", padding: 0 }}>
      {notifications.map((notification) => (
        <li key={notification.id} style={{ marginBottom: "1rem", opacity: notification.isRead ? 0.6 : 1 }}>
          <h3>{notification.title}</h3>
          <p>{notification.content}</p>
          <p>{new Date(notification.createdAt).toLocaleString()}</p>
          {actionReceipts[notification.id] ? <p>{actionReceipts[notification.id]}</p> : null}
          {!notification.isRead && notification.title.includes("候补补位通知") ? (
            <>
              <button onClick={() => handleConfirmWaitlist(notification.id)}>确认补位</button>
              <button onClick={() => handleDeclineWaitlist(notification.id)}>放弃补位</button>
              <button onClick={() => handleWaitlistLater(notification.id)}>稍后确认</button>
            </>
          ) : null}
          {!notification.isRead && (
            <button onClick={() => handleMarkAsRead(notification.id)}>标记为已读</button>
          )}
        </li>
      ))}
    </ul>
  );
}
