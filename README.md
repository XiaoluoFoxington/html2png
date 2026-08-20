# HTML → PNG

输入 HTML 代码，实时预览并生成 PNG / JPEG / WebP 图片。

原生静态前端项目：无框架、无构建步骤，开箱即用；代码分层清晰，遵循最佳实践。

## 功能

- **高级编辑**：基于 CodeMirror 6 的代码编辑器——HTML 语法高亮（含内嵌 CSS / JS）、
  行号 / 代码折叠 / 括号匹配 / 自动闭合标签、`Ctrl+F` 查找替换、多光标、撤销历史
- **实时预览**：输入 HTML 即渲染，所见即所得（预览与输出严格一致）
- **手动/自动刷新**：顶栏「自动刷新」开关控制编辑时是否实时重建预览（默认开启）；
  关闭后编辑不自动更新，点「刷新」按钮手动重建（会重新加载资源与脚本）
- **像素标尺**：预览区顶边/左边固定横/纵标尺与尺寸角块，滚动内容时刻度同步平移，所见刻度即内容坐标
- **HTML → 图片**：PNG（默认）/ JPEG / WebP，输出倍数 1× / 2× / 3×
- **宽度模式**：
  - `自动`：按内容自然宽度收缩（shrink-wrap，组件截图首选）
  - `固定`：320 / 375 / 414 / 768 / 1024 / 1280 / 1920 px 或自定义
- **背景控制**：跟随页面 / 透明 / 白色 / 黑色 / 自定义色（棋盘格预览表示透明）
- **高级选项**（html-to-image 扩展，仅影响导出、不影响预览）：
  - **质量**：JPEG / WebP 输出质量（50%–100%，PNG 无损不受影响）
  - **字体格式**：`@font-face` 首选嵌入格式（woff2 / woff / ttf / otf / eot / 自动）
  - **跳过嵌入**：跳过字体嵌入（更快，但自定义字体可能丢失）
  - **字体 CSS**：自定义 `@font-face` CSS，覆盖自动检测
  - **保留查询参数**：资源 URL 保留查询参数（默认剥离）
  - **绕过缓存**：资源 URL 追加时间戳，绕过 HTTP 缓存
  - **占位色**：跨域资源加载失败时导出的占位色（默认灰）
  - **排除元素**：CSS 选择器（逗号分隔），导出时剔除匹配的元素及其子树
  - **附加样式**：导出时应用到根元素的 CSS 声明（如 `font-family: Arial`）
- **安全沙箱**：预览运行在 `<iframe sandbox="allow-scripts">` 中（不透明源），
  与宿主页面完全隔离；默认剥离用户 HTML 中的脚本，可手动开启「执行 JS」
- **用户预设**：把当前代码框中的 HTML 命名保存为预设（存于 localStorage），
  之后从顶栏下拉框一键加载；支持覆盖保存与删除
- **复制到剪贴板**：一键复制 PNG，直接粘贴到聊天 / 文档
- **本地记忆**：HTML 与设置自动保存到 localStorage，刷新不丢失
- **快捷键**：`Ctrl/Cmd + Enter` 快速下载

## 快速开始

需要 Node.js 18+（或任意静态服务器）。推荐：

```bash
# 方式一：项目自带服务器（带 CORS 头，沙箱渲染必需）
node tools/serve.mjs          # 默认 8765，监听 0.0.0.0（局域网可访问）
node tools/serve.mjs 9000     # 自定义端口
node tools/serve.mjs 8765 127.0.0.1   # 仅本机访问

# Windows 双击 serve.cmd，macOS/Linux 运行 ./serve.sh
```

浏览器打开 <http://127.0.0.1:8765> 即可（局域网设备用启动日志中打印的本机 IP）。

> 也可以使用任意静态服务器（`npx serve`、VS Code Live Server 等），
> 但需其返回 `Access-Control-Allow-Origin: *`，否则沙箱内跨域图片/字体无法嵌入输出。
> 注意：**不要直接双击打开 index.html** —— ES Module 与沙箱脚本在 `file://`
> 协议下会被浏览器拦截。

## 目录结构

