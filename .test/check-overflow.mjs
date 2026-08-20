// 检查固定宽度溢出：内容比固定宽度更宽时
// 预览在固定宽度处裁剪（视口），导出包含完整内容宽度（scrollWidth 规则）
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./cdp.mjs";
import { captureState } from "./lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 9223);

const state = {
  html: '<div style="width:1500px;height:300px;background:linear-gradient(90deg,#052e16,#064e3b);color:#d1fae5;">超出固定宽度</div>',
  widthMode: "fixed",
  fixedWidth: 1200,
  scale: 1,
  format: "png",
  background: "auto",
  customBg: "#22c55e",
  runScripts: false,
};
const stateJson = JSON.stringify(state);

const { frame } = await captureState(port, stateJson, join(__dirname, "shots", "check-overflow-preview.png"));
console.log(`预览 iframe：${frame.w}x${frame.h}（固定 1200 宽，内容 1500 宽 → 预览按视口裁剪）`);

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
    const cv = await window.htmlToImage.toCanvas(de, { width: w, height: h, pixelRatio: 1, backgroundColor: null, imagePlaceholder: null, cacheBust: false, skipAutoScale: true });
    return { url: cv.toDataURL("image/png"), w, h };
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
const { url, w, h } = res.result.value;
writeFileSync(join(__dirname, "shots", "check-overflow-export.png"), Buffer.from(url.split(",")[1], "base64"));
console.log(`导出尺寸：${w}x${h}`);
const ok = w === 1500 && h === 300;
console.log(ok ? "[PASS] 导出包含完整溢出内容宽度" : "[FAIL] 导出宽度异常");
await page.close();
await iframe.close();
process.exitCode = 0; // 自然退出，避免 Node/Windows WebSocket 断言