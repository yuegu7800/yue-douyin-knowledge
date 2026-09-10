import { PluginSettingTab, Setting, type App } from "obsidian";
import {
  WHISPER_MODELS,
  type TranscriptMode,
  type WhisperModel,
} from "./contracts";
import type YueDouyinKnowledgePlugin from "./main";

export class YueSettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: YueDouyinKnowledgePlugin) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Yue Douyin Knowledge" });
    containerEl.createEl("p", {
      text: "插件只把内容写入当前知识库；解析、OCR 和转写由你电脑上的本地服务完成。",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("本地服务地址")
      .setDesc("默认服务运行在 http://127.0.0.1:5050。")
      .addText((text) =>
        text
          .setPlaceholder("http://127.0.0.1:5050")
          .setValue(this.plugin.settings.serverUrl)
          .onChange(async (value) => {
            this.plugin.settings.serverUrl = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText("检查连接").onClick(async () => {
          button.setDisabled(true);
          await this.plugin.showHealthNotice();
          button.setDisabled(false);
        })
      );

    new Setting(containerEl)
      .setName("笔记文件夹")
      .addText((text) =>
        text.setValue(this.plugin.settings.noteFolder).onChange(async (value) => {
          this.plugin.settings.noteFolder = value.trim() || "抖音知识库";
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("图片附件文件夹")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.attachmentFolder)
          .onChange(async (value) => {
            this.plugin.settings.attachmentFolder =
              value.trim() || "抖音知识库/附件";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("转写模型")
      .setDesc("small 适合多数中文内容；模型越大，速度越慢。")
      .addDropdown((dropdown) => {
        for (const model of WHISPER_MODELS) dropdown.addOption(model, model);
        dropdown
          .setValue(this.plugin.settings.whisperModel)
          .onChange(async (value) => {
            this.plugin.settings.whisperModel = value as WhisperModel;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("文字提取方式")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("auto", "智能自动")
          .addOption("ocr", "字幕 OCR 优先")
          .addOption("asr", "语音转写")
          .setValue(this.plugin.settings.transcriptMode)
          .onChange(async (value) => {
            this.plugin.settings.transcriptMode = value as TranscriptMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("保存图文图片")
      .setDesc("视频和音频不会保留；图文图片可写入知识库附件目录。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.saveImages).onChange(async (value) => {
          this.plugin.settings.saveImages = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("导入后打开笔记")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openAfterCreate)
          .onChange(async (value) => {
            this.plugin.settings.openAfterCreate = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
