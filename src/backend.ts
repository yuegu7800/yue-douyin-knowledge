import { requestUrl, type RequestUrlParam, type RequestUrlResponse } from "obsidian";
import type {
  ApiFailure,
  ContentInfo,
  DiscoveryResponse,
  ExtractResult,
  HealthResponse,
  TranscriptMode,
  WhisperModel,
} from "./contracts";
import { apiFailureToError, YueError } from "./errors";
import { joinUrl, normalizeServerUrl } from "./utils";

interface ClientOptions {
  serverUrl: string;
  timeoutSeconds: number;
}

export class BackendClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: ClientOptions) {
    this.baseUrl = normalizeServerUrl(options.serverUrl);
    this.timeoutMs = Math.max(10, options.timeoutSeconds) * 1000;
  }

  health(): Promise<HealthResponse> {
    return this.json<HealthResponse>("/api/health", { method: "GET" });
  }

  info(input: string): Promise<ContentInfo> {
    return this.post<ContentInfo>("/api/video/info", { url: input });
  }

  extract(
    input: string,
    model: WhisperModel,
    transcriptMode: TranscriptMode
  ): Promise<ExtractResult> {
    return this.post<ExtractResult>("/api/video/extract", {
      url: input,
      model,
      transcript_mode: transcriptMode,
      keep_media: false,
    });
  }

  search(query: string, limit = 20): Promise<DiscoveryResponse> {
    return this.post<DiscoveryResponse>("/api/video/search", { query, limit });
  }

  related(input: string, limit = 20): Promise<DiscoveryResponse> {
    return this.post<DiscoveryResponse>("/api/video/related", {
      url: input,
      limit,
    });
  }

  mediaUrl(pathOrUrl: string): string {
    return joinUrl(this.baseUrl, pathOrUrl);
  }

  async download(pathOrUrl: string): Promise<ArrayBuffer> {
    const response = await this.requestWithTimeout({
      url: this.mediaUrl(pathOrUrl),
      method: "GET",
      throw: false,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new YueError(`媒体下载失败（HTTP ${response.status}）`, {
        code: "MEDIA_DOWNLOAD_FAILED",
        stage: "download",
        status: response.status,
        retryable: true,
      });
    }
    return response.arrayBuffer;
  }

  private post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    return this.json<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  private async json<T>(
    path: string,
    options: Omit<RequestUrlParam, "url" | "throw">
  ): Promise<T> {
    const response = await this.requestWithTimeout({
      ...options,
      url: `${this.baseUrl}${path}`,
      throw: false,
    });
    let payload: unknown;
    try {
      payload = response.json;
    } catch {
      throw new YueError(`本地服务返回了无法读取的数据（HTTP ${response.status}）`, {
        code: "INVALID_RESPONSE",
        stage: "response",
        status: response.status,
      });
    }
    if (response.status < 200 || response.status >= 300) {
      throw apiFailureToError((payload ?? {}) as ApiFailure, response.status);
    }
    if (!payload || typeof payload !== "object") {
      throw new YueError("本地服务返回的数据格式不正确。", {
        code: "INVALID_RESPONSE",
        stage: "response",
      });
    }
    return payload as T;
  }

  private async requestWithTimeout(
    options: RequestUrlParam
  ): Promise<RequestUrlResponse> {
    let timeoutHandle: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = window.setTimeout(
        () =>
          reject(
            new YueError("等待本地服务超时。", {
              code: "REQUEST_TIMEOUT",
              stage: "request",
              retryable: true,
            })
          ),
        this.timeoutMs
      );
    });
    try {
      return await Promise.race([requestUrl(options), timeout]);
    } catch (error) {
      if (error instanceof YueError) throw error;
      throw new YueError("无法连接本地服务，请确认后端已启动。", {
        code: "BACKEND_UNREACHABLE",
        stage: "request",
        retryable: true,
      });
    } finally {
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
    }
  }
}

