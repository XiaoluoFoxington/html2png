/* ============================================================
   smoke.mjs — 无头浏览器冒烟测试（CodeMirror 6 编辑器集成）
   ------------------------------------------------------------
   用法：cd tools/editor-bundle && npm install && npm run smoke
   依赖系统 Edge/Chrome；自动启动本地服务器、跑完即关。
   校验：加载无错误 / 高亮生效 / 左栏标签页切换 / 预设保存-加载-删除 /
   自动刷新与手动刷新 / 清空 / 输入 / localStorage 持久化 /
   Ctrl+Enter 下载 / 手机视口响应式。
   ============================================================ */

import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EXEC = EDGE;
const PLACEHOLDER = "在这里粘贴或输入 HTML 代码…";

let failed = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? "✔" : "✘"} ${name}${detail ? "  — " + detail : ""}`);
}

/* ---------- 启动本地服务器 ---------- */
const server = spawn(process.execPath, [join(ROOT, "tools", "serve.mjs"), String(PORT), "127.0.0.1"], {
  stdio: "ignore",
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitServer(deadline = Date.now() + 10000) {
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error("本地服务器启动超时");
}

const shotDir = mkdtempSync(join(tmpdir(), "html2png-smoke-"));
let browser;
try {
  await waitServer();
  browser = await puppeteer.launch({
    executablePath: EXEC,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  // 接受下载：否则 <a download> 触发的下载会被静默丢弃（无头默认 deny）
  const context = await browser.createBrowserContext({
    downloadBehavior: { policy: "allow", downloadPath: shotDir },
  });
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  /* 1. 加载页面 */
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 30000 });
  await page.waitForSelector(".cm-editor", { timeout: 10000 });
  await sleep(600); // 等高亮/预览就绪

  const initial = await page.evaluate(() => ({
    doc: document.querySelector(".cm-content").textContent,
    tokens: [...document.querySelectorAll(".cm-content span")]
      .filter((s) => s.className && /^\u037C/.test(s.className)).length,
    gutter: !!document.querySelector(".cm-gutter"),
  }));
  check("页面加载且编辑器挂载", initial.doc.length > 0 && initial.gutter, `doc=${initial.doc.length}字`);
  check("默认 HTML 已载入", initial.doc.includes("把任意 HTML 代码渲染成一张图片"));
  check("语法高亮已生效", initial.tokens > 3, `${initial.tokens} 个高亮 token`);

  /* 1a. 顶栏刷新控件 */
  const headerCtl = await page.evaluate(() => ({
    refreshBtn: !!document.querySelector("#btn-refresh"),
    autoChecked: document.querySelector("#auto-refresh").checked,
  }));
  check("顶栏刷新按钮与自动刷新开关（默认开启）",
    headerCtl.refreshBtn && headerCtl.autoChecked);

  /* 1b. 左栏标签页：代码 / 配置 / 关于 */
  const tabNames = await page.evaluate(() =>
    [...document.querySelectorAll("#main-tabs .tab")].map((t) => t.dataset.tab).join(","));
  check("左栏包含代码/配置/关于三个标签", tabNames === "code,config,about", tabNames);

  /* 1b2. 选中标签与内容融为一体（底边框取面板背景色）；
     容器分隔线保留，未选中标签底边透明露出分隔线 */
  const tabStyle = await page.evaluate(() => {
    const cs = (el, p) => el ? getComputedStyle(el)[p] : null;
    const active = document.querySelector(".tab.is-active");
    const inactive = document.querySelector(".tab:not(.is-active)");
    const tabs = document.querySelector("#main-tabs");
    return {
      activeBg: cs(active, "backgroundColor"),
      activeBottom: cs(active, "borderBottomColor"),
      inactiveBottom: cs(inactive, "borderBottomColor"),
      tabsBottom: cs(tabs, "borderBottomColor"),
    };
  });
  check("选中标签与内容融为一体（无下边框）",
    tabStyle.activeBottom === tabStyle.activeBg &&
      tabStyle.inactiveBottom !== tabStyle.activeBottom &&
      tabStyle.tabsBottom !== "rgba(0, 0, 0, 0)",
    `activeBottom=${tabStyle.activeBottom} inactiveBottom=${tabStyle.inactiveBottom} tabsBottom=${tabStyle.tabsBottom}`);

  await page.click('#main-tabs .tab[data-tab="config"]');
  await sleep(200);
  const cfgState = await page.evaluate(() => ({
    codeHidden: !document.querySelector('.tab-panel[data-panel="code"]').classList.contains("is-active"),
    cfgShown: document.querySelector('.tab-panel[data-panel="config"]').classList.contains("is-active"),
    editorHidden: !document.querySelector(".code-editor").offsetParent,
    hasBgSelect: !!document.querySelector("#bg-select option"),
  }));
  check("切换到「配置」标签", cfgState.codeHidden && cfgState.cfgShown && cfgState.editorHidden,
    `bg选项=${cfgState.hasBgSelect}`);

  await page.click('#main-tabs .tab[data-tab="about"]');
  await sleep(200);
  const aboutState = await page.evaluate(() => ({
    aboutShown: document.querySelector('.tab-panel[data-panel="about"]').classList.contains("is-active"),
    hasKeys: !!document.querySelector(".about-keys"),
    hasLinks: [...document.querySelectorAll(".about-links a")].length,
  }));
  check("切换到「关于」标签（快捷键 + 开源链接）",
    aboutState.aboutShown && aboutState.hasKeys && aboutState.hasLinks >= 2,
    `链接数=${aboutState.hasLinks}`);

  await page.click('#main-tabs .tab[data-tab="code"]');
  await sleep(200);
  const codeBack = await page.evaluate(() => ({
    codeShown: document.querySelector('.tab-panel[data-panel="code"]').classList.contains("is-active"),
    editorVisible: !!document.querySelector(".code-editor").offsetParent,
  }));
  check("切回「代码」标签且编辑器可见", codeBack.codeShown && codeBack.editorVisible);

  /* 1b. 主题计算样式（对齐 tokens.css：深色 · 绿色） */
  const theme = await page.evaluate(() => {
    const cs = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    const tok = document.querySelector('.cm-content [class^="\u037c"]');
    return {
      editorBg: cs(".cm-editor", "backgroundColor"),      // --bg-inset #080d0a
      gutterBg: cs(".cm-gutters", "backgroundColor"),     // --bg-panel #0c120e
      gutterFg: cs(".cm-gutters", "color"),               // --text-faint #52665a
      contentFont: cs(".cm-content", "fontFamily"),
      tokenColor: tok ? getComputedStyle(tok).color : null,
    };
  });
  check("主题生效（编辑器背景 #080d0a）", theme.editorBg === "rgb(8, 13, 10)", theme.editorBg);
  check("主题生效（行号槽背景 #0c120e）", theme.gutterBg === "rgb(12, 18, 14)", theme.gutterBg);
  check("主题生效（等宽字体）", /mono|Consolas|monospace/i.test(theme.contentFont || ""), theme.contentFont);
  check("主题生效（token 着色）", !!theme.tokenColor && theme.tokenColor !== "rgb(220, 233, 222)", theme.tokenColor);

  await page.screenshot({ path: join(shotDir, "1-initial.png") });

  /* 2. 预设：保存当前代码 → 清空 → 从下拉框加载 → 删除 */
  await page.click(".cm-content");
  await page.keyboard.type("<h1>preset-demo</h1>");
  await sleep(300);

  await page.click("#btn-save-preset");
  await page.waitForSelector("#preset-dialog[open]", { timeout: 5000 });
  await page.$eval("#preset-name", (el) => { el.value = "测试预设"; });
  await page.click("#preset-ok");
  await sleep(300);

  const savedRaw = await page.evaluate(() => {
    try { return localStorage.getItem("html2png.presets.v1") || ""; } catch { return ""; }
  });
  check("预设已写入 localStorage", savedRaw.includes("preset-demo"), `len=${savedRaw.length}`);

  await page.click("#btn-clear");
  await sleep(200);
  const clearedDoc = await page.evaluate(() =>
    document.querySelector(".cm-content").textContent);
  check("清空后代码为空", !clearedDoc.includes("preset-demo"),
    `doc=${JSON.stringify(clearedDoc.slice(0, 60))}`);

  const presetId = await page.evaluate(() => {
    const sel = document.querySelector("#preset-select");
    const opt = [...sel.options].find((o) => o.textContent === "测试预设");
    return opt ? opt.value : null;
  });
  check("预设出现在下拉框", !!presetId, presetId || "未找到「测试预设」选项");

  await page.select("#preset-select", presetId);
  await sleep(400);
  const presetDoc = await page.evaluate(() =>
    document.querySelector(".cm-content").textContent);
  check("预设加载生效（恢复代码）", presetDoc.includes("preset-demo"), `doc=${presetDoc.length}字`);

  /* 2a. 加载预设后点「保存预设」自动填充当前预设名（便于快速覆盖） */
  await page.click("#btn-save-preset");
  await page.waitForSelector("#preset-dialog[open]", { timeout: 5000 });
  const filledName = await page.$eval("#preset-name", (el) => el.value);
  check("保存预设自动填充当前预设名", filledName === "测试预设", JSON.stringify(filledName));
  await page.click("#preset-cancel");
  await sleep(200);

  const dialogPromise = new Promise((resolve) =>
    page.once("dialog", (d) => { resolve(d.message()); d.accept(); }));
  await page.click("#btn-del-preset");
  const confirmMsg = await Promise.race([
    dialogPromise,
    sleep(3000).then(() => "TIMEOUT"),
  ]);
  check("删除确认框弹出", confirmMsg !== "TIMEOUT", String(confirmMsg).slice(0, 40));
  await sleep(200);
  const afterDelete = await page.evaluate(() => {
    const sel = document.querySelector("#preset-select");
    return ![...sel.options].some((o) => o.textContent === "测试预设");
  });
  check("删除预设（确认后从列表移除）", afterDelete);

  /* 3. 清空 → 占位符 + 空状态
     （注意：CM6 占位符是 .cm-content 的子节点，空文档时
       textContent 会包含占位符文本，故按占位符出现来断言） */
  await page.click("#btn-clear");
  await sleep(200);
  const cleared = await page.evaluate((ph) => ({
    doc: document.querySelector(".cm-content").textContent,
    placeholderVisible: !!document.querySelector(".cm-placeholder"),
    hasPlaceholderText: document.querySelector(".cm-content").textContent.includes(ph),
    emptyShown: !document.querySelector("#stage-empty").classList.contains("hidden"),
  }), PLACEHOLDER);
  check("清空后文档为空（占位符出现）",
    cleared.hasPlaceholderText && !cleared.doc.includes("preset-demo"),
    `doc=${JSON.stringify(cleared.doc.slice(0, 60))}`);
  check("占位符元素存在", cleared.placeholderVisible);
  await sleep(1200); // 等待预览重建
  const emptyNow = await page.evaluate(() =>
    !document.querySelector("#stage-empty").classList.contains("hidden"));
  check("预览空状态显示", emptyNow);

  /* 4. 输入内容（自动闭合标签是 CM 特性，需计入预期） */
  await page.click(".cm-content");
  await page.keyboard.type("<h1>hello</h1>");
  await sleep(300);
  const typed = await page.evaluate(() => ({
    doc: document.querySelector(".cm-content").textContent,
    focused: document.activeElement === document.querySelector(".cm-content"),
    editorFocused: !!document.querySelector(".cm-editor.cm-focused"),
  }));
  check("键盘输入生效", typed.doc.includes("hello"), `doc=${JSON.stringify(typed.doc)}`);
  check("编辑器获得焦点", typed.focused && typed.editorFocused);

  /* 4b. 自动闭合标签特性 */
  await page.keyboard.type("<p>");
  await sleep(200);
  const autoClosed = await page.evaluate(() =>
    document.querySelector(".cm-content").textContent.includes("<p></p>"));
  check("自动闭合标签（<p> → <p></p>）", autoClosed);

  /* 5. localStorage 持久化 */
  await sleep(700); // persist debounce 400ms
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".cm-editor", { timeout: 10000 });
  await sleep(300);
  const afterReload = await page.evaluate(() =>
    document.querySelector(".cm-content").textContent);
  check("刷新后内容持久化", afterReload.includes("hello"));

  /* 5b. 自动刷新开关（关闭→冻结预览，重开→补渲积压，手动刷新→重建） */
  const srcdocBefore = await page.evaluate(() => document.getElementById("frame").srcdoc);
  await page.click(".switch-header");               // 关闭自动刷新
  await sleep(200);
  await page.click(".cm-content");
  await page.keyboard.type("<em>frozen</em>");
  await sleep(800);                                 // 超过 debounce 350ms
  const frozen = await page.evaluate(() => ({
    doc: document.querySelector(".cm-content").textContent,
    srcdoc: document.getElementById("frame").srcdoc,
  }));
  check("关闭自动刷新后编辑不重建预览",
    frozen.srcdoc === srcdocBefore && frozen.doc.includes("frozen"),
    `srcdoc相同=${frozen.srcdoc === srcdocBefore}`);

  await page.click(".switch-header");               // 重新开启自动刷新
  await sleep(900);                                 // debounce 350ms + 重建
  const caughtUp = await page.evaluate(() =>
    document.getElementById("frame").srcdoc);
  check("重新开启自动刷新后补渲积压变更",
    caughtUp !== srcdocBefore && caughtUp.includes("frozen"),
    `srcdoc含frozen=${caughtUp.includes("frozen")}`);

  await page.click(".switch-header");               // 再次关闭
  await sleep(200);
  await page.click(".cm-content");
  await page.keyboard.type("<b>manual</b>");
  await sleep(800);
  const srcdocStale = await page.evaluate(() => document.getElementById("frame").srcdoc);
  check("关闭自动刷新时预览保持冻结", !srcdocStale.includes("manual"));

  await page.click("#btn-refresh");
  await sleep(1200);                                // 等待重建 + ready
  const refreshed = await page.evaluate(() => document.getElementById("frame").srcdoc);
  check("手动「刷新」按钮重建预览",
    refreshed !== srcdocStale && refreshed.includes("manual"),
    `len=${refreshed.length}`);

  await page.click(".switch-header");               // 恢复自动刷新（默认态）
  await sleep(300);

  /* 6. Ctrl+Enter 下载全链路
     （无头 Edge 不派发 page 'download' 事件，改为轮询下载目录
       验证文件落盘——实测 downloadBehavior: allow 会正确保存文件） */
  const DL_RE = /^html2png-\d{8}-\d{6}\.png$/;
  async function waitDownloadFile(timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = (await readdir(shotDir)).find((f) => DL_RE.test(f));
      if (hit) return hit;
      await sleep(200);
    }
    return null;
  }

  await page.click(".cm-content");
  const focusState = await page.evaluate(() => ({
    focused: document.activeElement === document.querySelector(".cm-content"),
    editorFocused: !!document.querySelector(".cm-editor.cm-focused"),
  }));
  check("下载前编辑器已聚焦", focusState.focused && focusState.editorFocused,
    JSON.stringify(focusState));

  await page.keyboard.down("Control");
  await page.keyboard.press("Enter");
  await page.keyboard.up("Control");
  let dlFile = await waitDownloadFile();
  check("Ctrl+Enter 触发下载", !!dlFile, dlFile || "下载目录中未发现文件");

  /* 6b. 兜底：直接点下载按钮（区分按键绑定问题与渲染管线问题） */
  if (!dlFile) {
    const diag = await page.evaluate(() => ({
      toasts: [...document.querySelectorAll(".toasts .toast")].map((t) => t.textContent),
      overlayHidden: document.querySelector("#stage-overlay").classList.contains("hidden"),
    }));
    console.log("    [诊断] toasts=", JSON.stringify(diag.toasts), " overlayHidden=", diag.overlayHidden);
    await page.click("#btn-download");
    dlFile = await waitDownloadFile();
    check("按钮下载（兜底）", !!dlFile, dlFile || "下载目录中未发现文件");
  }

  await page.screenshot({ path: join(shotDir, "2-final.png") });

  /* 7. 控制台无错误 */
  check("无控制台错误", consoleErrors.length === 0 && pageErrors.length === 0,
    consoleErrors.concat(pageErrors).slice(0, 3).join(" | "));

  /* 7b. 响应式：手机视口（390×844）下无横向溢出、
     预览在上/标签页在下上下分屏各 50%、标尺隐藏 */
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(400);
  const rwd = await page.evaluate(() => {
    const stage = document.querySelector(".preview-stage");
    const ps = [...document.querySelectorAll(".app-body > .panel")];
    const [code, prev] = ps;
    const cb = code.getBoundingClientRect();
    const pb = prev.getBoundingClientRect();
    return {
      docW: document.documentElement.clientWidth,
      docScrollW: document.documentElement.scrollWidth,
      noHScroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      noVScroll: document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1,
      previewOnTop: pb.top < cb.top,
      halfSplit: Math.abs(pb.height - cb.height) < 12,
      rulerHidden: getComputedStyle(document.querySelector(".ruler-x")).display === "none",
      stageCols: getComputedStyle(stage).gridTemplateColumns.split(" ").length,
      headerWrapped: document.querySelector(".app-header").getBoundingClientRect().height > 70,
    };
  });
  check("手机视口无横向溢出", rwd.noHScroll, `${rwd.docW}/${rwd.docScrollW}`);
  check("手机视口上下分屏（预览在上、标签页在下各 50%）",
    rwd.previewOnTop && rwd.halfSplit, `heights=${rwd.docW > 0 ? "ok" : "?"}`);
  check("手机视口无纵向滚动", rwd.noVScroll);
  check("手机视口标尺仍显示（2×2 舞台）", !rwd.rulerHidden && rwd.stageCols === 2);
  check("手机视口顶栏换行", rwd.headerWrapped);

  console.log(`\n截图目录：${shotDir}`);
} catch (err) {
  failed++;
  console.error("✘ 冒烟测试异常：", err);
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log(failed === 0 ? "\n全部通过 ✅" : `\n${failed} 项失败 ❌`);
process.exit(failed === 0 ? 0 : 1);
