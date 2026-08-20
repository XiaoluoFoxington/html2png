/* ============================================================
   preview.js — 沙箱预览 iframe 与渲染协议
   ------------------------------------------------------------
   架构说明：
   - 用户 HTML 被放进 <iframe srcdoc sandbox="allow-scripts">，
     沙箱 iframe 是「不透明源」（opaque origin），与宿主完全隔离，
     用户脚本无法触碰本应用页面。
   - 父页面无法读取跨源 iframe 的 DOM，因此「测量尺寸」与
     「渲染 PNG」都在 iframe 内部完成（见 js/iframe-bootstrap.js），
     通过 postMessage 与父页面通信。
   - 每次重建 srcdoc 会生成新的 docId，旧文档的迟到消息会被丢弃。
   ============================================================ */

import {
  AUTO_MIN_WIDTH,
  AUTO_MAX_WIDTH,
  MSG,
  READY_TIMEOUT,
  CAPTURE_TIMEOUT,
} from "./config.js";
import { uid } from "./utils.js";

/** 应用根目录（相对本模块解析，任何页面引用都正确） */
const APP_BASE = new URL("../", import.meta.url).href;

/** 棋盘格背景（表示透明），预览时画在 html 上 */
const CHECKER_CSS =
  "html{background-image:conic-gradient(#121a15 25%,#0a100c 0 50%,#121a15 0 75%,#0a100c 0)!important;background-size:18px 18px!important;}";
const CHECKER_FLAT_CSS = "html.h2p-flat{background-image:none!important;}";

/** 用户页面是否通过 <style> 规则给 html 元素设置了背景。
    html 的背景色会被棋盘格背景图盖住（预览失真、与导出不一致），
    因此这类页面跳过棋盘格注入；body 背景会正常盖在棋盘格之上，
    无需跳过（透明/半透明 body 露出棋盘格恰好表示导出透明）。
    内联样式不在此列：构建 srcdoc 时 html/body 自身属性会被丢弃。 */
function pageHasOwnBackground(doc) {
  let css = "";
  doc.querySelectorAll("style").forEach((st) => {
    css += (st.textContent || "") + "\n";
  });
  return /(?:^|[},])\s*html\s*\{[^}]*background/i.test(css);
}

