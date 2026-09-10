import type { ApiFailure } from "./contracts";

export class YueError extends Error {
  readonly code?: string;
  readonly stage?: string;
  readonly requestId?: string;
  readonly retryable?: boolean;
  readonly status?: number;

  constructor(
    message: string,
    details: {
      code?: string;
      stage?: string;
      requestId?: string;
      retryable?: boolean;
      status?: number;
    } = {}
  ) {
    super(message);
    this.name = "YueError";
    this.code = details.code;
    this.stage = details.stage;
    this.requestId = details.requestId;
    this.retryable = details.retryable;
    this.status = details.status;
  }
}

export function apiFailureToError(
  payload: ApiFailure,
  status: number
): YueError {
  return new YueError(payload.error || `本地服务返回 ${status}`, {
    code: payload.error_code,
    stage: payload.stage,
    requestId: payload.request_id,
    retryable: payload.retryable,
    status,
  });
}

export function describeError(error: unknown): string {
  if (!(error instanceof YueError)) {
    return error instanceof Error ? error.message : String(error);
  }

  const lines = [error.message];
  if (error.stage) lines.push(`阶段：${error.stage}`);
  if (error.code) lines.push(`错误码：${error.code}`);
  if (error.requestId) lines.push(`请求编号：${error.requestId}`);
  if (error.retryable) lines.push("此错误可以稍后重试。");
  return lines.join("\n");
}

