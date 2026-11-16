# Sợi duyên — Anh Tú & Minh Nguyệt

Website cưới của **Võ Anh Tú & Lương Hoàng Minh Nguyệt**, dựng thành các cảnh fullscreen chuyển động theo vị trí cuộn. Dùng React, Vite, Framer Motion và CSS; mobile cuộn tự nhiên, desktop có độ đệm lăn chuột ngắn và không cần backend để chạy.

Màu chủ đạo là đỏ trầm `#681320`, phối nền giấy ngà và điểm nhấn vàng. Chỉnh `--wine`, `--wine-dark`, `--thread` và các biến `--gradient-*` trong `src/styles.css`. Nền bìa, album, lời hẹn và cảm ơn dùng radial gradient từ màu chủ đạo sang đỏ tối ở viền, không có vùng sáng hơn màu chủ đạo; header có lớp đỏ tối mờ. Gradient trên ảnh vẫn giữ để hỗ trợ đọc chữ. Favicon, con trỏ và màu thanh trình duyệt đồng bộ với bảng màu này.

Chương 02 dùng nền hồng đất `--profile-paper` (`#E6CCC5`), chương 03 dùng nền ngà sáng `--letter-paper` (`#FAF7F0`). Nút tiếp tục trong `SceneHUD` là nút thật trên desktop/mobile, cuộn đến cảnh kế tiếp đang có trong trang và vẫn dùng được với bàn phím hoặc chế độ giảm chuyển động.

## Chạy local

Khuyến nghị Node.js 20.19+.

```sh
npm install
npm run dev
npm run build
npm run preview
```

PowerShell chặn `npm.ps1`: dùng `npm.cmd` thay cho `npm`.

## Cập nhật ảnh mà không sửa layout

Toàn bộ cấu hình ở `src/data/site.js`. Album không yêu cầu một số ảnh nhất định:

```js
photos: [
  {
    id: 'a-stable-photo-id', // unique; keep when reordering
    src: '/images/prewedding/our-photo.webp',
    alt: 'Mô tả ảnh',
    caption: 'Một chút yêu thương', // optional
    width: 1200,                   // optional
    height: 1800,                  // optional
    position: '50% 40%',           // optional crop position
  },
]
```

- Thêm/bớt/đổi thứ tự trong `photos`. Desktop chuyển từ chồng ảnh sang lưới rồi fullscreen; mobile xòe theo vị trí vuốt rồi giữ lưới để chạm chọn. Cảnh giới thiệu dùng tối đa 6 ảnh desktop / 4 ảnh mobile; không nhân bản để lấp ô. Nút “Xem toàn bộ album” mở lưới tải thêm từng đợt 12 ảnh, lightbox truy cập mọi ảnh. Một ảnh không hiện nút chuyển hoặc slideshow.
- `albumLeadPhotoId` chọn ảnh chính khi vào album (`BAO_5897`); `albumFinalPhotoId` chọn ảnh khi rời album (`BAO_5529`). Bìa (`BAO_5613`), lời ngỏ (`BAO_5922`) và album dùng ảnh riêng, chuyển mềm trong cùng khung. `albumPreviewPhotoIds` chọn đại diện bốn concept, độc lập với thứ tự album; ID thiếu tự bỏ qua. Album một ảnh giữ nguyên tấm duy nhất.
- `events[].photo` khai báo ảnh riêng cho từng thiệp: Vu Quy `BAO_6098`, Tân Hôn `BAO_5070`, Báo Hỷ `BAO_6400`. Khi ảnh lỗi, ưu tiên ảnh chưa dùng ở các cảnh chính; hết ảnh thì hiện nền màu. Album đầy đủ vẫn giữ cả 40 ảnh.
- Ảnh ngang/dọc giữ tỷ lệ tự nhiên trong lưới. `position` điều chỉnh vùng nhìn trong khung bìa/xòe ảnh.
- `heroPhoto`, `couplePhoto`, `groomPortrait`, `bridePortrait` là các object ảnh riêng, không phụ thuộc vị trí album. Dùng `null` khi chưa có ảnh phù hợp.
- Bìa/lời ngỏ thiếu ảnh dùng ảnh album khả dụng đầu tiên. Không còn ảnh: bìa chữ và họa tiết giấy, ẩn album/mục điều hướng. Profile thiếu chân dung dùng bố cục chữ.
- Ảnh lỗi được loại khỏi phần hiển thị và không tải lại vô hạn.
- Bộ ảnh hiện tại là đúng 40 ảnh prewedding đã chọn trong `D:\Imgs\Prewedding`, giữ thứ tự bốn bộ 11/15/8/6 ảnh. Danh sách ở `src/data/prewedding-selection.json`; mã `BAO_...` là ID ổn định.
- WebP chất lượng 90, cạnh dài tối đa 3840px, kèm bản rộng 640/1280/1920px; áp dụng EXIF và chuyển màu sRGB. Metadata trong `src/data/photo-assets.json`, URL có mã phiên bản. Album giữ ảnh ngang/dọc đúng tỷ lệ và không đưa ảnh gốc 8192px lên web.
- Tái tạo bằng `python scripts/convert-wedding-photos.py "D:\Imgs\Prewedding"` (Python + Pillow). Script chỉ đọc 40 ảnh được chọn, không sửa/xoá nguồn; bảng đối chiếu và mã SHA-256 ở `artifacts/prewedding/conversion-manifest.json`.

