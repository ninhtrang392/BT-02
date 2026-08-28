/* ==========================================================================
   Vivu Travel — dữ liệu tour (demo)
   Sửa file này là đủ để thay đổi toàn bộ nội dung hiển thị trên trang.
   ========================================================================== */

/* Sinh danh sách ngày khởi hành tính từ hôm nay để dữ liệu không bao giờ cũ.
   start: số ngày kể từ hôm nay cho chuyến đầu tiên
   every: khoảng cách giữa các chuyến (ngày)
   count: số chuyến mở bán                                                   */
function departures(start, every, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + start + i * every);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/* `highlights` là các Ô ĐIỂM NHẤN ở màn hình chi tiết tour: { ic, t, d }
     ic — khoá hình, ghép thẳng thành <use href="#fi-<ic>"> nên PHẢI trùng tên
          một <symbol> trong kho icon ở đầu index.html. Sai tên thì app.js rơi
          về #fi-star chứ không vỡ, nhưng cả bốn ô sẽ ra cùng một hình sao.
     t  — tên điểm nhấn, hai đến bốn chữ. Ô chỉ rộng chừng 300px.
     d  — một câu tả, tối đa hai dòng trong ô; dài hơn thì bốn ô lệch chiều cao.
   Vẫn nhận cả chuỗi trơn như bản cũ — lúc đó ô chỉ có tên, không có câu tả. */
