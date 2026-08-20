/* ============================================================
   ruler.js — 预览标尺（贴在内容上，随内容一起滚动）
   ------------------------------------------------------------
   标尺直接覆盖在 iframe 的上边与左边，坐标原点与内容完全一致，
   刻度读数即内容自身的像素坐标；角块显示内容尺寸。
   重绘只关心：内容尺寸变化（update(size)）与画布缩放
   （ResizeObserver）。注意 update 只接受 {width,height} 形状的
   参数，事件对象一律忽略，防止角块被覆盖为 undefined。
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
 *          rulerY:HTMLCanvasElement}} els
 */
export function createRulers({ corner, rulerX, rulerY }) {
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

  function drawX() {
    const { ctx, w, h } = prep(rulerX);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = COLORS.tick;
    for (let x = 0; x <= w; x += MINOR) {
      if (x % MAJOR === 0) {
        ctx.fillRect(x, 9, 1, h - 9);
        ctx.fillStyle = COLORS.text;
        ctx.font = FONT;
        ctx.textBaseline = "top";
        ctx.fillText(String(x), x + 3, 1);
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
    ctx.fillStyle = COLORS.tick;
    for (let y = 0; y <= h; y += MINOR) {
      if (y % MAJOR === 0) {
        ctx.fillRect(15, y, w - 15, 1);
        ctx.fillStyle = COLORS.text;
        ctx.font = FONT;
        ctx.textBaseline = "top";
        ctx.fillText(String(y), 1, y + 1);
        ctx.fillStyle = COLORS.tick;
      } else {
        ctx.fillRect(w - 7, y, 7, 1);
      }
    }
  }

  let lastSize = null;

  /** 内容尺寸变化时更新角块；画布缩放时重绘刻度 */
  function update(size) {
    if (isSize(size)) {
      lastSize = { width: size.width, height: size.height };
    }
    if (corner) {
      corner.textContent = lastSize
        ? `${lastSize.width}\n×\n${lastSize.height}`
        : "—";
    }
    drawX();
    drawY();
  }

  // 标尺画布随 iframe 尺寸变化而缩放 → 重绘
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => update());
    ro.observe(rulerX);
    ro.observe(rulerY);
  }
  window.addEventListener("resize", () => update());
  update();

  return { update };
}