## Các cảnh và chuyển động

- `OpeningSequence.jsx`, `opening.css`: sợi chỉ đỏ tự vẽ thành trái tim, sau đó rèm kéo ngang sang hai bên và gom nếp nhẹ. Rèm, hai tên và ảnh dùng chung tiến độ trong `openingTimeline.js`: chữ chạy ngay khi rèm mở, cả ba hoàn thành cùng một nhịp khoảng 2 giây. Tổng màn mở đầu khoảng 4,8 giây, tối đa 5,8 giây khi ảnh chậm; có bỏ qua/Escape, giảm chuyển động và bỏ qua khi mở liên kết trực tiếp. Bìa không có trái tim giữa hai tên; không tự phát nhạc.
- `StoryFlow.jsx`: camera desktop bắt đầu ở lời ngỏ: ảnh tiến lên cùng trang 03, xoay nhẹ về vị trí đọc rồi chuyển vào chồng ảnh album. Không đưa ảnh xuyên qua chương 02. Vị trí được đo lại khi resize. Mobile dùng ảnh trong từng cảnh, không dựng camera ảnh cố định. Đường chỉ đỏ SVG và bé mèo luôn theo cuộn thực tế, chạy qua các chương và nối vào hai vòng nhẫn cuối trang.
- `CoverCamera.jsx`: ảnh phóng từ khung rộng vào cận cảnh 1,22x trên desktop / 1,18x trên mobile trong cùng nhịp kéo rèm và chữ chạy. Giữ cận cảnh khi đứng ở bìa, tự hòa về crop gốc trong đoạn cuộn đầu. Desktop thu ảnh vào khung bên phải, sau đó ảnh rời cùng trang bìa để sang phần giới thiệu. Không đổi nguồn ảnh bìa sang ảnh lời ngỏ; giảm chuyển động dùng ảnh tĩnh.
- `SoiDuyen.jsx`: tên ở bìa tiếp tục theo cuộn; lời ngỏ tự hiện theo hai nhóm chữ, ảnh mobile tự ngay ngắn khi xuất hiện. Hai dòng lời hẹn chạy làn sóng một lần trong 1 giây rồi đứng yên, không giữ thêm khoảng cuộn.
- `Families.jsx`, `families.css`: giới thiệu chú rể Developer và cô dâu Designer, cấu hình qua `profiles.groom.occupation` / `profiles.bride.occupation`; không hiển thị phụ huynh hay địa chỉ. Chân dung tách nền có viền trắng tiến vào từ hai phía, nâng/phóng/xoay rõ trong lần tự hiện 1,05 giây; nền vòm đi ngược chiều và quỹ đạo xoay với chấm nhỏ. Cô dâu hiển thị ảnh BAO_4610 gốc qua mặt nạ alpha (`cutout.maskSrc`), không dùng khuôn mặt AI tạo lại. Desktop giữ tên đầy đủ trên một hàng; mobile đặt tên, nghề nghiệp và ảnh trong hai cột tương ứng, tên dài tự ngắt dòng trong cột; giảm chuyển động hiển thị bố cục tĩnh. Mặt nạ/ảnh tách nền lỗi thì dùng chân dung gốc; thiếu chân dung thì dùng bố cục chữ.
- `Montage.jsx`: desktop giữ chồng ảnh → lưới → ảnh fullscreen theo scroll, đồng hồ dùng chung với camera. Mobile tự xòe tối đa bốn ảnh thành lưới trong 1,1 giây rồi giữ nguyên; có album đầy đủ, xem thêm và lightbox.
- `DateScenes.jsx`: desktop giữ lật thiệp theo scroll; ngày, giờ và nút RSVP đứng yên trong mỗi thiệp. Mobile có ba thiệp nối tiếp, ảnh tự hiện trong 0,8 giây; thanh chọn lễ sticky giữ nguyên, thông tin và RSVP luôn sử dụng được.
- `Scene.jsx`: tách `useEnterProgress` khỏi đồng hồ cuộn. Nhóm tự hiện bắt đầu khi đi vào 80% viewport, chạy một lần trong 0,7–1,2 giây rồi giữ trạng thái cuối; cuộn nhanh qua, focus hoặc bấm tương tác sẽ hoàn tất ngay. Intro chặn kích hoạt sớm; cuộn ngược/resize không phát lại. `data-scene-mode` phân biệt `scroll`, `enter`, `static`; giảm chuyển động hiển thị nội dung ngay. Camera/album/lật thiệp desktop vẫn dùng scroll; chỉ đỏ và mèo luôn theo cuộn thật.
- Tiến độ cuộn có độ đệm ngắn, không nảy; chuyển ngay khi nhảy xa bằng mục lục. Thiệp và đội hình ảnh dùng easing có gia tốc mềm ở hai đầu; đồng hồ ảnh vẫn bám vị trí cuộn thực tế.
- `Editorial.jsx`: vòng nhẫn tự vẽ trong 1,2 giây khi xuất hiện, không cần cuộn đến đáy trang; lời cảm ơn hiện một lần, giữ nút RSVP và về đầu trang.
- `Guestbook.jsx`, `WishWall.jsx`, `guestbook.css`: tiêu đề trang thư tự hiện; form luôn đứng yên kể cả trong lúc tiêu đề đang chạy. Bố cục thu gọn khoảng đệm, ô lời chúc ba dòng và tem thư nhỏ. Bảng lời chúc dạng bảng ghim nền bần có vân nhẹ, khung gỗ không có header/số lượng; mỗi tấm là giấy note kem/hồng/xanh nhạt, có đinh ghim đỏ và bóng giấy; bỏ phong thư, chữ trang trí và hướng dẫn bên ngoài. Note rải ngẫu nhiên trong bảng cố định; kích thước giấy tự điều chỉnh theo chiều rộng. Tên người gửi nằm ở đầu từng tấm, hover/focus đưa tấm đó lên trước; bấm mở đọc đầy đủ. Không có thanh cuộn riêng hay nút lật. Note lệch vị trí, góc xoay, kích thước và màu nhẹ theo ID; mép giấy xé dùng ba biến thể polygon. Gửi mới thêm một note, không xáo trộn vị trí các note cũ; dữ liệu trình duyệt giữ nguyên. Không có lời chúc hiển thị trạng thái trống.
- `Dialogs.jsx`: lightbox theo ID, slideshow, vuốt, RSVP và modal giữ focus.
- `Media.jsx`: danh sách ảnh khả dụng và phương án dự phòng.
- `src/styles.css`: form, modal, bảng lời chúc và lưới ảnh; `src/cinematic.css`: nền tảng fullscreen; `src/soi-duyen.css`: phối cảnh, các cảnh mới và chế độ giảm chuyển động.
- `src/typography.css`: thang chữ dùng chung, được tải sau các lớp bố cục. Điều chỉnh cỡ chữ tại đây: nhãn chính 10–12px, nội dung 14–16px, ô nhập 16px; tiêu đề có giới hạn kích thước và nhịp dòng theo desktop/mobile. Hai tên ở bìa cùng cỡ chữ.
- Desktop rút ngắn các đoạn giữ cảnh; đồng hồ chuyển động bám thao tác nhanh hơn với spring không nảy. `DesktopMotion.jsx` đệm wheel bằng RAF với thời gian bám 45–80ms, giữ nguyên tổng quãng cuộn. Mục lục, bàn phím, thanh cuộn, ô nhập và vùng cuộn trong hộp thoại giữ thao tác riêng. Mobile và giảm chuyển động dùng cuộn gốc.
- `src/cursor.css`: con trỏ SVG mũi tên/trái tim màu đỏ rượu và vàng, chỉ bật khi có chuột từ 701px. Vòng sáng dùng spring bám mềm quanh con trỏ; mũi tên SVG vẫn ở đúng vị trí bấm. Ô nhập giữ con trỏ chữ; lời chúc kéo thả giữ bàn tay. Favicon SVG, PNG 32px và Apple touch icon 180px cùng dùng hình trái tim/sợi chỉ.