const TOURS = [
  {
    id: 'ha-giang',
    photo: 'images/t-highland.jpg',
    name: 'Hà Giang — Cung đường đá nở hoa',
    location: 'Hà Giang',
    region: 'bac',
    scene: { shape: 'peaks', theme: 'highland' },
    days: 4, nights: 3,
    price: 4_990_000,
    oldPrice: 6_200_000,
    rating: 4.9, reviews: 218, booked: 1420,
    slots: 9,
    transport: 'Xe giường nằm + xe máy địa hình',
    hotel: '3★ & homestay bản địa',
    tags: ['Trekking', 'Xe máy', 'Văn hoá'],
    departures: departures(9, 7, 6),
    summary:
      'Vòng cung Đồng Văn – Mèo Vạc qua đèo Mã Pí Lèng, sông Nho Quế và những bản người Mông nằm giữa cao nguyên đá.',
    highlights: [
      { ic: 'boat',   t: 'Hẻm vực Tu Sản',      d: 'Chèo thuyền trên sông Nho Quế xanh ngọc, luồn giữa hai vách đá dựng đứng.' },
      { ic: 'home',   t: 'Homestay Lô Lô Chải', d: 'Ngủ một đêm trong bản người Lô Lô, ngay dưới chân cột cờ Lũng Cú.' },
      { ic: 'guide',  t: 'Bữa tối người Mông',  d: 'Ăn cùng gia đình bản địa và nghe kể chuyện chợ phiên vùng cao.' },
      { ic: 'camera', t: 'Dốc Thẩm Mã lúc sớm', d: 'Giờ vàng cho nhiếp ảnh: chín khúc cua uốn quanh sườn cao nguyên đá.' }
    ],
    itinerary: [
      { title: 'Hà Nội → Hà Giang', detail: 'Khởi hành tối, xe giường nằm limousine. Nhận phòng, nghỉ ngơi và ăn sáng tại TP. Hà Giang.' },
      { title: 'Quản Bạ – Yên Minh – Đồng Văn', detail: 'Cổng trời Quản Bạ, dốc Thẩm Mã, dinh thự họ Vương. Chiều dạo phố cổ Đồng Văn, tối cà phê Phố Cổ.' },
      { title: 'Lũng Cú – Mã Pí Lèng – Nho Quế', detail: 'Cột cờ Lũng Cú, đèo Mã Pí Lèng, chèo thuyền hẻm Tu Sản. Nghỉ đêm tại Mèo Vạc.' },
      { title: 'Mèo Vạc → Hà Nội', detail: 'Ghé chợ phiên (nếu đúng ngày), mua thổ cẩm và mật ong bạc hà. Về đến Hà Nội khoảng 20h.' }
    ],
    includes: ['Xe limousine khứ hồi', 'Khách sạn 3★ và homestay', '3 bữa sáng, 6 bữa chính', 'Vé tham quan & thuyền Nho Quế', 'HDV theo đoàn', 'Bảo hiểm 120 triệu/khách'],
    excludes: ['Chi phí cá nhân, đồ uống', 'Thuê xe máy riêng (350.000đ/ngày)', 'Tiền tip HDV & lái xe']
  },

  {
    id: 'sapa',
    photo: 'images/t-sapa.jpg',
    name: 'Sa Pa — Săn mây Fansipan',
    location: 'Lào Cai',
    region: 'bac',
    scene: { shape: 'peaks', theme: 'misty' },
    days: 3, nights: 2,
    price: 3_690_000,
    oldPrice: 4_500_000,
    rating: 4.7, reviews: 341, booked: 2380,
    slots: 14,
    transport: 'Xe limousine cao tốc',
    hotel: 'Khách sạn 4★ trung tâm',
    tags: ['Núi', 'Cáp treo', 'Gia đình'],
    departures: departures(5, 4, 8),
    summary:
      'Chinh phục nóc nhà Đông Dương bằng cáp treo, đi bộ bản Cát Cát và ngắm ruộng bậc thang mùa nước đổ.',
    highlights: [
      { ic: 'cable',    t: 'Cáp treo Fansipan',  d: 'Mười lăm phút lên nóc nhà Đông Dương ở độ cao 3.143m.' },
      { ic: 'mountain', t: 'Bản Cát Cát',        d: 'Đi bộ xuống bản người Mông, ghé thác Tiên Sa giữa thung lũng.' },
      { ic: 'food',     t: 'Chợ đêm Sa Pa',      d: 'Lẩu cá hồi bản địa và đồ nướng giữa phố núi buổi tối.' },
      { ic: 'camera',   t: 'Cầu kính Rồng Mây',  d: 'Tuỳ chọn thêm: sàn kính vươn ra khỏi vách đèo Ô Quy Hồ.' }
    ],
    itinerary: [
      { title: 'Hà Nội → Sa Pa', detail: 'Xe limousine sáng sớm theo cao tốc Nội Bài – Lào Cai. Chiều tham quan bản Cát Cát, tối tự do chợ đêm.' },
      { title: 'Fansipan', detail: 'Cáp treo lên đỉnh Fansipan, quần thể tâm linh. Chiều Hàm Rồng ngắm toàn cảnh thị trấn trong mây.' },
      { title: 'Sa Pa → Hà Nội', detail: 'Ghé thác Bạc và đèo Ô Quy Hồ, mua đặc sản. Về Hà Nội khoảng 19h.' }
    ],
    includes: ['Xe limousine khứ hồi', 'Khách sạn 4★', '2 bữa sáng, 4 bữa chính', 'Vé cáp treo Fansipan', 'HDV theo đoàn', 'Bảo hiểm du lịch'],
    excludes: ['Cầu kính Rồng Mây', 'Chi phí cá nhân', 'Tiền tip']
  },

  {
    id: 'ninh-binh',
    photo: 'images/t-ha-long.jpg',
    name: 'Ninh Bình — Tràng An & Tam Cốc',
    location: 'Ninh Bình',
    region: 'bac',
    scene: { shape: 'waves', theme: 'jade' },
    days: 2, nights: 1,
    price: 2_290_000,
    oldPrice: 2_800_000,
    rating: 4.6, reviews: 187, booked: 1960,
    slots: 20,
    transport: 'Xe 29 chỗ đời mới',
    hotel: 'Resort 4★ ven núi',
    tags: ['Di sản', 'Cuối tuần', 'Gia đình'],
    departures: departures(3, 3, 10),
    summary:
      'Hai ngày cuối tuần giữa "Hạ Long trên cạn": đò Tràng An, hang Múa 500 bậc và cố đô Hoa Lư.',
    highlights: [
      { ic: 'boat',     t: 'Đò Tràng An tuyến 3', d: 'Hơn hai giờ trên đò, xuyên 9 hang động nước nối liền nhau.' },
      { ic: 'mountain', t: 'Hang Múa 500 bậc',    d: 'Leo lên đỉnh để nhìn trọn thung lũng Tam Cốc từ trên cao.' },
      { ic: 'temple',   t: 'Cố đô Hoa Lư',        d: 'Đền vua Đinh – vua Lê giữa vùng núi đá của kinh đô cũ.' },
      { ic: 'food',     t: 'Đặc sản Ninh Bình',   d: 'Cơm cháy, dê núi và trà sen — ăn ngay tại vùng làm ra chúng.' }
    ],
    itinerary: [
      { title: 'Hà Nội → Hoa Lư → Tràng An', detail: 'Khởi hành 7h30, tham quan cố đô Hoa Lư. Chiều đi đò Tràng An, nhận phòng resort.' },
      { title: 'Hang Múa → Hà Nội', detail: 'Sáng leo hang Múa, ghé vườn chim Thung Nham. Ăn trưa đặc sản dê núi, về Hà Nội chiều.' }
    ],
    includes: ['Xe đưa đón', 'Resort 4★', '1 bữa sáng, 3 bữa chính', 'Vé đò & vé tham quan', 'HDV', 'Bảo hiểm'],
    excludes: ['Đồ uống', 'Chi phí cá nhân', 'Tiền tip']
  },

  {
    id: 'da-nang-hoi-an',
    photo: 'images/t-coast.jpg',
    name: 'Đà Nẵng — Hội An — Bà Nà Hills',
    location: 'Đà Nẵng',
    region: 'trung',
    scene: { shape: 'city', theme: 'sunset' },
    days: 4, nights: 3,
    price: 6_490_000,
    oldPrice: 7_900_000,
    rating: 4.8, reviews: 526, booked: 4120,
    slots: 16,
    transport: 'Vé máy bay khứ hồi + xe đưa đón',
    hotel: 'Khách sạn 4★ mặt biển Mỹ Khê',
    tags: ['Biển', 'Gia đình', 'Bay thẳng'],
    departures: departures(6, 5, 8),
    summary:
      'Combo kinh điển miền Trung: Cầu Vàng Bà Nà, phố cổ Hội An lên đèn và bãi biển Mỹ Khê trong xanh.',
    highlights: [
      { ic: 'cable',  t: 'Cầu Vàng Bà Nà',     d: 'Cáp treo kỷ lục thế giới lên đỉnh, làng Pháp và vườn hoa Le Jardin.' },
      { ic: 'show',   t: 'Hoa đăng sông Hoài', d: 'Thả đèn trên sông giữa phố cổ Hội An đúng lúc lên đèn.' },
      { ic: 'temple', t: 'Ngũ Hành Sơn',       d: 'Chùa trong lòng núi đá, dưới chân là làng đá mỹ nghệ Non Nước.' },
      { ic: 'island', t: 'Biển Mỹ Khê',        d: 'Buổi sáng cuối dành trọn cho bãi biển ngay trước khách sạn.' }
    ],
    itinerary: [
      { title: 'Bay đến Đà Nẵng', detail: 'Đón sân bay, nhận phòng khách sạn ven biển. Chiều cầu Rồng, chợ Hàn, tối du thuyền sông Hàn.' },
      { title: 'Bà Nà Hills', detail: 'Cáp treo kỷ lục thế giới, Cầu Vàng, Fantasy Park, vườn hoa Le Jardin. Tối tự do.' },
      { title: 'Ngũ Hành Sơn – Hội An', detail: 'Sáng Ngũ Hành Sơn, chiều phố cổ Hội An, chùa Cầu, nhà cổ Tấn Ký. Tối thả hoa đăng.' },
      { title: 'Tự do → bay về', detail: 'Sáng tắm biển hoặc mua đặc sản. Ra sân bay theo giờ bay.' }
    ],
    includes: ['Vé máy bay khứ hồi + 7kg xách tay', 'Khách sạn 4★', '3 bữa sáng, 5 bữa chính', 'Vé Bà Nà & phố cổ', 'HDV suốt tuyến', 'Bảo hiểm'],
    excludes: ['Hành lý ký gửi', 'Phụ thu phòng đơn', 'Chi phí cá nhân']
  },

  {
    id: 'hue',
    photo: 'images/t-heritage.jpg',
    name: 'Huế — Kinh thành và sông Hương',
    location: 'Thừa Thiên Huế',
    region: 'trung',
    scene: { shape: 'city', theme: 'royal' },
    days: 3, nights: 2,
    price: 4_190_000,
    oldPrice: 4_990_000,
    rating: 4.5, reviews: 143, booked: 890,
    slots: 18,
    transport: 'Tàu hoà hoặc xe theo lịch đoàn',
    hotel: 'Khách sạn 4★ bờ nam sông Hương',
    tags: ['Di sản', 'Ẩm thực', 'Nhẹ nhàng'],
    departures: departures(11, 7, 6),
    summary:
      'Ba ngày đi chậm ở cố đô: Đại Nội, lăng Khải Định, ca Huế trên sông và một bữa cơm cung đình.',
    highlights: [
      { ic: 'castle', t: 'Đại Nội & Tử Cấm Thành', d: 'Trọn một buổi sáng đi bộ trong kinh thành nhà Nguyễn.' },
      { ic: 'temple', t: 'Lăng Khải Định',         d: 'Cùng lăng Minh Mạng — hai lối kiến trúc lăng tẩm khác hẳn nhau.' },
      { ic: 'show',   t: 'Ca Huế trên sông Hương', d: 'Nghe hát trên thuyền rồng ngay buổi tối đầu tiên của hành trình.' },
      { ic: 'food',   t: 'Bàn ăn xứ Huế',          d: 'Bún bò, bánh bèo nậm lọc, chè cung đình và một bữa cơm cung đình.' }
    ],
    itinerary: [
      { title: 'Đến Huế', detail: 'Nhận phòng, chiều tham quan chùa Thiên Mụ, tối ca Huế trên sông Hương.' },
      { title: 'Đại Nội – lăng tẩm', detail: 'Sáng Đại Nội, chiều lăng Khải Định và Minh Mạng. Tối phố đi bộ Nguyễn Đình Chiểu.' },
      { title: 'Chợ Đông Ba → về', detail: 'Mua mè xửng, tôm chua tại chợ Đông Ba. Tiễn khách theo giờ tàu/bay.' }
    ],
    includes: ['Khách sạn 4★', '2 bữa sáng, 3 bữa chính (1 bữa cơm cung đình)', 'Vé di tích', 'Thuyền rồng ca Huế', 'HDV', 'Bảo hiểm'],
    excludes: ['Vé máy bay/tàu đến Huế', 'Chi phí cá nhân', 'Tiền tip']
  },

  {
    id: 'quy-nhon',
    photo: 'images/t-lagoon.jpg',
    name: 'Quy Nhơn — Kỳ Co & Eo Gió',
    location: 'Bình Định',
    region: 'trung',
    scene: { shape: 'waves', theme: 'ocean' },
    days: 3, nights: 2,
    price: 5_290_000,
    oldPrice: 6_100_000,
    rating: 4.7, reviews: 209, booked: 1180,
    slots: 12,
    transport: 'Vé máy bay khứ hồi + cano',
    hotel: 'Resort 4★ biển Quy Nhơn',
    tags: ['Biển', 'Lặn ngắm san hô', 'Cặp đôi'],
    departures: departures(8, 6, 7),
    summary:
      'Biển trong như bể bơi ở Kỳ Co, gió lộng ở Eo Gió và những tháp Chăm nghìn năm giữa lòng thành phố.',
    highlights: [
      { ic: 'boat',   t: 'Cano ra Kỳ Co',    d: 'Bãi tắm nước hai màu, cát trắng kẹp giữa hai vách núi.' },
      { ic: 'dive',   t: 'San hô Hòn Khô',   d: 'Lặn ống thở ngay gần bờ, có dụng cụ và người hướng dẫn đi kèm.' },
      { ic: 'sunset', t: 'Eo Gió cuối chiều', d: 'Con đường men vách đá lộng gió, đẹp nhất lúc mặt trời xuống.' },
      { ic: 'temple', t: 'Tháp Đôi Chăm',    d: 'Tháp Chăm nghìn năm giữa thành phố, cùng bảo tàng Quang Trung.' }
    ],
    itinerary: [
      { title: 'Bay đến Quy Nhơn', detail: 'Đón sân bay Phù Cát, nhận phòng. Chiều Eo Gió đón hoàng hôn, tối ăn hải sản chợ đêm.' },
      { title: 'Kỳ Co – Hòn Khô', detail: 'Cano ra Kỳ Co, tắm biển và lặn ngắm san hô Hòn Khô. Trưa ăn hải sản trên đảo.' },
      { title: 'Tháp Đôi → bay về', detail: 'Tham quan Tháp Đôi, mua nem chợ Huyện và bánh ít lá gai. Ra sân bay.' }
    ],
    includes: ['Vé máy bay khứ hồi', 'Resort 4★', '2 bữa sáng, 4 bữa chính', 'Cano & vé đảo', 'Dụng cụ lặn ống thở', 'Bảo hiểm'],
    excludes: ['Hành lý ký gửi', 'Đồ uống', 'Chi phí cá nhân']
  },

  {
    id: 'phu-quoc',
    photo: 'images/t-phu-quoc.jpg',
    name: 'Phú Quốc — Đảo ngọc 4 ngày',
    location: 'Kiên Giang',
    region: 'nam',
    scene: { shape: 'waves', theme: 'tropic' },
    days: 4, nights: 3,
    price: 7_890_000,
    oldPrice: 9_600_000,
    rating: 4.8, reviews: 612, booked: 5210,
    slots: 11,
    transport: 'Vé máy bay khứ hồi',
    hotel: 'Resort 5★ bãi Trường',
    tags: ['Biển', 'Nghỉ dưỡng', 'Cặp đôi'],
    departures: departures(7, 5, 9),
    summary:
      'Ba đêm resort 5★ sát biển, cáp treo Hòn Thơm dài nhất thế giới và hoàng hôn ở Sunset Sanato.',
    highlights: [
      { ic: 'cable',  t: 'Cáp treo Hòn Thơm', d: 'Tuyến cáp treo vượt biển 7.899m nối An Thới với đảo Hòn Thơm.' },
      { ic: 'sunset', t: 'Sunset Sanato',     d: 'Ngắm hoàng hôn ở bãi biển nổi tiếng nhất Nam đảo.' },
      { ic: 'dive',   t: 'Câu cá & lặn san hô', d: 'Tàu ra khu bảo tồn biển, lặn ngắm san hô và câu cá cả buổi.' },
      { ic: 'show',   t: 'Grand World',       d: 'Show Tinh hoa Việt Nam, và một tối dạo chợ đêm Phú Quốc.' }
    ],
    itinerary: [
      { title: 'Bay đến Phú Quốc', detail: 'Đón sân bay, nhận phòng resort bãi Trường. Chiều tự do tắm biển, tối chợ đêm.' },
      { title: 'Nam đảo – Hòn Thơm', detail: 'Cáp treo Hòn Thơm, công viên nước Aquatopia. Chiều Sunset Sanato ngắm hoàng hôn.' },
      { title: 'Câu cá – lặn biển', detail: 'Tàu ra khu bảo tồn biển, lặn ngắm san hô và câu cá. Tối Grand World, xem show.' },
      { title: 'Tự do → bay về', detail: 'Sáng nghỉ ngơi tại resort, mua nước mắm và hồ tiêu. Ra sân bay.' }
    ],
    includes: ['Vé máy bay khứ hồi', 'Resort 5★ 3 đêm', '3 bữa sáng buffet, 5 bữa chính', 'Cáp treo & tàu lặn', 'HDV', 'Bảo hiểm 200 triệu'],
    excludes: ['Hành lý ký gửi', 'Phụ thu phòng đơn', 'Chi phí cá nhân']
  },

  {
    id: 'mien-tay',
    photo: 'images/t-tropical.jpg',
    name: 'Miền Tây — Chợ nổi Cái Răng & Cà Mau',
    location: 'Cần Thơ — Cà Mau',
    region: 'nam',
    scene: { shape: 'waves', theme: 'delta' },
    days: 3, nights: 2,
    price: 3_390_000,
    oldPrice: 4_100_000,
    rating: 4.5, reviews: 168, booked: 1340,
    slots: 22,
    transport: 'Xe 45 chỗ + ghe máy',
    hotel: 'Khách sạn 3★ + homestay vườn',
    tags: ['Sông nước', 'Ẩm thực', 'Gia đình'],
    departures: departures(4, 6, 7),
    summary:
      'Dậy sớm đi chợ nổi Cái Răng, ăn bún riêu trên ghe, ngủ nhà vườn và chạm mốc toạ độ quốc gia đất Mũi.',
    highlights: [
      { ic: 'boat',    t: 'Chợ nổi Cái Răng',   d: 'Rời bến từ sáng sớm, ăn sáng ngay trên ghe giữa chợ.' },
      { ic: 'blossom', t: 'Vườn Phong Điền',    d: 'Hái trái cây tại vườn và nghe đờn ca tài tử buổi trưa.' },
      { ic: 'pin',     t: 'Mốc toạ độ đất Mũi', d: 'Cano xuyên rừng ngập mặn tới mốc GPS 0001 của quốc gia.' },
      { ic: 'food',    t: 'Bàn ăn miền Tây',    d: 'Lẩu mắm, cá lóc nướng trui và bánh xèo ăn ngay tại nhà vườn.' }
    ],
    itinerary: [
      { title: 'TP.HCM → Cần Thơ', detail: 'Ghé chùa Vĩnh Tràng (Mỹ Tho), chiều bến Ninh Kiều, tối cầu đi bộ Cần Thơ.' },
      { title: 'Chợ nổi – Cà Mau', detail: 'Sáng sớm ghe ra chợ nổi Cái Răng, lò hủ tiếu. Chiều di chuyển về Cà Mau.' },
      { title: 'Đất Mũi → TP.HCM', detail: 'Cano vào đất Mũi, mốc toạ độ quốc gia, rừng đước. Chiều về TP.HCM.' }
    ],
    includes: ['Xe đưa đón', 'Khách sạn 3★ & homestay', '2 bữa sáng, 5 bữa chính', 'Ghe, cano, vé tham quan', 'HDV', 'Bảo hiểm'],
    excludes: ['Đồ uống', 'Chi phí cá nhân', 'Tiền tip']
  },

  {
    id: 'con-dao',
    photo: 'images/t-cliff.jpg',
    name: 'Côn Đảo — Tâm linh và biển vắng',
    location: 'Bà Rịa – Vũng Tàu',
    region: 'nam',
    scene: { shape: 'waves', theme: 'deep' },
    days: 3, nights: 2,
    price: 6_990_000,
    oldPrice: 8_200_000,
    rating: 4.9, reviews: 97, booked: 640,
    slots: 8,
    transport: 'Vé máy bay khứ hồi',
    hotel: 'Khách sạn 4★ trung tâm đảo',
    tags: ['Tâm linh', 'Biển vắng', 'Lịch sử'],
    departures: departures(12, 7, 5),
    summary:
      'Viếng mộ chị Võ Thị Sáu lúc nửa đêm, đi qua nhà tù Phú Hải và tắm ở những bãi biển gần như không bóng người.',
    highlights: [
      { ic: 'bookmark', t: 'Lễ viếng lúc 0h',   d: 'Nghĩa trang Hàng Dương, mộ chị Võ Thị Sáu giữa đêm.' },
      { ic: 'castle',   t: 'Nhà tù Côn Đảo',    d: 'Trại Phú Hải, chuồng cọp Pháp và bảo tàng Côn Đảo.' },
      { ic: 'island',   t: 'Những bãi biển vắng', d: 'Đầm Trầu, bãi Nhát và mũi Cá Mập — gần như không bóng người.' },
      { ic: 'dive',     t: 'Hòn Bảy Cạnh',      d: 'Cano ra đảo lặn ngắm san hô, xem rùa đẻ theo mùa.' }
    ],
    itinerary: [
      { title: 'Bay ra Côn Đảo', detail: 'Nhận phòng, chiều bãi Đầm Trầu. Đêm viếng nghĩa trang Hàng Dương.' },
      { title: 'Di tích – hòn Bảy Cạnh', detail: 'Sáng nhà tù Phú Hải, bảo tàng Côn Đảo. Chiều cano ra hòn Bảy Cạnh, lặn ngắm san hô.' },
      { title: 'Tự do → bay về', detail: 'Sáng tự do, mua hạt bàng rang muối. Ra sân bay Cỏ Ống.' }
    ],
    includes: ['Vé máy bay khứ hồi', 'Khách sạn 4★', '2 bữa sáng, 4 bữa chính', 'Cano & vé di tích', 'Lễ viếng', 'Bảo hiểm'],
    excludes: ['Hành lý ký gửi', 'Chi phí cá nhân', 'Tiền tip']
  },

  {
    id: 'nhat-ban',
    photo: 'images/t-japan.jpg',
    name: 'Nhật Bản — Cung đường vàng mùa lá đỏ',
    location: 'Tokyo — Kyoto — Osaka',
    region: 'quocte',
    scene: { shape: 'city', theme: 'maple' },
    days: 6, nights: 5,
    price: 32_900_000,
    oldPrice: 37_500_000,
    rating: 4.9, reviews: 274, booked: 1120,
    slots: 6,
    transport: 'Bay thẳng + Shinkansen',
    hotel: 'Khách sạn 4★ trung tâm',
    tags: ['Quốc tế', 'Mùa lá đỏ', 'Bay thẳng'],
    departures: departures(21, 14, 5),
    summary:
      'Sáu ngày qua Tokyo – Phú Sĩ – Kyoto – Osaka đúng mùa momiji, đi tàu siêu tốc Shinkansen một chặng.',
    highlights: [
      { ic: 'mountain', t: 'Núi Phú Sĩ trạm 5', d: 'Lên trạm 5, ghé hồ Kawaguchi và làng cổ Oshino Hakkai.' },
      { ic: 'temple',   t: 'Kinkaku-ji & Arashiyama', d: 'Chùa Vàng buổi sáng, rừng trúc Arashiyama buổi chiều.' },
      { ic: 'gate',     t: 'Đền Fushimi Inari', d: 'Đường hầm nghìn cổng torii đỏ chạy dọc sườn núi Inari.' },
      { ic: 'train',    t: 'Shinkansen một chặng', d: 'Tàu siêu tốc Kyoto – Osaka, vé đã nằm sẵn trong giá tour.' }
    ],
    itinerary: [
      { title: 'TP.HCM/Hà Nội → Tokyo', detail: 'Bay thẳng đêm. Đến Narita, làm thủ tục nhập cảnh, nhận phòng.' },
      { title: 'Tokyo', detail: 'Chùa Asakusa, phố Nakamise, hoàng cung, Shibuya và Shinjuku.' },
      { title: 'Núi Phú Sĩ', detail: 'Trạm 5 núi Phú Sĩ, làng cổ Oshino Hakkai, onsen tại khách sạn.' },
      { title: 'Nagoya → Kyoto', detail: 'Lâu đài Nagoya, chiều đến Kyoto: Kinkaku-ji, phố cổ Gion.' },
      { title: 'Kyoto → Osaka', detail: 'Fushimi Inari, Arashiyama. Shinkansen về Osaka, tối Dotonbori.' },
      { title: 'Osaka → về Việt Nam', detail: 'Lâu đài Osaka, mua sắm Shinsaibashi. Ra sân bay Kansai.' }
    ],
    includes: ['Vé máy bay khứ hồi + thuế phí', 'Visa Nhật Bản', 'Khách sạn 4★ 5 đêm', 'Toàn bộ bữa ăn theo chương trình', 'Vé Shinkansen 1 chặng', 'HDV tiếng Việt suốt tuyến', 'Bảo hiểm quốc tế 50.000 USD'],
    excludes: ['Hành lý quá cước', 'Phụ thu phòng đơn', 'Tiền tip HDV & lái xe (khoảng 1.000 JPY/ngày)']
  },

  {
    id: 'han-quoc',
    photo: 'images/t-city-night.jpg',
    name: 'Hàn Quốc — Seoul & đảo Nami',
    location: 'Seoul — Gyeonggi',
    region: 'quocte',
    scene: { shape: 'city', theme: 'frost' },
    days: 5, nights: 4,
    price: 18_900_000,
    oldPrice: 22_000_000,
    rating: 4.6, reviews: 318, booked: 1870,
    slots: 10,
    transport: 'Bay thẳng',
    hotel: 'Khách sạn 4★ Myeongdong',
    tags: ['Quốc tế', 'Mua sắm', 'Gia đình'],
    departures: departures(16, 10, 6),
    summary:
      'Seoul hiện đại, đảo Nami thơ mộng, công viên Everland và một buổi mặc hanbok dạo cung Gyeongbok.',
    highlights: [
      { ic: 'castle',  t: 'Cung Gyeongbok',   d: 'Mặc hanbok để được miễn vé vào cửa, ghé làng cổ Bukchon.' },
      { ic: 'blossom', t: 'Đảo Nami',         d: 'Hàng cây thẳng tắp và vườn Ngôi sao nhỏ, cùng làng Pháp Petite France.' },
      { ic: 'show',    t: 'Công viên Everland', d: 'Trọn một ngày trong công viên giải trí lớn nhất Hàn Quốc.' },
      { ic: 'gift',    t: 'Myeongdong & Namsan', d: 'Mua sắm mỹ phẩm ban ngày, lên tháp Namsan buổi tối.' }
    ],
    itinerary: [
      { title: 'Bay đến Seoul', detail: 'Đến Incheon, nhận phòng, tối dạo Myeongdong.' },
      { title: 'Đảo Nami – Petite France', detail: 'Đảo Nami, làng Pháp Petite France, vườn Ngôi sao nhỏ.' },
      { title: 'Everland', detail: 'Trọn ngày tại công viên Everland, tối tháp Namsan.' },
      { title: 'Cung Gyeongbok – mua sắm', detail: 'Mặc hanbok tham quan cung, làng Bukchon, mua sắm Dongdaemun.' },
      { title: 'Về Việt Nam', detail: 'Mua sắm sâm và mỹ phẩm, ra sân bay.' }
    ],
    includes: ['Vé máy bay khứ hồi + thuế phí', 'Visa Hàn Quốc', 'Khách sạn 4★ 4 đêm', 'Các bữa ăn theo chương trình', 'Vé Everland & Nami', 'HDV tiếng Việt', 'Bảo hiểm quốc tế'],
    excludes: ['Hành lý quá cước', 'Phụ thu phòng đơn', 'Chi phí cá nhân']
  },

  {
    id: 'thai-lan',
    photo: 'images/t-bangkok.jpg',
    name: 'Thái Lan — Bangkok & Pattaya',
    location: 'Bangkok — Pattaya',
    region: 'quocte',
    scene: { shape: 'city', theme: 'gold' },
    days: 5, nights: 4,
    price: 9_990_000,
    oldPrice: 12_500_000,
    rating: 4.4, reviews: 402, booked: 3260,
    slots: 24,
    transport: 'Bay thẳng',
    hotel: 'Khách sạn 4★',
    tags: ['Quốc tế', 'Giá tốt', 'Mua sắm'],
    departures: departures(6, 4, 10),
    summary:
      'Tour quốc tế dễ đi nhất cho người mới: chùa Vàng, chợ nổi Pattaya, đảo San Hô và show Alcazar.',
    highlights: [
      { ic: 'temple', t: 'Chùa Phật Vàng',   d: 'Cùng chùa Thuyền — hai ngôi chùa quen thuộc nhất Bangkok.' },
      { ic: 'boat',   t: 'Đảo San Hô Koh Larn', d: 'Cano ra đảo, tắm biển, thể thao nước và ăn hải sản.' },
      { ic: 'show',   t: 'Show Alcazar',     d: 'Buổi diễn nổi tiếng của Pattaya, ban ngày là trân bảo Phật Sơn.' },
      { ic: 'market', t: 'Asiatique & Pratunam', d: 'Chợ đêm bên sông và khu bán sỉ quần áo lớn của Bangkok.' }
    ],
    itinerary: [
      { title: 'Bay đến Bangkok', detail: 'Đến Suvarnabhumi, di chuyển về Pattaya, tối dạo Walking Street.' },
      { title: 'Đảo San Hô', detail: 'Cano ra Koh Larn, tắm biển, ăn hải sản. Tối xem show Alcazar.' },
      { title: 'Pattaya → Bangkok', detail: 'Trân bảo Phật Sơn, chợ nổi Pattaya. Chiều về Bangkok.' },
      { title: 'Bangkok', detail: 'Chùa Phật Vàng, chùa Thuyền, mua sắm Asiatique và Pratunam.' },
      { title: 'Về Việt Nam', detail: 'Tự do buổi sáng, ra sân bay theo giờ bay.' }
    ],
    includes: ['Vé máy bay khứ hồi + thuế phí', 'Khách sạn 4★ 4 đêm', 'Các bữa ăn theo chương trình', 'Cano & vé show', 'HDV tiếng Việt', 'Bảo hiểm quốc tế'],
    excludes: ['Hành lý ký gửi', 'Phụ thu phòng đơn', 'Tiền tip 5 USD/ngày']
  }
];

