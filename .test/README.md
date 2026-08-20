# .test — 回归验证测试套件

针对预览区三个已知问题的无依赖回归测试（Node 22+ 内置 WebSocket / fetch / zlib，零第三方包）：

1. **预览区外套/内容间距**：标尺固定在舞台顶边/左边，内容在 `stage-scroll` 中滚动；
2. **标尺固定**：滚动内容时刻度随 `scrollLeft/scrollTop` 平移重绘；
3. **透明色显示为白色**：透明内容区预览应显示棋盘格（而非 UA 白色画布），导出仍保持真透明。

## 前置

- Node.js 22+；
- 应用本地服务器已启动：`node tools/serve.mjs`（默认 8765）；
- 用无头浏览器打开应用并暴露 CDP 端口，例如（Edge）：

  ```powershell
  $edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
  & $edge --headless --disable-gpu --no-first-run `
      --user-data-dir="$env:TEMP\h2p-test-prof" `
      --remote-debugging-port=9223 --window-size=1600,900 `
      "http://127.0.0.1:8765/"
  ```

## 运行

```powershell
node verify.mjs [调试端口=9223]     # 全部视觉场景 + 滚动联动，输出 PASS/FAIL
node e2e.mjs [调试端口=9223]        # tests/e2e.html 全流程冒烟（PASS 640x240 ...）
node export-transparency.mjs [调试端口=9223]  # 导出透明性（棋盘格剥离后 alpha=0）
node capture.mjs <状态JSON> <输出PNG> [调试端口]  # 单场景截图（等待预览就绪）
node check-bottom.mjs [调试端口]    # 底边 1px 透明条回归（预览 + 导出）
node check-overflow.mjs [调试端口]  # 固定宽度溢出：导出按视口裁剪（与预览一致）
node check-popup.mjs [调试端口]     # 绝对定位弹层溢出边界时导出仍包含其内容
```

任一校验失败时退出码为 1。

## 文件

| 文件 | 说明 |
| --- | --- |
| `verify.mjs` | 一键回归：遍历 `states/*.json` 截图 + 像素断言 + 滚动联动断言 |
| `capture.mjs` | 单场景截图助手（写 localStorage → 重载 → 等 overlay 消失 → 截图） |
| `check-bottom.mjs` | 底边 1px 透明条回归：小数高度内容（如 285.39px）的预览/导出底边无透明条 |
| `check-overflow.mjs` | 固定宽度溢出：内容更宽时导出按视口宽度裁剪，与预览/文档一致 |
| `check-popup.mjs` | 绝对定位弹层溢出内容边界时，测量仍包含弹层（不被 overflow:hidden 裁剪） |
| `e2e.mjs` | 运行 `../tests/e2e.html` 并读取结果 |
| `export-transparency.mjs` | 直接走 html-to-image 导出，校验内容外像素 alpha=0 |
| `cdp.mjs` / `png.mjs` | 极简 CDP 客户端 / PNG 解码器（测试专用） |
| `states/*.json` | 各场景的应用状态（写入 localStorage 的 `html2png.v1`） |
| `shots/` | 验证截图（`verify-*.png` 由 `verify.mjs` 生成；其余为历史留档） |
| `repro-transparent-canvas.html` | 独立复现页：iframe 透明画布（白色画布怪癖）演示 |

## 场景说明（states/）

- `default.json` — 默认示例，内容区应为不透明渐变、无白块；
- `auto-transparent.json` — **跟随页面 + 无背景内容**（曾复现「预览白、导出透明」），内容区应为棋盘格；
- `transparent-fixed.json` / `transparent-auto.json` — 透明模式，内容右侧/透明区应为棋盘格；
- `empty.json` — 空状态，舞台应为棋盘格；
- `white.json` — 白底模式，内容右侧应为本白（模式正确）；
- `fixed-tall.json` — 固定宽度高内容，行背景 `#0e1510`；
- `body-style-bg.json` / `html-style-bg.json` — 页面自带 `<style>` 背景时不被棋盘格覆盖；
- `body-inline-bg.json` — body 内联背景会被 srcdoc 构建丢弃，应按透明处理（棋盘格）。