Nhạc giữ nguyên `/music/audio.mp3`, chỉ phát sau khi khách bấm. Desktop bỏ khoảng giữ cảnh của chân dung và lời hẹn, mỗi phần còn một màn hình. Mobile giữ các cảnh chính tối thiểu một màn hình (`100svh`); lời ngỏ, chân dung và lời hẹn tiếp tục ôm theo nội dung để tránh khoảng trắng lớn. Hiệu ứng tự hiện không chặn cuộn; ba thiệp nối tiếp với thanh chọn lễ cuộn đến đúng thiệp. Form đứng yên khi nhập; album gấp lại đưa về đầu cảnh ảnh. CSS mobile ở `src/mobile.css`, tải sau stylesheet chung. Giảm chuyển động hiển thị nội dung ngay, vẫn xem được tất cả ảnh và thông tin.

## Nội dung câu chuyện

Lời kể tập trung trong `src/data/story.js`: hai bạn xưng “chúng mình”. Thứ tự chương: 01 Bìa → 02 Hai chúng mình → 03 Lời ngỏ → 04 Album → 05 Chung một nhà → 06 Lịch cưới → 07 Lời chúc → cảm ơn. Lời ngỏ gồm ba đoạn, bắt đầu từ mốc quen nhau năm 2019 do hai bạn cung cấp. Bánh Bao chỉ được nhắc trong câu dẫn “Cùng Bánh Bao, đi tiếp câu chuyện của chúng mình nhé.” ở đoạn chuyển bìa. Không tự thêm ngày cụ thể hay kỷ niệm chưa được cung cấp.

