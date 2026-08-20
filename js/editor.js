/* ============================================================
   editor.js — 代码编辑区（行号槽 + 文本域 + 快捷键）
   ============================================================ */

/**
 * 创建代码编辑器。
 * @param {HTMLElement} container 挂载容器
 * @param {{onChange:(value:string)=>void, onQuickRun:()=>void}} hooks
 */
export function createEditor(container, { onChange, onQuickRun }) {
  container.classList.add("code-editor");
  container.innerHTML = `
    <div class="gutter" aria-hidden="true"><pre class="gutter-inner"></pre></div>
    <textarea
      class="code-input"
      spellcheck="false"
      wrap="off"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      placeholder="在这里粘贴或输入 HTML 代码…&#10;&#10;支持完整文档或片段：&lt;style&gt;、&lt;link&gt; 等都会生效。"
    ></textarea>
  `;

  const gutter = container.querySelector(".gutter");
  const gutterInner = gutter.querySelector(".gutter-inner");
  const ta = container.querySelector(".code-input");

  function renderGutter() {
    const count = ta.value.split("\n").length;
    let out = "";
    for (let i = 1; i <= count; i++) out += i + "\n";
    gutterInner.textContent = out;
    gutterInner.style.minHeight = Math.max(ta.scrollHeight, ta.clientHeight) + "px";
  }

  ta.addEventListener("input", () => {
    renderGutter();
    onChange(ta.value);
  });

  ta.addEventListener("scroll", () => {
    gutter.scrollTop = ta.scrollTop;
  });

  ta.addEventListener("keydown", (e) => {
    // Tab：插入两个空格
    if (e.key === "Tab") {
      e.preventDefault();
      ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end");
      onChange(ta.value);
      renderGutter();
      return;
    }
    // Ctrl/Cmd + Enter：快速下载
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onQuickRun && onQuickRun();
    }
  });

  return {
    getValue: () => ta.value,
    setValue(value) {
      ta.value = value;
      renderGutter();
    },
    focus: () => ta.focus(),
    clear() {
      ta.value = "";
      renderGutter();
      onChange("");
    },
  };
}
