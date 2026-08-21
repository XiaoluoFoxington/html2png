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

/** 默认示例 HTML（首次打开时展示）：功能简介卡片，同时覆盖
    flex / 表格 / 列表 / 引用块 / 徽章 / 按钮 / 圆角 / 渐变等格式 */
export const DEFAULT_HTML = `<div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#052e16,#064e3b);color:#d1fae5;width:540px;padding:36px;box-sizing:border-box;box-shadow:0 12px 32px rgba(0,0,0,.35);">
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
    <div style="width:52px;height:52px;flex:none;border-radius:12px;background:linear-gradient(135deg,#22c55e,#047857);display:flex;align-items:center;justify-content:center;font-size:26px;color:#04150b;">&#8681;</div>
    <div style="min-width:0;">
      <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:.02em;">HTML &rarr; PNG</div>
      <div style="color:#6ee7b7;font-size:13px;margin-top:2px;">把任意 HTML 代码渲染成一张图片</div>
    </div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
    <span style="background:rgba(34,197,94,.16);border:1px solid rgba(34,197,94,.45);color:#4ade80;font-size:12px;padding:3px 10px;border-radius:999px;">实时预览</span>
    <span style="background:rgba(56,189,248,.14);border:1px solid rgba(56,189,248,.4);color:#38bdf8;font-size:12px;padding:3px 10px;border-radius:999px;">透明背景</span>
    <span style="background:rgba(251,191,36,.14);border:1px solid rgba(251,191,36,.4);color:#fbbf24;font-size:12px;padding:3px 10px;border-radius:999px;">沙箱隔离</span>
    <span style="background:rgba(167,139,250,.14);border:1px solid rgba(167,139,250,.4);color:#a78bfa;font-size:12px;padding:3px 10px;border-radius:999px;">零构建</span>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
    <thead>
      <tr>
        <th style="text-align:left;padding:8px 10px;border-bottom:2px solid rgba(34,197,94,.4);color:#6ee7b7;font-weight:600;">格式</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:2px solid rgba(34,197,94,.4);color:#6ee7b7;font-weight:600;">特点</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700;color:#ffffff;">PNG</td><td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.08);color:#a7f3d0;">无损，适合直接贴图</td></tr>
      <tr><td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700;color:#ffffff;">JPEG</td><td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.08);color:#a7f3d0;">体积小，质量可调</td></tr>
      <tr><td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700;color:#ffffff;">WebP</td><td style="padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.08);color:#a7f3d0;">新一代，更省空间</td></tr>
    </tbody>
  </table>
  <ul style="margin:0 0 20px;padding-left:20px;font-size:13px;line-height:2;">
    <li>输入 HTML 即见即所得</li>
    <li>像素标尺与尺寸统计</li>
    <li>预设一键保存与加载</li>
  </ul>
  <blockquote style="margin:0 0 20px;padding:12px 16px;border-left:3px solid #22c55e;background:rgba(255,255,255,.06);font-size:13px;line-height:1.8;color:#a7f3d0;">
    在「代码」中输入 HTML 实时预览，在「配置」中调整输出参数，点「下载图片」即可导出。
  </blockquote>
  <div style="padding-top:18px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;color:#82968a;text-align:center;line-height:1.9;">
    快捷键
    <span style="display:inline-block;padding:1px 6px;margin:0 2px;border:1px solid rgba(255,255,255,.25);border-bottom-width:2px;font-family:ui-monospace,'Cascadia Code',Consolas,monospace;">Ctrl</span> +
    <span style="display:inline-block;padding:1px 6px;margin:0 2px;border:1px solid rgba(255,255,255,.25);border-bottom-width:2px;font-family:ui-monospace,'Cascadia Code',Consolas,monospace;">Enter</span>
    快速下载图片
  </div>
</div>`;

/** 计算某种格式的下载扩展名 */
export function formatExt(format) {
  return format === "jpeg" ? "jpg" : format;
}