Module này chứa lời dẫn, tiêu đề, nhãn chương/mục lục và lời nhắn của form. Chương lời chúc là 07; các tên, nghề nghiệp, ảnh và lịch lễ tiếp tục lấy từ dữ liệu hiện có. Màn mở đầu giữ một câu ngắn, không có mèo; hình mèo tiếp tục chạy theo chỉ đỏ trong trang. Caption ảnh thật và lời chúc đã lưu không bị viết lại. RSVP xác nhận cả đến/không đến dùng lời cảm ơn trung tính, luôn nói rõ phản hồi chỉ lưu trên trình duyệt.

## Thông tin và lưu trữ

Lễ Vu Quy 26/12/2026 và Lễ Tân Hôn 03/01/2027: cử hành 09:00, đãi tiệc 11:00. Tiệc Báo Hỷ tại Nhà Hàng Hương Phố: 18:00 ngày 30/01/2027. Ngày âm lịch chép theo thiệp. Địa chỉ nhà gái và địa chỉ chi tiết Nhà Hàng Hương Phố chờ cập nhật.

RSVP/lời chúc chỉ lưu trong **localStorage của trình duyệt**, chưa gửi đến chủ tiệc. Giữ hai key `wedding-rsvp`, `wedding-messages` và tương thích dữ liệu cũ. Các lời chúc khởi tạo ghi “Lời chúc mẫu”. Không tích hợp CMS, upload ảnh hoặc chuyển khoản.

Lời chúc không có giới hạn số lượng trong code; gửi mới giữ lại toàn bộ lời chúc cũ. Dung lượng lưu thực tế phụ thuộc localStorage của trình duyệt; nếu lưu thất bại, giao diện báo đúng trạng thái và không xóa dữ liệu cũ. Chưa nối Google Sheets. Vùng ghim cố định 360px trên desktop, 320px trên mobile, kể cả khi trống. Note mới có vị trí ngẫu nhiên theo ID và nằm trên note cũ; không tăng chiều cao hay cắt bớt dữ liệu. Desktop kéo cả tờ giấy hoặc ghim để di chuyển trong bảng; mobile kéo ở ghim, vuốt trên giấy vẫn cuộn trang. Có thể dùng phím mũi tên khi focus ghim, Home đặt lại vị trí. Vị trí sắp xếp chỉ là trạng thái giao diện, trở về bố cục ban đầu khi resize hoặc tải lại; dữ liệu lời chúc không đổi.

