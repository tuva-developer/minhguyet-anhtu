// Personal details transcribed from the three invitations supplied by the couple.
import photoAssets from './photo-assets.json';
import selection from './prewedding-selection.json';
import portraitAssets from './portrait-assets.json';
// Unknown addresses deliberately remain unset; do not infer a map destination.
// Add/remove photos freely. Keep each id unique; width/height/position are optional.
const photo = (file, alt, caption, position) => {
  return { ...(photoAssets[file] || { src: `/images/prewedding/${file.toLowerCase().replace('_', '-')}.webp` }), id: file, alt, caption, ...(file === 'BAO_5613' ? { mobileFit: 'contain' } : {}), ...(position ? { position } : {}) };
};

const captions = {
  BAO_4610: 'Người thương của anh', BAO_4848: 'Một nụ hôn',
  BAO_5529: 'Có nhau trong đời', BAO_5922: 'Cùng một nhịp',
  BAO_6038: 'Một lời thương', BAO_6272: 'Ngày mình chung đôi',
  BAO_5613: 'Bình yên là có nhau',
  BAO_5191: 'Nắm tay nhau',
};
// Keep all four concepts and the couple's exact selection order in the album.
const photos = selection.concepts.flatMap(concept => concept.photos.map((code, index) => ({
  ...photo(code, `${code === 'BAO_4610' || code === 'BAO_4674' ? 'Minh Nguyệt trong váy cưới' : 'Anh Tú và Minh Nguyệt'} — ${concept.label}, ảnh ${index + 1}`,
    captions[code] || `${concept.label} · Khoảnh khắc ${String(index + 1).padStart(2, '0')}`, code === 'BAO_5191' ? '50% 50%' : undefined),
  conceptId: concept.id, conceptLabel: concept.label,
})));

export const wedding = {
  bride: 'Minh Nguyệt', groom: 'Anh Tú',
  brideFull: 'Lương Hoàng Minh Nguyệt', groomFull: 'Võ Anh Tú',
  brideSurname: 'Lương Hoàng', groomSurname: 'Võ',
  // Independent assignments: these still work when the album is empty/reordered.
  // Set a role to null when no suitable image is available yet.
  heroPhoto: photo('BAO_5613', 'Anh Tú và Minh Nguyệt đứng đối diện nhau trong vườn hồng', 'Bình yên là có nhau'),
  couplePhoto: photo('BAO_5922', 'Anh Tú và Minh Nguyệt cùng tấm khăn voan cưới', 'Cùng một nhịp'),
  albumLeadPhotoId: 'BAO_5897',
  // Album exit selects an existing photo by ID; it need not be in a fixed slot.
  albumFinalPhotoId: 'BAO_5529',
  albumPreviewPhotoIds: ['BAO_5897', 'BAO_6272', 'BAO_5529', 'BAO_6038', 'BAO_5019', 'BAO_5191'],
  bridePortrait: {
    ...photo('BAO_4610', 'Cô dâu Lương Hoàng Minh Nguyệt', 'Minh Nguyệt'),
    cutout: portraitAssets.bride,
  },
  groomPortrait: {
    ...photo('BAO_6309', 'Chú rể Võ Anh Tú', 'Anh Tú'),
    cutout: portraitAssets.groom,
  },
  profiles: {
    groom: { occupation: 'Developer' },
    bride: { occupation: 'Designer' },
  },
  musicUrl: '/music/audio.mp3',
  photos,
  events: [
    {
      id: 'vu-quy', title: 'Tư gia nhà gái', name: 'Lễ Vu Quy',
      photo: photo('BAO_6098', 'Hai bạn trong trang phục cưới truyền thống', 'Ngày vui nhà gái', '50% 40%'),
      address: 'Địa chỉ sẽ được cập nhật sau', mapQuery: null,
      weekday: 'Thứ bảy', date: '26.12.2026', dateTime: '2026-12-26T09:00:00+07:00',
      lunarDate: '18 tháng 11 năm 2026 âm lịch', time: '09:00', receptionTime: '11:00',
    },
    {
      id: 'tan-hon', title: 'Nhà văn hóa ấp 6B', name: 'Lễ Tân Hôn',
      photo: photo('BAO_5070', 'Hai bạn cùng bước đi giữa khu vườn và những bậc thềm', 'Chung một lối về', '50% 45%'),
      address: 'Xã Lộc Tấn, tỉnh Đồng Nai',
      mapQuery: 'Nhà văn hóa ấp 6B, xã Lộc Tấn, tỉnh Đồng Nai',
      weekday: 'Chủ nhật', date: '03.01.2027', dateTime: '2027-01-03T09:00:00+07:00',
      lunarDate: '26 tháng 11 năm 2026 âm lịch', time: '09:00', receptionTime: '11:00',
    },
    {
      id: 'bao-hy', title: 'Nhà Hàng Hương Phố', name: 'Tiệc Báo Hỷ',
      photo: photo('BAO_6400', 'Hai bạn bên bàn tiệc và hoa cưới đỏ', 'Chung vui cùng người thương', '50% 40%'),
      address: 'Địa chỉ chi tiết sẽ được cập nhật sau', mapQuery: null,
      weekday: 'Thứ bảy', date: '30.01.2027', dateTime: '2027-01-30T18:00:00+07:00',
      lunarDate: '23 tháng 12 năm 2026 âm lịch', time: '18:00', receptionTime: null,
    },
  ],
};