/* Điểm đến nổi bật — bấm vào sẽ lọc danh sách tour */
const DESTINATIONS = [
  { label: 'Ninh Bình', note: 'Từ 2.29 triệu',  q: 'Ninh Bình', photo: 'images/d-ha-long.jpg',  scene: { shape: 'waves', theme: 'jade' } },
  { label: 'Sa Pa',     note: 'Từ 3.69 triệu',  q: 'Lào Cai',   photo: 'images/t-sapa.jpg',     scene: { shape: 'peaks', theme: 'misty' } },
  { label: 'Phú Quốc',  note: 'Từ 7.89 triệu',  q: 'Kiên Giang', photo: 'images/t-phu-quoc.jpg', scene: { shape: 'waves', theme: 'tropic' } },
  { label: 'Thái Lan',  note: 'Từ 9.99 triệu',  q: 'Bangkok',   photo: 'images/d-thailand.jpg', scene: { shape: 'city',  theme: 'gold' } },
  { label: 'Hàn Quốc',  note: 'Từ 18.9 triệu',  q: 'Seoul',     photo: 'images/d-korea.jpg',    scene: { shape: 'city',  theme: 'frost' } },
  { label: 'Nhật Bản',  note: 'Từ 32.9 triệu',  q: 'Tokyo',     photo: 'images/d-japan.jpg',    scene: { shape: 'city',  theme: 'maple' } }
];

