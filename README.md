# Sợi duyên — Anh Tú & Minh Nguyệt

Website cưới của **Võ Anh Tú & Lương Hoàng Minh Nguyệt**, dựng thành các cảnh fullscreen chuyển động theo vị trí cuộn. Dùng React, Vite, Framer Motion và CSS; mobile cuộn tự nhiên, desktop có độ đệm lăn chuột ngắn và không cần backend để chạy.

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
- `StoryFlow.jsx`: desktop dùng một phần tử ảnh di chuyển từ bìa fullscreen sang lời ngỏ rồi chồng ảnh; vị trí được đo lại khi resize. Mobile dùng ảnh trong từng cảnh, không dựng camera ảnh cố định. Đường chỉ đỏ SVG và bé mèo luôn theo cuộn thực tế, chạy qua các chương và nối vào hai vòng nhẫn cuối trang.
- `CoverCamera.jsx`: ảnh phóng từ khung rộng vào cận cảnh 1,22x trên desktop / 1,18x trên mobile trong cùng nhịp kéo rèm và chữ chạy. Giữ cận cảnh khi đứng ở bìa, tự hòa về crop gốc trong đoạn cuộn đầu trước khi bàn giao cho album; dùng chính khung ảnh đang di chuyển, không nhân bản ảnh. Chế độ giảm chuyển động dùng ảnh tĩnh.
- `SoiDuyen.jsx`: tên tách lớp, lời ngỏ sáng từng từ; hai dòng chữ chạy thành làn sóng và đứng lại thành lời hẹn.
- `Families.jsx`, `families.css`: giới thiệu chú rể Developer và cô dâu Designer, cấu hình qua `profiles.groom.occupation` / `profiles.bride.occupation`; không hiển thị phụ huynh hay địa chỉ. Chân dung tách nền có viền trắng tiến vào từ hai phía, nâng/phóng/xoay rõ khi cuộn; nền vòm đi ngược chiều và quỹ đạo xoay với chấm nhỏ. Cô dâu hiển thị ảnh BAO_4610 gốc qua mặt nạ alpha (`cutout.maskSrc`), không dùng khuôn mặt AI tạo lại. Desktop giữ tên đầy đủ trên một hàng; mobile đặt tên, nghề nghiệp và ảnh trong hai cột tương ứng, tên dài tự ngắt dòng trong cột; giảm chuyển động hiển thị bố cục tĩnh. Mặt nạ/ảnh tách nền lỗi thì dùng chân dung gốc; thiếu chân dung thì dùng bố cục chữ.
- `Montage.jsx`: ảnh xòe thành lưới responsive, khung đầu mở rộng fullscreen; có nút trở về lưới, album đầy đủ và lightbox.
- `DateScenes.jsx`: ba thiệp xoay quanh nếp gấp bên trái, có bóng đổ theo góc mở; mỗi thiệp hiển thị lịch lễ và chỉ giữ nút “Mình có hẹn nhé” để xác nhận tham dự.
- `Scene.jsx`: dùng chế độ `scroll` trên cả desktop và mobile, `static` khi giảm chuyển động. Cùng dùng vị trí cuộn làm đồng hồ; desktop giữ các cảnh sticky, mobile điều khiển hiệu ứng khi cảnh đi từ 90% lên 15% chiều cao viewport. Vuốt ngược đảo chiều hiệu ứng; dừng cuộn giữ nguyên tiến độ sau độ đệm ngắn. Hiệu ứng đợi intro hoàn tất. Thanh cuối cảnh mobile giữ số chương, tên phần và nút đi tiếp.
- Tiến độ cuộn có độ đệm ngắn, không nảy; chuyển ngay khi nhảy xa bằng mục lục. Thiệp và đội hình ảnh dùng easing có gia tốc mềm ở hai đầu; đồng hồ ảnh vẫn bám vị trí cuộn thực tế.
- `Editorial.jsx`: hai vòng nhẫn vẽ theo cuộn dẫn vào lời cảm ơn, nút RSVP và về đầu trang; phần cuối không lặp lại tên hai bạn.
- `Guestbook.jsx`, `WishWall.jsx`: trang thư và lời chúc ghim, kéo thả desktop/mở đọc trên mobile.
- `Dialogs.jsx`: lightbox theo ID, slideshow, vuốt, RSVP và modal giữ focus.
- `Media.jsx`: danh sách ảnh khả dụng và phương án dự phòng.
- `src/styles.css`: form, modal, bảng lời chúc và lưới ảnh; `src/cinematic.css`: nền tảng fullscreen; `src/soi-duyen.css`: phối cảnh, các cảnh mới và chế độ giảm chuyển động.
- `src/typography.css`: thang chữ dùng chung, được tải sau các lớp bố cục. Điều chỉnh cỡ chữ tại đây: nhãn chính 10–12px, nội dung 14–16px, ô nhập 16px; tiêu đề có giới hạn kích thước và nhịp dòng theo desktop/mobile. Hai tên ở bìa cùng cỡ chữ.
- Desktop rút ngắn các đoạn giữ cảnh; đồng hồ chuyển động bám thao tác nhanh hơn với spring không nảy. `DesktopMotion.jsx` đệm wheel bằng RAF với thời gian bám 45–80ms, giữ nguyên tổng quãng cuộn. Mục lục, bàn phím, thanh cuộn, ô nhập và vùng cuộn trong hộp thoại giữ thao tác riêng. Mobile và giảm chuyển động dùng cuộn gốc.
- `src/cursor.css`: con trỏ SVG mũi tên/trái tim màu đỏ rượu và vàng, chỉ bật khi có chuột từ 701px. Vòng sáng dùng spring bám mềm quanh con trỏ; mũi tên SVG vẫn ở đúng vị trí bấm. Ô nhập giữ con trỏ chữ; lời chúc kéo thả giữ bàn tay. Favicon SVG, PNG 32px và Apple touch icon 180px cùng dùng hình trái tim/sợi chỉ.

