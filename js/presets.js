/* ============================================================
   presets.js — 用户预设（本地存储）
   ------------------------------------------------------------
   预设 = 用户把当前代码框中的 HTML 命名保存，存储在
   localStorage 中，之后可从顶栏下拉框一键加载。
   ============================================================ */

import { uid } from "./utils.js";

/** 预设存储 key（独立于应用状态存档） */
export const PRESETS_KEY = "html2png.presets.v1";

/** 读取全部预设；数据损坏时返回空数组 */
export function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((p) => p && typeof p === "object" && typeof p.html === "string")
      .map((p) => ({
        id: typeof p.id === "string" && p.id ? p.id : uid(),
        name:
          typeof p.name === "string" && p.name.trim() ? p.name.trim() : "未命名预设",
        html: p.html,
        updatedAt:
          typeof p.updatedAt === "number" ? p.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

/** 写入预设列表（整体覆盖） */
export function savePresets(list) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/**
 * 新增或覆盖预设（同名覆盖；或按 id 更新）。
 * @param {{id?:string, name:string, html:string}} input
 * @returns {{list:object[], preset:object}}
 */
export function upsertPreset(list, { id = null, name, html }) {
  const now = Date.now();
  const cleanName = name.trim() || "未命名预设";
  const idx = list.findIndex((p) => (id ? p.id === id : p.name === cleanName));
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], name: cleanName, html, updatedAt: now };
    return { list: next, preset: next[idx] };
  }
  const preset = { id: uid(), name: cleanName, html, updatedAt: now };
  return { list: [...list, preset], preset };
}

/** 按 id 删除预设 */
export function removePreset(list, id) {
  return list.filter((p) => p.id !== id);
}