/* `photo` là ảnh CHUYẾN ĐI, không phải ảnh chân dung khách: cảnh cảm nhận bày
   mỗi lần một thẻ khổ lớn, nửa thẻ là ảnh — một tấm chân dung phóng to cỡ đó
   vừa không có sẵn vừa lạc đề, còn ảnh nơi họ vừa đi thì nhắc đúng chuyến mà
   họ đang kể. Thiếu trường này thẻ vẫn dựng được, chỉ mất cột ảnh.          */
const REVIEWS = [
  { name: 'Trần Thu Hà', trip: 'Hà Giang 4N3Đ', stars: 5, photo: 'images/t-highland.jpg', text: 'Lịch trình dày nhưng không mệt, HDV thuộc từng khúc cua. Homestay ở Lô Lô Chải sạch và ấm hơn mình tưởng nhiều.' },
  { name: 'Nguyễn Minh Đức', trip: 'Phú Quốc 4N3Đ', stars: 5, photo: 'images/t-phu-quoc.jpg', text: 'Đặt cho cả nhà 6 người, được xếp phòng liền kề như yêu cầu. Báo giá sao thì thu đúng vậy, không phát sinh gì.' },
  { name: 'Lê Phương Anh', trip: 'Nhật Bản 6N5Đ', stars: 5, photo: 'images/t-japan.jpg', text: 'Visa được hỗ trợ hồ sơ rất kỹ. Đi đúng tuần lá đỏ đẹp nhất ở Kyoto, ảnh chụp không cần chỉnh.' },
  { name: 'Phạm Quốc Huy', trip: 'Ninh Bình 2N1Đ', stars: 4, photo: 'images/t-ha-long.jpg', text: 'Tour cuối tuần hợp lý cho dân văn phòng. Trừ đoạn leo hang Múa hơi đông người, còn lại đều ổn.' }
];

