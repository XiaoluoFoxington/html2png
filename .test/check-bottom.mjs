// 检查内容底边完整性：底边框在 2x 导出时应完整渲染（不被裁剪）
// （小数高度内容用向上取整测量，视口 ≥ 内容，内容不裁剪；
//   底部多出的亚像素部分允许为透明条 —— 透明条是可接受行为）
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./cdp.mjs";
import { decodePng, pixel } from "./png.mjs";
import { captureState } from "./lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 9223);

// 13px × line-height 1.8 = 23.4px → 高度为小数，能触发亚像素路径；
// 6px 底边框在 2x 下应为 12px，便于检测是否被裁剪
const state = {
  html: '<div style="width:400px;padding:12px;border-bottom:6px solid #22c55e;font-size:13px;line-height:1.8;color:#dce9de;background:#0e1510;">底边框完整性测试</div>',
  widthMode: "auto",
  fixedWidth: 1280,
  scale: 2,
  format: "png",
  background: "auto",
  customBg: "#22c55e",
  runScripts: false,
};
const stateJson = JSON.stringify(state);

const { ready, frame } = await captureState(port, stateJson, join(__dirname, "shots", "check-bottom-preview.png"));
console.log(`预览 iframe：${frame.w}x${frame.h} ready=${ready}`);

const page = await connect(port);
const iframe = await page.attachIframe();
await iframe.send("Runtime.enable");
const res = await iframe.send("Runtime.evaluate", {
  expression: `(async () => {
    const de = document.documentElement;
    // 与 js/iframe-bootstrap.js 的 measure() 保持一致
    const r = de.getBoundingClientRect();
    let w = Math.max(de.offsetWidth, document.body ? document.body.offsetWidth : 0, Math.ceil(r.width));
    let h = Math.max(de.offsetHeight, document.body ? document.body.offsetHeight : 0, Math.ceil(r.height));
    if (de.scrollHeight > de.clientHeight + 1) h = Math.max(h, de.scrollHeight);
    if (de.scrollWidth > de.clientWidth + 1) w = Math.max(w, de.scrollWidth);
    const cv = await window.htmlToImage.toCanvas(de, { width: w, height: h, pixelRatio: 2, backgroundColor: null, imagePlaceholder: null, cacheBust: false, skipAutoScale: true });
    return { url: cv.toDataURL("image/png"), w, h };
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
const { url, w, h } = res.result.value;
const out = join(__dirname, "shots", "check-bottom-export.png");
writeFileSync(out, Buffer.from(url.split(",")[1], "base64"));
const img = decodePng(readFileSync(out));
console.log(`2x 导出尺寸：${w}x${h}`);

// 从底部向上统计绿色占主导的行（#22c55e 边框，允许亚像素混合）
const cx = Math.floor(img.width / 2);
let borderRows = 0;
for (let y = img.height - 1; y >= 0; y--) {
  const p = pixel(img, cx, y);
  const isBorder = p.g > 150 && p.g > p.r + 60 && p.g > p.b + 60;
  if (isBorder) borderRows++;
  else if (borderRows > 0) break;
}
// 6px 边框 × 2x = 12px；亚像素混合只影响边缘行，中间应为纯绿
const ok = borderRows >= 8;
console.log(`底边框厚度：${borderRows}px（期望 ≥8px，6px × 2x）`);
console.log(ok ? "[PASS] 内容底边框完整渲染（未被裁剪）" : "[FAIL] 底边框被裁剪");
await page.close();
await iframe.close();
process.exitCode = ok ? 0 : 1; // 自然退出，避免 Node/Windows WebSocket 断言