# Vivu Travel — Web đặt tour (bản điện ảnh)

Website đặt tour chạy thuần HTML/CSS/JS, **không build**. Tải từ ngoài đúng hai thứ: font
Be Vietnam Pro và **GSAP + ScrollTrigger** (dùng cho cảnh hành trình — xem mục bên dưới).
Không có GSAP thì khối chữ của cảnh đó giữ nguyên trạng thái tĩnh còn phần canvas tự tính tiến độ
cuộn lấy; phần còn lại của trang không phụ thuộc.
Nằm riêng trong `booking/`, không ảnh hưởng các site cũ (`/index.html`, `travel/`, `journey/`, `dive/`).

Node chỉ dùng cho **một việc duy nhất**: trích chuỗi ảnh cho cú máy mở đầu (`npm run frames`).
Trang chạy thật không cần Node, không cần bundler.

## Chạy thử

Phải chạy qua server tĩnh — mở thẳng bằng `file://` thì trình duyệt chặn `fetch()`
nên cú máy mở đầu sẽ lui về phát video thay vì tua theo cuộn:

```powershell
cd d:\Draft\booking
python -m http.server 5500      # http://localhost:5500
```

## Sinh chuỗi ảnh cho cú máy mở đầu

Thư mục `frames/hero/` **sinh ra từ `video/hero.mp4`**, không sửa tay. Thay video xong thì chạy lại:

```powershell
cd d:\Draft\booking
npm install        # lần đầu — kéo FFmpeg về devDependencies
npm run frames
```

Cấu hình đang dùng — **16fps · 1920px · q82**:

```powershell
$env:FRAME_FPS=16; $env:FRAME_WIDTH=1920; $env:FRAME_QUALITY=82; npm run frames
```

**Đừng thu nhỏ chiều rộng.** Video gốc 1920px, mà `<canvas>` vẽ ở `clientWidth × devicePixelRatio`
— màn hình DPR 2 rộng 1440px cần tới 2880px. Trích ở 1280px thì ảnh bị phóng ngược 2,25 lần
và mờ thấy rõ. Giữ 1920px là mức nét nhất có thể lấy từ nguồn này.

Chọn **số khung theo quãng cuộn**, không theo fps gốc: hero cao 500vh nên quãng tua là 400vh.
Cỡ **5–10px cuộn cho một khung** là đủ mượt — 16fps × 26,36s = 422 khung ứng với ~7,6px/khung.
Đẩy lên 24fps chỉ nặng thêm 1,5× chứ mắt không thấy khác.

| Chiều rộng | Chất lượng | KB/khung | 422 khung |
|---|---|---|---|
| 1280 | 80 | 57 | 23,5 MB |
| 1600 | 82 | 80 | 32,9 MB |
| **1920** | **82** | **99** | **40,6 MB** |
| 1920 | 90 | 157 | 64,8 MB |

Tổng dung lượng **không phải** lượng tải về: khách không cuộn chỉ tải ~25 khung (~2,5 MB).

## Ngôn ngữ thiết kế

| Hạng mục | Quy định |
|---|---|
| Phong cách | Điện ảnh, hiện đại, sang trọng — **nền trắng**, khoảng thở rộng, ít đường viền |
| Màu | Nền `#ffffff` / `#f4f7fa`, mực navy `#0a2138`, biển `#0d4f7d`/`#2ea6dc`, hoàng hôn `#e85c22`/`#ff7a3c` |
| Đảo tông | Riêng 3 cú máy toàn khung (hero, lặn, hoàng hôn) giữ lớp phủ tối + chữ trắng vì chữ nằm trực tiếp trên ảnh |
| Chữ | Be Vietnam Pro duy nhất. Tiêu đề weight 200 cỡ tới `9.5rem`, letter-spacing âm. Nhãn 0.7rem, tracking `.3em` |
| Ảnh | Phong cảnh thật, đã resize + grade màu sẵn trong `images/` |
| Chuyển động | Camera 3D thật (perspective + translateZ), parallax theo lớp, độ sâu, lia ngang |

## Nguyên tắc: cuộn trang = điều khiển camera

Mỗi khối lớn là một **cú máy** (`.shot`). JS chỉ tính một con số duy nhất — tiến độ cuộn
`--p` (0→1) của cú máy đó — rồi CSS dàn dựng toàn bộ chuyển động bằng `calc()`.

```
.shot            khung cuộn, cao 220–340vh
└ .stage         sticky, 100vh, perspective: 1000px
  └ .world       khối 3D, camera dịch chuyển bằng translate3d(...)
    └ .layer     các lớp đặt ở độ sâu Z khác nhau
```

Lớp được đặt ở `translateZ` cố định và scale bù lại để luôn phủ kín khung hình:

| `data-depth` | Z | Scale bù |
|---|---|---|
| `far` | −1200px | 2.2 |
| `mid` | −620px | 1.62 |
| `near` | −260px | 1.26 |

Vì camera chỉ dịch chuyển **một lần** trên `.world`, hiệu ứng parallax do chính trình duyệt
tính ra từ phối cảnh — không phải parallax giả bằng cách nhân tốc độ cuộn.

**Các cú máy:**

1. **Mở đầu** (500vh) — **tua video theo cuộn.** Cuộn tới đâu, khung hình đi tới đó.
   `.stage` ghim lại (sticky), 400vh dôi ra chính là thanh tua. Tiêu đề và form tìm tour nằm
   trong `.stage` nên bị ghim theo: đứng yên, luôn đọc và bấm được suốt cú máy.

   Phần nền do `js/scroll-scrub.js` lo, **không** dùng `--p` như các cú máy khác — nó tự tính
   tiến độ cuộn lấy. Đặt thẳng `video.currentTime` sẽ giật: trình duyệt phải nhảy về keyframe
   gần nhất rồi giải mã xuôi xuống, mà `hero.mp4` là 1920×1080 ~20 Mbps. Thay vào đó vẽ sẵn
   chuỗi ảnh WebP lên `<canvas>`: tiến độ cuộn → chỉ số ảnh → `drawImage`, không giải mã lại gì.

   Ba lớp trong `.world` nằm phẳng, thứ tự do `z-index` (trời 0 → video/canvas 1 → chữ 2). Đây là
   chỗ duy nhất `.world` bị ép về `transform-style: flat`: khi mọi lớp cùng ở `z = 0` trong một
   khối `preserve-3d`, trình duyệt sắp xếp theo toạ độ Z và hoà nhau thì thứ tự do engine tự quyết
   — lớp `<video>` được compositor tách riêng nên đè mất tiêu đề.

   `camera()` vẫn xử lý hero **trước** bộ lọc tầm nhìn, nhưng chỉ để bật/tắt `<video>` ở nhánh lui về.

   **Nhánh lui về.** Không đọc được `frames/hero/manifest.json` (chưa chạy `npm run frames`, hoặc
   mở bằng `file://`) thì module quay lại tua thẳng `<video>`, có tiết chế nhịp ~28ms. `<video>`
   để `preload="metadata"` chứ không phải `"auto"`: có chuỗi ảnh thì nó không bao giờ hiện, tải
   sẵn 65MB là phí.

   **Bộ nhớ.** Ảnh giữ nguyên 1920×1080 cho nét, nhưng giải nén ra ~8MB/tấm (1920·1080·4 byte)
   nên không giữ hết 422 tấm. Cache có trần (`MAX_CACHED = 48`), nạp trước ±20 khung quanh vị trí
   hiện tại, tấm xa nhất bị loại trước. Khách không cuộn thì chỉ tải ~25 tấm (~2,5MB) chứ không
   phải cả 40,6MB.

