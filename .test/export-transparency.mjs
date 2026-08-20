/* ============================================================
   export-transparency.mjs — 校验导出图片的透明性
   ------------------------------------------------------------
   在前置状态下（如 transparent-auto），直接走 html-to-image
   导出流程（含 h2p-flat 棋盘格剥离），检查内容外像素 alpha=0。
   用法：node export-transparency.mjs [调试端口=9223]
   ============================================================ */

import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./cdp.mjs";
import { decodePng, pixel } from "./png.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 9223);
const stateFile = join(__dirname, "states", "transparent-auto.json");

async function main() {
  // 先把应用切到透明状态（通过 capture 流程）
  const { captureState } = await import("./lib.mjs");
  const stateJson = readFileSync(stateFile, "utf8").trim(); // .trim() 顺带去掉 BOM
  await captureState(port, stateJson, join(__dirname, "shots", "export-setup.png"));

  const iframe = await connect(port);
  const if2 = await iframe.attachIframe();
  await if2.send("Runtime.enable");
  const expr = `(async () => {
    const de = document.documentElement;
    const w = Math.max(de.offsetWidth, Math.ceil(de.getBoundingClientRect().width));
    const h = Math.max(de.offsetHeight, Math.ceil(de.getBoundingClientRect().height));
    de.classList.add("h2p-flat");
    try {
      const cv = await window.htmlToImage.toCanvas(de, {
        width: w, height: h, pixelRatio: 1, backgroundColor: null,
        imagePlaceholder: null, cacheBust: false, skipAutoScale: true,
      });
      return { url: cv.toDataURL("image/png"), w, h };
    } finally {
      de.classList.remove("h2p-flat");
    }
  })()`;
  const res = await if2.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  const { url, w, h } = res.result.value;
  const out = join(__dirname, "shots", "export-transparency.png");
  writeFileSync(out, Buffer.from(url.split(",")[1], "base64"));
  const img = decodePng(readFileSync(out));
  if (img.width !== w || img.height !== h) throw new Error(`导出尺寸不符 ${img.width}x${img.height} != ${w}x${h}`);
  // 透明内容场景：整图都应透明
  let transparent = true;
  for (const [x, y] of [[50, 50], [Math.floor(w / 2), Math.floor(h / 2)], [w - 10, 10]]) {
    const p = pixel(img, x, y);
    if (p.a !== 0) {
      transparent = false;
      console.log(`  FAIL  (${x},${y}) alpha=${p.a}`);
    }
  }
  console.log(`[${transparent ? "PASS" : "FAIL"}] 导出透明性（${w}x${h}，棋盘格已剥离）`);
  // 直接退出，避免在关闭 WebSocket 时触发 Node uv 断言
  process.exit(transparent ? 0 : 1);
}
main().catch((e) => {
  console.error("FAIL " + e.message);
  process.exit(1);
});
