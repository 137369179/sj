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
  const hasSupplementNotification = notifications.some(
    (notification) =>
      notification.title.includes("补充资料") || notification.content.includes("补充资料")
  );
  const hasWaitlistNotification = notifications.some(
    (notification) =>
      notification.title.includes("候补") || notification.content.includes("候补")
  );

  return (
    <AppShell>
      <main aria-labelledby="notifications-title">
        <h2 id="notifications-title">我的通知</h2>
        {hasSupplementNotification || hasWaitlistNotification ? (
          <section aria-labelledby="vendor-notification-guidance-title">
            <h3 id="vendor-notification-guidance-title">本周需要关注</h3>
            <p>补件通知请尽快处理，候补通知建议保留档期。</p>
          </section>
        ) : null}
        <NotificationList initialNotifications={notifications} />
      </main>
    </AppShell>
  );
}
