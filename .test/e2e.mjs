/* ============================================================
   e2e.mjs — 运行 tests/e2e.html 冒烟测试并读取结果
   ------------------------------------------------------------
   前置：本地服务器与无头浏览器（CDP）已启动。
   用法：node e2e.mjs [调试端口=9223]
   ============================================================ */

import { connect, sleep } from "./cdp.mjs";

const port = Number(process.argv[2] || 9223);

async function main() {
  const page = await connect(port);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Page.navigate", { url: "http://127.0.0.1:8765/tests/e2e.html" });
  await sleep(6000);
  const res = await page.send("Runtime.evaluate", {
    expression: `document.getElementById("result").textContent`,
    returnByValue: true,
  });
  console.log("E2E: " + res.result.value);
  const pass = /^PASS/.test(res.result.value || "");
  page.ws.close();
  process.exit(pass ? 0 : 1);
}
main().catch((e) => {
  console.error("FAIL " + e.message);
  process.exit(1);
});
