const DOUYIN_HOSTS = new Set([
  "douyin.com",
  "www.douyin.com",
  "v.douyin.com",
  "iesdouyin.com",
  "www.iesdouyin.com",
]);

export function normalizeServerUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("后端地址格式不正确。");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("后端地址只能使用 HTTP 或 HTTPS。");
  }
  if (parsed.username || parsed.password) {
    throw new Error("后端地址不能包含账号或密码。");
  }
  return trimmed;
}

export function parseShareInputs(raw: string, maximum = 10): string[] {
  const matches = raw.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const accepted: string[] = [];
  for (const candidate of matches) {
    const cleaned = candidate.replace(/[，。！？、；：)）\]}】]+$/g, "");
    try {
      const parsed = new URL(cleaned);
      const host = parsed.hostname.toLowerCase();
      if (
        DOUYIN_HOSTS.has(host) ||
        host.endsWith(".douyin.com") ||
        host.endsWith(".iesdouyin.com")
      ) {
        accepted.push(cleaned);
      }
    } catch {
      // Ignore malformed URL fragments and continue scanning the batch.
    }
  }
  return [...new Set(accepted)].slice(0, maximum);
}

export function safePathSegment(value: string, fallback: string): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

export function yamlString(value: string): string {
  return JSON.stringify(value.replace(/\u0000/g, ""));
}

export function joinUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl, `${baseUrl.replace(/\/+$/, "")}/`).toString();
}

export function fileExtensionFromUrl(value: string): string {
  try {
    const extension = new URL(value).pathname.match(/\.(jpe?g|png|webp|gif)$/i)?.[1];
    if (!extension) return "jpg";
    return extension.toLowerCase() === "jpeg" ? "jpg" : extension.toLowerCase();
  } catch {
    return "jpg";
  }
}

