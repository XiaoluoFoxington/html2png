/* ============================================================
   lib.mjs — 测试公共逻辑：设置状态、等待预览就绪、截图
   ============================================================ */

import { writeFileSync } from "node:fs";
import { connect, sleep } from "./cdp.mjs";

/**
 * 设置应用状态并截图。
 * @param {number} port CDP 端口
 * @param {string} stateJson localStorage 状态 JSON 字符串
 * @param {string} outPng 输出截图路径
 * @returns {Promise<{ready:boolean, frame:{x,y,w,h}}>}
 */
export async function captureState(port, stateJson, outPng) {
  const page = await connect(port);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  // 先确保当前页是应用页（其他脚本可能导航到了测试页）
  await page.send("Page.navigate", { url: "http://127.0.0.1:8765/" });
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `try { localStorage.setItem("html2png.v1", ${JSON.stringify(stateJson)}); } catch (e) {}`,
  });
  await page.send("Page.reload", { ignoreCache: true });
  // 轮询等待预览就绪（overlay 隐藏）
  let ready = false;
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    const r = await page.send("Runtime.evaluate", {
      expression: `(() => { const o = document.getElementById("stage-overlay"); return !o || o.classList.contains("hidden"); })()`,
      returnByValue: true,
    });
    if (r.result.value === true) {
      ready = true;
      break;
    }
  }
  await sleep(800); // 等尺寸消息与标尺重绘
  const shot = await page.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(outPng, Buffer.from(shot.data, "base64"));
  const info = await page.send("Runtime.evaluate", {
    expression: `(() => { const f = document.getElementById("frame"); const b = f.getBoundingClientRect(); return { frame: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } }; })()`,
    returnByValue: true,
  });
  page.ws.close();
  return { ready, frame: info.result.value.frame };
}