Chiều cao từng note đo từ nội dung thực tế, không còn chia theo hai mức ngắn/dài; giữ xuống dòng. Giấy chỉ giới hạn chiều cao để nằm trong bảng ghim cố định. Bấm note mở `WishNoteDialog.jsx`: lá thư giấy ngà có ghim đỏ, tên người gửi và ngày gọn phía trên, lời chúc là nội dung chính, chân thư có nút Gấp lại. Với lời dài chỉ vùng nội dung cuộn; nút đóng luôn hiện. Hỗ trợ Escape, giữ focus trong hộp thoại và trả focus về note khi đóng.

## Kiểm tra trình duyệt

`python scripts/check-note-reader.py` kiểm tra note tự tăng chiều cao, popup đọc đầy đủ lời dài, giới hạn màn hình, điều khiển bàn phím và trả focus ở 320/390/768/1440px, cả màn hình ngang thấp. Ảnh đối chiếu ở `artifacts/note-reader/`.

Chạy Vite trước, rồi dùng Python đã cài Playwright và Chromium:

```sh
python scripts/browser-check.py --url http://127.0.0.1:5173
python scripts/check-mobile-flow.py --url http://127.0.0.1:5173
```

Kiểm tra desktop/mobile, album 0/1/2/3/13/30 ảnh, ảnh lỗi/thiếu vai trò, tương tác và dữ liệu cũ. Suite mobile kiểm tra 320/390/430px: dừng vuốt vẫn hoàn tất hiệu ứng, cuộn ngược không phát lại, menu, vuốt/slideshow, ba RSVP, lời chúc, refresh, resize qua 700/701px và giảm chuyển động. Ảnh chụp ở `artifacts/soi-duyen/` và `artifacts/mobile-flow/` (không đưa vào Git). Build không cần Python. Chi tiết ở `AUDIT.md`.

`python scripts/check-hybrid-motion.py --url http://127.0.0.1:5173` kiểm tra ngưỡng kích hoạt, chuyển động thực sự khi dừng cuộn, không phát lại khi quay lại/resize, hoàn tất khi lướt nhanh, vòng nhẫn trước đáy trang, intro và giảm chuyển động. Ảnh chụp ở `artifacts/hybrid-motion/`.

`python scripts/check-polish.py --url http://127.0.0.1:5173` kiểm tra độ đệm sau một bước cuộn, không vượt đích, nhảy mục lục, ảnh native ở DPR 2/3 và ảnh đầu album trong chế độ giảm chuyển động.

`python scripts/check-desktop-motion.py --url http://127.0.0.1:5173` kiểm tra wheel thật, cuộn ngược/bước nhỏ, ngắt quán tính bằng bàn phím/mục lục, vùng cuộn hộp thoại, vòng sáng con trỏ, resize và đổi chế độ giảm chuyển động.

`python scripts/check-scroll-scenes.py --url http://127.0.0.1:5173` kiểm tra màn hình ngang/thấp 844×390, 932×430, 1024×500 và 800×320: bàn giao camera tiến/lùi, lưới ảnh không đè nút, chân dung đủ chiều cao, lời hẹn không bị header che và cả ba RSVP bấm được. Ảnh chụp ở `artifacts/scroll-review/`.

`python scripts/check-profile-transitions.py --url http://127.0.0.1:5173` kiểm tra ảnh bìa rời cùng chương 01, camera chỉ bắt đầu từ chương 03, bàn giao album tiến/lùi và reset khung ảnh khi đổi breakpoint hoặc bật giảm chuyển động. Ảnh đối chiếu ở `artifacts/profile-transitions/`.

`python scripts/check-wish-stack.py --url http://127.0.0.1:5173` kiểm tra các cột chồng thư 0/1/6/20 lời chúc, thao tác chuột/bàn phím, mở từng nội dung đầy đủ, gửi mới, tải lại và giảm chuyển động. Ảnh đối chiếu ở `artifacts/wish-columns/`.

`python scripts/check-wish-drag.py --url http://127.0.0.1:5173` kiểm tra hơn 100 lời chúc không loại lời cũ khi gửi, kéo bằng chuột/chạm, di chuyển bằng bàn phím, đọc note, tải lại và resize.

`python scripts/check-wish-fixed-board.py --url http://127.0.0.1:5173` kiểm tra chiều cao bảng không đổi khi gửi liên tiếp, note mới nằm trên cùng tại vị trí ngẫu nhiên, vị trí note cũ không đổi và mọi dữ liệu được giữ sau khi tải lại.

