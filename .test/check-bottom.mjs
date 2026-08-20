// 检查透明模式 + 小数高度内容的底边（不应有透明条）
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { captureState } from "./lib.mjs";
import { decodePng, pixel } from "./png.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 9224);

const d = JSON.parse(readFileSync(join(__dirname, "states", "default.json"), "utf8").trim());
d.background = "transparent";
const tmpState = join(__dirname, "states", "tmp-td.json");
writeFileSync(tmpState, JSON.stringify(d));

const outPng = join(__dirname, "shots", "tmp-td.png");
const { ready, frame } = await captureState(port, readFileSync(tmpState, "utf8").trim(), outPng);
rmSync(tmpState, { force: true });
console.log(`iframe：${frame.w}x${frame.h} ready=${ready}`);
const img = decodePng(readFileSync(outPng));
let bad = 0;
for (const y of [frame.h - 3, frame.h - 2, frame.h - 1]) {
  const p = pixel(img, frame.x + 150, frame.y + y);
  const isStrip = p.a === 0 || (p.r < 25 && p.g < 35 && p.b < 30);
  if (isStrip) bad++;
  console.log(`底边相对 y=${y} rgb(${p.r},${p.g},${p.b}) ${isStrip ? "<- 疑似透明条" : ""}`);
}
console.log(bad ? "[FAIL] 底边存在透明条" : "[PASS] 底边无透明条");
process.exit(bad ? 1 : 0);