2. **Hành trình** (720vh) — khối tuyên ngôn "Nguyên tắc dựng chuyến" và bản đồ bay 3D gộp làm
   một cú máy duy nhất, xem mục riêng bên dưới.
3. **Điểm đến nổi bật** (420vh, đang tạm ẩn) — năm điểm đến, mỗi nấc cuộn đổi ảnh nền + tiêu đề + mô tả, mốc ở
   0 / 0.2 / 0.4 / 0.6 / 0.8 (`CLIMB_STOPS`). Số mốc phải khớp số `<li>` trong `#climbCaps`.
   Ảnh chuyển bằng `opacity` đơn thuần: cho `transform` chạy kèm sẽ buộc raster lại cả tấm bitmap
   mỗi khung hình.
4. **Danh sách tour** — thẻ nổi lên theo độ trễ so le.
5. **Lia ngang** (320vh) — dải điểm đến trượt ngang, thẻ chẵn lùi về sau 90px trên trục Z.
6. **Hoàng hôn** (240vh) — cùng khung hình quần đảo nhưng grade cam, camera ngả 2°.

Camera chỉ do cuộn trang điều khiển — không có chuyển động theo chuột. `app.js` giữ **một vòng
`requestAnimationFrame` duy nhất** cho toàn bộ cú máy: vòng này tính lại khi có sự kiện cuộn.
Việc đổi nền header cũng gọi từ trong vòng này chứ không gắn thẳng vào sự kiện `scroll`.

`scroll-scrub.js` chạy vòng riêng của nó — cố ý, để module đứng độc lập và vì phần nội suy của
nó phải trôi tiếp cả sau khi đã ngừng cuộn (vòng của `app.js` thì ngủ khi không có sự kiện).
Hai vòng không đụng nhau: cờ `data-hero-scrub="on"` trên `<html>` báo cho `app.js` biết
`<video>` đã có người cầm, đừng `play()`/`pause()` chen vào.

`prefers-reduced-motion: reduce` sẽ tắt hẳn động cơ camera và trải phẳng mọi cú máy thành trang tĩnh.

## Cảnh hành trình — tuyên ngôn + bản đồ bay 3D (Three.js + GSAP)

Trước đây là hai section rời: khối chữ "Nguyên tắc dựng chuyến", rồi tới cảnh bản đồ bay. Cuộn
qua thấy rõ mép cắt giữa hai cái. Giờ chúng là **một cú máy duy nhất** (`#flightMap`, ghim 720vh),
không có chỗ ngắt nào ở giữa.

Hai module cùng neo trên **một quãng cuộn** (`top top` → `bottom bottom` của chính section đó, cùng
`scrub: 0.8`), không nói chuyện với nhau mà vẫn khớp vì cùng đọc một tiến độ:

| % quãng cuộn | Việc | Ở đâu |
| --- | --- | --- |
| 0 → 20 | chữ hiện dần theo cuộn (stagger + scrub) | `statement-motion.js` |
| 17 → 21 | dãy số liệu trồi lên và đếm tăng | `statement-motion.js` |
| 0 → 34 | máy bay lượn vào từ ngoài khung, bản đồ còn là bóng mờ | `travel-map.js` |
| 24 → 44 | màn nền trắng tan để lộ trời, bản đồ hiện rõ dần | `travel-map.js` |
| 24 → 48 | camera hạ góc: nhìn thẳng xuống → nhìn chéo | `travel-map.js` |
| 26 → 34 | khối chữ trôi lên và tan (`autoAlpha`) | `statement-motion.js` |
| 34 → 92 | chuyến bay Việt Nam → Nhật Bản | `travel-map.js` |
| 92 → 100 | máy bay rời khung, camera lùi nhẹ, nhả xuống lưới tour | `travel-map.js` |

### Màn nền trắng là thứ làm chỗ nối biến mất

`.fm-stage::before` là một lớp nền `--bg` phủ kín stage, `opacity: var(--fm-veil)`; `travel-map.js`
ghi `--fm-veil = 1 - mapIn` mỗi khung. Nửa đầu cảnh nó đục hoàn toàn, nên **khối chữ đứng trên nền
trắng phẳng y như một section chữ bình thường** — không ai nhận ra bên dưới đã là một cảnh WebGL
đang chạy. Nền trời chỉ hiện ra khi chữ tan.

Đây là cách xử lý gọn nhất cho bài toán chữ-trên-bản-đồ. Từng thử hai hướng khác và cả hai đều tệ
hơn: một lớp radial trắng sau khối chữ thì hiện thành cái bóng tròn mờ giữa khung (nhìn ra ngay là
vệt phủ), còn đẩy màu chữ đậm lên cộng `text-shadow` thì phá thang màu thiết kế của khối mà vẫn
phải đọc trên nền lắm chi tiết.

Ba điểm cần giữ:

- màn nằm **dưới** canvas (`z-index` 0 so với 1). Bản đồ ở pha đọc mới ở `opacity 0.12` nên nó hiện
  như bóng mờ *trên* nền trắng, còn máy bay thì rõ nét. Đặt màn lên trên canvas là phủ trắng cả
  máy bay.
- mặc định `--fm-veil: 1` trong CSS, để lúc chưa có JS hoặc WebGL hỏng thì chữ vẫn nằm trên nền
  trắng chứ không nằm trên ảnh bản đồ.
- JS chỉ ghi khi giá trị đổi quá 0,004 — mỗi lần gán `style` là một lần tính lại style, mà hàm vẽ
  chạy mỗi khung hình.

**Các mốc gối lên nhau là có chủ ý.** Chữ chưa tan hẳn thì nền đã bắt đầu đổi và bản đồ đã bắt đầu
hiện. Xếp nối đuôi (chữ tắt xong rồi bản đồ mới bật) là quay về đúng cảm giác ngắt quãng cũ, chỉ
khác là nằm trong cùng một section. Nhưng **đừng cho bản đồ hiện sớm hơn mốc chữ tan quá nhiều**
(24% so với 26%): chữ nằm ngay trên nó.

`js/travel-map.js` dựng cảnh Three.js: mặt bản đồ nằm ngang, 5 địa danh là bảng quảng cáo, máy bay
bay Việt Nam → Thái Lan → Trung Quốc → Hàn Quốc → Nhật Bản. Bản đồ và camera đứng yên (camera chỉ
hạ góc lúc mở màn rồi lùi nhẹ lúc kết); địa danh phóng to + vòng sáng nở ra khi máy bay tới; đường
bay nét đứt cyan–hồng hiện dần phía sau.

