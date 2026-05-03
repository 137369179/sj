"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

type VendorApplyFormProps = {
  marketId: string;
  applicationsHref: string;
  applicationId?: string;
  mode?: "create" | "supplement";
  initialBoothPreference?: string;
  initialApplicationNote?: string;
  existingAttachments?: Array<{
    url: string;
    originalName: string;
  }>;
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

export function VendorApplyForm({
  marketId,
  applicationsHref,
  applicationId,
  mode = "create",
  initialBoothPreference,
  initialApplicationNote,
  existingAttachments = []
}: VendorApplyFormProps) {
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
    const attachmentInput = form.elements.namedItem("attachmentFile");
    const attachmentFile =
      attachmentInput instanceof HTMLInputElement ? attachmentInput.files?.[0] : null;

    setSubmitState({
      status: "submitting",
      message: null
    });

    try {
      const attachments =
        attachmentFile instanceof File && attachmentFile.size > 0
          ? [await uploadAttachment(attachmentFile)]
          : [];

      const endpoint =
        mode === "supplement" && applicationId
          ? `/api/applications/${applicationId}`
          : "/api/applications";
      const response = await fetch(endpoint, {
        method: mode === "supplement" ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          boothPreference: String(formData.get("boothPreference") ?? ""),
          applicationNote: String(formData.get("applicationNote") ?? ""),
          attachments,
          ...(mode === "create" ? { marketId } : {})
        })
      });

      if (!response.ok) {
        const errorPayload = await readErrorPayload(response);
        throw new Error(resolveSubmitErrorMessage(response.status, errorPayload));
      }

      setSubmitState({
        status: "success",
        message:
          mode === "supplement"
            ? "补件已提交，可返回我的报名查看最新进度。"
            : "报名提交成功，可前往我的报名查看进度。"
      });
      form.reset();
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error ? error.message : "报名提交失败，请稍后重试。"
      });
    }
  }

  const submitLabel = useMemo(() => {
    if (isSubmitting) {
      return mode === "supplement" ? "提交补件中..." : "提交中...";
    }

    return mode === "supplement" ? "提交补件" : "提交申请";
  }, [isSubmitting, mode]);

  return (
    <>
      <form aria-label="报名申请表单" onSubmit={handleSubmit}>
        {mode === "create" ? <input type="hidden" name="marketId" value={marketId} /> : null}
        <label>
          摊位偏好
          <textarea
            name="boothPreference"
            aria-label="摊位偏好"
            required
            rows={3}
            defaultValue={initialBoothPreference}
          />
        </label>
        <label>
          报名备注
          <textarea
            name="applicationNote"
            aria-label="报名备注"
            rows={4}
            defaultValue={initialApplicationNote}
          />
        </label>
        <label>
          附件文件
          <input
            name="attachmentFile"
            aria-label="附件文件"
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
          />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
      </form>
      {existingAttachments.length > 0 ? (
        <section aria-label="已提交资料" style={{ marginTop: "1rem" }}>
          <p>当前已提交资料</p>
          <ul>
            {existingAttachments.map((attachment) => (
              <li key={attachment.url}>
                <a href={attachment.url} target="_blank" rel="noreferrer">
                  {attachment.originalName}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p>开发期已接通本地最小上传链路，后续再升级到对象存储。</p>
      <Link href={applicationsHref}>查看我的报名</Link>
      {submitState.message ? (
        <p aria-live={statusTone} role={submitState.status === "error" ? "alert" : "status"}>
          {submitState.message}
        </p>
      ) : null}
    </>
  );
}

async function readErrorPayload(response: Response) {
  try {
    const payload = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      return payload.message;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveSubmitErrorMessage(status: number, errorCode: string | null) {
  if (status === 409 && errorCode === "supplement unavailable") {
    return "当前申请暂不处于补件阶段，请返回我的报名查看最新状态。";
  }

  if (status === 409 || errorCode === "duplicate application") {
    return "你已经提交过该市集的报名，请前往我的报名查看进度。";
  }

  if (status === 404 || errorCode === "market not found") {
    return "当前市集不存在或已下线，请返回发现市集重新选择。";
  }

  if (status === 409 || errorCode === "market unavailable") {
    return "当前市集暂未开放报名，请返回发现市集查看其他公开招募中的活动。";
  }

  if (status === 401 || errorCode === "unauthorized") {
    return "请先以摊主身份登录后再提交报名。";
  }

  if (status === 403 || errorCode === "forbidden") {
    return "当前账号没有报名权限，请切换为摊主账号。";
  }

  return "报名提交失败，请稍后重试。";
}

async function uploadAttachment(file: File) {
  const uploadFormData = new FormData();
  uploadFormData.set("file", file);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: uploadFormData
  });

  if (!response.ok) {
    const errorPayload = await readErrorPayload(response);
    throw new Error(resolveUploadErrorMessage(response.status, errorPayload));
  }

  return response.json() as Promise<{ url: string; originalName: string }>;
}

function resolveUploadErrorMessage(status: number, errorCode: string | null) {
  if (status === 415 || errorCode === "unsupported file type") {
    return "附件上传失败，请更换 JPG、PNG、WEBP 或 PDF 文件后重试。";
  }

  if (status === 413 || errorCode === "file too large") {
    return "附件上传失败，文件大小不能超过 5MB。";
  }

  return "附件上传失败，请稍后重试。";
}