/** 构造 srcdoc 文档 */
function buildSrcDoc(state, docId) {
  const doc = new DOMParser().parseFromString(state.html || "", "text/html");

  // 不执行脚本时，移除 <script>、内联事件与 javascript: 链接
  if (!state.runScripts) {
    doc.querySelectorAll("script").forEach((s) => s.remove());
    doc.querySelectorAll("*").forEach((el) => {
      for (const attr of [...el.attributes]) {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
        else if (
          (attr.name === "href" || attr.name === "src") &&
          /^\s*javascript:/i.test(attr.value)
        ) {
          el.removeAttribute(attr.name);
        }
      }
    });
  }

  const headHTML = doc.head ? doc.head.innerHTML : "";
  const bodyHTML = doc.body ? doc.body.innerHTML : "";

  // 注入的覆盖样式（置于用户内容之后，用 !important 保证生效）
  const overrides = [
    // 去掉 body 默认 8px 外边距：预览与导出尺寸一致，且避免透明背景下
    // UA 画布（默认白色）透过 body 边距区域露出白边。
    // overflow:hidden：内容亚像素溢出（如 285.39px vs 视口 285px）时
    // 直接裁剪而非触发 iframe 内浅色滚动条；预览本身不滚动（滚动在舞台）。
    "html,body{margin:0!important;overflow:hidden!important;}",
  ];
  if (state.widthMode === "auto") {
    overrides.push(
      `html,body{width:max-content!important;min-width:${AUTO_MIN_WIDTH}px!important;max-width:${AUTO_MAX_WIDTH}px!important;}`
    );
  }
  const bg = state.background;
  if (bg === "transparent") {
    // 透明模式：把棋盘格直接画在 html 上（覆盖整个视口画布），
    // 避免 UA 白色画布透过透明区域露出白块；导出时由
    // iframe-bootstrap 通过 h2p-flat 类临时去掉棋盘格，保持输出透明。
    overrides.push(
      "html,body{background-color:transparent!important;}",
      CHECKER_CSS,
      CHECKER_FLAT_CSS
    );
  } else if (bg === "white") overrides.push("html,body{background:#ffffff!important;}");
  else if (bg === "black") overrides.push("html,body{background:#000000!important;}");
  else if (bg === "custom" && state.customBg) {
    overrides.push(`html,body{background:${state.customBg}!important;}`);
  } else if (!pageHasOwnBackground(doc)) {
    // 跟随页面：页面没有自带 html/body 背景时，导出内容为透明，
    // 预览同样用棋盘格表示透明，避免 Chrome 把 iframe 内透明区域
    // 渲染成白色（预览白、导出透明的不一致）。
    overrides.push(CHECKER_CSS, CHECKER_FLAT_CSS);
  }

  // 固定渲染库脚本的基准地址，防止用户内容里的 <base> 劫持路径
  const base = APP_BASE;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<base href="${base}">
<script src="vendor/html-to-image.min.js?v=4"></script>
${headHTML}
</head>
<body>
${bodyHTML}
<style>${overrides.join("\n")}</style>
<script>window.__H2P_DOC=${JSON.stringify(docId)};</script>
<script src="js/iframe-bootstrap.js?v=4"></script>
</body>
</html>`;
}

/**
 * 创建预览模块。
 * @param {HTMLElement} frame  iframe 元素
 * @param {{getState:()=>object, onSize:(size:{width:number,height:number})=>void,
 *          onReady:()=>void, onFatal:(msg:string)=>void}} hooks
 */
export function createPreview(frame, { getState, onSize, onReady, onFatal }) {
  let docId = uid();
  let isReady = false;
  let readyTimer = null;
  let pending = new Map(); // requestId -> {resolve, reject, timer}

  function resetReady() {
    clearTimeout(readyTimer);
    readyTimer = setTimeout(() => {
      onFatal(
        "预览初始化超时：请通过本地静态服务器打开本页（如 node tools/serve.mjs 或 npx serve），不要直接双击 HTML 文件。"
      );
    }, READY_TIMEOUT);
  }
  resetReady();

  function whenReady() {
    if (isReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("预览尚未就绪")),
        READY_TIMEOUT
      );
      // ready 消息到达时完成
      readySubscribers.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  const readySubscribers = [];

  function handleMessage(e) {
    const d = e.data;
    if (!d || d[MSG] !== true || e.source !== frame.contentWindow) return;
    // 丢弃旧文档的迟到消息
    if (d.doc !== docId) return;

    switch (d.type) {
      case "ready":
        isReady = true;
        clearTimeout(readyTimer);
        while (readySubscribers.length) readySubscribers.shift()();
        onReady && onReady();
        break;
      case "size":
        applySize(d);
        onSize && onSize(lastSize);
        break;
      case "result": {
        const p = pending.get(d.requestId);
        if (p) {
          pending.delete(d.requestId);
          clearTimeout(p.timer);
          p.resolve(d);
        }
        break;
      }
      case "error": {
        const p = pending.get(d.requestId);
        if (p) {
          pending.delete(d.requestId);
          clearTimeout(p.timer);
          p.reject(new Error(d.message || "渲染失败"));
        } else if (d.fatal) {
          onFatal(d.message || "渲染库加载失败");
        }
        break;
      }
    }
  }

  let lastSize = { width: 0, height: 0 };

  function applySize(size) {
    const st = getState();
    const width = st.widthMode === "fixed" ? st.fixedWidth : size.width;
    const height = size.height;
    if (frame.style.width !== width + "px") frame.style.width = width + "px";
    if (frame.style.height !== height + "px") frame.style.height = height + "px";
    lastSize = { width, height };
  }

  window.addEventListener("message", handleMessage);

  /** 立即按当前设置刷新 iframe 宽度（固定宽度模式切换时用） */
  function applyWidth() {
    const st = getState();
    if (st.widthMode === "fixed") {
      frame.style.width = st.fixedWidth + "px";
    }
  }

  /** 重建 iframe 内容 */
  function rebuild(state) {
    docId = uid();
    isReady = false;
    resetReady();
    lastSize = { width: 0, height: 0 };
    frame.removeAttribute("style");
    frame.srcdoc = buildSrcDoc(state, docId);
  }

  /** 请求一次渲染，返回 { dataUrl, width, height } */
  async function requestCapture(opts) {
    await whenReady();
    const requestId = uid();
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error("渲染超时，请稍后重试"));
      }, CAPTURE_TIMEOUT);
      pending.set(requestId, { resolve, reject, timer });
    });
    frame.contentWindow.postMessage(
      { [MSG]: true, type: "capture", requestId, doc: docId, opts },
      "*"
    );
    return promise;
  }

  return { rebuild, requestCapture, applyWidth };
}