**Tấm địa danh chép thẳng `camera.quaternion`**, tức nằm song song với mặt phẳng ảnh — không phải
dựng đứng trong không gian thế giới rồi xoay quanh trục Y như bản đầu. Dưới phép chiếu phối cảnh,
đường thẳng đứng của thế giới **không** chiếu ra thành đường thẳng đứng trên màn: camera chúc xuống
50° nên chúng hội tụ về một điểm tụ, càng xa trục giữa màn càng nghiêng. Nhật Bản (`u = 0,835`,
lệch ~21° khỏi trục ngắm) nghiêng trái tới ~15°, còn Trung Quốc gần giữa thì gần như thẳng — xoay
quanh trục Y bao nhiêu cũng không chữa được vì lỗi nằm ở phép chiếu. Đổi lại tấm ảnh hết bị nén
theo chiều cao (trước còn `cos 50° ≈ 0,64`) nên cao hơn khoảng một nửa; bề ngang thì không đổi.

**Bề ngang là một hằng số dùng chung**, `STOP_SIZE`, chứ không phải một con số riêng trong mỗi mục
`STOPS`: năm điểm đến là năm mục ngang hàng nhau trên cùng một hành trình, cái nào to hơn là mắt
đọc ra thứ bậc không có thật (bản đầu để 5,6–6,6 tuỳ điểm). Chiều cao thì **không** bằng nhau và
không nên ép cho bằng — mỗi tấm giữ đúng tỉ lệ gốc (`STOP_SIZE / aspect`), mà Thái Lan (3:2) với
Nhật Bản (1,6:1) vốn là ảnh ngang hơn ba tấm 4:3 còn lại; ép cùng chiều cao là kéo giãn hình.

Nới `STOP_SIZE` tới đâu thì phải **nhìn mà quyết**, không tính ra được. Hai điểm gần nhau nhất là
Trung Quốc và Hàn Quốc, cách 6,9 đơn vị theo trục ngang — quá con số đó là hai *mặt phẳng* cắt
nhau, ở 7,6 thì chồng nhau ~40px trên màn. Nhưng mặt phẳng chồng nhau **không** có nghĩa hai hòn
đảo chồng nhau: rìa mỗi tấm ảnh là trong suốt (bộ này chỉ 33–75% diện tích là hình thật, xem
`keptPct` trong `manifest.json`), nên ở 7,6 nhìn vẫn rời hẳn. Chồng lấn cũng không làm hỏng chỗ
nào khác: bắt điểm lọc theo alpha nên tấm trên không cướp cú bấm của tấm dưới, còn vẽ thì vùng
alpha 0 vốn không tô gì lên nền.

### Năm điểm đến bấm được — chấm hotspot + thẻ nội dung

Mỗi điểm đến có một **chấm tròn** (`.fm-spot`) nổi trên bản đồ. Trỏ chuột vào chấm — hoặc vào chính
hòn đảo — là **thẻ `.fm-note`** trượt ra **ngay cạnh nơi đó** với phần mô tả; rời chuột thì thu lại.
**Bấm thì ghim** để đọc mà không phải giữ chuột; bấm lần nữa, bấm ra chỗ trống hoặc bấm `Esc` là
nhả. **Không có nút đóng** — thẻ mở bằng rê chuột nên cũng tự đóng khi rời chuột, một cái × chỉ có
việc lúc đang ghim mà lúc đó đã có ba đường nhả rồi.

`placeNote()` thử **bốn chỗ** quanh hòn đảo theo thứ tự phải · trái · dưới · trên, lấy chỗ đầu tiên
vừa lọt khung vừa **không đè lên hòn đảo nào**, kể cả bốn hòn còn lại. Cần xét cả bốn hòn kia vì
tuyến bay chạy **chéo** qua khung (Thái Lan dưới-trái lên Nhật Bản trên-phải), nên khoảng trống
cạnh một điểm đến gần như luôn là chỗ của điểm kế tiếp — đo thử với bản chỉ có phải/trái thì bốn
trong năm điểm đè lên hàng xóm; thêm hai phương dọc là cả năm đều có chỗ sạch. Không chỗ nào lọt
khung thì quay về chỗ bên phải rồi kẹp: thà đè lên một hòn đảo còn hơn để thẻ tràn ra ngoài màn.

Khoảng hở đo từ **mép** tấm ảnh chứ không từ tâm nó: tấm địa danh rộng `STOP_SIZE` đơn vị thế giới, chiếu
ra là hơn trăm pixel, nên lấy tâm cộng một khoảng hở nhỏ là thẻ đè lên đúng nửa hòn đảo vừa trỏ
vào. Hộp bao trên màn tính bằng cách chiếu thêm hai điểm lệch đúng `halfW`/`halfH` **theo hai trục
của camera** — tấm ảnh nằm song song mặt phẳng ảnh nên đó cũng chính là hai hướng cạnh của nó.
Dùng khổ **gốc** nhân `MARK_PAD` chứ không đọc `mesh.scale` đang chạy: tấm ảnh phồng lên lúc máy
bay tới nơi và lúc được trỏ vào, đọc kích thước tức thời thì thẻ bò ra bò vào theo từng khung.

Cả phép tính chỉ phụ thuộc điểm đang mở, vị trí camera và khổ khung, nên `placeNote()` so một chữ
ký gồm đúng ba thứ đó rồi thoát ngay nếu không đổi — camera đứng yên suốt pha bay, không có chữ ký
này thì mỗi khung lại chiếu 15 điểm và ghi `left/top` một lần cho cùng một kết quả.

Khổ thẻ **đo một lần**
lúc đổi nội dung chứ không đọc `offsetHeight` mỗi khung, và `left/top` **chỉ ghi khi chỗ đặt đổi**:
cả hai đều là thứ buộc trình duyệt tính lại layout, mà camera đứng yên suốt pha bay nên con số này
gần như không đổi. Trên màn hẹp thẻ dán đáy khung và JS **xoá hẳn** `left/top` nội tuyến — style nội
tuyến thắng mọi media query, để sót lại là thẻ kẹt ở toạ độ của lần xem màn rộng.

**Chữ nằm trong `index.html`** (`.fm-notes > article[data-stop]`), không nằm trong JS: đây là chữ
biên tập thật — đọc được, dịch được, máy tìm kiếm thấy được. `data-stop` phải **trùng từng ký tự**
với `label` trong `STOPS`; lệch một dấu là điểm đó bấm không ra gì, im lặng chứ không báo lỗi.

**Chấm là thẻ `<button>` DOM, không phải sprite WebGL.** Sprite thì phải tự lo bắn tia, tự lo con
trỏ, và hoàn toàn không tồn tại với bàn phím lẫn trình đọc màn hình. Với `<button>` thì hover, tiêu
điểm, Tab, Enter đều có sẵn; phần duy nhất phải viết là chiếu toạ độ thế giới ra pixel mỗi khung.
Chấm ẩn bằng `visibility` (không phải `opacity`) khi camera chưa nghiêng đủ — ẩn kiểu đó thì nó
cũng hết bắt chuột và hết nhận Tab, không cần thêm `pointer-events` hay `tabindex`.

Ba chỗ đã trả giá mới tìm ra:

- **`frame()` phải hạ `mesh.position.y` về `baseY` mỗi khung**, y như `scale` được đặt lại bằng
  `setScalar`. `hoverPass()` nhấc tấm địa danh lên khi rê chuột vào và **bắn tia vào chính tấm ảnh
  đó** — không hạ về thì lần bắn sau nhắm vào tấm đang ở vị trí đã nhấc, con trỏ tuột ra ngoài,
  hiệu ứng tắt, tấm hạ xuống rồi lại trúng: nhấp nháy quanh nửa độ đậm chứ không bao giờ sáng hẳn.
- **Chấm chiếu theo `at`/`baseY` (tư thế nghỉ), không theo `mesh.position`** — cùng lý do: dùng vị
  trí đã nhấc thì chấm tự chạy khỏi chỗ con trỏ vừa chạm tới.
- **`clip-path` cắt cả con cháu.** Bốn góc vát của thẻ nằm ở `.fm-note::before` chứ không đặt thẳng
  lên `.fm-note` — đặt trên thẻ thì mọi thứ nhô ra ngoài hộp đều bị xén (hồi còn nút đóng gác lên
  mép trái, nó mất đúng một nửa). Bóng đổ vì thế cũng phải là `drop-shadow` chứ không `box-shadow`:
  `box-shadow` đổ theo hộp chữ nhật nên bốn góc vát sẽ có bóng ở chỗ không có gì.

Vùng bấm của hòn đảo lọc theo **alpha của texture** (lưới 64×64 rút một lần lúc khởi tạo). Mỗi địa
danh là PNG đã tách nền, phần lớn diện tích là trong suốt; coi cả hình chữ nhật là vùng bấm thì con
trỏ đổi thành bàn tay lúc còn ở giữa vùng trời trống cạnh hòn đảo. Mở trang bằng `file://` thì
`getImageData` ném lỗi (canvas bị "nhuộm bẩn") — lúc đó lùi về bắt cả ô chữ nhật chứ không hỏng.

### Lớp sương giao ca xuống lưới tour

Chỗ nối giữa canvas 3D và section trắng bên dưới trước đây là một đường cắt ngang. Giờ có `.jr-mist`
phủ lên đó: một khối **toàn gradient — không ảnh, không chuyển động**.

- **Neo ở đáy SECTION, không phải trong `.stage`.** `.stage` bị ghim suốt cú máy nên thứ gì đặt
  trong đó cũng dính ở đáy màn hình từ đầu tới cuối. Neo vào section thì cả lớp nằm dưới tầm nhìn
  suốt chuyến bay, chỉ trồi lên đúng lúc khung hình thôi ghim.
- **Hai vệt `radial-gradient`** rộng, lệch tâm và lệch nhau, giữ cho mép trên của lớp mù không
  thành một đường ngang thẳng băng.
- **Trắng đục hẳn ở 88%, không phải 100%.** Mốc 100% nghĩa là chỉ đúng hàng pixel cuối mới trắng
  thật, còn ngay trên nó vẫn lộ màu xanh của `.fm-stage` — lại thành một đường cắt.

Nhánh `prefers-reduced-motion` bỏ hẳn: ở đó cảnh trải phẳng thành dòng chảy, không có chỗ nối nào
để phải che.