```
html2png/
├── index.html              # 页面外壳
├── css/
│   ├── tokens.css          # 设计变量（深色 · 绿色 · 直角）
│   ├── base.css            # 重置 / 排版 / 滚动条
│   ├── layout.css          # 应用外壳布局
│   ├── components.css      # 按钮 / 选择框 / 开关 / 提示条等
│   ├── editor.css          # 代码编辑区
│   └── preview.css         # 预览舞台 / 设置 / 统计
├── js/
│   ├── main.js             # 入口：状态、装配、调度
│   ├── config.js           # 默认值 / 常量
│   ├── utils.js            # 通用工具
│   ├── presets.js          # 用户预设（localStorage 读写）
│   ├── editor.js           # 代码编辑器（CodeMirror 6：高亮 / 折叠 / 查找 / 快捷键）
│   ├── preview.js          # 沙箱 iframe 与渲染协议
│   ├── capture.js          # 下载 / 剪贴板
│   ├── ui.js               # 控件绑定 / 提示 / 统计
│   └── iframe-bootstrap.js # 沙箱内部：测量尺寸 + 渲染图片
├── vendor/
│   ├── html-to-image.min.js # 第三方渲染库（本地化，离线可用）
│   └── codemirror.min.js    # CodeMirror 6 编辑器（本地化打包产物，离线可用）
├── assets/
│   └── favicon.svg
└── tools/
    ├── serve.mjs           # 零依赖 CORS 静态服务器
    └── editor-bundle/      # 开发期工具：CodeMirror 打包 + 无头浏览器冒烟测试
```

## 架构说明

```
┌──────────────────────────────┐      postMessage       ┌───────────────────────────┐
│ 宿主页面 (main.js)            │ ◄────────────────────► │ 沙箱 iframe（不透明源）     │
│  · 编辑 / 设置 / 下载          │    __h2p:{ready,size,  │  · 用户 HTML + 脚本（隔离） │
│  · 组 srcdoc、发渲染请求       │     capture,result,…}  │  · 测量内容尺寸             │
└──────────────────────────────┘                         │  · html-to-image 渲染图片   │
                                                         └───────────────────────────┘
```

关键点：

1. **为什么用 iframe 渲染**：任意用户 HTML/脚本放进沙箱 iframe，
   即使代码是恶意的也无法触碰宿主页面（不透明源）。
2. **为什么渲染在 iframe 内部**：父页面无法读取跨源 iframe 的 DOM，
   因此「测量尺寸」与「栅格化」都在 iframe 内完成，结果经 postMessage 回传。
3. **渲染引擎**：本地化引入 [html-to-image](https://github.com/bubkoo/html-to-image)
   （SVG `foreignObject` 方案，原生排版，对现代 CSS 兼容性好），
   支持像素密度、字体嵌入、图片内联。
4. **WYSIWYG**：预览 iframe 与最终输出使用同一份文档与注入样式，
   所见即所得；透明区域以棋盘格显示。

## 使用提示

- **脚本开关**：默认剥离 `<script>` 与内联事件；开启「执行 JS」后，
  用户脚本在沙箱内运行（`canvas`、动画等可正常渲染）。
- **跨域资源**：远程图片 / 字体需要服务器返回 CORS 头才会被嵌入输出；
  否则在输出中显示为占位灰块（预览不受影响）。推荐使用允许跨域的图床
  或 `data:` 图片。项目自带 `tools/serve.mjs` 已带 CORS 头，本机相对路径
  图片可直接使用。
- **固定宽度溢出**：固定宽度下内容更宽时，输出按视口宽度裁剪
  （与浏览器截图行为一致）。
- **兼容性**：Chrome / Edge / Firefox 最新版；
  「复制图片」需要 HTTPS 或 localhost 环境。

## 测试

`tests/e2e.html` 是一个可独立运行的冒烟测试页：它通过真实的
`preview.js` 模块 + 沙箱 iframe + html-to-image 完成一次「HTML →
PNG」全流程渲染，并校验输出图片的尺寸与中心像素颜色。在任意浏览器
中打开该页面即可查看结果（渲染管线会给出 `PASS` / `FAIL` 结论）。

编辑器集成还有自动化冒烟测试（无头浏览器驱动，覆盖加载 / 高亮 /
预设保存-加载-删除 / 自动刷新与手动刷新 / 清空 / 输入 / 持久化 /
Ctrl+Enter 下载）：

```bash
cd tools/editor-bundle && npm run smoke
```

## 编辑器依赖的构建（可选）

应用本身仍是纯静态、无构建步骤；`vendor/codemirror.min.js` 是
CodeMirror 6 的预打包产物，已提交进版本库，**日常使用无需构建**。
仅当需要升级 CodeMirror 或修改打包入口时才需要：

```bash
cd tools/editor-bundle
npm install          # 首次安装（仅开发期）
npm run build        # 重新打包 → vendor/codemirror.min.js
```

## 技术栈

原生 HTML5 / CSS3 / JavaScript（ES Modules），第三方依赖仅
`html-to-image` 与 CodeMirror 6（均已本地化到 `vendor/`，离线可用）。
