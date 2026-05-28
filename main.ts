import {
  ItemView,
  MarkdownRenderer,
  MarkdownView,
  Notice,
  Plugin,
  setIcon,
  TFile,
  ViewStateResult,
  WorkspaceLeaf,
} from "obsidian";

const VIEW_TYPE_SOFTVIEW = "softview-view";

export default class MeimaidReaderPlugin extends Plugin {
  async onload() {
    this.registerView(
      VIEW_TYPE_SOFTVIEW,
      (leaf) => new MeimaidReaderView(leaf, this)
    );

    this.addRibbonIcon("book-open-text", "Open current note in SoftView", () => {
      const file = this.getActiveMarkdownFile();

      if (!file) {
        new Notice("请先打开一篇 Markdown 笔记");
        return;
      }

      void this.openReader(file);
    });

    this.addCommand({
      id: "open-current-note",
      name: "Open current note",
      checkCallback: (checking) => {
        const file = this.getActiveMarkdownFile();
        if (!file) {
          return false;
        }

        if (!checking) {
          void this.openReader(file);
        }

        return true;
      },
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_SOFTVIEW);
  }

  getActiveMarkdownFile(): TFile | null {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    const file = markdownView?.file;

    if (file instanceof TFile && file.extension === "md") {
      return file;
    }

    return null;
  }

  async openReader(file: TFile) {
    const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SOFTVIEW)[0];
    const leaf = existingLeaf ?? this.app.workspace.getLeaf("split");

    await leaf.setViewState({
      type: VIEW_TYPE_SOFTVIEW,
      active: true,
      state: {
        filePath: file.path,
        resetHistory: true,
      },
    });

    this.app.workspace.revealLeaf(leaf);
  }
}

class MeimaidReaderView extends ItemView {
  private plugin: MeimaidReaderPlugin;
  private filePath = "";
  private followActiveFile = false;
  private articleEl: HTMLElement | null = null;
  private readerTitleEl: HTMLElement | null = null;
  private followInputEl: HTMLInputElement | null = null;
  private backButtonEl: HTMLButtonElement | null = null;
  private scrollEl: HTMLElement | null = null;
  private historyStack: { filePath: string; scrollTop: number }[] = [];

  constructor(leaf: WorkspaceLeaf, plugin: MeimaidReaderPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_SOFTVIEW;
  }

  getDisplayText() {
    return this.filePath ? `SoftView: ${this.filePath}` : "SoftView";
  }

  getIcon() {
    return "book-open-text";
  }

  async setState(state: { filePath?: string; followActiveFile?: boolean; resetHistory?: boolean }, result: ViewStateResult) {
    await super.setState(state, result);
    if (state.resetHistory || (state.filePath && state.filePath !== this.filePath)) {
      this.historyStack = [];
    }
    this.filePath = state.filePath ?? "";
    this.followActiveFile = state.followActiveFile ?? false;
    this.syncFollowInput();
    await this.render();
  }

  getState() {
    return {
      filePath: this.filePath,
      followActiveFile: this.followActiveFile,
    };
  }

