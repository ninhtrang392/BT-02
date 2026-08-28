/* ==========================================================================
   Vivu Travel — logic trang
   Không dùng thư viện ngoài. Dữ liệu lấy từ js/data.js
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------- Tiện ích ---------------------------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const vnd = n => Math.round(n).toLocaleString('vi-VN') + 'đ';

  /** 'YYYY-MM-DD' -> Date theo giờ địa phương (tránh lệch múi giờ) */
  function parseDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const dateVN = iso => parseDate(iso).toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const todayISO = () => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /** PRNG đơn giản, cùng seed cho ra cùng kết quả -> ảnh minh hoạ ổn định */
  function seeded(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------------------- Cẩm nang (FAQ) ---------------------------- */
  /* Hình cho khung trả lời, khoá trùng với trường `ic` trong FAQS. Cùng một
     khổ 24×24, cùng nét 1.6, cùng fill:none — sáu hình đứng cạnh nhau trong
     một danh sách, lệch một thông số là thấy ngay cái nào "nặng" hơn cái nào.
     currentColor để màu do CSS quyết định, kể cả lúc rê chuột.              */
  const FAQ_ICONS = (() => {
    const wrap = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
      stroke-linecap="round" stroke-linejoin="round" focusable="false">${d}</svg>`;
    return {
      date:   wrap('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M15.4 15.6a3 3 0 1 1-.9-2.2"/><path d="M15.4 12.6v3h-3"/>'),
      refund: wrap('<path d="M6 2.5h12v19l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9.5 8.5h5M9.5 12.5h5"/>'),
      kids:   wrap('<circle cx="9.2" cy="7.4" r="3.4"/><path d="M2.8 20.4a6.4 6.4 0 0 1 12.8 0"/><circle cx="17.6" cy="9.6" r="2.4"/><path d="M15 20.4a5 5 0 0 1 6.2-4.4"/>'),
      pay:    wrap('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 14.5h3"/>'),
      visa:   wrap('<rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><circle cx="12" cy="9.8" r="3.2"/><path d="M9 17.5h6"/>'),
      solo:   wrap('<circle cx="12" cy="7.6" r="3.8"/><path d="M4.8 20.6a7.2 7.2 0 0 1 14.4 0"/>')
    };
  })();

  /* Đóng/mở một câu. max-height phải là một con số cụ thể thì mới có gì để
     chuyển động — `height:auto` không chuyển động được.

     Con số ấy đo ở lớp TRONG (.faq-a-in) chứ không phải scrollHeight của lớp
     ngoài: lớp trong không bị kẹp trần nên offsetHeight của nó luôn là chiều
     cao thật. Đo lớp ngoài thì phải gỡ trần ra rồi lắp lại, mà đọc kích thước
     ở giữa hai lần đặt style là ép trình duyệt tính lại bố cục — đủ để nó bắt
     đầu một lượt chuyển động thừa, nhìn thành cái giật. */
  function faqBodyHeight(item) {
    const inner = $('.faq-a-in', item);
    return inner ? inner.offsetHeight : 0;
  }

  function openFaq(item, open) {
    if (!item) return;
    item.classList.toggle('is-open', open);
    $('.faq-q', item).setAttribute('aria-expanded', String(open));
    $('.faq-a', item).style.maxHeight = open ? faqBodyHeight(item) + 'px' : '';
  }

  /* Đo lại câu đang mở. Cần vì con số max-height chốt tại thời điểm bấm: đổi
     khổ màn hay font vừa tải xong là câu trả lời cao lên mà cái trần vẫn cũ —
     mấy dòng cuối bị cắt cụt, mà cắt trong im lặng nên không ai biết. */
  function syncFaq() {
    $$('.faq-item.is-open').forEach(item => {
      $('.faq-a', item).style.maxHeight = faqBodyHeight(item) + 'px';
    });
  }

  /* ------------------- Ảnh minh hoạ dựng bằng SVG -------------------- */
  /* Bảng màu điện ảnh: nền navy, biển xanh, chân trời hoàng hôn */
  const PALETTES = {
    highland: { sky: ['#0b2038', '#e8763c'], sun: '#ffc48d', far: '#1b3a55', mid: '#12293e', near: '#0b1c2c', ground: '#061420' },
    misty:    { sky: ['#0a1e33', '#6fa6c4'], sun: '#dff0fa', far: '#22415c', mid: '#182f45', near: '#101f30', ground: '#081521' },
    jade:     { sky: ['#07202e', '#3fa9a0'], sun: '#cdf5ee', far: '#14544f', mid: '#0e3c3c', near: '#0a2a2c', ground: '#061c1f' },
    sunset:   { sky: ['#0d1e3c', '#ff8a4c'], sun: '#ffd7a8', far: '#3a3560', mid: '#241f42', near: '#14122c', ground: '#0a0a1c' },
    royal:    { sky: ['#12142c', '#d99a4a'], sun: '#ffe2b0', far: '#3f3352', mid: '#2a2138', near: '#1a1526', ground: '#100c18' },
    ocean:    { sky: ['#041a2e', '#2ea6dc'], sun: '#bfeaff', far: '#0d4f7d', mid: '#083c60', near: '#052a45', ground: '#031c30' },
    tropic:   { sky: ['#04202f', '#43c6c0'], sun: '#d8fbf6', far: '#0e5f63', mid: '#0a4749', near: '#063234', ground: '#032326' },
    delta:    { sky: ['#0b1c26', '#c9b366'], sun: '#f4e9c0', far: '#3c4a34', mid: '#2b3728', near: '#1c261c', ground: '#111a13' },
    deep:     { sky: ['#03101f', '#2a5f8a'], sun: '#a8cfe8', far: '#0c2c46', mid: '#082036', near: '#051624', ground: '#030e18' },
    maple:    { sky: ['#160f1e', '#e0663a'], sun: '#ffc9a0', far: '#5a2a2c', mid: '#3e1e22', near: '#281418', ground: '#160c0f' },
    frost:    { sky: ['#0a1826', '#9fc4e0'], sun: '#ffffff', far: '#2b4762', mid: '#1f3449', near: '#152434', ground: '#0c1723' },
    gold:     { sky: ['#12172c', '#ffb05c'], sun: '#ffe6b8', far: '#5c4326', mid: '#42301c', near: '#2b2013', ground: '#19130b' }
  };

  let sceneId = 0;

  function scene(cfg, seed) {
    const p = PALETTES[cfg.theme] || PALETTES.ocean;
    const rnd = seeded(seed + cfg.shape);
    const id = 'sc' + (++sceneId);
    const j = amt => (rnd() - .5) * amt;               // nhiễu nhỏ cho mỗi tour
    let body = '';

    if (cfg.shape === 'peaks') {
      const line = (base, amp, fill) => {
        let d = `M0,${base + j(8)}`;
        for (let x = 60; x <= 400; x += 68) {
          d += ` L${x - 34},${base - amp + j(18)} L${x},${base + j(12)}`;
        }
        return `<path d="${d} L400,250 L0,250 Z" fill="${fill}"/>`;
      };
      body =
        `<circle cx="${300 + j(40)}" cy="${58 + j(14)}" r="24" fill="${p.sun}" opacity=".92"/>` +
        line(150, 62, p.far) + line(182, 48, p.mid) + line(214, 36, p.near) +
        `<rect y="238" width="400" height="12" fill="${p.ground}"/>` +
        `<path d="M60 52 q6-6 12 0 q6-6 12 0" fill="none" stroke="${p.ground}" stroke-width="1.6" opacity=".5"/>` +
        `<path d="M96 38 q5-5 10 0 q5-5 10 0" fill="none" stroke="${p.ground}" stroke-width="1.4" opacity=".35"/>`;
    } else if (cfg.shape === 'waves') {
      body =
        `<circle cx="${86 + j(30)}" cy="${54 + j(10)}" r="22" fill="${p.sun}" opacity=".9"/>` +
        `<path d="M0,165 Q70,${118 + j(16)} 140,164 T280,162 Q345,${132 + j(14)} 400,168 L400,250 L0,250 Z" fill="${p.far}"/>` +
        `<path d="M0,192 Q90,${160 + j(14)} 180,190 T400,186 L400,250 L0,250 Z" fill="${p.mid}"/>` +
        `<rect y="204" width="400" height="46" fill="${p.near}"/>` +
        `<path d="M0,216 q20-7 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="${p.ground}" stroke-width="2" opacity=".45"/>` +
        `<path d="M0,232 q22-7 44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0 t44 0" fill="none" stroke="${p.ground}" stroke-width="2" opacity=".3"/>` +
        `<path d="M300 196 l0-34 l24 34 z M296 196 l-18-26 l18 0 z" fill="${p.ground}" opacity=".75"/>`;
    } else { /* city */
      let towers = '';
      let x = -10;
      while (x < 410) {
        const w = 26 + rnd() * 26;
        const h = 40 + rnd() * 105;
        towers += `<rect x="${x.toFixed(1)}" y="${(206 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${p.mid}" rx="2"/>`;
        if (h > 110) towers += `<rect x="${(x + w / 2 - 1.4).toFixed(1)}" y="${(206 - h - 16).toFixed(1)}" width="2.8" height="16" fill="${p.mid}"/>`;
        x += w + 5 + rnd() * 8;
      }
      let win = '';
      for (let i = 0; i < 46; i++) {
        win += `<rect x="${(rnd() * 392).toFixed(1)}" y="${(120 + rnd() * 82).toFixed(1)}" width="3" height="4" fill="${p.sun}" opacity="${(.25 + rnd() * .5).toFixed(2)}"/>`;
      }
      body =
        `<circle cx="${320 + j(30)}" cy="${52 + j(10)}" r="20" fill="${p.sun}" opacity=".85"/>` +
        `<path d="M0,150 L80,96 L150,150 L230,104 L310,150 L400,118 L400,210 L0,210 Z" fill="${p.far}" opacity=".8"/>` +
        towers + win +
        `<rect y="206" width="400" height="44" fill="${p.near}"/>` +
        `<rect y="228" width="400" height="22" fill="${p.ground}"/>`;
    }

    return `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/>
      </linearGradient></defs>
      <rect width="400" height="250" fill="url(#${id})"/>${body}</svg>`;
  }

  /* ------------------------ Nhóm & chủ đề tour ----------------------- */
  const REGION_LABEL = { bac: 'Miền Bắc', trung: 'Miền Trung', nam: 'Miền Nam', quocte: 'Quốc tế' };

  const THEMES = [
    { icon: '🏝', label: 'Biển đảo',           tags: ['Biển', 'Biển vắng', 'Lặn ngắm san hô'] },
    { icon: '⛰',  label: 'Núi & trekking',     tags: ['Trekking', 'Núi', 'Xe máy'] },
    { icon: '🏛', label: 'Di sản & văn hoá',   tags: ['Di sản', 'Văn hoá', 'Lịch sử', 'Tâm linh'] },
    { icon: '🌿', label: 'Nghỉ dưỡng',         tags: ['Nghỉ dưỡng', 'Nhẹ nhàng'] },
    { icon: '👨‍👩‍👧', label: 'Gia đình',          tags: ['Gia đình'] },
    { icon: '💞', label: 'Cặp đôi',            tags: ['Cặp đôi'] },
    { icon: '🍜', label: 'Ẩm thực & sông nước', tags: ['Ẩm thực', 'Sông nước'] },
    { icon: '✈️', label: 'Bay thẳng quốc tế',  tags: ['Quốc tế', 'Bay thẳng'] }
  ];

  const shortVnd = n => (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'tr';

  /* --------------------------- Trạng thái --------------------------- */
  const MAX_PRICE = Math.max(...TOURS.map(t => t.price));

  /* Trần của thanh trượt ngân sách. <input type="range"> chỉ dừng được ở các
     mốc min + k·step, mà MAX_PRICE (32.900.000) không rơi đúng mốc nào của
     min 2.000.000 / step 500.000 — kéo hết cỡ cũng chỉ tới 32.500.000. Hệ quả:
     vừa chạm vào thanh trượt là tour đắt nhất bị lọc mất, và không có cách nào
     kéo cho nó hiện lại. Làm tròn lên đúng một mốc để trần luôn với tới được. */
  const PRICE_CAP = (() => {
    const el = $('#priceRange');
    const min = +el.min || 0, step = +el.step || 1;
    return min + Math.ceil((MAX_PRICE - min) / step) * step;
  })();

  const state = {
    region: 'all',
    maxPrice: PRICE_CAP,
    sort: 'popular',
    dest: '',
    date: '',
    guests: 0,
    tags: [],
    tagLabel: ''
  };

  const bk = { tour: null, step: 1, adults: 2, children: 0, infants: 0, single: false, coupon: null };

  const STORE = 'vivu.bookings.v1';
  const loadBookings = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } };
  const saveBookings = list => { try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) {} };

  /* --------------------------- Toast --------------------------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  /* ======================= RENDER: DANH SÁCH TOUR ======================= */
  function matches(t) {
    if (state.region !== 'all' && t.region !== state.region) return false;
    if (t.price > state.maxPrice) return false;
    if (state.dest && !(t.location + ' ' + t.name + ' ' + t.tags.join(' ')).toLowerCase().includes(state.dest.toLowerCase())) return false;
    if (state.tags.length && !t.tags.some(x => state.tags.includes(x))) return false;
    if (state.guests && t.slots < state.guests) return false;
    if (state.date && !t.departures.some(d => d >= state.date)) return false;
    return true;
  }

  function sortList(list) {
    const by = {
      'popular':    (a, b) => b.booked - a.booked,
      'price-asc':  (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'rating':     (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      'days':       (a, b) => b.days - a.days
    }[state.sort];
    return list.slice().sort(by);
  }

  /* MỘT thẻ duy nhất cho mọi nơi bày tour: lưới trang chủ, trang chủ đề, trang
     điểm đến. Đừng thêm biến thể riêng cho từng trang — cùng một tour mà nhìn
     ra hai kiểu tuỳ đường người xem đi vào thì đọc thành hai sản phẩm khác
     nhau. Muốn đổi dáng thẻ thì đổi ở đây, đổi cho tất cả. */
  function tourCard(t) {
    const off = t.oldPrice ? Math.round((1 - t.price / t.oldPrice) * 100) : 0;
    return `
      <article class="tour-card" data-id="${t.id}">
        <div class="card-media">
          ${scene(t.scene, t.id)}
          ${t.photo ? `<img data-src="${esc(t.photo)}" alt="${esc(t.name)}" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
          ${off > 0 ? `<span class="badge">-${off}%</span>` : ''}
          <span class="badge badge--slots">Còn ${t.slots} chỗ</span>
        </div>
        <div class="card-body">
          <p class="card-loc">📍 ${esc(t.location)} · ${t.days}N${t.nights}Đ</p>
          <!-- Tiêu đề CHÍNH LÀ nút mở chi tiết — trước đây có thêm một nút
               "Chi tiết" ở chân thẻ, nhưng hai nút cạnh nhau thì nút cam "Đặt
               ngay" phải tranh chỗ với một nút viền cùng khổ, mà việc muốn làm
               là đặt chứ không phải đọc thêm. Dùng <button> chứ không phải h3
               gắn data-detail: có vậy mới tab tới và bấm Enter được.        -->
          <h3 class="card-title"><button type="button" class="card-title-btn" data-detail="${t.id}">${esc(t.name)}</button></h3>
          <p class="card-sum">${esc(t.summary)}</p>
          <!-- Chỉ điểm đánh giá + hai thẻ chủ đề. Từng có thêm một thẻ ngày
               khởi hành gần nhất, nhưng ba–bốn viên nút xếp hàng làm hàng này
               nặng hơn cả tiêu đề, mà ngày khởi hành thì đằng nào cũng phải
               chọn lại ở bước đặt tour. -->
          <div class="card-meta">
            <span class="meta-tag meta-tag--rate">★ ${t.rating.toFixed(1)} (${t.reviews})</span>
            ${t.tags.slice(0, 2).map(x => `<span class="meta-tag">${esc(x)}</span>`).join('')}
          </div>
          <div class="card-foot">
            <div>
              ${t.oldPrice ? `<div class="price-old">${vnd(t.oldPrice)}</div>` : ''}
              <div class="price-now">${vnd(t.price)}</div>
              <div class="price-unit">/ khách</div>
            </div>
            <div class="card-btns">
              <button class="btn btn--sun btn--sm" data-book="${t.id}">Đặt ngay</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  /* Lưới tour hiện theo từng đợt PAGE_SIZE thẻ. `shown` là số thẻ đang bày ra;
     mọi thay đổi bộ lọc đều kéo nó về mốc đầu, chỉ nút "Xem thêm" mới cộng
     thêm — nên renderTours(true) đọc ra là "vừa bấm xem thêm", còn mọi lời gọi
     khác (đổi chip, kéo ngân sách, tìm kiếm…) giữ nguyên chữ ký cũ.          */
  const PAGE_SIZE = 6;
  let shown = PAGE_SIZE;

  function renderTours(more) {
    const list = sortList(TOURS.filter(matches));
    const grid = $('#tourGrid');
    if (!more) shown = PAGE_SIZE;
    const page = list.slice(0, shown);

    if (more) {
      /* Chỉ CHÈN phần mới chứ không vẽ lại cả lưới: gán innerHTML là những
         thẻ đang đứng yên cũng bị dựng lại, mất trạng thái .in rồi chạy lại
         hiệu ứng hiện dần — cả trang giật một cái ở mỗi lần bấm.            */
      const had = grid.children.length;
      grid.insertAdjacentHTML('beforeend', page.slice(had).map(tourCard).join(''));
      $$('#tourGrid .tour-card').slice(had).forEach(watch);
    } else {
      grid.innerHTML = page.map(tourCard).join('');
      $$('#tourGrid .tour-card').forEach(watch);
    }

    $('#emptyState').hidden = list.length > 0;

    /* Nút đếm số CÒN LẠI chứ không chỉ ghi "Xem thêm": người xem biết trước
       còn bao nhiêu mới quyết định có bấm tiếp hay không. */
    const rest = list.length - page.length;
    $('#moreRow').hidden = rest <= 0;
    $('#moreTours').textContent = `Xem thêm ${Math.min(PAGE_SIZE, rest)} tour · còn ${rest}`;

    const note = [
      state.dest ? `điểm đến "${state.dest}"` : '',
      state.tagLabel ? `chủ đề "${state.tagLabel}"` : ''
    ].filter(Boolean).join(' · ');
    $('#resultCount').textContent = list.length
      ? `${list.length} tour phù hợp${note ? ' · ' + note : ''}`
      : 'Không có kết quả';
  }

  /* ======================== RENDER: PHẦN TĨNH ========================= */
  function renderStatic() {
    // select điểm đến trong ô tìm kiếm
    const locs = [...new Set(TOURS.map(t => t.location))].sort((a, b) => a.localeCompare(b, 'vi'));
    $('#fDest').insertAdjacentHTML('beforeend', locs.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join(''));
    $('#fDate').min = todayISO();

    // điểm đến nổi bật
    $('#destGrid').innerHTML = DESTINATIONS.map(d => `
      <button class="dest-card" data-q="${esc(d.q)}">
        ${scene(d.scene, d.label)}
        ${d.photo ? `<img data-src="${esc(d.photo)}" alt="${esc(d.label)}" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
        <span class="dest-card-txt"><b>${esc(d.label)}</b><span>${esc(d.note)}</span></span>
      </button>`).join('');

    /* Đánh giá. data-side ghi sẵn hướng bay vào của từng thẻ (trái/phải xen
       kẽ) ngay trong markup: says-motion.js đọc thuộc tính này chứ không tự
       tính theo chỉ số, nên thêm bớt cảm nhận trong data.js là thứ tự vẫn
       luân phiên đúng, và xem DOM là biết thẻ nào vào từ đâu. */
    $('#reviewGrid').innerHTML = REVIEWS.map((r, i) => `
      <article class="say-card" data-side="${i % 2 ? 'right' : 'left'}">
        ${r.photo ? `<div class="say-photo"><img data-src="${esc(r.photo)}" alt="${esc(r.trip)}" loading="lazy" decoding="async" onerror="this.closest('.say-photo').remove()"></div>` : ''}
        <div class="say-body">
          <div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
          <p>“${esc(r.text)}”</p>
          <div class="reviewer">
            <span class="avatar">${esc(r.name.trim().split(' ').pop().charAt(0))}</span>
            <span><b>${esc(r.name)}</b><span>${esc(r.trip)}</span></span>
          </div>
        </div>
      </article>`).join('');

    // FAQ
    /* Ba lớp bọc quanh phần trả lời, không phải thừa:
         .faq-a     — hộp bị kẹp max-height, chỉ nó có overflow:hidden;
         .faq-a-in  — CHỞ TOÀN BỘ padding quanh khung trả lời;
         .faq-a-box — khung nền xám bo góc.
       Sở dĩ padding phải nằm ở lớp giữa: chiều cao mở ra lấy từ
       .faq-a.scrollHeight, mà scrollHeight tính theo hộp con — đặt margin ở
       con thì lề dưới không được tính, khung trả lời bị cụt mất một quãng;
       đặt padding thẳng lên .faq-a thì trình duyệt lại tính không thống nhất.
       Padding nằm ở con, gói trong border-box, thì luôn đếm đủ. */
    $('#faqList').innerHTML = FAQS.map((f, i) => `
      <div class="faq-item">
        <button class="faq-q" type="button" aria-expanded="false">
          <span class="faq-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <span class="faq-qt">${esc(f.q)}</span>
          <span class="faq-mark" aria-hidden="true"></span>
        </button>
        <div class="faq-a">
          <div class="faq-a-in">
            <div class="faq-a-box">
              <span class="faq-a-ic" aria-hidden="true">${FAQ_ICONS[f.ic] || FAQ_ICONS.date}</span>
              <p>${esc(f.a)}</p>
            </div>
          </div>
        </div>
      </div>`).join('');

    /* Mở sẵn câu đầu. Không phải để trang trí: một danh sách toàn dòng đóng
       thì người xem phải đoán bên trong có gì mới bấm, còn thấy sẵn một câu
       trả lời là hiểu ngay cả khối này dùng để làm gì. */
    openFaq($('#faqList .faq-item'), true);

    $('#priceLabel').textContent = vnd(PRICE_CAP);
    $('#priceRange').max = PRICE_CAP;
    $('#priceRange').value = PRICE_CAP;

    // thanh ngân sách của trang chủ đề dùng chung mốc trần
    $('#themePriceLabel').textContent = vnd(PRICE_CAP);
    $('#themePrice').max = PRICE_CAP;
    $('#themePrice').value = PRICE_CAP;
  }

  /* ==================================================================== */
  /*  CAMERA — cuộn trang chính là điều khiển ống kính                     */
  /*  JS chỉ tính tiến độ --p (0→1) của từng cú máy; CSS lo phần dàn cảnh. */
  /* ==================================================================== */
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shots = $$('.shot');
  let needsFrame = true;

  /** Tiến độ cuộn của một cú máy: 0 khi vừa chạm đỉnh, 1 khi rời khỏi */
  function shotProgress(shot, vh) {
    const r = shot.getBoundingClientRect();
    const travel = r.height - vh;
    if (travel <= 0) return r.top < vh / 2 ? 1 : 0;
    return Math.min(1, Math.max(0, -r.top / travel));
  }

  // mốc cuộn mở từng điểm đến — số mốc phải khớp số <li> trong #climbCaps
  const CLIMB_STOPS = [0, 0.2, 0.4, 0.6, 0.8];

  // tra DOM một lần, không truy vấn lại mỗi khung hình
  const capEls  = $$('#climbCaps li');
  const destEls = $$('#destStack .dest-shot');
  const stepEl  = $('#destStep');
  let climbIdx  = -1;

  /** Điểm đến nổi bật: mỗi nấc cuộn đổi ảnh nền + tiêu đề + mô tả */
  function climbFrame(p) {
    let idx = 0;
    for (let i = 0; i < CLIMB_STOPS.length; i++) if (p >= CLIMB_STOPS[i]) idx = i;
    idx = Math.min(idx, capEls.length - 1);
    if (idx === climbIdx) return;      // chưa sang nấc mới thì khỏi đụng vào DOM
    climbIdx = idx;

    capEls.forEach((li, i) => li.classList.toggle('on', i === idx));
    destEls.forEach((el, i) => el.classList.toggle('on', i === idx));
    if (stepEl) stepEl.textContent = String(idx + 1).padStart(2, '0');
  }

  /* ------------------------- HERO ------------------------------------
     Tiêu đề và form đứng yên để luôn đọc/bấm được. Phần nền thì tuỳ ai đang
     cầm: js/scroll-scrub.js tua chuỗi ảnh theo cuộn khi có frames/hero/, còn
     không thì video chạy tự do và ở đây chỉ tạm dừng nó lúc khung hình trôi
     khỏi tầm nhìn, cho đỡ tốn CPU. */
  const heroVideo = $('#heroVideo');

  /** Chỉ chạy video khi khung hình mở đầu còn trong tầm nhìn */
  function playHero(on) {
    if (!heroVideo) return;
    // scroll-scrub.js đã nhận điều khiển <video> — chen play()/pause() vào đây
    // sẽ đá nhau với vòng tua của nó.
    if (['on', 'static', 'fallback'].includes(document.documentElement.dataset.heroScrub)) return;
    if (on && heroVideo.paused) heroVideo.play().catch(() => {});
    else if (!on && !heroVideo.paused) heroVideo.pause();
  }

  /* Vòm của khối cam kết: 0 khi mép trên còn ở đáy khung, 1 khi nó đã lên tới
     đỉnh khung. Không dùng shotProgress() được — hàm đó đo quãng một cú máy
     CAO HƠN khung hình trôi qua khung, còn đây là một khối cao đúng bằng
     khung đang dâng lên, hai phép đo khác hẳn nhau.

     Chỉ ghi khi giá trị đổi đáng kể: mỗi lần gán biến CSS là một lần trình
     duyệt phải tính lại style cho cả cây con, mà hàm này chạy mỗi khung. */
  const domeEl = $('#why');
  let domeNow = -1;
  function domeFrame(vh) {
    if (!domeEl) return;
    const top = domeEl.getBoundingClientRect().top;
    if (top > vh || top < -vh) return;          // ngoài tầm thì khỏi đụng tới
    const p = Math.min(1, Math.max(0, (vh - top) / vh));
    if (Math.abs(p - domeNow) < 0.004) return;
    domeNow = p;
    domeEl.style.setProperty('--rise', p.toFixed(4));
  }

  function camera() {
    const vh = window.innerHeight;
    domeFrame(vh);
    for (const shot of shots) {
      const r = shot.getBoundingClientRect();
      // Hero xử lý trước bộ lọc tầm nhìn bên dưới, nếu không khi nó trôi hẳn
      // khỏi màn hình vòng lặp sẽ bỏ qua và video cứ thế chạy mãi. Không đặt
      // --p: không CSS nào của hero đọc tới, tiến độ cuộn của cú máy này do
      // scroll-scrub.js tự tính lấy.
      if (shot.dataset.cam === 'hero') { playHero(r.bottom > 0 && r.top < vh); continue; }
      if (r.bottom < -vh || r.top > vh * 1.5) continue;   // ngoài khung thì bỏ qua
      const p = shotProgress(shot, vh);
      shot.style.setProperty('--p', p.toFixed(4));
      if (shot.dataset.cam === 'climb') climbFrame(p);
      if (shot.dataset.cam === 'pan') panFrame(shot, p);
    }
  }

  let panMax = 0;

  /** Đo quãng đường lia ngang của dải điểm đến */
  function measurePan() {
    const shot = $('.shot--pan');
    if (!shot) return;
    const track = $('#destGrid'), rail = $('.pan-rail');
    if (!track || !rail) return;
    panMax = Math.max(0, track.scrollWidth - rail.clientWidth + 24);
    const p = shotProgress(shot, window.innerHeight);
    shot.style.setProperty('--pan-x', (-p * panMax).toFixed(2) + 'px');
  }

  function panFrame(shot, p) {
    shot.style.setProperty('--pan-x', (-p * panMax).toFixed(2) + 'px');
  }

  let cameraFrame = 0;
  function frame() {
    cameraFrame = 0;
    if (needsFrame) { camera(); syncHeaderBg(); needsFrame = false; }
  }

  function requestCameraFrame() {
    needsFrame = true;
    if (!cameraFrame) cameraFrame = requestAnimationFrame(frame);
  }

  function initCamera() {
    if (REDUCED) {
      // tôn trọng lựa chọn giảm chuyển động: giữ nguyên khung poster, không phát video
      if (heroVideo) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
      return;
    }
    window.addEventListener('scroll', requestCameraFrame, { passive: true });
    window.addEventListener('resize', () => { measurePan(); requestCameraFrame(); });
    measurePan();
    camera();
  }

  /* --------------- Xuất hiện dần khi ống kính đi tới ------------------ */
  const reveal = REDUCED ? null : new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  function watch(el, i) {
    if (!reveal) { el.classList.add('in'); return; }
    el.style.setProperty('--i', (i || 0) % 8);
    reveal.observe(el);
  }

  /* ================== CAM KẾT: RÊ CHUỘT LÀ BUNG RA ====================
     Năm cam kết xếp thành danh sách; rê chuột vào dòng nào thì dòng đó mở ra
     ảnh và hai đoạn nội dung, dòng đang mở trước đó đóng lại. LÚC NÀO CŨNG CÓ
     ĐÚNG MỘT DÒNG MỞ — kể cả khi chuột đã rời khỏi cả khối. Đóng sạch lúc rời
     chuột thì cả khối co lại thành năm dòng tiêu đề trơ trọi, mà người vừa
     đọc dở một cam kết thì mất luôn chỗ đang đọc.

     Chiều cao mở bằng max-height do JS đo, giống hệt accordion Cẩm nang bên
     dưới. Không có cách thuần CSS nào nội suy được từ 0 tới `auto`.

     Toàn bộ chữ và ảnh nằm sẵn trong HTML; hàm này chỉ gắn/gỡ .is-open và ghi
     max-height. Tắt JS thì dòng đầu vẫn mở — HTML gắn sẵn .is-open, còn phần
     max-height do một cặp quy tắc dự phòng trong style.css lo (tìm "đường lui
     khi KHÔNG CÓ JS"). Giá trị nội tuyến ghi ở đây luôn thắng cặp đó. */
  function initWhy() {
    const list = $('.why-list');
    if (!list) return;
    const items = $$('.why-item', list);
    if (!items.length) return;

    const parts = li => [$('.why-shot', li), $('.why-more', li)];
    let current = items.find(li => li.classList.contains('is-open')) || items[0];

    function open(li) {
      if (li === current) return;

      current.classList.remove('is-open');
      for (const el of parts(current)) if (el) el.style.maxHeight = '';
      const oldMark = $('.why-mark', current);
      if (oldMark) oldMark.setAttribute('aria-expanded', 'false');

      current = li;
      li.classList.add('is-open');
      measure(li);
      const mark = $('.why-mark', li);
      if (mark) mark.setAttribute('aria-expanded', 'true');
    }

    /* Đo SAU khi đã gắn .is-open: lúc đóng, .why-no còn chiếm chỗ (ở khổ hẹp)
       nên bề ngang cột và cách xuống dòng của đoạn văn có thể khác. */
    function measure(li) {
      for (const el of parts(li)) if (el) el.style.maxHeight = el.scrollHeight + 'px';
    }

    for (const li of items) {
      li.addEventListener('pointerenter', () => open(li));
      // Cảm ứng và bàn phím không có trạng thái rê chuột; thiếu hai dòng này
      // thì trên điện thoại cả khối đứng im ở dòng đầu.
      li.addEventListener('click', () => open(li));
      li.addEventListener('focusin', () => open(li));
    }

    // Đổi khổ màn là đoạn văn xuống dòng khác đi, con số px đo lúc trước sai
    // ngay. Đo lại đúng dòng đang mở, không phải cả năm.
    window.addEventListener('resize', () => measure(current));
    measure(current);
  }

  /* ======================= HEADER: MEGA MENU =========================== */
  function renderMega() {
    // Cột điểm đến, gom theo khu vực
    const cols = Object.keys(REGION_LABEL).map(r => {
      const inRegion = TOURS.filter(t => t.region === r);
      const locs = [...new Set(inRegion.map(t => t.location))];
      return `<div class="mega-col">
        <h5>${REGION_LABEL[r]}</h5>
        ${locs.map(l => {
          const of = inRegion.filter(t => t.location === l);
          const min = Math.min(...of.map(t => t.price));
          /* <a> chứ không <button>: mỗi điểm đến giờ là một trang có URL
             riêng, nên nó phải hành xử như một liên kết — mở tab mới bằng
             chuột giữa, sao chép địa chỉ, nút back của trình duyệt. Điều
             hướng do chính hash lo, không cần handler nào. */
          return `<a class="mega-link" href="${destHref(l)}">
                    <span>${esc(l.split(' — ')[0])}</span><i>từ ${shortVnd(min)}</i>
                  </a>`;
        }).join('')}
        <button class="mega-link" data-region="${r}">
          <span style="color:var(--brand);font-weight:600">Tất cả ${REGION_LABEL[r]}</span><i>${inRegion.length} tour</i>
        </button>
      </div>`;
    }).join('');

    $('#megaDestInner').innerHTML = cols;

    // Lưới chủ đề
    $('#megaThemeInner').innerHTML = THEMES.map((th, i) => {
      const n = TOURS.filter(t => t.tags.some(x => th.tags.includes(x))).length;
      return `<button class="theme-tile" data-theme="${i}">
        <em>${th.icon}</em>
        <span><b>${esc(th.label)}</b><small>${n} tour</small></span>
      </button>`;
    }).join('');
  }

  let megaOpen = null, megaTimer = null;
  const isDesktop = () => window.innerWidth > 980;

  function syncHeaderBg() {
    const h = $('#siteHeader');
    // Cú máy mở đầu ghim suốt 300vh để tua video theo cuộn, nên chỉ đo scrollY
    // là không đủ: mới cuộn 8px header đã trắng đục trong khi phía sau vẫn kín
    // ảnh. Giữ nguyên mực trắng chừng nào .stage của hero còn phủ hết màn hình.
    // Hai khối nền TỐI tràn lên dưới header: hero của landing và dải đầu trang
    // trải nghiệm. Đang nằm trên một trong hai thì giữ mực trắng.
    //
    // Bìa trang chủ đề (.theme-cover) TỪNG nằm trong danh sách này, hồi nó còn
    // là một tấm ảnh tối. Nay nó là nền pastel sáng có mẫu 3D đặc nằm bên
    // trong, mà header thì fixed: cuộn xuống một chút là balo, la bàn, ngọn
    // núi… trôi lên ngay sau chữ điều hướng, đọc không ra gì. Bỏ nó ra khỏi
    // đây thì vừa cuộn là header chuyển sang kính trắng và che hết phía sau —
    // đó cũng là lý do bộ màu chữ của header bị ép sang mực đậm cho cả route
    // này (xem body.route-theme .site-header trong style.css).
    // offsetParent === null nghĩa là khối đang bị ẩn (display:none) -> bỏ qua.
    const hero  = $('.shot--hero');
    const overHero  = !!hero  && hero.offsetParent  !== null &&
                      hero.getBoundingClientRect().bottom > window.innerHeight;
    const overCover = ['.exp-head', '.hue-story-hero'].some(sel => {
      const el = $(sel);
      return !!el && el.offsetParent !== null &&
             el.getBoundingClientRect().bottom > h.offsetHeight;
    });
    /* Trang đăng ký không có mặt ở đây: nó ẩn hẳn header (xem .route-signup
       trong style.css), nên không cần nhánh riêng nào cho nó. */
    const scrolled = window.scrollY > 8 && !overHero && !overCover;
    h.classList.toggle('is-stuck', scrolled);
    h.classList.toggle('is-solid', scrolled || !!megaOpen || $('#navLinks').classList.contains('is-open'));
  }

  function setMega(name) {
    megaOpen = name;
    $$('.nav-item').forEach(it => it.classList.toggle('is-open', it.dataset.mega === name));
    $$('.mega').forEach(m => m.classList.toggle('is-open', m.dataset.panel === name));
    $$('.nav-item .nav-link').forEach(b =>
      b.setAttribute('aria-expanded', String(b.parentElement.dataset.mega === name)));
    syncHeaderBg();
  }
  const closeMega = () => { if (megaOpen) setMega(null); };

  /** Chọn chủ đề = mở trang chủ đề. Việc dựng trang do applyRoute() lo. */
  function applyTheme(i) {
    const href = themeHref(i);
    closeMega();
    // Đang đứng sẵn ở đúng hash thì gán lại không bắn hashchange -> gọi tay.
    if (location.hash === href) applyRoute();
    else location.hash = href;
  }

  /* ==================== HEADER: Ô TÌM KIẾM + GỢI Ý ===================== */
  function searchTours(q) {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    return TOURS.filter(t =>
      (t.name + ' ' + t.location + ' ' + t.tags.join(' ')).toLowerCase().includes(k)
    ).slice(0, 6);
  }

  function renderSug(q) {
    const box = $('#navSug');
    const list = searchTours(q);
    if (q.trim().length < 2) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = (list.length
      ? list.map(t => `<button type="button" data-detail="${t.id}">
            <span><b>${esc(t.name)}</b><small>${esc(t.location)} · ${t.days}N${t.nights}Đ</small></span>
            <span class="sug-price">${shortVnd(t.price)}</span>
          </button>`).join('')
      : `<p class="sug-empty">Không tìm thấy tour nào cho “${esc(q)}”.</p>`)
      + (list.length ? `<button type="button" data-search-all="${esc(q)}" style="border-top:1px solid var(--line);margin-top:.3rem">
            <b style="color:var(--brand)">Xem tất cả kết quả cho “${esc(q)}”</b></button>` : '');
    box.hidden = false;
  }

  /** Đóng/mở ô tìm kiếm dạng icon trên header */
  function setSearch(open) {
    const box = $('#navSearch');
    box.classList.toggle('is-open', open);
    /* Cờ trên HEADER chứ không chỉ trên ô: dưới 1180px, hàng liên kết phải
       nhường chỗ cho viên tìm kiếm đang mở, mà hàng ấy là anh em của ô nên
       CSS không với tới được từ .nav-search.is-open. */
    $('.site-header').classList.toggle('is-searching', open);
    $('#searchToggle').setAttribute('aria-expanded', String(open));
    $('#navSearchInput').tabIndex = open ? 0 : -1;
    if (open) $('#navSearchInput').focus();
    else { $('#navSug').hidden = true; $('#navSearchInput').blur(); }
  }

  function applySearch(q) {
    state.dest = q.trim(); state.region = 'all'; state.tags = []; state.tagLabel = '';
    state.date = ''; state.guests = 0;
    $$('#regionChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.region === 'all'));
    $('#navSug').hidden = true;
    setSearch(false);
    closeDrawer();
    renderTours();
    $('#tours').scrollIntoView({ behavior: 'smooth' });
    const n = TOURS.filter(matches).length;
    toast(n ? `Tìm thấy ${n} tour cho “${q.trim()}”.` : `Không có tour nào khớp “${q.trim()}”.`);
  }

  /* ============================== DRAWER =============================== */
  function closeDrawer() {
    $('#navLinks').classList.remove('is-open');
    $('#navToggle').classList.remove('is-open');
    $('#navToggle').setAttribute('aria-expanded', 'false');
    syncHeaderBg();
  }

  /* ============================ MODAL CHUNG ============================ */
  let lastFocus = null;
  function openModal(id) {
    lastFocus = document.activeElement;
    $('#' + id).hidden = false;
    document.body.classList.add('is-locked');
  }
  function closeModal(el) {
    el.hidden = true;
    if (!$$('.modal:not([hidden])').length) document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-close]');
    if (c) closeModal(c.closest('.modal'));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { const m = $$('.modal:not([hidden])').pop(); if (m) closeModal(m); }
  });

  /* ====================== MÀN HÌNH CHI TIẾT TOUR =======================
     Không còn là một cột chữ chạy dọc. Bố cục hai cột: bên trái nội dung chia
     năm mục có thanh mục lục dính trên đầu, bên phải thẻ đặt chỗ dính theo
     cuộn. Dưới 980px cột phải rơi xuống dưới và thanh giá ở đáy khung
     (#tourModalCta) hiện ra thay nó — xem media query trong style.css.     */

  const icon = (id, cls) => `<svg class="fi${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#fi-${id}"/></svg>`;

  const DETAIL_TABS = [
    { key: 'tong-quan',  ic: 'compass',   label: 'Tổng quan' },
    { key: 'lich-trinh', ic: 'route',     label: 'Lịch trình' },
    { key: 'bao-gom',    ic: 'checklist', label: 'Dịch vụ bao gồm' },
    { key: 'gia',        ic: 'price',     label: 'Giá & chính sách' },
    { key: 'danh-gia',   ic: 'star',      label: 'Đánh giá' }
  ];

  /* Danh sách yêu thích: chỉ là mảng id tour trong localStorage. Cùng kiểu
     bọc try/catch như STORE ở trên — chế độ riêng tư của Safari ném lỗi ngay
     ở lệnh đọc, mà mất danh sách yêu thích thì không đáng để gãy cả khung. */
  const FAVS = 'vivu.favs.v1';
  const loadFavs = () => { try { return JSON.parse(localStorage.getItem(FAVS)) || []; } catch (e) { return []; } };
  const saveFavs = list => { try { localStorage.setItem(FAVS, JSON.stringify(list)); } catch (e) {} };

  /** "Trần Thu Hà" -> "TH". Lấy HAI chữ cuối chứ không phải hai chữ đầu: tên
      Việt để họ lên trước, "TT" thì bốn người họ Trần ra cùng một ảnh. */
  function initials(name) {
    const p = String(name).trim().split(/\s+/);
    return (p.length > 1 ? p[p.length - 2][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
  }

  /** Tên ngắn cho vụn đường dẫn: 'Phú Quốc — Đảo ngọc 4 ngày' -> 'Phú Quốc' */
  const tourShort = t => t.name.split('—')[0].trim();

  function detailHighlight(h, photo) {
    const o = typeof h === 'string' ? { t: h } : h;
    return `<article class="hl">
        ${photo ? `<img class="hl-photo" src="${esc(photo)}" alt="${esc(o.t)}" onerror="this.remove()">` : ''}
        <div class="hl-shade"></div>
        <div class="hl-copy"><span class="hl-ic">${icon(o.ic || 'star')}</span><div><b>${esc(o.t)}</b>${o.d ? `<p>${esc(o.d)}</p>` : ''}</div></div>
      </article>`;
  }

  function detailFact(o) {
    return `<div class="fact${o.tone ? ' fact--' + o.tone : ''}">
        <span class="fact-ic">${icon(o.ic)}</span>
        <div class="fact-txt">
          <small>${esc(o.label)}</small>
          <b>${esc(o.value)}</b>
          ${o.note ? `<em>${esc(o.note)}</em>` : ''}
        </div>
      </div>`;
  }

  function openDetail(id) {
    const t = TOURS.find(x => x.id === id);
    if (!t) return;

    const off      = t.oldPrice ? Math.round((1 - t.price / t.oldPrice) * 100) : 0;
    const fee      = SINGLE_FEE[t.region] || 800000;
    const stars    = '★'.repeat(Math.round(t.rating)) + '☆'.repeat(5 - Math.round(t.rating));
    const happy    = Math.round(t.rating / 5 * 100);
    const faved    = loadFavs().indexOf(t.id) > -1;
    const deps     = t.departures.filter(d => d >= todayISO());
    const openDeps = deps.length ? deps : t.departures;
    /* Nhận xét nối với tour qua ẢNH chứ không qua trường `trip`: `trip` là
       chuỗi người viết tự gõ ("Phú Quốc 4N3Đ"), so khớp bằng nó là so chuỗi
       tự do. `photo` thì hai bên đều trỏ vào cùng một tệp. */
    const revs     = REVIEWS.filter(r => r.photo === t.photo);

    $('#tourModalBody').innerHTML = `
      <div class="detail-hero">
        ${scene(t.scene, t.id + 'hero')}
        ${t.photo ? `<img src="${esc(t.photo)}" alt="${esc(t.name)}" onerror="this.remove()">` : ''}
        <div class="detail-bar">
          <button type="button" class="dbar-btn dbar-back" data-close>
            <span class="dbar-round">${icon('back')}</span>Quay lại
          </button>
          <div class="detail-bar-right">
            <button type="button" class="dbar-btn dbar-btn--ico-sm${faved ? ' is-on' : ''}"
                    data-fav="${t.id}" aria-pressed="${faved}">
              ${icon('heart')}<span class="dbar-label">${faved ? 'Đã thích' : 'Yêu thích'}</span>
            </button>
            <button type="button" class="dbar-btn dbar-btn--ico-sm" data-share="${t.id}">
              ${icon('share')}<span class="dbar-label">Chia sẻ</span>
            </button>
            <button type="button" class="dbar-btn dbar-btn--ico" data-close aria-label="Đóng">${icon('close')}</button>
          </div>
        </div>
        <div class="detail-hero-copy">
          <nav class="detail-crumb" aria-label="Đường dẫn">
            ${icon('pin')}<b>${esc(t.location)}</b>
            <i>›</i><span>${esc(tourShort(t))}</span>
            <i>›</i><span>Tour ${t.days} ngày ${t.nights} đêm</span>
          </nav>
          <h2 class="detail-title" id="tourModalTitle">${esc(t.name)}</h2>
          <p class="detail-lede">${esc(t.summary)}</p>
          <div class="detail-facts">
            ${detailFact({ ic: 'star', tone: 'sun', label: 'Đánh giá', value: t.rating.toFixed(1) + '/5', note: t.reviews + ' đánh giá' })}
            ${detailFact({ ic: 'plane', label: 'Di chuyển', value: t.transport })}
            ${detailFact({ ic: 'hotel', label: 'Lưu trú', value: t.hotel })}
            ${detailFact({ ic: 'user', label: 'Chỗ còn lại', value: String(t.slots), note: 'chỗ' })}
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-main">
          <nav class="detail-tabs" aria-label="Mục trong trang tour">
            ${DETAIL_TABS.map((tb, i) => `
              <button type="button" class="dtab${i ? '' : ' is-active'}" data-tab="${tb.key}">
                ${icon(tb.ic)}${tb.label}
              </button>`).join('')}
          </nav>

          <section class="dsec" data-sec="tong-quan">
            <h3>Điểm nhấn hành trình</h3>
            <div class="hl-grid">${t.highlights.map((h, i) => detailHighlight(h, TOURS[(TOURS.indexOf(t) + i) % TOURS.length].photo)).join('')}</div>

            <h3 class="is-next">Ngày khởi hành đang mở bán</h3>
            <div class="card-meta">
              ${openDeps.map(d => `<span class="meta-tag">${dateVN(d)}</span>`).join('')}
            </div>
          </section>

          <section class="dsec" data-sec="lich-trinh">
            <h3>Lịch trình chi tiết</h3>
            ${t.itinerary.map((d, i) => `
              <div class="day"><b>Ngày ${i + 1} — ${esc(d.title)}</b><span>${esc(d.detail)}</span></div>`).join('')}
          </section>

          <section class="dsec" data-sec="bao-gom">
            <h3>Dịch vụ bao gồm</h3>
            <div class="inc-grid">
              <div>
                <h4>Giá tour đã có</h4>
                <ul class="list-check">${t.includes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
              </div>
              <div>
                <h4>Chưa bao gồm</h4>
                <ul class="list-check list-x">${t.excludes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
              </div>
            </div>
          </section>

          <section class="dsec" data-sec="gia">
            <h3>Giá theo độ tuổi</h3>
            <div class="ptab">
              <div class="ptab-row ptab-row--main"><span>Người lớn (từ 12 tuổi)</span><b>${vnd(t.price)}</b></div>
              <div class="ptab-row"><span>Trẻ em 2 – 11 tuổi · 75%</span><b>${vnd(t.price * .75)}</b></div>
              <div class="ptab-row"><span>Em bé dưới 2 tuổi · 20%</span><b>${vnd(t.price * .20)}</b></div>
              <div class="ptab-row"><span>Phụ thu phòng đơn</span><b>${vnd(fee)}</b></div>
            </div>

            <h3 class="is-next">Thanh toán & huỷ tour</h3>
            <ul class="policy">
              <li>Đặt cọc 50% — ${vnd(t.price * .5)}/khách — để giữ chỗ trong 24h, thanh toán phần còn lại trước ngày khởi hành 7 ngày.</li>
              <li>Huỷ trước 15 ngày hoàn 100%. Trước 7 ngày hoàn 50%. Trong vòng 7 ngày trước khởi hành không hoàn.</li>
              <li>Bất khả kháng (thiên tai, dịch bệnh, huỷ chuyến bay) được bảo lưu 12 tháng.</li>
            </ul>
          </section>

          <section class="dsec" data-sec="danh-gia">
            <h3>Khách đã đi nói gì</h3>
            <div class="rv-head">
              <div class="rv-score">
                <b>${t.rating.toFixed(1)}</b>
                <div class="stars">${stars}</div>
                <small>${t.reviews} đánh giá</small>
              </div>
              <p class="rv-sum">${happy}% khách hàng hài lòng sau chuyến đi. Đã có ${t.booked.toLocaleString('vi-VN')} lượt khách đặt tour này cùng Vivu Travel.</p>
            </div>
            ${revs.length ? revs.map(r => `
              <article class="rv">
                <div class="rv-top">
                  <span class="rv-av">${esc(initials(r.name))}</span>
                  <div>
                    <div class="rv-name">${esc(r.name)}</div>
                    <div class="rv-trip">${esc(r.trip)} · ${'★'.repeat(r.stars)}</div>
                  </div>
                </div>
                <p>${esc(r.text)}</p>
              </article>`).join('')
              : '<p class="rv-empty">Nhận xét chi tiết của những khởi hành gần nhất đang được cập nhật.</p>'}
          </section>
        </div>

        <aside class="detail-side">
          <div class="bookbox">
            <div class="bb-head">
              <div>
                ${t.oldPrice ? `<span class="price-old">${vnd(t.oldPrice)}</span>` : ''}
                <div class="bb-now">${vnd(t.price)}</div>
              </div>
              ${off ? `<span class="bb-off">-${off}%</span>` : ''}
            </div>
            <div class="bb-unit">/khách</div>

            <label class="bb-field">
              <span class="bb-lab">Ngày khởi hành</span>
              <span class="bb-sel">
                ${icon('calendar')}
                <select id="dvDate">
                  <option value="">Chọn ngày khởi hành</option>
                  ${openDeps.map(d => `<option value="${d}">${dateVN(d)}</option>`).join('')}
                </select>
                ${icon('chevron', 'bb-caret')}
              </span>
            </label>

            <label class="bb-field">
              <span class="bb-lab">Số lượng khách</span>
              <span class="bb-sel">
                ${icon('user')}
                <select id="dvGuests">
                  ${Array.from({ length: t.slots }, (_, i) =>
                    `<option value="${i + 1}"${i === 1 ? ' selected' : ''}>${i + 1} khách</option>`).join('')}
                </select>
                ${icon('chevron', 'bb-caret')}
              </span>
            </label>

            <p class="bb-hint">Tối đa ${t.slots} chỗ mỗi khởi hành</p>
            <button class="btn btn--sun btn--block" data-book="${t.id}">Đặt tour ngay</button>
            <p class="bb-instant">${icon('shieldcheck')} Xác nhận tức thì</p>

            <ul class="bb-trust">
              <li><span class="bb-tic">${icon('headset')}</span>
                  <div><b>Hỗ trợ 24/7</b><small>Đội ngũ Vivu Travel luôn sẵn sàng</small></div></li>
              <li><span class="bb-tic">${icon('shieldcheck')}</span>
                  <div><b>Thanh toán an toàn</b><small>Cọc 50%, phần còn lại trả sau</small></div></li>
              <li><span class="bb-tic">${icon('bolt')}</span>
                  <div><b>Xác nhận tức thì</b><small>Giữ chỗ ngay trong 24 giờ</small></div></li>
            </ul>
          </div>

          <a class="bb-hotline" href="tel:19001870">
            <span class="bb-hotline-ic">${icon('headset')}</span>
            <span><small>Hỗ trợ tư vấn</small><b>1900 1870</b><em>Thời gian: 08:00 – 22:00 mỗi ngày</em></span>
          </a>
        </aside>
      </div>`;

    /* Thanh giá đổ vào một ô RIÊNG ngoài vùng cuộn (xem chú thích ở index.html
       chỗ #tourModalCta). Hai lệnh gán chứ không một: gộp lại là nó quay về
       nằm trong vùng cuộn và lỗi cũ trở lại. */
    $('#tourModalCta').innerHTML = `
      <div>
        ${t.oldPrice ? `<span class="price-old">${vnd(t.oldPrice)}</span> ${off ? `<span class="badge" style="position:static">-${off}%</span>` : ''}` : ''}
        <div class="price-now">${vnd(t.price)} <span class="price-unit">/ khách</span></div>
      </div>
      <button class="btn btn--sun" data-book="${t.id}">Đặt tour ngay</button>`;

    openModal('tourModal');
    $('#tourModalBody').scrollTop = 0;
    syncDetailTabs();
  }

  /** Cuộn tới một mục và bật đúng thẻ mục lục. Cộng trừ theo tọa độ của CHÍNH
      vùng cuộn chứ không dùng scrollIntoView: phần tử nằm trong .modal-scroll,
      scrollIntoView sẽ kéo cả trang nền phía sau khung theo. */
  function gotoDetailSection(key) {
    const sc  = $('#tourModalBody');
    const sec = $(`.dsec[data-sec="${key}"]`, sc);
    if (!sec) return;
    const bar = $('.detail-tabs', sc);
    const top = sec.getBoundingClientRect().top - sc.getBoundingClientRect().top
              + sc.scrollTop - (bar ? bar.offsetHeight : 0) - 8;
    sc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  /** Mục nào đang nằm ngay dưới thanh mục lục thì thẻ ấy sáng. Duyệt xuôi và
      ghi đè dần: mục cuối cùng còn vượt qua vạch chính là mục đang xem. */
  function syncDetailTabs() {
    const sc   = $('#tourModalBody');
    const tabs = $$('.dtab', sc);
    if (!tabs.length) return;
    const bar  = $('.detail-tabs', sc);
    const line = sc.getBoundingClientRect().top + (bar ? bar.offsetHeight : 0) + 12;
    let cur = tabs[0].dataset.tab;
    $$('.dsec', sc).forEach(s => { if (s.getBoundingClientRect().top <= line) cur = s.dataset.sec; });
    tabs.forEach(b => b.classList.toggle('is-active', b.dataset.tab === cur));
  }

  /** Ngày và số khách đã chọn ở thẻ đặt chỗ. Trả về một vật thể chứ KHÔNG ghi
      vào `state`: state.date/state.guests là bộ lọc của danh sách tour ngoài
      trang chủ — ghi vào đó là lát nữa danh sách tự nhiên bị lọc mất. */
  function detailPicks() {
    const d = $('#dvDate'), g = $('#dvGuests');
    return { date: d && d.value ? d.value : '', guests: g && g.value ? +g.value : 0 };
  }

  function shareTour(id) {
    const t = TOURS.find(x => x.id === id);
    if (!t) return;
    const url  = location.href.split('#')[0];
    const text = `${t.name} · ${t.days}N${t.nights}Đ — ${vnd(t.price)}/khách`;
    if (navigator.share) { navigator.share({ title: t.name, text, url }).catch(() => {}); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\n${url}`)
        .then(() => toast('Đã sao chép liên kết tour vào bộ nhớ tạm.'))
        .catch(() => toast('Không sao chép được liên kết.'));
      return;
    }
    toast('Trình duyệt không hỗ trợ chia sẻ.');
  }

  /* =========================== LUỒNG ĐẶT TOUR ==========================
     `pref` là lựa chọn sẵn có từ nơi bấm nút — hiện chỉ thẻ đặt chỗ ở màn hình
     chi tiết truyền vào ({date, guests}). Không có thì rơi về bộ lọc đang đặt
     ở trang chủ như trước.                                                 */
  function openBooking(id, pref) {
    const t = TOURS.find(x => x.id === id);
    if (!t) return;
    const wantDate   = (pref && pref.date)   || state.date;
    const wantGuests = (pref && pref.guests) || state.guests;

    bk.tour = t; bk.step = 1; bk.adults = 2; bk.children = 0; bk.infants = 0;
    bk.single = false; bk.coupon = null;

    $('#bkTourName').textContent = `${t.name} · ${t.days}N${t.nights}Đ · ${t.location}`;
    const avail = t.departures.filter(d => d >= todayISO());
    const deps = avail.length ? avail : t.departures;
    $('#bDate').innerHTML = deps.map(d => `<option value="${d}">${dateVN(d)}</option>`).join('');
    if (wantDate) {
      const pick = deps.find(d => d >= wantDate);
      if (pick) $('#bDate').value = pick;
    }
    if (wantGuests) bk.adults = Math.min(wantGuests, t.slots);

    $('#singleFee').textContent = vnd(SINGLE_FEE[t.region] || 800000);
    $('#bSingle').checked = false;
    $('#bCoupon').value = '';
    $('#couponMsg').textContent = '';
    $('#couponMsg').className = 'hint';
    $('#bAgree').checked = false;
    $('#bookingForm').hidden = false;
    $('#successBox').hidden = true;
    $$('#bookingForm .is-bad').forEach(el => el.classList.remove('is-bad'));

    syncCounters(); gotoStep(1); recalc();
    openModal('bookingModal');
    $('#bookingModal .modal-scroll').scrollTop = 0;
  }

  function syncCounters() {
    $('#cAdults').textContent = bk.adults;
    $('#cChildren').textContent = bk.children;
    $('#cInfants').textContent = bk.infants;
    $$('[data-step-btn]').forEach(b => {
      const k = b.dataset.stepBtn, d = +b.dataset.delta;
      const next = bk[k] + d;
      const min = k === 'adults' ? 1 : 0;
      const totalOther = bk.adults + bk.children + bk.infants - bk[k];
      b.disabled = next < min || (d > 0 && totalOther + next > (bk.tour ? bk.tour.slots : 20));
    });
  }

  function priceBreakdown() {
    const t = bk.tour;
    const fee = SINGLE_FEE[t.region] || 800000;
    const rows = [];
    const adultTotal = bk.adults * t.price;
    rows.push({ label: `Người lớn × ${bk.adults}`, value: adultTotal });
    if (bk.children) rows.push({ label: `Trẻ em × ${bk.children} (75%)`, value: bk.children * t.price * .75 });
    if (bk.infants)  rows.push({ label: `Em bé × ${bk.infants} (20%)`,  value: bk.infants  * t.price * .20 });
    if (bk.single)   rows.push({ label: `Phụ thu phòng đơn × ${bk.adults}`, value: bk.adults * fee });

    const subtotal = rows.reduce((s, r) => s + r.value, 0);
    let discount = 0, couponLabel = '';
    if (bk.coupon) {
      const c = COUPONS[bk.coupon];
      discount = c.type === 'percent' ? subtotal * c.value / 100 : Math.min(c.value, subtotal);
      couponLabel = `${bk.coupon} — ${c.label}`;
    }
    return { rows, subtotal, discount, couponLabel, total: Math.max(0, subtotal - discount), deposit: Math.round((subtotal - discount) * .5) };
  }

  function recalc() {
    if (!bk.tour) return;
    const b = priceBreakdown();
    $('#summary').innerHTML =
      b.rows.map(r => `<div class="sum-row"><span>${esc(r.label)}</span><span>${vnd(r.value)}</span></div>`).join('') +
      (b.discount ? `<div class="sum-row discount"><span>${esc(b.couponLabel)}</span><span>− ${vnd(b.discount)}</span></div>` : '') +
      `<div class="sum-total"><span>Tổng thanh toán</span><b>${vnd(b.total)}</b></div>
       <div class="sum-row" style="margin-top:.4rem"><span>Đặt cọc giữ chỗ (50%)</span><span>${vnd(b.deposit)}</span></div>`;
    if (bk.step === 3) renderConfirm();
  }

  function renderConfirm() {
    const t = bk.tour, b = priceBreakdown();
    const guests = [`${bk.adults} người lớn`];
    if (bk.children) guests.push(`${bk.children} trẻ em`);
    if (bk.infants) guests.push(`${bk.infants} em bé`);
    const payLabel = $('#bPay').selectedOptions[0].textContent;
    $('#confirmBox').innerHTML = `<dl>
      <dt>Tour</dt><dd>${esc(t.name)}</dd>
      <dt>Thời gian</dt><dd>${t.days} ngày ${t.nights} đêm</dd>
      <dt>Khởi hành</dt><dd>${dateVN($('#bDate').value)}</dd>
      <dt>Điểm đón</dt><dd>${esc($('#bPickup').value)}</dd>
      <dt>Số khách</dt><dd>${guests.join(', ')}</dd>
      <dt>Phòng đơn</dt><dd>${bk.single ? 'Có' : 'Không'}</dd>
      <dt>Người đặt</dt><dd>${esc($('#bName').value || '—')}</dd>
      <dt>Liên hệ</dt><dd>${esc($('#bPhone').value || '—')} · ${esc($('#bEmail').value || '—')}</dd>
      <dt>Thanh toán</dt><dd>${esc(payLabel)}</dd>
      ${$('#bNote').value ? `<dt>Ghi chú</dt><dd>${esc($('#bNote').value)}</dd>` : ''}
      <dt>Tổng tiền</dt><dd><b>${vnd(b.total)}</b></dd>
    </dl>`;
  }

  function gotoStep(n) {
    bk.step = n;
    $$('#bookingForm .step').forEach(s => { s.hidden = +s.dataset.step !== n; });
    $$('#stepper li').forEach((li, i) => {
      li.classList.toggle('is-active', i + 1 === n);
      li.classList.toggle('is-done', i + 1 < n);
    });
    $('#prevStep').hidden = n === 1;
    $('#nextStep').hidden = n === 3;
    $('#submitBooking').hidden = n !== 3;
    if (n === 3) renderConfirm();
    $('#bookingModal .modal-scroll').scrollTop = 0;
  }

  function flag(el, bad) { el.classList.toggle('is-bad', !!bad); return !bad; }

  function validateStep(n) {
    if (n === 1) {
      if (!$('#bDate').value) { toast('Vui lòng chọn ngày khởi hành.'); return false; }
      if (bk.infants > bk.adults) { toast('Mỗi em bé cần đi cùng ít nhất một người lớn.'); return false; }
      return true;
    }
    if (n === 2) {
      const name = $('#bName'), phone = $('#bPhone'), email = $('#bEmail');
      let ok = true;
      ok = flag(name, name.value.trim().length < 2) && ok;
      ok = flag(phone, !/^(0|\+84)[0-9][0-9\s.\-]{7,12}$/.test(phone.value.trim())) && ok;
      ok = flag(email, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) && ok;
      if (!ok) toast('Kiểm tra lại họ tên, số điện thoại và email nhé.');
      return ok;
    }
    return true;
  }

  function applyCoupon() {
    const code = $('#bCoupon').value.trim().toUpperCase();
    const msg = $('#couponMsg');
    if (!code) { bk.coupon = null; msg.textContent = ''; msg.className = 'hint'; recalc(); return; }
    const c = COUPONS[code];
    if (!c) { bk.coupon = null; msg.textContent = 'Mã không hợp lệ hoặc đã hết hạn.'; msg.className = 'hint bad'; recalc(); return; }
    if (c.minGuests && bk.adults + bk.children < c.minGuests) {
      bk.coupon = null;
      msg.textContent = `Mã này áp dụng cho nhóm từ ${c.minGuests} khách trở lên.`;
      msg.className = 'hint bad'; recalc(); return;
    }
    bk.coupon = code;
    msg.textContent = 'Đã áp dụng: ' + c.label;
    msg.className = 'hint ok';
    recalc();
    toast('Áp dụng mã ' + code + ' thành công.');
  }

  function bookingCode() {
    const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += s[Math.floor(Math.random() * s.length)];
    return 'VV-' + out;
  }

  function submitBooking(e) {
    e.preventDefault();
    if (!$('#bAgree').checked) { toast('Vui lòng đồng ý với điều kiện đặt tour.'); return; }

    const t = bk.tour, b = priceBreakdown();
    const rec = {
      code: bookingCode(),
      tourId: t.id, tourName: t.name, location: t.location, days: t.days, nights: t.nights,
      date: $('#bDate').value, pickup: $('#bPickup').value,
      adults: bk.adults, children: bk.children, infants: bk.infants, single: bk.single,
      name: $('#bName').value.trim(), phone: $('#bPhone').value.trim(), email: $('#bEmail').value.trim(),
      address: $('#bAddress').value.trim(), note: $('#bNote').value.trim(),
      pay: $('#bPay').selectedOptions[0].textContent,
      coupon: bk.coupon, total: b.total, deposit: b.deposit,
      createdAt: new Date().toISOString()
    };

    const list = loadBookings();
    list.unshift(rec);
    saveBookings(list);
    updateBookingCount();

    $('#bookingForm').hidden = true;
    $('#successBox').hidden = false;
    $('#successBox').innerHTML = `
      <div class="tick">✓</div>
      <h2>Đã giữ chỗ thành công!</h2>
      <p class="lede" style="margin:.4rem auto 0">Chúng tôi đã gửi xác nhận tới <b>${esc(rec.email)}</b>.
      Tư vấn viên sẽ gọi lại trong vòng 30 phút để chốt thanh toán.</p>
      <div class="code">${rec.code}</div>
      <div class="confirm-box"><dl>
        <dt>Tour</dt><dd>${esc(rec.tourName)}</dd>
        <dt>Khởi hành</dt><dd>${dateVN(rec.date)}</dd>
        <dt>Số khách</dt><dd>${rec.adults + rec.children + rec.infants} khách</dd>
        <dt>Tổng tiền</dt><dd><b>${vnd(rec.total)}</b></dd>
        <dt>Cọc giữ chỗ</dt><dd>${vnd(rec.deposit)} — trong 24h</dd>
      </dl></div>
      <div class="modal-actions" style="justify-content:center;margin-top:1.2rem">
        <button class="btn btn--ghost" id="dlConfirm">Tải phiếu xác nhận</button>
        <button class="btn btn--sun" data-close>Hoàn tất</button>
      </div>`;
    $('#bookingModal .modal-scroll').scrollTop = 0;
    $('#dlConfirm').addEventListener('click', () => downloadConfirm(rec));
    toast('Đặt tour thành công · Mã ' + rec.code);
  }

  function downloadConfirm(r) {
    const txt =
`VIVU TRAVEL — PHIẾU XÁC NHẬN ĐẶT TOUR
=====================================
Mã đặt chỗ : ${r.code}
Tour       : ${r.tourName} (${r.days}N${r.nights}Đ)
Điểm đến   : ${r.location}
Khởi hành  : ${dateVN(r.date)}
Điểm đón   : ${r.pickup}
Số khách   : ${r.adults} người lớn, ${r.children} trẻ em, ${r.infants} em bé
Phòng đơn  : ${r.single ? 'Có' : 'Không'}
-------------------------------------
Người đặt  : ${r.name}
Điện thoại : ${r.phone}
Email      : ${r.email}
${r.address ? 'Địa chỉ    : ' + r.address + '\n' : ''}${r.note ? 'Ghi chú    : ' + r.note + '\n' : ''}-------------------------------------
Thanh toán : ${r.pay}
${r.coupon ? 'Mã giảm giá: ' + r.coupon + '\n' : ''}Tổng tiền  : ${vnd(r.total)}
Đặt cọc    : ${vnd(r.deposit)} (trong 24h)
=====================================
Hotline hỗ trợ 24/7: 1900 888 999`;
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `vivu-${r.code}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ========================= ĐẶT CHỖ CỦA TÔI ========================== */
  function updateBookingCount() {
    const n = loadBookings().length;
    $('#bookingCount').textContent = n;
  }

  function renderMyBookings() {
    const list = loadBookings();
    $('#myList').innerHTML = list.length ? list.map(r => `
      <div class="bk-item" data-code="${r.code}">
        <header>
          <div>
            <h4>${esc(r.tourName)}</h4>
            <p class="bk-meta">${dateVN(r.date)} · ${r.adults + r.children + r.infants} khách · đón tại ${esc(r.pickup)}</p>
          </div>
          <span class="bk-code">${r.code}</span>
        </header>
        <p class="bk-meta">${esc(r.name)} · ${esc(r.phone)}</p>
        <div class="bk-foot">
          <b>${vnd(r.total)}</b>
          <span>
            <button class="btn btn--ghost btn--sm" data-dl="${r.code}">Tải phiếu</button>
            <button class="link-danger" data-cancel="${r.code}" style="margin-left:.8rem">Huỷ đặt chỗ</button>
          </span>
        </div>
      </div>`).join('')
      : `<p class="lede">Bạn chưa có đặt chỗ nào. Chọn một tour ở trang chủ để bắt đầu nhé.</p>`;
  }

  /* ============================== SỰ KIỆN ============================== */
  function bind() {
    /* ---- header: nền mờ khi cuộn ----
       Bình thường việc này do vòng rAF trong frame() gọi: trình duyệt bắn scroll
       dày hơn 60Hz, gắn thẳng vào đó sẽ đọc scrollY + đụng classList quá nhiều
       lần mỗi khung hình. Chỉ khi tắt chuyển động (không có vòng rAF) mới nghe
       trực tiếp. */
    if (REDUCED) window.addEventListener('scroll', syncHeaderBg, { passive: true });
    syncHeaderBg();

    /* ---- menu di động ---- */
    $('#navToggle').addEventListener('click', () => {
      const open = $('#navLinks').classList.toggle('is-open');
      $('#navToggle').classList.toggle('is-open', open);
      $('#navToggle').setAttribute('aria-expanded', String(open));
      if (open) closeMega();
      syncHeaderBg();
    });
    $$('#navLinks a[href^="#"]').forEach(a => a.addEventListener('click', closeDrawer));

    /* ---- mega menu ---- */
    $$('.nav-item').forEach(item => {
      const name = item.dataset.mega;
      item.addEventListener('mouseenter', () => {
        if (!isDesktop()) return;
        clearTimeout(megaTimer);
        setMega(name);
      });
      $('.nav-link', item).addEventListener('click', e => {
        if (!isDesktop()) {                       // mobile: nhảy tới mục tương ứng
          const jump = e.currentTarget.dataset.jump;
          closeDrawer();
          if (jump) $(jump).scrollIntoView({ behavior: 'smooth' });
          return;
        }
        setMega(megaOpen === name ? null : name);
      });
      $('.nav-link', item).addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' && isDesktop()) { e.preventDefault(); setMega(name); }
      });
    });
    // rời khỏi vùng header thì đóng, có độ trễ nhỏ để di chuột mượt
    $('#siteHeader').addEventListener('mouseleave', () => {
      clearTimeout(megaTimer);
      megaTimer = setTimeout(closeMega, 180);
    });
    $('#siteHeader').addEventListener('mouseenter', () => clearTimeout(megaTimer));
    // hover sang link thường thì đóng mega
    $$('.nav-links > a.nav-link').forEach(a => a.addEventListener('mouseenter', () => {
      if (isDesktop()) closeMega();
    }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeMega(); setSearch(false); }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#siteHeader')) { closeMega(); setSearch(false); }
    });

    /* ---- ô tìm kiếm: bấm icon mới bung input ---- */
    const navInput = $('#navSearchInput');
    $('#searchToggle').addEventListener('click', () => {
      const open = $('#navSearch').classList.contains('is-open');
      if (open && navInput.value.trim()) { applySearch(navInput.value); return; }
      closeMega();
      setSearch(!open);
    });
    navInput.addEventListener('input', e => { closeMega(); renderSug(e.target.value); });
    $$('.js-nav-search').forEach(inp => inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const cursor = $('#navSug button.is-cursor');
      if (cursor && !$('#navSug').hidden && inp === navInput) { cursor.click(); return; }
      if (e.target.value.trim()) applySearch(e.target.value);
    }));
    navInput.addEventListener('keydown', e => {
      if ($('#navSug').hidden) return;
      const items = $$('#navSug button');
      if (!items.length || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      let i = items.findIndex(b => b.classList.contains('is-cursor'));
      i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
      items.forEach(b => b.classList.remove('is-cursor'));
      items[i].classList.add('is-cursor');
    });

    // tìm kiếm
    $('#searchForm').addEventListener('submit', e => {
      e.preventDefault();
      state.dest = $('#fDest').value;
      state.date = $('#fDate').value;
      state.guests = +$('#fGuests').value || 0;
      state.region = 'all'; state.tags = []; state.tagLabel = '';
      $$('#regionChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.region === 'all'));
      renderTours();
      $('#tours').scrollIntoView({ behavior: 'smooth' });
      const n = TOURS.filter(matches).length;
      toast(n ? `Tìm thấy ${n} tour phù hợp.` : 'Không có tour khớp tiêu chí — thử nới điều kiện nhé.');
    });

    // bộ lọc
    $('#regionChips').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      $$('#regionChips .chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      state.region = chip.dataset.region;
      renderTours();
    });
    $('#priceRange').addEventListener('input', e => {
      state.maxPrice = +e.target.value;
      $('#priceLabel').textContent = vnd(state.maxPrice);
      renderTours();
    });
    $('#sortBy').addEventListener('change', e => { state.sort = e.target.value; renderTours(); });
    $('#moreTours').addEventListener('click', () => { shown += PAGE_SIZE; renderTours(true); });

    // bộ lọc của trang chủ đề — cùng `state`, khác đích render
    $('#themeRegionChips').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      $$('#themeRegionChips .chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      state.region = chip.dataset.region;
      renderTheme();
    });
    $('#themePrice').addEventListener('input', e => {
      state.maxPrice = +e.target.value;
      $('#themePriceLabel').textContent = vnd(state.maxPrice);
      renderTheme();
    });
    $('#themeSort').addEventListener('change', e => { state.sort = e.target.value; renderTheme(); });
    /* Lọc ngay từng chữ; nút "Tìm tour ngay" và phím Enter đi qua `submit`.
       preventDefault để trang không tải lại — form không có action. */
    $('#themeQ').addEventListener('input', renderTheme);
    $('#themeSearch').addEventListener('submit', e => { e.preventDefault(); renderTheme(); });
    $('#themeReset').addEventListener('click', () => { resetThemeFilters(); renderTheme(); });
    $('#expHeroQ').addEventListener('input', renderExp);
    window.addEventListener('hashchange', applyRoute);
    /* Mục lục của màn hình chi tiết bám theo cuộn của CHÍNH vùng cuộn trong
       khung, không phải của cửa sổ — nghe trên window thì nó không bao giờ
       bắn, vì trang nền đứng yên khi khung đang mở (body.is-locked). */
    $('#tourModalBody').addEventListener('scroll', syncDetailTabs, { passive: true });
    $('#resetFilters').addEventListener('click', () => {
      state.region = 'all'; state.maxPrice = PRICE_CAP; state.dest = ''; state.date = ''; state.guests = 0;
      state.tags = []; state.tagLabel = '';
      $('#priceRange').value = PRICE_CAP; $('#priceLabel').textContent = vnd(PRICE_CAP);
      $('#fDest').value = ''; $('#fDate').value = ''; $('#fGuests').value = '2';
      $$('.js-nav-search').forEach(i => { i.value = ''; });
      $$('#regionChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.region === 'all'));
      renderTours();
    });

    // click chung: chi tiết / đặt / điểm đến / faq
    document.addEventListener('click', e => {
      const detail = e.target.closest('[data-detail]');
      if (detail) { $('#navSug').hidden = true; closeMega(); openDetail(detail.dataset.detail); return; }

      /* Mục lục của màn hình chi tiết. Thẻ "% khách hài lòng" ở cột phải cũng
         mang data-tab nên bấm vào là nhảy thẳng xuống phần đánh giá. */
      const tab = e.target.closest('[data-tab]');
      if (tab) { gotoDetailSection(tab.dataset.tab); return; }

      const fav = e.target.closest('[data-fav]');
      if (fav) {
        const list = loadFavs();
        const at   = list.indexOf(fav.dataset.fav);
        const on   = at < 0;
        if (on) list.push(fav.dataset.fav); else list.splice(at, 1);
        saveFavs(list);
        fav.classList.toggle('is-on', on);
        fav.setAttribute('aria-pressed', String(on));
        const lab = $('.dbar-label', fav);
        if (lab) lab.textContent = on ? 'Đã thích' : 'Yêu thích';
        toast(on ? 'Đã lưu tour vào danh sách yêu thích.' : 'Đã bỏ tour khỏi danh sách yêu thích.');
        return;
      }

      const share = e.target.closest('[data-share]');
      if (share) { shareTour(share.dataset.share); return; }

      const book = e.target.closest('[data-book]');
      if (book) {
        const openTourModal = $('#tourModal');
        /* Đọc hai ô chọn TRƯỚC khi đóng khung: closeModal chỉ ẩn chứ không
           xoá nội dung, nhưng openDetail lần sau dựng lại từ đầu — đọc sau là
           đọc của tour cũ nếu người dùng mở tour khác ngay sau đó. */
        let pref = null;
        if (!openTourModal.hidden) { pref = detailPicks(); closeModal(openTourModal); }
        openBooking(book.dataset.book, pref);
        return;
      }

      const dest = e.target.closest('[data-q]');
      if (dest) {
        state.dest = dest.dataset.q; state.region = 'all'; state.date = ''; state.guests = 0;
        state.tags = []; state.tagLabel = '';
        $('#fDest').value = TOURS.some(t => t.location === dest.dataset.q) ? dest.dataset.q : '';
        $$('#regionChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.region === 'all'));
        closeMega(); closeDrawer();
        renderTours();
        $('#tours').scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // mega menu: "Tất cả <khu vực>"
      const reg = e.target.closest('[data-region]:not(.chip)');
      if (reg) {
        state.region = reg.dataset.region; state.dest = ''; state.tags = []; state.tagLabel = '';
        state.date = ''; state.guests = 0;
        $$('#regionChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.region === state.region));
        closeMega(); renderTours();
        $('#tours').scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // mega menu: ô chủ đề
      const th = e.target.closest('[data-theme]');
      if (th) { applyTheme(+th.dataset.theme); return; }

      /* Liên kết sang trang trong (điểm đến ở mega menu, chủ đề ở dải chip).
         KHÔNG preventDefault — trình duyệt vẫn đổi hash và applyRoute() vẫn
         chạy như thường. Handler này chỉ lo hai việc mà hash không lo được:
         đóng mega menu ngay lúc bấm, và xử lý trường hợp bấm đúng trang đang
         đứng — hash không đổi thì hashchange không bắn, mega sẽ treo lại. */
      const inner = e.target.closest('a[href^="#chu-de/"], a[href^="#diem-den/"], a[href="#trai-nghiem"]');
      if (inner) {
        closeMega(); closeDrawer();
        if (location.hash === inner.getAttribute('href')) applyRoute();
        return;
      }

      // trang trải nghiệm: hàng chip lọc theo loại
      const ek = e.target.closest('[data-exp-kind]');
      if (ek) {
        expKind = ek.dataset.expKind;
        $$('#expKinds .chip').forEach(c => c.classList.toggle('is-active', c.dataset.expKind === expKind));
        renderExp();
        return;
      }

      const expDiscover = e.target.closest('#expDiscover');
      if (expDiscover) {
        $('#expGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // gợi ý tìm kiếm: xem tất cả kết quả
      const all = e.target.closest('[data-search-all]');
      if (all) { applySearch(all.dataset.searchAll); return; }

      /* Mỗi lúc chỉ một câu mở. Sáu câu mở hết cùng lúc thì cột phải dài gấp
         ba cột trái, người đọc mất luôn cảm giác danh sách này có bao nhiêu
         mục — mà đó mới là thứ họ cần thấy khi lướt qua khối FAQ. */
      const faq = e.target.closest('.faq-q');
      if (faq) {
        const item = faq.closest('.faq-item');
        const willOpen = !item.classList.contains('is-open');
        $$('.faq-item.is-open').forEach(other => { if (other !== item) openFaq(other, false); });
        openFaq(item, willOpen);
        return;
      }

      const dl = e.target.closest('[data-dl]');
      if (dl) {
        const rec = loadBookings().find(r => r.code === dl.dataset.dl);
        if (rec) downloadConfirm(rec);
        return;
      }

      const cancel = e.target.closest('[data-cancel]');
      if (cancel) {
        const code = cancel.dataset.cancel;
        if (confirm('Huỷ đặt chỗ ' + code + '? Thao tác này không thể hoàn tác.')) {
          saveBookings(loadBookings().filter(r => r.code !== code));
          updateBookingCount(); renderMyBookings();
          toast('Đã huỷ đặt chỗ ' + code + '.');
        }
      }
    });

    // đặt chỗ của tôi
    $('#myBookingsBtn').addEventListener('click', () => { renderMyBookings(); openModal('myModal'); });

    // form đặt tour
    $$('[data-step-btn]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.stepBtn;
      bk[k] = Math.max(0, bk[k] + (+b.dataset.delta));
      if (k === 'adults') bk.adults = Math.max(1, bk.adults);
      syncCounters();
      if (bk.coupon && COUPONS[bk.coupon].minGuests && bk.adults + bk.children < COUPONS[bk.coupon].minGuests) {
        bk.coupon = null;
        $('#couponMsg').textContent = 'Mã đã gỡ do không đủ số khách tối thiểu.';
        $('#couponMsg').className = 'hint bad';
      }
      recalc();
    }));
    $('#bSingle').addEventListener('change', e => { bk.single = e.target.checked; recalc(); });
    $('#bDate').addEventListener('change', recalc);
    $('#applyCoupon').addEventListener('click', applyCoupon);
    $('#bCoupon').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } });
    $('#nextStep').addEventListener('click', () => { if (validateStep(bk.step)) gotoStep(bk.step + 1); });
    $('#prevStep').addEventListener('click', () => gotoStep(Math.max(1, bk.step - 1)));
    $('#bookingForm').addEventListener('submit', submitBooking);
    ['bName', 'bPhone', 'bEmail'].forEach(id =>
      $('#' + id).addEventListener('input', e => e.target.classList.remove('is-bad')));

    /* Đăng nhập vẫn là KHUNG NỔI, không phải trang: nó chỉ có hai ô, và người
       ta hay bấm nó giữa chừng một việc khác (đang xem tour, đang đặt) — đẩy
       họ sang một trang khác là mất chỗ đang đứng. Đăng ký thì ngược lại,
       mười dòng biểu mẫu và là việc làm một lần, nên xứng một trang riêng.

       Bấm từ TRONG trang đăng ký thì phải rời trang đó trước: để nguyên thì
       khung đăng nhập nổi lên giữa một trang đăng ký vẫn còn nguyên bên dưới,
       hai lối vào tài khoản cùng hiện một lúc. */
    $$('[data-login]').forEach(b => b.addEventListener('click', () => {
      closeDrawer(); closeMega();
      if (document.body.classList.contains('route-signup')) location.hash = '';
      openModal('loginModal');
    }));
    $('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const em = $('#lgEmail'), pw = $('#lgPass');
      let ok = flag(em, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim()));
      ok = flag(pw, pw.value.length < 6) && ok;
      if (!ok) { toast('Email chưa đúng hoặc mật khẩu dưới 6 ký tự.'); return; }
      closeModal($('#loginModal'));
      toast('Bản demo chưa nối tài khoản thật — bạn vẫn đặt tour bình thường nhé.');
      e.target.reset();
    });

    ['lgEmail', 'lgPass'].forEach(id =>
      $('#' + id).addEventListener('input', e => e.target.classList.remove('is-bad')));

    /* ------------------------ Trang đăng ký -------------------------
       Lối vào là hash #dang-ky (liên kết trong khung đăng nhập + gõ thẳng địa
       chỉ), applyRoute() lo phần bật trang. Ở đây chỉ còn hành vi bên trong
       biểu mẫu.

       Nút "Về trang chủ" trả hash về rỗng thay vì history.back(): người vào
       thẳng #dang-ky từ một địa chỉ dán vào thì không có trang trước để lùi. */
    $$('[data-auth-home]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      location.hash = '';
    }));

    /* Nút con mắt: đổi type của ô nhập chứ không dùng một ô text song song.
       Đổi type giữ nguyên giá trị, con trỏ và cả trình quản lý mật khẩu của
       trình duyệt. */
    $$('[data-pw-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = $('#' + btn.dataset.pwToggle);
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
        btn.querySelector('use').setAttribute('href', show ? '#fi-eye-off' : '#fi-eye');
      });
    });

    /* Ba nút mạng xã hội chưa nối nhà cung cấp nào. Một handler chung đọc
       data-oauth chứ không ba handler riêng: khi nào nối thật thì chỗ cần sửa
       vẫn chỉ là đây. */
    $$('[data-oauth]').forEach(b => b.addEventListener('click', () =>
      toast(`Đăng ký bằng ${b.dataset.oauth} chưa mở trong bản demo — bạn tạo tài khoản bằng email nhé.`)));

    /* Đúng ba điều kiện mà câu gợi ý dưới ô mật khẩu đã hứa: ít nhất 8 ký tự,
       CÓ chữ, CÓ số, CÓ ký tự đặc biệt. Viết rời từng vế thay vì một regex dài
       để còn báo được người dùng thiếu vế nào — một câu "mật khẩu không hợp lệ"
       thì họ phải tự đoán.

       \p{L} chứ không phải [a-zA-Z]: có người đặt mật khẩu bằng chữ có dấu, mà
       "ũ" thì cũng là chữ. Cờ u bắt buộc đi kèm để \p{...} có hiệu lực. */
    const PW_RULES = [
      { test: v => v.length >= 8,        msg: 'Mật khẩu cần ít nhất 8 ký tự.' },
      { test: v => /\p{L}/u.test(v),     msg: 'Mật khẩu cần có ít nhất một chữ cái.' },
      { test: v => /[0-9]/.test(v),      msg: 'Mật khẩu cần có ít nhất một chữ số.' },
      { test: v => /[^\p{L}0-9]/u.test(v), msg: 'Mật khẩu cần có ít nhất một ký tự đặc biệt.' }
    ];
    const pwFail = v => PW_RULES.find(r => !r.test(v));

    $('#signupForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#suName'), email = $('#suEmail'), phone = $('#suPhone'),
            pw = $('#suPass'), pw2 = $('#suPass2'), agree = $('#suAgree');

      /* Đánh dấu HẾT các ô sai rồi mới báo, không dừng ở ô đầu tiên. `&& ok`
         đặt SAU lời gọi flag() để mọi ô đều được chấm — đặt trước thì
         JavaScript nhảy cóc qua phần còn lại ngay khi ok thành false. */
      const pwBad = pwFail(pw.value);

      let ok = true;
      ok = flag(name, name.value.trim().length < 2) && ok;
      ok = flag(email, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) && ok;
      ok = flag(phone, !/^(0|\+84)[0-9][0-9\s.\-]{7,12}$/.test(phone.value.trim())) && ok;
      ok = flag(pw, !!pwBad) && ok;
      ok = flag(pw2, pw2.value !== pw.value || !pw2.value) && ok;

      if (!ok) {
        /* Báo đúng lý do đầu tiên gặp phải, theo thứ tự các ô trên biểu mẫu.
           Một câu chung chung kiểu "có lỗi" thì người dùng phải tự dò. */
        let msg = 'Vui lòng kiểm tra lại thông tin đăng ký.';
        if (name.classList.contains('is-bad'))       msg = 'Họ tên cần ít nhất 2 ký tự.';
        else if (email.classList.contains('is-bad')) msg = 'Email chưa đúng định dạng.';
        else if (phone.classList.contains('is-bad')) msg = 'Số điện thoại chưa đúng.';
        else if (pwBad)                              msg = pwBad.msg;
        else if (pw2.classList.contains('is-bad'))   msg = 'Hai lần nhập mật khẩu chưa khớp.';
        toast(msg);
        return;
      }
      if (!agree.checked) { toast('Bạn cần đồng ý với điều khoản sử dụng để tạo tài khoản.'); return; }

      /* Xong thì rời trang đăng ký về landing. reset() gọi TRƯỚC khi đổi hash:
         đổi hash xong trang đã ẩn, mà reset một biểu mẫu đang display:none thì
         vẫn chạy nhưng chẳng còn ai thấy — gọi trước cho rõ ý là "dọn ô rồi
         mới đi", tránh để lại dữ liệu cũ nếu người dùng quay lại bằng back. */
      const firstName = name.value.trim().split(/\s+/).pop();
      e.target.reset();
      location.hash = '';
      toast(`Chào ${firstName}! Bản demo chưa nối tài khoản thật — bạn vẫn đặt tour bình thường nhé.`);
    });

    ['suName', 'suEmail', 'suPhone', 'suPass', 'suPass2'].forEach(id =>
      $('#' + id).addEventListener('input', e => e.target.classList.remove('is-bad')));

    // nhận bản tin
    $('#subForm').addEventListener('submit', e => {
      e.preventDefault();
      toast('Cảm ơn bạn! Ưu đãi sẽ được gửi tới email đã đăng ký.');
      e.target.reset();
    });
  }

  /* ============ TRANG TRONG · #chu-de/<slug> và #diem-den/<slug> ===========
     Không phải file HTML riêng mà là một màn hình khác trong cùng index.html:
     body.route-theme ẩn toàn bộ landing và bật .theme-page. Đổi lại được dùng
     nguyên tourCard/matches/sortList và cả luồng đặt tour, trong khi URL vẫn
     chia sẻ được và nút back của trình duyệt vẫn chạy đúng.

     MỘT khung dùng cho HAI loại trang. Chủ đề và điểm đến khác nhau đúng ba
     thứ: tiêu đề, ảnh bìa, và lọc theo `tags` hay theo `dest`. Mọi thứ còn
     lại — bộ lọc, lưới thẻ, khoảng trống, luồng đặt tour — giống hệt. Dựng
     thêm một khung thứ hai là chép lại toàn bộ phần giống nhau ấy, rồi sửa
     một bên quên bên kia.

     Bộ lọc dùng chung đối tượng `state` với danh sách dưới landing — hai màn
     không bao giờ hiện cùng lúc nên không tranh nhau; bù lại lúc vào/ra phải
     đặt lại state cho sạch, xem enterRoutePage/exitRoutePage.                */

  /* CHỦ THỂ của trang trong, tách hẳn khỏi bộ lọc. Phân biệt này quan trọng:
     bộ lọc là thứ người xem xoá đi xoá lại, còn chủ thể là lý do trang tồn
     tại — bấm "Xoá bộ lọc" trên trang Đà Nẵng thì phải còn lại Đà Nẵng, chứ
     không phải rơi về toàn bộ tour. Trước đây resetThemeFilters() xoá thẳng
     state.dest nên chỗ này bắt buộc phải tách ra.                           */
  let subject = null;   // { kind: 'theme', i } | { kind: 'dest', loc }

  function applySubject() {
    if (!subject) return;
    if (subject.kind === 'theme') {
      state.tags = THEMES[subject.i].tags;
      state.tagLabel = THEMES[subject.i].label;
      state.dest = '';
    } else {
      state.tags = []; state.tagLabel = '';
      state.dest = subject.loc;
    }
  }

  /** 'Núi & trekking' -> 'nui-trekking'. NFD không tách được 'đ' nên chữa riêng. */
  function slugify(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  const themeHref = i => '#chu-de/' + slugify(THEMES[i].label);
  const destHref  = loc => '#diem-den/' + slugify(loc);

  /* Danh sách điểm đến suy ra TỪ TOURS chứ không khai báo riêng: có tour thì
     mới có trang, xoá tour cuối của một nơi là đường dẫn tới nơi đó tự biến
     mất thay vì dẫn vào một trang rỗng. */
  const ALL_LOCATIONS = [...new Set(TOURS.map(t => t.location))];

  /* Ảnh bìa điểm đến mượn ảnh của chính tour đầu tiên ở đó. Không lập một
     bảng ảnh riêng như THEME_COVER vì bảng ấy phải cập nhật bằng tay mỗi lần
     thêm điểm đến; ở đây thêm tour là có bìa. Rơi về bìa chủ đề đầu nếu tour
     nào ở đó cũng không có ảnh. */
  const destCover = loc =>
    (TOURS.find(t => t.location === loc && t.photo) || {}).photo || THEME_COVER[0];

  // Ảnh bìa từng chủ đề, lấy trong images/ sẵn có — thứ tự khớp mảng THEMES.
  const THEME_COVER = [
    'images/t-lagoon.jpg',    // Biển đảo
    'images/t-sapa.jpg',      // Núi & trekking
    'images/t-heritage.jpg',  // Di sản & văn hoá
    'images/t-tropical.jpg',  // Nghỉ dưỡng
    'images/t-coast.jpg',     // Gia đình
    'images/t-cliff.jpg',     // Cặp đôi
    'images/t-ha-long.jpg',   // Ẩm thực & sông nước
    'images/t-japan.jpg'      // Bay thẳng quốc tế
  ];

  /* ===================== DA BANNER THEO TỪNG CHỦ ĐỀ =====================
     Mỗi chủ đề có thể mang một concept riêng: bảng màu riêng + bộ mẫu 3D
     riêng. Khoá của bảng này là SLUG của chủ đề (xem slugify/themeHref).

     Chủ đề nào KHÔNG có mục ở đây thì rơi về `default`: tông xanh dương và bộ
     mẫu du lịch chung (máy bay, hộ chiếu, vali, đảo, máy ảnh). Nhờ vậy thêm
     concept mới là thêm đúng một mục, không phải sửa gì chỗ khác; và tám chủ
     đề không bắt buộc phải có đủ tám bộ ảnh mới chạy được.

     `dir` là tên thư mục trong images/ — để NGUYÊN dấu tiếng Việt ở đây, hàm
     propSrc() lo phần mã hoá URL. Tên TỆP thì phải không dấu, không dấu cách.

     x / y là TÂM của mẫu, tính theo % của tấm bìa. w là bề rộng ở màn 1440px;
     lúc dựng, hàm sẽ tự kèm một mức vw tương ứng để mẫu co theo khổ màn.

     Hai vùng phải né, đã trả giá mới biết:
       · dải trên cùng — header nổi đè lên đỉnh bìa, y quá nhỏ là mẫu lởn vởn
         sau các mục điều hướng. Giữ mép trên của mẫu dưới mốc ~16%;
       · cột giữa — chỗ của tiêu đề, ô tìm kiếm và dải chủ đề.               */
  const THEME_SKINS = {
    default: {
      dir: 'Biển đảo',
      props: [
        { f: 'air plane.png', x: 20, y: 32, w: 275 },
        { f: 'passport.png',  x:  8, y: 64, w: 170 },
        { f: 'suitcase.png',  x: 77, y: 31, w: 158 },
        { f: 'island.png',    x: 88, y: 58, w: 250 },
        { f: 'camera.png',    x: 94, y: 84, w: 140 }
      ]
    },
    'cap-doi': {
      dir: 'Cặp đôi',
      props: [
        { f: 'champagne.png', x: 12, y: 38, w: 150 },
        { f: 'vali.png',      x:  7, y: 74, w: 205 },
        { f: 'den-long.png',  x: 19, y: 58, w: 118 },
        { f: 'hoa-hong.png',  x: 76, y: 32, w: 165 },
        { f: 'ban-an.png',    x: 88, y: 48, w: 265 },
        /* Máy ảnh phải nằm ngoài mốc ~85%: dải chip trải tới đó, đặt vào trong
           là nó che mất một viên chủ đề — bản đầu nó đè thẳng lên "Cặp đôi". */
        { f: 'may-anh.png',   x: 94, y: 90, w: 148 }
      ]
    },
    /* Thư mục viết hoa chữ T ('Núi & Trekking') trong khi nhãn chủ đề là
       'Núi & trekking' — `dir` phải khớp Ổ ĐĨA, không phải khớp nhãn. */
    'nui-trekking': {
      dir: 'Núi & Trekking',
      props: [
        { f: 'balo.png',   x: 12, y: 38, w: 180 },
        { f: 'giay.png',   x:  9, y: 78, w: 200 },
        { f: 'leu.png',    x: 20, y: 66, w: 150 },
        { f: 'la-ban.png', x: 76, y: 32, w: 145 },
        { f: 'nui.png',    x: 88, y: 47, w: 250 },
        { f: 'gay.png',    x: 95, y: 76, w: 140 }
      ]
    },
    'di-san-van-hoa': {
      dir: 'Di sản và văn hóa',
      props: [
        { f: 'ChatGPT Image 15_14_51 18 thg 8, 2026 (2).png', x:  5, y: 38, w: 112 },
        { f: 'ChatGPT Image 15_14_51 18 thg 8, 2026 (1).png', x: 15, y: 61, w: 230 },
        { f: 'ChatGPT Image 15_14_51 18 thg 8, 2026 (4).png', x:  8, y: 86, w: 176 },
        { f: 'ChatGPT Image 15_14_51 18 thg 8, 2026 (3).png', x: 86, y: 39, w: 225 },
        { f: 'ChatGPT Image 15_14_51 18 thg 8, 2026 (5).png', x: 78, y: 83, w: 154 },
        { f: 'ChatGPT Image 15_14_51 18 thg 8, 2026 (6).png', x: 94, y: 81, w: 142 }
      ]
    },
    'nghi-duong': {
      dir: 'Nghỉ dưỡng',
      props: [
        { f: 'ChatGPT Image 16_35_16 18 thg 8, 2026 (2).png', x:  6, y: 44, w: 150 },
        { f: 'nhà.png',                                          x: 16, y: 65, w: 245 },
        { f: 'ChatGPT Image 16_35_17 18 thg 8, 2026 (4).png', x:  7, y: 86, w:  92 },
        { f: 'ChatGPT Image 16_35_17 18 thg 8, 2026 (3).png', x: 87, y: 42, w: 172 },
        { f: 'ChatGPT Image 16_35_18 18 thg 8, 2026 (5).png', x: 79, y: 86, w: 148 },
        { f: 'ChatGPT Image 16_35_18 18 thg 8, 2026 (6).png', x: 94, y: 80, w: 125 }
      ]
    },
    'gia-dinh': {
      dir: 'Gia đình',
      props: [
        { f: 'ChatGPT Image 16_51_41 18 thg 8, 2026 (1).png', x: 14, y: 55, w: 235 },
        { f: 'ChatGPT Image 16_51_41 18 thg 8, 2026 (2).png', x:  6, y: 84, w: 145 },
        { f: 'ChatGPT Image 16_51_43 18 thg 8, 2026 (5).png', x: 21, y: 88, w: 108 },
        { f: 'ChatGPT Image 16_51_42 18 thg 8, 2026 (4).png', x: 87, y: 39, w: 148 },
        { f: 'ChatGPT Image 16_51_42 18 thg 8, 2026 (3).png', x: 78, y: 80, w: 132 },
        { f: 'ChatGPT Image 16_51_43 18 thg 8, 2026 (6).png', x: 94, y: 84, w: 168 }
      ]
    },
    'am-thuc-song-nuoc': {
      dir: 'Ẩm thực',
      props: [
        { f: 'ChatGPT Image 17_21_50 18 thg 8, 2026 (2).png', x:  6, y: 40, w: 145 },
        { f: 'ChatGPT Image 17_21_50 18 thg 8, 2026 (1).png', x: 15, y: 65, w: 270 },
        { f: 'ChatGPT Image 17_21_51 18 thg 8, 2026 (4).png', x:  8, y: 86, w: 142 },
        { f: 'ChatGPT Image 17_21_51 18 thg 8, 2026 (3).png', x: 88, y: 40, w: 155 },
        { f: 'ChatGPT Image 17_21_51 18 thg 8, 2026 (5).png', x: 78, y: 82, w:  98 },
        { f: 'ChatGPT Image 17_21_52 18 thg 8, 2026 (6).png', x: 94, y: 77, w: 150 }
      ]
    },
    'bay-thang-quoc-te': {
      dir: 'Bay thẳng quốc tế',
      props: [
        { f: '01_passport_boarding_pass.png', x:  6, y: 47, w: 112 },
        { f: '02_airplane.png',               x: 18, y: 31, w: 205 },
        { f: '04_airport_diorama.png',        x: 14, y: 70, w: 245 },
        { f: '03_luggage_tag.png',            x: 94, y: 38, w:  86 },
        { f: '07_globe.png',                  x: 91, y: 72, w: 138 },
        { f: '06_camera.png',                 x: 78, y: 84, w: 128 }
      ]
    }
  };

  /* Mã hoá từng đoạn đường dẫn: thư mục có dấu tiếng Việt, và tên tệp thì có
     thể có dấu cách ("air plane.png"). encodeURIComponent chạy trên TỪNG đoạn
     chứ không trên cả chuỗi — chạy cả chuỗi thì dấu "/" cũng bị mã hoá thành
     %2F và đường dẫn hết là đường dẫn. */
  const propSrc = (dir, file) => 'images/' + encodeURIComponent(dir) + '/' + encodeURIComponent(file);

  function animateThemeProps(slug) {
    if (!['bien-dao', 'cap-doi', 'nui-trekking', 'di-san-van-hoa', 'nghi-duong', 'gia-dinh', 'am-thuc-song-nuoc', 'bay-thang-quoc-te'].includes(slug) || !window.gsap ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const props = $$('#themePage .theme-props img');
    props.forEach((img, i) => {
      gsap.killTweensOf(img);
      gsap.set(img, { '--float-y': '0px', '--float-r': '0deg' });
      gsap.to(img, {
        '--float-y': `${i % 2 ? -9 : 9}px`,
        '--float-r': `${i % 2 ? .8 : -.8}deg`,
        duration: 2.8 + i * .22,
        delay: i * .14,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });
    });
  }

  function renderThemeProps(slug) {
    const skin = THEME_SKINS[slug] || THEME_SKINS.default;
    $('#themePage').dataset.skin = THEME_SKINS[slug] ? slug : 'default';
    $('#themePage .theme-props').innerHTML = skin.props.map(p =>
      /* w kèm một mức vw cùng tỉ lệ (w/1440) để mẫu co theo khổ màn; xem chú
         thích ở .theme-clouds img trong style.css, cùng một cách làm. */
      `<img src="${propSrc(skin.dir, p.f)}" alt=""
            style="left:${p.x}%;top:${p.y}%;width:min(${p.w}px, ${(p.w / 14.4).toFixed(1)}vw)">`
    ).join('');

    requestAnimationFrame(() => animateThemeProps(slug));
    if (!window.gsap) {
      window.addEventListener('load', () => {
        if ($('#themePage').dataset.skin === slug) animateThemeProps(slug);
      }, { once: true });
    }
  }

  function renderThemeRail() {
    $('#themeRail').innerHTML = THEMES.map((th, i) =>
      `<a class="chip" href="${themeHref(i)}">${th.icon} ${esc(th.label)}</a>`).join('');
  }

  /* Từ khoá đọc THẲNG từ ô nhập mỗi lần dựng, chứ không ghi vào `state`.

     Hai lý do. Một: nhờ vậy mọi lối gọi renderTheme() khác — đổi chip khu vực,
     kéo ngân sách, đổi sắp xếp — đều tự động tôn trọng từ khoá đang gõ, không
     phải nhớ truyền kèm. Hai, và mới là lý do chính: chỗ tự nhiên nhất để cất
     từ khoá là state.dest, nhưng TRANG ĐIỂM ĐẾN đang dùng đúng trường ấy làm
     chủ thể của trang (xem applySubject) — ghi đè lên là gõ một chữ vào ô tìm
     kiếm thì trang tự nhảy sang điểm đến khác.                              */
  function themeQuery() {
    const el = $('#themeQ');
    return el ? el.value.trim().toLowerCase() : '';
  }

  function renderTheme() {
    const q = themeQuery();
    const hit = t => (t.name + ' ' + t.location + ' ' + t.summary + ' ' + t.tags.join(' '))
      .toLowerCase().includes(q);
    const list = sortList(TOURS.filter(t => matches(t) && (!q || hit(t))));
    $('#themeGrid').innerHTML = list.map(tourCard).join('');
    $('#themeEmpty').hidden = list.length > 0;
    $('#themeEmpty h3').textContent = subject && subject.kind === 'dest'
      ? 'Điểm đến này chưa có tour khớp bộ lọc'
      : 'Chủ đề này chưa có tour khớp bộ lọc';
    $('#themeCount').textContent = list.length
      ? `${list.length} tour đang mở bán`
      : 'Chưa có tour nào khớp bộ lọc';
    $$('#themeGrid .tour-card').forEach(watch);
  }

  /** Đưa bộ lọc của trang trong về mặc định — chủ thể của trang thì giữ nguyên */
  function resetThemeFilters() {
    state.region = 'all'; state.maxPrice = PRICE_CAP;
    state.date = ''; state.guests = 0;
    applySubject();
    $('#themePrice').value = PRICE_CAP;
    $('#themePriceLabel').textContent = vnd(PRICE_CAP);
    $('#themeSort').value = state.sort;
    /* Ô tìm kiếm cũng là một bộ lọc, nên "Xoá bộ lọc" phải xoá nó. Hàm này còn
       chạy mỗi lần vào trang (enterRoutePage), nhờ đó đổi sang chủ đề khác thì
       từ khoá cũ không dính theo. */
    $('#themeQ').value = '';
    $$('#themeRegionChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.region === 'all'));
  }

  /** Phần giống nhau của hai loại trang trong. Gọi sau khi đã đặt `subject`. */
  function enterRoutePage(opt) {
    resetThemeFilters();

    const cover = $('#themeCover');
    cover.src = opt.cover;
    cover.alt = opt.coverAlt;
    $('#themeTitle').textContent = opt.title;
    /* Trang điểm đến truyền slug rỗng nên luôn rơi về da mặc định: nó không
       thuộc chủ đề nào, mượn concept của một chủ đề bất kỳ là sai lệch. */
    renderThemeProps(opt.skin || '');
    // railIndex < 0 (trang điểm đến) thì mọi chip đều tắt sáng
    $$('#themeRail .chip').forEach((a, k) => a.classList.toggle('is-active', k === opt.railIndex));
    /* Trang điểm đến ẩn hàng chip khu vực: một điểm đến chỉ thuộc ĐÚNG một
       khu vực, nên ba lựa chọn còn lại luôn cho ra danh sách rỗng. Bày ra một
       bộ lọc mà bấm vào là mất sạch kết quả thì tệ hơn là không có nó. */
    $('#themePage').classList.toggle('is-dest', subject && subject.kind === 'dest');

    setScreen('theme');
    document.title = opt.title + ' — Vivu Travel';
    renderTheme();
    closeMega(); closeDrawer();
    scrollPageToTop();
    syncHeaderBg();
  }

  function enterTheme(i) {
    subject = { kind: 'theme', i };
    enterRoutePage({
      title: THEMES[i].label,
      cover: THEME_COVER[i] || THEME_COVER[0],
      // Chỉ chữ, không kèm icon: ở cỡ ~4rem nhiều emoji rơi về glyph đơn sắc
      // (⛰ thành tam giác đặc, 🏝 thành ô vuông) trông rất thô. Icon giữ ở chip.
      coverAlt: 'Ảnh bìa chủ đề ' + THEMES[i].label,
      railIndex: i,
      skin: slugify(THEMES[i].label)
    });
  }

  function enterDest(loc) {
    subject = { kind: 'dest', loc };
    enterRoutePage({
      title: loc,
      cover: destCover(loc),
      coverAlt: 'Ảnh điểm đến ' + loc,
      railIndex: -1
    });
  }

  /* ======================= TRANG CẨM NANG · #cam-nang ======================= */
  const GUIDE_ARTICLES = [
    { kind: 'Điểm đến', title: 'Hạ Long: đi mùa nào để trời trong, vịnh lặng?', sum: 'Gợi ý thời tiết, lịch trình 3 ngày và những góc ngắm vịnh đẹp nhưng không quá đông.', photo: 'images/t-ha-long.jpg', read: 6, href: '#chu-de/bien-dao' },
    { kind: 'Lịch trình', title: '48 giờ ở Seoul cho người lần đầu đến Hàn Quốc', sum: 'Một lịch trình vừa đủ từ cung điện, phố cổ đến khu mua sắm về đêm.', photo: 'images/t-city-night.jpg', read: 8, href: '#diem-den/seoul-gyeonggi' },
    { kind: 'Kinh nghiệm', title: 'Checklist hành lý gọn nhẹ cho chuyến đi 5 ngày', sum: 'Cách chọn đồ, xếp vali và những món thật sự cần mang theo.', photo: 'images/t-coast.jpg', read: 5, href: '#chu-de/bay-thang-quoc-te' },
    { kind: 'Ẩm thực', title: 'Ăn gì trên hành trình miền sông nước?', sum: 'Những món nên thử, khung giờ chợ nổi và vài phép lịch sự trên bàn ăn miền Tây.', photo: 'images/t-lagoon.jpg', read: 7, href: '#chu-de/am-thuc-song-nuoc' },
    { kind: 'Văn hoá', title: 'Nhật Bản mùa hoa: những điều nhỏ cần biết', sum: 'Từ nghi thức ở đền, cách đi tàu đến văn hoá xếp hàng và giữ yên lặng.', photo: 'images/t-japan.jpg', read: 9, href: '#diem-den/tokyo-kyoto-osaka' },
    { kind: 'Gia đình', title: 'Đi biển cùng trẻ nhỏ: chuẩn bị sao cho nhàn?', sum: 'Chọn giờ bay, khách sạn và hoạt động để cả nhà đều có một kỳ nghỉ đúng nghĩa.', photo: 'images/t-tropical.jpg', read: 6, href: '#chu-de/gia-dinh' },
    { kind: 'Kinh nghiệm', title: 'Trekking Sa Pa: bắt đầu từ cung đường nào?', sum: 'Độ khó, giày dép, thời tiết và nguyên tắc an toàn cho người mới leo núi.', photo: 'images/t-sapa.jpg', read: 7, href: '#chu-de/nui-trekking' },
    { kind: 'Lịch trình', title: 'Bangkok 4 ngày: chùa cổ, chợ đêm và sông Chao Phraya', sum: 'Lịch trình cân bằng giữa những điểm phải đến và khoảng nghỉ thong thả.', photo: 'images/t-bangkok.jpg', read: 8, href: '#diem-den/bangkok-pattaya' },
    { kind: 'Điểm đến', title: 'Phú Quốc ngoài mùa cao điểm có gì đẹp?', sum: 'Những bãi biển yên tĩnh, giờ ngắm hoàng hôn và trải nghiệm đáng thử.', photo: 'images/t-phu-quoc.jpg', read: 5, href: '#chu-de/bien-dao' }
  ];
  const GUIDE_KINDS = [...new Set(GUIDE_ARTICLES.map(x => x.kind))];
  let guideKind = 'all';

  function guideCard(x) {
    return `<article class="guide-card">
      <div class="guide-card-media"><img src="${esc(x.photo)}" alt="${esc(x.title)}" loading="lazy"><span class="guide-card-kind">${esc(x.kind)}</span></div>
      <div class="guide-card-in"><p class="guide-card-meta">${x.read} phút đọc · Vivu Editorial</p><h3>${esc(x.title)}</h3><p>${esc(x.sum)}</p><a href="${x.href}">Đọc cẩm nang →</a></div>
    </article>`;
  }

  function renderGuide() {
    const q = slugify($('#guideQ').value.trim());
    const list = GUIDE_ARTICLES.filter(x =>
      (guideKind === 'all' || x.kind === guideKind) &&
      (!q || slugify(`${x.title} ${x.sum} ${x.kind}`).includes(q))
    );
    $('#guideKinds').innerHTML = [['all', 'Tất cả'], ...GUIDE_KINDS.map(k => [k, k])]
      .map(([v, label]) => `<button class="chip${v === guideKind ? ' is-active' : ''}" data-guide-kind="${esc(v)}">${esc(label)}</button>`).join('');
    $('#guideGrid').innerHTML = list.map(guideCard).join('');
    $('#guideCount').textContent = `${list.length} bài viết`;
    $('#guideEmpty').hidden = list.length > 0;
  }

  let guideMotionTweens = [];
  let guideGsapLoadBound = false;

  function initGuideMotion() {
    guideMotionTweens.forEach(t => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
    guideMotionTweens = [];

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const gs = window.gsap;
    const ST = window.ScrollTrigger;
    if (!gs || !ST) {
      if (!guideGsapLoadBound) {
        guideGsapLoadBound = true;
        window.addEventListener('load', () => {
          if (document.body.classList.contains('route-guide')) initGuideMotion();
        }, { once: true });
      }
      return;
    }
    gs.registerPlugin(ST);

    const intro = gs.timeline({ defaults: { ease: 'power3.out' } });
    intro.fromTo('.guide-banner-bg', { scale: 1.06, opacity: .55 }, { scale: 1, opacity: 1, duration: 1.5, ease: 'power2.out' });
    intro.fromTo('.guide-hero .kicker, .guide-hero h1, .guide-hero-lede, .guide-search',
      { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .1, clearProps: 'transform,opacity' }, '-=1');
    intro.fromTo('.guide-hero-cards img',
      { y: 55, opacity: 0, scale: .92 }, { y: 0, opacity: 1, scale: 1, duration: 1, stagger: .12, clearProps: 'transform,opacity', ease: 'power3.out' }, '-=.65');
    guideMotionTweens.push(intro);

    const groups = [
      ['.guide-topics', '.guide-topic'],
      ['.guide-feature', '.guide-feature-media, .guide-feature-copy'],
      ['.guide-library', '.guide-section-head, .guide-chips, .guide-card'],
      ['.guide-tools', '.guide-mini-head, .guide-tool-grid > a'],
      ['.guide-newsletter', '.guide-newsletter > *']
    ];
    groups.forEach(([trigger, targets]) => {
      const tween = gs.fromTo(targets,
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, duration: .9, stagger: .09, ease: 'power3.out', clearProps: 'transform,opacity',
          scrollTrigger: { trigger, start: 'top 82%', once: true } });
      guideMotionTweens.push(tween);
    });

    const panorama = gs.fromTo('.guide-panorama > div', { x: -55, opacity: 0 }, {
      x: 0, opacity: 1, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.guide-panorama', start: 'top 78%', once: true }
    });
    const parallax = gs.fromTo('.guide-panorama > img', { yPercent: -5 }, {
      yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.guide-panorama', start: 'top bottom', end: 'bottom top', scrub: .8 }
    });
    guideMotionTweens.push(panorama, parallax);
    ST.refresh();
  }

  function enterGuide() {
    subject = null; guideKind = 'all';
    setScreen('guide');
    $('#guideQ').value = '';
    renderGuide();
    document.title = 'Cẩm nang du lịch — Vivu Travel';
    closeMega(); closeDrawer(); scrollPageToTop(); syncHeaderBg();
    requestAnimationFrame(initGuideMotion);
  }

  function initGuide() {
    $('#guideJump').addEventListener('click', () => $('#guideLibraryTitle').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    $('#guideKinds').addEventListener('click', e => {
      const btn = e.target.closest('[data-guide-kind]');
      if (!btn) return; guideKind = btn.dataset.guideKind; renderGuide();
    });
    $('#guideQ').addEventListener('input', renderGuide);
    $('#guideSearch').addEventListener('submit', e => { e.preventDefault(); renderGuide(); $('#guideGrid').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  /* ================= BÀI VIẾT TƯƠNG TÁC · ĐẠI NỘI HUẾ ================= */
  const HUE_BUILDINGS = [
    { name: 'Đại Nội Huế', photo: 'images/Khám phá huế/Đại nội Huế.png', x: 50, y: 55, text: 'Trung tâm của Quần thể Di tích Cố đô Huế, gồm Hoàng thành và Tử Cấm Thành. Không gian được tổ chức theo trục nghi lễ, kết nối những cung điện, miếu thờ và khu sinh hoạt của hoàng gia triều Nguyễn.' },
    { name: 'Điện Thái Hòa', photo: 'images/Khám phá huế/Điện thái hòa.png', x: 51, y: 44, text: 'Trung tâm quyền lực của Hoàng thành, nơi diễn ra những đại lễ quan trọng và các buổi thiết triều dưới triều Nguyễn. Không gian nổi bật với hệ cột sơn son thếp vàng cùng biểu tượng rồng.' },
    { name: 'Điện Cần Chánh', photo: 'images/Khám phá huế/Điện cần chánh.png', x: 52, y: 47, text: 'Nằm phía sau Điện Thái Hòa, đây từng là nơi nhà vua làm việc thường ngày, tiếp các quan và sứ bộ. Công trình giữ vị trí quan trọng trên trục thần đạo của Tử Cấm Thành.' },
    { name: 'Điện Càn Thành', photo: 'images/Khám phá huế/Điện Càn Thành.png', x: 49, y: 47, text: 'Từng là nơi ở của hoàng đế trong Tử Cấm Thành. Điện nằm giữa một không gian khép kín, thể hiện rõ trật tự và quy tắc nghiêm ngặt của đời sống cung đình.' },
    { name: 'Cung Khôn Thái', photo: 'images/Khám phá huế/Cung khôn thái.png', x: 52, y: 45, text: 'Không gian gắn với đời sống của hoàng quý phi và các phi tần. Kiến trúc mềm mại hơn khu thiết triều nhưng vẫn tuân theo sự cân xứng đặc trưng của quy hoạch cung đình.' },
    { name: 'Hiển Lâm Các', photo: 'images/Khám phá huế/Hiển Lâm Các.png', x: 51, y: 38, text: 'Công trình cao tầng nổi bật trong khu Thế Miếu, được dựng để ghi nhớ công lao của các vị vua và đại thần triều Nguyễn. Đây cũng là một điểm nhấn giàu tính biểu tượng của Đại Nội.' },
    { name: 'Thế Tổ Miếu', photo: 'images/Khám phá huế/Thế Tổ Miếu.png', x: 50, y: 46, text: 'Nơi thờ các vị hoàng đế triều Nguyễn, mang không khí trang nghiêm và trầm mặc. Khoảng sân rộng, mái ngói cùng các án thờ tạo nên một không gian tưởng niệm có chiều sâu.' },
    { name: 'Thái Bình Lâu', photo: 'images/Khám phá huế/Thái Bình Lâu.png', x: 48, y: 43, text: 'Thư lâu của hoàng đế, nơi đọc sách, nghỉ ngơi và thưởng ngoạn. Công trình gây ấn tượng bởi nghệ thuật khảm sành sứ cùng những mảng trang trí thanh nhã.' },
    { name: 'Duyệt Thị Đường', photo: 'images/Khám phá huế/Duyệt Thị Đường.png', x: 50, y: 46, text: 'Nhà hát cung đình dành cho vua, hoàng gia và các quan thưởng thức tuồng. Đây là một trong những sân khấu cổ có giá trị đặc biệt trong lịch sử nghệ thuật biểu diễn Việt Nam.' },
    { name: 'Điện Kiến Trung', photo: 'images/Khám phá huế/Điện kiến trung.png', x: 50, y: 43, text: 'Một dấu ấn giao thoa giữa mỹ thuật truyền thống Việt Nam và kiến trúc phương Tây. Công trình nằm ở điểm cuối trục xuyên tâm Tử Cấm Thành, từng là nơi sinh hoạt của hai vị vua cuối triều Nguyễn.' }
  ];

  function renderHueBuildings() {
    $('#hueBuildingGrid').innerHTML = HUE_BUILDINGS.map((x, i) => {
      const id = 'cong-trinh-' + slugify(x.name);
      return `<section class="hue-article-section" id="${id}">
        <p class="hue-article-no">${String(i + 1).padStart(2, '0')} / ${String(HUE_BUILDINGS.length).padStart(2, '0')}</p>
        <h2>${esc(x.name)}</h2>
        <figure><img src="${esc(x.photo)}" alt="${esc(x.name)}" loading="lazy" /><figcaption>${esc(x.name)} trong quần thể Đại Nội Huế.</figcaption></figure>
        <p>${esc(x.text)}</p>
        <p>Đi chậm qua không gian này, những chi tiết về mái ngói, hệ cột, sân chầu và trục nhìn dần hiện rõ. Chính sự cân bằng giữa công trình, khoảng trống và cảnh quan tạo nên nhịp điệu riêng của kiến trúc cung đình Huế.</p>
      </section>`;
    }).join('');

    $('#hueArticleToc').innerHTML = HUE_BUILDINGS.map((x, i) =>
      `<a href="#cong-trinh-${slugify(x.name)}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(x.name)}</a>`
    ).join('');
  }

  let hueStoryMotion = [];
  let hueGsapLoadBound = false;
  function initHueStoryMotion() {
    hueStoryMotion.forEach(t => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
    hueStoryMotion = [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const first = $('.hue-building');
      if (first) { first.style.visibility = 'visible'; first.style.opacity = '1'; first.style.pointerEvents = 'auto'; }
      return;
    }
    const gs = window.gsap, ST = window.ScrollTrigger;
    if (!gs || !ST) {
      if (!hueGsapLoadBound) {
        hueGsapLoadBound = true;
        window.addEventListener('load', () => {
          if (document.body.classList.contains('route-hue')) initHueStoryMotion();
        }, { once: true });
      }
      return;
    }
    gs.registerPlugin(ST);
    const intro = gs.timeline({ defaults: { ease: 'power3.out' } });
    intro.fromTo('.hue-story-bg', { scale: 1.16 }, { scale: 1, duration: 1.7, ease: 'power2.inOut' });
    intro.fromTo('.hue-story-gate', { xPercent: -50, yPercent: 16, scale: 1.18 }, { xPercent: -50, yPercent: 0, scale: 1, duration: 1.55, ease: 'power2.inOut' }, 0);
    intro.fromTo('.hue-story-wing--left', { xPercent: 58, scale: 1.1 }, { xPercent: 0, scale: 1, duration: 1.45, ease: 'power2.inOut' }, 0);
    intro.fromTo('.hue-story-wing--right', { xPercent: -58, scale: 1.1 }, { xPercent: 0, scale: 1, duration: 1.45, ease: 'power2.inOut' }, 0);
    intro.fromTo('.hue-story-cloud--one', { xPercent: 45, opacity: 0 }, { xPercent: 0, opacity: .62, duration: 1.3 }, .15);
    intro.fromTo('.hue-story-cloud--two', { xPercent: -45, opacity: 0 }, { xPercent: 0, opacity: .62, duration: 1.3 }, .15);
    intro.from('.hue-extra-clouds img', { y: 22, opacity: 0, scale: .82, duration: 1, stagger: .08, clearProps: 'opacity,scale', ease: 'power3.out' }, .35);
    intro.fromTo('.hue-story-copy .kicker, .hue-story-copy h1, .hue-story-copy > p, .hue-scroll-cue', { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: .85, stagger: .1 }, .75);
    hueStoryMotion.push(intro);

    const decorDrift = [
      gs.to('.hue-story-wing--left', { y: -10, rotation: -.7, duration: 5.2, delay: 1.7, repeat: -1, yoyo: true, ease: 'sine.inOut' }),
      gs.to('.hue-story-wing--right', { y: 11, rotation: .7, duration: 5.8, delay: 1.7, repeat: -1, yoyo: true, ease: 'sine.inOut' }),
      gs.to('.hue-story-cloud--one', { y: 9, duration: 4.8, delay: 1.7, repeat: -1, yoyo: true, ease: 'sine.inOut' }),
      gs.to('.hue-story-cloud--two', { y: -9, duration: 5.5, delay: 1.7, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    ];
    $$('.hue-extra-clouds img').forEach((cloud, i) => {
      decorDrift.push(gs.to(cloud, {
        y: i % 2 ? -8 : 8, x: i % 2 ? 5 : -5, duration: 5 + i * .55,
        delay: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut'
      }));
    });
    hueStoryMotion.push(...decorDrift);

    const heroParallax = gs.to('.hue-story-bg', {
      yPercent: 7, scale: 1.06, ease: 'none',
      scrollTrigger: { trigger: '.hue-story-hero', start: 'top top', end: 'bottom top', scrub: .8 }
    });
    const gateParallax = gs.to('.hue-story-gate', {
      yPercent: 8, scale: 1.045, ease: 'none',
      scrollTrigger: { trigger: '.hue-story-hero', start: 'top top', end: 'bottom top', scrub: .8 }
    });
    hueStoryMotion.push(heroParallax, gateParallax);

    $$('.hue-article-section').forEach((section, i) => {
      const revealSection = gs.fromTo(section,
        { y: 55, opacity: 0 },
        { y: 0, opacity: 1, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity',
          scrollTrigger: { trigger: section, start: 'top 82%', once: true } });
      const revealImage = gs.fromTo($('img', section),
        { scale: 1.05 },
        { scale: 1, duration: 1.25, ease: 'power2.out',
          scrollTrigger: { trigger: section, start: 'top 82%', once: true } });
      hueStoryMotion.push(revealSection, revealImage);
    });
    ST.refresh();
  }

  function enterHueStory() {
    subject = null;
    setScreen('hue');
    renderHueBuildings();
    document.title = 'Khám phá Đại Nội Huế — Vivu Travel';
    closeMega(); closeDrawer(); scrollPageToTop(); syncHeaderBg();
    requestAnimationFrame(initHueStoryMotion);
  }

  function initHueStory() {
    $('#hueStartReading').addEventListener('click', () =>
      $('.hue-article-shell').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    $('#hueArticleToc').addEventListener('click', e => {
      const link = e.target.closest('a[href^="#cong-trinh-"]');
      if (!link) return;
      e.preventDefault();
      const section = $(link.getAttribute('href'));
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* Công tắc màn hình. Đi qua MỘT hàm để hai class không bao giờ cùng bật —
     bật cả hai thì cả hai trang trong cùng hiện, mà quy tắc ẩn landing của
     chúng lại ẩn lẫn nhau, ra một trang trắng không rõ vì sao. */
  function setScreen(name) {   // 'theme' | 'exp' | 'guide' | 'hue' | 'signup' | null
    document.body.classList.toggle('route-theme', name === 'theme');
    document.body.classList.toggle('route-exp', name === 'exp');
    document.body.classList.toggle('route-guide', name === 'guide');
    document.body.classList.toggle('route-hue', name === 'hue');
    document.body.classList.toggle('route-signup', name === 'signup');
  }

  /** Mỗi màn trong hoạt động như một trang riêng, nên khi đổi màn phải bắt đầu
      ngay tại hero. Tạm tắt scroll-behavior:smooth để không nhìn thấy trang mới
      ở vị trí cuộn cũ trong lúc trình duyệt đang chạy animation về đầu trang. */
  let scrollResetFrame = 0;
  let scrollResetPrevious = '';
  function scrollPageToTop() {
    const root = document.documentElement;
    const lenis = window.vivuLenis;
    if (!scrollResetFrame) scrollResetPrevious = root.style.scrollBehavior;
    cancelAnimationFrame(scrollResetFrame);
    root.style.scrollBehavior = 'auto';

    /* Lenis giữ riêng animatedScroll/targetScroll. Chỉ gọi window.scrollTo()
       khiến target cũ còn sống thêm một vài frame; khi route mới ngắn hơn,
       người xem sẽ thoáng thấy footer hoặc khoảng trắng của page mới rồi mới
       bị kéo lên đầu. Dừng engine, đo lại chiều cao và reset cả hai trạng thái
       trước khi trình duyệt có cơ hội paint. */
    if (lenis) {
      lenis.stop();
      lenis.resize();
      lenis.scrollTo(0, { immediate: true, force: true });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    /* Hash navigation và ScrollTrigger có thể đo/khôi phục vị trí sau khi
       handler đổi route đã chạy. Giữ chế độ cuộn tức thời qua hai lượt layout
       và chốt lại top sau khi màn mới cùng animation đã được khởi tạo. */
    scrollResetFrame = requestAnimationFrame(() => {
      if (lenis) {
        lenis.resize();
        lenis.scrollTo(0, { immediate: true, force: true });
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      scrollResetFrame = requestAnimationFrame(() => {
        if (lenis) {
          lenis.resize();
          lenis.scrollTo(0, { immediate: true, force: true });
          lenis.start();
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        root.style.scrollBehavior = scrollResetPrevious;
        scrollResetFrame = 0;
      });
    });
  }
  const onInnerPage = () =>
    document.body.classList.contains('route-theme') ||
    document.body.classList.contains('route-exp') ||
    document.body.classList.contains('route-guide') ||
    document.body.classList.contains('route-hue') ||
    document.body.classList.contains('route-signup');

  function exitRoutePage() {
    if (!onInnerPage()) return;
    subject = null;
    setScreen(null);
    $('#themePage').classList.remove('is-dest');
    document.title = 'Vivu Travel — Đặt tour du lịch trong nước & quốc tế';
    // Trả bộ lọc về mặc định, nếu không danh sách dưới landing bị kẹt theo trang vừa rời
    state.tags = []; state.tagLabel = '';
    state.region = 'all'; state.maxPrice = PRICE_CAP;
    state.dest = ''; state.date = ''; state.guests = 0;
    $('#priceRange').value = PRICE_CAP;
    $('#priceLabel').textContent = vnd(PRICE_CAP);
    $$('#regionChips .chip').forEach(c => c.classList.toggle('is-active', c.dataset.region === 'all'));
    renderTours();
    scrollPageToTop();
    syncHeaderBg();
  }

  /* ================= TRANG TRẢI NGHIỆM · route #trai-nghiem ================
     Danh sách hoạt động lẻ trong ngày. Không dùng chung khung với hai trang
     trên: thẻ khác, bộ lọc khác, và không có luồng đặt tại chỗ (xem ghi chú
     ở EXPERIENCES trong data.js).                                           */

  let expKind = 'all';

  /* Danh sách loại lấy TỪ dữ liệu, không viết tay: thêm một `kind` mới trong
     data.js là chip tự có thêm mục. Viết tay thì sẽ có ngày dữ liệu có loại
     mà hàng chip không có, những mục ấy không bao giờ lọc ra được. */
  const EXP_KINDS = [...new Set(EXPERIENCES.map(x => x.kind))];
  const EXP_FILTERS = [
    ['all', 'Tất cả'],
    ['mountain', 'Núi & khám phá'],
    ['sea', 'Biển & hải đảo'],
    ['river', 'Sông nước'],
    ['culture', 'Văn hoá & di sản'],
    ['food', 'Ẩm thực'],
    ['night', 'Thành phố về đêm']
  ];
  const EXP_CARD_COPY = {
    'san-may-fansipan': ['Săn mây Tà Xùa', 'Sơn La', '2 ngày 1 đêm'],
    'san-ho-hon-thom': ['Chạm vào biển xanh', 'Phú Quốc', '3 ngày 2 đêm'],
    'da-nang-dem': ['Đêm phố Hội', 'Hội An', '2 ngày 1 đêm']
  };

  function matchesExpKind(x) {
    if (expKind === 'all') return true;
    if (expKind === 'mountain') return x.kind === 'Đường núi' || x.kind === 'Trên cao';
    if (expKind === 'sea') return x.id === 'san-ho-hon-thom';
    if (expKind === 'river') return x.id === 'kayak-ha-long' || x.id === 'cho-noi-cai-rang';
    if (expKind === 'culture') return x.kind === 'Văn hoá';
    if (expKind === 'food') return x.kind === 'Ăn uống';
    if (expKind === 'night') return x.kind === 'Về đêm';
    return true;
  }

  function expCard(x) {
    const copy = EXP_CARD_COPY[x.id] || [x.title, x.loc, x.dur || `${x.read || 6} phút đọc`];
    return `
      <article class="exp-card">
        <div class="exp-media">
          <img src="${esc(x.photo)}" alt="${esc(x.title)}" loading="lazy" />
        </div>
        <div class="exp-in">
          <p class="exp-loc">${esc(copy[1])}</p>
          <h3 class="exp-title">${esc(copy[0])}</h3>
          <div class="exp-foot">
            <p class="exp-author">◷&nbsp; ${esc(copy[2])}</p>
            <a class="btn btn--ghost btn--sm" href="${x.id === 'kham-pha-dai-noi-hue' ? '#bai-viet/dai-noi-hue' : '#cam-nang'}">Đọc bài viết →</a>
          </div>
        </div>
      </article>`;
  }

  function renderExpKinds() {
    $('#expKinds').innerHTML =
      EXP_FILTERS
        .map(([v, label]) =>
          `<button class="chip${v === expKind ? ' is-active' : ''}" data-exp-kind="${esc(v)}">${esc(label)}</button>`)
        .join('');
  }

  function renderExp() {
    const q = slugify($('#expHeroQ').value.trim());
    const priority = ['kham-pha-dai-noi-hue', 'san-may-fansipan', 'san-ho-hon-thom', 'da-nang-dem'];
    const source = expKind === 'all'
      ? [...EXPERIENCES].sort((a, b) => {
          const ai = priority.indexOf(a.id), bi = priority.indexOf(b.id);
          return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        })
      : EXPERIENCES;
    const list = source.filter(x =>
      matchesExpKind(x) &&
      (!q || slugify(`${x.title} ${x.kind} ${x.loc} ${x.sum}`).includes(q))
    ).slice(0, 9);
    $('#expGrid').innerHTML = list.map(expCard).join('');
    $('#expCount').textContent = `${list.length} bài viết`;
    $$('#expGrid .exp-card').forEach(watch);
  }

  let expHeroMotion = [];
  let expGsapLoadBound = false;

  function initExpHeroMotion() {
    expHeroMotion.forEach(t => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
    expHeroMotion = [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const gs = window.gsap;
    const ST = window.ScrollTrigger;
    if (!gs || !ST) {
      if (!expGsapLoadBound) {
        expGsapLoadBound = true;
        window.addEventListener('load', () => {
          if (document.body.classList.contains('route-exp')) initExpHeroMotion();
        }, { once: true });
      }
      return;
    }
    gs.registerPlugin(ST);

    const intro = gs.timeline({ defaults: { ease: 'power3.out' } });
    intro.fromTo('.exp-hero-bg', { scale: 1.06, opacity: .55 },
      { scale: 1, opacity: 1, duration: 1.7, ease: 'power2.out' });
    intro.fromTo('.exp-head-copy .kicker, .exp-head-copy .title, .exp-head-copy .lede, .exp-hero-search',
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: .85, stagger: .1, clearProps: 'opacity', ease: 'power3.out' }, .35);
    expHeroMotion.push(intro);

    const backgroundParallax = gs.to('.exp-hero-bg', {
      yPercent: 2, scale: 1.01, ease: 'none',
      scrollTrigger: { trigger: '.exp-head', start: 'top top', end: 'bottom top', scrub: .8 }
    });
    const copyExit = gs.to('.exp-head-copy', {
      y: -70, opacity: .2, ease: 'none',
      scrollTrigger: { trigger: '.exp-head', start: '45% top', end: 'bottom top', scrub: .8 }
    });
    expHeroMotion.push(backgroundParallax, copyExit);
    ST.refresh();
  }

  function enterExp() {
    /* Về mặc định mỗi lần vào. Giữ lại lựa chọn cũ thì người quay lại từ một
       trang khác sẽ thấy danh sách đã bị lọc sẵn mà không nhớ vì sao. */
    expKind = 'all';
    subject = null;

    /* Bật màn hình TRƯỚC khi dựng thẻ. Thẻ hiện dần nhờ IntersectionObserver,
       mà quan sát một phần tử đang display:none thì nó luôn báo "ngoài tầm
       nhìn" — cả lưới có thể nằm im ở opacity 0 cho tới lúc người xem cuộn
       một cái. Bật trước thì ngay lượt đo đầu tiên đã đúng. (enterRoutePage
       xếp đúng thứ tự này, đừng đảo lại ở một trong hai chỗ.)              */
    setScreen('exp');
    $('#expHeroQ').value = '';
    renderExpKinds();
    renderExp();

    document.title = 'Trải nghiệm — Vivu Travel';
    closeMega(); closeDrawer();
    scrollPageToTop();
    syncHeaderBg();
    requestAnimationFrame(initExpHeroMotion);
  }

  /* Trang đăng ký không phải dựng gì cả — biểu mẫu nằm sẵn trong index.html,
     chỉ bật màn hình lên. Vẫn để riêng một hàm cho cùng dáng với enterExp /
     enterTheme, và để chỗ đặt document.title nằm cạnh nhau cả ba.          */
  function enterSignup() {
    subject = null;
    setScreen('signup');
    document.title = 'Đăng ký — Vivu Travel';
    closeMega(); closeDrawer();
    /* Đóng khung đăng nhập nếu nó đang mở: người bấm "Đăng ký ngay" TỪ trong
       khung đó sẽ được data-close lo, nhưng vào thẳng bằng địa chỉ hoặc nút
       back thì không ai lo — mà để nó nằm lại trên trang đăng ký thì body
       kẹt is-locked, cuộn không được. */
    if (!$('#loginModal').hidden) closeModal($('#loginModal'));
    scrollPageToTop();
    syncHeaderBg();
  }

  /** Đọc hash -> quyết định đang ở màn nào. Gọi lúc tải trang và mỗi hashchange.
      Slug không khớp gì thì về landing, không dựng trang rỗng: hash trong URL
      là thứ người ta sửa tay và chép cho nhau, sai một chữ là chuyện thường. */
  function applyRoute() {
    if (location.hash === '#dang-ky')    { enterSignup(); return; }
    if (location.hash === '#bai-viet/dai-noi-hue') { enterHueStory(); return; }
    if (location.hash === '#trai-nghiem') { enterExp(); return; }
    if (location.hash === '#cam-nang') { enterGuide(); return; }

    const mTheme = location.hash.match(/^#chu-de\/([a-z0-9-]+)$/);
    if (mTheme) {
      const i = THEMES.findIndex(th => slugify(th.label) === mTheme[1]);
      if (i >= 0) { enterTheme(i); return; }
    }

    const mDest = location.hash.match(/^#diem-den\/([a-z0-9-]+)$/);
    if (mDest) {
      const loc = ALL_LOCATIONS.find(l => slugify(l) === mDest[1]);
      if (loc) { enterDest(loc); return; }
    }

    exitRoutePage();
  }

  /* ============================ ĐẾM NGƯỢC ============================= */
  function countdown() {
    const end = new Date(2026, 8, 30, 23, 59, 59); // 30/09/2026
    const box = $('#countdown').children;
    const tick = () => {
      let ms = end - new Date();
      if (ms < 0) ms = 0;
      const s = Math.floor(ms / 1000);
      const vals = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
      vals.forEach((v, i) => { box[i].firstElementChild.textContent = String(v).padStart(2, '0'); });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ============================== KHỞI TẠO ============================= */
  renderStatic();
  renderMega();
  renderThemeRail();
  renderTours();
  updateBookingCount();
  bind();
  initGuide();
  initHueStory();
  initWhy();
  applyRoute();          // mở thẳng trang chủ đề nếu URL đã có #chu-de/...
  countdown();
  $$('[data-reveal]').forEach(watch);
  initCamera();
  window.addEventListener('load', measurePan);

  /* FAQ đo lại ở cả hai mốc: 'load' vì lúc dựng xong DOM thì Be Vietnam Pro
     có thể chưa về, chữ đang là font dự phòng nên cao khác; và 'resize' vì
     cột hẹp lại là câu trả lời xuống thêm dòng. */
  window.addEventListener('load', syncFaq);
  window.addEventListener('resize', syncFaq);
})();
