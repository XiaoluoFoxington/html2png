/* ============================================================
   utils.js — 通用工具
   ============================================================ */

/** querySelector 简写 */
export const $ = (sel, root = document) => root.querySelector(sel);

/** querySelectorAll 简写，返回数组 */
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** 防抖 */
export function debounce(fn, ms) {
  let timer = null;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

/** 简单唯一 id */
export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** 时间戳文件名片段 */
export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/* ---------- 本地存储 ---------- */

export function loadStore(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export function saveStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- Blob / DataURL ---------- */

export function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then((r) => r.blob());
}

/** 触发浏览器下载 */
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** 把任意图片 blob 转成 PNG blob（用于剪贴板） */
export async function toPngBlob(blob) {
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const png = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG 编码失败"))), "image/png")
  );
  return png;
}