`ThreadCat.jsx` hiển thị bé mèo trong `public/images/banhbao/` theo đường chỉ đỏ: tiến/lùi và nhún theo cuộn, không chặn thao tác. Chạy `python scripts/check-thread-cat.py --url http://127.0.0.1:5173` để kiểm tra mèo; `scripts/check-photo-handoff.py` kiểm tra bàn giao ảnh và thứ tự lớp trước/sau của chồng ảnh.

`src/lib/threadTrack.js` lưu mẫu thích ứng của đường chỉ để nội suy vị trí và tiếp tuyến, không gọi phép đo SVG ở từng khung hình. Đường chỉ luôn tiến theo chiều dọc và có khoảng chuyển ngang rộng hơn ở các section ngắn. Mèo dùng ngưỡng 8px để xác nhận cuộn ngược, giữ hướng trên đoạn gần thẳng đứng, xoay/quay đầu có độ đệm và nhún nhẹ theo quãng đường. Màn mở đầu chỉ vẽ sợi chỉ, không có mèo; mèo xuất hiện khi khám phá trang bên dưới. Bài kiểm tra mèo kiểm tra thêm đường không vòng ngược, sai số nội suy dưới 1px, không lật hướng khi rung 1px và không đo SVG trong lúc chạy.

Trên desktop, mèo và đường chỉ cùng nằm trong lớp viewport, dùng chung vị trí cuộn thật để giữ điểm bám ổn định trong các cảnh sticky. Trên mobile, đường chỉ nằm trong tọa độ trang và cuộn tự nhiên cùng nội dung; sự kiện cuộn passive cập nhật đồng thời nét vẽ và điểm bám của mèo, tránh trễ qua hàng đợi render. Chiều cao `100svh` giữ vị trí ổn định khi thanh địa chỉ trình duyệt thay đổi. Chỉ góc xoay/quay đầu và nhịp nhún có spring. Bài kiểm tra dùng wheel tiến/lùi trong các cảnh ghim trên desktop và thao tác vuốt, quán tính, vuốt ngược trên mobile để kiểm tra độ khớp giữa đường chỉ, mèo và nội dung.

`python scripts/check-typography.py --url http://127.0.0.1:5173` kiểm tra cỡ chữ phụ trợ, tên không bị cắt, phần giới thiệu/lịch cưới không đè lên thanh cuối màn hình ở 320/390/768/1024/1440px và laptop cao 600px. Ảnh chụp ở `artifacts/typography/`.

`python scripts/check-families.py --url http://127.0.0.1:5173` kiểm tra nghề nghiệp, không còn thông tin phụ huynh, tên đầy đủ, bố cục 320–1440px, chuyển động chân dung rõ ràng, nút lịch cưới, ảnh lỗi và giảm chuyển động. Ảnh chụp ở `artifacts/families-depth/`.

`python scripts/check-prewedding.py` kiểm tra đúng 40 mã đã chọn, số ảnh 11/15/8/6, toàn bộ WebP responsive, alpha của chân dung mới, hash ảnh nguồn không thay đổi và ảnh web cũ đã được dọn khỏi `public`/`dist`.

`python scripts/check-opening.py --url http://127.0.0.1:5173` kiểm tra tự mở, bỏ qua, Escape, focus, ảnh bìa tải chậm, liên kết trực tiếp và chế độ giảm chuyển động. Các bài kiểm tra trang dùng `scripts/browser_helpers.py` để chờ màn mở đầu kết thúc trước khi thao tác.

Hai dòng chữ mở đầu chạy riêng từ hai phía, cách nhau 0,22 giây. Khung chữ giữ chiều cao cố định để không đẩy sợi chỉ khi font tải xong. Chờ font tiêu đề tối đa 950ms; nếu chậm/lỗi, riêng intro dùng Georgia cố định tới khi rời màn hình, tránh đổi font giữa animation. Nút bỏ qua và deadline mở rèm giữ nguyên. `python scripts/check-opening-title.py --url http://127.0.0.1:5173` kiểm tra animation lệch nhịp, hình học không nhảy, font tải chậm và giảm chuyển động khi intro đang mở.

Khi refresh, script chạy sớm trong `index.html` tắt khôi phục vị trí cuộn và bỏ fragment cũ để trang trở về bìa, chạy lại màn mở đầu. Liên kết trực tiếp khi mở mới và vị trí khi dùng Back được giữ theo hành vi thông thường. Kiểm tra bằng `python scripts/check-reload.py --url http://127.0.0.1:5173`.
