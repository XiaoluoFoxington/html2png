# tools/editor-bundle — 编辑器开发期工具

本目录**不参与运行时**，仅用于构建与测试 `vendor/codemirror.min.js`。

## 命令

```bash
npm install        # 首次：安装打包 / 测试依赖
npm run build      # 打包 CodeMirror 6 → ../../vendor/codemirror.min.js
npm run smoke      # 无头浏览器冒烟测试（需系统 Edge/Chrome）
```

## 升级 CodeMirror

1. 修改 `package.json` 中的 `codemirror` 等版本号
2. `npm install && npm run build`
3. `npm run smoke` 回归
4. 提交 `vendor/codemirror.min.js`

## 文件

- `entry.js`   —— 打包入口：导出编辑器宿主用到的构建块
- `build.mjs`  —— esbuild 打包脚本（ESM、压缩、单文件）
- `smoke.mjs`  —— 无头浏览器冒烟测试（自动起服务器、跑完即关）
