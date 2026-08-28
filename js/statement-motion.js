/* ==========================================================================
   Vivu Travel — phần chữ của cảnh hành trình (GSAP + ScrollTrigger)

   Khối "Nguyên tắc dựng chuyến" nằm TRONG cảnh bản đồ bay (#flightMap), nổi
   trên canvas Three.js. Vì cả cảnh bị ghim (`position: sticky`), khối chữ
   không còn tự trôi qua tầm nhìn nữa — mốc kiểu `start: 'top 80%'` trên chính
   nó sẽ đứng im suốt cảnh và chẳng bao giờ chạy hết.

   Nên ở đây đổi cách neo: một ScrollTrigger duy nhất trải trên cả cú máy
   (`top top` → `bottom bottom`), rồi mọi thứ xếp vào một timeline dài đúng 100
   đơn vị — mỗi đơn vị là 1% quãng cuộn của cảnh. Nhờ vậy các mốc ở đây đọc
   thẳng ra phần trăm và khớp được với mốc trong js/travel-map.js, dù hai module
   chạy độc lập:

       0 ────────── 20 ─── 26 ────── 34 ─────────────────────── 100
       chữ hiện dần   số liệu   chữ tan       (canvas cầm nhịp tiếp)

   Chuyển động vẫn chỉ chạy opacity trên từng từ, KHÔNG đụng tới màu: chữ
   thường xám (--ink-3), cụm <b> đậm (--ink) — giữ nguyên tương phản thiết kế.
   Chữ đứng trên nền TRẮNG suốt pha đọc (màn --fm-veil trong style.css), nên
   thang màu mặc định của trang dùng thẳng được, không cần bôi thêm gì.

   GSAP tải từ CDN. Không tải được (offline, bị chặn) thì module tự thoát và
   khối giữ nguyên trạng thái tĩnh, đọc bình thường.
   ========================================================================== */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;      // CDN hỏng -> để yên

  const scene = document.getElementById('flightMap');
  const root  = document.querySelector('.jr-copy');
  const text  = root && root.querySelector('.statement-text');
  if (!scene || !root || !text) return;

  gsap.registerPlugin(ScrollTrigger);

  const FAINT = 0.15;   // độ mờ lúc chưa "đọc" tới

  /* --------------------------- Mốc trên timeline ---------------------------
     Tính bằng % quãng cuộn của cảnh. Ba mốc cuối phải nằm trong khoảng mà
     travel-map.js dành cho pha đọc (nền trắng và bản đồ đều bắt đầu đổi ở
     24–26%): chữ tan ở 26→34% nên hai bên gối lên nhau vừa đủ để thành một
     nhịp liền, không phải "chữ tắt xong rồi bản đồ mới bật".                */
  const READ_IN   = 2;     // từ đầu tiên bắt đầu sáng
  const READ_OUT  = 20;    // từ cuối cùng sáng hẳn
  const STATS_AT  = 17;    // dãy số liệu trồi lên (chồng lên đuôi câu văn)
  const FADE_AT   = 26;    // khối chữ bắt đầu trôi lên và tan
  const FADE_LEN  = 8;
  const SPAN      = 100;   // tổng chiều dài timeline

  /* ----------------------- Cắt câu thành từng từ -----------------------
     Đi theo node văn bản chứ không đụng vào innerHTML: giữ nguyên các thẻ
     <b> bọc ngoài, nên cụm in đậm vẫn là in đậm sau khi cắt.              */
  function splitWords(host) {
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);

    const words = [];
    for (const node of nodes) {
      if (!node.nodeValue.trim()) continue;
      const frag = document.createDocumentFragment();
      // giữ lại khoảng trắng gốc để chữ vẫn xuống dòng đúng chỗ
      for (const piece of node.nodeValue.split(/(\s+)/)) {
        if (!piece) continue;
        if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(piece)); continue; }
        const span = document.createElement('span');
        span.className = 'w';
        span.textContent = piece;
        frag.appendChild(span);
        words.push(span);
      }
      node.parentNode.replaceChild(frag, node);
    }
    return words;
  }

  const words = splitWords(text);
  if (!words.length) return;

  gsap.set(words, { opacity: FAINT });

  /* ------------------------------ Timeline ------------------------------
     Tween rỗng dài đúng SPAN đặt ở đầu: nó là thứ ấn định "1 đơn vị = 1%",
     nếu không tổng chiều dài timeline sẽ co lại đúng bằng tween cuối cùng và
     mọi vị trí tính theo % ở dưới sẽ lệch hết.                             */
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: 'bottom bottom',
      // Cùng độ trễ với ScrollTrigger của travel-map.js. Hai module chạy riêng
      // nhưng chữ và canvas phải trôi cùng một nhịp, lệch scrub là lúc giao ca
      // thấy rõ hai lớp bò theo hai tốc độ.
      scrub: 0.8
    }
  });
  tl.to({}, { duration: SPAN }, 0);

  /* Không còn dòng nhãn `.kicker` ở đầu khối — đã bỏ khỏi index.html. Muốn
     đặt lại thì thêm thẻ vào .jr-copy rồi trả lại một tween ở vị trí 0.6:
       tl.from(kicker, { opacity: 0, y: 18, duration: 3, ease: 'power2.out' }, 0.6)  */

  /* Quét chữ: vị trí cuộn quyết định đã "đọc" tới từ nào. ease none để tốc độ
     sáng lên bám đúng tốc độ cuộn, không tự ý nhanh chậm. Bước stagger tính
     ngược từ hai mốc chứ không đặt cứng — sửa câu văn dài ngắn thế nào thì từ
     cuối vẫn sáng hẳn đúng ở READ_OUT.                                      */
  const HOLD = 3;                                          // mỗi từ sáng trong bao lâu
  const step = words.length > 1 ? (READ_OUT - READ_IN - HOLD) / (words.length - 1) : 0;
  tl.to(words, {
    opacity: 1, ease: 'none', duration: HOLD,
    stagger: { each: Math.max(step, 0), from: 'start' }
  }, READ_IN);

  /* ---------------------- Dãy số liệu: đếm tăng dần ---------------------
     '48.000' là 48000 kiểu Việt (dấu chấm ngăn nghìn), còn '4.8/5' là số
     thập phân — hai dạng nhìn giống nhau nên phải tách bằng chính hình dạng
     chuỗi. Riêng '24/7' là một cụm từ chứ không phải lượng, đếm lên thành
     '0/7 → 24/7' rất vô nghĩa nên bỏ qua, chỉ cho hiện lên.                */
  function parseStat(txt) {
    if (/^\d+\/\d+$/.test(txt)) return null;              // 24/7 -> không đếm
    const m = txt.match(/^([\d.]+)(.*)$/);
    if (!m) return null;
    const raw = m[1], suffix = m[2];

    if (/^\d{1,3}(\.\d{3})+$/.test(raw))                  // 48.000
      return { value: +raw.replace(/\./g, ''), decimals: 0, grouped: true, suffix };
    if (/^\d+\.\d+$/.test(raw))                           // 4.8
      return { value: parseFloat(raw), decimals: raw.split('.')[1].length, grouped: false, suffix };
    if (/^\d+$/.test(raw))                                // 320
      return { value: +raw, decimals: 0, grouped: false, suffix };
    return null;
  }

  root.querySelectorAll('.stat-row li').forEach((li, i) => {
    const at = STATS_AT + i * 0.7;
    tl.from(li, { opacity: 0, y: 22, duration: 2.4, ease: 'power2.out' }, at);

    const b = li.querySelector('b');
    const spec = b && parseStat(b.textContent.trim());
    if (!spec) return;

    const counter = { n: 0 };
    tl.to(counter, {
      n: spec.value, duration: 4, ease: 'power2.out',
      onUpdate() {
        b.textContent = (spec.grouped
          ? Math.round(counter.n).toLocaleString('vi-VN')
          : counter.n.toFixed(spec.decimals)) + spec.suffix;
      }
    }, at);
  });

  /* ------------------------- Giao ca sang bản đồ -------------------------
     autoAlpha chứ không phải opacity: mờ hẳn thì GSAP đặt luôn
     visibility: hidden, khối chữ thôi nằm cản phía trên canvas. Đây là điều
     kiện để hiệu ứng rê chuột vào máy bay còn hoạt động ở nửa sau của cảnh.

     Chỉ y + autoAlpha, không blur: khối chữ này cao gần bằng khung hình, cho
     filter chạy trên nó là mỗi khung phải vẽ lại cả mảng lớn.               */
  tl.to(root, { autoAlpha: 0, y: -70, ease: 'power2.in', duration: FADE_LEN }, FADE_AT);

  /* ---------------------------- Đo lại mốc cuộn -------------------------
     ScrollTrigger chốt mốc ngay lúc khởi tạo. Trang này lại có hai thứ làm
     layout xê dịch sau đó, và cả hai đều nguy hiểm với `tl.from` ở trên:
     tween .from() đặt phần tử về opacity 0 ngay lập tức, nên mốc lệch đồng
     nghĩa dãy số liệu có thể kẹt vô hình.

       · cú máy mở đầu cao 500vh, ảnh và font về sau mới đẩy đúng chiều cao;
       · trang chủ đề ẩn hẳn landing (display:none) -> mọi mốc thành vô nghĩa.  */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  window.addEventListener('hashchange', () => setTimeout(() => ScrollTrigger.refresh(), 60));
})();
