import type { ApplicationReviewAuditRecord } from "../../server/applications/service";

type ReviewHistoryProps = {
  reviews: ApplicationReviewAuditRecord[];
};

export function ReviewHistory({ reviews }: ReviewHistoryProps) {
  return (
    <>
      <p>审核历史</p>
      {reviews.length > 0 ? (
        <ul aria-label="审核历史列表">
          {reviews.map((review) => (
            <li key={review.id}>
              {formatDate(review.createdAt)} · {getReviewDecisionLabel(review.decision)} ·{" "}
              {review.reviewNote ?? "无备注"}
            </li>
          ))}
        </ul>
      ) : (
        <p>暂无审核历史</p>
      )}
    </>
  );
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getReviewDecisionLabel(decision: "approve" | "reject") {
  return decision === "approve" ? "通过" : "拒绝";
}
