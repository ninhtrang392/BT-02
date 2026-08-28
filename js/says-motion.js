/* ==========================================================================
   Vivu Travel — cảnh cảm nhận: thẻ bay vào trái/phải theo cuộn (GSAP)

   Cả cảnh bị ghim (.stage là position: sticky), câu tuyên ngôn khổ lớn đứng
   yên ở nền, còn bốn thẻ cảm nhận thay nhau bay vào giữa khung: thẻ 1 từ
   TRÁI, thẻ 2 từ PHẢI, thẻ 3 từ TRÁI, thẻ 4 từ PHẢI — hướng lấy từ
   data-side mà app.js ghi sẵn vào markup.

   Cách neo giống js/statement-motion.js: một ScrollTrigger trải trên cả cú
   máy (top top → bottom bottom) và một timeline dài đúng 100 đơn vị, nên mọi
   mốc dưới đây đọc thẳng ra phần trăm quãng cuộn của cảnh:

       0 ──── 12 ──── 34 ──── 56 ──── 78 ──── 100
       chờ    thẻ 1   thẻ 2   thẻ 3   thẻ 4

   LEAD đơn vị đầu tiên KHÔNG có gì xảy ra: cảnh đã ghim nhưng trong khung mới
   chỉ có câu tuyên ngôn. Đó là một nhịp cố ý — cuộn tới nơi thì khung hình
   dừng lại trước, thẻ đầu mới bay vào. Bỏ quãng chờ này thì thẻ 1 chạy ngay
   từ pixel đầu của cú ghim, tức là vừa cuộn tới đã thấy thẻ nằm sẵn giữa màn
   hình, không ai kịp thấy nó bay vào từ đâu.

   Thẻ vào rồi Ở LẠI, không lui ra: thẻ sau đáp xuống ĐÈ LÊN thẻ trước thành
   một chồng thẻ, mỗi cái lệch đi một chút và nghiêng ngược chiều nhau nên vẫn
   thấy mép của mấy thẻ dưới. Hết cảnh là cả bốn cùng nằm đó — phải xem đủ bốn
   thẻ thì trang mới trôi tiếp sang phần sau.

   Chuyển động cố ý CHẬM và mềm: thẻ bay vào chiếm gần trọn ô (16/22 đơn vị),
   ease sine.out chứ không phải power3.out. power3.out dồn gần hết quãng đường
   vào một phần nhỏ đầu tween — bám theo cuộn thì nó đọc ra thành một cú giật
   rồi đứng, chứ không phải một cú bay. Cộng thêm scrub 1.2 (trước 0.7) để
   GSAP làm mượt cả những cú lăn chuột nhấp nhả.

   Không có GSAP (CDN hỏng) hoặc người dùng tắt chuyển động thì module thoát
   ngay và không gắn .is-live — cảnh giữ nguyên bố cục tĩnh: câu tuyên ngôn
   rồi tới lưới bốn thẻ, đọc bình thường.
   ========================================================================== */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  const scene = document.getElementById('reviews');
  const deck  = scene && scene.querySelector('.says-deck');
  const head  = scene && scene.querySelector('.says-head');
  const cards = deck ? Array.from(deck.querySelectorAll('.say-card')) : [];
  if (!scene || !deck || !cards.length) return;

  gsap.registerPlugin(ScrollTrigger);

  /* Gắn class TRƯỚC khi tính toán: bố cục xếp chồng mới là bố cục mà mọi mốc
     cuộn ở dưới được đo trên đó. Gắn sau thì ScrollTrigger chốt mốc theo
     chiều cao của bố cục tĩnh — sai cả cảnh. */
  scene.classList.add('is-live');

  const SPAN   = 100;                          // tổng chiều dài timeline
  const LEAD   = 12;                           // ghim rồi mà chưa thẻ nào vào
  const SLOT   = (SPAN - LEAD) / cards.length; // quãng dành cho mỗi thẻ
  const IN_LEN = 16;                           // thời lượng bay vào (gần trọn ô)

  /* Chỗ đáp của từng thẻ trong chồng. Lệch ngang theo đúng phía nó bay tới và
     xoè dần xuống dưới, nên chồng thẻ nhìn ra là bốn tấm rời xếp lên nhau chứ
     không phải một tấm dày. Con số nhỏ (vài chục pixel) là cố ý: lệch nhiều
     thì thẻ dưới cùng lòi ra quá nửa, thành bốn thẻ bày cạnh nhau.          */
  const restX   = (dir, i) => dir * (14 + i * 5);
  const restY   = i => (i - (cards.length - 1) / 2) * 15;
  const restRot = (dir, i) => dir * -(1.6 + i * 0.5);

  /* Quãng đường bay vào tính bằng hàm chứ không phải hằng số: phải đủ để thẻ
     nằm HẲN ngoài khung ở đầu tween, mà thẻ rộng bao nhiêu thì tuỳ khổ màn.
     invalidateOnRefresh ở dưới cho ScrollTrigger gọi lại mấy hàm này mỗi lần
     đo lại, nên xoay ngang điện thoại hay kéo cửa sổ vẫn đúng. */
  const offBy = (card, dir) => () =>
    dir * (window.innerWidth / 2 + card.offsetWidth / 2 + 60);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      invalidateOnRefresh: true
    }
  });
  tl.to({}, { duration: SPAN }, 0);         // ấn định 1 đơn vị = 1% quãng cuộn

  /* Câu tuyên ngôn trôi ngược chiều cuộn một quãng ngắn. Chỉ 80px cho cả cảnh:
     đủ để nền và thẻ tách thành hai lớp sâu nông khác nhau, mà không thành một
     khối chữ tự bò đi trong lúc người ta đang đọc thẻ. */
  if (head) tl.fromTo(head, { y: 46 }, { y: -46, ease: 'none', duration: SPAN }, 0);

  cards.forEach((card, i) => {
    const dir = card.dataset.side === 'right' ? 1 : -1;
    const at  = LEAD + i * SLOT;

    // thẻ sau luôn nằm trên thẻ trước — đây là thứ tự của cả chồng thẻ
    gsap.set(card, { zIndex: i + 1, autoAlpha: 0 });

    /* Bật hiện bằng một .set ở đúng mốc xuất phát, KHÔNG mờ dần: lúc đó thẻ
       còn nằm ngoài mép khung nên chẳng ai thấy nó bật lên, mà cả quãng đường
       sau đó là bay thật. Cho opacity chạy suốt quãng bay thì thẻ vừa trượt
       vừa rõ dần — mắt đọc ra thành thẻ nhấp nháy chứ không phải thẻ trượt.
       Trong timeline scrub, .set tự trả về giá trị cũ khi cuộn ngược. */
    tl.set(card, { autoAlpha: 1 }, at);
    tl.fromTo(card,
      { x: offBy(card, dir), rotate: dir * 5, scale: 0.97 },
      {
        x: restX(dir, i), y: restY(i), rotate: restRot(dir, i), scale: 1,
        ease: 'sine.out', duration: IN_LEN
      }, at);
  });

  /* Đo lại mốc cuộn: cảnh này nằm gần cuối trang, mọi thứ phía trên (cú máy
     mở đầu cao 500vh, ảnh, font) chỉ đúng chiều cao sau khi tải xong. Trang
     chủ đề còn ẩn hẳn landing nên mốc thành vô nghĩa cho tới lần refresh sau. */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  window.addEventListener('hashchange', () => setTimeout(() => ScrollTrigger.refresh(), 60));
})();