  async onOpen() {
    const contentEl = this.containerEl.children[1] as HTMLElement;
    contentEl.empty();

    const rootEl = contentEl.createDiv({ cls: "meimaid-reader-view" });
    const toolbarEl = rootEl.createDiv({ cls: "meimaid-reader-toolbar" });

    this.readerTitleEl = toolbarEl.createDiv({ cls: "meimaid-reader-title" });

    const actionsEl = toolbarEl.createDiv({ cls: "meimaid-reader-actions" });
    this.backButtonEl = actionsEl.createEl("button", {
      cls: "meimaid-reader-button",
      text: "返回上一篇",
    });

    const followLabel = actionsEl.createEl("label", {
      cls: "meimaid-reader-toggle",
    });
    this.followInputEl = followLabel.createEl("input", {
      cls: "meimaid-reader-toggle-input",
    });
    this.followInputEl.type = "checkbox";
    this.followInputEl.checked = this.followActiveFile;
    followLabel.createSpan({ text: "跟随当前笔记" });

    const refreshButton = actionsEl.createEl("button", {
      cls: "meimaid-reader-button meimaid-reader-icon-button",
      attr: {
        "aria-label": "刷新阅读视图",
        title: "刷新阅读视图",
      },
    });
    setIcon(refreshButton, "refresh-cw");

    this.backButtonEl.addEventListener("click", () => {
      void this.goBack();
    });

    refreshButton.addEventListener("click", () => {
      void this.render();
    });

    this.followInputEl.addEventListener("change", () => {
      this.followActiveFile = this.followInputEl?.checked ?? false;
      if (this.followActiveFile) {
        void this.followCurrentMarkdownFile();
      }
    });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        if (this.followActiveFile) {
          void this.followCurrentMarkdownFile();
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (this.followActiveFile && file instanceof TFile && file.extension === "md") {
          void this.followFile(file);
        }
      })
    );

    this.scrollEl = rootEl.createDiv({ cls: "meimaid-reader-scroll" });
    this.articleEl = this.scrollEl.createDiv({ cls: "meimaid-reader-article markdown-rendered" });

    this.registerDomEvent(this.articleEl, "click", (event) => {
      void this.handleInternalLinkClick(event);
    });

    await this.render();
  }

  async render() {
    if (!this.articleEl) {
      return;
    }

    this.articleEl.empty();
    this.syncBackButton();

    const file = this.getFile();
    if (!file) {
      this.setTitleText("未选择 Markdown 原文");
      this.articleEl.createEl("p", {
        text: "请先打开一篇 Markdown 笔记，再运行 SoftView 命令。",
      });
      return;
    }

    this.setTitleText(file.name);

    try {
      const markdown = await this.app.vault.read(file);
      await MarkdownRenderer.render(
        this.app,
        markdown,
        this.articleEl,
        file.path,
        this
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.articleEl.empty();
      this.articleEl.createEl("h2", { text: "SoftView 渲染失败" });
      this.articleEl.createEl("p", { text: message });
      console.error("SoftView render failed", error);
    }
  }

  async followCurrentMarkdownFile() {
    const file = this.plugin.getActiveMarkdownFile();

    if (!file) {
      return;
    }

    await this.followFile(file);
  }

  async followFile(file: TFile) {
    if (file.path === this.filePath) {
      return;
    }

    this.historyStack = [];
    this.filePath = file.path;
    await this.render();
  }

  async goBack() {
    const previous = this.historyStack.pop();

    if (!previous) {
      return;
    }

    this.filePath = previous.filePath;
    await this.render();
    this.restoreScroll(previous.scrollTop);
  }

  async handleInternalLinkClick(event: MouseEvent) {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const linkEl = target.closest("a.internal-link");

    if (!(linkEl instanceof HTMLAnchorElement) || !this.articleEl?.contains(linkEl)) {
      return;
    }

    const sourceFile = this.getFile();
    const sourcePath = sourceFile?.path ?? "";
    const rawTarget = linkEl.getAttribute("data-href") || linkEl.getAttribute("href");

    if (!rawTarget) {
      return;
    }

    event.preventDefault();

    const linkPath = this.getLinkPath(rawTarget);
    const linkedFile = linkPath
      ? this.app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath)
      : sourceFile;

    if (linkedFile instanceof TFile && linkedFile.extension === "md") {
      await this.navigateToFile(linkedFile);
      return;
    }

    new Notice(`找不到链接目标：${rawTarget}`);
  }

  async navigateToFile(file: TFile) {
    if (file.path === this.filePath) {
      return;
    }

    if (this.filePath) {
      this.historyStack.push({
        filePath: this.filePath,
        scrollTop: this.scrollEl?.scrollTop ?? 0,
      });
    }

    this.filePath = file.path;
    await this.render();
    this.restoreScroll(0);
  }

  getLinkPath(rawTarget: string) {
    const decodedTarget = this.safeDecode(rawTarget);
    return decodedTarget
      .replace(/^obsidian:\/\/open\?.*file=/, "")
      .split("#")[0]
      .split("^")[0]
      .trim();
  }

  safeDecode(value: string) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  getFile(): TFile | null {
    if (!this.filePath) {
      return null;
    }

    const file = this.app.vault.getAbstractFileByPath(this.filePath);

    if (file instanceof TFile && file.extension === "md") {
      return file;
    }

    return null;
  }

  setTitleText(title: string) {
    if (this.readerTitleEl) {
      this.readerTitleEl.setText(title);
    }
  }

  syncFollowInput() {
    if (this.followInputEl) {
      this.followInputEl.checked = this.followActiveFile;
    }
  }

  syncBackButton() {
    if (this.backButtonEl) {
      this.backButtonEl.disabled = this.historyStack.length === 0;
    }
  }

  restoreScroll(scrollTop: number) {
    window.setTimeout(() => {
      if (this.scrollEl) {
        this.scrollEl.scrollTop = scrollTop;
      }
    }, 0);
  }
}