Nhạc giữ nguyên `/music/audio.mp3`, chỉ phát sau khi khách bấm. Mobile giữ các cảnh chính tối thiểu một màn hình (`100svh`); riêng lời ngỏ, phần giới thiệu hai người và lời hẹn ôm theo nội dung, căn từ trên để tránh khoảng trắng lớn. Nội dung dài được tăng chiều cao và cuộn tiếp ngay. Chữ/ảnh chuyển động theo vị trí vuốt, ba thiệp là ba cảnh nối tiếp với thanh chọn lễ cuộn đến đúng thiệp. Form đứng yên khi nhập; album gấp lại đưa về đầu cảnh ảnh. CSS mobile ở `src/mobile.css`, tải sau stylesheet chung. Chế độ giảm chuyển động hiển thị nội dung ngay, vẫn xem được tất cả ảnh và thông tin.

## Thông tin và lưu trữ

Lễ Vu Quy 26/12/2026 và Lễ Tân Hôn 03/01/2027: cử hành 09:00, đãi tiệc 11:00. Tiệc Báo Hỷ tại Nhà Hàng Hương Phố: 18:00 ngày 30/01/2027. Ngày âm lịch chép theo thiệp. Địa chỉ nhà gái và địa chỉ chi tiết Nhà Hàng Hương Phố chờ cập nhật.

RSVP/lời chúc chỉ lưu trong **localStorage của trình duyệt**, chưa gửi đến chủ tiệc. Giữ hai key `wedding-rsvp`, `wedding-messages` và tương thích dữ liệu cũ. Các lời chúc khởi tạo ghi “Lời chúc mẫu”. Không tích hợp CMS, upload ảnh hoặc chuyển khoản.

## Kiểm tra trình duyệt

Chạy Vite trước, rồi dùng Python đã cài Playwright và Chromium:

```sh
python scripts/browser-check.py --url http://127.0.0.1:5173
python scripts/check-mobile-flow.py --url http://127.0.0.1:5173
```

Kiểm tra desktop/mobile, các khoảng cuộn khác nhau của từng cảnh, album 0/1/2/3/13/30 ảnh, ảnh lỗi/thiếu vai trò, tương tác và dữ liệu cũ. Suite mobile kiểm tra 320/390/430px, đồng hồ cuộn tiến/lùi, dừng vuốt không tự chạy, lướt nhanh/cuộn ngược, menu, vuốt/slideshow, ba RSVP, lời chúc, refresh, resize qua 700/701px và giảm chuyển động. Ảnh chụp ở `artifacts/soi-duyen/` và `artifacts/mobile-flow/` (không đưa vào Git). Build không cần Python. Chi tiết ở `AUDIT.md`.

`python scripts/check-polish.py --url http://127.0.0.1:5173` kiểm tra độ đệm sau một bước cuộn, không vượt đích, nhảy mục lục, ảnh native ở DPR 2/3 và ảnh đầu album trong chế độ giảm chuyển động.

`python scripts/check-desktop-motion.py --url http://127.0.0.1:5173` kiểm tra wheel thật, cuộn ngược/bước nhỏ, ngắt quán tính bằng bàn phím/mục lục, vùng cuộn hộp thoại, vòng sáng con trỏ, resize và đổi chế độ giảm chuyển động.

`ThreadCat.jsx` hiển thị bé mèo trong `public/images/banhbao/` theo đường chỉ đỏ: tiến/lùi và nhún theo cuộn, không chặn thao tác. Chạy `python scripts/check-thread-cat.py --url http://127.0.0.1:5173` để kiểm tra mèo; `scripts/check-photo-handoff.py` kiểm tra bàn giao ảnh và thứ tự lớp trước/sau của chồng ảnh.

`python scripts/check-typography.py --url http://127.0.0.1:5173` kiểm tra cỡ chữ phụ trợ, tên không bị cắt, phần giới thiệu/lịch cưới không đè lên thanh cuối màn hình ở 320/390/768/1024/1440px và laptop cao 600px. Ảnh chụp ở `artifacts/typography/`.

`python scripts/check-families.py --url http://127.0.0.1:5173` kiểm tra nghề nghiệp, không còn thông tin phụ huynh, tên đầy đủ, bố cục 320–1440px, chuyển động chân dung rõ ràng, nút lịch cưới, ảnh lỗi và giảm chuyển động. Ảnh chụp ở `artifacts/families-depth/`.

`python scripts/check-prewedding.py` kiểm tra đúng 40 mã đã chọn, số ảnh 11/15/8/6, toàn bộ WebP responsive, alpha của chân dung mới, hash ảnh nguồn không thay đổi và ảnh web cũ đã được dọn khỏi `public`/`dist`.

`python scripts/check-opening.py --url http://127.0.0.1:5173` kiểm tra tự mở, bỏ qua, Escape, focus, ảnh bìa tải chậm, liên kết trực tiếp và chế độ giảm chuyển động. Các bài kiểm tra trang dùng `scripts/browser_helpers.py` để chờ màn mở đầu kết thúc trước khi thao tác.

Khi refresh, script chạy sớm trong `index.html` tắt khôi phục vị trí cuộn và bỏ fragment cũ để trang trở về bìa, chạy lại màn mở đầu. Liên kết trực tiếp khi mở mới và vị trí khi dùng Back được giữ theo hành vi thông thường. Kiểm tra bằng `python scripts/check-reload.py --url http://127.0.0.1:5173`.
