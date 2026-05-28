var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MeimaidReaderPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE_SOFTVIEW = "softview-view";
var MeimaidReaderPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerView(
      VIEW_TYPE_SOFTVIEW,
      (leaf) => new MeimaidReaderView(leaf, this)
    );
    this.addRibbonIcon("book-open-text", "Open current note in SoftView", () => {
      const file = this.getActiveMarkdownFile();
      if (!file) {
        new import_obsidian.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u7BC7 Markdown \u7B14\u8BB0");
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
      }
    });
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_SOFTVIEW);
  }
  getActiveMarkdownFile() {
    const markdownView = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    const file = markdownView == null ? void 0 : markdownView.file;
    if (file instanceof import_obsidian.TFile && file.extension === "md") {
      return file;
    }
    return null;
  }
  async openReader(file) {
    const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SOFTVIEW)[0];
    const leaf = existingLeaf != null ? existingLeaf : this.app.workspace.getLeaf("split");
    await leaf.setViewState({
      type: VIEW_TYPE_SOFTVIEW,
      active: true,
      state: {
        filePath: file.path,
        resetHistory: true
      }
    });
    this.app.workspace.revealLeaf(leaf);
  }
};
var MeimaidReaderView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.filePath = "";
    this.followActiveFile = false;
    this.articleEl = null;
    this.readerTitleEl = null;
    this.followInputEl = null;
    this.backButtonEl = null;
    this.scrollEl = null;
    this.historyStack = [];
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
  async setState(state, result) {
    var _a, _b;
    await super.setState(state, result);
    if (state.resetHistory || state.filePath && state.filePath !== this.filePath) {
      this.historyStack = [];
    }
    this.filePath = (_a = state.filePath) != null ? _a : "";
    this.followActiveFile = (_b = state.followActiveFile) != null ? _b : false;
    this.syncFollowInput();
    await this.render();
  }
  getState() {
    return {
      filePath: this.filePath,
      followActiveFile: this.followActiveFile
    };
  }
  async onOpen() {
    const contentEl = this.containerEl.children[1];
    contentEl.empty();
    const rootEl = contentEl.createDiv({ cls: "meimaid-reader-view" });
    const toolbarEl = rootEl.createDiv({ cls: "meimaid-reader-toolbar" });
    this.readerTitleEl = toolbarEl.createDiv({ cls: "meimaid-reader-title" });
    const actionsEl = toolbarEl.createDiv({ cls: "meimaid-reader-actions" });
    this.backButtonEl = actionsEl.createEl("button", {
      cls: "meimaid-reader-button",
      text: "\u8FD4\u56DE\u4E0A\u4E00\u7BC7"
    });
    const followLabel = actionsEl.createEl("label", {
      cls: "meimaid-reader-toggle"
    });
    this.followInputEl = followLabel.createEl("input", {
      cls: "meimaid-reader-toggle-input"
    });
    this.followInputEl.type = "checkbox";
    this.followInputEl.checked = this.followActiveFile;
    followLabel.createSpan({ text: "\u8DDF\u968F\u5F53\u524D\u7B14\u8BB0" });
    const refreshButton = actionsEl.createEl("button", {
      cls: "meimaid-reader-button meimaid-reader-icon-button",
      attr: {
        "aria-label": "\u5237\u65B0\u9605\u8BFB\u89C6\u56FE",
        title: "\u5237\u65B0\u9605\u8BFB\u89C6\u56FE"
      }
    });
    (0, import_obsidian.setIcon)(refreshButton, "refresh-cw");
    this.backButtonEl.addEventListener("click", () => {
      void this.goBack();
    });
    refreshButton.addEventListener("click", () => {
      void this.render();
    });
    this.followInputEl.addEventListener("change", () => {
      var _a, _b;
      this.followActiveFile = (_b = (_a = this.followInputEl) == null ? void 0 : _a.checked) != null ? _b : false;
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
        if (this.followActiveFile && file instanceof import_obsidian.TFile && file.extension === "md") {
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
      this.setTitleText("\u672A\u9009\u62E9 Markdown \u539F\u6587");
      this.articleEl.createEl("p", {
        text: "\u8BF7\u5148\u6253\u5F00\u4E00\u7BC7 Markdown \u7B14\u8BB0\uFF0C\u518D\u8FD0\u884C SoftView \u547D\u4EE4\u3002"
      });
      return;
    }
    this.setTitleText(file.name);
    try {
      const markdown = await this.app.vault.read(file);
      await import_obsidian.MarkdownRenderer.render(
        this.app,
        markdown,
        this.articleEl,
        file.path,
        this
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.articleEl.empty();
      this.articleEl.createEl("h2", { text: "SoftView \u6E32\u67D3\u5931\u8D25" });
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
  async followFile(file) {
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
  async handleInternalLinkClick(event) {
    var _a, _b;
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const linkEl = target.closest("a.internal-link");
    if (!(linkEl instanceof HTMLAnchorElement) || !((_a = this.articleEl) == null ? void 0 : _a.contains(linkEl))) {
      return;
    }
    const sourceFile = this.getFile();
    const sourcePath = (_b = sourceFile == null ? void 0 : sourceFile.path) != null ? _b : "";
    const rawTarget = linkEl.getAttribute("data-href") || linkEl.getAttribute("href");
    if (!rawTarget) {
      return;
    }
    event.preventDefault();
    const linkPath = this.getLinkPath(rawTarget);
    const linkedFile = linkPath ? this.app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath) : sourceFile;
    if (linkedFile instanceof import_obsidian.TFile && linkedFile.extension === "md") {
      await this.navigateToFile(linkedFile);
      return;
    }
    new import_obsidian.Notice(`\u627E\u4E0D\u5230\u94FE\u63A5\u76EE\u6807\uFF1A${rawTarget}`);
  }
  async navigateToFile(file) {
    var _a, _b;
    if (file.path === this.filePath) {
      return;
    }
    if (this.filePath) {
      this.historyStack.push({
        filePath: this.filePath,
        scrollTop: (_b = (_a = this.scrollEl) == null ? void 0 : _a.scrollTop) != null ? _b : 0
      });
    }
    this.filePath = file.path;
    await this.render();
    this.restoreScroll(0);
  }
  getLinkPath(rawTarget) {
    const decodedTarget = this.safeDecode(rawTarget);
    return decodedTarget.replace(/^obsidian:\/\/open\?.*file=/, "").split("#")[0].split("^")[0].trim();
  }
  safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }
  getFile() {
    if (!this.filePath) {
      return null;
    }
    const file = this.app.vault.getAbstractFileByPath(this.filePath);
    if (file instanceof import_obsidian.TFile && file.extension === "md") {
      return file;
    }
    return null;
  }
  setTitleText(title) {
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
  restoreScroll(scrollTop) {
    window.setTimeout(() => {
      if (this.scrollEl) {
        this.scrollEl.scrollTop = scrollTop;
      }
    }, 0);
  }
};