/* ========================== TRẢI NGHIỆM ==================================
   Hoạt động lẻ trong ngày, KHÔNG phải tour: không có ngày khởi hành cố định,
   không qua luồng đặt chỗ ba bước. Vì thế chúng là một mảng riêng chứ không
   phải một cờ trên TOURS — nhét chung thì mọi hàm lọc, sắp xếp và cả modal
   đặt tour đều phải mọc thêm một nhánh "nếu là trải nghiệm thì...".

   `loc` PHẢI trùng từng ký tự với một `location` trong TOURS. Đó là dây nối
   sang trang điểm đến: thẻ trải nghiệm dẫn người xem tới chỗ có tour thật để
   đặt. Gõ sai một dấu là app.js bỏ luôn nút ấy (xem expDestHref) — im lặng
   nhưng không gãy.

   `kind` vừa là nhãn trên ảnh vừa là bộ lọc; thêm giá trị mới ở đây là hàng
   chip tự có thêm mục, không phải khai báo ở chỗ nào khác.                 */
const EXPERIENCES = [
  {
    id: 'kham-pha-dai-noi-hue', kind: 'Văn hoá',
    title: 'Khám phá Đại Nội Huế: hành trình qua dấu ấn Hoàng thành',
    loc: 'Thừa Thiên Huế', photo: 'images/Đại nội Huế/Đại nội Huế.png',
    read: 8,
    sum: 'Đi qua Ngọ Môn, sân Đại Triều Nghi và những lớp cung điện để hiểu thêm về kiến trúc, nghi lễ cùng đời sống bên trong Kinh thành Huế.'
  },
  {
    id: 'kayak-ha-long', kind: 'Trên nước',
    title: 'Kinh nghiệm chèo kayak qua hang Sáng — hang Tối',
    loc: 'Ninh Bình', photo: 'images/t-ha-long.jpg',
    dur: '4 giờ', group: 8, price: 690_000, best: 'Tháng 10 – tháng 4',
    sum: 'Xuất phát lúc 6h sáng khi mặt nước còn phẳng như gương. Luồn qua hai hang xuyên thuỷ, ra tới áng nước kín bốn bề vách đá rồi tắt mái chèo nghe vọng âm.'
  },
  {
    id: 'san-ho-hon-thom', kind: 'Trên nước',
    title: 'Khám phá thế giới san hô dưới làn nước Hòn Thơm',
    loc: 'Kiên Giang', photo: 'images/t-phu-quoc.jpg',
    dur: 'Nửa ngày', group: 10, price: 1_190_000, best: 'Tháng 11 – tháng 5',
    sum: 'Ba điểm lặn nông 2–4m, nước trong nhìn thấu đáy. Có hướng dẫn viên cứu hộ đi kèm từng nhóm bốn người, không cần biết bơi giỏi.'
  },
  {
    id: 'san-may-fansipan', kind: 'Đường núi',
    title: 'Một đêm trekking và săn mây trên đỉnh Fansipan',
    loc: 'Lào Cai', photo: 'images/t-sapa.jpg',
    dur: '2 ngày 1 đêm', group: 12, price: 2_450_000, best: 'Tháng 9 – tháng 3',
    sum: 'Lên tới trạm nghỉ 2.800m lúc chiều muộn, ngủ lều, dậy 4h leo nốt đoạn cuối. Biển mây đẹp nhất trong khoảng bốn mươi phút sau khi trời hửng.'
  },
  {
    id: 'ha-giang-xe-may', kind: 'Đường núi',
    title: 'Chinh phục những khúc cua Mã Pí Lèng bằng xe máy',
    loc: 'Hà Giang', photo: 'images/t-highland.jpg',
    dur: 'Cả ngày', group: 6, price: 1_350_000, best: 'Tháng 9 – tháng 11',
    sum: 'Có tài xế bản địa cầm lái nếu bạn không muốn tự chạy. Dừng ở bốn điểm nhìn xuống sông Nho Quế, ăn trưa tại một quán nhỏ ngay chân đèo.'
  },
  {
    id: 'cho-noi-cai-rang', kind: 'Ăn uống',
    title: 'Chợ nổi Cái Răng thức giấc lúc rạng sáng',
    loc: 'Cần Thơ — Cà Mau', photo: 'images/t-tropical.jpg',
    dur: '5 giờ', group: 12, price: 540_000, best: 'Quanh năm',
    sum: 'Rời bến lúc 5h, kịp lúc ghe hàng còn đông. Ăn sáng ngay trên xuồng, ghé lò hủ tiếu và vườn trái cây trên đường về.'
  },
  {
    id: 'com-cung-dinh-hue', kind: 'Ăn uống',
    title: 'Theo chân nghệ nhân học nấu cơm cung đình Huế',
    loc: 'Thừa Thiên Huế', photo: 'images/t-heritage.jpg',
    dur: '3 giờ', group: 8, price: 780_000, best: 'Quanh năm',
    sum: 'Đi chợ Đông Ba chọn nguyên liệu trước, rồi về nhà vườn An Hiên nấu năm món. Ăn bữa mình vừa nấu ngay tại sân, có người kể tích từng món.'
  },
  {
    id: 'da-nang-dem', kind: 'Về đêm',
    title: 'Ngắm Đà Nẵng về đêm từ một chiếc Vespa cổ',
    loc: 'Đà Nẵng', photo: 'images/t-city-night.jpg',
    dur: '4 giờ', group: 6, price: 890_000, best: 'Quanh năm',
    sum: 'Mỗi khách một xe một tài xế. Bốn chặng ăn đường phố, một chặng cà phê bờ sông đúng lúc cầu Rồng phun lửa.'
  },
  {
    id: 'du-luon-quy-nhon', kind: 'Trên cao',
    title: 'Bay trên vịnh Quy Nhơn bằng dù lượn đôi',
    loc: 'Bình Định', photo: 'images/t-cliff.jpg',
    dur: '2 giờ', group: 4, price: 1_450_000, best: 'Tháng 3 – tháng 8',
    sum: 'Bay đôi cùng phi công có chứng chỉ, không cần kinh nghiệm. Khoảng 15–20 phút trên không, cất cánh từ đồi Xuân Vân và hạ xuống bãi cát.'
  },
  {
    id: 'tra-dao-kyoto', kind: 'Văn hoá',
    title: 'Một buổi trà đạo tĩnh lặng trong vườn thiền Kyoto',
    loc: 'Tokyo — Kyoto — Osaka', photo: 'images/t-japan.jpg',
    dur: '2 giờ', group: 6, price: 1_980_000, best: 'Tháng 3 – tháng 5, tháng 10 – tháng 12',
    sum: 'Một buổi trà thật trong trà thất gỗ hơn trăm năm tuổi, không phải bản rút gọn cho khách đoàn. Có phiên dịch đi cùng suốt buổi.'
  }
];

