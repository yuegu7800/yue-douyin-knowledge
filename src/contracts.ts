export const WHISPER_MODELS = [
  "tiny",
  "base",
  "small",
  "medium",
  "large-v3",
] as const;

export type WhisperModel = (typeof WHISPER_MODELS)[number];
export type TranscriptMode = "auto" | "ocr" | "asr";
export type ContentType = "video" | "image";

export interface YueSettings {
  serverUrl: string;
  noteFolder: string;
  attachmentFolder: string;
  whisperModel: WhisperModel;
  transcriptMode: TranscriptMode;
  saveImages: boolean;
  openAfterCreate: boolean;
  requestTimeoutSeconds: number;
}

export const DEFAULT_SETTINGS: YueSettings = {
  serverUrl: "http://127.0.0.1:5050",
  noteFolder: "抖音知识库",
  attachmentFolder: "抖音知识库/附件",
  whisperModel: "small",
  transcriptMode: "auto",
  saveImages: true,
  openAfterCreate: true,
  requestTimeoutSeconds: 600,
};

export interface ApiFailure {
  success?: false;
  error?: string;
  error_code?: string;
  stage?: string;
  request_id?: string;
  retryable?: boolean;
}

export interface DependencyStatus {
  available?: boolean;
  path?: string | null;
  enabled?: boolean;
  login_initialized?: boolean;
}

export interface HealthResponse {
  success: boolean;
  pipeline_ready?: boolean;
  checks?: {
    ffmpeg?: DependencyStatus;
    faster_whisper?: DependencyStatus;
    rapidocr?: DependencyStatus;
    douyin_browser?: DependencyStatus;
  };
}

export interface ContentInfo {
  success: boolean;
  video_id: string;
  aweme_id?: string;
  title: string;
  author: string;
  content_type: ContentType;
  source_url?: string;
  download_url?: string;
  cover_url?: string;
  image_urls?: string[];
}

export interface ExtractResult extends ContentInfo {
  text: string;
  transcript_source?: string;
  images?: string[];
}

export interface DiscoveryItem {
  video_id: string;
  aweme_id?: string;
  title: string;
  author: string;
  content_type: ContentType;
  source_url: string;
  cover_url?: string;
}

export interface DiscoveryResponse {
  success: boolean;
  items: DiscoveryItem[];
  count?: number;
  query?: string;
  source_url?: string;
}

export interface BatchSummary {
  created: number;
  duplicates: number;
  failed: number;
  lastCreatedPath?: string;
}

