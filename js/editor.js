/* ============================================================
   editor.js — 代码编辑区（CodeMirror 6）
   ------------------------------------------------------------
   基于 vendor/codemirror.min.js（打包产物，重建方式见
   tools/editor-bundle/README.md）：
   - HTML 语法高亮（含内嵌 CSS / JS）
   - 行号 / 折叠 / 括号匹配 / 自动闭合标签
   - Ctrl+F 查找替换、多光标、历史撤销
   对外 API 与旧版 textarea 完全一致：
   { getValue, setValue, focus, clear } + onChange / onQuickRun 钩子
   ============================================================ */

import {
  EditorView,
  EditorState,
  basicSetup,
  html,
  placeholder,
  keymap,
  Prec,
  HighlightStyle,
  syntaxHighlighting,
  tags,
} from "../vendor/codemirror.min.js";

/* ---------- 高亮配色（对齐 tokens.css 深色 · 绿色主题） ---------- */

const highlight = HighlightStyle.define([
  { tag: tags.comment, color: "#5f7568", fontStyle: "italic" },
  { tag: [tags.string, tags.attributeValue], color: "#86efac" },
  { tag: tags.number, color: "#fbbf24" },
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword], color: "#34d399" },
  { tag: tags.tagName, color: "#4ade80" },
  { tag: tags.attributeName, color: "#a3e635" },
  { tag: tags.propertyName, color: "#7dd3fc" },
  { tag: [tags.className], color: "#6ee7b7" },
  { tag: [tags.bool, tags.null, tags.atom, tags.self], color: "#fbbf24" },
  { tag: [tags.operator, tags.operatorKeyword], color: "#9fb6a5" },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: "#82968a" },
  { tag: tags.angleBracket, color: "#52665a" },
  { tag: [tags.meta, tags.processingInstruction], color: "#82968a" },
  { tag: [tags.invalid], color: "#f87171" },
]);

/* ---------- 编辑器外观（继承 CSS 变量） ---------- */

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--bg-inset)",
    fontSize: "13px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.7",
  },
  ".cm-content": {
    caretColor: "var(--accent)",
    padding: "14px 0",
  },
  ".cm-line": { padding: "0 16px" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(34,197,94,0.22)",
  },
  ".cm-selectionMatch": { backgroundColor: "rgba(34,197,94,0.18)" },
  ".cm-activeLine": { backgroundColor: "rgba(34,197,94,0.05)" },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(34,197,94,0.22)",
    color: "#ffffff",
  },
  ".cm-nonmatchingBracket": { color: "var(--danger)" },
  ".cm-gutters": {
    backgroundColor: "var(--bg-panel)",
    color: "var(--text-faint)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 12px 0 16px",
    minWidth: "3.4em",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(34,197,94,0.08)",
    color: "var(--accent)",
  },
  ".cm-foldGutter .cm-gutterElement": { padding: "0 8px 0 4px" },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--accent-soft)",
    border: "none",
    color: "var(--accent)",
    margin: "0 2px",
  },
  ".cm-placeholder": { color: "var(--text-faint)", whiteSpace: "pre-wrap" },
  ".cm-searchMatch": { backgroundColor: "rgba(251,191,36,0.25)" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "rgba(251,191,36,0.45)" },
  ".cm-panels": {
    backgroundColor: "var(--bg-panel)",
    color: "var(--text)",
  },
  ".cm-panels.cm-panels-bottom": { borderTop: "1px solid var(--border)" },
  ".cm-panels.cm-panels-top": { borderBottom: "1px solid var(--border)" },
  ".cm-textfield, .cm-button": {
    fontFamily: "var(--font-ui)",
    fontSize: "12px",
    color: "var(--text)",
    backgroundColor: "var(--bg-inset)",
    border: "1px solid var(--border-strong)",
  },
  ".cm-button": { cursor: "pointer" },
  ".cm-button:hover": { borderColor: "var(--accent)" },
  ".cm-tooltip": {
    backgroundColor: "var(--bg-raise)",
    color: "var(--text)",
    border: "1px solid var(--border-strong)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--accent-soft)",
    color: "var(--text)",
  },
  ".cm-completionDetail": { color: "var(--text-dim)", fontStyle: "italic" },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-mono)" },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": { padding: "2px 8px" },
});

/* ---------- 编辑器工厂 ---------- */

/**
 * 创建代码编辑器（CodeMirror 6）。
 * @param {HTMLElement} container 挂载容器
 * @param {{onChange:(value:string)=>void, onQuickRun:()=>void}} hooks
 * @returns {{getValue:()=>string, setValue:(v:string)=>void, focus:()=>void, clear:()=>void}}
 */
export function createEditor(container, { onChange, onQuickRun }) {
  container.classList.add("code-editor");

  // 程序化 setValue 时抑制 onChange（与旧版 textarea 行为一致：
  // 调用方自己负责重建调度）
  let suppress = false;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && !suppress) onChange(update.state.doc.toString());
  });

  const quickRunKeymap = Prec.highest(
    keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          onQuickRun && onQuickRun();
          return true;
        },
      },
    ])
  );

  const view = new EditorView({
    parent: container,
    state: EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        html(),
        syntaxHighlighting(highlight),
        editorTheme,
        placeholder(
          "在这里粘贴或输入 HTML 代码…\n\n支持完整文档或片段：<style>、<link> 等都会生效。"
        ),
        updateListener,
        quickRunKeymap,
      ],
    }),
  });

  return {
    getValue: () => view.state.doc.toString(),
    setValue(value) {
      if (view.state.doc.toString() === value) return;
      suppress = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
      suppress = false;
    },
    focus: () => view.focus(),
    clear() {
      suppress = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: "" },
      });
      suppress = false;
      onChange("");
    },
  };
}
