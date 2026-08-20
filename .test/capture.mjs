/* ============================================================
   capture.mjs — 设置应用状态并截图（等待预览就绪）
   ------------------------------------------------------------
   用法：node capture.mjs <状态JSON> <输出PNG> [调试端口=9223]
   输出：iframe 几何信息 JSON；预览未就绪时退出码为 1。
   ============================================================ */

import { readFileSync } from "node:fs";
import { captureState } from "./lib.mjs";

const stateFile = process.argv[2];
const outPng = process.argv[3];
const port = Number(process.argv[4] || 9223);

if (!stateFile || !outPng) {
  console.error("用法：node capture.mjs <状态JSON> <输出PNG> [调试端口]");
  process.exit(1);
}

const stateJson = readFileSync(stateFile, "utf8").trim();

captureState(port, stateJson, outPng)
  .then(({ ready, frame }) => {
    console.log(JSON.stringify({ frame, ready }));
    process.exit(ready ? 0 : 1);
  })
  .catch((e) => {
    console.error("FAIL " + e.message);
    process.exit(1);
  });
