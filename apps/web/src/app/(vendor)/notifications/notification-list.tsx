"use client";

import { useState } from "react";
import type { VendorNotificationListItem } from "../../../server/notifications/service";

export function NotificationList({
  initialNotifications
}: {
  initialNotifications: VendorNotificationListItem[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

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
          {!notification.isRead && (
            <button onClick={() => handleMarkAsRead(notification.id)}>标记为已读</button>
          )}
        </li>
      ))}
    </ul>
  );
}