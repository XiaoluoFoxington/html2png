/* ============================================================
   build.mjs — 打包 CodeMirror 6 → vendor/codemirror.min.js
   ------------------------------------------------------------
   用法：cd tools/editor-bundle && npm install && npm run build
   说明：
   - 仅开发期工具；构建产物（vendor/codemirror.min.js）提交进版本库，
     应用运行时不依赖 node_modules。
   - 升级 CodeMirror 时：改 package.json 版本号 → 重装 → 重新构建。
   ============================================================ */

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "vendor", "codemirror.min.js");

const result = await build({
  entryPoints: [join(HERE, "entry.js")],
  bundle: true,
  minify: true,
  format: "esm",
  target: ["es2020"],
  outfile: OUT,
  legalComments: "none",
  banner: {
    js: "/* CodeMirror 6 打包产物（自动生成，勿手改；重建：tools/editor-bundle 下 npm run build） */",
  },
  logLevel: "info",
  metafile: true,
});

const inputs = Object.keys(result.metafile.inputs).length;
const outKey = Object.keys(result.metafile.outputs).find((k) =>
  k.replace(/\\/g, "/").endsWith("vendor/codemirror.min.js")
);
const bytes = outKey ? result.metafile.outputs[outKey].bytes : null;
console.log(`✔ 已生成 ${OUT}`);
console.log(
  `  输入模块 ${inputs} 个，产物 ${bytes ? (bytes / 1024).toFixed(0) : "?"} KB`
);
