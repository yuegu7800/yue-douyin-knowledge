import { Notice, Plugin, TFile } from "obsidian";
import { BackendClient } from "./backend";
import {
  DEFAULT_SETTINGS,
  type BatchSummary,
  type YueSettings,
} from "./contracts";
import { describeError } from "./errors";
import { DiscoveryModal, ImportModal } from "./modals";
import { writeKnowledgeNote } from "./note-writer";
import { YueSettingsTab } from "./settings-tab";

interface ImportCandidate {
  input: string;
  knownId?: string;
}

export default class YueDouyinKnowledgePlugin extends Plugin {
  override settings: YueSettings = { ...DEFAULT_SETTINGS };
  private statusBarEl: HTMLElement | null = null;

  override async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new YueSettingsTab(this.app, this));

    this.addRibbonIcon("download", "导入抖音知识", () => {
      new ImportModal(this.app, this).open();
    });
    this.addCommand({
      id: "import-douyin-knowledge",
      name: "导入抖音知识",
      callback: () => new ImportModal(this.app, this).open(),
    });
    this.addCommand({
      id: "discover-douyin-knowledge",
      name: "搜索或发现抖音知识",
      callback: () => new DiscoveryModal(this.app, this).open(),
    });
    this.addCommand({
      id: "check-local-service",
      name: "检查本地服务连接",
      callback: () => void this.showHealthNotice(),
    });

    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.setText("抖音知识：检查中");
    window.setTimeout(() => void this.refreshHealthStatus(), 1500);
  }

  override onunload(): void {
    this.statusBarEl = null;
  }

  client(): BackendClient {
    return new BackendClient({
      serverUrl: this.settings.serverUrl,
      timeoutSeconds: this.settings.requestTimeoutSeconds,
    });
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Partial<YueSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  hasDouyinId(id: string): boolean {
    const target = String(id || "").trim();
    if (!target) return false;
    return this.app.vault.getMarkdownFiles().some((file) => {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      return String(frontmatter?.douyin_id ?? "").trim() === target;
    });
  }

  showError(title: string, error: unknown): void {
    new Notice(`${title}\n\n${describeError(error)}`, 9000);
  }

  async showHealthNotice(): Promise<void> {
    try {
      const health = await this.client().health();
      if (!health.success) throw new Error("本地服务没有返回正常状态。");
      const ready = health.pipeline_ready !== false;
      const missing: string[] = [];
      if (health.checks?.ffmpeg?.available === false) missing.push("FFmpeg");
      if (health.checks?.faster_whisper?.available === false) missing.push("faster-whisper");
      if (ready) {
        new Notice("本地服务连接正常。");
      } else {
        new Notice(`本地服务已连接，但缺少：${missing.join("、") || "流水线依赖"}`, 7000);
      }
    } catch (error) {
      this.showError("本地服务连接失败", error);
    }
  }

  private async refreshHealthStatus(): Promise<void> {
    try {
      const health = await this.client().health();
      this.statusBarEl?.setText(
        health.pipeline_ready === false ? "抖音知识：服务未就绪" : "抖音知识：已连接"
      );
    } catch {
      this.statusBarEl?.setText("抖音知识：未连接");
    }
  }

  async importCandidates(
    candidates: ImportCandidate[],
    onProgress?: (message: string) => void
  ): Promise<BatchSummary> {
    const limited = candidates.slice(0, 10);
    const summary: BatchSummary = { created: 0, duplicates: 0, failed: 0 };
    let lastCreated: TFile | null = null;
    const processedIds = new Set<string>();

    for (let index = 0; index < limited.length; index++) {
      const candidate = limited[index];
      if (!candidate) continue;
      onProgress?.(`正在处理 ${index + 1}/${limited.length}`);
      try {
        let knownId = candidate.knownId?.trim();
        let sourceUrl = candidate.input;
        if (!knownId) {
          const info = await this.client().info(candidate.input);
          knownId = info.video_id;
          sourceUrl = info.source_url || candidate.input;
        }
        if (knownId && (processedIds.has(knownId) || this.hasDouyinId(knownId))) {
          summary.duplicates++;
          continue;
        }

        const client = this.client();
        const result = await client.extract(
          candidate.input,
          this.settings.whisperModel,
          this.settings.transcriptMode
        );
        if (!result.video_id) throw new Error("本地服务没有返回作品 ID。");
        if (processedIds.has(result.video_id) || this.hasDouyinId(result.video_id)) {
          summary.duplicates++;
          continue;
        }
        processedIds.add(result.video_id);
        lastCreated = await writeKnowledgeNote(
          this.app,
          this.settings,
          client,
          result,
          result.source_url || sourceUrl
        );
        summary.created++;
        summary.lastCreatedPath = lastCreated.path;
      } catch (error) {
        summary.failed++;
        this.showError(`第 ${index + 1} 条导入失败`, error);
      }
    }

    onProgress?.("处理完成");
    new Notice(
      `知识入库完成：新增 ${summary.created}，重复 ${summary.duplicates}，失败 ${summary.failed}`,
      6000
    );
    if (lastCreated && this.settings.openAfterCreate) {
      await this.app.workspace.getLeaf(false).openFile(lastCreated);
    }
    return summary;
  }
}
