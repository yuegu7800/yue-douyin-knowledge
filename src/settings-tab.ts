import {
  PluginSettingTab,
  Setting,
  type App,
  type SettingDefinitionItem,
} from "obsidian";
import {
  DEFAULT_SETTINGS,
  WHISPER_MODELS,
  type TranscriptMode,
  type YueSettings,
  type WhisperModel,
} from "./contracts";
import type YueDouyinKnowledgePlugin from "./main";

export class YueSettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: YueDouyinKnowledgePlugin) {
    super(app, plugin);
  }

  override getSettingDefinitions(): SettingDefinitionItem<keyof YueSettings>[] {
    return [
      {
        type: "group",
        heading: "Yue Douyin Knowledge",
        items: [
          {
            name: "使用说明",
            desc: "插件只把内容写入当前知识库；解析、OCR 和转写由你电脑上的本地服务完成。",
          },
          {
            name: "本地服务地址",
            desc: "默认服务运行在 http://127.0.0.1:5050。",
            control: {
              type: "text",
              key: "serverUrl",
              defaultValue: DEFAULT_SETTINGS.serverUrl,
              placeholder: DEFAULT_SETTINGS.serverUrl,
              validate: (value) => {
                try {
                  const parsed = new URL(value.trim());
                  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                    return "服务地址只能使用 HTTP 或 HTTPS。";
                  }
                  if (parsed.username || parsed.password) {
                    return "服务地址不能包含账号或密码。";
                  }
                  return undefined;
                } catch {
                  return "服务地址格式不正确。";
                }
              },
            },
          },
          {
            name: "检查连接",
            desc: "确认本地解析和转写服务是否已经就绪。",
            action: () => void this.plugin.showHealthNotice(),
          },
          {
            name: "笔记文件夹",
            control: {
              type: "text",
              key: "noteFolder",
              defaultValue: DEFAULT_SETTINGS.noteFolder,
            },
          },
          {
            name: "图片附件文件夹",
            control: {
              type: "text",
              key: "attachmentFolder",
              defaultValue: DEFAULT_SETTINGS.attachmentFolder,
            },
          },
          {
            name: "转写模型",
            desc: "small 适合多数中文内容；模型越大，速度越慢。",
            control: {
              type: "dropdown",
              key: "whisperModel",
              defaultValue: DEFAULT_SETTINGS.whisperModel,
              options: {
                tiny: "tiny",
                base: "base",
                small: "small",
                medium: "medium",
                "large-v3": "large-v3",
              },
            },
          },
          {
            name: "文字提取方式",
            control: {
              type: "dropdown",
              key: "transcriptMode",
              defaultValue: DEFAULT_SETTINGS.transcriptMode,
              options: {
                auto: "智能自动",
                ocr: "字幕 OCR 优先",
                asr: "语音转写",
              },
            },
          },
          {
            name: "保存图文图片",
            desc: "视频和音频不会保留；图文图片可写入知识库附件目录。",
            control: {
              type: "toggle",
              key: "saveImages",
              defaultValue: DEFAULT_SETTINGS.saveImages,
            },
          },
          {
            name: "导入后打开笔记",
            control: {
              type: "toggle",
              key: "openAfterCreate",
              defaultValue: DEFAULT_SETTINGS.openAfterCreate,
            },
          },
        ],
      },
    ];
  }

  override getControlValue(key: string): unknown {
    if (!Object.prototype.hasOwnProperty.call(this.plugin.settings, key)) {
      return undefined;
    }
    return this.plugin.settings[key as keyof YueSettings];
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    switch (key as keyof YueSettings) {
      case "serverUrl":
        if (typeof value === "string") this.plugin.settings.serverUrl = value.trim();
        break;
      case "noteFolder":
        if (typeof value === "string") {
          this.plugin.settings.noteFolder = value.trim() || DEFAULT_SETTINGS.noteFolder;
        }
        break;
      case "attachmentFolder":
        if (typeof value === "string") {
          this.plugin.settings.attachmentFolder =
            value.trim() || DEFAULT_SETTINGS.attachmentFolder;
        }
        break;
      case "whisperModel":
        if (
          typeof value === "string" &&
          WHISPER_MODELS.includes(value as WhisperModel)
        ) {
          this.plugin.settings.whisperModel = value as WhisperModel;
        }
        break;
      case "transcriptMode":
        if (value === "auto" || value === "ocr" || value === "asr") {
          this.plugin.settings.transcriptMode = value;
        }
        break;
      case "saveImages":
        if (typeof value === "boolean") this.plugin.settings.saveImages = value;
        break;
      case "openAfterCreate":
        if (typeof value === "boolean") this.plugin.settings.openAfterCreate = value;
        break;
      case "requestTimeoutSeconds":
        if (typeof value === "number" && Number.isFinite(value)) {
          this.plugin.settings.requestTimeoutSeconds = value;
        }
        break;
    }
    await this.plugin.saveSettings();
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName("Yue Douyin Knowledge").setHeading();
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