/* `ic` là KHOÁ hình, không phải hình. Bản vẽ nằm ở FAQ_ICONS trong app.js —
   để markup SVG ở đây thì mỗi lần đổi nét vẽ lại phải sửa vào file dữ liệu,
   mà đảo thứ tự câu hỏi thì hình vẫn đi đúng theo câu của nó (khoá theo tên
   chứ không theo vị trí). Khoá lạ thì app.js rơi về hình mặc định. */
const FAQS = [
  { ic: 'date',   q: 'Đặt tour rồi có đổi ngày khởi hành được không?', a: 'Được. Bạn được đổi ngày miễn phí một lần nếu báo trước ngày khởi hành ít nhất 10 ngày và tour mới còn chỗ. Từ lần thứ hai, phí đổi là 300.000đ/khách với tour nội địa và 50 USD/khách với tour quốc tế.' },
  { ic: 'refund', q: 'Chính sách huỷ tour như thế nào?', a: 'Huỷ trước 15 ngày: hoàn 100%. Trước 7 ngày: hoàn 50%. Trong vòng 7 ngày trước khởi hành: không hoàn. Trường hợp bất khả kháng (thiên tai, dịch bệnh, huỷ chuyến bay) được bảo lưu 12 tháng.' },
  { ic: 'kids',   q: 'Trẻ em tính giá thế nào?', a: 'Dưới 2 tuổi tính 20% giá tour (ngủ chung giường với bố mẹ). Từ 2 đến 11 tuổi tính 75%. Từ 12 tuổi trở lên tính như người lớn. Trẻ em từ 2 tuổi vẫn cần đầy đủ giấy tờ tuỳ thân.' },
  { ic: 'pay',    q: 'Thanh toán bằng cách nào và khi nào?', a: 'Đặt cọc 50% để giữ chỗ trong 24h sau khi đặt, thanh toán phần còn lại trước ngày khởi hành 7 ngày. Hỗ trợ chuyển khoản, thẻ tín dụng và thanh toán trực tiếp tại văn phòng.' },
  { ic: 'visa',   q: 'Tour quốc tế có hỗ trợ làm visa không?', a: 'Có. Phí visa đã bao gồm trong giá tour Nhật Bản và Hàn Quốc. Chúng tôi hướng dẫn chuẩn bị hồ sơ, đặt lịch và nộp thay. Nếu bị từ chối visa, bạn chỉ mất phí lãnh sự thực tế.' },
  { ic: 'solo',   q: 'Tôi đi một mình thì có bị phụ thu không?', a: 'Giá tour tính theo phòng đôi. Nếu đi một mình mà không ghép phòng được, bạn trả phụ thu phòng đơn — hiển thị rõ ở bước đặt tour. Chúng tôi luôn ưu tiên ghép phòng cùng giới trước khi tính phụ thu.' }
];

/* Mã giảm giá: type 'percent' (%) hoặc 'amount' (đồng) */
const COUPONS = {
  VIVU10:  { type: 'percent', value: 10,        label: 'Giảm 10% toàn đơn' },
  HE2026:  { type: 'amount',  value: 500_000,   label: 'Giảm 500.000đ' },
  NHOM4:   { type: 'percent', value: 12,        label: 'Giảm 12% cho nhóm từ 4 khách', minGuests: 4 }
};

/* Phụ thu phòng đơn theo khu vực */
const SINGLE_FEE = { bac: 700_000, trung: 900_000, nam: 1_200_000, quocte: 5_500_000 };
