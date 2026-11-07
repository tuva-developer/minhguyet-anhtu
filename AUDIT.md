# Sợi duyên — chuyển cảnh theo cuộn

Giao diện chuyển từ trang đọc sang các cảnh chiếm màn hình, đồng bộ bằng vị trí cuộn. Màu rượu trầm, nền tối/giấy ngà và ảnh thật của hai bạn tạo dấu ấn riêng. Các kỹ thuật giữ cảnh, zoom ảnh, parallax, phối cảnh và chuyển lớp tương tự loại trải nghiệm ở website tham khảo, được dựng lại bằng React/Framer Motion.

## Các cảnh

| Cảnh | Chuyển động theo cuộn |
| --- | --- |
| Lần mở trang | Sợi chỉ vẽ thành trái tim, hai lớp giấy tách sang bên để lộ bìa đang tải bên dưới; có bỏ qua/Escape, giới hạn chờ ảnh, tự bỏ qua với giảm chuyển động và liên kết trực tiếp |
| Mở đầu → lời ngỏ | Cùng một phần tử ảnh thu từ fullscreen sang chân dung, đi tiếp về chồng ảnh; chữ tách lớp và sáng từng từ |
| Album | Chồng ảnh xòe thành lưới, đứng lại để chọn ảnh, khung đầu mở rộng fullscreen; mọi ảnh truy cập qua lightbox/lưới đầy đủ |
| Hai gia đình | Thông tin bố mẹ nằm trên tên hai bạn; chân dung tách nền nổi trước vòm giấy, chữ cái và đường quỹ đạo, parallax nhẹ theo cuộn; không lặp màn ảnh chung |
| Lời hẹn | Hai dòng chữ chạy thành làn sóng đối hướng, đứng lại thành câu hoàn chỉnh |
| Lịch cưới | Thiệp fullscreen xoay quanh cạnh trái, bóng theo góc mở; có khoảng dừng và thiệp chi tiết |
| Xuyên suốt → kết | Chỉ đỏ SVG chạy qua các chương và nối vào hai vòng nhẫn ở cảnh cuối |

Form lời chúc đứng yên khi viết, hỗ trợ giấy ghim/kéo thả desktop và mở đọc trên mobile. Cảnh cảm ơn cuối chiếm một màn hình. Desktop có độ đệm wheel ngắn, giữ nguyên quãng cuộn và nhường thao tác cho bàn phím, ô nhập, thanh cuộn và hộp thoại. Mobile dùng cuộn gốc; giảm chuyển động tắt độ đệm và vòng sáng con trỏ. Riêng màn mở đầu giữ nội dung bên dưới tạm thời không nhận thao tác, rồi khôi phục cuộn và focus khi mở xong hoặc bỏ qua.

## Dữ liệu và ảnh

- Giữ nguyên tên, gia đình, ba lịch cưới, ngày âm theo thiệp và các địa chỉ chờ cập nhật.
- Giữ nguyên ảnh gốc, file nhạc `audio.mp3`, hai key localStorage `wedding-rsvp`, `wedding-messages` và khả năng đọc dữ liệu trước đây.
- Album hiện có đúng 40 ảnh đã chọn, bốn concept 11/15/8/6, ID giữ theo mã `BAO_...`. Album 0 ảnh tự ẩn; một ảnh không có điều khiển chuyển/slideshow; album nhiều ảnh tự phân bố, mở lưới và xem thêm từng đợt 12 ảnh.
- Ảnh vai trò độc lập với thứ tự album. Thiếu ảnh bìa/chung dùng dự phòng hữu hạn; thiếu chân dung dùng profile chữ; ảnh hỏng được loại khỏi hiển thị.
- Không thêm backend, CMS, thông tin chuyển khoản hoặc thư viện 3D.

## Nghiệm thu

`npm run build` và `scripts/browser-check.py` đã kiểm tra:

- Sáu cảnh có stage đúng một viewport và giữ bằng sticky khi cuộn.
- Cùng một DOM ảnh di chuyển qua bìa/lời ngỏ; album đổi đội hình và mở fullscreen; chữ làn sóng, profile hợp khung, matrix3d của thiệp đổi theo tiến độ.
- Ba cảnh lịch cưới, thiệp chi tiết, RSVP, nhạc phát/dừng, album/lightbox/slideshow, focus modal, Escape và vuốt mobile.
- Giữ dữ liệu RSVP/lời chúc cũ khi gửi mới và tải lại trang.
- Mobile giữ chuyển động fullscreen. Không tràn ngang hoặc cắt tên ở chiều rộng 320/390/768/1024/1440px.
- Album 0/1/2/3/13/30 ảnh; thiếu ảnh bìa/chân dung; ảnh lỗi; giảm chuyển động.
- Không có lỗi JavaScript hoặc ảnh hỏng hiển thị trong các kiểm tra.
- Bộ prewedding mới: đủ 40 mã chính xác và 160 file WebP responsive; hash 40 ảnh nguồn không thay đổi, hai chân dung mới có alpha. Đã xoá ảnh web cũ, kiểm tra gallery đủ 40 ảnh qua nhiều đợt “Xem thêm”, slideshow/lightbox đúng ID và ảnh bìa bàn giao vào album độc lập với thứ tự bốn concept.

Ảnh chụp tại `artifacts/soi-duyen/`. Video cuộn minh họa tại `artifacts/soi-duyen/scroll-desktop.webm` và `scroll-mobile.webm`. Kiểm tra tự động dùng Chromium; chưa kiểm thử trực tiếp trên Safari/iPhone thật.

