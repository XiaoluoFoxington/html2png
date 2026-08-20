/* ============================================================
   capture.js — 生成图片：下载 / 复制剪贴板
   ============================================================ */

import { formatExt } from "./config.js";
import { dataUrlToBlob, triggerDownload, toPngBlob, stamp } from "./utils.js";

/**
 * 创建截图模块。
 * @param {{preview:object, getState:()=>object,
 *          onStart:()=>void, onFinish:()=>void,
 *          onError:(err:Error)=>void, toast:(msg:string,type?:string)=>void}} deps
 */
export function createCapture({
  preview,
  getState,
  onStart,
  onFinish,
  onError,
  toast,
}) {
  /** 请求一次渲染并得到图片 Blob */
  async function buildBlob() {
    const state = getState();
    const { dataUrl } = await preview.requestCapture({
      scale: state.scale,
      format: state.format,
    });
    return dataUrlToBlob(dataUrl);
  }

  /** 下载图片 */
  async function download() {
    onStart();
    try {
      const blob = await buildBlob();
      const ext = formatExt(getState().format);
      const name = `html2png-${stamp()}.${ext}`;
      triggerDownload(blob, name);
      toast(`已下载 ${name}`, "success");
    } catch (err) {
      onError(err);
    } finally {
      onFinish();
    }
  }

  /** 复制 PNG 到剪贴板 */
  async function copy() {
    onStart();
    try {
      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error("当前浏览器不支持复制图片（需要 HTTPS 或 localhost 环境）");
      }
      const blob = await buildBlob();
      const png = await toPngBlob(blob);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      toast("图片已复制到剪贴板，可直接粘贴到聊天、文档等应用", "success");
    } catch (err) {
      onError(err);
    } finally {
      onFinish();
    }
  }

  return { download, copy };
}
