/* ==========================================================================
   Vivu Travel — trích chuỗi ảnh cho cú máy mở đầu
   Đọc video/hero 3.mp4 → xuất frames/hero/frame-00001.webp… + manifest.json

   Chạy:  npm run frames
   Tuỳ biến qua biến môi trường:
       FRAME_FPS      số khung mỗi giây   (mặc định 24)
       FRAME_WIDTH    bề ngang ảnh, px    (mặc định 1440)
       FRAME_QUALITY  chất lượng WebP     (mặc định 82)

   Đây là script build, chỉ chạy khi cần sinh lại ảnh. Trang chạy thật vẫn
   thuần HTML/CSS/JS, không cần Node.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ffmpeg  = require('@ffmpeg-installer/ffmpeg').path;
const ffprobe = require('@ffprobe-installer/ffprobe').path;

const ROOT      = path.resolve(__dirname, '..');
const MOBILE    = process.argv.includes('--mobile');
const SOURCE_NAME = process.env.FRAME_SOURCE || 'hero 3.mp4';
const SOURCE    = path.join(ROOT, 'video', SOURCE_NAME);
const OUT_NAME  = MOBILE ? 'hero-mobile' : 'hero';
const OUT_DIR   = path.join(ROOT, 'frames', OUT_NAME);
const MANIFEST  = path.join(OUT_DIR, 'manifest.json');

const FPS     = Number(process.env.FRAME_FPS)     || (MOBILE ? 8 : 12);
const WIDTH   = Number(process.env.FRAME_WIDTH)   || (MOBILE ? 960 : 1600);
const QUALITY = Number(process.env.FRAME_QUALITY) || (MOBILE ? 72 : 78);

/** Hỏi ffprobe vài thông số của video nguồn */
function probe(file) {
  const raw = execFileSync(ffprobe, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,duration,r_frame_rate,nb_frames',
    '-show_entries', 'format=duration,size',
    '-of', 'json', file
  ], { encoding: 'utf8' });

  const json   = JSON.parse(raw);
  const stream = (json.streams && json.streams[0]) || {};
  const dur    = Number(stream.duration) || Number(json.format && json.format.duration) || 0;

  return {
    width:    Number(stream.width)  || 0,
    height:   Number(stream.height) || 0,
    duration: dur,
    sizeMB:   Number(json.format && json.format.size) / 1024 / 1024
  };
}

/** Xoá ảnh của lần chạy trước, giữ nguyên thư mục để khỏi vướng file watcher */
function clean(dir) {
  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return 0; }
  const old = fs.readdirSync(dir).filter(f => /^frame-\d+\.webp$/.test(f));
  for (const f of old) fs.unlinkSync(path.join(dir, f));
  return old.length;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Không thấy video nguồn: ' + SOURCE);
    process.exit(1);
  }

  const info = probe(SOURCE);
  console.log('Nguồn   : video/' + SOURCE_NAME);
  console.log('         ' + info.width + '×' + info.height +
              ' · ' + info.duration.toFixed(2) + 's · ' + info.sizeMB.toFixed(1) + ' MB');
  console.log('Xuất    : ' + FPS + 'fps · rộng ' + WIDTH + 'px · WebP q' + QUALITY);

  const removed = clean(OUT_DIR);
  if (removed) console.log('Đã xoá  : ' + removed + ' ảnh cũ');

  // scale=W:-2 giữ đúng tỉ lệ và ép chiều cao về số chẵn (yêu cầu của bộ mã hoá)
  execFileSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'warning', '-y',
    '-i', SOURCE,
    '-vf', 'fps=' + FPS + ',scale=' + WIDTH + ':-2:flags=lanczos',
    '-c:v', 'libwebp',
    '-lossless', '0',
    '-quality', String(QUALITY),
    '-compression_level', '6',
    '-preset', 'photo',
    '-an',
    path.join(OUT_DIR, 'frame-%05d.webp')
  ], { stdio: 'inherit' });

  const files = fs.readdirSync(OUT_DIR).filter(f => /^frame-\d+\.webp$/.test(f)).sort();
  if (!files.length) {
    console.error('ffmpeg chạy xong nhưng không sinh được ảnh nào.');
    process.exit(1);
  }

  const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(OUT_DIR, f)).size, 0);

  const manifest = {
    basePath:   'frames/' + OUT_NAME,
    extension:  'webp',
    pattern:    'frame-00001.webp',
    frameCount: files.length,
    // Content-sized cache key. Regenerating the same filenames must not make
    // browsers reuse frames left over from the previous sequence.
    version:    files.length + '-' + bytes,
    fps:        FPS,
    width:      WIDTH,
    quality:    QUALITY,
    source:     'video/' + SOURCE_NAME,
    duration:   Number(info.duration.toFixed(3))
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log('Xong    : ' + files.length + ' ảnh · ' + (bytes / 1024 / 1024).toFixed(1) + ' MB · ' +
              (bytes / files.length / 1024).toFixed(0) + ' KB/ảnh');
  console.log('Manifest: frames/hero/manifest.json');
}

main();
