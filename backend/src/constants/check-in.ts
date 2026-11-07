// Điểm danh hằng ngày: mỗi ngày (tính theo giờ Việt Nam, đổi ngày lúc 0h) vào hệ thống và bấm nhận sẽ được tặng credit.
// Điểm danh liên tiếp đủ 7 ngày thì ngày thứ 7 nhận thêm thưởng chuỗi, rồi vòng mới bắt đầu lại từ ngày 1.
// Bỏ lỡ một ngày thì chuỗi tính lại từ ngày 1.
export const CHECKIN_DAILY = 25; // credit nhận mỗi ngày
export const CHECKIN_CYCLE_DAYS = 7; // số ngày liên tiếp của một vòng
export const CHECKIN_BONUS = 100; // thưởng thêm ở ngày cuối vòng (cộng vào credit của ngày đó)
