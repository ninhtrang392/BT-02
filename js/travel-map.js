/* ==========================================================================
   Vivu Travel — cảnh hành trình 3D (Three.js + GSAP ScrollTrigger)

   Máy bay bay Việt Nam → Thái Lan → Trung Quốc → Hàn Quốc → Nhật Bản.

   Cảnh này ôm cả khối chữ "Nguyên tắc dựng chuyến" lẫn bản đồ bay — trước
   đây là hai section rời, cuộn qua thấy rõ mép cắt. Giờ chỉ còn MỘT cú máy
   (#flightMap), không có chỗ ngắt nào ở giữa: nửa đầu là nền trắng với khối
   chữ đọc bình thường, máy bay đã lượn vào từ ngoài khung và bản đồ mới là
   bóng mờ; rồi nền trắng tan để lộ trời, chữ trôi lên, chuyến bay đã đang
   chạy. Xem bảng phân pha ở mục "Trạng thái" bên dưới; phần chữ do
   js/statement-motion.js lo, neo trên cùng quãng cuộn này.

   Cái màn trắng đó là .fm-stage::before trong style.css; ở đây chỉ ghi
   --fm-veil mỗi khung. Nhờ nó mà chữ không phải chống chọi với bản đồ: suốt
   pha đọc, nền sau lưng chữ vẫn đúng là nền trắng của trang.

   Bản đồ ĐỨNG YÊN. Camera treo trên tâm bản đồ, ôm trọn khung ngắm và không
   rời chỗ; nó chỉ hạ góc đúng một lần lúc mở màn — từ nhìn thẳng xuống thành
   nhìn chéo — rồi lùi nhẹ ở cuối cảnh để tiễn máy bay ra khỏi khung. Mọi
   chuyển động còn lại đều là của máy bay: nó bay, địa danh nó tới thì hiện
   lên và phóng to, đường bay cyan→hồng kéo dài dần phía sau. Toàn bộ do tiến
   độ cuộn điều khiển.

   Asset lấy từ images/travel-map/cutout/ — bản ĐÃ TÁCH NỀN (`npm run cutout`).
   Bản gốc trong images/travel-map/ không có kênh alpha nên đắp thẳng lên
   WebGL sẽ ra khối trắng kẻ caro.

   Tỉ lệ mỗi mặt phẳng đọc từ manifest.json chứ không đặt cứng, để không kéo
   méo asset ở bất kỳ khổ màn hình nào.

   Riêng máy bay là model 3D thật (images/travel-map/Airplane 3d/), không còn
   là ảnh cắt: nó phải lượn theo tuyến và nghiêng cánh khi cua, ảnh phẳng
   luôn quay mặt về camera thì không diễn được.
   ========================================================================== */
let THREE;
let OBJLoader;
let MTLLoader;

const HOST = document.getElementById('flightMap');
if (HOST) {
  // lazy-scenes.js already controls when this module is loaded. Boot now instead
  // of adding a second viewport gate that fast scrolling can outrun.
  boot();
}

