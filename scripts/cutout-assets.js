/* ==========================================================================
   Vivu Travel — tách nền bộ ảnh bản đồ 3D

   Bộ gốc images/travel-map/*.png được xuất ở rgb24: KHÔNG có kênh alpha, và
   nền "trong suốt" thực chất là ô caro đã bẹp thành pixel thật (khối ~27px,
   xám 245/254). Đắp thẳng lên WebGL sẽ ra khối trắng kẻ caro.

   Script này dựng lại kênh alpha rồi ghi sang images/travel-map/cutout/.

   Vì sao loang từ viền chứ không lọc màu toàn ảnh: thân máy bay và mái chùa
   cũng trắng. Lọc theo màu sẽ thủng ngay giữa vật thể. Loang từ mép ảnh chỉ
   ăn đúng vùng nền nối liền với viền, ruột vật thể còn nguyên.

   Chạy:  npm run cutout
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const DIR    = path.resolve(__dirname, '..', 'images', 'travel-map');
const OUT    = path.join(DIR, 'cutout');
const MAX_SPRITE = Number(process.env.MAP_SPRITE_MAX) || 1024;  // cạnh dài tối đa của địa danh
const MAX_MAP    = Number(process.env.MAP_BASE_MAX)   || 3072;  // cạnh dài tối đa của bản đồ nền

// Ảnh 01 là bản đồ nền phủ kín khung, không có nền để tách — chỉ thu nhỏ.
const BASE = '01-ban-do-chau-a-4k.png';

/* --------------------- Nhận nền bằng CẤU TRÚC, không bằng màu ------------
   Nền là ô caro: khối 27px, hai mức xám 245 và 254 (đo trực tiếp từ file).
   Lọc theo màu không dùng được — quầng sáng quanh máy bay là pastel xanh
   (180,218,252) nên trượt khỏi mọi ngưỡng "xám", mà thân máy bay lại trắng
   nên ngưỡng nào đủ rộng để ăn quầng sáng cũng ăn luôn thân máy bay.

   Nhưng ô caro vẫn lộ ra *dưới* lớp phủ bán trong suốt: nếu phủ có độ đục α
   thì  C = αF + (1-α)B, nên biên độ dao động quan sát được là (1-α)·ΔB.
   Đo biên độ đó là suy ngược ra α — vừa xoá sạch caro, vừa GIỮ được quầng
   sáng đúng độ mờ vốn có của nó.                                          */
/* Khối caro không phải số nguyên: đo được xen kẽ 26/27 px, chu kỳ ~26,8.
   Vì thế KHÔNG dò lệch đúng một khối — sai pha tích luỹ, có điểm rơi trúng
   cùng pha và biên độ đo ra 0. Dò lệch NỬA khối thì luôn sang ô bên cạnh. */
const HALF = [13, 14];
const lum = (d, p) => (d[p] * 299 + d[p + 1] * 587 + d[p + 2] * 114) / 1000;

/** Biên độ dao động caro tại một điểm: lệch LỚN NHẤT so với các điểm lệch pha */
function checkerAmp(d, w, h, x, y) {
  const L = lum(d, (y * w + x) * 4);
  let amp = 0;
  const probe = (nx, ny) => {
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
    const diff = Math.abs(L - lum(d, (ny * w + nx) * 4));
    if (diff > amp) amp = diff;
  };
  for (const o of HALF) { probe(x - o, y); probe(x + o, y); probe(x, y - o); probe(x, y + o); }
  return amp;
}

/** ΔB thật của từng ảnh: lấy trung vị biên độ ở khung viền 16px (chắc chắn là nền) */
function measureDelta(png) {
  const { width: w, height: h, data } = png;
  const s = [];
  for (let y = 2; y < h - 2; y += 7)
    for (let x = 2; x < w - 2; x += 7)
      if (x < 16 || y < 16 || x > w - 17 || y > h - 17) s.push(checkerAmp(data, w, h, x, y));
  s.sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] || 0;
}

/** Loang 4 hướng từ toàn bộ pixel viền, đánh dấu vùng nền nối ra ngoài.
    Chỉ đi qua pixel SÁNG và còn thấy rõ vân caro — chi tiết tối (cửa sổ,
    động cơ) chặn đường loang nên ruột vật thể không bao giờ bị ăn.        */
