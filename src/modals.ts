import { Modal, Notice, Setting, type App } from "obsidian";
import type { DiscoveryItem } from "./contracts";
import type YueDouyinKnowledgePlugin from "./main";
import { parseShareInputs } from "./utils";

export class ImportModal extends Modal {
  constructor(app: App, private readonly plugin: YueDouyinKnowledgePlugin) {
    super(app);
  }

  override onOpen(): void {
    this.setTitle("导入抖音知识");
    this.contentEl.addClass("yue-douyin-modal");
    this.contentEl.createEl("p", {
      text: "粘贴分享文案或链接，可一次导入 10 条。已入库作品会自动跳过。",
    });
    const textarea = this.contentEl.createEl("textarea", {
      cls: "yue-douyin-input",
      attr: {
        rows: "8",
        placeholder: "每行粘贴一条抖音分享文案或链接…",
      },
    });
    const progress = this.contentEl.createDiv({ cls: "yue-douyin-progress" });
    const actions = this.contentEl.createDiv({ cls: "yue-douyin-actions" });
    const cancel = actions.createEl("button", { text: "取消" });
    const submit = actions.createEl("button", {
      text: "开始导入",
      cls: "mod-cta",
    });
    cancel.addEventListener("click", () => this.close());
    submit.addEventListener("click", () => {
      const inputs = parseShareInputs(textarea.value, 10);
      if (inputs.length === 0) {
        new Notice("没有找到有效的抖音链接。");
        return;
      }
      textarea.disabled = true;
      submit.disabled = true;
      cancel.disabled = true;
      void this.plugin
        .importCandidates(
          inputs.map((input) => ({ input })),
          (message) => progress.setText(message)
        )
        .then(() => this.close())
        .finally(() => {
          textarea.disabled = false;
          submit.disabled = false;
          cancel.disabled = false;
        });
    });
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

type DiscoveryMode = "search" | "related";

export class DiscoveryModal extends Modal {
  private mode: DiscoveryMode = "search";
  private resultsEl!: HTMLDivElement;
  private actionEl!: HTMLDivElement;
  private inputEl!: HTMLInputElement;
  private busy = false;

  constructor(app: App, private readonly plugin: YueDouyinKnowledgePlugin) {
    super(app);
  }

  override onOpen(): void {
    this.setTitle("发现并导入知识");
    this.contentEl.addClass("yue-douyin-modal", "yue-douyin-discovery");

    new Setting(this.contentEl)
      .setName("发现方式")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("search", "关键词搜索")
          .addOption("related", "相关推荐")
          .setValue(this.mode)
          .onChange((value) => {
            this.mode = value as DiscoveryMode;
            this.inputEl.placeholder =
              this.mode === "search" ? "输入关键词" : "粘贴来源视频链接";
          })
      );

    const searchRow = this.contentEl.createDiv({ cls: "yue-douyin-search-row" });
    this.inputEl = searchRow.createEl("input", {
      type: "text",
      attr: { placeholder: "输入关键词" },
    });
    const searchButton = searchRow.createEl("button", {
      text: "查找",
      cls: "mod-cta",
    });
    searchButton.addEventListener("click", () => void this.discover(searchButton));
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") void this.discover(searchButton);
    });

    this.resultsEl = this.contentEl.createDiv({ cls: "yue-douyin-results" });
    this.actionEl = this.contentEl.createDiv({ cls: "yue-douyin-actions" });
  }

  private async discover(button: HTMLButtonElement): Promise<void> {
    if (this.busy) return;
    const value = this.inputEl.value.trim();
    if (!value) {
      new Notice(this.mode === "search" ? "请输入搜索关键词。" : "请粘贴来源链接。");
      return;
    }
    this.busy = true;
    button.disabled = true;
    this.resultsEl.setText("正在查找…");
    this.actionEl.empty();
    try {
      const response =
        this.mode === "search"
          ? await this.plugin.client().search(value, 20)
          : await this.plugin.client().related(value, 20);
      this.renderResults(response.items ?? []);
    } catch (error) {
      this.plugin.showError("查找失败", error);
      this.resultsEl.setText("未能取得结果，请检查本地服务和登录状态。");
    } finally {
      this.busy = false;
      button.disabled = false;
    }
  }

  private renderResults(items: DiscoveryItem[]): void {
    this.resultsEl.empty();
    this.actionEl.empty();
    if (items.length === 0) {
      this.resultsEl.setText("没有找到结果。");
      return;
    }

    const selected = new Map<string, DiscoveryItem>();
    let selectedCount = 0;
    for (const item of items) {
      const exists = this.plugin.hasDouyinId(item.video_id);
      const row = this.resultsEl.createDiv({
        cls: `yue-douyin-result${exists ? " is-existing" : ""}`,
      });
      const checkbox = row.createEl("input", { type: "checkbox" });
      checkbox.disabled = exists;
      if (!exists && selectedCount < 10) {
        checkbox.checked = true;
        selected.set(item.video_id, item);
        selectedCount++;
      }
      const copy = row.createDiv({ cls: "yue-douyin-result-copy" });
      copy.createDiv({ cls: "yue-douyin-result-title", text: item.title || item.video_id });
      copy.createDiv({
        cls: "yue-douyin-result-meta",
        text: exists
          ? `${item.author || "未知作者"} · 已入库`
          : `${item.author || "未知作者"} · ${item.content_type === "image" ? "图文" : "视频"}`,
      });
      checkbox.addEventListener("change", () => {
        if (checkbox.checked && selected.size >= 10) {
          checkbox.checked = false;
          new Notice("单次最多导入 10 条。");
        } else if (checkbox.checked) {
          selected.set(item.video_id, item);
        } else {
          selected.delete(item.video_id);
        }
        updateButton();
      });
    }

    const importButton = this.actionEl.createEl("button", { cls: "mod-cta" });
    const updateButton = (): void => {
      importButton.setText(`导入选中内容（${selected.size}）`);
      importButton.disabled = selected.size === 0;
    };
    updateButton();
    importButton.addEventListener("click", () => {
      importButton.disabled = true;
      void this.plugin
        .importCandidates(
          [...selected.values()].map((item) => ({
            input: item.source_url,
            knownId: item.video_id,
          })),
          (message) => importButton.setText(message)
        )
        .then(() => this.close())
        .finally(() => {
          importButton.disabled = false;
        });
    });
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}