**Từng thử ba lớp sprite mây trôi ngang** (kiểu section bản đồ của
[era-residence.com](https://www.era-residence.com/), dựng bằng `images/cloud-*.png` sẵn có) rồi bỏ.
Hai lý do, ghi lại kẻo có người làm lại: đám mây thành hình rõ quá nên mắt bám vào chúng thay vì
vào chỗ chuyển; và chuyển động ngang ở ngay mép nối càng làm lộ ra rằng có hai section đang ghép
vào nhau. Nếu vẫn muốn thử lại, hai chỗ dễ sập là ô phải chia hết `50%` bề rộng khối (`200%` rộng,
dịch `-50%`) nếu không mỗi vòng lặp thấy một mối nối chạy qua màn hình, và mép trên phải có
`mask-image` mờ dần vì `overflow: hidden` xén thẳng qua thân mây.

### Đường bay

Nét gạch nối **in trên mặt bản đồ**, không phải dải cầu vồng lơ lửng: tuyến giữ nguyên một cao độ
`TRAIL_Y = 0.22`, không nhấc cao ở giữa chặng nữa. Điểm giữa mỗi chặng lệch sang một bên và đổi bên
xen kẽ, cho tuyến uốn lượn thay vì gấp khúc.

Dựng bằng **hai ống lồng nhau** trên cùng một tuyến: `trailGlow` (bán kính 0,62, màu liền, alpha
thấp) là quầng sáng hắt ra mặt bản đồ, `trail` (bán kính 0,17) là nét gạch bo tròn hai đầu có lõi
trắng. Không gộp làm một được — muốn vừa mảnh vừa có quầng thì phải biết đâu là "bề ngang" của ống
trên màn hình, mà `uv.y` của `TubeGeometry` chạy vòng theo chu vi nên chỗ nào là mép còn tuỳ hướng
khung Frenet ở đoạn đó. Hai ống thì khỏi phải đoán. Cả hai dùng chung một uniform `uHead`.

Màu: nền cyan, **cứ bảy nhịp chen một nhịp hồng**. Trước đây hai màu đan nhau bằng `sin()` nên nhịp
nào cũng ngả tím; điểm nhấn thưa mới ra được vẻ "chấm mốc" trên bản đồ du lịch.

### Mây trôi

Hai mặt phẳng ngang đúng khổ bản đồ, ở cao độ 1,7 và 2,7 — **thấp hơn cao độ máy bay (3,1)**, vì
máy bay là chủ thể, chui xuống dưới một vệt mây là mất hút. Chạy ngược chiều và lệch tốc: một lớp
thì mắt đọc ra ngay là một tấm ảnh đang trượt, hai lớp cắt nhau mới ra chiều sâu.

- **Vân mây dựng bằng canvas** (`cloudTexture()`), không dùng `images/cloud-*.png` — mấy tấm đó là
  ảnh nền cho lớp CSS, không đảm bảo có kênh alpha. Mỗi vệt được vẽ 9 lần (chính nó + 8 ô xung
  quanh) để texture lặp liền mạch; thiếu bước đó là mỗi vòng trượt lại thấy một đường cắt dọc.
  Nhiễu lấy từ LCG hạt giống cố định, không phải `Math.random` — cùng một hình mây ở mọi lần tải.
- **Trôi bằng cách dịch `texture.offset`**, không dời mesh: mặt phẳng đứng yên đúng khổ bản đồ nên
  mặt nạ mờ mép vẫn khớp, mà dịch UV thì trôi vô tận.
- **Tính theo đồng hồ** (`performance.now()`), không cộng dồn mỗi khung — xem lý do ở vòng vẽ dưới.
- **Cao độ thấp hơn máy bay** (`TRAIL_Y + PLANE_LIFT` = 2,62). Máy bay là chủ thể, chui xuống dưới
  một vệt mây là mất hút. Sửa hai hằng số đó thì kéo cao độ mây theo.

**Thứ tự vẽ** của cả cảnh, từ dưới lên: bản đồ (0) · vòng sáng (1) · **mây (2)** · quầng đường bay
(3) · đường bay (4) · địa danh (5) · máy bay (6). Không thứ nào ghi vào bộ đệm sâu nên `renderOrder`
quyết định hẳn cái nào chồng lên cái nào. Ba chỗ phải đúng:

- mây **dưới** địa danh, không thì mấy hòn đảo bị phủ sương giữa cảnh;
- đường bay **dưới** địa danh, vì nó là nét in trên mặt bản đồ, phải chạy sau lưng đảo chứ không
  vắt qua trước mặt ngôi chùa;
- đường bay **trên** mây, dù cao độ thì thấp hơn — mây là lớp khí quyển, còn đường bay phải luôn
  đọc rõ.

**Vòng vẽ vì thế có hai chế độ.** Trước đây nó chỉ vẽ khi `idle > 0` (vừa có cuộn hoặc chuột) — cú
máy này nặng, để nó quay không tải lúc người dùng ở tận cuối trang là phí pin. Mây thì lại trôi
theo đồng hồ chứ không theo tiến độ cuộn, nên cần khung hình cả lúc không ai cuộn. Cách dung hoà:
một `IntersectionObserver` trên `#flightMap`, ngoài tầm nhìn thì đứng im hẳn, trong tầm nhìn mà
rảnh thì vẽ **cách khung một lần** (~30 khung/giây). Mây trôi rất chậm, 30 với 60 nhìn không ra
khác biệt mà tiết kiệm đúng một nửa.

### Ba đoạn đường, một máy bay

Máy bay chạy trên ba đường Catmull-Rom nối lại (`flightAt()`): `approach` → `curve` → `outbound`.
Chỉ `curve` là tuyến vẽ trên bản đồ; hai đoạn kia nằm ngoài khung ngắm và chỉ chở cái máy bay,
nên `uHead` của đường bay lẫn khung ngắm của camera vẫn tính đúng trên tuyến chính.

**Máy bay vào khung bằng mép phải**, ngang tầm giữa theo chiều dọc — không chui lên từ góc dưới và
cũng không hiện ra sẵn giữa trời. Mốc vào **không đóng cứng** mà `buildApproach()` tính lại mỗi lần
`layout()` chạy, vì khung rộng bao nhiêu là do tỉ lệ màn quyết định qua `fitDistance()`. Đo thử với
một mốc cố định `x = 30`: ở tỉ lệ 2,4 còn nằm ngoài khung nhưng tới 3,0 đã lọt hẳn vào trong. Với
bản động, từ 0,55 tới 3,6 đều vào đúng mép phải và lọt khung ở 9–13% pha dẫn.

Lúc mở màn camera gần như nhìn thẳng xuống nên trục x thế giới trùng trục ngang màn hình; khung ở
cao độ mốc vào hẹp hơn khung ở mặt phẳng ngắm (gần camera hơn), nên phải lấy độ sâu tại đúng cao độ
đó chứ không phải `VIEW_HALF.x`.

**Mốc áp chót của `approach` để lệch ngang bằng 0.** Với Catmull-Rom hở, three.js suy điểm ma ở hai
đầu nên tiếp tuyến tại mút đúng bằng đoạn thẳng cuối; cho nó trùng hướng vào tuyến thì chỗ giao ca
sang chặng bay không bẻ lái.

Phần nghiêng cánh nhìn trước theo **tiến độ cảnh** (`p + 0.01`) chứ không theo tiến độ tuyến
(`t`): ở hai đoạn dẫn/thoát thì `t` đứng yên ở 0/1, lấy `t + 0.02` sẽ ra đúng một hướng và máy
bay lượn vòng mà cánh cứ phẳng lì.

### Bắt buộc: tách nền asset trước

```powershell
npm run cutout      # images/travel-map/*.png -> images/travel-map/cutout/
```

Bộ gốc xuất ở `rgb24`, **không có kênh alpha**, và nền "trong suốt" là ô caro đã bẹp thành pixel
thật (khối 27px, xám 245/254). Đắp thẳng lên WebGL sẽ ra khối trắng kẻ caro.

`scripts/cutout-assets.js` dựng lại alpha. Ba chỗ đã trả giá mới tìm ra, đừng sửa lại:

1. **Loang từ viền, không lọc theo màu.** Thân máy bay và mái chùa cũng trắng; ngưỡng màu nào đủ
   rộng để ăn nền cũng ăn thủng luôn vật thể. Loang chỉ ăn vùng nền nối liền với mép ảnh.
2. **Quầng sáng chặn đường loang**, nên ô caro lọt bên trong quầng vẫn còn. Chúng là mảng xám
   *nhỏ*, còn thân vật thể là mảng xám *rất lớn* — lọc theo diện tích (`CHECKER_MAX_AREA`) tách
   được hai thứ.
3. **Không phải ảnh nào cũng có ô caro.** `06-nhat-ban` nền phẳng trắng; suy alpha từ biên độ dao
   động caro ở ảnh đó chỉ ra nhiễu, và nền biến thành khung mờ đục bao quanh địa danh. Đo được
   `delta < 5` thì chuyển sang cắt nhị phân.

`manifest.json` ghi tỉ lệ từng ảnh sau khi cắt. Three.js đọc tỉ lệ đó để dựng mặt phẳng — đây là
thứ giữ cho asset không bị kéo méo, đừng đặt cứng kích thước trong code.

### Hai bẫy khi sửa cảnh

- **Đừng dùng `AdditiveBlending`.** Ảnh bản đồ nền là thứ thay được (xem mục dưới) và một trong
  hai bản đang có gần như trắng toát; cộng sáng vào trắng thì không đổi gì — đường bay và vòng
  sáng biến mất hoặc bệt thành vệt trắng. Blend thường với màu đậm ăn được trên cả hai bản.
- **Đừng viết `smoothstep(a, b, x)` với `a > b`.** Chuẩn GLSL nói đây là hành vi *không xác định*;
  có driver trả về 1 ở mọi điểm, làm cả đường bay bị pha trắng. Đảo bằng `1.0 - smoothstep(b, a, x)`.

Toạ độ địa danh nằm ở mảng `STOPS` dưới dạng `u,v` chuẩn hoá trên ảnh bản đồ. Đây là **toạ độ trên
ảnh, không phải kinh vĩ độ**: ảnh là một bản dựng 3D nhìn chéo từ phía nam nên không có công thức
nào đổi qua lại, phải dò bằng mắt trên chính tấm ảnh. Mốc dễ bám nhất là mấy hòn đảo — Hải Nam,
Đài Loan, mũi bán đảo Triều Tiên, Luzon. Lệch một hai phần trăm là thường; thấy tấm ảnh địa danh
đứng chưa đúng chỗ thì nhích đúng hai số đó.

Xê dịch `STOPS` thì **đoạn dẫn tự theo**: `buildApproach()` dựng lại từ khung ngắm và từ đầu tuyến,
không có toạ độ nào đóng cứng. Chỉ `outbound` (đoạn thoát) là còn đặt tay.

### Đổi ảnh bản đồ nền

Bản dùng thật là `images/travel-map/01-ban-do-chau-a-4k.png`; các bản còn lại giữ nguyên tên gốc và
**không** lọt vào `npm run cutout` (mẫu lọc là `^\d\d-.*-4k\.png$`).

| File | Kiểu |
| --- | --- |
| `Bản đồ châu á 2.png` | địa hình xanh lá, biển xanh đậm *(đang dùng)* |
| `Bản đồ châu á 1.png` | trắng–cyan, phẳng, tối giản |
| `Bản đồ du lịch có điểm đến.png` | địa hình, **có sẵn 5 đảo địa danh + ghim** |
| `ban-do-the-gioi-8-diem.png` | bản đồ **thế giới**, 8 địa danh (thêm New York, Paris, London) |
| `ban-do-the-gioi-sach.png` | bản đồ thế giới, không có địa danh |

```powershell
Copy-Item "images\travel-map\<tên ảnh>.png" "images\travel-map\01-ban-do-chau-a-4k.png" -Force
npm run cutout
```

Đổi ảnh thì ngó lại **ba thứ phụ thuộc vào chính ảnh đó**:

- **`u,v` của cả 5 điểm dừng** trong `STOPS`. Bắt buộc nếu ảnh mới đổi khung ngắm. Ba bản cuối
  trong bảng đều khác khung với hai bản đầu.
- **Nền `.fm-stage`** (mục 8.4 trong `style.css`). Bốn mép bản đồ mờ dần để tan vào nền này; lệch
  tông là thành viền sáng quanh bản đồ. Bản địa hình cần gradient xuống xanh biển như hiện tại,
  bản trắng–cyan hợp với tông sáng đều (`#eaf4fb → #cfe6f6`).
- **Bề rộng dải mờ**, tham số của `edgeFade()` trong `travel-map.js`, hiện là **0,11**. Nền càng
  đậm càng cần dải rộng, nhưng đừng nới tay: 18% mỗi cạnh nghĩa là hơn một phần ba bề ngang ảnh bị
  nhuộm trắng — nhìn ra là cả khung hình bị sương phủ chứ không phải bản đồ có chân trời mờ. Trần
  theo bộ `STOPS` là 0,165: quá đó thì Nhật Bản (`u = 0,835`, điểm ngoài cùng) bắt đầu bị làm nhạt
  ngay giữa cảnh.

Ảnh mới phải **giữ đúng tỉ lệ 16:9**; khác tỉ lệ thì `MAP_W`/`MAP_H` đổi và toàn bộ `u,v` lệch theo.

Ba bản có địa danh vẽ sẵn thì phải gỡ 5 mesh địa danh trong `travel-map.js`, nếu không là chồng hai
lần cùng một ngôi chùa lên nhau.

## Khối tuyên ngôn — quét chữ theo cuộn (GSAP)

`js/statement-motion.js` cắt câu tuyên ngôn thành từng từ rồi cho ScrollTrigger `scrub` chạy
`stagger` opacity: cuộn tới đâu chữ hiện rõ tới đó, như ánh mắt đang đọc. Dãy số liệu đếm tăng,
rồi cả khối trôi lên và tan để nhường chỗ cho bản đồ. (Dòng nhãn `.kicker` ở đầu khối đã bỏ; cách
đặt lại ghi ngay trong file.)

Năm điểm dễ làm hỏng nếu sửa:

1. **Đừng neo ScrollTrigger vào chính khối chữ.** Khối này nằm trong cảnh bị ghim
   (`position: sticky`) nên nó *không* trôi qua tầm nhìn: mốc kiểu `start: 'top 80%'` trên chính
   nó sẽ đứng im suốt cảnh và chẳng bao giờ chạy hết. Neo vào cả cú máy (`#flightMap`).
2. **Tween rỗng dài `SPAN` đặt ở đầu timeline.** Nó ấn định "1 đơn vị = 1% quãng cuộn", nhờ vậy
   mọi vị trí trong file đọc thẳng ra phần trăm và so được với mốc trong `travel-map.js`. Bỏ nó
   thì timeline co lại bằng tween cuối cùng và tất cả các mốc lệch hết.
3. **Chỉ chạy `opacity`, tuyệt đối không đụng `color`.** Chữ thường là `--ink-3` (xám), cụm `<b>`
   là `--ink` (đậm). Cho hiệu ứng chạy màu là tương phản gốc của khối bị san phẳng. Không phải bù
   trừ gì cho nền: suốt pha đọc, sau lưng chữ vẫn là nền trắng của trang (xem màn `--fm-veil`).
4. **Cắt từ bằng TreeWalker trên node văn bản**, không viết đè `innerHTML` — làm thế là mất luôn
   các thẻ `<b>` bọc ngoài.
5. **`ScrollTrigger.refresh()` khi `load` và khi `hashchange`.** `tl.from()` đặt phần tử về
   `opacity: 0` ngay lập tức, nên mốc cuộn lệch đồng nghĩa dãy số liệu kẹt vô hình. Hai thứ làm
   layout xê dịch: cú máy mở đầu cao 500vh, và trang chủ đề ẩn hẳn landing bằng `display: none`.

Lúc tan dùng `autoAlpha` chứ không phải `opacity`: mờ hẳn thì GSAP đặt luôn `visibility: hidden`,
khối chữ thôi nằm cản phía trên canvas — đây là điều kiện để hiệu ứng rê chuột vào máy bay còn
hoạt động ở nửa sau của cảnh.

Đếm số: `48.000` là 48000 kiểu Việt còn `4.8/5` là số thập phân — hai dạng nhìn giống nhau nên
`parseStat()` phân biệt bằng chính hình dạng chuỗi. Riêng `24/7` là cụm từ chứ không phải lượng,
đếm lên thành `0/7 → 24/7` rất vô nghĩa nên bị loại, chỉ cho hiện lên.

`prefers-reduced-motion: reduce` thì module thoát ngay, khối giữ nguyên trạng thái tĩnh.

## Khối cam kết — vòm trồi lên + đổi theo chữ bấm trong câu

### Vòm trồi lên đè cảnh hoàng hôn

Khối `#why` không nối đuôi cảnh trước mà **trồi lên đè** nó: mép trên là một vòm cong, cuộn tới đâu
vòm dâng tới đó, phẳng dần rồi chiếm trọn khung. Ba con số ăn khớp nhau, sửa một là phải kéo hai
cái kia theo:

- `.shot--sunset` cao **240vh**, `.stage` bên trong ghim (`sticky`) suốt **140vh** ở giữa.
- `#why` có `margin-top: -100vh`, nên nó bắt đầu ló ở đáy khung khi cảnh hoàng hôn còn đúng 100vh
  nữa mới nhả ghim.
- Quãng dâng của vòm (mép trên đi từ đáy khung lên đỉnh khung) cũng đúng **100vh**. Vậy vòm dâng
  hết *cũng là lúc* cảnh hoàng hôn nhả ghim — không có nhịp nào thừa ở giữa.

`domeFrame()` trong `js/app.js` ghi `--rise` (0 = vòm sâu nhất, 1 = đã phẳng); CSS lấy đó tính bán
kính. Không dùng lại `shotProgress()` được: hàm đó đo quãng một cú máy **cao hơn khung hình** trôi
qua khung, còn đây là một khối cao đúng bằng khung đang dâng lên.

Ba chỗ dễ sai:

- **Mặc định `--rise` là 1, không phải 0.** Lúc chưa có JS, hoặc người dùng bật giảm chuyển động
  (`initCamera()` thoát ngay), khối phải là một section phẳng bình thường; để mặc định 0 thì nó
  đứng nguyên với cái vòm sâu hoắm không bao giờ đóng. Kèm theo đó là nhánh
  `prefers-reduced-motion` gỡ luôn `margin-top` âm — lúc đó cảnh hoàng hôn đã trải phẳng, không
  còn gì để đè lên, giữ margin âm là ăn thủng cảnh trước.
- **Độ sâu vòm (`--dome`) đo theo bề NGANG khung, không theo chiều cao.** Hình dạng cái vòm là
  quan hệ giữa độ sâu với bề ngang; lấy `vh` thì trên điện thoại (430×900) nó phồng thành gần nửa
  hình tròn, còn trên màn ngang bẹt lại thành đường thẳng.
- **Bán kính ngang tối đa dùng được là `50%`.** Đặt to hơn thì theo chuẩn CSS hai góc bị thu tỉ lệ
  cho vừa cạnh, kết quả vẫn đúng bằng 50%. Độ sâu vòm nằm hết ở bán kính **dọc**.

`padding-top` cộng thêm `--flat * --dome * 0.45` khi vòm còn sâu: mép trái/phải của `.wrap` cách
tâm khá xa, ở đó đường cong đã tụt xuống ~37% bán kính dọc — chữ đặt cao hơn mức đó là lòi ra ngoài
nền, nằm thẳng trên cảnh hoàng hôn.

### Nội dung: năm cam kết, rê chuột là bung ra

Năm cam kết xếp thành danh sách gạch ngang. Rê chuột vào dòng nào thì dòng đó mở: **số thứ tự nhường
chỗ cho ảnh**, hai đoạn nội dung trượt xuống dưới tiêu đề, mũi tên đổi sang màu nhấn cam. `initWhy()`
trong `js/app.js` lo phần này.

**Lúc nào cũng có đúng một dòng mở**, kể cả khi chuột đã rời khỏi cả khối. Đóng sạch lúc rời chuột
thì khối co lại thành năm dòng tiêu đề trơ trọi, mà người vừa đọc dở một cam kết thì mất chỗ đang
đọc.

Bốn chỗ đáng chú ý:

- **Chiều cao mở bằng `max-height` do JS đo** (`scrollHeight`), y hệt accordion Cẩm nang. Không có
  cách thuần CSS nào nội suy được từ `0` tới `auto`. Đo lại khi `resize` — đổi khổ màn là đoạn văn
  xuống dòng khác đi, con số px đo lúc trước sai ngay.
- **Cột đầu giữ nguyên bề ngang ở cả hai trạng thái**, nên tiêu đề của năm dòng thẳng hàng dù dòng
  nào đang mở; số thứ tự và tấm ảnh chỉ là hai thứ thay nhau đứng trong cùng một cột.
- **`.why-no` đặt `position: absolute`** để không chiếm chiều cao. Nếu số chiếm chỗ thật thì lúc mở,
  chỗ nó vừa để trống lại thành khoảng hở trên đầu ảnh.
- **Cặp quy tắc dự phòng `.why-item.is-open .why-shot/.why-more { max-height: 60vh }`.** Không có JS
  thì `index.html` vẫn gắn sẵn `.is-open` cho dòng đầu, nhưng không ai ghi `max-height` — thiếu cặp
  này là ảnh và chữ bị cắt sạch. Có JS thì giá trị nội tuyến luôn thắng nên nó không đụng gì tới
  phần chuyển động.

Mũi tên ↗ vẽ bằng hai pseudo-element (`::after` là thân, `::before` là đầu — góc trên-phải của một ô
vuông, tự nó đã chỉ đúng hướng nên **không** xoay), chứ không dùng ký tự: phông của trang không chắc
có glyph đó, thiếu là trình duyệt mượn phông khác và mũi tên lệch hẳn kiểu.

Rê chuột là đường chính, nhưng cảm ứng và bàn phím không có trạng thái đó — nên mỗi dòng nghe cả
`click` lẫn `focusin`, và có một `<button>` mũi tên thật mang `aria-expanded` + nhãn `.sr-only`
(thiếu nhãn thì trình đọc màn hình gặp năm cái nút trống giống hệt nhau).

## Trang trong — ba route

| Route | Mở từ đâu | Khung | Liệt kê |
|---|---|---|---|
| `#chu-de/nui-trekking` | ô trong mega menu "Tour theo chủ đề" | `.theme-page` | tour, lọc theo `state.tags` |
| `#diem-den/da-nang` | dòng điểm đến trong mega menu "Điểm đến" | `.theme-page` | tour, lọc theo `state.dest` |
| `#trai-nghiem` | link "Trải nghiệm" trên header | `.exp-page` | `EXPERIENCES`, lọc theo `kind` |

Hai route đầu **dùng chung một khung** vì chúng khác nhau đúng ba thứ (tiêu đề, ảnh bìa, lọc
theo `tags` hay `dest`) — phần chung ở `enterRoutePage()`, `enterTheme()` / `enterDest()` chỉ đặt
`subject` rồi gọi nó. Route thứ ba **không** dùng chung: trải nghiệm là hoạt động lẻ trong ngày,
không có ngày khởi hành và không đi qua luồng đặt ba bước, nên thẻ khác và bộ lọc khác. Nhồi
chung một khung thì mọi phần đều phải mọc thêm nhánh "nếu là trải nghiệm thì…".

`setScreen()` là công tắc duy nhất bật/tắt `body.route-theme` và `body.route-exp` — đi qua một
hàm để hai class không bao giờ cùng bật.

Slug sinh bằng `slugify()` (bỏ dấu, `đ → d`) — từ nhãn trong `THEMES`, hoặc từ `t.location`.
Danh sách điểm đến hợp lệ suy ra từ `TOURS` (`ALL_LOCATIONS`), nên xoá tour cuối của một nơi là
đường dẫn tới nơi đó tự hết hiệu lực thay vì dẫn vào trang rỗng. Slug không khớp gì thì về
landing.

Đây **không** phải file HTML riêng. Khối `.theme-page` (và `.exp-page`) nằm sẵn cuối `<main>`,
bình thường ẩn; khi vào route thì `body.route-theme` / `body.route-exp` bật nó lên và ẩn toàn bộ
landing — mỗi trang vỏn vẹn ba dòng CSS:

```css
.theme-page { display: none; }
body.route-theme .theme-page { display: block; }
body.route-theme main > :not(.theme-page) { display: none; }
```

Đổi lại, trang trong dùng **nguyên** `tourCard()` / `matches()` / `sortList()` và cả luồng đặt
tour (modal vốn nằm sẵn trong trang), nên không nhân bản header, footer hay code render nào.
URL vẫn chia sẻ được, mở thẳng được, và nút back của trình duyệt vẫn đúng nhờ `hashchange`.

Trang gồm: ảnh bìa, tiêu đề + số tour + nút về trang chủ, dải chip nhảy nhanh sang chủ đề khác
(hiện đang ẩn bằng CSS), và bộ lọc khu vực / ngân sách / sắp xếp áp trong phạm vi trang.
Ảnh bìa lấy từ `THEME_COVER` với chủ đề, còn với điểm đến thì `destCover()` mượn ảnh của tour
đầu tiên ở đó — không có bảng ảnh riêng phải cập nhật tay. Trang điểm đến ẩn hàng chip khu vực
(`.theme-page.is-dest`): một điểm đến chỉ thuộc đúng một khu vực nên ba lựa chọn kia luôn rỗng.

Hai loại trang khác nhau đúng ba thứ — tiêu đề, ảnh bìa, lọc theo `tags` hay `dest` — nên phần
chung nằm ở `enterRoutePage()`, còn `enterTheme()` / `enterDest()` chỉ đặt `subject` rồi gọi nó.

**Hai điểm cần nhớ khi sửa:**

1. Trang trong và danh sách dưới landing **dùng chung đối tượng `state`**. Hai màn không bao giờ
   hiện cùng lúc nên không tranh nhau, nhưng vì thế `exitRoutePage()` phải đặt lại `state` cho
   sạch — bỏ bước đó thì thoát ra xong danh sách landing kẹt nguyên bộ lọc của trang vừa rời.
2. **Chủ thể của trang tách khỏi bộ lọc.** `subject` giữ "trang này nói về cái gì", còn
   `state.region` / `maxPrice` / `date` là thứ người xem xoá đi xoá lại. `resetThemeFilters()`
   gọi `applySubject()` để dựng lại chủ thể — nếu không, bấm "Xoá bộ lọc" trên trang Đà Nẵng sẽ
   rơi về toàn bộ tour thay vì còn lại Đà Nẵng.

## Cấu trúc

```
booking/
├── index.html
├── package.json         # CHỈ cho `npm run frames` — trang chạy thật không cần Node
├── css/style.css        # 17 mục, có đánh số ở đầu file
├── js/
│   ├── data.js          # DỮ LIỆU: tour, điểm đến, đánh giá, FAQ, mã giảm giá
│   ├── app.js           # camera, render, lọc, luồng đặt tour, route trang chủ đề
│   ├── scroll-scrub.js  # tua video mở đầu theo cuộn (canvas + chuỗi ảnh)
│   ├── statement-motion.js  # GSAP: phần chữ của cảnh hành trình
│   └── travel-map.js    # Three.js: phần canvas của cảnh hành trình (bản đồ + máy bay)
├── scripts/
│   └── extract-frames.js  # video/hero.mp4 → frames/hero/*.webp + manifest.json
├── video/
│   └── hero.mp4         1920×1080 · 26,4s · 65 MB — nguồn của chuỗi ảnh
├── frames/hero/         # SINH RA, không sửa tay — 422 ảnh WebP 1920px · 40,6 MB
│   ├── manifest.json    basePath / extension / frameCount
│   └── frame-00001.webp … frame-00422.webp
└── images/              # dựng từ bộ Junney (180 MB → 6.3 MB)
    ├── hero-poster.jpg      2200px — poster cho video
    ├── aerial-islands.jpg   1672px — cảnh bay lên
    ├── sunset-dunes.jpg     2200px — cảnh ưu đãi hoàng hôn
    ├── cloud-1…8.png        1100px, PNG giữ alpha — lớp mây parallax
    ├── t-*.jpg              1400px × 14 — ảnh thẻ tour
    ├── d-*.jpg              1200px × 5 — ảnh thẻ điểm đến
    └── Junney/              # bản gốc 4K người dùng up lên (180 MB, không dùng khi chạy)
```

**Nguồn ảnh.** Toàn bộ lấy từ `images/Junney/` (15 ảnh tour 4K, 6 ảnh điểm đến,
8 lớp mây PNG trong suốt 2500², máy bay cắt nền, video banner). Bản gốc PNG 4K
nặng 6–10 MB/ảnh nên đã được resize + nén JPEG q80–82; riêng mây giữ PNG vì cần
kênh alpha. Thư mục `Junney/` **có thể xoá** sau khi đã sinh xong ảnh tối ưu.

Ảnh chưa dùng, để dành khi thêm tour: `t-paris.jpg`, `t-iceland.jpg`,
`d-europe.jpg`, `cloud-2.png`, `cloud-6.png`.

**Video banner** nằm ở lớp `.layer--plate` của cảnh mở đầu, cùng một `<canvas>` đè lên trên.
Bình thường canvas cầm khung hình (tua theo cuộn) và `<video>` nằm im; chỉ khi thiếu chuỗi ảnh
thì `<video>` mới hiện. Bật `prefers-reduced-motion` thì `scroll-scrub.js` tự tắt hẳn, canvas
`display: none`, trang chỉ hiện poster.

## Tính năng (giữ nguyên toàn bộ)

- **Header**: mega menu Điểm đến / Tour theo chủ đề (blur + fade), ô tìm kiếm bung ra từ icon, gợi ý sống, đăng nhập, đặt chỗ của tôi.
- **Lọc**: khu vực, ngân sách, 5 kiểu sắp xếp, tìm theo điểm đến / ngày / số khách.
- **Chi tiết tour**: điểm nhấn, lịch trình từng ngày, ngày khởi hành, bao gồm / không bao gồm.
- **Đặt tour 3 bước** với tính giá tức thì (người lớn 100%, trẻ em 75%, em bé 20%, phụ thu phòng đơn), mã giảm giá `VIVU10` / `HE2026` / `NHOM4`, tiền cọc 50%.
- **Sau khi đặt**: mã `VV-XXXXXX`, lưu `localStorage`, tải phiếu xác nhận `.txt`, huỷ đặt chỗ.

## Sửa nội dung

Mọi thứ hiển thị nằm trong `js/data.js` (`TOURS`, `DESTINATIONS`, `REVIEWS`, `FAQS`, `COUPONS`, `SINGLE_FEE`).
Ngày khởi hành sinh tự động từ hôm nay qua `departures(start, every, count)` nên dữ liệu không bao giờ cũ.

### Ảnh cho thẻ tour

Thẻ tour hiện dùng tranh phong cảnh dựng bằng SVG, đã chỉnh sang bảng màu navy/biển/hoàng hôn
(12 tông × 3 bố cục: `peaks`, `waves`, `city`) — đặt trong `scene: { shape, theme }`.

Có ảnh thật thì thêm trường `photo`, ảnh sẽ tự đè lên tranh SVG; nếu file không tồn tại,
trang tự quay về dùng SVG:

```js
{ id: 'ha-giang', photo: 'images/ha-giang.jpg', /* ... */ }
```

> Kho ảnh gốc chỉ có cảnh biển đảo và dưới nước, nên các tour núi / thành phố / di sản
> vẫn dùng tranh SVG để không minh hoạ sai địa danh. Bổ sung ảnh thật vào `images/`
> và khai báo `photo` là thẻ tour dùng ngay.

### Thay ảnh cảnh lớn

Chỉ cần ghi đè file trong `images/` cùng tên. Muốn tạo lại từ ảnh gốc (resize + grade màu),
xem script mẫu dùng `System.Drawing` trong lịch sử hội thoại — tham số grade:
lạnh `R .93 / G .99 / B 1.10`, hoàng hôn `R 1.24 / G .94 / B .74`.

## Lưu ý

Bản demo giao diện: chưa có backend, chưa có cổng thanh toán thật.
Dữ liệu đặt chỗ chỉ lưu trên trình duyệt đang dùng.