function floodOutside(png, cover) {
  const { width: w, height: h, data } = png;
  const outside = new Uint8Array(w * h);
  const stack = [];

  /* Điều kiện đi tiếp: SÁNG và GẦN NHƯ KHÔNG MÀU — đúng đặc tính ô caro.
     Quầng sáng quanh máy bay là pastel xanh (sat ~55–76) nên chặn đường loang
     và được giữ lại nguyên vẹn; nền thật của cảnh là bản đồ trắng-xanh nhạt
     nên quầng trắng đó gần như không lộ. Đổi lại, thân máy bay trắng phẳng
     nằm sâu bên trong, loang không bao giờ với tới.                         */
  const push = (x, y) => {
    const i = y * w + x;
    if (outside[i]) return;
    const p = i * 4;
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mn < 232 || mx - mn > 14) return;
    outside[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i - x) / w;
    if (x > 0)     push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0)     push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  return outside;
}

/* Quầng sáng quanh vật thể chặn đường loang, nên các ô caro nằm LỌT trong
   quầng vẫn còn đục. Chúng là những mảng xám nhỏ (ô 27px, có dính nhau cũng
   chỉ vài nghìn pixel), trong khi thân máy bay / mái chùa cũng xám nhưng là
   một mảng liền rất lớn. Lọc theo diện tích là tách được hai thứ đó.        */
const CHECKER_MAX_AREA = 6000;

function dropTrappedChecker(png, alpha, w, h) {
  const { data } = png;
  const grey = i => {
    if (alpha[i] < 128) return false;
    const p = i * 4, r = data[p], g = data[p + 1], b = data[p + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn >= 232 && mx - mn <= 14;
  };

  const seen = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || !grey(s)) continue;
    const comp = [], stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      const x = i % w, y = (i - x) / w;
      const step = j => { if (!seen[j] && grey(j)) { seen[j] = 1; stack.push(j); } };
      if (x > 0)     step(i - 1);
      if (x < w - 1) step(i + 1);
      if (y > 0)     step(i - w);
      if (y < h - 1) step(i + w);
    }
    if (comp.length < CHECKER_MAX_AREA) for (const i of comp) alpha[i] = 0;
  }
}

/** Làm mềm mép alpha bằng box blur 3×3, chỉ chạm vào pixel sát biên */
function feather(alpha, w, h) {
  const out = Uint8Array.from(alpha);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      let mn = 255, mx = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const v = alpha[i + dy * w + dx];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      if (mx - mn < 8) continue;                     // không phải mép -> bỏ qua
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) sum += alpha[i + dy * w + dx];
      out[i] = Math.round(sum / 9);
    }
  }
  return out;
}

/** Khung chữ nhật ôm sát phần còn đục — cắt bỏ khoảng trống thừa */
function bbox(alpha, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (alpha[y * w + x] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Thu nhỏ bằng lấy mẫu hộp, có nhân alpha để mép không bị viền trắng */
function resize(src, sw, sh, dw, dh) {
  const dst = new PNG({ width: dw, height: dh });
  const sx = sw / dw, sy = sh / dh;
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const gx0 = Math.floor(x * sx), gx1 = Math.min(sw, Math.ceil((x + 1) * sx));
      const gy0 = Math.floor(y * sy), gy1 = Math.min(sh, Math.ceil((y + 1) * sy));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = gy0; yy < gy1; yy++)
        for (let xx = gx0; xx < gx1; xx++) {
          const p = (yy * sw + xx) * 4, al = src[p + 3] / 255;
          r += src[p] * al; g += src[p + 1] * al; b += src[p + 2] * al;
          a += src[p + 3]; n++;
        }
      if (!n) continue;
      const aAvg = a / n, wSum = (aAvg / 255) * n || 1;
      const q = (y * dw + x) * 4;
      dst.data[q]     = Math.min(255, Math.round(r / wSum));
      dst.data[q + 1] = Math.min(255, Math.round(g / wSum));
      dst.data[q + 2] = Math.min(255, Math.round(b / wSum));
      dst.data[q + 3] = Math.round(aAvg);
    }
  }
  return dst;
}

