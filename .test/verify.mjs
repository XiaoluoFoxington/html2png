/* ============================================================
   verify.mjs — 一键回归验证：截图全部场景并校验关键像素
   ------------------------------------------------------------
   前置：node tools/serve.mjs 已运行（8765），且已用
   --remote-debugging-port=<port> 启动无头浏览器打开应用页。
   用法：node verify.mjs [调试端口=9223]
   输出：每个场景 PASS / FAIL 与汇总；任一失败退出码为 1。
   ============================================================ */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { captureState } from "./lib.mjs";
import { decodePng, pixel } from "./png.mjs";
import { connect } from "./cdp.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 9223);
const statesDir = join(__dirname, "states");
const shotsDir = join(__dirname, "shots");

/** 简单颜色判定助手 */
const near = (c, r, g, b, tol = 12) =>
  Math.abs(c.r - r) <= tol && Math.abs(c.g - g) <= tol && Math.abs(c.b - b) <= tol;
const checker = (c) => c.r < 25 && c.g < 35 && c.b < 30; // 深色棋盘格
const white = (c) => c.r > 240 && c.g > 240 && c.b > 240;
const greenish = (c) => c.g > c.r + 25 && c.g > c.b + 20; // 渐变内容
const blueish = (c) => c.b > c.r + 40 && c.b > c.g + 40;

const cases = [
  {
    name: "default",
    state: "default.json",
    // 默认示例：内容为不透明渐变，无白色块；采样内容区
    checks: [
      { rel: [80, 60], test: greenish, label: "内容区为渐变" },
      { rel: [300, 150], test: greenish, label: "内容区为渐变2" },
    ],
  },
  {
    name: "auto-transparent（跟随页面 + 透明内容）",
    state: "auto-transparent.json",
    // 用户报告的 bug：透明内容区应显示棋盘格而非白色
    checks: [
      { rel: [250, 130], test: checker, label: "透明内容区为棋盘格(非白)" },
      { rel: [100, 60], test: checker, label: "透明内容区为棋盘格2" },
    ],
  },
  {
    name: "transparent-fixed（透明模式+固定宽度窄内容）",
    state: "transparent-fixed.json",
    checks: [
      { rel: [100, 100], test: greenish, label: "内容为渐变" },
      { rel: [600, 100], test: checker, label: "内容右侧为棋盘格" },
    ],
  },
  {
    name: "transparent-auto（透明模式+透明内容）",
    state: "transparent-auto.json",
    checks: [{ rel: [250, 130], test: checker, label: "透明内容区为棋盘格" }],
  },
  {
    name: "empty（空状态）",
    state: "empty.json",
    checks: [
      // iframe 只有 1px 高，采样其右侧舞台区
      { rel: [150, 100], test: checker, label: "舞台为棋盘格" },
    ],
  },
  {
    name: "white（白底模式）",
    state: "white.json",
    checks: [
      { rel: [100, 100], test: (c) => near(c, 238, 238, 238, 8), label: "内容 #eee" },
      { rel: [600, 100], test: white, label: "内容右侧为白色(模式正确)" },
    ],
  },
  {
    name: "fixed-tall（固定宽度高内容）",
    state: "fixed-tall.json",
    checks: [
      { rel: [100, 100], test: (c) => near(c, 14, 21, 16, 8), label: "行背景 #0e1510" },
      { rel: [300, 300], test: (c) => near(c, 14, 21, 16, 8), label: "行背景2" },
    ],
  },
  {
    name: "body-style-bg（页面自带 body 背景）",
    state: "body-style-bg.json",
    checks: [{ rel: [200, 100], test: blueish, label: "body 蓝色背景可见" }],
  },
  {
    name: "html-style-bg（页面自带 html 背景）",
    state: "html-style-bg.json",
    checks: [{ rel: [200, 100], test: blueish, label: "html 蓝色背景可见" }],
  },
  {
    name: "body-inline-bg（body 内联背景会被 srcdoc 丢弃 → 视为透明）",
    state: "body-inline-bg.json",
    checks: [{ rel: [200, 100], test: checker, label: "透明内容区为棋盘格" }],
  },
];

async function main() {
  let fail = 0;
  const total = cases.length + 1; // +1 = 滚动联动
  for (const cs of cases) {
    // .trim() 顺带去掉 UTF-8 BOM（\uFEFF 属于 ES 空白字符）
    const stateJson = readFileSync(join(statesDir, cs.state), "utf8").trim();
    const outPng = join(shotsDir, `verify-${cs.state.replace(/\.json$/, ".png")}`);
    const { ready, frame } = await captureState(port, stateJson, outPng);
    if (!ready) {
      console.log(`[FAIL] ${cs.name}：预览未就绪`);
      fail++;
      continue;
    }
    const img = decodePng(readFileSync(outPng));
    let caseOk = true;
    for (const chk of cs.checks) {
      const px = pixel(img, frame.x + chk.rel[0], frame.y + chk.rel[1]);
      const ok = chk.test(px);
      if (!ok) caseOk = false;
      console.log(`  ${ok ? "PASS" : "FAIL"}  ${chk.label} @${chk.rel} rgb(${px.r},${px.g},${px.b})`);
    }
    console.log(`[${caseOk ? "PASS" : "FAIL"}] ${cs.name}（iframe ${frame.w}x${frame.h} @${frame.x},${frame.y}）`);
    if (!caseOk) fail++;
  }

  // 滚动联动检查：固定高内容 + 滚动后标尺位置不变、滚动位置生效
  try {
    const stateJson = readFileSync(join(statesDir, "fixed-tall.json"), "utf8").trim();
    const outPng = join(shotsDir, "verify-scroll.png");
    await captureState(port, stateJson, outPng);
    const page = await connect(port);
    await page.send("Runtime.enable");
    const r = await page.send("Runtime.evaluate", {
      expression: `(() => {
        const sc = document.getElementById("stage-scroll");
        const pos = () => {
          const rx = document.getElementById("ruler-x").getBoundingClientRect();
          const ry = document.getElementById("ruler-y").getBoundingClientRect();
          return [rx.x, rx.y, ry.x, ry.y];
        };
        const before = pos();
        sc.scrollLeft = 350; sc.scrollTop = 400;
        return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
          const after = pos();
          res({
            sl: sc.scrollLeft, st: sc.scrollTop,
            rulerFixed: before.every((v, i) => Math.abs(v - after[i]) < 1),
          });
        })));
      })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    const v = r.result.value;
    const ok = v.sl === 350 && v.st === 400 && v.rulerFixed;
    console.log(`[${ok ? "PASS" : "FAIL"}] 滚动联动（sl=${v.sl} st=${v.st} rulerFixed=${v.rulerFixed}）`);
    if (!ok) fail++;
    page.ws.close();
  } catch (e) {
    console.log(`[FAIL] 滚动联动：${e.message}`);
    fail++;
  }

  console.log(`\n汇总：${total - fail}/${total} 通过`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error("FAIL " + e.message);
  process.exit(1);
});
