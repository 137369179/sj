import { AppShell } from "../../../components/layout/app-shell";
import { getSessionUser } from "../../../lib/auth";
import { listVendorNotifications } from "../../../server/notifications/service";
import { NotificationList } from "./notification-list";

export default async function VendorNotificationsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return (
      <AppShell>
        <main aria-labelledby="notifications-title">
          <h2 id="notifications-title">我的通知</h2>
          <p>请先登录后查看通知。</p>
        </main>
      </AppShell>
    );
  }

  const notifications = await listVendorNotifications(sessionUser.userId);

  return (
    <AppShell>
      <main aria-labelledby="notifications-title">
        <h2 id="notifications-title">我的通知</h2>
        <NotificationList initialNotifications={notifications} />
      </main>
    </AppShell>
  );
}