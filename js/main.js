/* ============================================================
   main.js — 应用入口：状态、装配、调度
   ============================================================ */

import {
  DEFAULTS,
  DEFAULT_HTML,
  STORAGE_KEY,
} from "./config.js";
import { loadStore, saveStore, debounce } from "./utils.js";
import { loadPresets, savePresets, upsertPreset, removePreset } from "./presets.js";
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
  scroll: document.getElementById("stage-scroll"),
});

const actions = {};
const ui = createUi({
  getState: () => state,
  setSetting,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  onRefresh,
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
    markChanged(); // 关闭自动刷新时仅标记，点「刷新」手动重建
    persist();
    ui.clearPresetSelection(); // 内容已偏离当前预设
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

/** 内容/设置变更：自动刷新开启时调度重建，关闭时仅标记待刷新 */
function markChanged() {
  dirty = true;
  if (state.autoRefresh) debouncedRebuild();
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
      markChanged(); // srcdoc 中注入的宽度样式变化
      break;
    case "fixedWidth":
      preview.applyWidth();
      ui.updateStats();
      break;
    case "background":
    case "customBg":
    case "runScripts":
      markChanged(); // srcdoc 中注入的样式/脚本策略变化
      break;
    case "autoRefresh":
      // 重新开启自动刷新时，把积压的未渲染变更补渲一次
      if (value && dirty) scheduleRebuild();
      break;
    case "scale":
    case "format":
      ui.updateStats();
      break;
  }
}

/* ---------- 预设 / 清空 ---------- */
let presets = loadPresets();

/** 从下拉框加载预设：把其代码写入编辑器 */
function onLoadPreset(preset) {
  if (!preset || typeof preset.html !== "string") return;
  state.html = preset.html;
  editor.setValue(preset.html);
  markChanged();
  persist();
  ui.renderPresets(presets, preset.id); // 保持选中态，删除按钮可用
}

/** 把当前代码保存为预设（同名覆盖，需确认） */
function onSavePreset(name) {
  if (!state.html || !state.html.trim()) {
    ui.toast("代码为空，无法保存预设", "warn");
    return;
  }
  const existing = presets.find((p) => p.name === name);
  if (existing && !confirm(`预设「${name}」已存在，是否覆盖？`)) return;
  const { list, preset } = upsertPreset(presets, {
    id: existing ? existing.id : null,
    name,
    html: state.html,
  });
  presets = list;
  savePresets(presets);
  ui.renderPresets(presets, preset.id);
  ui.toast(`已保存预设「${preset.name}」`);
}

/** 删除选中预设 */
function onDeletePreset(id) {
  const target = presets.find((p) => p.id === id);
  presets = removePreset(presets, id);
  savePresets(presets);
  ui.renderPresets(presets, null);
  ui.toast(target ? `已删除预设「${target.name}」` : "已删除预设", "warn");
}

function onClear() {
  editor.clear(); // 内部会触发 onChange
}

/** 顶栏「刷新」：立即按当前代码与设置重建预览（重新加载资源与脚本） */
function onRefresh() {
  doRebuild();
}

/* ---------- 启动 ---------- */
editor.setValue(state.html);
ui.syncControls();
ui.renderPresets(presets, null);
ui.setOverlay("加载预览…");
preview.rebuild(state);
