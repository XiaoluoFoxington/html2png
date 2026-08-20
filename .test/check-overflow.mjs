// 检查固定宽度溢出场景：内容比固定宽度更宽时预览裁剪、导出尺寸合理
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./cdp.mjs";
import { decodePng } from "./png.mjs";
import { captureState } from "./lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 9224);

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

const { frame } = await captureState(port, stateJson, join(__dirname, "shots", "tmp-overflow-preview.png"));
console.log(`预览 iframe：${frame.w}x${frame.h}（固定 1200 宽，内容 1500 宽）`);

const page = await connect(port);
const iframe = await page.attachIframe();
await iframe.send("Runtime.enable");
const res = await iframe.send("Runtime.evaluate", {
  expression: `(async () => {
    const de = document.documentElement;
    const w = Math.max(de.offsetWidth, Math.round(de.getBoundingClientRect().width));
    const h = Math.max(de.offsetHeight, Math.round(de.getBoundingClientRect().height));
    const cv = await window.htmlToImage.toCanvas(de, { width: w, height: h, pixelRatio: 1, backgroundColor: null, imagePlaceholder: null, cacheBust: false, skipAutoScale: true });
    return { url: cv.toDataURL("image/png"), w, h };
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
const { url, w, h } = res.result.value;
writeFileSync(join(__dirname, "shots", "tmp-overflow-export.png"), Buffer.from(url.split(",")[1], "base64"));
console.log(`导出尺寸：${w}x${h}（期望：宽度 = 固定宽度 1200，按视口裁剪）`);
process.exit(0);
