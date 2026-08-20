/* ============================================================
   iframe-bootstrap.js — 运行在沙箱预览 iframe 内部
   ------------------------------------------------------------
   职责：
   - 向父页面报告内容尺寸（自动模式下决定 iframe 宽高）；
   - 收到父页面的渲染请求后，用 html-to-image 将
     documentElement 栅格化为 PNG/JPEG/WebP，回传 dataURL。
   - 通过 postMessage 通信（带命名空间与 docId，丢弃过期消息）。
   注意：这是经典脚本（非 ES module），只能使用 ES5+ 兼容写法。
   ============================================================ */
(function () {
  "use strict";

  if (window.__H2P_BOOTED) return;
  window.__H2P_BOOTED = true;

  var DOC = window.__H2P_DOC || "";
  var MSG = "__h2p";
  var lib = window.htmlToImage;

  /* ---------- 通信 ---------- */
  function post(type, data) {
    var msg = data || {};
    msg[MSG] = true;
    msg.type = type;
    msg.doc = DOC;
    if (window.parent !== window) window.parent.postMessage(msg, "*");
  }

  /* ---------- 尺寸测量 ---------- */
  function measure() {
    var de = document.documentElement;
    var b = document.body;
    // 不能依赖 scrollHeight/scrollWidth：根元素的滚动尺寸恒不小于视口
    // （初始包含块），会让 iframe 永远无法收缩到内容尺寸。
    // 用 offset* + getBoundingClientRect 的精确尺寸（向上取整）测量，
    // 保证视口 ≥ 内容、不出现亚像素溢出（否则透明背景下会露出
    // iframe 内部的浅色滚动条与白色画布）。
    var r = de.getBoundingClientRect();
    var w = Math.max(
      de.offsetWidth,
      b ? b.offsetWidth : 0,
      Math.ceil(r.width)
    );
    var h = Math.max(
      de.offsetHeight,
      b ? b.offsetHeight : 0,
      Math.ceil(r.height)
    );
    // 仅当内容真正溢出视口（超过 1px 容差）时，才采用滚动尺寸。
    if (de.scrollHeight > de.clientHeight + 1) h = Math.max(h, de.scrollHeight);
    if (de.scrollWidth > de.clientWidth + 1) w = Math.max(w, de.scrollWidth);
    return { width: Math.max(1, w), height: Math.max(1, h) };
  }

  var lastPosted = null;
  function reportSize() {
    var m = measure();
    // 尺寸未变化时不重复上报，避免消息风暴
    if (
      lastPosted &&
      lastPosted.width === m.width &&
      lastPosted.height === m.height
    ) {
      return;
    }
    lastPosted = m;
    post("size", m);
  }

  if (typeof ResizeObserver !== "undefined") {
    try {
      var ro = new ResizeObserver(function () {
        reportSize();
      });
      ro.observe(document.documentElement);
      if (document.body) ro.observe(document.body);
      // 内容替换后重新观察
      var mo = new MutationObserver(function () {
        if (document.body && !document.body.__h2pObserved) {
          document.body.__h2pObserved = true;
          ro.observe(document.body);
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (err) {
      /* ResizeObserver 不可用时依赖 resize 事件 + 渲染前测量 */
    }
  }
  window.addEventListener("resize", reportSize);

  /* ---------- 占位像素（跨域图片加载失败时使用） ---------- */
  var pixelCache = null;
  function pixel() {
    if (pixelCache) return pixelCache;
    var c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(0, 0, 1, 1);
    pixelCache = c.toDataURL("image/png");
    return pixelCache;
  }

  /* ---------- 渲染 ---------- */
  function friendlyError(err) {
    var m = String((err && err.message) || err);
    if (/tainted|securityerror|not allowed to access|cross-origin/i.test(m)) {
      return "无法读取跨域资源：图片/字体需要服务器允许 CORS。请改用允许跨域（Access-Control-Allow-Origin）的图片地址或 data: 图片。";
    }
    if (/maximum call stack|too much recursion/i.test(m)) {
      return "渲染内容过于复杂，请简化 HTML 后重试。";
    }
    return m;
  }

  function render(opts) {
    var scale = Math.min(4, Math.max(0.5, Number(opts && opts.scale) || 1));
    var format = opts && opts.format;
    var de = document.documentElement;

    // 透明模式下预览画布上有棋盘格背景（见 preview.js 注入的样式）；
    // 导出前加 h2p-flat 类去掉它，保证输出保持透明。类在整次捕获期间
    // 保持存在（克隆与样式读取都发生在 toCanvas 内部），数据生成后恢复。
    var needsFlat = !de.classList.contains("h2p-flat");
    if (needsFlat) de.classList.add("h2p-flat");

    function restore() {
      if (needsFlat) de.classList.remove("h2p-flat");
    }

    return (function () {
      // 等待字体加载完成，避免文字字形缺失
      var fontsReady =
        document.fonts && document.fonts.ready
          ? document.fonts.ready.catch(function () {})
          : Promise.resolve();
      return fontsReady.then(function () {
        var m = measure();
        return lib
          .toCanvas(de, {
            width: m.width,
            height: m.height,
            pixelRatio: scale,
            backgroundColor: null,
            imagePlaceholder: pixel(),
            cacheBust: false,
            skipAutoScale: true,
            fetchRequestInit: { mode: "cors", credentials: "omit" },
          })
          .then(function (canvas) {
            var dataUrl;
            if (format === "jpeg") dataUrl = canvas.toDataURL("image/jpeg", 0.92);
            else if (format === "webp") dataUrl = canvas.toDataURL("image/webp", 0.9);
            else dataUrl = canvas.toDataURL("image/png");
            if (!dataUrl || dataUrl.length < 24) throw new Error("画布输出为空");
            return dataUrl;
          });
      });
    })().then(
      function (url) {
        restore();
        return url;
      },
      function (err) {
        restore();
        throw err;
      }
    );
  }

  /* ---------- 消息处理 ---------- */
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    var d = e.data;
    if (!d || d[MSG] !== true || d.type !== "capture") return;
    if (d.doc && d.doc !== DOC) return; // 过期请求
    var requestId = d.requestId;
    render(d.opts || {})
      .then(function (dataUrl) {
        post("result", { requestId: requestId, dataUrl: dataUrl });
      })
      .catch(function (err) {
        post("error", { requestId: requestId, message: friendlyError(err) });
      });
  });

  /* ---------- 就绪 ---------- */
  function boot() {
    if (!lib || typeof lib.toCanvas !== "function") {
      post("error", {
        fatal: true,
        message:
          "渲染库加载失败：请通过本地静态服务器访问本页（node tools/serve.mjs 或 npx serve），不要直接双击打开。",
      });
      return;
    }
    // 注意：不能依赖 requestAnimationFrame —— 沙箱 iframe 在
    // 无头/后台环境下 rAF 可能永不触发。DOMContentLoaded +
    // 定时器是最可靠的时机。后续尺寸变化由 ResizeObserver 上报，
    // 渲染前也会重新测量，因此无需等待首帧。
    function readyOnce() {
      reportSize();
      post("ready", {});
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        setTimeout(readyOnce, 0);
      });
    } else {
      setTimeout(readyOnce, 0);
    }
  }

  boot();
})();
