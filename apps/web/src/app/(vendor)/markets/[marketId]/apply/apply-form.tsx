"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

type VendorApplyFormProps = {
  marketId: string;
};

type SubmitState =
  | {
      status: "idle" | "submitting";
      message: null;
    }
  | {
      status: "success" | "error";
      message: string;
    };

export function VendorApplyForm({ marketId }: VendorApplyFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: null
  });

  const isSubmitting = submitState.status === "submitting";
  const statusTone = submitState.status === "error" ? "assertive" : "polite";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const attachmentUrl = String(formData.get("attachmentUrl") ?? "").trim();

    setSubmitState({
      status: "submitting",
      message: null
    });

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          marketId,
          boothPreference: String(formData.get("boothPreference") ?? ""),
          applicationNote: String(formData.get("applicationNote") ?? ""),
          attachments: attachmentUrl
            ? [
                {
                  url: attachmentUrl,
                  originalName: getAttachmentName(attachmentUrl)
                }
              ]
            : []
        })
      });

      if (!response.ok) {
        throw new Error("submit failed");
      }

      setSubmitState({
        status: "success",
        message: "报名提交成功，可前往我的报名查看进度。"
      });
      form.reset();
    } catch {
      setSubmitState({
        status: "error",
        message: "报名提交失败，请稍后重试。"
      });
    }
  }

  const submitLabel = useMemo(() => {
    if (isSubmitting) {
      return "提交中...";
    }

    return "提交申请";
  }, [isSubmitting]);

  return (
    <>
      <form aria-label="报名申请表单" onSubmit={handleSubmit}>
        <input type="hidden" name="marketId" value={marketId} />
        <label>
          摊位偏好
          <textarea
            name="boothPreference"
            aria-label="摊位偏好"
            required
            rows={3}
          />
        </label>
        <label>
          报名备注
          <textarea
            name="applicationNote"
            aria-label="报名备注"
            rows={4}
          />
        </label>
        <label>
          附件地址
          <input
            name="attachmentUrl"
            aria-label="附件地址"
            type="url"
            placeholder="https://example.com/license.pdf"
          />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
      </form>
      <p>开发期通过最小表单接通报名闭环，后续再增强上传体验。</p>
      <Link href="/applications">查看我的报名</Link>
      {submitState.message ? (
        <p aria-live={statusTone} role={submitState.status === "error" ? "alert" : "status"}>
          {submitState.message}
        </p>
      ) : null}
    </>
  );
}

function getAttachmentName(attachmentUrl: string) {
  const segments = attachmentUrl.split("/").filter(Boolean);
  return segments.at(-1) ?? "attachment";
}
