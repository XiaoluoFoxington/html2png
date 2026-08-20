/* ============================================================
   entry.js — CodeMirror 6 打包入口
   仅导出编辑器宿主（js/editor.js）需要的构建块。
   运行 `npm run build` 后产物为 vendor/codemirror.min.js。
   ============================================================ */

export { EditorView, placeholder, keymap } from "@codemirror/view";
export { EditorState, Prec } from "@codemirror/state";
export { basicSetup } from "codemirror";
export { html } from "@codemirror/lang-html";
export { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
export { tags } from "@lezer/highlight";
