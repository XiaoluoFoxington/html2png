/* ============================================================
   tools/serve.mjs — 零依赖本地静态服务器（带 CORS 头）
   ------------------------------------------------------------
   用法：node tools/serve.mjs [端口]    默认 8765
   说明：
   - 默认监听 0.0.0.0，局域网内其他设备可通过本机 IP 访问；
     如需仅本机访问：node tools/serve.mjs 8765 127.0.0.1
   - 为所有响应附加 Access-Control-Allow-Origin: * ，
     让沙箱 iframe（不透明源）能通过 fetch 读取本机图片 / 字体，
     从而正确嵌入生成的图片。
   - 仅服务项目目录内的文件，拒绝目录穿越。
   ============================================================ */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = normalize(fileURLToPath(new URL("..", import.meta.url))).replace(
  /[\\/]+$/,
  ""
);
const PORT = Number(process.argv[2] || process.env.PORT || 8765);
const HOST = process.argv[3] || process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

function safeResolve(pathname) {
  // 去掉查询串，解码并规范路径
  const raw = decodeURIComponent(pathname.split("?")[0]);
  let rel = normalize(raw).replace(/^([/\\])+/, "");
  if (rel === "." || rel === "") rel = "index.html";
  if (rel.endsWith("/")) rel += "index.html";
  const file = normalize(join(ROOT, rel));
  return file.startsWith(ROOT + sep) ? file : null;
}

createServer(async (req, res) => {
  // CORS：沙箱 iframe 需要
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD, OPTIONS" });
    res.end();
    return;
  }

  const file = safeResolve(new URL(req.url, "http://localhost").pathname);
  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    const data = await readFile(file);
    const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": data.length,
      "Cache-Control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
}).listen(PORT, HOST, () => {
  console.log(`HTML → PNG 本地服务器已启动（监听 ${HOST}:${PORT}）:`);
  console.log(`   本机访问   http://127.0.0.1:${PORT}`);
  if (HOST === "0.0.0.0" || HOST === "::") {
    const seen = new Set();
    for (const iface of Object.values(networkInterfaces())) {
      for (const net of iface || []) {
        if (net.family === "IPv4" && !net.internal && !seen.has(net.address)) {
          seen.add(net.address);
          console.log(`   局域网访问 http://${net.address}:${PORT}`);
        }
      }
    }
  }
  console.log(`   （Ctrl+C 停止）`);
});
