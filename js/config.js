/* ============================================================
   config.js — 默认值、示例模板、常量
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

/** 示例模板 */
export const EXAMPLES = [
  {
    name: "状态卡片（默认）",
    html: DEFAULT_HTML,
  },
  {
    name: "数据面板",
    html: `<div style="font-family:'Segoe UI',system-ui,sans-serif;background:#0b100d;color:#dce9de;width:620px;padding:28px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
    <div style="font-size:17px;font-weight:700;">数据总览</div>
    <div style="font-size:12px;color:#82968a;">更新于 2026-08-20</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
    <div style="background:#0e1510;border:1px solid #1d2a20;padding:16px;">
      <div style="font-size:12px;color:#82968a;">访问量</div>
      <div style="font-size:24px;font-weight:700;color:#22c55e;margin-top:6px;">128.4k</div>
      <div style="font-size:12px;color:#34d399;margin-top:4px;">&#9650; 12.6%</div>
    </div>
    <div style="background:#0e1510;border:1px solid #1d2a20;padding:16px;">
      <div style="font-size:12px;color:#82968a;">转化率</div>
      <div style="font-size:24px;font-weight:700;color:#34d399;margin-top:6px;">3.82%</div>
      <div style="font-size:12px;color:#34d399;margin-top:4px;">&#9650; 0.4%</div>
    </div>
    <div style="background:#0e1510;border:1px solid #1d2a20;padding:16px;">
      <div style="font-size:12px;color:#82968a;">订单数</div>
      <div style="font-size:24px;font-weight:700;color:#34d399;margin-top:6px;">4,912</div>
      <div style="font-size:12px;color:#f87171;margin-top:4px;">&#9660; 2.1%</div>
    </div>
    <div style="background:#0e1510;border:1px solid #1d2a20;padding:16px;">
      <div style="font-size:12px;color:#82968a;">客单价</div>
      <div style="font-size:24px;font-weight:700;color:#34d399;margin-top:6px;">&#165; 268</div>
      <div style="font-size:12px;color:#82968a;margin-top:4px;">持平</div>
    </div>
  </div>
  <div style="display:flex;gap:12px;margin-top:12px;">
    <div style="flex:1;background:#0e1510;border:1px solid #1d2a20;padding:16px;">
      <div style="font-size:12px;color:#82968a;margin-bottom:12px;">目标完成度</div>
      <div style="height:8px;background:#1d2a20;">
        <div style="width:76%;height:100%;background:linear-gradient(90deg,#16a34a,#4ade80);"></div>
      </div>
      <div style="font-size:12px;color:#82968a;margin-top:8px;">76% / 100%</div>
    </div>
  </div>
</div>`,
  },
  {
    name: "价格卡片",
    html: `<div style="font-family:'Segoe UI',system-ui,sans-serif;background:#0e1510;color:#dce9de;width:360px;border:1px solid #22c55e;padding:28px;">
  <div style="font-size:12px;letter-spacing:.08em;color:#6ee7b7;">PRO 版</div>
  <div style="display:flex;align-items:baseline;gap:6px;margin-top:12px;">
    <span style="font-size:40px;font-weight:800;">&#165; 99</span>
    <span style="font-size:13px;color:#82968a;">/ 月</span>
  </div>
  <div style="margin-top:18px;font-size:13px;line-height:2.2;color:#a7c4b2;">
    <div>&#10003; 无限图片生成</div>
    <div>&#10003; 4K 高清输出</div>
    <div>&#10003; 团队协作空间</div>
    <div>&#10003; 优先技术支持</div>
  </div>
  <div style="margin-top:22px;background:#22c55e;color:#04150b;text-align:center;font-weight:700;padding:12px 0;">立即订阅</div>
</div>`,
  },
  {
    name: "表格",
    html: `<div style="font-family:'Segoe UI',system-ui,sans-serif;background:#0b100d;color:#dce9de;width:640px;padding:24px;">
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr style="background:#0e1510;">
        <th style="text-align:left;padding:10px 14px;border:1px solid #1d2a20;">项目</th>
        <th style="text-align:right;padding:10px 14px;border:1px solid #1d2a20;">数量</th>
        <th style="text-align:right;padding:10px 14px;border:1px solid #1d2a20;">金额</th>
        <th style="text-align:right;padding:10px 14px;border:1px solid #1d2a20;">状态</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:10px 14px;border:1px solid #1d2a20;">企业版套餐</td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;">2</td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;color:#34d399;">&#165; 1,980</td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;color:#22c55e;">已支付</td></tr>
      <tr style="background:#0c120e;"><td style="padding:10px 14px;border:1px solid #1d2a20;">增值服务</td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;">5</td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;color:#34d399;">&#165; 2,450</td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;color:#22c55e;">已支付</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #1d2a20;">发票补开</td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;">1</td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;color:#34d399;">&#165; 0</td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;color:#fbbf24;">处理中</td></tr>
    </tbody>
    <tfoot>
      <tr style="background:#0e1510;"><td style="padding:10px 14px;border:1px solid #1d2a20;font-weight:700;">合计</td><td style="padding:10px 14px;border:1px solid #1d2a20;"></td><td style="padding:10px 14px;border:1px solid #1d2a20;text-align:right;font-weight:700;color:#22c55e;">&#165; 4,430</td><td style="padding:10px 14px;border:1px solid #1d2a20;"></td></tr>
    </tfoot>
  </table>
</div>`,
  },
  {
    name: "按钮组",
    html: `<div style="font-family:'Segoe UI',system-ui,sans-serif;background:#0e1510;color:#dce9de;width:520px;padding:32px;">
  <div style="font-size:15px;font-weight:700;margin-bottom:20px;">按钮样式</div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;">
    <div style="background:#22c55e;color:#04150b;font-weight:600;padding:10px 22px;">主要按钮</div>
    <div style="border:1px solid #2b3d30;color:#dce9de;padding:10px 22px;">次要按钮</div>
    <div style="border:1px solid #2b3d30;color:#82968a;padding:10px 22px;">禁用按钮</div>
    <div style="background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.4);color:#f87171;padding:10px 22px;">危险操作</div>
  </div>
  <div style="margin-top:22px;font-size:13px;color:#82968a;">直角风格 · 绿色主题 · 深色底</div>
</div>`,
  },
];

/** 计算某种格式的下载扩展名 */
export function formatExt(format) {
  return format === "jpeg" ? "jpg" : format;
}
