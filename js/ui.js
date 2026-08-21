/* ============================================================
   ui.js — 控件绑定、统计、提示条、错误横幅、覆盖层
   ============================================================ */

import { $, $$ } from "./utils.js";
import {
  BACKGROUNDS,
  FORMATS,
  SCALES,
  WIDTH_PRESETS,
  FONT_FORMATS,
} from "./config.js";

/**
 * 初始化 UI。
 * @param {{
 *   getState:()=>object,
 *   setSetting:(key:string,value:unknown)=>void,
 *   onLoadPreset:(preset:{id:string,name:string,html:string})=>void,
 *   onSavePreset:(name:string)=>void,
 *   onDeletePreset:(id:string)=>void,
 *   onRefresh:()=>void,
 *   onClear:()=>void,
 *   getActivePreset:()=>{id:string,name:string,html:string}|null,
 *   actions:{download:()=>void, copy:()=>void},
 * }} deps
 */
export function createUi({
  getState,
  setSetting,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  onRefresh,
  onClear,
  getActivePreset,
  actions,
}) {
  /* ---------- 元素 ---------- */
  const el = {
    presetSelect: $("#preset-select"),
    savePreset: $("#btn-save-preset"),
    delPreset: $("#btn-del-preset"),
    presetDialog: $("#preset-dialog"),
    presetForm: $("#preset-form"),
    presetName: $("#preset-name"),
    presetCancel: $("#preset-cancel"),
    refresh: $("#btn-refresh"),
    autoRefresh: $("#auto-refresh"),
    clear: $("#btn-clear"),
    download: $("#btn-download"),
    copy: $("#btn-copy"),
    widthAuto: $("#width-auto"),
    widthFixed: $("#width-fixed"),
    fixedRow: $("#fixed-row"),
    presets: $("#presets"),
    fixedWidth: $("#fixed-width"),
    bg: $("#bg-select"),
    customBg: $("#custom-bg"),
    scale: $("#scale-select"),
    format: $("#format-select"),
    runScripts: $("#run-scripts"),
    qualityRange: $("#quality-range"),
    qualityVal: $("#quality-val"),
    fontFormat: $("#font-format"),
    skipFonts: $("#skip-fonts"),
    includeParams: $("#include-params"),
    cacheBust: $("#cache-bust"),
    placeholderColor: $("#placeholder-color"),
    fontEmbedCss: $("#font-embed-css"),
    filterSelector: $("#filter-selector"),
    extraStyle: $("#extra-style"),
    stats: $("#stats"),
    banner: $("#error-banner"),
    errMsg: $("#err-msg"),
    errClose: $("#err-close"),
    overlay: $("#stage-overlay"),
    overlayText: $("#overlay-text"),
    empty: $("#stage-empty"),
    toasts: $("#toasts"),
    tabs: $("#main-tabs"),
  };

  /* ---------- 静态选项填充 ---------- */
  BACKGROUNDS.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b.value;
    opt.textContent = b.label;
    el.bg.appendChild(opt);
  });
  FORMATS.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.value;
    opt.textContent = f.label;
    el.format.appendChild(opt);
  });
  SCALES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = String(s);
    opt.textContent = `${s}×`;
    el.scale.appendChild(opt);
  });
  FONT_FORMATS.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.value;
    opt.textContent = f.label;
    el.fontFormat.appendChild(opt);
  });
  WIDTH_PRESETS.forEach((w) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.width = String(w);
    chip.textContent = w;
    el.presets.appendChild(chip);
  });

  /* ---------- 同步控件到状态 ---------- */
  function syncControls() {
    const st = getState();
    el.widthAuto.checked = st.widthMode === "auto";
    el.widthFixed.checked = st.widthMode === "fixed";
    el.fixedRow.classList.toggle("hidden", st.widthMode !== "fixed");
    el.fixedWidth.value = st.fixedWidth;
    $$(".chip", el.presets).forEach((c) =>
      c.classList.toggle("is-active", Number(c.dataset.width) === st.fixedWidth)
    );
    el.bg.value = st.background;
    el.customBg.value = st.customBg;
    el.customBg.classList.toggle("hidden", st.background !== "custom");
    el.scale.value = String(st.scale);
    el.format.value = st.format;
    el.runScripts.checked = st.runScripts;
    el.autoRefresh.checked = st.autoRefresh;
    el.qualityRange.value = String(st.quality);
    el.qualityVal.textContent = `${Math.round(st.quality * 100)}%`;
    el.qualityRange.closest(".setting").classList.toggle(
      "is-muted",
      st.format === "png"
    );
    el.fontFormat.value = st.preferredFontFormat;
    el.skipFonts.checked = st.skipFonts;
    el.includeParams.checked = st.includeQueryParams;
    el.cacheBust.checked = st.cacheBust;
    el.placeholderColor.value = st.placeholderColor;
    el.fontEmbedCss.value = st.fontEmbedCSS || "";
    el.filterSelector.value = st.filterSelector || "";
    el.extraStyle.value = st.extraStyle || "";
  }

  /* ---------- 预设（本地存储） ---------- */
  let presetList = [];

  /**
   * 用预设列表重建下拉框。
   * @param {object[]} list
   * @param {string|null} selectedId 选中项 id（如刚保存/加载的预设）
   */
  function renderPresets(list, selectedId = null) {
    presetList = Array.isArray(list) ? list : [];
    el.presetSelect.innerHTML = "";
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "预设…";
    el.presetSelect.appendChild(ph);
    presetList.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      el.presetSelect.appendChild(opt);
    });
    const hasSel = presetList.some((p) => p.id === selectedId);
    el.presetSelect.value = hasSel ? selectedId : "";
    el.delPreset.disabled = !hasSel;
  }

  /** 编辑器内容被用户修改后调用：取消当前预设选中态 */
  function clearPresetSelection() {
    el.presetSelect.value = "";
    el.delPreset.disabled = true;
  }

  el.presetSelect.addEventListener("change", () => {
    const preset = presetList.find((p) => p.id === el.presetSelect.value);
    if (preset) onLoadPreset(preset);
  });

  el.savePreset.addEventListener("click", () => {
    // 打开/编辑中的预设：预填其名称并全选，便于直接覆盖或改名
    const current = getActivePreset ? getActivePreset() : null;
    el.presetName.value = current ? current.name : "";
    el.presetDialog.showModal();
    el.presetName.focus();
    el.presetName.select();
  });
  el.presetCancel.addEventListener("click", () => el.presetDialog.close());
  el.presetForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = el.presetName.value.trim();
    if (!name) {
      el.presetName.focus();
      return;
    }
    onSavePreset(name);
    el.presetDialog.close();
  });

  el.delPreset.addEventListener("click", () => {
    const preset = presetList.find((p) => p.id === el.presetSelect.value);
    if (!preset) return;
    if (!confirm(`确定删除预设「${preset.name}」？`)) return;
    onDeletePreset(preset.id);
  });

  /* ---------- 标签页（代码 / 配置 / 关于） ---------- */
  $$(".tab", el.tabs).forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      $$(".tab", el.tabs).forEach((t) => {
        const on = t.dataset.tab === name;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      $$(".tab-panel").forEach((p) =>
        p.classList.toggle("is-active", p.dataset.panel === name)
      );
    });
  });

  /* ---------- 事件绑定 ---------- */
  el.refresh.addEventListener("click", () => onRefresh());
  el.autoRefresh.addEventListener("change", () =>
    setSetting("autoRefresh", el.autoRefresh.checked)
  );
  el.clear.addEventListener("click", onClear);
  el.download.addEventListener("click", () => actions.download());
  el.copy.addEventListener("click", () => actions.copy());

  el.widthAuto.addEventListener("change", () => setSetting("widthMode", "auto"));
  el.widthFixed.addEventListener("change", () => setSetting("widthMode", "fixed"));

  el.fixedWidth.addEventListener("input", () => {
    const v = Math.min(4096, Math.max(120, Number(el.fixedWidth.value) || 120));
    setSetting("fixedWidth", v);
    $$(".chip", el.presets).forEach((c) =>
      c.classList.toggle("is-active", Number(c.dataset.width) === v)
    );
  });

  el.presets.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const v = Number(chip.dataset.width);
    el.fixedWidth.value = v;
    setSetting("fixedWidth", v);
  });

  el.bg.addEventListener("change", () => {
    setSetting("background", el.bg.value);
    el.customBg.classList.toggle("hidden", el.bg.value !== "custom");
  });
  el.customBg.addEventListener("input", () => setSetting("customBg", el.customBg.value));

  el.scale.addEventListener("change", () =>
    setSetting("scale", Number(el.scale.value))
  );
  el.format.addEventListener("change", () => {
    setSetting("format", el.format.value);
    // PNG 无损：质量滑块置灰
    el.qualityRange.closest(".setting").classList.toggle(
      "is-muted",
      el.format.value === "png"
    );
  });
  el.runScripts.addEventListener("change", () =>
    setSetting("runScripts", el.runScripts.checked)
  );

  /* ---------- 高级选项（html-to-image 扩展，仅影响导出） ---------- */
  el.qualityRange.addEventListener("input", () => {
    const v = Number(el.qualityRange.value);
    el.qualityVal.textContent = `${Math.round(v * 100)}%`;
    setSetting("quality", v);
  });
  el.fontFormat.addEventListener("change", () =>
    setSetting("preferredFontFormat", el.fontFormat.value)
  );
  el.skipFonts.addEventListener("change", () =>
    setSetting("skipFonts", el.skipFonts.checked)
  );
  el.includeParams.addEventListener("change", () =>
    setSetting("includeQueryParams", el.includeParams.checked)
  );
  el.cacheBust.addEventListener("change", () =>
    setSetting("cacheBust", el.cacheBust.checked)
  );
  el.placeholderColor.addEventListener("input", () =>
    setSetting("placeholderColor", el.placeholderColor.value)
  );
  el.fontEmbedCss.addEventListener("input", () =>
    setSetting("fontEmbedCSS", el.fontEmbedCss.value)
  );
  el.filterSelector.addEventListener("input", () =>
    setSetting("filterSelector", el.filterSelector.value)
  );
  el.extraStyle.addEventListener("input", () =>
    setSetting("extraStyle", el.extraStyle.value)
  );

  /* ---------- 错误横幅 ---------- */
  function showError(err) {
    const msg = err && err.message ? err.message : String(err || "未知错误");
    el.errMsg.textContent = msg;
    el.banner.classList.remove("hidden");
  }
  function hideError() {
    el.banner.classList.add("hidden");
  }
  el.errClose.addEventListener("click", hideError);

  /* ---------- 覆盖层 ---------- */
  function setOverlay(text) {
    if (text) {
      el.overlayText.textContent = text;
      el.overlay.classList.remove("hidden");
    } else {
      el.overlay.classList.add("hidden");
    }
  }

  /* ---------- 空状态 ---------- */
  function setEmpty(empty) {
    el.empty.classList.toggle("hidden", !empty);
  }

  /* ---------- 统计 ---------- */
  let lastSize = null;
  function updateStats(size) {
    if (size) lastSize = size;
    const st = getState();
    const fmt = (n) => (n == null ? "—" : Math.round(n));
    const w = lastSize ? lastSize.width : null;
    const h = lastSize ? lastSize.height : null;
    const outW = w == null ? "—" : fmt(w * st.scale);
    const outH = h == null ? "—" : fmt(h * st.scale);
    el.stats.innerHTML =
      `内容 <strong>${fmt(w)} × ${fmt(h)}</strong> px · ` +
      `缩放 <strong>${st.scale}×</strong> · ` +
      `输出 <strong>${outW} × ${outH}</strong> px · ` +
      `<strong>${st.format.toUpperCase()}</strong>`;
  }

  /* ---------- 提示条 ---------- */
  function toast(msg, type = "info") {
    const node = document.createElement("div");
    node.className = `toast${type === "error" ? " toast-error" : ""}${
      type === "warn" ? " toast-warn" : ""
    }`;
    node.textContent = msg;
    el.toasts.appendChild(node);
    setTimeout(() => node.classList.add("is-leaving"), 3200);
    setTimeout(() => node.remove(), 3600);
  }

  syncControls();
  updateStats(null);

  return {
    toast,
    showError,
    hideError,
    setOverlay,
    setEmpty,
    updateStats,
    syncControls,
    renderPresets,
    clearPresetSelection,
  };
}