function processSprite(file) {
  const png = PNG.sync.read(fs.readFileSync(path.join(DIR, file)));
  const { width: w, height: h } = png;

  // Độ che phủ suy từ biên độ vân caro. CHỈ dùng để làm mềm rìa vùng đã bị
  // loang tới — không dùng để dẫn đường loang. Thử cho nó dẫn đường thì thân
  // máy bay (trắng phẳng, biên độ đo ra lớn vì có chuyển sáng tối) bị hiểu
  // nhầm là nền và ăn thủng.
  const delta = measureDelta(png);

  /* Không phải ảnh nào cũng có ô caro: 06-nhat-ban nền phẳng trắng, biên độ
     đo ra chỉ 1–2 mức nhiễu. Đem chia cho một `delta` nhỏ như thế thì cover
     ra loạn 0..1 và nền biến thành khung mờ đục. Nền phẳng thì cắt nhị phân. */
  const hasChecker = delta >= 5;
  const cover = new Float32Array(w * h);
  if (hasChecker) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        cover[y * w + x] = Math.min(1, Math.max(0, 1 - checkerAmp(png.data, w, h, x, y) / delta));
  }

  const outside = floodOutside(png, cover);

  let alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++)
    alpha[i] = outside[i] ? (hasChecker ? Math.round(255 * cover[i]) : 0) : 255;
  for (let i = 0; i < w * h; i++) if (alpha[i] < 20) alpha[i] = 0;   // dập nhiễu nền còn sót
  dropTrappedChecker(png, alpha, w, h);
  alpha = feather(alpha, w, h);

  const box = bbox(alpha, w, h);
  if (!box) throw new Error(file + ': tách xong không còn pixel nào');

  // ghép RGBA đã cắt khung
  const cut = new PNG({ width: box.w, height: box.h });
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const s = ((y + box.y0) * w + (x + box.x0));
      const p = s * 4, q = (y * box.w + x) * 4;
      cut.data[q] = png.data[p]; cut.data[q + 1] = png.data[p + 1];
      cut.data[q + 2] = png.data[p + 2]; cut.data[q + 3] = alpha[s];
    }
  }

  const scale = Math.min(1, MAX_SPRITE / Math.max(box.w, box.h));
  const dw = Math.max(1, Math.round(box.w * scale)), dh = Math.max(1, Math.round(box.h * scale));
  const final = scale < 1 ? resize(cut.data, box.w, box.h, dw, dh) : cut;

  const name = file.replace(/-4k\.png$/, '.png');
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(final));

  const opaque = (() => { let n = 0; for (let i = 0; i < w * h; i++) if (alpha[i] > 8) n++; return n; })();
  return {
    file: name, width: final.width, height: final.height,
    aspect: +(final.width / final.height).toFixed(5),
    keptPct: +(100 * opaque / (w * h)).toFixed(1),
    flat: !hasChecker
  };
}

function processBase(file) {
  const png = PNG.sync.read(fs.readFileSync(path.join(DIR, file)));
  const scale = Math.min(1, MAX_MAP / Math.max(png.width, png.height));
  const dw = Math.round(png.width * scale), dh = Math.round(png.height * scale);
  // bản đồ nền không có alpha -> ép đục hết rồi mới thu nhỏ
  for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
  const final = scale < 1 ? resize(png.data, png.width, png.height, dw, dh) : png;
  const name = file.replace(/-4k\.png$/, '.png');
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(final));
  return { file: name, width: final.width, height: final.height,
           aspect: +(final.width / final.height).toFixed(5), keptPct: 100 };
}

function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const files = fs.readdirSync(DIR).filter(f => /^\d\d-.*-4k\.png$/.test(f)).sort();
  if (!files.length) { console.error('Không thấy ảnh nguồn trong ' + DIR); process.exit(1); }

  const out = [];
  for (const f of files) {
    const info = f === BASE ? processBase(f) : processSprite(f);
    out.push(info);
      console.log('  %s -> %dx%d  (tỉ lệ %s, giữ %s%% khung%s)',
      f.padEnd(26), info.width, info.height, info.aspect, info.keptPct,
      info.flat ? ', nền phẳng' : '');
  }

  // Three.js đọc tỉ lệ ở đây để dựng mặt phẳng đúng khổ, không kéo méo asset.
  fs.writeFileSync(path.join(OUT, 'manifest.json'),
    JSON.stringify({ basePath: 'images/travel-map/cutout', assets: out }, null, 2) + '\n');
  console.log('Manifest: images/travel-map/cutout/manifest.json');
}

main();
