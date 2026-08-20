/* ============================================================
   ruler.js — 预览标尺（固定在舞台顶边与左边，不随内容滚动）
   ------------------------------------------------------------
   结构：preview-stage 是 2×2 网格 —— 第一行/列是 24px 标尺
   （角块 1/1、横尺 1/2、纵尺 2/1），右下格 stage-scroll 承载
   iframe 内容并滚动。因此标尺始终可见；刻度按 scrollLeft /
   scrollTop 平移重绘，所见刻度即内容自身的像素坐标。
   重绘只关心：内容尺寸变化（update(size)）、滚动位置
   （scroll 事件）与画布缩放（ResizeObserver / resize）。
   注意 update 只接受 {width,height} 形状的参数，事件对象一律
   忽略，防止角块被覆盖为 undefined。
   ============================================================ */

const MAJOR = 50; // 大刻度间隔（px）
const MINOR = 10; // 小刻度间隔（px）

/** 与 tokens.css 保持一致（Canvas 无法读 CSS 变量） */
const COLORS = {
  bg: "#0e1510",
  tick: "#2b3d30",
  text: "#52665a",
};

const FONT = "8px ui-monospace, Consolas, Menlo, monospace";

/** 判断是否为合法的 {width, height} 尺寸对象 */
function isSize(v) {
  return (
    v !== null &&
    typeof v === "object" &&
    Number.isFinite(v.width) &&
    Number.isFinite(v.height)
  );
}

/**
 * 创建标尺。
 * @param {{corner:HTMLElement, rulerX:HTMLCanvasElement,
 *          rulerY:HTMLCanvasElement, scroll:HTMLElement}} els
 *        scroll 为承载内容的滚动容器（stage-scroll）
 */
export function createRulers({ corner, rulerX, rulerY, scroll }) {
  const dpr = () => window.devicePixelRatio || 1;

  /** 按设备像素比重置画布并返回缩放后的 2d 上下文 */
  function prep(cv) {
    const d = dpr();
    const w = Math.max(1, cv.clientWidth);
    const h = Math.max(1, cv.clientHeight);
    const bw = Math.round(w * d);
    const bh = Math.round(h * d);
    if (cv.width !== bw) cv.width = bw;
    if (cv.height !== bh) cv.height = bh;
    const ctx = cv.getContext("2d");
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  let contentSize = null; // 内容尺寸：角块显示 + 刻度裁剪上限

  function drawX() {
    const { ctx, w, h } = prep(rulerX);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    if (!contentSize || contentSize.width <= 0) return;
    const cw = contentSize.width;
    const sx = scroll.scrollLeft || 0;
    const end = Math.min(cw, sx + w);
    ctx.fillStyle = COLORS.tick;
    for (let cx = Math.ceil(sx / MINOR) * MINOR; cx <= end; cx += MINOR) {
      const x = cx - sx;
      if (cx % MAJOR === 0) {
        ctx.fillRect(x, 9, 1, h - 9);
        ctx.fillStyle = COLORS.text;
        ctx.font = FONT;
        ctx.textBaseline = "top";
        ctx.fillText(String(cx), x + 3, 1);
        ctx.fillStyle = COLORS.tick;
      } else {
        ctx.fillRect(x, h - 7, 1, 7);
      }
    }
  }

  function drawY() {
    const { ctx, w, h } = prep(rulerY);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    if (!contentSize || contentSize.height <= 0) return;
    const ch = contentSize.height;
    const sy = scroll.scrollTop || 0;
    const end = Math.min(ch, sy + h);
    ctx.fillStyle = COLORS.tick;
    for (let cy = Math.ceil(sy / MINOR) * MINOR; cy <= end; cy += MINOR) {
      const y = cy - sy;
      if (cy % MAJOR === 0) {
        ctx.fillRect(15, y, w - 15, 1);
        ctx.fillStyle = COLORS.text;
        ctx.font = FONT;
        ctx.textBaseline = "top";
        ctx.fillText(String(cy), 1, y + 1);
        ctx.fillStyle = COLORS.tick;
      } else {
        ctx.fillRect(w - 7, y, 7, 1);
      }
    }
  }

  // 用 rAF 合并高频滚动触发，避免一帧内重复重绘
  let raf = 0;
  function requestRedraw() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      drawX();
      drawY();
    });
  }

  /** 内容尺寸变化时更新角块；滚动/缩放时重绘刻度 */
  function update(size) {
    if (isSize(size)) {
      contentSize = { width: size.width, height: size.height };
    }
    if (corner) {
      corner.textContent = contentSize
        ? `${contentSize.width}\n×\n${contentSize.height}`
        : "—";
    }
    requestRedraw();
  }

  // 内容滚动 → 刻度平移
  scroll.addEventListener("scroll", requestRedraw, { passive: true });

  // 标尺画布随舞台尺寸变化而缩放 → 重绘
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => requestRedraw());
    ro.observe(rulerX);
    ro.observe(rulerY);
  }
  window.addEventListener("resize", requestRedraw);
  update();

  return { update };
}
