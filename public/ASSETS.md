# Tài nguyên của website

## 40 ảnh prewedding được chọn

Nguồn: `D:\Imgs\Prewedding`. Website dùng đúng 40 mã trong `src/data/prewedding-selection.json`, theo thứ tự Bộ 1 (11 ảnh), Bộ 2 (15 ảnh), Bộ 3 (8 ảnh), Bộ 4 (6 ảnh). Không lấy ảnh ngoài danh sách và không sửa/xoá file nguồn.

- `images/prewedding/bao-XXXX.webp`: bản web cạnh dài tối đa 3840px, WebP chất lượng 90.
- Bản rộng 640/1280/1920px được tạo cùng ảnh để trình duyệt chọn theo màn hình và DPR qua `srcset`.
- Áp dụng chiều EXIF và chuyển ICC sang sRGB. Metadata/kích thước nằm trong `src/data/photo-assets.json`; URL có mã SHA-256 để tránh cache ảnh cũ.
- Chuyển đổi: `python scripts/convert-wedding-photos.py "D:\Imgs\Prewedding"`. Bảng nguồn, mã ảnh, kích thước và hash gốc nằm trong `artifacts/prewedding/conversion-manifest.json`.
- Bìa: BAO_5613 (ảnh ngang, hai bạn đứng đối diện trong vườn hồng); mobile giữ cả hai người trong khung. Lời ngỏ: BAO_5922. Ảnh chính khi vào album: BAO_4848; khi rời album: BAO_5529. Ba cảnh đổi ảnh bằng crossfade trong cùng khung di chuyển.
- Thiệp Vu Quy: BAO_6098; Tân Hôn: BAO_5070; Báo Hỷ: BAO_6400. Khai báo bằng `events[].photo`, không dùng lại ảnh bìa/lời ngỏ/chân dung hay nhóm ảnh xem trước. Ảnh lỗi chọn một ảnh còn chưa dùng; nếu hết ảnh sẽ dùng nền màu.
- Ảnh album giữ nguyên thứ tự bốn bộ. Nhóm xem trước lấy đại diện cả bốn concept, độc lập với thứ tự album; không nhân bản ảnh để lấp ô.

Bộ WebP tạm trong `images/wedding/` và hai ảnh tách nền cũ đã được xoá khỏi tài nguyên phục vụ website.

## Chân dung tách nền mới

Tạo bằng công cụ `image_gen` tích hợp, từ chính ảnh được chọn. Bản PNG trung gian giữ trong `artifacts/prewedding/`; bản web có alpha trong suốt, WebP chất lượng 94:

- `images/portraits/bao-4610-bride-cutout.webp`: từ BAO_4610, 1025 × 1535px.
- `images/portraits/bao-6309-groom-cutout.webp`: từ BAO_6309, 1277 × 1231px.

Kích thước, URL và mã ảnh nguồn nằm trong `src/data/portrait-assets.json`. Prompt đã dùng nằm trong `src/data/portrait-prompts.json`. Chỉ dùng ảnh tách nền ở phần giới thiệu hai bạn (Developer / Designer); nếu tải lỗi sẽ hiển thị ảnh chân dung nguồn được chọn.

Viền trắng 3px quanh phần alpha được vẽ bằng bộ lọc SVG trong `Families.jsx`, kết hợp bóng đổ CSS. Không sửa file ảnh; ảnh chân dung dự phòng có nền không áp dụng viền.

## Tài nguyên khác

- `images/banhbao/banhbao.png`: bé mèo của chủ website chạy theo sợi chỉ đỏ khi cuộn và theo đầu nét chỉ hình trái tim ở màn mở đầu. Cùng dùng `ThreadCat.jsx`; màn mở đầu đồng bộ với tiến độ vẽ SVG, không thêm bộ đếm thời gian riêng.
- `music/audio.mp3`: nhạc chủ website, giữ nguyên và chỉ phát khi khách chủ động bật.
- `video/flowers.mp4`: video minh hoạ cũ không dùng trong giao diện hiện tại.
- Font: Cormorant Garamond và Lexend, có font hệ thống dự phòng.