Không thêm thư viện. Hiệu ứng dùng Framer Motion, CSS transform/perspective, SVG và cuộn tự nhiên. Chế độ giảm chuyển động hiển thị các cảnh tĩnh, vẫn truy cập được mọi nội dung.

## Tinh chỉnh độ mềm và chất lượng ảnh

- Spring ngắn, không nảy cho chuyển động theo cuộn; nhảy xa theo mục lục cập nhật ngay. Easing bậc năm giúp thiệp/đội hình ảnh tăng giảm tốc mềm hơn.
- Giảm zoom dư ở ảnh chung và nền lịch cưới, giảm lớp hạt giấy trên ảnh.
- Xuất lại từ JPG gốc ở độ phân giải native, WebP chất lượng 94; thêm `srcset` 640/960/native, có phiên bản URL theo nội dung. Không upscale hoặc tạo lại khuôn mặt.
- Desktop đặt ảnh dọc vừa khung fullscreen, dùng nền dịu hai bên. Chế độ fit giữ cố định khi frame chuyển hình để tránh giật crop giữa cảnh.
- `scripts/check-polish.py` kiểm tra độ đệm không vượt đích, chuyển cảnh xa, ảnh native trên DPR 2/3 và ảnh album đầu trong chế độ giảm chuyển động.

## Bàn giao ảnh từ lời ngỏ sang album

Ảnh đang di chuyển và ảnh album dùng chung một tiến độ cuộn. Ảnh album đầu (và ô trùng nguồn ảnh bìa) được ẩn cho đến khi ảnh đang di chuyển vào đúng khung; sau đó chuyển quyền hiển thị trong cùng một frame. Khớp cả vị trí, kích thước, góc nghiêng và lớp tối để không hiện hai bản lệch nhau hoặc đổi độ sáng đột ngột.

`python scripts/check-photo-handoff.py --url http://127.0.0.1:5173` kiểm tra 50 mẫu cuộn xuôi/ngược trên mỗi kích thước desktop/mobile, sai lệch khung dưới 2px tại điểm bàn giao và mở lightbox. Ảnh đối chiếu tại `artifacts/soi-duyen/desktop-handoff-fixed.png` và `mobile-handoff-fixed.png`.

Giữ stacking context của stage album dưới ảnh đang di chuyển, để ảnh luôn ở trước chồng ảnh cả trước và sau khi bàn giao. Kiểm tra thêm thứ tự ảnh thực sự tại 9 điểm chồng lấp ở hai phía của điểm bàn giao, tránh trường hợp đúng tọa độ nhưng bật từ lớp sau ra lớp trước.

## Bé mèo theo chỉ đỏ

- `ThreadCat.jsx` dùng nguyên ảnh PNG trong `public/images/banhbao/`, đi theo điểm cuối đường chỉ được vẽ. Nhịp nhún và quay đầu theo quãng đường cuộn; không chạy timer nền.
- Tiến độ đường chỉ ánh xạ theo tọa độ dọc của path, giữ mèo trong vùng nhìn khi đi qua các đường cong ngang. Chặn vị trí tràn hai mép; không bắt sự kiện chuột/chạm.
- Chế độ giảm chuyển động ẩn đường chỉ và mèo. Thiếu ảnh mèo chỉ bỏ phần mèo, không ảnh hưởng đường chỉ hay nội dung.
- `scripts/check-thread-cat.py` đã kiểm tra 1440/390/320px, cuộn xuôi/ngược, khớp vị trí mèo với đầu nét chỉ, không tràn ngang, ảnh lỗi và giảm chuyển động.

## Đổi ảnh chính khi đi qua album

Ảnh đầu tiếp tục nhận bàn giao từ bìa/lời ngỏ. Khi lưới đã mở, ảnh được cấu hình bằng `albumFinalPhotoId` nhận vai trò chính và chính phần tử ảnh đó tiến lên fullscreen. Không thay `src` giữa chuyển động, không tạo bản sao ảnh. Cuộn ngược đưa vai trò ảnh chính về ảnh dẫn vào, giữ nguyên quy tắc bàn giao và lớp ảnh.

`scripts/check-album-primary.py` kiểm tra hai ảnh vào/ra khác nhau, phần tử ảnh không bị thay, khung fullscreen, lightbox đúng ảnh, trở về lưới, cuộn ngược, album 0/1/2 ảnh, ID thiếu và ảnh được chọn nằm ngoài nhóm xem trước. Trường hợp một ảnh dùng chính tấm duy nhất.

## Cân đối hệ chữ

Tập trung thang chữ trong `src/typography.css`: giảm tiêu đề lớn, tên bìa dùng cùng cỡ, tăng nhãn/nút/chữ thông tin vốn chỉ 4–9px. Nội dung chính 14–16px, nhãn chính 10–12px, ô nhập 16px. Thống nhất độ đậm, khoảng cách chữ và nhịp dòng; ngày và giờ giữ thứ bậc rõ nhưng không lấn át thông tin sự kiện.

Điều chỉnh vị trí lời ngỏ/lịch cưới trên mobile để chữ lớn hơn vẫn đủ chỗ. Biên độ chữ làn sóng theo đơn vị em để hợp với cỡ chữ. Đường mèo có khoảng chạy riêng tại các đoạn nhiều thông tin, chuyển mềm theo chương và vẫn bám đầu nét chỉ.

`scripts/check-typography.py` kiểm tra 320×740, 390×844, 768×1024, 1024×768, 1440×900, 1280×600: tên đầy đủ không bị cắt, cỡ chữ phụ trợ, thông tin gia đình/lịch cưới nằm trên thanh cuối màn hình, ô nhập và không tràn ngang. Đã xem ảnh chụp desktop/mobile ở `artifacts/typography/`.