async function boot() {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = HOST.querySelector('.fm-stage');
  const fallback = HOST.querySelector('.fm-fallback');

  // WebGL hỏng hoặc người dùng tắt chuyển động -> để nguyên ảnh tĩnh
  if (REDUCED || !hasWebGL()) return;

  try {
    const [threeModule, objModule, mtlModule] = await Promise.all([
      import('three'),
      import('three/addons/loaders/OBJLoader.js'),
      import('three/addons/loaders/MTLLoader.js')
    ]);
    THREE = threeModule;
    OBJLoader = objModule.OBJLoader;
    MTLLoader = mtlModule.MTLLoader;
  } catch (e) { return; }

  const BASE = 'images/travel-map/cutout';
  let manifest;
  try {
    const res = await fetch(BASE + '/manifest.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error(res.status);
    manifest = await res.json();
  } catch (e) { return; }                    // chưa chạy `npm run cutout`

  const aspectOf = file => {
    const a = manifest.assets.find(x => x.file === file);
    return a ? a.aspect : 1;
  };

  /* ------------------------- Tuyến bay & địa danh -------------------------
     u,v là toạ độ chuẩn hoá trên ảnh bản đồ (0..1, gốc góc trên-trái). Đây là
     toạ độ TRÊN ẢNH, không phải kinh vĩ độ: ảnh là một bản dựng 3D nhìn chéo
     từ phía nam nên không có công thức nào đổi qua lại, phải dò bằng mắt trên
     chính tấm ảnh. Mốc dễ bám nhất là mấy hòn đảo: Hải Nam, Đài Loan, mũi bán
     đảo Triều Tiên, Luzon.

     Lệch một hai phần trăm là thường; thấy tấm ảnh địa danh đứng chưa đúng
     chỗ thì nhích đúng hai số này, đừng đụng vào chỗ khác. Đổi ảnh nền là
     phải dò lại cả năm.                                                     */
  const STOPS = [
    { label: 'Việt Nam',   file: '02-viet-nam.png',   u: 0.415, v: 0.720 },
    { label: 'Thái Lan',   file: '03-thai-lan.png',   u: 0.302, v: 0.700 },
    { label: 'Trung Quốc', file: '04-trung-quoc.png', u: 0.515, v: 0.356 },
    { label: 'Hàn Quốc',   file: '05-han-quoc.png',   u: 0.623, v: 0.398 },
    { label: 'Nhật Bản',   file: '06-nhat-ban.png',   u: 0.835, v: 0.352 }
  ];

  /* Bề NGANG của cả năm tấm địa danh, đơn vị thế giới. Một hằng số dùng chung
     chứ không phải một con số riêng trong mỗi mục STOPS: năm điểm đến là năm
     mục ngang hàng nhau trên cùng một hành trình, cái nào to hơn là mắt đọc
     ra thứ bậc không có thật. Bản trước để 5,6–6,6 tuỳ điểm, đúng kiểu chênh
     lệch vừa đủ để thấy mà không ra lý do gì.

     Chiều cao thì KHÔNG bằng nhau, và không nên ép cho bằng: mỗi tấm giữ đúng
     tỉ lệ gốc của nó (`size / aspect`), mà hai tấm Thái Lan (3:2) với Nhật Bản
     (1,6:1) vốn là ảnh ngang hơn ba tấm còn lại (4:3). Ép cùng chiều cao là
     kéo giãn hình.

     Nới tới đâu thì phải NHÌN mà quyết, không tính ra được. Hai điểm gần nhau
     nhất là Trung Quốc với Hàn Quốc, cách 6,9 đơn vị theo trục ngang — quá
     con số đó là hai MẶT PHẲNG bắt đầu cắt nhau, ở 7,6 thì chồng nhau khoảng
     40px trên màn. Nhưng mặt phẳng chồng nhau không có nghĩa là hai hòn đảo
     chồng nhau: phần rìa mỗi tấm ảnh là trong suốt (bộ này chỉ 33–75% diện
     tích là hình thật, xem `keptPct` trong manifest.json), nên ở 7,6 nhìn vẫn
     rời hẳn. Hai chỗ khác cũng không hỏng vì chuyện chồng lấn đó: bắt điểm
     lọc theo alpha nên tấm nằm trên không cướp cú bấm của tấm dưới, còn vẽ
     thì vùng alpha 0 vốn không tô gì lên nền.                               */
  const STOP_SIZE = 7.6;

  const MAP_ASPECT = aspectOf('01-ban-do-chau-a.png');
  const MAP_W = 64, MAP_H = MAP_W / MAP_ASPECT;
  const toWorld = (u, v) => new THREE.Vector3((u - 0.5) * MAP_W, 0, (v - 0.5) * MAP_H);

  /* ------------------------------ Three.js ------------------------------ */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearAlpha(0);
  stage.appendChild(renderer.domElement);
  renderer.domElement.className = 'fm-canvas';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

  const loader = new THREE.TextureLoader();
  const load = url => new Promise(res => loader.load(url, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    res(t);
  }, undefined, () => res(null)));

  /* --- mặt bản đồ, nằm ngang --- */
  const mapTex = await load(BASE + '/01-ban-do-chau-a.png');
  /* Đúng bằng khổ ảnh, không dôi ra tí nào. Trước đây mặt này dựng rộng hơn
     1,15 lần rồi kéo UV để giấu cạnh, vì camera bám đuôi máy bay có lúc lết
     tới sát mép bản đồ. Giờ camera đứng một chỗ nên cái vành pixel kéo giãn
     đó vừa thừa vừa hại: nó nằm ngay trong tầm nhìn, thành vệt sọc quanh mép.

     Thay bằng cách mờ dần bốn mép. Khung ngắm bám sát nội dung nên tuỳ khổ
     màn mà mép này hay mép kia lọt vào khung — để nguyên thì thành một
     đường cắt thẳng băng giữa bản đồ và nền. Mờ dần thì nó tan vào nền
     gradient của .fm-stage, mà mép xa cũng ra dáng sương mù ở chân trời.

     Làm bằng alphaMap chứ không viết ShaderMaterial: MeshBasicMaterial lo
     sẵn phần chuyển hệ màu sRGB cho texture bản đồ, tự viết shader là phải
     ôm lại việc đó, sai một nhịp là cả bản đồ bạc màu.

     Bề rộng dải mờ KHÔNG đều bốn cạnh, vì phối cảnh không đối xử đều với
     chúng. Mặt bản đồ nằm ngang, camera nhìn chếch từ phía nam xuống: mép xa
     bị nén dữ dội, 11% bề dài ảnh ở đó chỉ còn vài chục pixel trên màn — mắt
     đọc ra là một đường kẻ ngang chứ không phải chân trời mờ. Mép trái/phải
     thì gần như dựng đứng trong khung nên 11% đã ra đúng một dải sương.

     Nên: mép xa nới rộng gấp đôi (0,26), hai bên và mép gần giữ quanh 0,15.
     Đo trên màn thì ba dải này mới xấp xỉ bằng nhau — đó mới là thứ cần đều,
     không phải con số trong UV.

     TRẦN theo bộ STOPS: dải ăn từ mép vào, mà Nhật Bản nằm ở u = 0,835 /
     v = 0,352 — nới `side` quá 0,165 hay `far` quá 0,35 là chính hòn đảo địa
     danh ngoài cùng bắt đầu bị làm nhạt ngay giữa cảnh.                     */
  const fade = edgeFade({ far: 0.26, near: 0.15, side: 0.15 });

  /* Mây dùng mặt nạ RIÊNG, rộng hơn nhiều. Hai lớp mây cùng khổ với mặt bản
     đồ nhưng bay ở cao độ 1,1 và 1,9, nên chiếu lên màn chúng nhô lên QUÁ
     đường chân trời của bản đồ. Dùng chung một mặt nạ là có hai mép mờ hình
     chữ nhật lệch nhau vài chục pixel ở ngay đỉnh khung — thành một vệt
     ngang thấy rõ. Cho mây tắt hẳn từ sớm thì nó chết trước khi tới mép,
     phần nhô ra không còn gì để lộ.                                         */
  const cloudFade = edgeFade({ far: 0.44, near: 0.26, side: 0.26 });
  const map = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_W, MAP_H),
    new THREE.MeshBasicMaterial({
      map: mapTex, alphaMap: fade, transparent: true, depthWrite: false
    })
  );
  map.rotation.x = -Math.PI / 2;
  scene.add(map);

  /* --- mây: hai lớp mỏng trôi ngang trên mặt bản đồ -----------------------
     Cùng khổ với mặt bản đồ nhưng mặt nạ mờ mép rộng hơn (`cloudFade`), để
     mây tan hẳn TRƯỚC khi tới rìa bản đồ chứ không lòi ra thành dải trắng.

     Cao độ phải THẤP HƠN cao độ máy bay (TRAIL_Y 0,22 + PLANE_LIFT 2,4 = 2,62):
     máy bay là chủ thể của cảnh, chui xuống dưới một vệt mây là mất hút ngay.
     Sửa hai hằng số kia thì kéo mấy con số dưới đây theo.

     Mây nằm CAO HƠN đường bay (0,22) nhưng vẫn không che nó: thứ tự vẽ cho
     đường bay (3–4) sau mây (2), nên nét gạch luôn ăn đè lên. Cố ý — mây là
     lớp khí quyển, còn đường bay là nét in trên bản đồ, phải luôn đọc rõ.

     Hai lớp chứ không phải một, chạy ngược chiều và lệch tốc: một lớp thì
     mắt đọc ra ngay là một tấm ảnh đang trượt, hai lớp cắt nhau mới ra chiều
     sâu. Lớp cao hơn chậm hơn và nhạt hơn — xa thì trôi chậm.               */
  const CLOUDS = [
    { y: 1.1, repeat: 2.4, cycle:  0.016, opacity: 0.20, seed: 7 },
    { y: 1.9, repeat: 1.6, cycle: -0.010, opacity: 0.13, seed: 41 }
  ];
  const clouds = CLOUDS.map(c => {
    const tex = cloudTexture(c.seed);
    tex.repeat.set(c.repeat, c.repeat * 0.55);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_W, MAP_H),
      new THREE.MeshBasicMaterial({
        map: tex, alphaMap: cloudFade, transparent: true, depthWrite: false, opacity: 0
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = c.y;
    mesh.renderOrder = 2;
    scene.add(mesh);
    return { ...c, mesh, tex };
  });

  /* --- địa danh: mặt phẳng luôn nằm song song với mặt phẳng ảnh của camera
         (bảng quảng cáo đúng nghĩa). Ảnh vốn đã được vẽ ở góc nhìn chéo sẵn
         nên cứ chiếu thẳng ra màn là đúng; xem chú thích dài ở frame() để
         biết vì sao KHÔNG dựng đứng trong không gian thế giới.             --- */
  const marks = [];
  for (const s of STOPS) {
    const tex = await load(BASE + '/' + s.file);
    const a = aspectOf(s.file);
    const h = STOP_SIZE / a;                                   // đúng tỉ lệ gốc
    const g = new THREE.PlaneGeometry(STOP_SIZE, h);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, opacity: 0
    }));
    const at = toWorld(s.u, s.v);
    m.position.set(at.x, h * 0.5 * 0.62, at.z);
    /* Thứ tự vẽ, từ dưới lên: bản đồ (0) · vòng sáng (1) · mây (2) · quầng
       đường bay (3) · đường bay (4) · địa danh (5) · máy bay (6). Không thứ
       nào ghi vào bộ đệm sâu nên thứ tự này quyết định hẳn cái nào chồng lên
       cái nào. Hai chỗ phải đúng: mây nằm DƯỚI địa danh, không thì mấy hòn
       đảo bị phủ sương giữa cảnh; và đường bay cũng nằm DƯỚI địa danh, vì nó
       là nét in trên mặt bản đồ, phải chạy sau lưng đảo chứ không vắt qua
       trước mặt ngôi chùa.                                                  */
    m.renderOrder = 5;
    scene.add(m);

    // vòng sáng dưới chân, nở ra khi máy bay tới nơi
    // KHÔNG dùng AdditiveBlending. Ảnh bản đồ nền là thứ thay được (xem
    // README), và một trong hai bản đang có gần như trắng toát — cộng sáng
    // vào trắng thì không đổi gì, vòng sáng biến thành vệt bệt. Blend thường
    // với màu cyan ăn được trên cả nền sáng lẫn nền biển xanh đậm.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.84, 1, 64),
      new THREE.MeshBasicMaterial({ color: 0x00b8d9, transparent: true, opacity: 0,
                                    side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(at.x, 0.06, at.z);
    ring.renderOrder = 1;
    scene.add(ring);

    /* baseY / top: hoverPass() nhấc tấm địa danh lên khi rê chuột vào, nên
       phải nhớ cao độ gốc để hạ về (frame() không đặt lại position). `top` là
       đỉnh tấm ảnh, chỗ treo nhãn tên.                                       */
    const mark = {
      ...s, mesh: m, ring, at, size: STOP_SIZE,
      baseY: m.position.y, top: m.position.y + h * 0.5,
      // placeNote() cần hai số này để đặt thẻ tránh hẳn tấm ảnh
      halfW: STOP_SIZE * 0.5, halfH: h * 0.5,
      hit: alphaGrid(tex), glow: 0
    };
    m.userData.mark = mark;
    marks.push(mark);
  }

  /* ==================== Thẻ nội dung của điểm đến =======================
     Mỗi điểm đến có một CHẤM TRÒN nổi trên bản đồ. Trỏ chuột vào chấm (hoặc
     vào chính hòn đảo) là tấm thẻ trượt ra ngay cạnh nơi đó với phần mô tả;
     rời chuột thì thẻ thu lại. Bấm thì GHIM thẻ lại để đọc kỹ mà không phải
     giữ chuột — bấm lần nữa, bấm ra chỗ trống hoặc bấm Esc là nhả ghim.

     Chữ lấy từ .fm-notes trong index.html (xem chú thích ở đó), khớp theo
     `label`. Ở đây chỉ dựng phần khung và lo chuyện đóng/mở.                */
  const notes = new Map();
  HOST.querySelectorAll('.fm-notes > article').forEach(el => {
    notes.set(el.dataset.stop, el.innerHTML);
  });

  /* Dựng bằng JS chứ không đặt sẵn trong index.html, cùng lý do với .fm-tag:
     tấm thẻ chỉ có nghĩa khi cảnh WebGL chạy được — nhánh đường lui không có
     bản đồ để mà bấm vào, để sẵn một cái khung rỗng ở đó là thừa.           */
  const note = document.createElement('aside');
  note.className = 'fm-note';
  note.hidden = true;
  /* Không có nút đóng. Thẻ này mở bằng cách rê chuột vào nên nó cũng tự đóng
     khi rời chuột ra — một cái nút × chỉ có việc lúc thẻ đang bị GHIM, mà lúc
     đó bấm lần nữa vào chính điểm đến, bấm ra chỗ trống hay bấm Esc đều nhả
     được. Thêm nút nữa là bày ra một thứ gần như không ai dùng, lại chiếm
     đúng mép thẻ hướng về phía hòn đảo.                                     */
  note.innerHTML =
    '<p class="fm-note-kicker"></p>' +
    '<h3 class="fm-note-title"></h3>' +
    '<div class="fm-note-body"></div>';
  stage.appendChild(note);
  const noteKicker = note.querySelector('.fm-note-kicker');
  const noteTitle  = note.querySelector('.fm-note-title');
  const noteBody   = note.querySelector('.fm-note-body');

  /* --- BA nguồn, MỘT kết quả -------------------------------------------
     Thứ tự ưu tiên: ghim > chấm hotspot > hòn đảo dưới con trỏ. Gom về một
     chỗ như thế này thay vì để mỗi nguồn tự gọi mở/đóng, vì chúng chồng lấn
     liên tục — rê từ chấm sang đảo là một nguồn tắt trong khi nguồn kia bật,
     mà hai lời gọi ấy đến không theo thứ tự nào cả. Cứ tính lại "thứ đáng
     hiện lúc này" rồi so với thứ đang hiện thì không có trạng thái kẹt.

     `hotMark` (hòn đảo) do hoverPass() ghi mỗi khung, nên syncNote() cũng
     được gọi mỗi khung; nó tự thoát ngay khi không có gì đổi.               */
  let pinMark = null;      // bấm để ghim, đọc kỹ không cần giữ chuột
  let spotMark = null;     // con trỏ hoặc tiêu điểm bàn phím đang ở trên chấm
  let openMark = null;     // thứ tấm thẻ đang hiển thị

  function syncNote() {
    const m = pinMark || spotMark || hotMark;
    if (m === openMark) return;

    const html = m && notes.get(m.label);
    openMark = html ? m : null;            // thiếu bài trong index.html -> coi như không có
    for (const k of marks) k.spot.classList.toggle('is-on', k === openMark);

    if (!openMark) { note.classList.remove('is-open'); return; }
    noteKicker.textContent = 'Chặng ' + String(marks.indexOf(openMark) + 1).padStart(2, '0');
    noteTitle.textContent = openMark.label;
    noteBody.innerHTML = html;             // nguồn là markup tĩnh của chính trang
    note.hidden = false;
    /* Ép trình duyệt chốt layout của trạng thái đóng TRƯỚC khi gắn .is-open.
       Bỏ dòng này thì thẻ vừa hết hidden vừa đổi class trong cùng một nhịp,
       trình duyệt gộp làm một và transition không có gì để chạy — thẻ hiện
       ra khô khốc.

       Tiện thể đo luôn khổ thẻ ở đây: đằng nào cũng vừa buộc trình duyệt tính
       lại layout, mà placeNote() thì chạy mỗi khung — đọc offsetHeight trong
       đó là bắt tính lại layout 60 lần một giây cho một con số chỉ đổi khi
       nội dung đổi.                                                          */
    void note.offsetWidth;
    noteW = note.offsetWidth;
    noteH = note.offsetHeight;
    placed = '';                           // buộc placeNote() đặt lại cho điểm mới
    placeNote();
    note.classList.add('is-open');
  }

  /* ---------------------- Đặt thẻ cạnh điểm đang mở ----------------------
     Thẻ đứng ngay bên cạnh hòn đảo vừa rê vào và KHÔNG đè lên hòn đảo nào —
     kể cả bốn hòn còn lại. Thử bốn chỗ theo thứ tự phải · trái · dưới · trên,
     lấy chỗ đầu tiên vừa lọt khung vừa không chạm hòn nào.

     Vì sao phải xét cả bốn hòn kia: tuyến bay chạy CHÉO qua khung (Thái Lan
     dưới-trái lên Nhật Bản trên-phải) nên khoảng trống cạnh một điểm đến gần
     như luôn là chỗ của điểm kế tiếp. Đo thử với bản chỉ có phải/trái: bốn
     trong năm điểm đè lên hàng xóm. Thêm hai phương dọc thì cả năm đều tìm
     được chỗ sạch.

     Đo từ MÉP tấm ảnh chứ không từ tâm. Tấm địa danh rộng cỡ 6,6 đơn vị thế
     giới, chiếu ra là hơn trăm pixel — lấy tâm cộng một khoảng hở nhỏ thì thẻ
     nằm đè lên đúng nửa hòn đảo vừa được trỏ vào. Nửa bề ngang/bề cao trên
     màn tính bằng cách chiếu thêm hai điểm lệch đúng `halfW`/`halfH` theo hai
     TRỤC CỦA CAMERA — tấm ảnh nằm song song mặt phẳng ảnh nên đó cũng chính
     là hai hướng cạnh của nó.

     Dùng khổ GỐC nhân MARK_PAD chứ không đọc `mesh.scale` đang chạy: tấm ảnh
     phồng lên lúc máy bay tới nơi và lúc được trỏ vào, đọc kích thước tức
     thời thì thẻ bò ra bò vào theo từng khung. MARK_PAD lấy dư hơn mức phồng
     tối đa (1,10 × 1,10) nên chỗ đã chọn vẫn sạch ở lúc phồng nhất.

     Không có kiểu "thẻ tự co lại cho vừa" — chữ xuống dòng khác nhau tuỳ
     điểm đến thì mỗi lần rê chuột thẻ lại một khổ.                          */
  const NOTE_GAP = 26;
  const MARK_PAD = 1.22;
  // Thanh nav là position:fixed còn .fm-stage thì ghim đúng khung nhìn, nên
  // hai hệ toạ độ trùng nhau và đây là mép trên dùng được luôn. Đọc từ biến
  // CSS để đổi --nav-h một chỗ là cả hai bên theo.
  const NAV_H = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 78;
  const narrow = window.matchMedia('(max-width: 760px)');
  let noteW = 0, noteH = 0, placed = '';

  const rectMid = new THREE.Vector3();
  const rectSide = new THREE.Vector3();
  const rectTop = new THREE.Vector3();
  const boxes = marks.map(() => ({ cx: 0, cy: 0, hw: 0, hh: 0 }));

  /** Hộp bao của một địa danh trên màn, tính bằng pixel; ghi vào `out`. */
  function markBox(m, out) {
    rectMid.set(m.at.x, m.baseY, m.at.z);
    rectSide.set(1, 0, 0).applyQuaternion(camera.quaternion)
            .multiplyScalar(m.halfW * MARK_PAD).add(rectMid);
    rectTop.set(0, 1, 0).applyQuaternion(camera.quaternion)
           .multiplyScalar(m.halfH * MARK_PAD).add(rectMid);
    rectMid.project(camera); rectSide.project(camera); rectTop.project(camera);
    out.cx = (rectMid.x * 0.5 + 0.5) * vw;
    out.cy = (-rectMid.y * 0.5 + 0.5) * vh;
    out.hw = Math.abs(rectSide.x - rectMid.x) * 0.5 * vw;
    out.hh = Math.abs(rectTop.y - rectMid.y) * 0.5 * vh;
    return out;
  }

  /** Diện tích thẻ đặt ở (l,t) chồng lên hộp `b`. 0 = không chạm. */
  function hitArea(l, t, b) {
    const dx = Math.min(l + noteW, b.cx + b.hw) - Math.max(l, b.cx - b.hw);
    const dy = Math.min(t + noteH, b.cy + b.hh) - Math.max(t, b.cy - b.hh);
    return dx > 0 && dy > 0 ? dx * dy : 0;
  }

  function placeNote() {
    if (!openMark) return;

    /* Màn hẹp: thẻ dán đáy khung (media query trong style.css). Phải xoá hẳn
       style nội tuyến chứ không chỉ thôi ghi — style nội tuyến thắng mọi
       media query, để sót lại là thẻ kẹt ở toạ độ của lần xem màn rộng. */
    if (narrow.matches) {
      if (placed !== 'dock') {
        note.style.left = note.style.top = '';
        note.classList.remove('at-left');
        placed = 'dock';
      }
      return;
    }

    /* Cả phép tính dưới đây chỉ phụ thuộc điểm đang mở, vị trí camera và khổ
       khung — không phụ thuộc thời gian. Camera đứng yên suốt pha bay nên
       chữ ký này gần như không đổi, và hàm thoát ngay ở dòng dưới. Đó là chỗ
       tiết kiệm thật: chiếu 15 điểm rồi ghi left/top mỗi khung là bắt trình
       duyệt tính lại layout 60 lần một giây cho cùng một kết quả.           */
    const sig = openMark.label + '|' + vw + 'x' + vh + '|' +
                camera.position.y.toFixed(1) + '|' + camera.position.z.toFixed(1);
    if (sig === placed) return;
    placed = sig;

    const self = markBox(openMark, boxes[0]);
    const others = [];
    for (const m of marks) {
      if (m !== openMark) others.push(markBox(m, boxes[others.length + 1]));
    }

    /* `left` chỉ đúng nghĩa với hai chỗ đặt ngang — nó nói thẻ nằm bên TRÁI
       hòn đảo, và CSS lấy đó để đổi chiều trượt vào. Hai chỗ dọc thì thẻ canh
       giữa hòn đảo theo bề ngang, không bên nào cả, nên để mặc định. */
    const cands = [
      { l: self.cx + self.hw + NOTE_GAP,         t: self.cy - noteH / 2,                  left: false },
      { l: self.cx - self.hw - NOTE_GAP - noteW, t: self.cy - noteH / 2,                  left: true  },
      { l: self.cx - noteW / 2,                  t: self.cy + self.hh + NOTE_GAP,         left: false },
      { l: self.cx - noteW / 2,                  t: self.cy - self.hh - NOTE_GAP - noteH, left: false }
    ];

    let best = null;
    for (const c of cands) {
      if (c.l < NOTE_GAP || c.l + noteW > vw - NOTE_GAP) continue;
      if (c.t < NAV_H + NOTE_GAP || c.t + noteH > vh - NOTE_GAP) continue;
      let score = 0;
      for (const b of others) score += hitArea(c.l, c.t, b);
      if (!best || score < best.score) best = { l: c.l, t: c.t, left: c.left, score };
      if (score === 0) break;
    }

    /* Không chỗ nào lọt khung (khung quá thấp/hẹp): quay về chỗ bên phải rồi
       kẹp cho bằng được. Thà đè lên một hòn đảo còn hơn để thẻ tràn ra ngoài
       màn — tràn ra là mất chữ, còn đè thì vẫn đọc được. */
    if (!best) {
      best = {
        l: Math.max(NOTE_GAP, Math.min(vw - noteW - NOTE_GAP, cands[0].l)),
        t: Math.max(NAV_H + NOTE_GAP, Math.min(vh - noteH - NOTE_GAP, cands[0].t)),
        left: false
      };
    }

    note.style.left = Math.round(best.l) + 'px';
    note.style.top = Math.round(best.t) + 'px';
    note.classList.toggle('at-left', best.left);
  }

  const unpin = () => { pinMark = null; syncNote(); kick(); };

  // Cắt khỏi luồng chuột chỉ SAU khi mờ hẳn; gắn hidden ngay lúc đóng là thẻ
  // biến mất tức thì, mất luôn đoạn trượt ra.
  note.addEventListener('transitionend', e => {
    if (e.propertyName === 'opacity' && !openMark) note.hidden = true;
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') unpin(); });

  /* ------------------------- Chấm hotspot trên bản đồ ---------------------
     Một cái nút thật cho mỗi điểm đến, nổi trên canvas, mỗi khung được chiếu
     lại về đúng chỗ hòn đảo đang đứng trên màn.

     LÀ THẺ DOM chứ không phải sprite vẽ trong WebGL. Sprite thì phải tự lo
     bắn tia, tự lo con trỏ, và hoàn toàn không tồn tại với bàn phím lẫn trình
     đọc màn hình. Một <button> thì hover, tiêu điểm, Tab, Enter và nhãn cho
     trình đọc màn hình đều là việc trình duyệt làm sẵn — phần duy nhất phải
     tự viết là đặt nó vào đúng toạ độ.

     Đây cũng là DẤU HIỆU BẤM ĐƯỢC. Không có nó thì cả cảnh không có gì cho
     biết năm hòn đảo kia là thứ tương tác được, người xem chỉ tình cờ rê
     trúng mới biết.                                                         */
  for (const m of marks) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fm-spot';
    b.setAttribute('aria-label', 'Xem chi tiết ' + m.label);
    // lệch nhịp thở mỗi chấm một ít, năm chấm nở cùng lúc thành đèn báo động
    b.style.animationDelay = (marks.indexOf(m) * 0.44) + 's';

    const enter = () => { spotMark = m; syncNote(); kick(); };
    const leave = () => { if (spotMark === m) spotMark = null; syncNote(); kick(); };
    b.addEventListener('pointerenter', enter);
    b.addEventListener('pointerleave', leave);
    b.addEventListener('focus', enter);
    b.addEventListener('blur', leave);
    /* Bấm là GHIM/NHẢ. Trên cảm ứng thì không có trạng thái rê chuột, nên đây
       cũng là đường duy nhất mở được thẻ — pointerenter có nổ khi chạm nhưng
       tắt ngay lúc nhấc ngón tay. */
    b.addEventListener('click', () => {
      pinMark = pinMark === m ? null : m;
      syncNote(); kick();
    });

    stage.appendChild(b);
    m.spot = b;
  }

  /* --- đường bay: nội suy mềm qua 5 điểm, nhấc cao ở giữa mỗi chặng --- */
  /* Tuyến NẰM SÁT MẶT BẢN ĐỒ, không vồng lên. Trước đây mỗi chặng được nhấc
     cao ở giữa (1,2 + khoảng cách × 0,16) nên nhìn nghiêng thành một dải cầu
     vồng lơ lửng; kiểu đường bay muốn có là nét gạch nối in trên mặt bản đồ,
     nên giữ nguyên một cao độ. 0,22 vừa đủ để không lẫn vào mặt bản đồ, mà
     nhìn từ góc nghiêng 40° thì vẫn đọc là nằm trên mặt.

     Điểm giữa mỗi chặng lệch sang một bên, đổi bên xen kẽ: nối thẳng năm điểm
     thì ra đường gấp khúc, còn lệch thế này cho tuyến uốn lượn mềm.         */
  const TRAIL_Y = 0.22;
  const pts = [];
  for (let i = 0; i < marks.length; i++) {
    pts.push(marks[i].at.clone().setY(TRAIL_Y));
    if (i < marks.length - 1) {
      const seg = marks[i + 1].at.clone().sub(marks[i].at);
      const side = new THREE.Vector3(-seg.z, 0, seg.x)
        .normalize().multiplyScalar(seg.length() * 0.09 * (i % 2 ? -1 : 1));
      pts.push(marks[i].at.clone().lerp(marks[i + 1].at, 0.5).add(side).setY(TRAIL_Y));
    }
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

  /* --- đoạn dẫn vào và đoạn thoát ra --------------------------------------
     Cảnh này bắt đầu từ khối chữ "Nguyên tắc dựng chuyến", nên lúc người đọc
     còn đang ở câu văn thì máy bay đã phải ở trên không rồi — và khi hết tuyến
     nó phải rời khung chứ không biến mất tại chỗ.

     Hai đoạn này chỉ chở cái máy bay, KHÔNG thuộc đường bay vẽ trên bản đồ:
     ống TubeGeometry bên dưới vẫn dựng đúng trên `curve` nên uHead 0..1 vẫn
     khớp tuyến, và khung ngắm của camera cũng chỉ đo trên `curve` — đoạn dẫn
     nằm ngoài khung là đúng ý, đó là chỗ máy bay bay vào từ ngoài màn hình.

     Điểm nối lấy thẳng từ chính `curve` (vị trí + tiếp tuyến ở hai đầu) nên
     chỗ giao ca không gãy khúc: cùng một điểm, gần cùng một hướng.

     Mỗi mốc của đoạn thoát là [dọc theo hướng bay, lệch ngang, cao độ]. Lệch
     ngang là thứ biến nó từ một đường thẳng buồn tẻ thành cú lượn vòng, và
     nhờ có nó phần nghiêng cánh trong frame() mới có cái để diễn.

     Riêng ĐOẠN DẪN VÀO dựng ở mục Camera bên dưới (`buildApproach`), không
     phải ở đây: máy bay phải vào đúng bằng mép phải của khung hình, mà khung
     rộng bao nhiêu thì lại do tỉ lệ màn quyết định. Khai báo trước để
     flightAt() có cái mà tham chiếu.                                        */
  function leadCurve(anchor, dir, specs) {
    const right = new THREE.Vector3(dir.z, 0, -dir.x);      // vuông góc, nằm ngang
    return specs.map(([along, side, y]) => anchor.clone()
      .addScaledVector(dir, along).addScaledVector(right, side).setY(y));
  }
  const headP = curve.getPointAt(0);
  const headD = curve.getTangentAt(0).setY(0).normalize();
  const tailP = curve.getPointAt(1);
  const tailD = curve.getTangentAt(1).setY(0).normalize();

  let approach;

  const outbound = new THREE.CatmullRomCurve3(
    [tailP.clone()].concat(
      leadCurve(tailP, tailD, [[8, 0, 3.0], [20, -8, 8.0], [35, -19, 14]])),
    false, 'centripetal', 0.5);

  /* --------------------------- Đường bay ---------------------------------
     Hai ống lồng nhau trên cùng một tuyến, chứ không phải một:

       · `trailGlow` — ống to, màu liền, alpha thấp. Đây là quầng sáng hắt ra
         mặt bản đồ. Không có nó thì nét gạch trông như dán đè lên ảnh.
       · `trail` — ống mảnh, nét gạch bo tròn hai đầu, lõi trắng.

     Không gộp làm một được: muốn vừa mảnh vừa có quầng thì phải biết đâu là
     "bề ngang" của ống trên màn hình, mà uv.y của TubeGeometry chạy vòng theo
     chu vi nên chỗ nào là mép còn tuỳ hướng khung Frenet ở đoạn đó. Hai ống
     thì khỏi phải đoán.

     Cả hai dùng chung một uniform uHead (0..1 = đã bay tới đâu) — frame() ghi
     vào cả hai qua mảng `trailMats`.                                        */
  const TRAIL_HEAD = { value: 0 };
  const trailVert = `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

  /* Bán kính hai ống đi ĐÔI VỚI NHAU, tỉ lệ ~3,6 lần: quầng phải rộng hơn lõi
     đủ nhiều thì mới ra vẻ ánh hắt xuống mặt bản đồ, sát quá thì thành cái
     viền, mà rộng quá thì quầng nối liền các nét lại thành một dải và mất
     luôn cảm giác nét đứt. Thu nét gạch thì phải thu cả hai theo đúng tỉ lệ
     đó, không thì quầng tự nhiên hoá rộng tương đối (0,38 / 0,105).        */
  const trailGlow = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 400, 0.38, 10, false),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,      // blend thường, xem ghi chú ở vòng sáng
      uniforms: { uHead: TRAIL_HEAD },
      vertexShader: trailVert,
      fragmentShader: `
        uniform float uHead; varying vec2 vUv;
        void main(){
          if (vUv.x > uHead) discard;
          // Đừng viết smoothstep(0.10, 0.0, x): edge0 > edge1 là hành vi KHÔNG
          // xác định theo chuẩn GLSL. Có driver trả 1 ở mọi điểm, thế là cả
          // quầng sáng bị pha trắng. Đảo bằng 1.0 - smoothstep.
          float head = 1.0 - smoothstep(0.0, 0.10, uHead - vUv.x);
          vec3 col = mix(vec3(0.22, 0.78, 0.98), vec3(1.0), head * 0.55);
          gl_FragColor = vec4(col, 0.15 + 0.20 * head);
        }`
    })
  );
  trailGlow.renderOrder = 3;
  scene.add(trailGlow);

  const trail = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 700, 0.105, 10, false),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uHead: TRAIL_HEAD },
      vertexShader: trailVert,
      fragmentShader: `
        uniform float uHead; varying vec2 vUv;
        void main(){
          if (vUv.x > uHead) discard;

          // Nét gạch: bo tròn hai đầu bằng smoothstep hai phía, không cắt
          // vuông — cắt vuông thì ở cỡ này trông như hàng răng cưa.
          // Số nhịp trên toàn tuyến. Càng nhiều thì mỗi nét càng ngắn, mà tỉ
          // lệ nét/khoảng hở thì giữ nguyên vì mấy ngưỡng dưới đây tính theo
          // phần lẻ của nhịp chứ không theo chiều dài thật.
          float cyc  = vUv.x * 120.0;
          float seg  = fract(cyc);
          float dash = smoothstep(0.02, 0.16, seg) * (1.0 - smoothstep(0.46, 0.60, seg));

          // Nền là cyan, cứ chín nhịp chen một nhịp hồng. Trước đây hai màu đan
          // nhau bằng sin() nên nhịp nào cũng ngả tím; điểm nhấn thưa thế này
          // mới ra được vẻ "chấm mốc" trên bản đồ du lịch. Con số này đi theo
          // số nhịp ở trên — nhịp ngắn lại thì phải thưa ra, nếu không khoảng
          // cách giữa hai chấm hồng trên màn cũng co lại theo.
          float pink = step(8.5, mod(floor(cyc), 9.0));
          vec3 col = mix(vec3(0.35, 0.85, 0.99), vec3(1.00, 0.32, 0.72), pink);

          // lõi trắng giữa mỗi nét, cho nó ra dáng đèn chứ không phải vệt sơn
          float core = 1.0 - smoothstep(0.0, 0.26, abs(seg - 0.31));
          col = mix(col, vec3(1.0), core * 0.5);

          float head = 1.0 - smoothstep(0.0, 0.05, uHead - vUv.x);   // loé ở mũi đường
          gl_FragColor = vec4(mix(col, vec3(1.0), head * 0.5), dash * (0.92 + 0.08 * head));
        }`
    })
  );
  trail.renderOrder = 4;
  scene.add(trail);

  /* ------------------------------- Máy bay -------------------------------
     Model OBJ nặng 13 MB, tải xong mới dựng được. Trong lúc chờ vẫn phải có
     cái gì đó bay trên tuyến, nên ảnh cắt 07-may-bay.png ở lại làm quân
     thế chỗ; model về tới đâu thì thế chân tới đó.

     Rig ba tầng, mỗi tầng đúng MỘT phép xoay quanh một trục để không dính
     nhập nhằng thứ tự Euler:
       planeRig  — đặt trên tuyến, lookAt() theo tiếp tuyến (mũi = +Z)
       planeRoll — nghiêng cánh khi cua, xoay quanh chính trục bay
       holder    — nắn trục của model về trục của rig, kèm tỉ lệ           */
  /* Cao hơn đường bay bao nhiêu. Tuyến giờ nằm sát mặt bản đồ (TRAIL_Y 0,22)
     nên con số này gánh luôn cả độ cao bay: 2,4 là đủ để nhìn ra máy bay đang
     ở trên không chứ không trượt trên đất, mà chưa tách hẳn khỏi nét gạch bên
     dưới — trong ảnh mẫu hai thứ vẫn đọc là một.                            */
  const PLANE_LIFT = 2.4;
  const PLANE_LEN  = 4.6;                    // dài thân, tính bằng đơn vị thế giới

  const planeTex = await load(BASE + '/07-may-bay.png');
  const pA = aspectOf('07-may-bay.png');
  const PLANE_W = 3.4;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(PLANE_W, PLANE_W / pA),
    new THREE.MeshBasicMaterial({ map: planeTex, transparent: true, depthWrite: false })
  );
  plane.renderOrder = 6;
  scene.add(plane);

  const planeRig = new THREE.Group();
  const planeRoll = new THREE.Group();
  planeRig.add(planeRoll);
  planeRig.visible = false;                  // bật lên khi model về
  scene.add(planeRig);

  /* Nhãn bám theo máy bay. Dựng bằng JS chứ không đặt sẵn trong index.html:
     nó chỉ có nghĩa khi cảnh WebGL chạy được, mà nhánh đường lui thì không. */
  const tag = document.createElement('div');
  tag.className = 'fm-tag';
  tag.setAttribute('aria-hidden', 'true');
  stage.appendChild(tag);

  /* Bản đồ, địa danh và đường bay đều dùng vật liệu Basic/Shader nên không
     ăn đèn — mấy nguồn sáng dưới đây chỉ phục vụ đúng cái model. Hemisphere
     lo phần sáng nền (trời trắng xanh / hắt lên từ mặt bản đồ nhạt màu),
     directional lo khối và vệt sáng chạy dọc thân. */
  scene.add(new THREE.HemisphereLight(0xdff2ff, 0xf4efe6, 1.15));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(-6, 12, 8);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xbfe6ff, 0.55);
  rimLight.position.set(7, 4, -9);
  scene.add(rimLight);

  /* ------------------------------ Trạng thái -----------------------------
     Cảnh này ôm cả khối chữ "Nguyên tắc dựng chuyến" lẫn chuyến bay, nên tiến
     độ cuộn (0..1 trên toàn cú máy) chia làm bốn pha. Các mốc GỐI LÊN NHAU có
     chủ ý — chữ chưa tan hẳn thì nền trắng đã bắt đầu tan và bản đồ đã bắt
     đầu hiện. Đó là thứ làm hai khối cũ dính lại thành một cảnh liền chứ
     không phải hai cảnh nối đuôi:

       0.00 → 0.34  máy bay lượn vào từ ngoài khung, bản đồ còn là bóng mờ
                    trên nền trắng, chữ đang được đọc (js/statement-motion.js
                    lo phần chữ);
       0.24 → 0.44  màn nền trắng tan để lộ trời, bản đồ hiện rõ dần — bắt đầu
                    cùng lúc camera hạ góc, và chỉ nhỉnh trước mốc chữ tan
                    (26%) một chút: sớm hơn nữa là chữ chìm vào nền;
       0.24 → 0.48  camera hạ góc, từ nhìn thẳng xuống thành nhìn chéo;
       0.34 → 0.92  chuyến bay Việt Nam → Nhật Bản, tính lại về 0..1;
       0.92 → 1.00  máy bay ngóc lên rời khung, camera lùi nhẹ, nhả xuống
                    lưới tour ở section kế tiếp.

     Mốc chữ nằm trong statement-motion.js dưới dạng % của cùng quãng cuộn
     này; sửa bên nào thì ngó sang bên kia một cái.                          */
  const P_MAP0 = 0.24, P_MAP1 = 0.44;      // bản đồ hiện + màn trắng tan
  const P_TILT0 = 0.24, P_TILT1 = 0.48;    // camera: nhìn thẳng xuống -> nhìn chéo
  const P_FLY0 = 0.34, P_FLY1 = 0.92;      // chặng bay chính trên tuyến

  const stopT = marks.map((_, i) => i / (marks.length - 1));   // vị trí mỗi điểm trên tuyến
  let progress = 0;                                            // 0..1 do cuộn quyết định
  const tmp = new THREE.Vector3();
  const flyPos = new THREE.Vector3(), flyTan = new THREE.Vector3();
  const aheadPos = new THREE.Vector3(), aheadTan = new THREE.Vector3();
  let bank = 0;                                                // độ nghiêng cánh hiện tại
  let veilNow = -1;                                            // --fm-veil đang đặt, -1 = chưa ghi lần nào

  /* --- trạng thái rê chuột ---
     Vùng bắt là một hình cầu quanh máy bay, thử bằng ray–sphere thuần toán.
     Bắn tia vào 162 nghìn tam giác của model mỗi lần chuột nhúc nhích thì
     phí vô lý, mà đây chỉ cần một vùng bắt rộng rãi cho vật đang di chuyển.  */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hitSphere = new THREE.Sphere(new THREE.Vector3(), PLANE_LEN * 0.48);
  const planeMats = [];                    // vật liệu model, để chỉnh phát sáng
  const emissive = new THREE.Color(0x2ad4ff);
  const tmpB = new THREE.Vector3();        // riêng cho phần chiếu nhãn, đừng đụng tmp
  let pointerIn = false;                   // chuột có đang trong canvas không
  let hovered = false, hover = 0;          // đích 0/1 và giá trị đã làm mượt
  let cursor = '';                         // con trỏ đang đặt, tránh ghi lại mỗi khung
  let vw = 1, vh = 1;                      // cỡ canvas, dùng để chiếu nhãn ra px
  let hotMark = null;                      // địa danh con trỏ đang chỉ vào
  let shown = 0;                           // `open` của khung vừa vẽ, để bắt điểm ngoài frame()

  /* --------------------------- Bắt điểm địa danh --------------------------
     Trả về địa danh dưới con trỏ, hoặc null.

     Hai lớp lọc, cả hai đều cần:

     · `shown` — chỉ bắt khi camera đã nghiêng đủ để các tấm địa danh thật sự
       hiện ra. Suốt pha đọc chữ chúng vẫn nằm nguyên trong scene ở opacity 0;
       thiếu lọc này thì bấm vào nền trắng cũng bật thẻ lên.

     · alpha của texture — mỗi địa danh là một tấm PNG đã tách nền, phần lớn
       diện tích tấm ảnh là trong suốt. Bắn tia trúng hình chữ nhật là kể như
       trúng thì con trỏ đổi thành bàn tay lúc còn ở giữa vùng trời trống cạnh
       hòn đảo — cảm giác vùng bấm to hơn thứ nhìn thấy, rất khó chịu. Ngưỡng
       40/255 bỏ luôn phần rìa mờ.

     Ma trận của mấy tấm này là của khung vừa render — đúng thứ đang thấy trên
     màn, nên không cần updateMatrixWorld ở đây.                              */
  function pickMark() {
    if (shown < 0.35) return null;
    // frame() vừa đổi scale và hướng quay của mấy tấm này, mà ma trận thế giới
    // thì phải tới lượt render() mới được tính lại — cùng cái bẫy lệch một
    // khung đã xử lý cho camera ở đầu hoverPass().
    for (const mesh of markMeshes) mesh.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    for (const h of raycaster.intersectObjects(markMeshes, false)) {
      const m = h.object.userData.mark;
      if (!m) continue;
      if (!m.hit || !h.uv) return m;             // không đọc được alpha -> lấy cả ô chữ nhật
      const N = HIT_N;
      const x = Math.min(N - 1, Math.max(0, Math.floor(h.uv.x * N)));
      // uv.y đi từ dưới lên, còn lưới alpha đọc từ hàng trên xuống
      const y = Math.min(N - 1, Math.max(0, Math.floor((1 - h.uv.y) * N)));
      if (m.hit[y * N + x] > 40) return m;
    }
    return null;
  }
  const markMeshes = marks.map(m => m.mesh);

  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

  /** Chữ trên nhãn bám máy bay, theo pha đang chạy */
  function planeLabel(p, t) {
    if (p < P_FLY0) return 'Khởi hành · ' + marks[0].label;
    if (p > P_FLY1) return 'Điểm cuối · ' + marks[marks.length - 1].label;
    for (let i = 0; i < marks.length; i++)
      if (t < stopT[i] - 0.02) return 'Đang tới · ' + marks[i].label;
    return 'Điểm cuối · ' + marks[marks.length - 1].label;
  }

  /* ---------------------- Ghép ba đoạn thành một đường --------------------
     Ghi vị trí + hướng bay tại tiến độ `p` vào hai vector truyền vào, rồi trả
     về tiến độ trên TUYẾN CHÍNH (0..1). Giá trị trả về đó mới là thứ điều
     khiển đường bay, địa danh và nhãn — hai đoạn dẫn/thoát kẹp nó ở 0 và 1 để
     những thứ kia đứng yên trong lúc máy bay còn đang vào hoặc đã ra khung. */
  function flightAt(p, pos, tan) {
    if (p < P_FLY0) {
      const u = clamp01(p / P_FLY0);
      approach.getPointAt(u, pos); approach.getTangentAt(u, tan);
      return 0;
    }
    if (p <= P_FLY1) {
      const t = (p - P_FLY0) / (P_FLY1 - P_FLY0);
      curve.getPointAt(t, pos); curve.getTangentAt(t, tan);
      return t;
    }
    const u = clamp01((p - P_FLY1) / (1 - P_FLY1));
    outbound.getPointAt(u, pos); outbound.getTangentAt(u, tan);
    return 1;
  }

  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    vw = w; vh = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    buildApproach();      // mốc vào khung đo theo khổ màn, xem mục Camera

    /* Khổ thẻ nội dung đo theo bề rộng khung (width: clamp(..., 27vw, ...)),
       mà chữ xuống dòng khác đi thì chiều cao cũng khác — đo lại rồi bắt
       placeNote() tính lại chỗ đặt. Chỉ đo khi thẻ đang mở: lúc đóng nó
       display:none, offsetHeight trả về 0. */
    placed = '';
    if (openMark) { noteW = note.offsetWidth; noteH = note.offsetHeight; }
  }

  /* ------------------------------- Camera --------------------------------
     Camera đứng yên một chỗ, treo trên tâm bản đồ và luôn ngắm vào tâm. Suốt
     chuyến bay nó không nhúc nhích: bản đồ nằm im, mọi chuyển động trong
     khung đều là của máy bay. Việc duy nhất nó làm là hạ góc trong pha mở
     màn — từ nhìn thẳng xuống thành nhìn chéo.

     TILT_FLAT không để 0 tuyệt đối: hướng nhìn trùng trục up thì lookAt suy
     biến, không tính ra nổi hướng xoay. 2,3° thì mắt vẫn thấy là thẳng.     */
  const TILT_FLAT = 0.040;                    // rad — pha mở màn, coi như thẳng đứng
  const TILT_VIEW = 0.700;                    // rad ~40° — góc ngồi xem chuyến bay
  const FIT_PAD   = 1.06;                     // chừa chút lề quanh khung ngắm

  /* Khung ngắm là hộp bao của thứ THỰC SỰ cần thấy — năm tấm địa danh cộng
     đường bay — chứ không phải cả tấm bản đồ. Bản đồ 64×36 mà tuyến bay chỉ
     nằm gọn trong khoảng nửa đó; ngắm cả tấm thì rìa trống chiếm hết khung,
     địa danh co lại còn tí xíu. Hộp này bị kẹp lại trong biên bản đồ để
     không bao giờ đòi nhìn ra ngoài mép ảnh.                                */
  const viewBox = new THREE.Box3();
  const boxPt = new THREE.Vector3();
  for (let i = 0; i <= 60; i++) viewBox.expandByPoint(curve.getPointAt(i / 60));
  for (const m of marks) {
    const hw = m.size * 0.6;                              // nửa bề ngang tấm ảnh
    const h  = m.mesh.geometry.parameters.height * 1.2;   // chừa cả phần nhô cao
    viewBox.expandByPoint(boxPt.set(m.at.x - hw, 0, m.at.z - hw));
    viewBox.expandByPoint(boxPt.set(m.at.x + hw, h, m.at.z + hw));
  }
  viewBox.min.x = Math.max(viewBox.min.x, -MAP_W / 2);
  viewBox.max.x = Math.min(viewBox.max.x, MAP_W / 2);
  viewBox.min.z = Math.max(viewBox.min.z, -MAP_H / 2);
  viewBox.max.z = Math.min(viewBox.max.z, MAP_H / 2);

  const VIEW_AIM = viewBox.getCenter(new THREE.Vector3());
  const VIEW_HALF = viewBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);

  /** Khoảng cách tối thiểu để cả khung ngắm lọt khung hình ở một góc nghiêng.
   *
   *  Giải thẳng chứ không dò: đặt camera ở C = A − d·F (A là điểm ngắm, F là
   *  hướng nhìn), thì điểm P có độ sâu (P−A)·F + d, còn toạ độ ngang/dọc
   *  trong khung lại không phụ thuộc d. Ép |e·R| ≤ tanX·độ_sâu và
   *  |e·U| ≤ tanY·độ_sâu cho tám đỉnh hộp là ra ngay chặn dưới của d.
   *
   *  Với F = (0,−cos,−sin), R = (1,0,0), U = (0,sin,−cos).                 */
  function fitDistance(tilt) {
    const tanY = Math.tan(camera.fov * Math.PI / 360);
    const tanX = tanY * camera.aspect;
    const c = Math.cos(tilt), s = Math.sin(tilt);
    let d = 0;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const ex = sx * VIEW_HALF.x, ey = sy * VIEW_HALF.y, ez = sz * VIEW_HALF.z;
      const behind = ey * c + ez * s;                     // = −e·F
      d = Math.max(d,
        Math.abs(ex) / tanX + behind,
        Math.abs(ey * s - ez * c) / tanY + behind);
    }
    return d;
  }

  /* ------------------- Đoạn dẫn: vào khung từ mép phải --------------------
     Máy bay phải trượt vào bằng cạnh dài của khung hình, không chui lên từ
     góc dưới và cũng không hiện ra sẵn giữa trời.

     Mốc vào KHÔNG đóng cứng mà tính lại mỗi lần đo khung hình, vì khung rộng
     bao nhiêu là do tỉ lệ màn quyết định qua fitDistance. Một con số cố định
     thì hoặc hụt trên màn siêu rộng — đo thử: cùng mốc x = 30 thì ở tỉ lệ
     2,4 còn nằm ngoài khung nhưng tới 3,0 đã lọt hẳn vào trong — hoặc thừa
     trên màn hẹp, cuộn cả nửa màn hình mới thấy máy bay.

     Lúc mở màn camera gần như nhìn thẳng xuống, nên trục x thế giới trùng
     trục ngang màn hình. Khung ở cao độ mốc vào hẹp hơn khung ở mặt phẳng
     ngắm (gần camera hơn), nên phải lấy độ sâu tại đúng cao độ đó.           */
  const LEAD_TOP = 9.0;                       // cao độ mốc vào
  const LEAD_OUT = 4.5;                       // đẩy thêm ra ngoài mép cho khuất hẳn

  function buildApproach() {
    const d = fitDistance(TILT_FLAT) * FIT_PAD;
    const camY = VIEW_AIM.y + d * Math.cos(TILT_FLAT);
    const tanX = Math.tan(camera.fov * Math.PI / 360) * camera.aspect;
    const x0 = VIEW_AIM.x + tanX * (camY - (LEAD_TOP + PLANE_LIFT)) + LEAD_OUT;

    // vào ngang tầm giữa khung theo chiều dọc
    const P0 = new THREE.Vector3(x0, LEAD_TOP, VIEW_AIM.z);

    /* Mốc áp chót lùi thẳng theo hướng vào tuyến, lệch ngang 0: với đường
       CatmullRom hở, three.js suy điểm ma ở hai đầu nên tiếp tuyến tại mút
       đúng bằng đoạn thẳng cuối — cho nó trùng hướng tuyến thì chỗ giao ca
       sang chặng bay không bẻ lái.                                          */
    const P2 = headP.clone().addScaledVector(headD, -8).setY(2.0);
    const P1 = P0.clone().lerp(P2, 0.5).setY(5.0);

    approach = new THREE.CatmullRomCurve3([P0, P1, P2, headP.clone()],
                                          false, 'centripetal', 0.5);
  }
  buildApproach();      // layout() dựng lại với khổ thật, nhưng phải có sẵn một cái

  function frame() {
    const p = clamp01(progress);
    const open = smooth(P_TILT0, P_TILT1, p);       // 0 = còn thẳng, 1 = nghiêng hẳn
    const mapIn = smooth(P_MAP0, P_MAP1, p);        // bản đồ: bóng mờ -> rõ hẳn
    const out = smooth(P_FLY1, 1, p);               // pha thoát ở cuối cảnh
    const t = flightAt(p, flyPos, flyTan);          // tiến độ trên tuyến chính

    /* Bản đồ chỉ là bóng mờ trong lúc người đọc còn ở khối chữ. Không tắt hẳn
       về 0: còn thấy thấp thoáng hình đại lục thì cú lượn của máy bay mới có
       chỗ để bám vào, tắt sạch thì nó thành vật thể trôi giữa nền trống.    */
    map.material.opacity = 0.12 + 0.88 * mapIn;

    /* Màn nền trắng của pha đọc (.fm-stage::before) tan theo đúng nhịp bản đồ
       hiện. Ghi qua biến CSS chứ không đụng thẳng vào style.background: cách
       này để phần màu nằm trọn trong style.css, JS chỉ cấp một con số.

       Chỉ ghi khi giá trị đổi đáng kể — mỗi lần gán style là một lần trình
       duyệt phải tính lại style, mà hàm này chạy mỗi khung hình.            */
    const veil = 1 - mapIn;
    if (Math.abs(veil - veilNow) > 0.004) {
      veilNow = veil;
      stage.style.setProperty('--fm-veil', veil.toFixed(3));
    }

    /* Mây trôi bằng cách dịch toạ độ texture, không dời mesh: mặt phẳng đứng
       yên đúng khổ bản đồ nên mặt nạ mờ mép vẫn khớp, mà dịch UV thì trôi
       được vô tận chứ không phải kéo tấm ảnh ra khỏi khung rồi thả về.

       Tính theo ĐỒNG HỒ chứ không cộng dồn mỗi khung: máy yếu tụt xuống 30
       khung/giây thì mây vẫn trôi đúng tốc độ đó, và vòng lặp bên dưới cũng
       cố tình bỏ bớt khung lúc rảnh.

       Mờ theo mapIn: nửa đầu cảnh nền còn trắng, mây nổi lên đó thành mấy vệt
       xám vô duyên ngay sau lưng khối chữ.                                  */
    const secs = performance.now() * 0.001;
    for (const c of clouds) {
      c.tex.offset.x = (c.cycle * secs) % 1;
      c.mesh.material.opacity = c.opacity * mapIn;
    }

    // máy bay: bám đường, mũi hướng theo tiếp tuyến (kể cả chúc/ngóc theo độ
    // dốc), nghiêng cánh vào phía trong mỗi khúc cua
    if (planeRig.visible) {
      planeRig.position.copy(flyPos).setY(flyPos.y + PLANE_LIFT);
      planeRig.lookAt(tmp.copy(planeRig.position).add(flyTan));

      // Nhìn trước một nhịp theo TIẾN ĐỘ CẢNH chứ không theo t: ở hai đoạn dẫn
      // và thoát thì t đứng yên ở 0/1, lấy t+0.02 sẽ ra đúng một hướng và máy
      // bay lượn vòng mà cánh cứ phẳng lì.
      flightAt(Math.min(1, p + 0.01), aheadPos, aheadTan);

      // Dấu quay của hướng bay quanh trục Y: >0 là đang cua sang trái, mà cua
      // trái thì cánh trái phải hạ xuống — nên nghiêng ngược dấu.
      const turn = flyTan.z * aheadTan.x - flyTan.x * aheadTan.z;
      const want = Math.max(-0.6, Math.min(0.6, -turn * 5.5));
      bank += (want - bank) * 0.16;                  // vào/ra cua mượt, không giật
      planeRoll.rotation.z = bank;
    } else {
      plane.position.copy(flyPos).setY(flyPos.y + PLANE_LIFT);
      plane.lookAt(camera.position);
    }

    TRAIL_HEAD.value = t;      // một uniform dùng chung cho cả ống mảnh lẫn quầng sáng

    // camera: hạ góc trong pha mở rồi đứng im, luôn ngắm tâm khung ngắm. Cuối
    // cảnh lùi thêm một chút, vừa tiễn máy bay ra khỏi khung vừa làm cú nhả
    // xuống lưới tour đỡ đột ngột.
    // Không cần lerp quán tính ở đây — ScrollTrigger đã scrub 0.8 sẵn rồi.
    const tilt = TILT_FLAT + (TILT_VIEW - TILT_FLAT) * open;
    const d = fitDistance(tilt) * FIT_PAD * (1 + 0.09 * out);
    camera.position.set(VIEW_AIM.x, VIEW_AIM.y + d * Math.cos(tilt), VIEW_AIM.z + d * Math.sin(tilt));
    camera.lookAt(VIEW_AIM);

    /* địa danh: cả năm điểm LÚC NÀO CŨNG hiện, chỗ máy bay đang tới thì đậm
       và to hơn. Trước đây điểm chưa bay qua bị ẩn hẳn, nên phần lớn thời
       gian trong khung chỉ có một hai địa danh — cảnh trông trống trải mà
       người xem cũng không nắm được cả hành trình gồm những đâu.            */
    marks.forEach((m, i) => {
      const gap = Math.abs(t - stopT[i]);
      const on = 1 - smooth(0.05, 0.20, gap);            // 1 khi máy bay đang ở đó

      // Nhân thêm open để pha đọc chữ giấu hẳn mấy tấm này đi, camera nghiêng
      // tới đâu thì hiện tới đó. Trước đây còn một lý do nữa — tấm dựng đứng
      // nhìn thẳng từ trên xuống chỉ còn thấy cạnh mỏng dính — nhưng từ khi
      // chúng nằm song song mặt phẳng ảnh thì góc nào cũng thấy trọn; giữ lại
      // vì lý do đầu: suốt pha đọc, sau lưng chữ phải là nền trắng phẳng.
      m.mesh.material.opacity = (0.74 + 0.26 * on) * open;
      m.mesh.scale.setScalar(0.94 + 0.16 * on);

      /* Hạ về cao độ gốc, y như scale được đặt lại bằng setScalar ngay trên.
         hoverPass() nhấc tấm này lên khi rê chuột vào, và nó BẮN TIA VÀO CHÍNH
         TẤM ẢNH — thiếu dòng này thì lần bắn sau nhắm vào tấm đang ở vị trí đã
         nhấc, con trỏ tuột ra ngoài, hiệu ứng tắt, tấm hạ xuống rồi lại trúng:
         nhãn nhấp nháy quanh nửa độ đậm chứ không bao giờ sáng hẳn.         */
      m.mesh.position.y = m.baseY;

      /* Quay tấm ảnh SONG SONG VỚI MẶT PHẲNG ẢNH của camera, không phải quay
         nó về phía camera.

         Trước đây là lookAt(camera.x, y, camera.z) — dựng đứng trong không
         gian thế giới, chỉ xoay quanh trục Y. Nghe thì đúng, nhưng dưới phép
         chiếu phối cảnh các đường thẳng đứng của thế giới KHÔNG chiếu ra
         thành đường thẳng đứng trên màn: camera chúc xuống 50° nên chúng hội
         tụ về một điểm tụ, càng xa trục giữa màn thì càng nghiêng. Nhật Bản ở
         u = 0,835, lệch khoảng 21° khỏi trục ngắm, nghiêng trái tới ~15°;
         Trung Quốc gần giữa nên gần như thẳng. Xoay quanh trục Y bao nhiêu
         cũng không chữa được, vì lỗi nằm ở phép chiếu chứ không ở hướng quay.

         Chép thẳng quaternion của camera thì tấm ảnh nằm đúng trong mặt phẳng
         ảnh: trục dọc của nó trùng trục dọc màn hình ở MỌI vị trí trong khung,
         mà cũng hết luôn cả méo hình thang.

         Đổi lại tấm ảnh không còn bị nén theo chiều cao (trước bị nén còn
         cos50° ≈ 0,64 vì camera nhìn xiên xuống), nên nhìn cao hơn trước
         khoảng một nửa. Bề NGANG không đổi — `size` trong STOPS vẫn là bề
         ngang, không phải chỉnh lại. Chiều cao mới mới đúng tỉ lệ gốc của
         tấm ảnh, vốn đã được vẽ ở góc nhìn chéo sẵn.

         Phải đọc quaternion SAU camera.lookAt() ở trên — lookAt ghi thẳng vào
         quaternion nên chỗ này lấy được giá trị của đúng khung hình này.    */
      m.mesh.quaternion.copy(camera.quaternion);

      m.ring.material.opacity = (0.18 + 0.82 * on) * 0.55 * open;
      m.ring.scale.setScalar(m.size * (0.20 + 0.16 * on));
    });

    /* Cuộn ngược về pha đọc chữ thì các tấm địa danh mờ đi hết, mà thẻ nội
       dung lại neo vào khung hình chứ không vào bản đồ — để nguyên là nó lơ
       lửng trên nền trắng, chẳng còn trỏ vào đâu. Nhả sạch mọi nguồn; chấm
       hotspot cũng tự ẩn theo `shown` ở hoverPass() nên không ai còn giữ.

       Ngưỡng 0,30 thấp hơn ngưỡng bắt điểm (0,35): nếu bằng nhau thì ở đúng
       chỗ giáp ranh, một nhịp cuộn nhỏ vừa mở được thẻ đã đóng ngay.        */
    shown = open;
    if (open < 0.30) pinMark = spotMark = null;

    hoverPass(p, t);
    renderer.render(scene, camera);
  }

  /* ------------------------- Rê chuột vào máy bay -------------------------
     Chạy SAU khi camera đã chốt vị trí của khung này: vừa cần camera mới để
     bắn tia cho đúng, vừa cần cộng thêm phần nhấc lên/phóng to lên trên cái
     vị trí gốc đã đặt ở đầu frame().                                        */
  function hoverPass(p, t) {
    /* Camera vừa bị dời ở trên nhưng ma trận thế giới của nó phải tới lượt
       renderer.render() mới được tính lại. Bắn tia hay chiếu nhãn ngay lúc
       này mà không tự cập nhật thì cả hai đều lệch đúng một khung — chuột
       lúc cuộn nhanh sẽ trượt ra ngoài máy bay, nhãn thì chạy sau đuôi.   */
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    const body = planeRig.visible ? planeRig : plane;    // model, hoặc ảnh cắt lúc chờ tải
    // Tâm vùng bắt phải tính cả phần nhấc lên, nếu không máy bay bay lên còn
    // vùng bắt đứng yên: con trỏ đuổi theo là hover tắt/bật liên hồi.
    hitSphere.center.copy(body.position).setY(body.position.y + 0.55 * hover);

    if (pointerIn) {
      raycaster.setFromCamera(pointer, camera);
      hovered = raycaster.ray.intersectsSphere(hitSphere);
    } else {
      hovered = false;
    }

    hover += ((hovered ? 1 : 0) - hover) * 0.16;
    if (hover < 0.002 && !hovered) hover = 0;

    /* Máy bay giành con trỏ trước: nó là chủ thể của cảnh và đang di chuyển,
       nên lúc nó bay ngang qua một hòn đảo thì phải là nó ăn chuột, không thì
       vùng bắt của địa danh đứng yên bên dưới cướp mất. */
    hotMark = (pointerIn && !hovered) ? pickMark() : null;
    syncNote();
    placeNote();     // camera đứng yên suốt pha bay nên hàm này gần như luôn thoát ngay

    const want = (hovered || hotMark) ? 'pointer' : '';
    if (want !== cursor) renderer.domElement.style.cursor = cursor = want;

    /* Chấm hotspot: chiếu tâm hòn đảo ra pixel màn hình. Lấy `at`/`baseY` (tư
       thế nghỉ) chứ không lấy mesh.position — position bị nhấc lên khi rê
       chuột vào, dùng nó thì chấm nhảy lên theo đúng lúc con trỏ vừa chạm
       tới, tức là tự chạy khỏi chỗ đang được trỏ.

       `sp.z > 1` là điểm đã ra sau mặt phẳng gần của camera, chiếu ra sẽ lộn
       ngược sang phía đối diện màn hình.                                    */
    const live = shown > 0.35;
    for (const m of marks) {
      const sp = tmpB.set(m.at.x, m.baseY, m.at.z).project(camera);
      const on = live && sp.z <= 1;
      if (on) {
        m.spot.style.transform =
          `translate(-50%, -50%) translate(${(sp.x * 0.5 + 0.5) * vw}px, ${(-sp.y * 0.5 + 0.5) * vh}px)`;
      }
      // Ghi class chứ không ghi style: chỉ đổi khi trạng thái đổi, còn dòng
      // transform ở trên thì khung nào cũng phải ghi.
      m.spot.classList.toggle('is-live', on);
    }

    /* Địa danh đang được trỏ vào — hoặc đang mở thẻ — thì nhấc lên, phóng nhẹ
       và vòng sáng dưới chân đậm hẳn. Cộng ĐÈ lên giá trị frame() vừa đặt,
       giống hệt cách máy bay được xử lý ngay dưới đây. Phải chạy SAU pickMark()
       ở trên: tia phải bắn vào tấm ở tư thế nghỉ, không phải tư thế đã nhấc. */
    let glowing = false;
    for (const m of marks) {
      const on = (m === hotMark || m === openMark) ? 1 : 0;
      m.glow += (on - m.glow) * 0.18;
      if (m.glow < 0.002 && !on) m.glow = 0;
      if (m.glow > 0) {
        glowing = true;
        m.mesh.position.y += 0.55 * m.glow;
        m.mesh.scale.multiplyScalar(1 + 0.10 * m.glow);
        m.ring.scale.multiplyScalar(1 + 0.16 * m.glow);
        m.ring.material.opacity = Math.min(1, m.ring.material.opacity + 0.45 * m.glow);
      }
    }

    // Nhịp thở: chỉ chạy khi đang trỏ vào, nên không tốn gì lúc bình thường.
    const puls = 0.5 + 0.5 * Math.sin(performance.now() * 0.0042);

    // máy bay: nhấc lên, phóng nhẹ, vỏ ánh lên màu cyan
    body.position.y += 0.55 * hover;
    body.scale.setScalar(1 + 0.15 * hover);
    for (const m of planeMats) {
      m.emissive.copy(emissive).multiplyScalar(hover * (0.16 + 0.10 * puls));
    }

    /* Nhãn nổi: chiếu tâm máy bay ra toạ độ pixel của canvas. CHỈ dành cho
       máy bay — địa danh không dùng nữa, vì rê vào là cả tấm thẻ đã bật ra
       với tên nơi đó in ở đầu; thêm một cái nhãn nhắc lại cùng cái tên là
       thừa, mà lúc đó trên khung có hai vật thể trắng cùng lúc.             */
    if (hover > 0.004) {
      const sp = tmpB.copy(body.position).project(camera);
      tag.style.transform =
        `translate(-50%, -100%) translate(${(sp.x * 0.5 + 0.5) * vw}px, ${(-sp.y * 0.5 + 0.5) * vh - 34}px)`;
      tag.textContent = planeLabel(p, t);
      tag.style.opacity = hover;
      // sp.z > 1 là đã ra sau mặt phẳng gần của camera, chiếu ra sẽ lộn ngược
      tag.style.visibility = sp.z > 1 ? 'hidden' : 'visible';
    } else {
      tag.style.opacity = 0;
      tag.style.visibility = 'hidden';
    }

    // Vòng lặp chỉ vẽ khi có việc; hiệu ứng này tự xin thêm khung cho tới khi
    // nhịp thở tắt hẳn, nếu không nó sẽ đứng hình giữa chừng lúc ngừng cuộn.
    if (hovered || hover > 0 || glowing) idle = Math.max(idle, 3);
  }

  /* ------------------------- Nối vào ScrollTrigger -----------------------
     Vòng vẽ có hai chế độ:

       · `idle > 0` — vừa có cuộn/chuột: vẽ liên tục vài khung cho camera
         trôi hết quán tính;
       · rảnh mà cảnh còn trong tầm nhìn: vẫn phải vẽ, vì mây trôi theo đồng
         hồ chứ không theo tiến độ cuộn. Nhưng chỉ vẽ CÁCH KHUNG một lần
         (~30 khung/giây) — mây trôi rất chậm, 30 với 60 nhìn không ra khác
         biệt mà tiết kiệm được đúng một nửa.

     Ngoài tầm nhìn thì đứng im hẳn. Cú máy này nặng, để nó quay không tải khi
     người dùng đang ở tận cuối trang là phí pin — đó là lý do vòng lặp gốc
     chỉ vẽ theo `idle`, và IntersectionObserver là thứ giữ lại được ý đó
     trong khi vẫn cho mây chạy.                                             */
  let onScreen = true;
  if ('IntersectionObserver' in window) {
    onScreen = false;
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; },
                             { rootMargin: '15% 0px' }).observe(HOST);
  }

  let idle = 0, half = 0;
  function pump() {
    if (idle > 0) { idle--; frame(); }
    else if (onScreen && (half ^= 1)) frame();
    requestAnimationFrame(pump);
  }

  layout();
  frame();
  requestAnimationFrame(pump);

  const kick = () => { idle = 40; };
  window.addEventListener('resize', () => { layout(); kick(); }, { passive: true });

  /* --- chuột ---
     Chỉ ghi lại toạ độ ở đây rồi để frame() tự thử; nếu thử ngay trong sự
     kiện thì lúc người dùng để yên chuột mà cuộn trang, máy bay chạy ra khỏi
     con trỏ mà trạng thái hover vẫn dính nguyên.

     Dùng pointer* để bút cảm ứng cũng ăn, nhưng ngón tay thì lọc ra: trên
     điện thoại một cú chạm sẽ làm máy bay sáng lên rồi kẹt luôn ở đó.      */
  const cv = renderer.domElement;
  cv.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const r = cv.getBoundingClientRect();
    pointer.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    pointerIn = true;
    kick();
  }, { passive: true });
  cv.addEventListener('pointerleave', () => { pointerIn = false; kick(); }, { passive: true });

  /* Bấm thẳng vào hòn đảo -> ghim thẻ; bấm ra chỗ trống -> nhả ghim. Chấm
     hotspot có handler riêng của nó (xem mục dựng chấm ở trên), đây là cho
     phần diện tích còn lại của hòn đảo.

     TỰ BẮN TIA LẠI ở đây thay vì đọc `hotMark` mà hoverPass() đã tính: trên
     cảm ứng thì pointermove bị lọc ra (xem chú thích ngay trên) nên hotMark
     luôn null, chạm vào đâu cũng không ghim được gì. Bắn lại thì một cú chạm
     cũng ăn y như một cú bấm chuột.

     Không cần lọc thao tác cuộn: trình duyệt vốn không phát `click` khi con
     trỏ có dịch chuyển đáng kể giữa lúc nhấn và lúc nhả.                    */
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect();
    pointer.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const m = pickMark();
    pinMark = (m && m !== pinMark) ? m : null;
    syncNote();
    kick();
  });

  /* ---------------------- Nạp model máy bay (nền) ------------------------
     Cố tình KHÔNG await: cảnh phải chạy được ngay, 13 MB này về lúc nào thì
     thế chỗ ảnh cắt lúc đó. Hỏng đường truyền hay thiếu file thì cứ giữ
     nguyên ảnh cắt, không làm sập cả cảnh.

     Thư mục có dấu cách nên phải mã hoá thành %20, MTLLoader ghép thẳng tên
     texture vào sau chuỗi này chứ không tự escape.                        */
  const PLANE_DIR = 'images/travel-map/Airplane%203d/';
  new MTLLoader()
    .setPath(PLANE_DIR)
    .setMaterialOptions({ side: THREE.DoubleSide })   // cánh là mặt mỏng, nhìn từ dưới lên đừng thủng
    .load('11803_Airplane_v1_l1.mtl', mtl => {
      mtl.preload();
      new OBJLoader().setMaterials(mtl).setPath(PLANE_DIR)
        .load('11803_Airplane_v1_l1.obj', obj => { mountPlane(obj); kick(); },
              undefined, () => {});
    }, undefined, () => {});

  function mountPlane(obj) {
    // MTLLoader đã tự đặt sRGB cho map_Kd; ở đây chỉ thêm lọc chéo cho texture
    // thân/cánh, vì camera nhìn máy bay ở góc rất xiên nên không có nó là nhoè.
    obj.traverse(o => {
      if (!o.isMesh || !o.material) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (m.map) m.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        // OBJ dùng lại một vật liệu cho nhiều mesh, gom trùng thì mỗi khung
        // lại ghi emissive mấy lượt vào cùng một đối tượng.
        if (m.emissive && !planeMats.includes(m)) planeMats.push(m);
      }
    });

    /* Đo hộp bao rồi mới đặt tỉ lệ: file xuất từ 3ds Max năm 2011, đơn vị cỡ
       nghìn, đóng cứng một con số scale là hên xui. Trục đo được từ chính
       file: X là thân (mũi ở +X), Y là sải cánh, Z là chiều cao.          */
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const mid = box.getCenter(new THREE.Vector3());

    const holder = new THREE.Group();
    /* Nắn trục model về trục rig bằng một ma trận cơ sở, thay vì chồng hai
       phép xoay Euler lên nhau: mũi X→Z, cao Z→Y, cánh Y→X.               */
    holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 0, 1),      // model +X (mũi)  -> rig +Z (hướng bay)
      new THREE.Vector3(1, 0, 0),      // model +Y (cánh) -> rig +X
      new THREE.Vector3(0, 1, 0)       // model +Z (nóc)  -> rig +Y (lên trời)
    ));
    holder.scale.setScalar(PLANE_LEN / size.x);
    // Dời tâm phải nằm ở tầng TRONG CÙNG, để nó đi qua scale/xoay của holder
    // rồi mới cộng vào — đặt cùng tầng thì offset không được nhân tỉ lệ.
    obj.position.set(-mid.x, -mid.y, -mid.z);
    holder.add(obj);
    planeRoll.add(holder);

    planeRig.visible = true;
    scene.remove(plane);
    plane.geometry.dispose();
    if (plane.material.map) plane.material.map.dispose();
    plane.material.dispose();
  }

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: HOST,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      onUpdate(self) { progress = self.progress; kick(); },
      onRefresh() { layout(); kick(); }
    });
    window.addEventListener('load', () => ScrollTrigger.refresh());
  } else {
    // Không có GSAP thì vẫn cho xem: tự tính tiến độ từ vị trí cuộn.
    const manual = () => {
      const r = HOST.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      progress = travel > 0 ? clamp01(-r.top / travel) : 0;
      kick();
    };
    window.addEventListener('scroll', manual, { passive: true });
    manual();
  }

  HOST.classList.add('is-live');
  if (fallback) fallback.setAttribute('aria-hidden', 'true');
}

/** Vân mây: mảng trắng mềm trên nền trong suốt, LẶP LIỀN MẠCH cả hai trục.
 *
 *  Dựng bằng canvas chứ không dùng images/cloud-*.png: mấy tấm đó là ảnh nền
 *  cho lớp CSS, không đảm bảo có kênh alpha — đắp thẳng lên WebGL là ra hộp
 *  trắng, đúng cái bẫy đã dính với bộ ảnh bản đồ (xem README).
 *
 *  Mỗi vệt mây được vẽ 9 lần, ở chính nó và 8 ô xung quanh, nên vệt nào chạm
 *  mép cũng có phần nối lại ở mép đối diện. Thiếu bước này là lúc trượt UV sẽ
 *  thấy một đường cắt dọc chạy qua màn hình mỗi vòng.
 *
 *  Nhiễu lấy từ LCG với hạt giống cố định, không phải Math.random: cùng một
 *  hình mây ở mọi lần tải trang, để còn canh được bố cục.                    */
function cloudTexture(seed) {
  const W = 512, H = 256, BLOBS = 26;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

  for (let i = 0; i < BLOBS; i++) {
    const x = rnd() * W, y = rnd() * H;
    const r = (0.07 + rnd() * 0.15) * W;
    const a = 0.20 + rnd() * 0.5;
    for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0,    'rgba(255,255,255,' + a + ')');
      g.addColorStop(0.55, 'rgba(255,255,255,' + (a * 0.34) + ')');
      g.addColorStop(1,    'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Mặt nạ alpha: trắng ở giữa, mờ dần về 0 ở bốn mép.
 *
 *  `w` là bề rộng dải mờ (đơn vị UV), một số cho cả bốn cạnh hoặc một object
 *  {far, near, side} — xem chú thích ở chỗ gọi để biết vì sao phải tách.
 *
 *  Ba thứ quyết định chỗ chuyển có "vuông" hay không:
 *
 *  1. ĐƯỜNG CONG TẮT. smoothstep một lần có đạo hàm bậc một bằng 0 ở hai đầu
 *     nhưng bậc hai thì không, mà mắt người bắt chính chỗ gãy đạo hàm bậc hai
 *     (dải Mach) — nó hiện ra thành một đường viền mảnh ở nơi sương "hết".
 *     Bọc smoothstep hai lần thì cả hai bậc đều triệt tiêu ở hai đầu, chỗ nối
 *     với nền tan hẳn, đổi lại quãng giữa dốc hơn (không sao, nó nằm giữa
 *     dải chuyển chứ không phải ở mép).
 *
 *  2. GÓC. Nhân hai ramp theo trục cho ra đường đồng mức hình chữ nhật bo
 *     góc — nhìn ra ngay là một tấm ảnh chữ nhật đang mờ mép. Nhân thêm một
 *     số hạng theo bán kính siêu elip (mũ 3) để riêng bốn góc tan sớm hơn
 *     cạnh, đường bao thành hình bầu chứ không phải khung tranh. Số hạng này
 *     chỉ ăn ở vùng r > 1, tức đúng bốn góc, không đụng tới giữa các cạnh.
 *
 *  3. ĐỘ PHÂN GIẢI. 128px kéo ngang màn 4K thì mỗi texel gánh ~15px; alpha
 *     8-bit trên dải thoải thế này bị chia bậc thấy được. 512 là đủ mịn mà
 *     vẫn chỉ tốn 0,25 MB, dựng một lần lúc khởi tạo.                       */
function edgeFade(w) {
  const W = typeof w === 'number' ? { far: w, near: w, side: w } : w;
  const N = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(N, N);

  const ease = t => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const s = t * t * (3 - 2 * t);
    return s * s * (3 - 2 * s);
  };
  // Bán kính siêu elip: 0 ở tâm, 1 ở giữa mỗi cạnh, ~1,26 ở góc.
  const R_CORNER = Math.cbrt(2);

  for (let y = 0; y < N; y++) {
    /* y = 0 là hàng TRÊN của canvas. CanvasTexture mặc định flipY nên hàng đó
       ứng với mép trên của ảnh bản đồ, tức mép XA (phía bắc) trong cảnh. */
    const v = (y + 0.5) / N;
    const fv = ease(Math.min(v / W.far, (1 - v) / W.near));
    for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / N;
      const fu = ease(Math.min(u, 1 - u) / W.side);
      const r = Math.cbrt(Math.abs(2 * u - 1) ** 3 + Math.abs(2 * v - 1) ** 3);
      const corner = ease((R_CORNER - r) / (R_CORNER - 1));
      const a = Math.round(255 * fu * fv * corner);
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = a;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

/* Lưới alpha 64×64 rút từ texture, cho pickMark() biết chỗ nào của tấm ảnh là
   hình thật chỗ nào là nền trong suốt. Thu về đúng cỡ này là đủ: vùng bấm chỉ
   cần khớp với cái mắt nhìn thấy, sai một hai pixel không ai nhận ra, mà 4 KB
   một địa danh thì rẻ hơn hẳn việc giữ lại cả tấm ảnh gốc.

   getImageData ném lỗi khi canvas bị "nhuộm bẩn" — mở trang bằng file:// là
   dính ngay, vì trình duyệt coi mọi ảnh cục bộ là khác nguồn. Trả null để
   pickMark() lùi về bắt cả ô chữ nhật: vùng bấm rộng hơn thứ nhìn thấy một
   chút, nhưng vẫn bấm được, còn hơn là hỏng hẳn lúc xem thử offline.        */
const HIT_N = 64;
function alphaGrid(tex) {
  if (!tex || !tex.image) return null;
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = HIT_N;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(tex.image, 0, 0, HIT_N, HIT_N);
    const d = ctx.getImageData(0, 0, HIT_N, HIT_N).data;
    const g = new Uint8Array(HIT_N * HIT_N);
    for (let i = 0; i < g.length; i++) g[i] = d[i * 4 + 3];
    return g;
  } catch (err) {
    return null;
  }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}
