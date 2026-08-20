/* ============================================================
   cdp.mjs — 极简 Chrome DevTools Protocol 客户端（无依赖，Node 22+）
   ------------------------------------------------------------
   用法：import { connect } from "./cdp.mjs";
   const ws = await connect(9223);
   const res = await ws.send("Runtime.evaluate", { expression: "1+1", returnByValue: true });
   ============================================================ */

export async function connect(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = list.find((t) => t.type === "page");
  if (!page) throw new Error(`CDP ${port} 上未找到 page target（先启动无头浏览器）`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("WebSocket 连接失败"));
  });
  let idc = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++idc;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return {
    ws,
    send,
    /** 优雅关闭（等待 close 事件），避免 Node/Windows 下进程退出时断言崩溃 */
    async close() {
      if (ws.readyState === WebSocket.OPEN) {
        await new Promise((resolve) => {
          const t = setTimeout(resolve, 500); // 兜底，防 close 事件不触发
          ws.onclose = () => {
            clearTimeout(t);
            resolve();
          };
          ws.close();
        });
      }
    },
    /** 连接 iframe target（沙箱 iframe 内部求值用） */
    async attachIframe() {
      const list2 = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const tgt = list2.find((t) => t.type === "iframe");
      if (!tgt) throw new Error("未找到 iframe target");
      const ws2 = new WebSocket(tgt.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => {
        ws2.onopen = resolve;
        ws2.onerror = () => reject(new Error("iframe WS 连接失败"));
      });
      let idc2 = 0;
      const pending2 = new Map();
      ws2.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && pending2.has(msg.id)) {
          const p = pending2.get(msg.id);
          pending2.delete(msg.id);
          msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
        }
      };
      const send2 = (method, params = {}) =>
        new Promise((resolve, reject) => {
          const id = ++idc2;
          pending2.set(id, { resolve, reject });
          ws2.send(JSON.stringify({ id, method, params }));
        });
      return {
        ws: ws2,
        send: send2,
        async close() {
          if (ws2.readyState === WebSocket.OPEN) {
            await new Promise((resolve) => {
              const t = setTimeout(resolve, 500);
              ws2.onclose = () => {
                clearTimeout(t);
                resolve();
              };
              ws2.close();
            });
          }
        },
      };
    },
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
