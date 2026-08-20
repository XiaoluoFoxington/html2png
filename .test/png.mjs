/* ============================================================
   png.mjs — 极简 PNG 解码器（无依赖，仅用于测试取色）
   ------------------------------------------------------------
   支持 8bit、非隔行、colorType 2（RGB）/ 6（RGBA）。
   ============================================================ */

import { inflateSync } from "node:zlib";

export function decodePng(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error("不是合法 PNG");
  }
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`仅支持 8bit PNG，实际 ${bitDepth}`);
  if (colorType !== 2 && colorType !== 6) {
    throw new Error(`仅支持 colorType 2/6，实际 ${colorType}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const row = Buffer.from(raw.subarray(p, p + stride));
    p += stride;
    for (let x = 0; x < stride; x++) {
      // a=左邻（必须取已解码的字节，因此边算边回写 row）
      const a = x >= channels ? row[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = row[x];
      switch (filter) {
        case 0:
          break;
        case 1:
          v = (v + a) & 0xff;
          break;
        case 2:
          v = (v + b) & 0xff;
          break;
        case 3:
          v = (v + ((a + b) >> 1)) & 0xff;
          break;
        case 4: {
          const pp = a + b - c;
          const pa = Math.abs(pp - a);
          const pb = Math.abs(pp - b);
          const pc = Math.abs(pp - c);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
        default:
          throw new Error(`未知 filter ${filter}`);
      }
      out[y * stride + x] = v;
      row[x] = v; // 回写，供后续字节的“左邻”取用
    }
    prev = out.subarray(y * stride, (y + 1) * stride);
  }
  return { width, height, channels, data: out };
}

export function pixel(img, x, y) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) {
    throw new Error(`采样点越界 (${x},${y}) 于 ${img.width}x${img.height}`);
  }
  const i = (y * img.width + x) * img.channels;
  return {
    r: img.data[i],
    g: img.data[i + 1],
    b: img.data[i + 2],
    a: img.channels === 4 ? img.data[i + 3] : 255,
  };
}
