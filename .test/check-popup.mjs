// 检查：内容中有绝对定位元素溢出边界（如弹层）时导出高度是否包含它
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./cdp.mjs";
import { captureState } from "./lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 9224);

const state = {
  html: `<div style="width:400px;height:200px;background:#0e1510;color:#dce9de;">主体</div>
<div style="position:absolute;top:280px;left:0;width:200px;height:60px;background:#f87171;">溢出弹层(距顶280px)</div>`,
  widthMode: "auto",
  fixedWidth: 1280,
  scale: 1,
  format: "png",
  background: "auto",
  customBg: "#22c55e",
  runScripts: false,
};

const { ready, frame } = await captureState(port, JSON.stringify(state), join(__dirname, "shots", "tmp-popup-preview.png"));
console.log(`预览 iframe：${frame.w}x${frame.h}`);

const page = await connect(port);
const iframe = await page.attachIframe();
await iframe.send("Runtime.enable");
const res = await iframe.send("Runtime.evaluate", {
  expression: `(() => {
    const de = document.documentElement;
    return {
      rect: de.getBoundingClientRect().height,
      offsetH: de.offsetHeight,
      scrollH: de.scrollHeight,
      clientH: de.clientHeight,
    };
  })()`,
  returnByValue: true,
});
console.log("iframe 内部：", JSON.stringify(res.result.value));
process.exit(0);
