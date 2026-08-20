/* ============================================================
   config.js — 默认值、常量
   ============================================================ */

/** 应用默认状态 */
export const DEFAULTS = {
  html: "",            // 用户 HTML 代码
  widthMode: "auto",   // 'auto' 自动收缩 | 'fixed' 固定宽度
  fixedWidth: 1280,    // 固定宽度（px）
  scale: 2,            // 输出缩放倍数
  format: "png",       // 'png' | 'jpeg' | 'webp'
  background: "auto",  // 'auto' | 'transparent' | 'white' | 'black' | 'custom'
  customBg: "#22c55e", // 自定义背景色
  runScripts: false,   // 是否执行用户 HTML 中的 JS
  autoRefresh: true,   // 编辑时是否自动刷新预览（关闭后需手动点「刷新」）
  // —— html-to-image 扩展选项（仅影响导出，不影响预览）——
  quality: 0.92,            // JPEG/WebP 输出质量（0.5–1）
  skipFonts: false,         // 跳过 @font-face 字体嵌入
  fontEmbedCSS: "",         // 自定义字体嵌入 CSS（覆盖自动检测）
  preferredFontFormat: "",  // 首选字体格式：'' | woff2 | woff | ttf | otf | eot
  includeQueryParams: false, // 资源 URL 是否保留查询参数
  cacheBust: false,          // 资源 URL 追加时间戳绕过缓存
  placeholderColor: "#e5e7eb", // 跨域资源加载失败时的占位色
  filterSelector: "",        // 导出时排除的元素（CSS 选择器，逗号分隔）
  extraStyle: "",            // 导出时附加到根元素的样式（CSS 声明）
};

/** 自动宽度模式的上下限（px） */
export const AUTO_MIN_WIDTH = 320;
export const AUTO_MAX_WIDTH = 4096;

/** 固定宽度预设 */
export const WIDTH_PRESETS = [320, 375, 414, 768, 1024, 1280, 1920];

/** 缩放选项 */
export const SCALES = [1, 2, 3];

/** 输出格式选项 */
export const FORMATS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

/** 背景选项 */
export const BACKGROUNDS = [
  { value: "auto", label: "跟随页面" },
  { value: "transparent", label: "透明" },
  { value: "white", label: "白色" },
  { value: "black", label: "黑色" },
  { value: "custom", label: "自定义" },
];

/** 字体嵌入格式选项（'' 表示自动） */
export const FONT_FORMATS = [
  { value: "", label: "自动" },
  { value: "woff2", label: "woff2" },
  { value: "woff", label: "woff" },
  { value: "ttf", label: "ttf" },
  { value: "otf", label: "otf" },
  { value: "eot", label: "eot" },
];

/** 本地存储 key */
export const STORAGE_KEY = "html2png.v1";

/** 协议命名空间 */
export const MSG = "__h2p";

/** 超时（ms） */
export const READY_TIMEOUT = 10000;
export const CAPTURE_TIMEOUT = 25000;

/** 默认示例 HTML（首次打开时展示） */
export const DEFAULT_HTML = `<div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#052e16,#064e3b);color:#d1fae5;width:540px;padding:36px;">
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:26px;">
    <div style="width:52px;height:52px;background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:26px;color:#04150b;">&#8681;</div>
    <div>
      <div style="font-size:24px;font-weight:700;color:#ffffff;">HTML &rarr; PNG</div>
      <div style="color:#6ee7b7;font-size:13px;margin-top:2px;">把任意 HTML 代码渲染成一张图片</div>
    </div>
  </div>
  <div style="display:flex;gap:14px;">
    <div style="flex:1;background:rgba(255,255,255,.08);padding:16px;border-left:3px solid #22c55e;">
      <div style="font-size:12px;color:#6ee7b7;">自动宽度</div>
      <div style="font-size:26px;font-weight:700;margin-top:4px;">max-content</div>
    </div>
    <div style="flex:1;background:rgba(255,255,255,.08);padding:16px;border-left:3px solid #34d399;">
      <div style="font-size:12px;color:#6ee7b7;">输出缩放</div>
      <div style="font-size:26px;font-weight:700;margin-top:4px;">2&times;</div>
    </div>
  </div>
  <div style="margin-top:22px;font-size:13px;color:#a7f3d0;line-height:1.8;">
    &#10003; 实时预览　&#10003; 透明背景　&#10003; 沙箱隔离脚本
  </div>
</div>`;

/** 计算某种格式的下载扩展名 */
export function formatExt(format) {
  return format === "jpeg" ? "jpg" : format;
}
