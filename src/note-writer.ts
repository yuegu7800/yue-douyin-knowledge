import {
  normalizePath,
  TFile,
  type App,
  type TAbstractFile,
} from "obsidian";
import type { ExtractResult, YueSettings } from "./contracts";
import type { BackendClient } from "./backend";
import {
  fileExtensionFromUrl,
  safePathSegment,
  yamlString,
} from "./utils";

async function ensureFolder(app: App, folder: string): Promise<void> {
  const normalized = normalizePath(folder.trim());
  if (!normalized || normalized === "/") return;
  const segments = normalized.split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const existing: TAbstractFile | null = app.vault.getAbstractFileByPath(current);
    if (!existing) await app.vault.createFolder(current);
  }
}

async function saveBinary(
  app: App,
  path: string,
  data: ArrayBuffer
): Promise<void> {
  const normalized = normalizePath(path);
  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing instanceof TFile) {
    await app.vault.modifyBinary(existing, data);
    return;
  }
  await app.vault.createBinary(normalized, data);
}

async function saveImages(
  app: App,
  settings: YueSettings,
  client: BackendClient,
  result: ExtractResult
): Promise<string[]> {
  if (!settings.saveImages || result.content_type !== "image") return [];
  const imageUrls = result.images ?? [];
  if (imageUrls.length === 0) return [];

  const folder = normalizePath(
    `${settings.attachmentFolder}/${safePathSegment(result.video_id, "item")}`
  );
  await ensureFolder(app, folder);
  const paths: string[] = [];
  for (let index = 0; index < imageUrls.length; index++) {
    const imageUrl = imageUrls[index];
    if (!imageUrl) continue;
    const extension = fileExtensionFromUrl(client.mediaUrl(imageUrl));
    const filename = `image-${String(index + 1).padStart(2, "0")}.${extension}`;
    const path = normalizePath(`${folder}/${filename}`);
    const bytes = await client.download(imageUrl);
    await saveBinary(app, path, bytes);
    paths.push(path);
  }
  return paths;
}

function noteBody(
  result: ExtractResult,
  sourceUrl: string,
  imagePaths: string[]
): string {
  const importedAt = new Date().toISOString();
  const author = result.author?.trim() || "未知作者";
  const transcript = result.text?.trim() || "（未提取到文字）";
  const transcriptSource = result.transcript_source || "unknown";
  const lines = [
    "---",
    `douyin_id: ${yamlString(result.video_id)}`,
    `source_url: ${yamlString(sourceUrl)}`,
    `author: ${yamlString(author)}`,
    `content_type: ${yamlString(result.content_type)}`,
    `transcript_source: ${yamlString(transcriptSource)}`,
    `imported_at: ${yamlString(importedAt)}`,
    "tags:",
    "  - douyin",
    "  - knowledge",
    "---",
    "",
    `# ${result.title?.trim() || `抖音内容 ${result.video_id}`}`,
    "",
    "> [!info] 来源信息",
    `> - 作者：${author}`,
    `> - 作品 ID：${result.video_id}`,
    `> - [打开原内容](${sourceUrl})`,
    `> - 文字来源：${transcriptSource}`,
    "",
  ];

  if (imagePaths.length > 0) {
    lines.push("## 图片", "");
    for (const path of imagePaths) lines.push(`![[${path}]]`);
    lines.push("");
  }

  lines.push("## 文案", "", transcript, "");
  return lines.join("\n");
}

export async function writeKnowledgeNote(
  app: App,
  settings: YueSettings,
  client: BackendClient,
  result: ExtractResult,
  sourceUrl: string
): Promise<TFile> {
  await ensureFolder(app, settings.noteFolder);
  const imagePaths = await saveImages(app, settings, client, result);
  const title = safePathSegment(result.title, `douyin-${result.video_id}`);
  const filename = safePathSegment(`${title}-${result.video_id}`, result.video_id);
  const path = normalizePath(`${settings.noteFolder}/${filename}.md`);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) return existing;
  return app.vault.create(path, noteBody(result, sourceUrl, imagePaths));
}

