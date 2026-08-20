/* ============================================================
   main.js — 应用入口：状态、装配、调度
   ============================================================ */

import {
  DEFAULTS,
  DEFAULT_HTML,
  EXAMPLES,
  STORAGE_KEY,
} from "./config.js";
import { loadStore, saveStore, debounce } from "./utils.js";
import { createEditor } from "./editor.js";
import { createPreview } from "./preview.js";
import { createCapture } from "./capture.js";
import { createUi } from "./ui.js";
import { createRulers } from "./ruler.js";

/* ---------- 状态（合并本地存档） ---------- */
const stored = loadStore(STORAGE_KEY);
const state = {
  ...DEFAULTS,
  ...(stored && typeof stored === "object" ? stored : {}),
};
if (typeof state.html !== "string" || !state.html) {
  state.html = DEFAULT_HTML;
}

const persist = debounce(() => saveStore(STORAGE_KEY, state), 400);

/* ---------- 模块 ---------- */
const $editor = document.getElementById("editor");
const frame = document.getElementById("frame");

const preview = createPreview(frame, {
  getState: () => state,
  onSize: (size) => {
    ui.updateStats(size);
    rulers.update(size);
  },
  onReady: () => {
    ui.setOverlay(null);
    ui.setEmpty(state.html.trim() === "");
  },
  onFatal: (msg) => {
    ui.setOverlay(null);
    ui.showError(new Error(msg));
  },
});

const rulers = createRulers({
  corner: document.getElementById("ruler-corner"),
  rulerX: document.getElementById("ruler-x"),
  rulerY: document.getElementById("ruler-y"),
});

const actions = {};
const ui = createUi({
  getState: () => state,
  setSetting,
  onExample,
  onClear,
  actions,
});

const capture = createCapture({
  preview,
  getState: () => state,
  onStart: () => {
    ui.hideError();
    ui.setOverlay("正在生成…");
  },
  onFinish: () => ui.setOverlay(null),
  onError: (err) => {
    ui.showError(err);
    ui.toast(err.message, "error");
  },
  toast: ui.toast,
});

actions.download = () => {
  flushRebuild();
  return capture.download();
};
actions.copy = () => {
  flushRebuild();
  return capture.copy();
};

/* ---------- 编辑器 ---------- */
const editor = createEditor($editor, {
  onChange: (value) => {
    state.html = value;
    scheduleRebuild();
    persist();
  },
  onQuickRun: actions.download,
});

/* ---------- 重建调度 ---------- */
let dirty = false;

function doRebuild() {
  dirty = false;
  ui.setOverlay("加载预览…");
  preview.rebuild(state);
}

const debouncedRebuild = debounce(doRebuild, 350);

function scheduleRebuild() {
  dirty = true;
  debouncedRebuild();
}

/** 下载/复制前先同步最新内容 */
function flushRebuild() {
  if (!dirty) return;
  debouncedRebuild.cancel();
  doRebuild();
}

/* ---------- 设置变更 ---------- */
function setSetting(key, value) {
  if (state[key] === value) return;
  state[key] = value;
  persist();

  switch (key) {
    case "widthMode":
      ui.syncControls();
      preview.applyWidth();
      scheduleRebuild(); // srcdoc 中注入的宽度样式变化
      break;
    case "fixedWidth":
      preview.applyWidth();
      ui.updateStats();
      break;
    case "background":
    case "customBg":
    case "runScripts":
      scheduleRebuild(); // srcdoc 中注入的样式/脚本策略变化
      break;
    case "scale":
    case "format":
      ui.updateStats();
      break;
  }
}

/* ---------- 示例 / 清空 ---------- */
function onExample(name) {
  const ex = EXAMPLES.find((e) => e.name === name);
  if (!ex) return;
  state.html = ex.html;
  editor.setValue(ex.html);
  scheduleRebuild();
  persist();
}

function onClear() {
  editor.clear(); // 内部会触发 onChange
}

/* ---------- 启动 ---------- */
editor.setValue(state.html);
ui.syncControls();
ui.setOverlay("加载预览…");
preview.rebuild(state);
