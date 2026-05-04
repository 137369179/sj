import { AppShell } from "../../../components/layout/app-shell";
import { getVendorTimingNote } from "../../../lib/role-play";
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
  const hasStallAssignedNotification = notifications.some(
    (notification) =>
      notification.title.includes("摊位分配已确认") ||
      notification.content.includes("已完成摊位分配")
  );
  const hasPaidNotification = notifications.some(
    (notification) =>
      notification.title.includes("支付已完成") || notification.content.includes("本次报名已锁定")
  );
  const hasPaymentReminderNotification = notifications.some(
    (notification) =>
      notification.title.includes("支付进度提醒") || notification.content.includes("待支付金额")
  );
  const supplementNotification = notifications.find(
    (notification) =>
      notification.title.includes("补充资料") || notification.content.includes("补充资料")
  );
  const timingNote = supplementNotification
    ? getVendorTimingNote({
        latestReviewDecision: "supplement",
        reviewedAt: supplementNotification.createdAt
      })
    : null;

  return (
    <AppShell>
      <main aria-labelledby="notifications-title">
        <h2 id="notifications-title">我的通知</h2>
        {hasSupplementNotification ||
        hasWaitlistNotification ||
        hasStallAssignedNotification ||
        hasPaidNotification ||
        hasPaymentReminderNotification ? (
          <section aria-labelledby="vendor-notification-guidance-title">
            <h3 id="vendor-notification-guidance-title">本周需要关注</h3>
            {hasSupplementNotification || hasWaitlistNotification ? (
              <>
                <p>补件通知请尽快处理，候补通知建议保留档期。</p>
                <p>建议动作优先级：先处理补件，再持续关注候补结果。</p>
              </>
            ) : null}
            {hasStallAssignedNotification ? (
              <>
                <p>摊位已分配后请尽快完成支付，避免档期释放。</p>
                <p>建议动作优先级：先完成支付，再准备进场资料。</p>
              </>
            ) : null}
            {hasPaidNotification ? (
              <>
                <p>支付完成后可开始准备进场资料，并核对摊位信息。</p>
                <p>建议动作优先级：先核对摊位安排，再准备进场。</p>
              </>
            ) : null}
            {hasPaymentReminderNotification ? (
              <>
                <p>支付提醒已送达，请优先完成当前待支付订单。</p>
                <p>建议动作优先级：先完成支付，再返回查看分配结果。</p>
              </>
            ) : null}
            {timingNote ? <p>{timingNote}</p> : null}
          </section>
        ) : null}
        <NotificationList initialNotifications={notifications} />
      </main>
    </AppShell>
  );
}
